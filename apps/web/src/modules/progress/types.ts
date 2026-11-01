/**
 * HANASO — Progress module types (TASK-SLICE-01 / Issue #40) — the A→D unit cycle.
 *
 * Model per KB dialogue-based-learning-model §۲:
 *   A (selfcheck: watch the dialogue) → B (lesson from the dialogue) →
 *   C (practice on the same dialogue) → D (mastery gate on the ORIGINAL dialogue).
 * A unit is `understood` — never "completed" (DD-048) — ONLY from a stage-D attempt
 * with outcome='passed'.
 */
import { z } from 'zod';

export const UNIT_STAGES = ['A_selfcheck', 'B_lesson', 'C_practice', 'D_mastery'] as const;
export type UnitStage = (typeof UNIT_STAGES)[number];

export type UnitStatus = 'active' | 'understood';

/** One user's progress through one dialogue-anchored unit (app.lesson_progress mirror). */
export interface UnitProgress {
  userId: string;
  dialogueId: string;
  stage: UnitStage;
  status: UnitStatus;
  /** The passing mastery attempt (set when status='understood'; logical ref per KB §۳). */
  masteryAttemptId?: string;
  updatedAt: string;
}

/**
 * Cycle events → allowed transitions:
 * - unit_started:      (none) → A
 * - dialogue_watched:  A → B  (user watched the dialogue to the end)
 * - lesson_studied:    B → C  (lesson sections viewed / cards opened)
 * - practice_done:     C → D  (practice session completed)
 * - mastery_passed:    D(active) → understood  (gate: the attempt's outcome is 'passed')
 */
export const progressEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('unit_started') }),
  z.object({ type: z.literal('dialogue_watched') }),
  z.object({ type: z.literal('lesson_studied') }),
  z.object({ type: z.literal('practice_done') }),
  z.object({ type: z.literal('mastery_passed'), attemptId: z.string().min(1) }),
]);
export type ProgressEvent = z.infer<typeof progressEventSchema>;

/** POST /api/progress payload. */
export const progressInputSchema = z.object({
  dialogueId: z.string().min(1),
  userId: z.string().min(1).optional(),
  event: progressEventSchema,
});
export type ProgressInput = z.infer<typeof progressInputSchema>;
