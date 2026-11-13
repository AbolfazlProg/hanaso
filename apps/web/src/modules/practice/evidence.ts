/**
 * HANASO — Practice evidence (TASK-HANASO-22) — Learning Object state math.
 *
 * Pure transitions over LearningObjectRecord (PRACTICE_DESIGN_DECISIONS §4):
 *  introduced (data-derived) → practiced (≥1 successful practice) →
 *  eligible_for_review (introduced + practiced).
 *
 * HARD HONESTY RULES (mission + FSRS_INTEGRATION_CONTRACT):
 *  - No review dates, no `reviewed` state, no mastery claims — the future M2
 *    engine owns those; this module only records what ACTUALLY happened.
 *  - Writing-dimension success NEVER gates the main path (optional skill).
 *  - All transitions are idempotent — replaying a session changes nothing.
 */
import type { LearningObjectRecord, LearningObjectState, PracticeItemResult } from './session';
import { PRACTICE_POLICY } from './kana/policy';

/** Fold one item result into a record (pure — returns a NEW record). */
export function foldItemResult(record: LearningObjectRecord, result: PracticeItemResult): LearningObjectRecord {
  const stats = { ...(record.dimensionStats ?? {}) };
  const cur = stats[result.dimension] ?? { seen: 0, firstTryCorrect: 0 };
  stats[result.dimension] = {
    seen: cur.seen + 1,
    firstTryCorrect: cur.firstTryCorrect + (result.firstTryCorrect ? 1 : 0),
  };
  const practiced =
    record.state !== 'introduced'
      ? record.state
      : result.firstTryCorrect || result.attempts >= 1 // any completed attempt with the reveal = practice
        ? 'practiced'
        : 'introduced';
  const state: LearningObjectState =
    practiced === 'practiced' || record.state === 'eligible_for_review' ? 'eligible_for_review' : practiced;
  return { ...record, dimensionStats: stats, state, updatedAt: new Date().toISOString() };
}

/** Seed a record for an object seen in a session (idempotent insert). */
export function seedRecord(userId: string, objectId: string, skill: LearningObjectRecord['skill']): LearningObjectRecord {
  return {
    userId,
    objectId,
    skill,
    state: 'introduced',
    dimensionStats: {},
    updatedAt: new Date().toISOString(),
  };
}

/**
 * The honest weak list: objects with enough sightings and low first-try
 * accuracy (PRACTICE_POLICY.weakAccuracyBelow / weakMinSeen). Never returns
 * objects without evidence.
 */
export function isWeakObject(record: LearningObjectRecord): boolean {
  let seen = 0;
  let correct = 0;
  for (const stats of Object.values(record.dimensionStats ?? {})) {
    seen += stats?.seen ?? 0;
    correct += stats?.firstTryCorrect ?? 0;
  }
  if (seen < PRACTICE_POLICY.weakMinSeen) return false;
  return correct / seen < PRACTICE_POLICY.weakAccuracyBelow;
}

/** First-try accuracy summary for the honest session recap. */
export function sessionSummary(results: readonly PracticeItemResult[]): {
  total: number;
  firstTryCorrect: number;
  weakDimensions: { dimension: string; seen: number; firstTryCorrect: number }[];
} {
  const byDim = new Map<string, { seen: number; firstTryCorrect: number }>();
  for (const r of results) {
    const cur = byDim.get(r.dimension) ?? { seen: 0, firstTryCorrect: 0 };
    cur.seen += 1;
    cur.firstTryCorrect += r.firstTryCorrect ? 1 : 0;
    byDim.set(r.dimension, cur);
  }
  return {
    total: results.length,
    firstTryCorrect: results.filter((r) => r.firstTryCorrect).length,
    weakDimensions: [...byDim.entries()]
      .filter(([, s]) => s.seen >= 2 && s.firstTryCorrect / s.seen < 0.7)
      .map(([dimension, s]) => ({ dimension, ...s })),
  };
}
