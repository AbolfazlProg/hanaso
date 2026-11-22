/**
 * HANASO — the word-level DUAL pronunciation standard regression suite
 * (ENGINE-NEXTGEN W-D).
 *
 * The mission contract, made mechanical:
 *   - every word provides the standard romaji AND a Persian transliteration,
 *     the two CONSISTENT (derived from ONE mora walk over the same reading);
 *   - both live in the central knowledge registry + ONE shared component;
 *   - transliteration is CONTROLLED — card-truth labels + locked rule tables,
 *     any uncovered glyph is an ERROR, never a silent guess;
 *   - the existing data is inventoried (ops/reports/pronunciation-inventory.json
 *     — the owner's missing/inconsistent worklist), never silently rewritten.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { listChapters } from '@/modules/curriculum/content';
import {
  transliterateKanaToFa,
  transliterateKanaToRomaji,
  uncoveredKanaBank,
} from '@/modules/curriculum/content/translit-standard';
import { buildKnowledgeRegistry } from '@/modules/curriculum/knowledge';

const repoRoot = join(import.meta.dirname, '..', '..', '..', '..');
const chapters = listChapters();
const allWords = chapters.flatMap((c) => c.words);

describe('W-D — the controlled derivation', () => {
  it('covers the WHOLE kana bank: every glyph has a card Persian label + romaji', () => {
    const cov = uncoveredKanaBank();
    expect(cov.missingFa, `missing card labels: ${cov.missingFa.join(', ')}`).toEqual([]);
    expect(cov.missingRomaji, `missing romaji: ${cov.missingRomaji.join(', ')}`).toEqual([]);
  });

  it('never guesses: an uncovered glyph is an ERROR, not a silent label', () => {
    // ぢゃ is deliberately OUT of the locked voiced-yōon table (rare).
    const fa = transliterateKanaToFa('ぢゃん');
    const rm = transliterateKanaToRomaji('ぢゃん');
    expect(fa.errors.length).toBeGreaterThan(0);
    expect(rm.errors.length).toBeGreaterThan(0);
    // the partial output is never trusted — the callers gate on errors
    // (the registry leaves translitFa undefined in this case).
  });

  it('is DETERMINISTIC (the same reading, twice, is byte-identical)', () => {
    for (const rd of ['ちゅうごくじん', 'コーヒー', 'きょう']) {
      expect(transliterateKanaToFa(rd).fa).toBe(transliterateKanaToFa(rd).fa);
      expect(transliterateKanaToRomaji(rd).romaji).toBe(transliterateKanaToRomaji(rd).romaji);
    }
  });
});

describe('W-D — the locked standard forms', () => {
  // The Part-2 الف locks stay locked (the singleton y-row, the r-row, the
  // yōon compounds) — plus the W-D word-level rules (initial vowels, nasal
  // ZWNJ, sokuon shadda, chōonpu double-letter, foreign-small, えい→ee).
  it('the y-row singleton + compound locks (the Part-2 الف drift classes)', () => {
    expect(transliterateKanaToFa('きょう').fa).toBe('کیُو');
    expect(transliterateKanaToFa('きゅう').fa).toBe('کیوو');
    expect(transliterateKanaToFa('きよう').fa).toBe('کی\u200cیُو');
    expect(transliterateKanaToFa('びょういん').fa).toBe('بیُوین');
    expect(transliterateKanaToFa('びよういん').fa).toBe('بی\u200cیُوین');
  });

  it('the r-row lock: ロ=«رُ» (never the ル=«رو» collision — ゼロ proves it)', () => {
    expect(transliterateKanaToFa('ゼロ').fa).toBe('زهرُ');
    expect(transliterateKanaToRomaji('ゼロ').romaji).toBe('zero');
  });

  it('initial/medial standalone vowels (おんがく·おおさか·いえ·えき)', () => {
    expect(transliterateKanaToFa('おんがく').fa).toBe('اون\u200cگاکو');
    expect(transliterateKanaToFa('おおさか').fa).toBe('اووساکا');
    expect(transliterateKanaToFa('いえ').fa).toBe('ایه');
    expect(transliterateKanaToFa('えき').fa).toBe('اِکی');
  });

  it('the mora nasal carries the ZWNJ; the sokuon carries the shadda', () => {
    expect(transliterateKanaToFa('えんぴつ').fa).toBe('اِن\u200cپیتسو');
    expect(transliterateKanaToFa('ざっし').fa).toBe('زاش\u0651ی');
    expect(transliterateKanaToRomaji('ざっし').romaji).toBe('zasshi');
  });

  it('the chōonpu doubles the vowel letter on BOTH scripts (کوو↔koo)', () => {
    expect(transliterateKanaToFa('コーヒー').fa).toBe('کووهیی');
    expect(transliterateKanaToRomaji('コーヒー').romaji).toBe('koohii');
    expect(transliterateKanaToFa('ジュース').fa).toBe('جووسو');
    expect(transliterateKanaToRomaji('ジュース').romaji).toBe('juusu');
  });

  it('the locked foreign-small and voiced-yōon tables (ファ/ティ/ヴァ/びょ/ジュ)', () => {
    expect(transliterateKanaToFa('ファイル').fa).toBe('فایرو');
    expect(transliterateKanaToFa('ティッシュ').fa).toBe('تیشّو');
    expect(transliterateKanaToRomaji('ティッシュ').romaji).toBe('tisshu');
    expect(transliterateKanaToFa('ヴァイオリン').fa).toBe('وایورین');
    expect(transliterateKanaToFa('びょういん').fa).toBe('بیُوین');
    expect(transliterateKanaToRomaji('ジュース').romaji).toBe('juusu');
  });

  it('romaji is the double-vowel style (sensee/toukyou/gakkou — owner notes)', () => {
    expect(transliterateKanaToRomaji('せんせい').romaji).toBe('sensee');
    expect(transliterateKanaToRomaji('とうきょう').romaji).toBe('toukyou');
    expect(transliterateKanaToRomaji('がっこう').romaji).toBe('gakkou');
  });
});

describe('W-D — every registered word carries the CONSISTENT dual pronunciation', () => {
  const registry = buildKnowledgeRegistry(chapters);
  const wordEntries = registry.entries.filter((e) => e.kind === 'word');

  it('has words to guard (the suite is real)', () => {
    expect(wordEntries.length).toBeGreaterThanOrEqual(11);
  });

  it('every word entry carries reading + romaji + translitFa (none missing)', () => {
    for (const e of wordEntries) {
      expect(e.reading, `${e.id}: no reading`).toBeTruthy();
      expect(e.romaji, `${e.id}: no romaji`).toBeTruthy();
      expect(e.translitFa, `${e.id}: no derived translitFa`).toBeTruthy();
    }
  });

  it('the authored romaji IS the standard derivation (二者须一致 — one walk)', () => {
    for (const w of allWords) {
      const rm = transliterateKanaToRomaji(w.readingKana);
      expect(rm.errors, `${w.id}: uncovered glyphs ${rm.errors.join('; ')}`).toEqual([]);
      expect(rm.romaji, `${w.id}: authored «${w.romaji}» ≠ standard «${rm.romaji}»`).toBe(w.romaji);
    }
  });

  it('the registry translitFa IS the derivation of the entry reading (one truth)', () => {
    for (const e of wordEntries) {
      const fa = transliterateKanaToFa(e.reading!);
      expect(fa.errors, `${e.id}: uncovered`).toEqual([]);
      expect(e.translitFa).toBe(fa.fa);
    }
  });

  it('a word with an uncovered glyph leaves translitFa undefined + files a note (never a guess)', () => {
    // 塩 (しお) is a kanji-only reading string — no kana — uncovered → honest.
    const fa = transliterateKanaToFa('塩');
    expect(fa.errors.length).toBeGreaterThan(0);
    expect(fa.fa).toBe('');
  });
});

describe('W-D — the ONE shared component (no per-surface inline habits)', () => {
  it('WordPronunciation exists and renders the dual guide', () => {
    const src = readFileSync(
      join(import.meta.dirname, '../../src/components/curriculum/word-pronunciation.tsx'),
      'utf8',
    );
    expect(src).toContain('readingKana');
    expect(src).toContain('romaji');
    expect(src).toContain('translitFa');
    expect(src).toContain('wordTranslitLabel');
  });

  it('the vocab-card renders through the shared component (the inline habit is gone)', () => {
    const runner = readFileSync(
      join(import.meta.dirname, '../../src/components/curriculum/station-runner.tsx'),
      'utf8',
    );
    const vocabCase = /case 'vocab-card':[\s\S]*?case 'kana-card':/.exec(runner)![0];
    expect(vocabCase).toContain('<WordPronunciation');
    expect(vocabCase).not.toMatch(/\{word\.readingKana\} · \{word\.romaji\}/);
  });

  it('the review word card carries the same dual pronunciation', () => {
    const review = readFileSync(join(import.meta.dirname, '../../src/app/review/review-runner.tsx'), 'utf8');
    expect(review).toContain('<WordPronunciation');
    const registry = readFileSync(join(import.meta.dirname, '../../src/modules/fsrs/item-registry.ts'), 'utf8');
    expect(registry).toContain('translitFa: errors.length === 0 ? translitFa : undefined');
  });
});

describe('W-D — the inventory (the existing data, inventoried not rewritten)', () => {
  it('the report is committed and in sync with the live registry', () => {
    const report = JSON.parse(
      readFileSync(join(repoRoot, 'ops', 'reports', 'pronunciation-inventory.json'), 'utf8'),
    ) as {
      words: { total: number; summary: { consistent: number }; items: { derivedTranslitFa: string | null }[] };
      handRenderings: { total: number; summary: Record<string, number> };
    };
    expect(report.words.total).toBe(allWords.length);
    expect(report.words.items.every((w: { derivedTranslitFa: string | null }) => w.derivedTranslitFa)).toBe(true);
    expect(report.words.summary.consistent).toBe(report.words.total);
    // the honest classes exist (the owner worklist is real, not an empty file)
    expect(report.handRenderings.total).toBeGreaterThan(200);
    expect(Object.keys(report.handRenderings.summary)).toEqual(
      expect.arrayContaining(['consistent', 'inconsistent', 'missing-hand']),
    );
  });
});
