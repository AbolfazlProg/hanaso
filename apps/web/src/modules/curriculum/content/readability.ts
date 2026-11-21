/**
 * HANASO — the readability-claim engine (UX-AUDIT #141, root A).
 *
 * «با کاناهایی که تا این‌جا آموختی کاملاً خواندنی است» used to be a STATIC
 * string authored per example — identical on stage 1/12 (where only あ is
 * taught) and on the wrap-up. The claim was wrong exactly where it matters
 * most: the learner's first contact with the «you can read» promise.
 *
 * THE CONTRACT: the claim is COMPUTED from two data sides —
 *  1. the word's REQUIRED kana (derived from `ja` through the kana registry —
 *     never hand-listed), and
 *  2. the kana the walk has actually TAUGHT by the current position.
 * The renderer picks the label; the content-contract test suite runs the same
 * function for every example of every chapter (and draft) so a future chapter
 * cannot publish a premature claim.
 *
 * PURE module (client-safe): only data + normalize().
 */
import { KANA_ITEMS } from './kana-items';

const GLYPH_BY_CHAR = new Map<string, string>(KANA_ITEMS.map((k) => [k.glyph, k.kanaId]));

/** The three honest readability states of an example word. */
export type ReadabilityKind = 'readable' | 'station-end' | 'preview';

export interface ReadabilityLabel {
  kind: ReadabilityKind;
  /** The Persian sentence rendered under the word (generated — no authored copy). */
  textFa: string;
  /** Required kana (glyphs) the word is built from (registry kana only). */
  requiredKana: string[];
  /** Required kana NOT yet taught at the claim's position (diagnostics/tests). */
  missingKana: string[];
}

/**
 * The kana a word REQUIRES — every `ja` character that maps to a registry
 * kana (voiced compositions resolve to their base kana; kanji, punctuation
 * and the long-vowel mark are ignored — they are not kana knowledge).
 *
 * Issue #146: the registry now CARRIES the voiced/yōon glyphs too (the kana
 * bank is complete). The required side still resolves a voiced glyph to its
 * BASE kana's knowledge (き + the ゛ rule — exactly what chapter 01's h5/h6/h15
 * rule stations teach), because reading knowledge = base glyph + mark rule.
 * The voiced registry card itself is drilled in kana-expansion-01; resolving
 * to the base keeps every chapter-01 readability claim honest and unchanged.
 */
export function requiredKanaOf(ja: string): string[] {
  const out: string[] = [];
  for (const ch of Array.from(new Set(Array.from(ja)))) {
    // voiced kana (が・ぱ…) decompose FIRST — their knowledge is base + mark rule
    const decomposed = ch.normalize('NFD').replace(/[\u3099\u309A]/g, '');
    if (decomposed !== ch && GLYPH_BY_CHAR.has(decomposed)) {
      out.push(decomposed);
      continue;
    }
    if (GLYPH_BY_CHAR.has(ch)) {
      out.push(ch);
      continue;
    }
    // non-registry kana (small ゃ/ょ, っ, ー…) — the mark rules, not kana knowledge
  }
  return out;
}

/**
 * The honest readability label for one example at one walk position.
 *
 * @param ja the example word
 * @param taughtSoFar kana glyphs taught BEFORE this point (previous stations +
 *        the kana-card blocks of this station that came before the example)
 * @param taughtByStationEnd kana glyphs taught by the END of the current
 *        station (superset of taughtSoFar)
 */
export function readabilityLabel(ja: string, taughtSoFar: string[], taughtByStationEnd: string[]): ReadabilityLabel {
  const required = requiredKanaOf(ja);
  const soFar = new Set(taughtSoFar);
  const byEnd = new Set(taughtByStationEnd);
  const missing = required.filter((g) => !soFar.has(g));
  const missingByEnd = required.filter((g) => !byEnd.has(g));

  if (missing.length === 0) {
    return {
      kind: 'readable',
      textFa: 'با کاناهایی که تا این‌جا آموختی کاملاً خواندنی است.',
      requiredKana: required,
      missingKana: [],
    };
  }
  if (missingByEnd.length === 0) {
    return {
      kind: 'station-end',
      textFa: 'در همین ایستگاه خواندنی می‌شود — کاناهایش را همین درس می‌آموزد.',
      requiredKana: required,
      missingKana: missing,
    };
  }
  return {
    kind: 'preview',
    textFa: 'پیش‌نمایش واژه‌های پیش رو — کاناهایش را در ایستگاه‌های بعدی می‌آموزی.',
    requiredKana: required,
    missingKana: missingByEnd,
  };
}
