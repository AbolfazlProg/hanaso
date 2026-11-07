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
import type { Chapter, Exercise, LevelPolicy, Station } from './types';
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
  /**
   * TASK-LEARNING-06 (Issue #106 — ladder step F2): on a WRONG 2nd attempt the
   * server deterministically eliminates one wrong option (never the key) so the
   * client can grey it out. Absent for non-option exercises / when no wrong
   * option is eliminable.
   */
  eliminateOptionIds?: string[];
  /**
   * TASK-LEARNING-06 (Issue #106 — ladder step F4): the authored teaching block
   * this exercise returns to when the ladder is exhausted (wrong at F3). The
   * client renders «بازگشت به آموزش» and a weak-point event is recorded.
   */
  referenceBlockId?: string;
  /**
   * TASK-LEARNING-08 Addendum-5 §3 — the correct answer's pronunciation (a
   * committed audio asset) so the learner can HEAR it after answering. Set by
   * the grading ROUTE for the kana exercise kinds (kana sound / word audio);
   * absent when no committed asset exists (the client hides the control).
   * Only ever attached to an ANSWERED outcome — never pre-answer (no leak).
   */
  correctAudio?: { what: string; opus: string; m4a: string };
}

/** Grade one answer at a given attempt number (1-based) against the ladder. */
export function gradeExerciseAnswer(ex: Exercise, answer: ExerciseAnswerPayload, attemptNo = 1): GradeOutcome {
  const correct = isCorrect(ex, answer);
  if (correct) {
    return { correct: true, level: 0, feedbackFa: 'درست!' };
  }
  const level = attemptNo <= 1 ? 1 : attemptNo === 2 ? 2 : 3;
  const feedbackFa = level === 1 ? ex.feedback.f1Fa : level === 2 ? ex.feedback.f2HintFa : ex.feedback.f3ExplainFa;
  const reveal = level >= 3 ? revealText(ex) : undefined;
  // F2 (#106): eliminate exactly one wrong option — first authored wrong option
  // after the deterministic shuffle (stable, never the key, never the learner's
  // own wrong pick when avoidable).
  let eliminateOptionIds: string[] | undefined;
  if (level === 2 && ex.options && ex.correctOptionId) {
    const shuffled = shuffleSeeded(ex.options, ex.id);
    const victim = shuffled.find(
      (o) => o.id !== ex.correctOptionId && o.id !== (answer.kind === 'option' ? answer.optionId : ''),
    );
    if (victim) eliminateOptionIds = [victim.id];
  }
  // F4 (#106): return-to-teaching pointer once the ladder is exhausted.
  const referenceBlockId = level >= 3 ? ex.referenceBlockId : undefined;
  return { correct: false, level, feedbackFa, reveal, eliminateOptionIds, referenceBlockId };
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
    case 'listen-who-asked':
    // TASK-LEARNING-06: kana shapes are option-based (glyph→romaji / romaji→glyph / word→romaji).
    case 'kana-recognition':
    case 'kana-recall':
    case 'kana-decode':
    // TASK-LEARNING-08 Addendum-5 §3: the kana SOUND → glyph (option-based).
    case 'kana-listening':
      return answer.kind === 'option' && answer.optionId === ex.correctOptionId;
    case 'word-order':
    case 'dialogue-order':
      return answer.kind === 'order' && arraysEqual(answer.orderedIds, ex.correctOrder ?? []);
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
        .sort((a, b) => (ex.acceptedChipOrder?.indexOf(a.id) ?? 0) - (ex.acceptedChipOrder?.indexOf(b.id) ?? 0))
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
export function stationMeetsCompletion(station: Station, score: number | null, taskCompleted = false): boolean {
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

/**
 * Grade a full gate submission (raw answers only) against the chapter bank.
 *
 * TASK-LEARNING-04 (#110 / EQA-7): gate thresholds and measure weights are
 * INJECTED from data — the caller passes the chapter's level policy (single
 * source: LEVELS_BY_CODE[chapter.levelCode]) and the chapter's own mastery
 * weights. No stage2-style hardcoded threshold can reach this path.
 */
export function gradeMasterySubmission(
  chapter: Chapter,
  answers: Record<string, ExerciseAnswerPayload>,
  level: Pick<LevelPolicy, 'caps'>,
): MasteryGradingResult {
  const bank = Object.values(chapter.exercises).filter((e) => e.assessmentRole.startsWith('mastery_'));
  const perQuestion: Record<string, boolean> = {};
  const wrongByMeasure: Record<string, string[]> = {};

  let m1 = 0,
    m2 = 0,
    m3 = 0,
    m4 = 0,
    m5 = 0;
  let c1 = 0,
    c2 = 0,
    c3 = 0,
    c4 = 0,
    c5 = 0;

  for (const ex of bank) {
    const answer = answers[ex.id];
    const ok = answer !== undefined && isCorrect(ex, answer);
    perQuestion[ex.id] = ok;
    const measure = ex.assessmentRole.slice('mastery_'.length);
    if (!ok) {
      (wrongByMeasure[measure] ??= []).push(ex.id);
    }
    switch (measure) {
      case 'M1':
        m1 += ok ? 1 : 0;
        c1 += 1;
        break;
      case 'M2':
        m2 += ok ? 1 : 0;
        c2 += 1;
        break;
      case 'M3':
        m3 += ok ? 1 : 0;
        c3 += 1;
        break;
      case 'M4':
        m4 += ok ? 1 : 0;
        c4 += 1;
        break;
      case 'M5':
        m5 += ok ? 1 : 0;
        c5 += 1;
        break;
    }
  }

  const scores = {
    M1: c1 ? m1 / c1 : null,
    M2: c2 ? m2 / c2 : null,
    M3: c3 ? m3 / c3 : null,
    M4: c4 ? m4 / c4 : null,
    M5: c5 ? m5 / c5 : null,
  } as const;

  const result = computeMastery(scores, level.caps.gate, chapter.mastery.weights);
  const remediationStations = [
    ...new Set(
      Object.keys(wrongByMeasure)
        .flatMap((m) => chapter.mastery.weakPointMap[m] ?? [])
        .filter(Boolean),
    ),
  ];

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
  /**
   * TASK-LEARNING-08 Addendum-5 §3 — the QUESTION's own sound (committed
   * asset): attached ONLY where hearing it is part of the prompt, never the
   * answer key:
   *   - kana-listening — the sound IS the question (auto-play + replay);
   *   - kana-recall — the prompt's reading sound (the visible Persian prompt
   *     in audio form; it cannot reveal which GLYPH is correct).
   * NEVER attached to kana-recognition/kana-decode — there the sound equals
   * the answer and would leak it before answering (owner rule §3).
   */
  promptAudio?: { opus: string; m4a: string } | null;
}

/**
 * Deterministic per-exercise shuffle (QUESTION §۲-۴ anti-guess): options leave the
 * server in a stable-but-varied order so the correct answer's position carries no
 * pattern across the bank (authored positions are a/b/c-biased — this kills the bias
 * without unstable re-shuffles inside a session).
 */
function shuffleSeeded<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const c of seed) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * TASK-LEARNING-04 (EQA-4): the 0-based position of the correct option in the
 * order the learner actually sees (after the deterministic server shuffle).
 * Returns null for non-option exercises.
 */
export function servedCorrectPosition(ex: Exercise): number | null {
  if (!ex.options || !ex.correctOptionId) return null;
  return shuffleSeeded(ex.options, ex.id).findIndex((o) => o.id === ex.correctOptionId);
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
    options: ex.options ? shuffleSeeded(ex.options, ex.id) : undefined,
    clozeTokens: ex.clozeTokens,
    chunks: ex.chunks ? shuffleSeeded(ex.chunks, `${ex.id}:chunks`) : undefined,
    chips: ex.chips,
    lineRef: ex.lineRef,
  };
}
