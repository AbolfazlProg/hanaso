/**
 * HANASO — Dialogue Mastery scoring (TASK-DLG-POC-01).
 * Weighted score + per-measure floors per KB dialogue-mastery-model §۲ (Provisional
 * numbers from DD-048 — exported as constants, calibration via OQ-016 with real data).
 */
import { MASTERY_MEASURES, type MasteryMeasure, type MasteryScores } from './types';

/** Weights (KB dialogue-mastery-model §۱) — sum to 1. */
export const MASTERY_WEIGHTS: Record<MasteryMeasure, number> = {
  M1: 0.3, // meaning
  M2: 0.2, // vocabulary
  M3: 0.2, // grammar/structures
  M4: 0.2, // listening
  M5: 0.1, // speaker & intent
};

/** Pass thresholds per journey stage (Provisional, DD-048 / OQ-016). */
export const MASTERY_THRESHOLDS = {
  stage2: { weighted: 0.7, minMeasure: 0.5 },
  stage3: { weighted: 0.75, minMeasure: 0.6 },
  stage45: { weighted: 0.8, minMeasure: 0.6, listeningFloor: 0.6 },
} as const;

export type MasteryStage = keyof typeof MASTERY_THRESHOLDS;

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
 * Score an attempt:
 * - incomplete: any measure unassessed (null) — the mastery gate needs all 5 (§۲ D3).
 * - remediate: assessed everywhere but weighted < threshold or a measure < floor.
 * - passed: weighted ≥ threshold AND every measure ≥ floor.
 */
export function computeMastery(scores: MasteryScores, stage: MasteryStage = 'stage2'): MasteryResult {
  const thresholds = MASTERY_THRESHOLDS[stage];
  const assessed = MASTERY_MEASURES.filter((m) => scores[m] !== null);
  const unassessed = MASTERY_MEASURES.filter((m) => scores[m] === null);

  if (assessed.length === 0) {
    return { weightedScore: null, weakMeasures: [], unassessed, outcome: 'incomplete' };
  }

  const weightSum = assessed.reduce((acc, m) => acc + MASTERY_WEIGHTS[m], 0);
  const weighted = assessed.reduce((acc, m) => acc + MASTERY_WEIGHTS[m] * (scores[m] ?? 0), 0) / weightSum;

  const weakMeasures = assessed.filter((m) => (scores[m] ?? 0) < thresholds.minMeasure);
  const listeningBelowFloor = 'listeningFloor' in thresholds && (scores.M4 ?? 1) < thresholds.listeningFloor;

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
