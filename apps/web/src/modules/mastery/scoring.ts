/**
 * HANASO — Dialogue Mastery scoring (TASK-DLG-POC-01 → TASK-LEARNING-04 #110).
 *
 * Weighted score + per-measure floors per KB dialogue-mastery-model §۲.
 *
 * TASK-LEARNING-04 (#110 / EQA-7): thresholds are NO LONGER a hardcoded stage
 * table — `computeMastery` only accepts an INJECTED threshold set. The single
 * source of truth for gate thresholds is the level policy
 * (curriculum/content/levels.ts — LEVEL_BASED_CONTENT_MATRIX §۶, DD-091/OQ-016).
 * Callers resolve `LEVELS_BY_CODE[chapter.levelCode].caps.gate` and pass it in;
 * passing a literal stage name is now a type error by construction.
 */
import { MASTERY_MEASURES, type MasteryMeasure, type MasteryScores } from './types';

/** Weights (KB dialogue-mastery-model §۱) — sum to 1. Per-chapter overrides live in
 *  chapter.mastery.weights and are injected by the curriculum grading path. */
export const MASTERY_WEIGHTS: Record<MasteryMeasure, number> = {
  M1: 0.3, // meaning
  M2: 0.2, // vocabulary
  M3: 0.2, // grammar/structures
  M4: 0.2, // listening
  M5: 0.1, // speaker & intent
};

/**
 * Gate thresholds (LEVEL_MATRIX §۶ — e.g. L2/L3: 0.70/0.50, L4/L5: 0.75/0.55,
 * L6/L7: 0.80/0.60). `listeningFloor` is optional: no level policy defines one
 * today; the field exists so a future policy can add it without another refactor.
 */
export interface MasteryThresholds {
  weighted: number;
  minMeasure: number;
  listeningFloor?: number;
}

export interface MasteryResult {
  /** Weighted score over the ASSESSED measures (nulls excluded), or null when nothing assessed. */
  weightedScore: number | null;
  /** Measures below their floor among the assessed ones. */
  weakMeasures: MasteryMeasure[];
  /** Measures not assessed in this attempt. */
  unassessed: MasteryMeasure[];
  outcome: 'passed' | 'remediate' | 'incomplete';
}

/**
 * Score an attempt against INJECTED thresholds (EQA-7 — no hardcoded stage):
 * - incomplete: any measure unassessed (null) — the mastery gate needs all 5 (§۲ D3).
 * - remediate: assessed everywhere but weighted < threshold or a measure < floor.
 * - passed: weighted ≥ threshold AND every measure ≥ floor.
 */
export function computeMastery(
  scores: MasteryScores,
  thresholds: MasteryThresholds,
  weights: Record<MasteryMeasure, number> = MASTERY_WEIGHTS,
): MasteryResult {
  const assessed = MASTERY_MEASURES.filter((m) => scores[m] !== null);
  const unassessed = MASTERY_MEASURES.filter((m) => scores[m] === null);

  if (assessed.length === 0) {
    return { weightedScore: null, weakMeasures: [], unassessed, outcome: 'incomplete' };
  }

  const weightSum = assessed.reduce((acc, m) => acc + weights[m], 0);
  const weighted = assessed.reduce((acc, m) => acc + weights[m] * (scores[m] ?? 0), 0) / weightSum;

  const weakMeasures = assessed.filter((m) => (scores[m] ?? 0) < thresholds.minMeasure);
  const listeningBelowFloor = thresholds.listeningFloor !== undefined && (scores.M4 ?? 1) < thresholds.listeningFloor;

  if (unassessed.length > 0) {
    return { weightedScore: round3(weighted), weakMeasures, unassessed, outcome: 'incomplete' };
  }
  const passed = weighted >= thresholds.weighted && weakMeasures.length === 0 && !listeningBelowFloor;
  return {
    weightedScore: round3(weighted),
    weakMeasures,
    unassessed,
    outcome: passed ? 'passed' : 'remediate',
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
