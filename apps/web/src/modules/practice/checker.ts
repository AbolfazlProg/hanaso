/**
 * HANASO — Practice answer checker (TASK-SLICE-01 / Issue #40) — stage C.
 *
 * Pure evaluation of one practice session: per-exercise correctness + weak-point
 * mapping to (lineId, objective) per KB dialogue-mastery-model §۳ diagnosis tuples
 * (the same WeakPoint shape /api/attempts stores, so stage-D remediation and stage-C
 * results share one contract).
 */
import type { WeakPoint } from '@/modules/mastery';
import type { Exercise, ExerciseAnswer } from './types';

/** Typed error for malformed check input (unknown exercise id / multi-item v2 input). */
export class PracticeCheckError extends Error {
  readonly code = 'practice/invalid_input';

  constructor(message: string) {
    super(message);
    this.name = 'PracticeCheckError';
  }
}

export interface ExerciseOutcome {
  exerciseId: string;
  kind: Exercise['kind'];
  correct: boolean;
  /** Primary source line — the remediation target («در مکالمه ببین»). */
  lineId: string;
  objective: string;
}

export interface PracticeCheckResult {
  total: number;
  correctCount: number;
  outcomes: ExerciseOutcome[];
  /** One entry per WRONG exercise (lineId+objective mapping, severity per rules below). */
  weakPoints: WeakPoint[];
}

/** Base severity per kind; escalated to 'high' when the line teaches catalog items. */
const SEVERITY_BY_KIND: Record<Exercise['kind'], WeakPoint['severity']> = {
  'speaker-identify': 'low',
  'order-reconstruct': 'medium',
  'listen-no-text': 'medium',
  'fill-token': 'high',
};

/** Is this answer correct for this exercise? (v1: exactly one item per exercise.) */
export function isAnswerCorrect(exercise: Exercise, answer: ExerciseAnswer | undefined): boolean {
  const item = exercise.items[0];
  if (!item || exercise.items.length !== 1) {
    throw new PracticeCheckError(`exercise ${exercise.id} must carry exactly one item in v1`);
  }
  if (!answer) return false;
  if (item.kind === 'order-reconstruct') {
    if (!('orderedLineIds' in answer)) return false;
    return (
      answer.orderedLineIds.length === item.correctOrder.length &&
      answer.orderedLineIds.every((id, i) => id === item.correctOrder[i])
    );
  }
  if (!('optionId' in answer)) return false;
  return answer.optionId === item.correctOptionId;
}

/**
 * Check a whole session. Missing answers count as incorrect (the UI requires all
 * answered before submitting); unknown exercise ids throw PracticeCheckError.
 */
export function checkAnswers(
  exercises: Exercise[],
  answers: Record<string, ExerciseAnswer>,
  /** Teaches-map for severity escalation: lineId → does it teach catalog items? */
  teachesByLine?: Map<string, string[]>,
): PracticeCheckResult {
  const known = new Set(exercises.map((e) => e.id));
  for (const id of Object.keys(answers)) {
    if (!known.has(id)) {
      throw new PracticeCheckError(`answer references unknown exercise "${id}"`);
    }
  }

  const outcomes: ExerciseOutcome[] = exercises.map((exercise) => {
    const lineId = exercise.sourceLineIds[0] ?? '';
    return {
      exerciseId: exercise.id,
      kind: exercise.kind,
      correct: isAnswerCorrect(exercise, answers[exercise.id]),
      lineId,
      objective: exercise.objective,
    };
  });

  const weakPoints: WeakPoint[] = outcomes
    .filter((o) => !o.correct)
    .map((o) => {
      const taught = teachesByLine?.get(o.lineId)?.length ?? 0;
      const severity: WeakPoint['severity'] = taught > 0 ? 'high' : SEVERITY_BY_KIND[o.kind];
      return { lineId: o.lineId, objective: o.objective, severity };
    });

  return {
    total: outcomes.length,
    correctCount: outcomes.filter((o) => o.correct).length,
    outcomes,
    weakPoints,
  };
}
