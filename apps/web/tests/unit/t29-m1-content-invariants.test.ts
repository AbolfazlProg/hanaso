/**
 * TASK-HANASO-29 M1 evidence: every exercise block's exerciseIds resolve in
 * the chapter bank (runtime guarantee for the server-side completion guard).
 * Run: npx vitest run tests/unit/t29-m1-completion-guard.test.ts
 */
import { describe, expect, it } from 'vitest';
import { getChapter } from '@/modules/curriculum/content';

const exerciseBlocksOf = (slug: string) => {
  const ch = getChapter(slug)!;
  return ch.stations.flatMap((st) =>
    st.blocks
      .filter((b) => b.kind === 'exercise')
      .map((b) => ({ station: st, block: b as { id: string; exerciseIds: string[] } })),
  );
};

describe('TASK-HANASO-29 M1 — content invariants the server guard relies on', () => {
  for (const chapterSlug of ['kana-foundation-01', 'first-meeting-01']) {
    it(`${chapterSlug}: every exercise block's exerciseIds resolve in the bank (no empty sessions)`, () => {
      const blocks = exerciseBlocksOf(chapterSlug);
      expect(blocks.length).toBeGreaterThan(0);
      for (const { station, block } of blocks) {
        expect(block.exerciseIds.length, `${station.slug}/${block.id} has no exercises`).toBeGreaterThan(0);
        const ch = getChapter(chapterSlug)!;
        for (const id of block.exerciseIds) {
          expect(ch.exercises[id], `${station.slug}/${block.id} dangling exerciseId ${id}`).toBeDefined();
          expect(ch.exercises[id]!.assessmentRole, `${id} must be practice`).toBe('practice');
        }
      }
    });
  }

  it('every task_completed station WITH exercise blocks has ≥1 exercise item (guard never blocks an honest walk)', () => {
    for (const chapterSlug of ['kana-foundation-01', 'first-meeting-01']) {
      const ch = getChapter(chapterSlug)!;
      for (const st of ch.stations) {
        if (st.completion.kind !== 'task_completed') continue;
        const exBlocks = st.blocks.filter((b) => b.kind === 'exercise') as unknown as Array<{
          exerciseIds: string[];
        }>;
        const totalItems = exBlocks.reduce((n, b) => n + b.exerciseIds.length, 0);
        if (exBlocks.length > 0) {
          expect(totalItems, `${st.slug} has exercise blocks but 0 items`).toBeGreaterThan(0);
        }
      }
    }
  });
});
