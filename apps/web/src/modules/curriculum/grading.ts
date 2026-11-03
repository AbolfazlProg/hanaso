/**
 * HANASO — Server-side grading (TASK-LEARNING-01) — PURE module (server-use).
 *
 * The answer key NEVER reaches the client (SKL-013 / backend §۴-۲): station pages
 * receive stripped exercises; answers are graded HERE.
 *
 * - Station exercises: per-answer grading with the F0..F3 feedback ladder
 *   (QUESTION §۴ — F1 statement → F2 hint → F3 explanation; the key is revealed
 *   only at F3). Score = first-try-correct / graded items.
 * - The mastery gate reuses the existing mastery scoring (computeMastery) over
 *   the non-overlapping mastery bank (this module only maps answers → measures).
 */
import type { Chapter, Exercise, Station } from './types';
import { computeMastery, type MasteryResult } from '@/modules/mastery';

export type ExerciseAnswerPayload =
  | { kind: 'option'; optionId: string }
  | { kind: 'order'; orderedIds: string[] }
  | { kind: 'build'; chipOrder: string[]; nameValue?: string };

export interface GradeOutcome {
  correct: boolean;
  /** F-level actually returned (1=statement, 2=hint, 3=explanation+reveal). */
  level: 0 | 1 | 2 | 3;
  feedbackFa: string;
  /** Set only at level 3 (reveal). */
  reveal?: string;
}

/** Grade one answer at a given attempt number (1-based) against the ladder. */
export function gradeExerciseAnswer(ex: Exercise, answer: ExerciseAnswerPayload, attemptNo = 1): GradeOutcome {
  const correct = isCorrect(ex, answer);
  if (correct) {
    return { correct: true, level: 0, feedbackFa: 'درست!' };
  }
  const level = attemptNo <= 1 ? 1 : attemptNo === 2 ? 2 : 3;
  const feedbackFa =
    level === 1
      ? ex.feedback.f1Fa
      : level === 2
        ? ex.feedback.f2HintFa
        : ex.feedback.f3ExplainFa;
  const reveal =
    level >= 3
      ? revealText(ex)
      : undefined;
  return { correct: false, level, feedbackFa, reveal };
}

function isCorrect(ex: Exercise, answer: ExerciseAnswerPayload): boolean {
  switch (ex.type) {
    case 'meaning-select':
    case 'audio-meaning':
    case 'response-select':
    case 'cloze':
    case 'gist-select':
    case 'match-in-line':
    case 'speaker-identify':
    case 'listen-minimal-pair':
      return answer.kind === 'option' && answer.optionId === ex.correctOptionId;
    case 'word-order':
    case 'dialogue-order':
      return (
        answer.kind === 'order' &&
        arraysEqual(answer.orderedIds, ex.correctOrder ?? [])
      );
    case 'produce-template':
      return answer.kind === 'build' && arraysEqual(answer.chipOrder, ex.acceptedChipOrder ?? []);
  }
}

