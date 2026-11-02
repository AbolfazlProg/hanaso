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
 * - rows map back to the engine-shaped `DialogueMasteryAttempt` (dialogueId=`dlg-<slug>`).
 */
import { desc, eq, sql } from 'drizzle-orm';
import type { AttemptRepository } from '../../modules/mastery/repository';
import type { AttemptInput, DialogueMasteryAttempt, WeakPoint } from '../../modules/mastery/types';
import { dialogueMasteryAttempts, dialogues } from '../../../db/schema';
import type { DbClient } from '../client';
import { newRuntimeId } from '../ids';
import { engineIdToSlug, resolveDialogue, resolveDialogueByUuid } from '../content-map';
import { POC_DEFAULT_USER_ID } from '../../lib/poc/principal';
import type { MasteryScoresJson, WeakPointsJson } from '../../../db/schema/app';

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505';
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
    const userId = input.userId ?? POC_DEFAULT_USER_ID;

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
      .orderBy(desc(dialogueMasteryAttempts.createdAt))
      .limit(500);

    const filtered = dialogueId
      ? rows.filter((r) => r.dialogueSlug === engineIdToSlug(dialogueId) || r.dialogueId === dialogueId)
      : rows;
    return filtered.map(attemptRowToDomain);
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
