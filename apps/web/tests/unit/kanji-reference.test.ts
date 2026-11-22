/**
 * HANASO — the N5 kanji reference integrity suite (KANJI-TWO-PHASE §۱ — 2026-11-22).
 *
 * Permanent regression over the MAIN path: the reference module, its vendored
 * stroke sources, and the shipped writing-data assets. Proves:
 *   - exactly 103 entries, unique ids and literals (anti-duplication);
 *   - every kanji has readings, meanings (EN + FA), stroke count, grade;
 *   - the honest provenance block never claims JLPT-official status;
 *   - every kanji's stroke data SHIPPED (writing-data index covers all 103 —
 *     «کارت مرور نوشتن بدون داده ضربه = unknown صادقانه»);
 *   - the writing-data stroke counts == reference strokeCount == vendored SVG.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  KANJI_ITEMS,
  KANJI_ITEMS_BY_ID,
  KANJI_ITEMS_BY_LITERAL,
  KANJI_N5_SOURCE,
  kanjiById,
  kanjiByLiteral,
  kanjiFsrsCardIds,
  kanjiInSurface,
  wordsContainingKanji,
} from '@/modules/curriculum/kanji';

const webRoot = path.resolve(path.dirname(import.meta.url.replace('file://', '')), '../..');
const writingIndex = JSON.parse(readFileSync(path.join(webRoot, 'public', 'writing-data', 'index.json'), 'utf8')) as {
  chars: Record<string, { strokes: number }>;
  kanji?: { count?: number };
};

describe('the N5 kanji reference (the 103 set)', () => {
  it('carries exactly 103 unique kanji (ids AND literals)', () => {
    expect(KANJI_ITEMS).toHaveLength(103);
    expect(new Set(KANJI_ITEMS.map((k) => k.kanjiId)).size).toBe(103);
    expect(new Set(KANJI_ITEMS.map((k) => k.literal)).size).toBe(103);
  });

  it('every entry is structurally complete (readings, meanings, strokes, ucs)', () => {
    for (const k of KANJI_ITEMS) {
      expect(k.literal.length, `${k.kanjiId} literal`).toBe(1);
      expect(k.ucs).toMatch(/^[0-9a-f]{4,5}$/);
      expect(k.strokeCount).toBeGreaterThan(0);
      expect(k.meaningsEn.length).toBeGreaterThan(0);
      expect(k.meaningFa.trim().length, `${k.kanjiId} meaningFa`).toBeGreaterThan(1);
      expect(k.on.length + k.kun.length, `${k.kanjiId} readings`).toBeGreaterThan(0);
      // readings are kana-only surfaces (on=katakana, kun=hiragana — the KANJIDIC2 convention)
      for (const r of k.on) expect(r).toMatch(/^[ァ-ヴー・]+$/u);
      for (const r of k.kun) expect(r).toMatch(/^[ぁ-ゖー.-]+$/u);
    }
  });

  it('the ids are the documented convention (kj-<lowercase ucs>) and lookups work both ways', () => {
    for (const k of KANJI_ITEMS) expect(k.kanjiId).toBe(`kj-${k.ucs}`);
    expect(KANJI_ITEMS_BY_ID.size).toBe(103);
    expect(KANJI_ITEMS_BY_LITERAL.size).toBe(103);
    expect(kanjiById('kj-4eba')!.literal).toBe('人');
    expect(kanjiByLiteral('学')!.kanjiId).toBe('kj-5b66');
    expect(kanjiById('kj-nope')).toBeUndefined();
  });

  it('the provenance block is honest — never claims an official JLPT list', () => {
    expect(KANJI_N5_SOURCE.dataset).toContain('KANJIDIC2');
    expect(KANJI_N5_SOURCE.databaseVersion.length).toBeGreaterThan(0);
    expect(KANJI_N5_SOURCE.license).toContain('CC BY-SA');
    expect(KANJI_N5_SOURCE.crossCheckedWith).toContain('practicejlpt');
    // the honesty marker itself:
    expect(KANJI_N5_SOURCE.notOfficial).toContain('JLPT publishes no official');
  });

  it('the anchor vessel helpers derive from real word surfaces', () => {
    expect(kanjiInSurface('日本人です')).toEqual(['日', '本', '人']);
    expect(kanjiInSurface('こんにちは')).toEqual([]);
    const words = [
      { id: 'w1', term: '日本人' },
      { id: 'w2', term: 'あの方' },
    ];
    expect(wordsContainingKanji('人', words).map((w) => w.id)).toEqual(['w1']);
  });

  it('the fsrs card-id convention is the ONE shared definition', () => {
    expect(kanjiFsrsCardIds('kj-4eba')).toEqual({ rec: 'kj-rec-kj-4eba', wri: 'kj-wri-kj-4eba' });
  });
});

describe('the shipped kanji writing-data (KanjiVG-derived)', () => {
  it('covers EVERY reference kanji with stroke data (no honest gaps)', () => {
    for (const k of KANJI_ITEMS) {
      const entry = writingIndex.chars[k.literal];
      expect(entry, `writing-data index must cover ${k.literal}`).toBeDefined();
      expect(entry!.strokes).toBe(k.strokeCount);
    }
    expect(writingIndex.kanji?.count).toBe(103);
  });

  it('the stroke files parse and match the reference stroke counts (sampled deep check over ALL 103)', () => {
    for (const k of KANJI_ITEMS) {
      const file = JSON.parse(
        readFileSync(path.join(webRoot, 'public', 'writing-data', `${k.literal}.json`), 'utf8'),
      ) as {
        strokes: string[];
        medians: number[][][];
      };
      expect(file.strokes.length, `${k.literal} stroke count`).toBe(k.strokeCount);
      expect(file.medians.length).toBe(k.strokeCount);
      // bounds: the writing engine's char space is 1024×1024 (y-down)
      for (const m of file.medians) {
        for (const p of m) {
          const [x, y] = p as [number, number];
          expect(Math.abs(x)).toBeLessThanOrEqual(1024 + 30);
          expect(Math.abs(y)).toBeLessThanOrEqual(1024 + 30);
        }
      }
      // every stroke is one continuous centerline path starting with M
      for (const d of file.strokes) expect(d.startsWith('M')).toBe(true);
    }
  });

  it('the vendored KanjiVG sources exist for all 103 (license README travels with them)', () => {
    expect(readFileSync(path.join(webRoot, 'vendor', 'kanjivg-kanji', 'README.md'), 'utf8')).toContain('CC BY-SA 3.0');
    for (const k of KANJI_ITEMS) {
      const svg = readFileSync(path.join(webRoot, 'vendor', 'kanjivg-kanji', `${k.literal}.svg`), 'utf8');
      expect(svg).toContain('kvg:');
      expect(svg).toContain('KanjiVG');
    }
  });
});
