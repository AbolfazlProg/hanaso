/**
 * HANASO — glyph budget (TASK-LEARNING-14) — PURE module.
 *
 * The mechanical core of the mission's golden rule — «no question or example may
 * depend on untaught knowledge»: decompose every Japanese text surface into
 * (a) base glyphs (the 92 registry kana) and (b) rule marks (dakuten ゛ /
 * handakuten ゜ / small-kana ゃゅょっ / chōonpu ー / foreign-small — each taught
 * by a specific RULE unit). A surface is legal at station S iff every base glyph
 * is taught by S (cumulative kana-cards ∪ the station's declared
 * introducesGlyphs first-looks) AND every rule mark's unit has order ≤ S.
 *
 * Root cause this closes (TL-14 audit U1-U3): the old CONTENT-105 gate checked
 * only kana-decode promptJa + reading-role examples — rule-card tables, option
 * labels, cloze chips and slide words were never checked, which is exactly how
 * びょういん (ひ+ん+よ — none taught at H6) shipped inside the H6 rule card.
 */
import { KANA_ITEMS } from './content/kana-items';

/** Rule-derived marks, each taught by exactly one rule unit (station slug). */
export type RuleMark = 'dakuten' | 'handakuten' | 'yoon-small' | 'sokuon' | 'choonpu' | 'foreign-small';

/** The station that teaches each mark (rule units of the kana chapter). */
export const RULE_MARK_STATION: Record<RuleMark, string> = {
  dakuten: 'stn-kana-h5',
  handakuten: 'stn-kana-h15',
  'yoon-small': 'stn-kana-h6',
  sokuon: 'stn-kana-h13',
  choonpu: 'stn-kana-k8',
  /* TASK-HANASO-20: taught by stn-kana-k12-foreign (the real foreign-combination
     station — BUG-005 remediation). Before that station existed these were a
     registered wave-2 violation. */
  'foreign-small': 'stn-kana-k12-foreign',
};

/** Precomposed dakuten forms → base glyph (both scripts). */
const DAKUTEN_BASE: Record<string, string> = {
  が: 'か',
  ぎ: 'き',
  ぐ: 'く',
  げ: 'け',
  ご: 'こ',
  ざ: 'さ',
  じ: 'し',
  ず: 'す',
  ぜ: 'せ',
  ぞ: 'そ',
  だ: 'た',
  ぢ: 'ち',
  づ: 'つ',
  で: 'て',
  ど: 'と',
  ば: 'は',
  び: 'ひ',
  ぶ: 'ふ',
  べ: 'へ',
  ぼ: 'ほ',
  ガ: 'カ',
  ギ: 'キ',
  グ: 'ク',
  ゲ: 'ケ',
  ゴ: 'コ',
  ザ: 'サ',
  ジ: 'シ',
  ズ: 'ス',
  ゼ: 'セ',
  ゾ: 'ソ',
  ダ: 'タ',
  ヂ: 'チ',
  ヅ: 'ツ',
  デ: 'テ',
  ド: 'ト',
  バ: 'ハ',
  ビ: 'ヒ',
  ブ: 'フ',
  ベ: 'ヘ',
  ボ: 'ホ',
};

/** Precomposed handakuten forms → base glyph. */
const HANDAKUTEN_BASE: Record<string, string> = {
  ぱ: 'は',
  ぴ: 'ひ',
  ぷ: 'ふ',
  ぺ: 'へ',
  ぽ: 'ほ',
  パ: 'ハ',
  ピ: 'ヒ',
  プ: 'フ',
  ペ: 'ヘ',
  ポ: 'ホ',
};

/** Small kana (combining forms taught by the yōon unit). */
const YOON_SMALL = new Set(['ゃ', 'ゅ', 'ょ', 'ャ', 'ュ', 'ョ']);

/** Small tsu (sokuon). */
const SOKUON = new Set(['っ', 'ッ']);

/** Katakana long-vowel mark. */
const CHOONPU = 'ー';

/** Wave-2 foreign combining forms (small vowels + ヴ) — untaught today. */
const FOREIGN_SMALL = new Set([
  'ぁ',
  'ぃ',
  'ぅ',
  'ぇ',
  'ぉ',
  'ァ',
  'ィ',
  'ゥ',
  'ェ',
  'ォ',
  'ヴ',
  'ヷ',
  'ヸ',
  'ヹ',
  'ヺ',
]);


/**
 * TASK-HANASO-20 (audit UNTAUGHT_CONTENT_AUDIT): every precomposed/combining
 * DERIVED form — dakuten + handakuten (both scripts), the yōon smalls (both
 * scripts) and the foreign smalls. DERIVED-GLYPH-SHOWN (validation.ts) requires
 * each of these to be DISPLAYED in a prior teaching block before it may appear
 * in an example or assessment surface: the rule mark being taught (h5/h6/h15…)
 * is necessary but NOT sufficient — the script-specific derived form must have
 * been shown (generalization without display = removed scaffolding).
 */
export const DERIVED_FORMS: ReadonlySet<string> = new Set<string>([
  ...Object.keys(DAKUTEN_BASE),
  ...Object.keys(HANDAKUTEN_BASE),
  ...YOON_SMALL,
  ...FOREIGN_SMALL,
]);

/** The derived forms contained in a text (empty when none). */
export function derivedFormsIn(text: string): string[] {
  const out: string[] = [];
  for (const ch of text) if (DERIVED_FORMS.has(ch)) out.push(ch);
  return out;
}

const BASE_GLYPHS = new Set(KANA_ITEMS.map((k) => k.glyph));

export interface GlyphRequirement {
  /** Base registry glyphs the text depends on (each must be taught). */
  base: string[];
  /** Rule marks the text depends on (each must be from an already-taught rule unit). */
  marks: RuleMark[];
}

/**
 * Decompose a Japanese text surface. Non-kana characters (Persian, Latin,
 * punctuation, spaces) are ignored — the gate concerns itself with kana only.
 */
export function decomposeJa(text: string): GlyphRequirement {
  const base = new Set<string>();
  const marks = new Set<RuleMark>();
  for (const ch of text) {
    if (BASE_GLYPHS.has(ch)) {
      base.add(ch);
      continue;
    }
    const dak = DAKUTEN_BASE[ch];
    if (dak) {
      base.add(dak);
      marks.add('dakuten');
      continue;
    }
    const hand = HANDAKUTEN_BASE[ch];
    if (hand) {
      base.add(hand);
      marks.add('handakuten');
      continue;
    }
    if (YOON_SMALL.has(ch)) {
      marks.add('yoon-small');
      continue;
    }
    if (SOKUON.has(ch)) {
      marks.add('sokuon');
      continue;
    }
    if (ch === CHOONPU) {
      marks.add('choonpu');
      continue;
    }
    if (FOREIGN_SMALL.has(ch)) {
      marks.add('foreign-small');
      continue;
    }
    // non-kana (Persian/Latin/punct) — out of scope
  }
  return { base: [...base], marks: [...marks] };
}