function revealText(ex: Exercise): string {
  switch (ex.type) {
    case 'word-order':
    case 'dialogue-order':
      return (ex.chunks ?? [])
        .slice()
        .sort((a, b) => (ex.correctOrder?.indexOf(a.id) ?? 0) - (ex.correctOrder?.indexOf(b.id) ?? 0))
        .map((c) => c.ja)
        .join(' ');
    case 'produce-template':
      return (ex.chips ?? [])
        .slice()
        .sort(
          (a, b) =>
            (ex.acceptedChipOrder?.indexOf(a.id) ?? 0) - (ex.acceptedChipOrder?.indexOf(b.id) ?? 0),
        )
        .map((c) => c.ja)
        .join(' ');
    default: {
      const correct = ex.options?.find((o) => o.id === ex.correctOptionId);
      return correct?.label ?? '';
    }
  }
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/* ------------------------------------------------------------------ station session scoring */

export interface StationSessionScore {
  stationSlug: string;
  /** First-try-correct / graded-items fraction (null when nothing graded yet). */
  score: number | null;
  gradedCount: number;
}

/**
 * Station completion check against its criterion:
 * - viewed: always satisfiable (the client marks completion after rendering)
 * - task_completed: the INTEGRATE flow reports the task done
 * - exercise_threshold: server-recorded session score must meet the threshold
 */
export function stationMeetsCompletion(
  station: Station,
  score: number | null,
  taskCompleted = false,
): boolean {
  switch (station.completion.kind) {
    case 'viewed':
      return true;
    case 'task_completed':
      return taskCompleted;
    case 'exercise_threshold':
      return score !== null && score >= station.completion.threshold;
  }
}

/* ------------------------------------------------------------------ mastery gate grading */

export interface MasteryGradingResult extends MasteryResult {
  /** measure → fraction correct per measure (same shape as MasteryScores). */
  scores: {
    M1: number | null;
    M2: number | null;
    M3: number | null;
    M4: number | null;
    M5: number | null;
  };
  /** measure → wrong question ids (for the point-return remediation map). */
  wrongByMeasure: Record<string, string[]>;
  /** Weak-point station suggestions (DD-048 point-return) from the chapter map. */
  remediationStations: string[];
  perQuestion: Record<string, boolean>;
}

/** Grade a full gate submission (raw answers only) against the chapter bank. */
export function gradeMasterySubmission(
  chapter: Chapter,
  answers: Record<string, ExerciseAnswerPayload>,
): MasteryGradingResult {
  const bank = Object.values(chapter.exercises).filter((e) => e.assessmentRole.startsWith('mastery_'));
  const perQuestion: Record<string, boolean> = {};
  const wrongByMeasure: Record<string, string[]> = {};

  let m1 = 0, m2 = 0, m3 = 0, m4 = 0, m5 = 0;
  let c1 = 0, c2 = 0, c3 = 0, c4 = 0, c5 = 0;

  for (const ex of bank) {
    const answer = answers[ex.id];
    const ok = answer !== undefined && isCorrect(ex, answer);
    perQuestion[ex.id] = ok;
    const measure = ex.assessmentRole.slice('mastery_'.length);
    if (!ok) {
      (wrongByMeasure[measure] ??= []).push(ex.id);
    }
    switch (measure) {
      case 'M1': m1 += ok ? 1 : 0; c1 += 1; break;
      case 'M2': m2 += ok ? 1 : 0; c2 += 1; break;
      case 'M3': m3 += ok ? 1 : 0; c3 += 1; break;
      case 'M4': m4 += ok ? 1 : 0; c4 += 1; break;
      case 'M5': m5 += ok ? 1 : 0; c5 += 1; break;
    }
  }

  const scores = {
    M1: c1 ? m1 / c1 : null,
    M2: c2 ? m2 / c2 : null,
    M3: c3 ? m3 / c3 : null,
    M4: c4 ? m4 / c4 : null,
    M5: c5 ? m5 / c5 : null,
  } as const;

  const result = computeMastery(scores, 'stage2');
  const remediationStations = Object.keys(wrongByMeasure)
    .map((m) => chapter.mastery.weakPointMap[m])
    .filter((s): s is string => Boolean(s));

  return { ...result, scores, wrongByMeasure, remediationStations, perQuestion };
}

/* ------------------------------------------------------------------ client payload stripping */

export interface ClientExercise {
  id: string;
  type: Exercise['type'];
  targetSkill: Exercise['targetSkill'];
  promptFa: string;
  promptJa?: string;
  promptJaReading?: string;
  audioLineRef?: string;
  options?: { id: string; label: string }[];
  clozeTokens?: (string | null)[];
  chunks?: { id: string; ja: string }[];
  chips?: { id: string; ja: string }[];
  lineRef?: string;
}

/** Strip the answer key + feedback from an exercise for client transport. */
export function toClientExercise(ex: Exercise): ClientExercise {
  return {
    id: ex.id,
    type: ex.type,
    targetSkill: ex.targetSkill,
    promptFa: ex.promptFa,
    promptJa: ex.promptJa,
    promptJaReading: ex.promptJaReading,
    audioLineRef: ex.audioLineRef,
    options: ex.options,
    clozeTokens: ex.clozeTokens,
    chunks: ex.chunks,
    chips: ex.chips,
    lineRef: ex.lineRef,
  };
}
