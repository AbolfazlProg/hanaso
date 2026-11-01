/**
 * HANASO — Dialogue Mastery types (TASK-DLG-POC-01).
 * Data structure only, per KB dialogue-mastery-model (§۱ M1..M5, §۳ diagnosis tuples).
 */
import { z } from 'zod';

export const MASTERY_MEASURES = ['M1', 'M2', 'M3', 'M4', 'M5'] as const;
export type MasteryMeasure = (typeof MASTERY_MEASURES)[number];

/** Measure scores: 0..1 fraction correct, or null when not assessed in this attempt. */
export type MasteryScores = Record<MasteryMeasure, number | null>;

export const weakPointSchema = z.object({
  lineId: z.string().min(1),
  objective: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']),
});
export type WeakPoint = z.infer<typeof weakPointSchema>;

export const dialogueMasteryAttemptSchema = z.object({
  id: z.string().min(1),
  dialogueId: z.string().min(1),
  userId: z.string().min(1).optional(),
  attemptNo: z.number().int().min(1),
  scores: z.object({
    M1: z.number().min(0).max(1).nullable(),
    M2: z.number().min(0).max(1).nullable(),
    M3: z.number().min(0).max(1).nullable(),
    M4: z.number().min(0).max(1).nullable(),
    M5: z.number().min(0).max(1).nullable(),
  }),
  weakPoints: z.array(weakPointSchema),
  outcome: z.enum(['passed', 'remediate', 'incomplete']),
  createdAt: z.string().min(1),
});

export interface DialogueMasteryAttempt {
  id: string;
  dialogueId: string;
  userId?: string;
  attemptNo: number;
  scores: MasteryScores;
  weakPoints: WeakPoint[];
  outcome: 'passed' | 'remediate' | 'incomplete';
  createdAt: string;
}

/** POST payload (server assigns id/attemptNo/createdAt/outcome). */
export const attemptInputSchema = z.object({
  dialogueId: z.string().min(1),
  userId: z.string().min(1).optional(),
  scores: z.object({
    M1: z.number().min(0).max(1).nullable(),
    M2: z.number().min(0).max(1).nullable(),
    M3: z.number().min(0).max(1).nullable(),
    M4: z.number().min(0).max(1).nullable(),
    M5: z.number().min(0).max(1).nullable(),
  }),
  weakPoints: z.array(weakPointSchema).default([]),
});
export type AttemptInput = z.infer<typeof attemptInputSchema>;

/**
 * TASK-SLICE-01 remediation (review F1/S1): the PUBLIC submission schema.
 * Clients submit RAW ANSWERS only (questionId → optionId); per-question grading
 * happens server-side (KB dialogue-mastery-model §۱ — the answer key never
 * reaches the client). `attemptInputSchema` stays for internal/server grading.
 */
export const attemptSubmissionSchema = z.object({
  dialogueId: z.string().min(1),
  userId: z.string().min(1).optional(),
  answers: z.record(z.string().min(1), z.string().min(1)),
});
export type AttemptSubmission = z.infer<typeof attemptSubmissionSchema>;
