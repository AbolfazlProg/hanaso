/**
 * HANASO — Atomic completion services (TASK-HANASO-24 / CP-04 — audit BUG-036).
 *
 * The three multi-step write flows, each now ONE unit of work:
 *
 *  1. completePracticeSession — practice_sessions insert (idempotent:
 *     on-conflict = replay, fold skipped) + per-object evidence fold
 *     (learning_object_states), serialized per (user, object) with transaction
 *     advisory locks so concurrent sessions can never lose an update.
 *  2. completeStationWalk — station_progress upsert + the conditional
 *     chapter_progress fold in one transaction (a failure can no longer leave
 *     a station completed while the chapter aggregate never flips).
 *  3. submitMasteryWithFold — attempt insert (advisory-locked per
 *     (user, dialogue) so MAX+1 is race-free) + chapter fold, one transaction.
 *
 * Postgres mode: `runInTx` with tx-bound repository instances (see
 * db/transactions.ts). In-memory DEV mode: the identical sequence on the
 * singletons — single JS thread, no interleaving, same semantics.
 */
import { sql } from 'drizzle-orm';
import { runInTx, usingDbTransactions } from '@/db/transactions';
import { PgLearningObjectRepository, PgPracticeSessionRepository } from '@/db/repositories/practice';
import { PgAttemptRepository } from '@/db/repositories/attempts';
import { PgChapterProgressRepository, PgStationProgressRepository } from '@/db/repositories/curriculum';
import { isRetryableTxError } from '@/db/repositories/attempts';
import { getAttemptStore, getChapterProgressStore, getLearningObjectStore, getPracticeSessionStore, getStationProgressStore } from '@/lib/poc/stores';
import { foldItemResult, seedRecord } from '@/modules/practice/evidence';
import type { LearningObjectRecord, PracticeItemResult } from '@/modules/practice/session';
import type { StoredPracticeSession } from '@/modules/practice/session';
import { applyChapterEvent } from '@/modules/curriculum';
import type { ChapterState, StationState } from '@/modules/curriculum/types';
import type { AttemptInput, DialogueMasteryAttempt } from '@/modules/mastery/types';

/* ------------------------------------------------------------------ shared */

/** Transaction-scoped advisory lock (bigint key). Same key = serialized. */
async function advisoryXactLock(client: { db: import('drizzle-orm/node-postgres').NodePgDatabase }, key: string): Promise<void> {
  await client.db.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
}

/* ------------------------------------------------- 1. practice completion */

export interface PracticeFoldGroup {
  objectId: string;
  results: PracticeItemResult[];
}

export interface CompletePracticeOutcome {
  /** 'recorded' = this call wrote it; 'already' = idempotent replay (fold skipped). */
  status: 'recorded' | 'already';
  newlyEligible: number;
}

/**
 * Persist a completed practice session and fold its Learning-Object evidence
 * ATOMICALLY. Idempotent: a replayed/double-submitted completion returns
 * 'already' and never double-folds (the evidence fold is skipped entirely).
 */
export async function completePracticeSession(
  stored: StoredPracticeSession,
  groups: PracticeFoldGroup[],
): Promise<CompletePracticeOutcome> {
  if (!usingDbTransactions()) {
    // DEV in-memory: same sequence, single thread, no interleaving.
    const outcome = await completePracticeSequence(stored, groups);
    return outcome;
  }
  /*
   * PG: one transaction for session insert + every fold. One bounded retry
   * around the whole unit (subagent C-02: retry on unique-violation OR on a
   * statement that ran on an aborted tx — 25P02 — e.g. the create() loop
   * racing an unlocked writer; a fresh unit re-runs cleanly).
   *
   * Subagent C-01: the in-flight lifecycle is the SINGLETON's — freed AFTER
   * the unit commits (never by the throwaway tx-bound instance).
   */
  for (let attempt = 0; ; attempt += 1) {
    try {
      const outcome = await runInTx(async (tx) => {
        await advisoryXactLock(tx, `lo:${stored.userId}`); // serialize this user's folds
        return completePracticeSequence(stored, groups, {
          sessionRepo: new PgPracticeSessionRepository(tx),
          loRepo: new PgLearningObjectRepository(tx),
        });
      });
      getPracticeSessionStore().deleteInFlight(stored.id);
      return outcome;
    } catch (err) {
      if (attempt < 1 && isRetryableTxError(err)) continue; // one bounded retry
      throw err;
    }
  }
}

async function completePracticeSequence(
  stored: StoredPracticeSession,
  groups: PracticeFoldGroup[],
  txRepos?: { sessionRepo: Pick<PgPracticeSessionRepository, 'recordCompleted'>; loRepo: Pick<PgLearningObjectRepository, 'get' | 'upsert'> },
): Promise<CompletePracticeOutcome> {
  const sessionRepo = txRepos?.sessionRepo ?? getPracticeSessionStore();
  const loRepo = txRepos?.loRepo ?? getLearningObjectStore();
  const status = await sessionRepo.recordCompleted(stored);
  if (status === 'already') return { status, newlyEligible: 0 }; // replay: never double-fold
  let newlyEligible = 0;
  for (const group of groups) {
    const existing = await loRepo.get(stored.userId, group.objectId);
    let record: LearningObjectRecord = existing ?? seedRecord(stored.userId, group.objectId, 'kana');
    const before = record.state;
    for (const r of group.results) record = foldItemResult(record, r);
    await loRepo.upsert(record);
    if (before !== 'eligible_for_review' && record.state === 'eligible_for_review') newlyEligible += 1;
  }
  return { status, newlyEligible };
}

