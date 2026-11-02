/**
 * HANASO — Postgres unit-progress repository (TASK-M0-10 DB-layer / Issue #11).
 *
 * Persists the A→D unit cycle in `app.lesson_progress` (KB §۳-۴: composite PK
 * (user_id, lesson_id) — «گام درس جاری» resume anchor — with `dialogue_id` as the
 * dialogue-keyed lookup column) behind the async `ProgressRepository` contract.
 *
 * The engine keys progress by `dialogueId` (`dlg-cafe-morning-01`); the DB anchors the
 * row to the seeded anchor lesson (lessons.dialogue_id → the unit's uuid). upsert is a
 * real `INSERT … ON CONFLICT (user_id, lesson_id) DO UPDATE` — concurrent transitions
 * converge on the last write, exactly like the in-memory map did.
 */
import { and, eq } from 'drizzle-orm';
import type { ProgressRepository } from '../../modules/progress/repository';
import type { UnitProgress, UnitStage, UnitStatus } from '../../modules/progress/types';
import { dialogues, lessonProgress, lessons } from '../../../db/schema';
import type { DbClient } from '../client';
import { engineIdToSlug, resolveDialogue, slugToEngineId } from '../content-map';

/** DB row (+ join) → engine-shaped UnitProgress. */
export function progressRowToDomain(row: {
  userId: string;
  currentStep: string | null;
  unitStage: string;
  status: string;
  masteryAttemptId: string | null;
  updatedAt: Date;
  dialogueSlug: string | null;
}): UnitProgress {
  return {
    userId: row.userId,
    dialogueId: row.dialogueSlug ? slugToEngineId(row.dialogueSlug) : '',
    stage: row.unitStage as UnitStage,
    status: row.status as UnitStatus,
    masteryAttemptId: row.masteryAttemptId ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
  };
}

const progressColumns = {
  userId: lessonProgress.userId,
  lessonId: lessonProgress.lessonId,
  dialogueId: lessonProgress.dialogueId,
  currentStep: lessonProgress.currentStep,
  unitStage: lessonProgress.unitStage,
  status: lessonProgress.status,
  masteryAttemptId: lessonProgress.masteryAttemptId,
  updatedAt: lessonProgress.updatedAt,
  dialogueSlug: dialogues.slug,
};

export class PgProgressRepository implements ProgressRepository {
  constructor(private readonly client: DbClient) {}

  async get(userId: string, dialogueId: string): Promise<UnitProgress | null> {
    const ref = await resolveDialogue(dialogueId);
    const [row] = await this.client.db
      .select(progressColumns)
      .from(lessonProgress)
      .leftJoin(dialogues, eq(dialogues.id, lessonProgress.dialogueId))
      .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.dialogueId, ref.dialogueUuid)))
      .limit(1);
    return row ? progressRowToDomain(row) : null;
  }

  async upsert(progress: UnitProgress): Promise<UnitProgress> {
    const ref = await resolveDialogue(progress.dialogueId);
    const [row] = await this.client.db
      .insert(lessonProgress)
      .values({
        userId: progress.userId,
        lessonId: ref.lessonUuid,
        dialogueId: ref.dialogueUuid,
        currentStep: null,
        unitStage: progress.stage,
        status: progress.status,
        masteryAttemptId: progress.masteryAttemptId ?? null,
        updatedAt: new Date(progress.updatedAt),
      })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: {
          unitStage: progress.stage,
          status: progress.status,
          masteryAttemptId: progress.masteryAttemptId ?? null,
          updatedAt: new Date(progress.updatedAt),
        },
      })
      .returning({
        userId: lessonProgress.userId,
        currentStep: lessonProgress.currentStep,
        unitStage: lessonProgress.unitStage,
        status: lessonProgress.status,
        masteryAttemptId: lessonProgress.masteryAttemptId,
        updatedAt: lessonProgress.updatedAt,
        dialogueId: lessonProgress.dialogueId,
      });
    return progressRowToDomain({ ...row!, dialogueSlug: ref.slug });
  }

  async list(dialogueId?: string): Promise<UnitProgress[]> {
    const rows = await this.client.db
      .select(progressColumns)
      .from(lessonProgress)
      .leftJoin(dialogues, eq(dialogues.id, lessonProgress.dialogueId))
      .limit(500);
    const filtered = dialogueId ? rows.filter((r) => r.dialogueSlug === engineIdToSlug(dialogueId)) : rows;
    return filtered.map(progressRowToDomain);
  }
}

/** Anchor-lesson join for ops queries (worker/db-verify). */
export async function countLessonProgress(client: DbClient): Promise<number> {
  const rows = await client.db.select({ lessonId: lessons.id }).from(lessons);
  return rows.length;
}
