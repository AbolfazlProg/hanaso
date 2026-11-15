/**
 * HANASO — Station walk state tests (TASK-LEARNING-07 Wave 3).
 *
 * The pure step/results math extracted from StationRunner (modules/curriculum/
 * station-walk) — the walk contract behind:
 * - Issue #102 «مرحلهٔ قبل»: back-navigation never loses earned exercise results;
 *   completed exercise blocks stay completed (skip-forward without re-grading).
 * - Issue #106 F4 «بازگشت به آموزش»: the teaching-block pointer resolves inside
 *   the station's authored block order (unknown ids keep the learner in place).
 * - Issue #106 F2: server eliminations accumulate across attempts, deduped.
 */
import { describe, expect, it } from 'vitest';
import {
  blockResult,
  canGoPrev,
  mergeEliminated,
  nextStep,
  prevStep,
  stationFinishScore,
  stepOfBlock,
  withBlockResult,
  type BlockLike,
  type BlockResults,
} from '@/modules/curriculum/station-walk';

const blocks: BlockLike[] = [
  { id: 'blk-teach-kana-a' },
  { id: 'blk-ex-warmup' },
  { id: 'blk-teach-rule' },
  { id: 'blk-ex-drill' },
];

/** The same walk with block kinds (the finishing-score rule needs them). */
const walkBlocks: { id: string; kind: string }[] = [
  { id: 'blk-teach-kana-a', kind: 'kana-card' },
  { id: 'blk-ex-warmup', kind: 'exercise' },
  { id: 'blk-teach-rule', kind: 'rule-card' },
  { id: 'blk-ex-drill', kind: 'exercise' },
  { id: 'blk-wrapup', kind: 'wrap-up' },
];

describe('step math — Issue #102 (back navigation)', () => {
  it('prev steps back exactly one block', () => {
    expect(prevStep(3)).toBe(2);
    expect(prevStep(1)).toBe(0);
  });

  it('prev clamps at the first block (no leaving the authored range)', () => {
    expect(prevStep(0)).toBe(0);
  });

  it('canGoPrev is false only on the first block — «مرحلهٔ قبل» appears from the 2nd onward', () => {
    expect(canGoPrev(0)).toBe(false);
    expect(canGoPrev(1)).toBe(true);
    expect(canGoPrev(blocks.length - 1)).toBe(true);
  });

  it("next is clamped to the last block (finishing the station stays the host's job)", () => {
    expect(nextStep(2, blocks.length)).toBe(3);
    expect(nextStep(3, blocks.length)).toBe(3);
  });
});

describe('F4 return-to-teaching — Issue #106', () => {
  it('resolves the authored teaching block to its step index', () => {
    expect(stepOfBlock(blocks, 'blk-teach-kana-a')).toBe(0);
    expect(stepOfBlock(blocks, 'blk-teach-rule')).toBe(2);
  });

  it('an unresolvable block id returns null — the runner must stay put, not crash', () => {
    expect(stepOfBlock(blocks, 'blk-in-another-station')).toBeNull();
    expect(stepOfBlock([], 'blk-teach-rule')).toBeNull();
  });
});

describe('earned results survive the back/forward walk — Issue #102', () => {
  it('a completed exercise block keeps its result while stepping back and forward again', () => {
    // The learner finishes blk-ex-warmup (step 1), walks back to the kana card,
    // then forward again — the earned result must still be there (skip panel).
    const results: BlockResults = withBlockResult({}, 'blk-ex-warmup', 0.75);

    let step = 1;
    step = prevStep(step); // → 0 (re-read the teaching card)
    expect(step).toBe(0);
    step = nextStep(step, blocks.length); // → 1 (back on the exercise block)
    expect(step).toBe(1);

    expect(blockResult(results, 'blk-ex-warmup')).toBe(0.75);
    expect(blockResult(results, 'blk-ex-drill')).toBeNull();
  });

  it('walking back past a completed exercise block never drops its result (no event touches results)', () => {
    const results: BlockResults = withBlockResult({}, 'blk-ex-drill', 0.9);
    // two steps back, one forward — results only change via withBlockResult
    let step = 3;
    step = prevStep(step);
    step = prevStep(step);
    step = nextStep(step, blocks.length);
    expect(step).toBe(2);
    expect(blockResult(results, 'blk-ex-drill')).toBe(0.9);
  });

  it('a redone session overwrites its own block result; other blocks are untouched', () => {
    let results: BlockResults = withBlockResult({}, 'blk-ex-warmup', 0.5);
    results = withBlockResult(results, 'blk-ex-drill', 0.8);
    results = withBlockResult(results, 'blk-ex-warmup', 1);
    expect(blockResult(results, 'blk-ex-warmup')).toBe(1);
    expect(blockResult(results, 'blk-ex-drill')).toBe(0.8);
  });

  it('a fully-walked 0-score session is still an earned result (it was completed, just weak)', () => {
    const results = withBlockResult({}, 'blk-ex-warmup', 0);
    expect(blockResult(results, 'blk-ex-warmup')).toBe(0);
  });
});

describe('F2 option elimination merge — Issue #106', () => {
  it("unions the server's eliminations with the accumulated set", () => {
    expect(mergeEliminated(['opt-a'], ['opt-b'])).toEqual(['opt-a', 'opt-b']);
  });

  it('dedupes — an already-eliminated option is not listed twice', () => {
    expect(mergeEliminated(['opt-a'], ['opt-a', 'opt-b'])).toEqual(['opt-a', 'opt-b']);
  });

  it('an absent elimination payload leaves the set untouched', () => {
    expect(mergeEliminated(['opt-a'], undefined)).toEqual(['opt-a']);
    expect(mergeEliminated([], [])).toEqual([]);
  });
});

describe('station finishing score — Issue #102 (what a threshold station completes with)', () => {
  it("the LAST authored exercise block's earned result finishes the station", () => {
    const results = withBlockResult(withBlockResult({}, 'blk-ex-warmup', 1), 'blk-ex-drill', 0.8);
    expect(stationFinishScore(walkBlocks, results, null)).toBe(0.8);
  });

  it('skipping an EARLIER exercise block on the way back must not overwrite the finish score', () => {
    // warmup was re-visited and skipped (0.4 overwrites nothing) — drill 0.8 still finishes
    let results = withBlockResult({}, 'blk-ex-drill', 0.8);
    results = withBlockResult(results, 'blk-ex-warmup', 0.4); // a redo of the earlier block
    expect(stationFinishScore(walkBlocks, results, null)).toBe(0.8);
  });

  it('falls back to the last fired session score when the last exercise block has no result', () => {
    const results = withBlockResult({}, 'blk-ex-warmup', 0.6);
    expect(stationFinishScore(walkBlocks, results, 0.5)).toBe(0.5);
  });

  it('returns the fallback for stations without exercise blocks (viewed/task stations)', () => {
    expect(stationFinishScore([{ id: 'b1', kind: 'scene' }], {}, null)).toBeNull();
    expect(stationFinishScore([{ id: 'b1', kind: 'scene' }], {}, 0.9)).toBe(0.9);
  });
});
