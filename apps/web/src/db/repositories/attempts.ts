/**
 * HANASO — Postgres mastery-attempt repository (TASK-M0-10 DB-layer / Issue #11).
 *
 * Persists stage-D mastery attempts in `app.dialogue_mastery_attempts` (KB
 * dialogue-content-schema §۳) behind the async `AttemptRepository` contract:
 * - engine ids (`dlg-cafe-morning-01`) resolve to seeded `content.dialogues` uuids
 *   (db/content-map.ts; ContentNotSeededError when the seed step was skipped);
 * - `attempt_no` is 1-based per (user, dialogue): computed as MAX+1 inside a retry
 *   loop — the unique index (user_id, dialogue_id, attempt_no) is the backstop, so a
 *   concurrent insert loses at most one retry, never correctness;
 * - `list(dialogueId)` filters IN SQL, never post-fetch (PR #74 review r1/S2: a
 *   post-fetch filter after LIMIT would silently truncate once >500 rows exist);
 * - rows map back to the engine-shaped `DialogueMasteryAttempt` (dialogueId=`dlg-<slug>`).
 */
import { and, desc, eq, sql } from 'drizzle-orm';
import type { AttemptRepository } from '../../modules/mastery/repository';
import type { AttemptInput, DialogueMasteryAttempt, WeakPoint } from '../../modules/mastery/types';
import { dialogueMasteryAttempts, dialogues } from '../../../db/schema';
import type { DbClient } from '../client';
import { newRuntimeId } from '../ids';
import { ContentNotSeededError, resolveDialogue, resolveDialogueByUuid } from '../content-map';
import type { MasteryScoresJson, WeakPointsJson } from '../../../db/schema/app';

/**
 * 23505 detector that sees THROUGH drizzle's error wrapping (PR #74 review r3:
 * drizzle re-throws pg errors inside a `cause` chain, so a bare `err.code` check
 * silently never matches — the retry loop was dead code until the forced-collision
 * integration test proved it).
 */
