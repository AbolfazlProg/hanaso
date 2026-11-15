/**
 * HANASO — Station walk state (pure) — TASK-LEARNING-07 Wave 3.
 *
 * The step/results math behind StationRunner's block navigation, extracted so the
 * walk contract is unit-testable without a renderer (the runner owns the async
 * completion POST; this module owns every step transition):
 * - Issue #102 «مرحلهٔ قبل»: stepping back NEVER drops earned exercise results —
 *   a completed exercise block stays completed (skip-forward, no re-grading).
 * - Issue #106 (F4) «بازگشت به آموزش»: resolving the authored teaching block the
 *   feedback ladder points back to, INSIDE this station's authored block order.
 * - Issue #106 (F2): merging server-eliminated option ids across attempts (an
 *   eliminated option stays eliminated for every later attempt of the exercise).
 */
import type { ClientTeachingBlock } from './client-transport';

/** Any block addressable by id (every ClientTeachingBlock variant carries one). */
export type BlockLike = Pick<ClientTeachingBlock, 'id'>;

/** Earned exercise-session score per exercise-block id (first-try fraction 0..1). */
export type BlockResults = Record<string, number>;

/** Next step, clamped to the authored range (finishing the station is the host's job). */
export function nextStep(step: number, blockCount: number): number {
  return Math.min(step + 1, Math.max(0, blockCount - 1));
}

/** Previous step, clamped at the first block (Issue #102). */
export function prevStep(step: number): number {
  return Math.max(0, step - 1);
}

/** True from the 2nd block onward — the only place «مرحلهٔ قبل» may appear. */
export function canGoPrev(step: number): boolean {
  return step > 0;
}

/**
 * Issue #106 (F4): the step index of the teaching block to return to, or null
 * when the id does not resolve inside this station (the runner must stay put —
 * content keeps that contract via the curriculum-content tests).
 */
export function stepOfBlock(blocks: readonly BlockLike[], blockId: string): number | null {
  const index = blocks.findIndex((b) => b.id === blockId);
  return index >= 0 ? index : null;
}

/** Record an earned exercise result (overwrites on a genuinely new session). */
export function withBlockResult(results: BlockResults, blockId: string, score: number): BlockResults {
  return { ...results, [blockId]: score };
}

/**
 * The earned result of one exercise block, or null when it was never completed
 * (a 0-score completed session is still an earned result — it was fully walked).
 */
export function blockResult(results: BlockResults, blockId: string): number | null {
  return results[blockId] ?? null;
}

/**
 * Issue #106 (F2): the union of server-eliminated option ids across attempts —
 * deduped, order-stable (eliminations only ever accumulate within an exercise).
 */
export function mergeEliminated(current: readonly string[], incoming?: readonly string[]): string[] {
  return [...new Set([...current, ...(incoming ?? [])])];
}

/**
 * Issue #102: the score an exercise_threshold station finishes with after a
 * back/forward walk — the LAST authored exercise block's earned result (a
 * re-visited earlier block's skip must not overwrite it), falling back to the
 * last fired session score, then null (the caller decides the honest default).
 */
export function stationFinishScore(
  blocks: readonly { id: string; kind: string }[],
  results: BlockResults,
  fallback: number | null,
): number | null {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]!;
    if (block.kind === 'exercise') return blockResult(results, block.id) ?? fallback;
  }
  return fallback;
}
