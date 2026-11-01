/**
 * HANASO — Practice module types (TASK-SLICE-01 / Issue #40) — stage C of the A→D cycle.
 *
 * The four dialogue-native exercise kinds per KB dialogue-exercise-design §۱
 * (FEAT-096..099): speaker attribution, dialogue ordering, blind listening and
 * token cloze. ALL exercise material (options, sentences, translations, tokens)
 * comes from the unit's own dialogue — no fabricated outside data (AC-949: ≥80%,
 * this generator is 100%).
 */
import type { DialogueToken } from '@/modules/dialogue';

export const EXERCISE_KINDS = [
  'speaker-identify',
  'order-reconstruct',
  'listen-no-text',
  'fill-token',
] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

/** A Persian-labelled choice option (character names / translations). */
export interface ExerciseOption {
  id: string;
  labelFa: string;
}

/** A Japanese token choice option (fill-token). */
export interface TokenOption {
  id: string;
  surface: string;
  reading: string;
}

/** FEAT-096 — listen to a line (audio only, no text) → who said it? */
export interface SpeakerIdentifyItem {
  kind: 'speaker-identify';
  /** The line to PLAY — its text must NOT be shown by the UI. */
  lineId: string;
  /** The scene's characters (3 choices). */
  options: ExerciseOption[];
  correctOptionId: string;
}

/** FEAT-097 — reconstruct the order of a short exchange (click-to-order in v1). */
export interface OrderReconstructItem {
  kind: 'order-reconstruct';
  /** Shuffled sentences of one contiguous exchange (the material to order). */
  sentences: { lineId: string; tokens: DialogueToken[]; fa: string }[];
  /** lineIds in the dialogue's original order. */
  correctOrder: string[];
}

/** FEAT-098 — blind listening: hear a line → pick the correct Persian meaning. */
export interface ListenNoTextItem {
  kind: 'listen-no-text';
  /** The line to PLAY — no text shown. */
  lineId: string;
  /** Correct fa translation + 2 distractors taken from OTHER lines of the same dialogue. */
  options: ExerciseOption[];
  correctOptionId: string;
}

/** FEAT-044/047 flavour — a dialogue sentence with one token blanked. */
export interface FillTokenItem {
  kind: 'fill-token';
  lineId: string;
  /** Index of the blanked token inside the line. */
  blankIndex: number;
  /** The line's tokens with the blanked one replaced by `null`. */
  maskedTokens: (DialogueToken | null)[];
  /** Correct token + distractors from the same dialogue. */
  options: TokenOption[];
  correctOptionId: string;
}

export type ExerciseItem =
  | SpeakerIdentifyItem
  | OrderReconstructItem
  | ListenNoTextItem
  | FillTokenItem;

/**
 * One practice question. v1 generators emit exactly ONE item per exercise (the
 * `items` array keeps room for grouped items later); the checker therefore reads
 * `items[0]`.
 */
export interface Exercise {
  id: string;
  kind: ExerciseKind;
  /** Persian instruction shown above the question. */
  prompt: string;
  items: ExerciseItem[];
  /** Dialogue lines this exercise draws from (weak-point mapping targets). */
  sourceLineIds: string[];
  /**
   * Learning objective for weak-point mapping: a lesson-catalog id when resolvable
   * (e.g. 'gr-wo-object'), else a stable kind default ('speaker-attribution', …).
   */
  objective: string;
}

/** One learner answer for an exercise (v1: the answer to `items[0]`). */
export type ExerciseAnswer = { optionId: string } | { orderedLineIds: string[] };
