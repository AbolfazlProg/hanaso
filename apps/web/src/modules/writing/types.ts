/**
 * HANASO — shared handwriting engine types (TASK-LEARNING-07 / DD-105/DD-106/DD-111).
 *
 * One engine for every Japanese character the product can practice: kana today
 * (Chapter 01), kanji for future chapters. The engine is char-agnostic; the only
 * per-character input is stroke data in the Hanzi-Writer format — and when that
 * data does not exist the engine reports `data_missing` honestly instead of
 * fabricating an evaluation (no fake grading, ever).
 */

/** Hanzi-Writer-format character data (`public/writing-data/<char>.json`). */
export interface WritingCharData {
  /** SVG path strings, one per stroke, in the 0..1024 coordinate space (y down). */
  strokes: string[];
  /** Median point path per stroke — the geometric reference for evaluation. */
  medians: number[][][];
}

/** Practice modes (TASK-LEARNING-07 §4.1). */
export type WritingMode = 'guided' | 'trace' | 'free';

/**
 * Per-stroke similarity metrics, each in 0..1 (1 = perfect match).
 * Computed by the HANASO analysis layer (normalized geometry — never a raw
 * bitmap comparison, so a correctly-written but slightly imperfect stroke is
 * not failed unfairly).
 */
export interface StrokeMetrics {
  /** Overall match used for accept/reject (product of the three). */
  overall: number;
  /** Start→end direction agreement with the median. */
  direction: number;
  /** Path-shape agreement (resampled mean distance, size-normalized). */
  shape: number;
  /** Centroid (relative position) agreement. */
  position: number;
}

/** What went wrong on a rejected stroke — drives the Persian feedback ladder. */
export type StrokeErrorKind = 'direction' | 'form' | 'position' | 'uncertain';

/** Verdict for one evaluated stroke attempt. */
export interface StrokeEvaluation {
  accepted: boolean;
  metrics: StrokeMetrics;
  errorKind: StrokeErrorKind | null;
}

/** The six DD-106 quality dimensions recorded per attempt (0..1). */
export interface WritingDimensions {
  /** C1 — stroke count (quiz enforces; 1 unless user abandons). */
  count: number;
  /** C2 — stroke order (quiz enforces; derived from mistakes on order). */
  order: number;
  /** C3 — stroke direction agreement. */
  direction: number;
  /** C4 — per-stroke form (shape) agreement. */
  form: number;
  /** C5 — relative position / layout agreement. */
  layout: number;
  /** C6 — overall legibility composite (first-try correctness). */
  legibility: number;
}

/** Final verdict of a completed writing attempt (TASK-LEARNING-07 §4.2). */
export type WritingVerdict =
  | 'correct'
  | 'correct_with_hints'
  | 'order_error'
  | 'form_error'
  | 'position_error'
  | 'uncertain_retry';

/** Structured practice record (DD-111: summary only — raw pen paths are NEVER stored or sent). */
export interface WritingAttemptSummary {
  character: string;
  mode: WritingMode;
  strokesTotal: number;
  /** First-attempt correct strokes (from the quiz engine). */
  strokesFirstTry: number;
  /** Total mistakes the quiz engine counted. */
  totalMistakes: number;
  /** Hints shown. */
  hintsShown: number;
  /** Whether the user finished all strokes. */
  completed: boolean;
  verdict: WritingVerdict;
  dimensions: WritingDimensions;
  /** Wall-clock duration (ms). */
  durationMs: number;
}

/** Honest availability answer for a character (drives the UI's data-missing state). */
export type WritingAvailability =
  | { status: 'available'; strokes: number }
  | { status: 'data_missing' };

/** Leniency ladder (DD-106): teaching-lenient → standard → strict. */
export type WritingLeniency = 'teaching' | 'standard' | 'strict';
