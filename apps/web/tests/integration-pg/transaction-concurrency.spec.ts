/**
 * HANASO — transaction & concurrency proofs on REAL PostgreSQL (TASK-HANASO-24 /
 * CP-04 — BUG-036). Service-level (deterministic — no route 404 paths):
 *
 *  1. runInTx rollback machinery: writes inside a thrown unit leave NOTHING.
 *  2. practice: concurrent duplicate completes → exactly one 'recorded', the
 *     other 'already'; evidence folded once.
 *  3. practice: concurrent DIFFERENT sessions folding the SAME object → no lost
 *     update (the advisory lock serializes; both folds visible in the stats).
 *  4. mastery: concurrent double-submit → distinct attemptNos (MAX+1 race-free
 *     under the advisory lock), chapter aggregate consistent.
 *  5. station: concurrent completes → chapter flips to stations_complete exactly
 *     once (upsert convergence, no contradiction).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { resetDbClientForTests } from '@/db/client';
import { getDbClient } from '@/db/client';
import { runInTx } from '@/db/transactions';
import { PgLearningObjectRepository } from '@/db/repositories/practice';
import { completePracticeSession, completeStationWalk, submitMasteryWithFold } from '@/lib/poc/completions';
import { refreshContentMap } from '@/db/content-map';
import { getChapterProgressStore, resetStoresForTests } from '@/lib/poc/stores';
import { learningObjectStates, practiceSessions } from '../../db/schema';
import { dialogueMasteryAttempts } from '../../db/schema';
import { chapterProgress } from '../../db/schema';
import type { PracticeItemResult, StoredPracticeSession } from '@/modules/practice/session';
import { ensureTestDatabase } from './helpers';

const QA = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const QB = '77777777-8888-4999-aaaa-bbbbbbbbbbbb';

function storedSession(id: string, userId: string, results: StoredPracticeSession['itemResults']): StoredPracticeSession {
  return {
    id,
    userId,
    skill: 'kana',
    kind: 'focused',
    scopeKey: 'h1',
    itemResults: results,
    startedAt: new Date('2026-01-01T00:00:00Z').toISOString(),
    completedAt: new Date('2026-01-01T00:05:00Z').toISOString(),
  };
}

beforeAll(async () => {
  await ensureTestDatabase();
  resetDbClientForTests();
  resetStoresForTests();
  await refreshContentMap();
});

afterAll(() => {
  resetStoresForTests();
  resetDbClientForTests();
});

beforeEach(async () => {
  // deterministic per-test state on the DIRECT connection
  const { db } = getDbClient();
  await db.delete(practiceSessions);
  await db.delete(learningObjectStates);
  await db.delete(dialogueMasteryAttempts);
  await db.delete(chapterProgress);
});

describe('runInTx rollback machinery (BUG-036)', () => {
  it('a thrown unit leaves NOTHING behind', async () => {
    const { db } = getDbClient();
    await expect(
      runInTx(async (tx) => {
        const loRepo = new PgLearningObjectRepository(tx);
        await loRepo.upsert({
          userId: QA,
          objectId: 'probe-object',
          skill: 'kana',
          state: 'introduced',
          dimensionStats: {},
          updatedAt: new Date().toISOString(),
        });
        throw new Error('forced failure');
      }),
    ).rejects.toThrow('forced failure');
    const [row] = await db.select().from(learningObjectStates).where(sql`${learningObjectStates.objectId} = 'probe-object'`);
    expect(row).toBeUndefined();
  });
});

describe('practice completion — idempotency + concurrency (BUG-036)', () => {
  it('concurrent duplicate completes: one recorded, one already, one fold', async () => {
    const results: PracticeItemResult[] = [
      { itemId: 'i1', objectId: 'kn-rec-hira-a', dimension: 'K1', firstTryCorrect: true, attempts: 1, ms: 100 },
    ];
    const stored = storedSession('11111111-1111-4111-8111-111111111111', QA, results);
    const groups = [{ objectId: 'kn-rec-hira-a', results }];

    const [a, b] = await Promise.all([
      completePracticeSession(stored, groups),
      completePracticeSession(stored, groups),
    ]);
    expect([a.status, b.status].sort()).toEqual(['already', 'recorded']);

    const rows = await getDbClient().db.select().from(practiceSessions);
    expect(rows.filter((r) => r.id === stored.id)).toHaveLength(1);
  });

  it('SEQUENTIAL replay (PROD path, subagent C-03): the second call is already — never a second fold', async () => {
    const results: PracticeItemResult[] = [
      { itemId: 'i1', objectId: 'kn-rec-hira-c', dimension: 'K1', firstTryCorrect: true, attempts: 1, ms: 100 },
    ];
    const stored = storedSession('44444444-4444-4444-8444-444444444444', QA, results);
    const groups = [{ objectId: 'kn-rec-hira-c', results }];
    const first = await completePracticeSession(stored, groups);
    expect(first.status).toBe('recorded');
    // SEQUENTIAL replay at the service level (the in-flight entry is gone →
    // the route 404s; callers that still hold the session replay HERE):
    const second = await completePracticeSession(stored, groups);
    expect(second.status).toBe('already');
    expect(second.newlyEligible).toBe(0);
    // and the fold count is still exactly ONE
    const [row] = await getDbClient().db.select().from(learningObjectStates).where(sql`${learningObjectStates.objectId} = 'kn-rec-hira-c'`);
    const stats = row!.dimensionStats as Record<string, { seen: number }>;
    expect(stats.K1?.seen).toBe(1);
  });

  it('concurrent DIFFERENT sessions on the SAME object: no lost update', async () => {
    const mk = (itemId: string, dim: 'K1' | 'K3'): PracticeItemResult[] => [
      { itemId, objectId: 'kn-rec-hira-b', dimension: dim, firstTryCorrect: true, attempts: 1, ms: 100 },
    ];
    const s1 = storedSession('22222222-2222-4222-8222-222222222222', QA, mk('s1i1', 'K1'));
    const s2 = storedSession('33333333-3333-4333-8333-333333333333', QA, mk('s2i1', 'K3'));

    await Promise.all([
      completePracticeSession(s1, [{ objectId: 'kn-rec-hira-b', results: s1.itemResults }]),
      completePracticeSession(s2, [{ objectId: 'kn-rec-hira-b', results: s2.itemResults }]),
    ]);

    const [row] = await getDbClient()
      .db.select()
      .from(learningObjectStates)
      .where(sql`${learningObjectStates.objectId} = 'kn-rec-hira-b' and ${learningObjectStates.userId} = ${QA}`);
    expect(row).toBeTruthy();
    const stats = row!.dimensionStats as Record<string, { seen: number }>;
    // BOTH folds visible — a lost update would show only one of the two
    expect(stats.K1?.seen).toBe(1);
    expect(stats.K3?.seen).toBe(1);
  });
});

describe('mastery gate — double submit under the advisory lock (BUG-036)', () => {
  it('concurrent submissions get distinct attemptNos and a consistent aggregate', async () => {
    const mk = () => ({
      userId: QA,
      chapterSlug: 'kana-foundation-01',
      dialogueId: 'dlg-cafe-morning-01',
      input: {
        dialogueId: 'dlg-cafe-morning-01',
        userId: QA,
        scores: { M1: 1, M2: 1, M3: 1, M4: 1, M5: 1 },
        weakPoints: [],
      },
      outcome: 'passed' as const,
      gate: { passed: true, weighted: 1, measures: { M1: 1, M2: 1, M3: 1, M4: 1, M5: 1 } },
      maxRemediationLoops: 3,
    });
    // seed the aggregate row to 'stations_complete' first (the gate assumes the walk)
    // via the STORE so the deterministic unitId matches what the service reads.
    await getChapterProgressStore().upsert(QA, 'kana-foundation-01', {
      status: 'stations_complete',
      bestWeighted: null,
      bestMeasures: null,
      remediationCount: 0,
    });
    const { db } = getDbClient();

    const [r1, r2] = await Promise.all([submitMasteryWithFold(mk()), submitMasteryWithFold(mk())]);
    const nos = [r1.attempt.attemptNo, r2.attempt.attemptNo].sort();
    expect(nos).toEqual([1, 2]); // no MAX+1 race — distinct, sequential
    expect(r1.chapterState.status).toBe('understood');
    expect(r2.chapterState.status).toBe('understood');

    const attempts = await db.select().from(dialogueMasteryAttempts);
    expect(attempts.filter((a) => a.userId === QA)).toHaveLength(2);
  });
});

describe('station completion — atomic chapter fold (BUG-036)', () => {
  it('concurrent completes converge: chapter flips exactly once', async () => {
    const mk = () => ({
      userId: QB,
      chapterSlug: 'kana-foundation-01',
      stationSlug: 'stn-kana-h1',
      stationState: {
        stationSlug: 'stn-kana-h1',
        status: 'completed' as const,
        bestScore: null,
        attemptCount: 0,
        currentBlock: null,
        lastActivityAt: new Date().toISOString(),
      },
      coreSlugs: ['stn-kana-h1'],
    });
    const [a, b] = await Promise.all([completeStationWalk(mk()), completeStationWalk(mk())]);
    expect(a.station.status).toBe('completed');
    expect(b.station.status).toBe('completed');
    expect(a.chapter?.status).toBe('stations_complete');
    expect(b.chapter?.status).toBe('stations_complete');

    const { db } = getDbClient();
    const rows = await db.select().from(chapterProgress).where(sql`${chapterProgress.userId} = ${QB}`);
    expect(rows).toHaveLength(1); // upsert convergence — never two contradictory rows
    expect(rows[0]!.status).toBe('stations_complete');
  });
});
