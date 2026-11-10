/**
 * HANASO — kana-word romaji (TASK-LEARNING-08 Addendum-3 §8).
 *
 * The Latin reading is the COMPLEMENTARY guide (Persian leads everywhere).
 * Derived from the kana registry — never hand-typed, so it can never drift
 * from the structural data (DD-122).
 *
 * ー (chōonpu) lengthens the previous vowel (ノート → nooto); ん → n; any
 * non-kana character (e.g. ～) passes through as-is.
 */
import { KANA_ITEMS } from './content/kana-items';

const ROMAJI_BY_GLYPH = new Map<string, string>(KANA_ITEMS.map((k) => [k.glyph, k.romaji]));

const VOWEL_TAIL = /[aiueo]$/;

export function kanaWordRomaji(word: string): string {
  let out = '';
  for (const ch of word) {
    if (ch === 'ー') {
      // lengthen: repeat the trailing vowel (nooto, koohii)
      if (VOWEL_TAIL.test(out)) out += out[out.length - 1];
      continue;
    }
    if (ch === '～') {
      out += '~'; // fullwidth tilde → the ASCII complement
      continue;
    }
    const r = ROMAJI_BY_GLYPH.get(ch);
    out += r ?? ch;
  }
  return out;
}
