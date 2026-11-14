/**
 * HANASO — writing-practice content contract tests (TASK-LEARNING-07 / DD-105/DD-111).
 *
 * Pins the authored writing blocks to the SHIPPED stroke assets and the
 * pedagogical walk order:
 *  1. every practiced character (incl. focus-pair members) has real stroke
 *     data in public/writing-data — a `data_missing` authored into content
 *     would be fake UX (the engine's honest data_missing state is a RUNTIME
 *     answer for future chars, not something we author into Ch01);
 *  2. every focus pair's members are already TAUGHT by that point in the walk
 *     (pair discrimination must never preview an untaught glyph — Issue #96
 *     spirit: never test the untaught);
 *  3. writing blocks live in kana-teaching stations only (rule stations —
 *     long-vowel/dakuten/yoon/sokuon/choonpu — teach combos with no shipped
 *     stroke data);
 *  4. the mission-critical confusable pairs are all covered somewhere:
 *     さ/き · シ/ツ · ソ/ン · め/ぬ;
 *  5. practice-layer honesty: no station's completion/mastery depends on the
 *     writing block (it is never a gate — DD-106).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getChapter } from '@/modules/curriculum/content';
import { orderedStations } from '@/modules/curriculum/journey';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import type { TeachingBlock } from '@/modules/curriculum/types';

const chapter = getChapter('kana-foundation-01')!;
const webRoot = join(__dirname, '..', '..', '..');
const dataIndex = JSON.parse(readFileSync(join(webRoot, 'public', 'writing-data', 'index.json'), 'utf8')) as {
  chars: Record<string, { strokes: number }>;
};

const GLYPH_BY_KANA_ID = new Map(KANA_ITEMS.map((k) => [k.kanaId, k.glyph]));

type WritingBlock = Extract<TeachingBlock, { kind: 'writing-practice' }>;

/** (station order, station slug, block) for every writing block in walk order. */
function writingBlocks(): Array<{ order: number; station: string; block: WritingBlock }> {
  const out: Array<{ order: number; station: string; block: WritingBlock }> = [];
  for (const station of orderedStations(chapter)) {
    for (const block of station.blocks) {
      if (block.kind === 'writing-practice') out.push({ order: station.order, station: station.slug, block });
    }
  }
  return out;
}

/** Glyphs a learner has SEEN as kana-cards by the END of a station with the given order. */
function glyphsTaughtUpTo(order: number): Set<string> {
  const taught = new Set<string>();
  for (const station of orderedStations(chapter)) {
    if (station.order > order) continue;
    for (const block of station.blocks) {
      if (block.kind === 'kana-card') {
        const glyph = GLYPH_BY_KANA_ID.get(block.kanaId);
        if (glyph) taught.add(glyph);
      }
    }
  }
  return taught;
}

describe('writing-practice blocks vs shipped stroke data (TASK-LEARNING-07)', () => {
  const blocks = writingBlocks();

  it('are authored across the kana-teaching stations (Ch01 capability is real, not a stub)', () => {
    expect(blocks.length).toBeGreaterThanOrEqual(20);
    const stationsWith = new Set(blocks.map((b) => b.station));
    // every base-glyph teaching station (h1..h3, h7..h12, h14..h15, k1..k7, k9..k12) has one
    for (const slug of [
      'stn-kana-h1',
      'stn-kana-h2',
      'stn-kana-h3',
      'stn-kana-h7',
      'stn-kana-h8',
      'stn-kana-h9',
      'stn-kana-h10',
      'stn-kana-h11',
      'stn-kana-h12',
      'stn-kana-h14',
      'stn-kana-h15',
      'stn-kana-k1',
      'stn-kana-k2',
      'stn-kana-k3',
      'stn-kana-k4',
      'stn-kana-k5',
      'stn-kana-k6',
      'stn-kana-k7',
      'stn-kana-k9',
      'stn-kana-k10',
      'stn-kana-k11',
      'stn-kana-k12',
    ]) {
      expect(stationsWith.has(slug), `${slug} must ship a writing block`).toBe(true);
    }
  });

  it('never authors a character without shipped stroke data (no fake data_missing UX)', () => {
    for (const { station, block } of blocks) {
      for (const ch of [...block.characters, ...(block.focusPairs ?? []).flat()]) {
        expect(dataIndex.chars[ch], `${station}: ${ch} needs stroke data shipped`).toBeDefined();
      }
    }
  });

  it('keeps every block a small curated set (≤ 8 practice chips)', () => {
    for (const { station, block } of blocks) {
      expect(block.characters.length, `${station}`).toBeLessThanOrEqual(8);
      expect(block.characters.length, `${station}`).toBeGreaterThanOrEqual(1);
      expect(new Set(block.characters).size, `${station}`).toBe(block.characters.length);
    }
  });

  it('only quizzes glyphs the walk has already taught (never the untaught)', () => {
    for (const { order, station, block } of blocks) {
      const taught = glyphsTaughtUpTo(order);
      for (const ch of [...block.characters, ...(block.focusPairs ?? []).flat()]) {
        expect(taught.has(ch), `${station} practices ${ch} before its kana-card teaches it`).toBe(true);
      }
    }
  });

  it('rule stations (dakuten/yoon/sokuon/long vowels) author NO writing block', () => {
    const ruleStations = new Set(['stn-kana-h4', 'stn-kana-h5', 'stn-kana-h6', 'stn-kana-h13', 'stn-kana-k8']);
    for (const { station } of blocks) {
      expect(ruleStations.has(station), `${station} teaches combo rules — no shipped stroke data`).toBe(false);
    }
  });

  it('covers all four mission-critical confusable pairs somewhere in the walk', () => {
    const authored = new Set<string>();
    for (const { block } of blocks) {
      for (const [a, b] of block.focusPairs ?? []) {
        authored.add([a, b].sort().join('|'));
      }
    }
    for (const pair of [
      ['さ', 'き'],
      ['シ', 'ツ'],
      ['ソ', 'ン'],
      ['め', 'ぬ'],
    ]) {
      const key = [...pair].sort().join('|');
      expect(authored.has(key), `required pair ${pair.join('/')} must be practiced`).toBe(true);
    }
  });

  it('is practice-layer only: never the station gate (DD-106)', () => {
    for (const station of chapter.stations) {
      const hasWriting = station.blocks.some((b) => b.kind === 'writing-practice');
      if (!hasWriting) continue;
      // completion stays exercise-driven; writing carries no threshold semantics
      expect(station.completion.kind, `${station.slug}`).not.toBe('writing_threshold');
    }
  });

  it('has unique block ids across the chapter', () => {
    const ids = blocks.map((b) => b.block.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
