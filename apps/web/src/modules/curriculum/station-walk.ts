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

/** A block as the pair-walk math reads it (kind/lineTeaching optional — plain
 * BlockLike arrays without kinds simply never form a pair). */
export type WalkBlock = { id: string; kind?: string; lineTeaching?: boolean };

/**
 * LESSON-UX PART1 2026-11-26 (owner report «اولین درس مکالمه را دو بار نشان
 * می‌دهد») — the ONE definition of the grouped opening pair: a `scene` block
 * immediately followed by a FULL `dialogue-player` block (NOT a focused-line
 * teaching block — `lineTeaching` renders its own teaching view and keeps its
 * own step). The pair renders as ONE walk section at the SCENE's step; the
 * dialogue block itself is EMBEDDED and is never a step the walk parks on.
 */
export function isDialogueOpeningPair(blocks: readonly WalkBlock[], sceneIndex: number): boolean {
  const scene = blocks[sceneIndex];
  const dialogue = blocks[sceneIndex + 1];
  return scene?.kind === 'scene' && dialogue?.kind === 'dialogue-player' && dialogue.lineTeaching !== true;
}

/** True when blocks[i] is the EMBEDDED half of an opening pair (renders inside the scene's step). */
export function isEmbeddedDialogueBlock(blocks: readonly WalkBlock[], index: number): boolean {
  if (index <= 0) return false;
  return isDialogueOpeningPair(blocks, index - 1);
}

/** The steps the walk can actually PARK on (embedded halves excluded) — the honest rail math. */
export function walkableSteps(blocks: readonly WalkBlock[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < blocks.length; i++) if (!isEmbeddedDialogueBlock(blocks, i)) out.push(i);
  return out;
}

/** The walkable (parkable) position of a raw step, 1-based for the «n / m» counter. */
export function walkablePosition(blocks: readonly WalkBlock[], step: number): { current: number; total: number } {
  const walkable = walkableSteps(blocks);
  // a stale pointer AT an embedded step reports its pair head's position
  const effective = isEmbeddedDialogueBlock(blocks, step) ? step - 1 : step;
  const at = walkable.indexOf(effective);
  return { current: at >= 0 ? at + 1 : walkable.length, total: walkable.length };
}

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
  if (index < 0) return null;
  /* LESSON-UX PART1: an embedded dialogue block resolves to its PAIR HEAD (the
   * scene step) — every id-addressed jump (resume, ?block= deep link, F4
   * «بازگشت به آموزش», drill picks) lands on the grouped section, never on a
   * duplicated standalone player. */
  return isEmbeddedDialogueBlock(blocks as readonly WalkBlock[], index) ? index - 1 : index;
}

/**
 * LESSON-UX PART1 — pair-aware back navigation: «مرحلهٔ قبل» steps back to the
 * previous PARKABLE step, hopping over the embedded half of an opening pair
 * (the old plain `step - 1` parked the walk on the duplicated conversation
 * section — the «مکالمه دو بار» bug). Clamped at 0 like prevStep.
 */
export function prevWalkStep(blocks: readonly WalkBlock[], step: number): number {
  let target = Math.max(0, step - 1);
  while (target > 0 && isEmbeddedDialogueBlock(blocks, target)) target -= 1;
  return target;
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