function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current !== null && current !== undefined && depth < 5; depth += 1) {
    if (typeof current === 'object' && 'code' in current && (current as { code?: string }).code === '23505') {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/** DB row → engine-shaped domain object. */
export function attemptRowToDomain(row: {
  id: string;
  userId: string;
  dialogueId: string;
  attemptNo: number;
  scores: MasteryScoresJson;
  weakPoints: WeakPointsJson;
  outcome: string;
  createdAt: Date;
  dialogueSlug: string | null;
}): DialogueMasteryAttempt {
  return {
    id: row.id,
    dialogueId: row.dialogueSlug ? `dlg-${row.dialogueSlug}` : row.dialogueId,
    userId: row.userId,
    attemptNo: row.attemptNo,
    scores: row.scores as DialogueMasteryAttempt['scores'],
    weakPoints: row.weakPoints as WeakPoint[],
    outcome: row.outcome as DialogueMasteryAttempt['outcome'],
    createdAt: row.createdAt.toISOString(),
  };
}

export class PgAttemptRepository implements AttemptRepository {
  constructor(private readonly client: DbClient) {}

  async create(input: AttemptInput, outcome: DialogueMasteryAttempt['outcome']): Promise<DialogueMasteryAttempt> {
    const ref = await resolveDialogue(input.dialogueId);
    /*
     * TASK-HANASO-24: userId is REQUIRED (server-resolved session identity) — the
     * poc-user fallback on NULL is gone. A NULL userId is a caller bug and now
     * fails loudly at the DB NOT NULL constraint instead of silently poisoning
     * the legacy shared store.
     */
    const userId = input.userId;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const [maxRow] = await this.client.db
        .select({ max: sql<number>`coalesce(max(${dialogueMasteryAttempts.attemptNo}), 0)` })
        .from(dialogueMasteryAttempts)
        .where(
          sql`${dialogueMasteryAttempts.userId} = ${userId} and ${dialogueMasteryAttempts.dialogueId} = ${ref.dialogueUuid}`,
        );

      const attemptNo = (maxRow?.max ?? 0) + 1;
      const id = newRuntimeId();
      try {
        const [row] = await this.client.db
          .insert(dialogueMasteryAttempts)
          .values({
            id,
            userId,
            dialogueId: ref.dialogueUuid,
            attemptNo,
            scores: input.scores,
            weakPoints: input.weakPoints,
            outcome,
          })
          .returning();
        return attemptRowToDomain({
          ...row!,
          dialogueSlug: ref.slug,
        });
      } catch (err) {
        if (isUniqueViolation(err)) continue; // concurrent attempt_no — recompute
        throw err;
      }
    }
    throw new Error(`attempt_no conflict for (user=${userId}, dialogue=${input.dialogueId}) after 3 tries`);
  }

  async list(dialogueId?: string): Promise<DialogueMasteryAttempt[]> {
    return this.listImpl(undefined, dialogueId);
  }

  /**
   * TASK-HANASO-24 (audit BUG-030): caller-scoped listing — the only shape the
   * /api/attempts GET serves. Never returns another learner's rows.
   */
  async listForUser(userId: string, dialogueId?: string): Promise<DialogueMasteryAttempt[]> {
    return this.listImpl(userId, dialogueId);
  }

  private async listImpl(userId: string | undefined, dialogueId?: string): Promise<DialogueMasteryAttempt[]> {
    // Unknown dialogue → empty list (matches the in-memory contract), NOT an error.
    let dialogueUuid: string | null = null;
    if (dialogueId) {
      try {
        dialogueUuid = (await resolveDialogue(dialogueId)).dialogueUuid;
      } catch (err) {
        if (err instanceof ContentNotSeededError) return [];
        throw err;
      }
    }
    const rows = await this.client.db
      .select({
        id: dialogueMasteryAttempts.id,
        userId: dialogueMasteryAttempts.userId,
        dialogueId: dialogueMasteryAttempts.dialogueId,
        attemptNo: dialogueMasteryAttempts.attemptNo,
        scores: dialogueMasteryAttempts.scores,
        weakPoints: dialogueMasteryAttempts.weakPoints,
        outcome: dialogueMasteryAttempts.outcome,
        createdAt: dialogueMasteryAttempts.createdAt,
        dialogueSlug: dialogues.slug,
      })
      .from(dialogueMasteryAttempts)
      .leftJoin(dialogues, eq(dialogues.id, dialogueMasteryAttempts.dialogueId))
      .where(
        userId && dialogueUuid
          ? and(eq(dialogueMasteryAttempts.userId, userId), eq(dialogueMasteryAttempts.dialogueId, dialogueUuid))
          : userId
            ? eq(dialogueMasteryAttempts.userId, userId)
            : dialogueUuid
              ? eq(dialogueMasteryAttempts.dialogueId, dialogueUuid)
              : undefined,
      )
      .orderBy(desc(dialogueMasteryAttempts.createdAt))
      .limit(500);
    return rows.map(attemptRowToDomain);
  }

  async find(attemptId: string): Promise<DialogueMasteryAttempt | null> {
    return findAttemptById(this.client, attemptId);
  }
}

/** Resolve a stored attempt id → engine view (used by the D→understood gate). */
export async function findAttemptById(client: DbClient, attemptId: string): Promise<DialogueMasteryAttempt | null> {
  const [row] = await client.db
    .select({
      id: dialogueMasteryAttempts.id,
      userId: dialogueMasteryAttempts.userId,
      dialogueId: dialogueMasteryAttempts.dialogueId,
      attemptNo: dialogueMasteryAttempts.attemptNo,
      scores: dialogueMasteryAttempts.scores,
      weakPoints: dialogueMasteryAttempts.weakPoints,
      outcome: dialogueMasteryAttempts.outcome,
      createdAt: dialogueMasteryAttempts.createdAt,
      dialogueSlug: dialogues.slug,
    })
    .from(dialogueMasteryAttempts)
    .leftJoin(dialogues, eq(dialogues.id, dialogueMasteryAttempts.dialogueId))
    .where(eq(dialogueMasteryAttempts.id, attemptId))
    .limit(1);
  if (!row) return null;
  // dialogueSlug may be null (dialogue deleted) — resolve engineId via the map
  const slug = row.dialogueSlug ?? (await resolveDialogueByUuid(row.dialogueId))?.slug ?? null;
  return attemptRowToDomain({ ...row, dialogueSlug: slug });
}
