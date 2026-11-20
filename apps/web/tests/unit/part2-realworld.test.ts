/**
 * PART2-REALWORLD — the ط/د content contracts:
 *
 *   m2 — the REAL menu/signboard board leads the station; every ASSESSED word
 *        appears on the board first (the glossed clue closes the
 *        untaught-vocabulary-guess hole — パソコン class).
 *   m1 — the friend's POSTCARD (the «پیام دوستت» promise) leads; bare board
 *        (no glosses — the gloss would answer the decode exercises); every
 *        line is taught corpus (hostwords or already-seen real words).
 *   h0 — the wrap-up stays in the walk (the NOTE-BUG1 fix: the dialogue CTA
 *        anchors the walk at it instead of completing the station).
 *   G1 — the last core station's completion CTA carries the gate wiring.
 */
import { describe, expect, it } from 'vitest';
import { getChapter } from '@/modules/curriculum/content';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import type { Station } from '@/modules/curriculum/types';

const chapter = getChapter('kana-foundation-01')!;
const stationBySlug = (slug: string): Station => chapter.stations.find((s) => s.slug === slug)!;

const boardsOf = (st: Station) => st.blocks.filter((b) => b.kind === 'realworld-board');
const boardItems = (st: Station) =>
  boardsOf(st).flatMap((b) => b.panels.flatMap((p) => p.items.map((it) => it.ja)));
const assessedWords = (st: Station) =>
  st.blocks
    .filter((b) => b.kind === 'exercise')
    .flatMap((b) => b.exerciseIds.map((id) => chapter.exercises[id]?.promptJa))
    .filter((x): x is string => typeof x === 'string' && x.length > 1);

/** Every glyph of a word is introduced by the chapter (decodable). Dakuten/
 * handakuten marks resolve to their base glyph (the h5/h15/k6 rule classes). */
const DECOR = 'ーっゃゅょッャュョ';
const glyphsDecodable = (word: string) =>
  [...word].every((g) => {
    if (KANA_ITEMS.some((k) => k.glyph === g) || DECOR.includes(g)) return true;
    if ('゙゚'.includes(g)) return true; // the marks themselves — checked via the base below
    // dakuten/handakuten derivation: strip the mark and check the base glyph
    const base = g.normalize('NFD');
    return [...base].some((b) => KANA_ITEMS.some((k) => k.glyph === b) || DECOR.includes(b));
  });

describe('PART2 د — the m2 real menu/signboard experience', () => {
  const m2 = stationBySlug('stn-kana-m2-realworld');

  it('a glossed board LEADS the station before any exercise', () => {
    const boards = boardsOf(m2);
    expect(boards.length).toBeGreaterThanOrEqual(1);
    const firstExerciseIdx = m2.blocks.findIndex((b) => b.kind === 'exercise');
    const boardIdx = m2.blocks.findIndex((b) => b.kind === 'realworld-board');
    expect(boardIdx).toBeGreaterThanOrEqual(0);
    expect(boardIdx).toBeLessThan(firstExerciseIdx);
    expect(boards[0]!.showGloss).toBe(true);
    expect(boards[0]!.panels.length).toBeGreaterThanOrEqual(2);
  });

  it('EVERY assessed word appears on the board BEFORE its exercise (the clue law)', () => {
    const items = boardItems(m2);
    for (const word of assessedWords(m2)) {
      expect(items, `board must show ${word} before assessing it`).toContain(word);
    }
  });

  it('the assessed menu words are glyph-decodable (all katakana taught ≤ k12)', () => {
    for (const word of assessedWords(m2)) {
      expect(glyphsDecodable(word), `${word} fully decodable`).toBe(true);
    }
  });

  it('the menu comprehension items exist (reading ON the board, not a card stack)', () => {
    for (const id of ['ex-kana-m2-menu-pc', 'ex-kana-m2-menu-coffee', 'ex-kana-m2-menu-sand']) {
      const ex = chapter.exercises[id];
      expect(ex, id).toBeDefined();
      expect(ex.promptFa).toMatch(/منو|تابلو/);
    }
  });
});

describe('PART2 ط — the m1 friend\'s postcard', () => {
  const m1 = stationBySlug('stn-kana-m1-reading');

  it('a BARE board (decode challenge — glosses would leak the answers)', () => {
    const boards = boardsOf(m1);
    expect(boards.length).toBeGreaterThanOrEqual(1);
    expect(boards[0]!.showGloss).toBe(false);
    const boardIdx = m1.blocks.findIndex((b) => b.kind === 'realworld-board');
    expect(boardIdx).toBeLessThan(m1.blocks.findIndex((b) => b.kind === 'exercise'));
  });

  it('every postcard line is decodable from taught glyphs (nothing new)', () => {
    for (const line of boardItems(m1)) {
      expect(glyphsDecodable(line), `${line} decodable`).toBe(true);
    }
  });

  it('the postcard shows the SAME words the exercises assess (the artifact is real)', () => {
    const items = boardItems(m1);
    for (const word of assessedWords(m1)) {
      expect(items, `postcard must show ${word}`).toContain(word);
    }
  });
});

describe('PART2 ط — h0 wrap-up and the G1 gate in the execution path', () => {
  it('h0 keeps its wrap-up block in the walk (NOTE-BUG1: step 3/3 renders)', () => {
    const h0 = stationBySlug('stn-kana-h0');
    expect(h0.blocks[h0.blocks.length - 1]!.kind).toBe('wrap-up');
    const dialogue = h0.blocks.find((b) => b.kind === 'dialogue-player');
    expect(dialogue).toBeDefined();
  });

  it('the anchor dialogue page anchors the walk at the wrap-up (no station completing)', () => {
    const src = require('node:fs').readFileSync('src/components/curriculum/anchor-dialogue-experience.tsx', 'utf8');
    expect(src).toContain("kind === 'wrap-up'");
    expect(src).toContain("action: 'progress'");
    // the CTA path: progress (anchor) + the ?block= deep link back to the walk
    expect(src).toContain("action: 'progress'");
    expect(src).toContain('?block=');
    // completion only survives as the no-wrap-up fallback AFTER the early return
    const fallback = src.indexOf("action: 'complete'");
    const earlyReturn = src.indexOf('        return;');
    expect(earlyReturn).toBeGreaterThan(0);
    expect(fallback).toBeGreaterThan(earlyReturn);
  });

  it('the last core station is m2 — the gate CTA wires to the assessment route', () => {
    const core = chapter.stations.filter((s) => s.core).sort((a, b) => a.order - b.order);
    expect(core[core.length - 1]!.slug).toBe('stn-kana-m2-realworld');
    const src = require('node:fs').readFileSync('src/components/curriculum/station-runner.tsx', 'utf8');
    expect(src).toContain('gateOpen');
    expect(src).toContain('/assessment');
  });
});