/* ------------------------------------------------- 2. station completion */

export interface CompleteStationOutcome {
  station: StationState;
  chapter: ChapterState | null;
}

/**
 * Mark a station completed and fold the chapter aggregate in ONE unit:
 * station_progress upsert + (when every core station is now terminal and the
 * chapter row is still 'started') the chapter_progress flip to
 * 'stations_complete'. A mid-failure can no longer leave the station completed
 * while the chapter aggregate never flipped.
 */
export async function completeStationWalk(params: {
  userId: string;
  chapterSlug: string;
  stationSlug: string;
  /** The completed-state payload for the station row (write 1). */
  stationState: StationState;
  /** The chapter's CORE station slugs (the aggregate precondition set). */
  coreSlugs: string[];
}): Promise<CompleteStationOutcome> {
  const run = async (repos?: {
    stationRepo: Pick<PgStationProgressRepository, 'get' | 'upsert' | 'listForUnit'>;
    chapterRepo: Pick<PgChapterProgressRepository, 'get' | 'upsert'>;
  }) => {
    const stationRepo = repos?.stationRepo ?? getStationProgressStore();
    const chapterRepo = repos?.chapterRepo ?? getChapterProgressStore();
    /*
     * Subagent C-04: attemptCount is read FRESH inside the unit — the pre-tx
     * read lost concurrent grade increments (read-modify-write on the counter).
     */
    const fresh = await stationRepo.get(params.userId, params.stationSlug);
    const state = fresh
      ? { ...params.stationState, attemptCount: fresh.attemptCount }
      : params.stationState;
    const station = await stationRepo.upsert(params.userId, params.stationSlug, state);
    // The aggregate precondition is evaluated INSIDE the unit — the same
    // statement scope sees the station write above (old code read it after
    // the upsert too; now both live or die together).
    const states = await stationRepo.listForUnit(params.userId, params.coreSlugs);
    const allDone = params.coreSlugs.every(
      (slug) => states.some((st) => st.stationSlug === slug && st.status !== 'in_progress'),
    );
    if (!allDone) {
      return { station, chapter: await chapterRepo.get(params.userId, params.chapterSlug) };
    }
    const current = await chapterRepo.get(params.userId, params.chapterSlug);
    if (current && current.status !== 'started') return { station, chapter: current };
    const next: ChapterState = {
      status: 'stations_complete',
      bestWeighted: current?.bestWeighted ?? null,
      bestMeasures: current?.bestMeasures ?? null,
      remediationCount: current?.remediationCount ?? 0,
    };
    const chapter = await chapterRepo.upsert(params.userId, params.chapterSlug, next);
    return { station, chapter };
  };
  if (!usingDbTransactions()) return run();
  return runInTx((tx) =>
    run({ stationRepo: new PgStationProgressRepository(tx), chapterRepo: new PgChapterProgressRepository(tx) }),
  );
}

/* ------------------------------------------------- 3. mastery gate */

export interface SubmitMasteryOutcome {
  attempt: DialogueMasteryAttempt;
  chapterState: ChapterState;
}

/**
 * Persist a mastery attempt and fold the chapter aggregate in ONE unit.
 * The (user, dialogue) advisory lock makes the MAX+1 attemptNo race-free and
 * serializes double-submits; a failure rolls the attempt back with the fold.
 */
export async function submitMasteryWithFold(params: {
  userId: string;
  chapterSlug: string;
  /** Engine dialogue id (dlg-<slug>) — the repo resolves the content uuid. */
  dialogueId: string;
  input: AttemptInput;
  outcome: DialogueMasteryAttempt['outcome'];
  /** The gate_attempted payload for applyChapterEvent (attemptId attached after the insert). */
  gate: Omit<Extract<Parameters<typeof applyChapterEvent>[1], { type: 'gate_attempted' }>, 'attemptId' | 'type'>;
  maxRemediationLoops: number;
}): Promise<SubmitMasteryOutcome> {
  const run = async (repos?: {
    attemptRepo: Pick<PgAttemptRepository, 'create'>;
    chapterRepo: Pick<PgChapterProgressRepository, 'get' | 'upsert'>;
  }) => {
    const attemptRepo = repos?.attemptRepo ?? getAttemptStore();
    const chapterRepo = repos?.chapterRepo ?? getChapterProgressStore();
    const attempt = await attemptRepo.create(params.input, params.outcome);
    const current = await chapterRepo.get(params.userId, params.chapterSlug);
    const next = applyChapterEvent(
      current ?? undefined,
      { type: 'gate_attempted', ...params.gate, attemptId: attempt.id },
      params.maxRemediationLoops,
    );
    if (!next) {
      if (!current) {
        // A gate submission implies a walked chapter; no aggregate row at all
        // is a contract violation — abort the whole unit (attempt rolled back).
        throw new Error(`mastery fold: no chapter aggregate for ${params.userId}/${params.chapterSlug}`);
      }
      return { attempt, chapterState: current };
    }
    const chapterState = await chapterRepo.upsert(params.userId, params.chapterSlug, next, attempt.id);
    return { attempt, chapterState };
  };
  if (!usingDbTransactions()) return run();
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await runInTx(async (tx) => {
        await advisoryXactLock(tx, `ma:${params.userId}:${params.dialogueId}`);
        return run({
          attemptRepo: new PgAttemptRepository(tx),
          chapterRepo: new PgChapterProgressRepository(tx),
        });
      });
    } catch (err) {
      if (attempt < 1 && isRetryableTxError(err)) continue; // subagent C-02: 23505 | 25P02
      throw err;
    }
  }
}
