/**
 * PART2-NAME — the k13 name-katakana engine contract (Part-2 و).
 *
 * The seven owner requirements the engine must satisfy, tested over the
 * MANDATED real-name matrix (Persian + Latin/Finglish, repeated characters,
 * corrections, tray stages):
 *   1. both input scripts accepted — Persian script AND Latin/Finglish;
 *   2. a pronunciation suggestion EXISTS for every name in the matrix, shown
 *      mora-by-mora with its source letters;
 *   3. the suggestion is data the learner may correct (pure, no hidden state);
 *   4. the tray = required morae + extras (never a bare answer set);
 *   5. repeated characters → repeated cards (the tray carries duplicates);
 *   6. the progressive hint ladder (count → first-mismatch → reveal);
 *   7. the tolerated-variant class never blames a valid alternative spelling.
 * NO external service: everything here is the pure local module.
 */
import { describe, expect, it } from 'vitest';
import {
  checkArrangement,
  pickTrayExtras,
  suggestNameKatakana,
  suggestionSurface,
  TRAY_EXTRAS_POOL,
} from '@/modules/curriculum/kana-name';

/** The owner-mandated matrix: many DIFFERENT names, both scripts. */
const MATRIX = [
  // Latin/Finglish (high confidence)
  { input: 'Ali', script: 'en', expectContains: ['ア', 'リ'] },
  { input: 'Sara', script: 'en', expectContains: ['サ', 'ラ'] },
  { input: 'Reza', script: 'en', expectContains: ['レ', 'ザ'] },
  { input: 'Arash', script: 'en', expectContains: ['ア', 'ラ', 'シュ'] },
  { input: 'Mina', script: 'en', expectContains: ['ミ', 'ナ'] },
  { input: 'Maryam', script: 'en', expectContains: ['マ', 'リ', 'ヤ', 'ム'] },
  { input: 'Nana', script: 'en', expectContains: ['ナ', 'ナ'] }, // the duplicate case
  { input: 'Yasaman', script: 'en', expectContains: ['ヤ', 'サ', 'マ', 'ン'] },
  { input: 'Parisa', script: 'en', expectContains: ['パ', 'リ', 'サ'] },
  { input: 'Behnam', script: 'en', expectContains: ['ベ', 'ナ', 'ム'] },
  { input: 'Sohrab', script: 'en', expectContains: ['ソ', 'ラ', 'ブ'] },
  { input: 'Kiana', script: 'en', expectContains: ['キ', 'ア', 'ナ'] },
  // Persian script (medium confidence — the honest limit)
  { input: 'مریم', script: 'fa', expectContains: ['マ', 'リ', 'ム'] }, // letter-mapping — the UI notes マリヤム as a valid correction
  { input: 'نیما', script: 'fa', expectContains: ['ニ', 'マ'] },
  { input: 'آرش', script: 'fa', expectContains: ['ア', 'ラ'] }, // ش word-final → シュ (the medium-confidence default)
  { input: 'سارا', script: 'fa', expectContains: ['サ', 'ラ'] }, // سا→サ + را→ラ
  { input: 'گلناز', script: 'fa', expectContains: ['ガ', 'ラ', 'ナ'] }, // word-final ز → ズ (u-plane default)
  { input: 'پریسا', script: 'fa', expectContains: ['パ', 'リ', 'サ'] },
];

describe('PART2 و — the name engine over the mandated matrix', () => {
  it('accepts BOTH input scripts and suggests mora-by-mora with source letters', () => {
    for (const tc of MATRIX) {
      const s = suggestNameKatakana(tc.input);
      expect(s.script, tc.input).toBe(tc.script);
      expect(s.morae.length, `${tc.input} yields morae`).toBeGreaterThan(0);
      for (const m of s.morae) {
        expect(m.kana, `${tc.input} mora shape`).toMatch(/^[ァ-ー]+$/);
        expect(m.from.length, `${tc.input} mora ${m.kana} carries its source`).toBeGreaterThan(0);
      }
      for (const expected of tc.expectContains) {
        expect(suggestionSurface(s), `${tc.input} contains ${expected}`).toContain(expected);
      }
    }
  });

  it('every suggested glyph is TAUGHT katakana (the registry law)', () => {
    const taught = new Set(TRAY_EXTRAS_POOL);
    for (const tc of MATRIX) {
      for (const m of suggestNameKatakana(tc.input).morae) {
        // multi-char morae decompose into taught glyphs (ファ = フ+ァ — the
        // k12-foreign combos; ジャ = ジ+ャ — the k6 yōon class)
        for (const g of m.kana) {
          expect(taught.has(g) || 'ャュョァィゥウェォ'.includes(g), `${tc.input}: ${g} taught`).toBe(true);
        }
      }
    }
  });

  it('confidence is honest: Latin/Finglish = high, Persian script = medium (with the why)', () => {
    const en = suggestNameKatakana('Maryam');
    expect(en.confidence).toBe('high');
    expect(en.noteFa).toMatch(/فینگلیش|لاتین/);
    const fa = suggestNameKatakana('مریم');
    expect(fa.confidence).toBe('medium');
    expect(fa.noteFa).toMatch(/واکه‌های کوتاه/);
  });

  it('duplicated characters yield duplicated morae (Nana → ナナ; ناناز class too)', () => {
    const nana = suggestNameKatakana('Nana');
    const surface = suggestionSurface(nana);
    expect(surface).toBe('ナナ');
    // Persian input with a doubled mora after ZWNJ/letters also duplicates
    const fa = suggestNameKatakana('لاله');
    expect(suggestionSurface(fa)).toContain('ララ');
  });

  it('correcting the suggestion is pure data editing (requirement 3)', () => {
    const s = suggestNameKatakana('Sara');
    const corrected = { ...s, morae: [...s.morae.slice(0, 1), { kana: 'ザ', from: 'sa→za' }] };
    expect(suggestionSurface(corrected)).toBe('サザ');
    // the engine never mutates its input
    expect(suggestionSurface(s)).toBe('サラ');
  });

  it('the check verdict drives the progressive ladder, never a leaked answer', () => {
    const s = suggestNameKatakana('Maryam');
    const expected = s.morae.map((m) => m.kana);
    // exact build → correct
    expect(checkArrangement(expected, s).correct).toBe(true);
    // wrong count → mismatch, the first hint counts the morae
    const short = expected.slice(0, -1);
    const vShort = checkArrangement(short, s);
    expect(vShort.correct).toBe(false);
    expect(vShort.countMatches).toBe(false);
    // right count, wrong order → the first-mismatch index for hint 2
    const swapped = [...expected];
    [swapped[0], swapped[1]] = [swapped[1]!, swapped[0]!];
    const vSwap = checkArrangement(swapped, s);
    expect(vSwap.correct).toBe(false);
    expect(vSwap.firstMismatch).toBe(0);
  });

  it('the tolerated-variant class never blames a valid alternative (requirement 7)', () => {
    const s = suggestNameKatakana('Arash'); // シュ in the suggestion
    const build = s.morae.map((m) => m.kana).map((k) => (k === 'シュ' ? 'チュ' : k));
    expect(checkArrangement(build, s).correct).toBe(true);
  });
});

describe('PART2 و — the tray: required morae + extra distractor cards', () => {
  it('extras never include a required glyph and stay inside the taught pool', () => {
    const s = suggestNameKatakana('Kiana');
    const required = new Set(s.morae.map((m) => m.kana));
    for (let run = 0; run < 20; run++) {
      const extras = pickTrayExtras(4, required);
      expect(extras.length).toBe(4);
      for (const e of extras) {
        expect(required.has(e)).toBe(false);
        expect(TRAY_EXTRAS_POOL).toContain(e);
      }
    }
  });

  it('deterministic with an injected rng (testability of the tray)', () => {
    const a = pickTrayExtras(6, new Set(['カ']), () => 0.1);
    const b = pickTrayExtras(6, new Set(['カ']), () => 0.1);
    expect(a).toEqual(b);
  });
});
