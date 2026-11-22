/**
 * HANASO — the ONE Persian transliteration standard of chapter 01 (Part-2 الف).
 *
 * The owner mandate: a SINGLE standard applied everywhere — cards, exercises,
 * reviews, mnemonics, feedback. Before this file the content carried three
 * drift spots (audited 2026-11-20, Part-2 mission §الف):
 *
 *   1. ル/ロ collision — the k3 summary rendered BOTH as «رو»
 *      («ル(رو)، ロ(رو)»); the registry already said ル=«رو» vs ロ=«رُ».
 *   2. ヲ card gap — the card showed romaji "wo" with no note bridging
 *      wo ↔ «اُ» (the particle reading the content actually teaches).
 *   3. «یُ/یُو» reversal — singletons taught yo=«یُ»/yu=«یو» (cards + every
 *      recognition option), but compound readings flipped it (きょう=«کیوو»,
 *      きゅう=«کیُوو») — the same mora got two Persian labels depending on
 *      where it appeared.
 *
 * THE STANDARD (locked here, enforced by tests/unit/translit-standard.test.ts):
 *
 *   Short vowels (the あ-row convention the cards teach):
 *     a = «اَ/آ»   i = «ای»   u = «او» (plain و)   e = «اِ»   o = «اُ» (damma)
 *
 *   The y-row (singletons):  ya = «یا»   yu = «یو»   yo = «یُ»
 *     — damma marks the o-sound (same device as お=«اُ»), plain و marks u.
 *
 *   yōon compounds (one mora = onset + the singleton y-form):
 *     きゃ = «کیا»    きゅ = «کیو»    きょ = «کیُ»
 *     long-u appends ONE و: きゅう = «کیوو»   きょう = «کیُو»
 *     separated form (2 morae) splits like any sequence:
 *       きよう = «کی‌یُو» (ki + yo + u)
 *     word examples: びょういん = «بیُوین» · びよういん = «بی‌یُوین» ·
 *       とうきょう = «توکیُو» · ジュース = «جووس» · ちゃ = «چا»
 *
 *   The r-row:  ra=«را» ri=«ری» ru=«رو» re=«ره» ro=«رُ»  (رو = u, رُ = o)
 *
 *   を/ヲ = «اُ» — romaji "wo" survives ONLY as the historical spelling; the
 *   card note bridges the two (never a bare "wo" on a card).
 *
 * Every fixed spot in the content files cites this file. When a new reading is
 * authored, derive it from the tables above — never from another word's habit.
 */

import { KANA_ITEMS } from './kana-items';
import { KANA_TEACHING } from './kana-teaching';

/** The y-row singleton renderings (H14/K10 teach these; cards are the truth source). */
export const Y_ROW_FA = {
  ya: 'یا',
  yu: 'یو',
  yo: 'یُ',
} as const;

/** The r-row renderings (the ル/ロ class — plain و = u, damma = o). */
export const R_ROW_FA = {
  ra: 'را',
  ri: 'ری',
  ru: 'رو',
  re: 'ره',
  ro: 'رُ',
} as const;

/**
 * The yōon compound renderings that Part-2 fixed (the «یُ/یُو» drift).
 * Used by the content test as the source of truth for the FIXED forms.
 */
export const YOON_COMPOUNDS_FA = {
  // き family (the drift spot — was «کیوو» for BOTH kyou and kyuu)
  kya: 'کیا',
  kyu: 'کیو',
  kyu_long: 'کیوو', // きゅう
  kyo: 'کیُ',
  kyou_long: 'کیُو', // きょう
  kiyuu_separated: 'کی‌یُو', // きよう (ki + yo + u, three separate morae)
  // び family (the famous minimal pair of h6)
  byouin: 'بیُوین', // びょういん (hospital)
  biyouin: 'بی‌یُوین', // びよういん (hair salon)
  toukyou: 'توکیُو', // とうきょう
} as const;

/** Banned rendered strings — any of these in content = a standard violation. */
export const BANNED_TRANSLIT_STRINGS = [
  // the ル/ロ collision (both glyphs rendered with the same label)
  '، ロ(رو)',
  'ロ(رو)؛',
  // the «یُو» reversal for YU (yu is «یو»; «یُو» belongs to yo+long-vowel only)
  '«کیُوو»', // was きゅう — now «کیوو»
  '«کیُو» است', // was きゅ — now «کیو»
  // the compound-yo reversal for KYOU (now «کیُو»)
  'きょう (امروز) = کیوو',
] as const;

/* ================================================================ *
 * ENGINE-NEXTGEN W-D — the word-level DUAL pronunciation standard.
 *
 * The mission mandate: every word provides the standard romaji AND a
 * Persian transliteration guide, the two consistent with each other, both
 * stored once in the central knowledge registry and rendered through one
 * shared component — never re-authored by habit, never silently guessed.
 *
 * THE CONTROLLED DERIVATION (both scripts come from ONE mora walk):
 *
 *   Per-mora Persian labels are THE CARD TRUTH — the very labels the learner
 *   sees on the kana cards (KANA_TEACHING.pronunciationFa, normalized). A word
 *   is its morae concatenated:
 *     わたし = わ(وا)+た(تا)+し(شی) = «واتشی»
 *     にほんじん = نی+هُ+ن‌+جی+ن = «نیهُن‌جین»
 *
 *   Word-initial standalone vowels take the full letter form (what every
 *   surviving rendering does): あ=«آ» い=«ای» う=«او» え=«اِ» お=«او»
 *     おんがく = «اون‌گاکو» · おおさか = «اووساکا» · いえ = «ایه» · えき = «اِکی»
 *   Medial/final standalone vowels take the bare vowel letter:
 *     あ=«ا» い=«ی» う=«و» え=«ه» お=«و»
 *     かいぎ = «کایگی» · いえ = «ایه» · おおさか = «اووساکا»
 *
 *   The mora nasal ん/ン = «ن» and takes a ZWNJ AFTER it (the newest authored
 *   convention — the nasal boundary is where Persian letter-joining misparses):
 *     おんがく = «اون‌گاکو» · えんぴつ = «اِن‌پیتسو» · キャンプ = «کیان‌پُ»
 *
 *   Sokuon っ/ッ = shadda on the following mora's first letter:
 *     ざっし = «زاشّی» · がっこう = «گاکُّو» (the geminate carries the mark).
 *
 *   Chōonpu ー = repeat the previous label's final vowel letter:
 *     コーヒー = «کووهیی» · ジュース = «جووس».
 *
 *   Small kana merge into their compound mora (き+ゃ → きゃ=«کیا»); a small
 *   kana with no big-kana host, or ANY glyph outside the card truth, is an
 *   ERROR — never guessed. That is the anti-uncontrolled-generation rule:
 *   new kana content must extend KANA_TEACHING first (the cards), and the
 *   coverage gate (tests/unit/pronunciation-dual.test.ts) enforces it.
 *
 *   The よ-row yi-collision carries the ZWNJ (locked since Part-2 الف):
 *     きよう = «کی‌یُو» · びよういん = «بی‌یُوین» (see the header tables).
 *
 *   Romaji (double-vowel style — the owner notes' standard, sensee/toukyou):
 *     derived from the SAME walk via KANA_ITEMS romaji; え+い = «ee»
 *     (せんせい = sensee), っ doubles the next consonant (gakkou), ー doubles
 *     the vowel letter (koohii), ん = n.
 *
 *   Hand-authored renderings elsewhere in the content are NOT silently
 *   rewritten: scripts/pronunciation-inventory.mjs walks every word and every
 *   authored Persian rendering against this derivation and writes the
 *   consistent/inconsistent/missing report (ops/reports/…) for the owner.
 * ================================================================ */

/** Normalize a card pronunciation label: strip the «» marks, the «کوتاه»
 * qualifier and spacing (kana cards quote their labels; kata yōon rows
 * carry a doubled guillemet — both normalize to the bare label). */
function normalizeCardFa(label: string): string {
  return label
    .replace(/[«»]/g, '')
    .replace(/\s*کوتاه\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The vowel-letter forms of the standalone vowels. */
const VOWEL_INITIAL_FA = { あ: 'آ', い: 'ای', う: 'او', え: 'اِ', お: 'او' } as const;
const VOWEL_MEDIAL_FA = { あ: 'ا', い: 'ی', う: 'و', え: 'ه', お: 'و' } as const;
const VOWEL_INITIAL_FA_KATA = { ア: 'آ', イ: 'ای', ウ: 'او', エ: 'اِ', オ: 'او' } as const;
const VOWEL_MEDIAL_FA_KATA = { ア: 'ا', イ: 'ی', ウ: 'و', エ: 'ه', オ: 'و' } as const;

const SMALL_KANA = 'ゃゅょぁぃぅぇぉャュョァィゥェォ';
const SOKUON = 'っッ';
const CHOOONPU = 'ー';
const MORAL_NASAL = 'んン';
const TILDE_PREFIX = '〜~';
const VOWEL_LETTERS = ['ا', 'و', 'ی', 'ه'];

/**
 * The LOCKED voiced-yōon morae (ぎゃ/じゃ/びゃ/ぴゃ families ×3 ×2 scripts).
 *
 * KANA_ITEMS registers the unvoiced yōon compounds (きゃ…) but the VOICED
 * families are derived-glyph content (taught by rule decks, not cards) — so
 * they get their own LOCKED rows here, following the two conventions the card
 * truth itself uses: the y-retaining rows (きゃ=«کیا» pattern → ぎゃ=«گیا»,
 * びゃ=«بیا», ぴゃ=«پیا») and the y-collapsing rows (しゃ=«شا» pattern →
 * じゃ=«جا»). ぢゃ stays OUT (vanishingly rare; if it ever appears the walk
 * errors and forces a registration decision — never a guess).
 */
const VOICED_YOON_FA: Readonly<Record<string, string>> = {
  ぎゃ: 'گیا',
  ぎゅ: 'گیو',
  ぎょ: 'گیُ',
  じゃ: 'جا',
  じゅ: 'جو',
  じょ: 'جُ',
  びゃ: 'بیا',
  びゅ: 'بیو',
  びょ: 'بیُ',
  ぴゃ: 'پیا',
  ぴゅ: 'پیو',
  ぴょ: 'پیُ',
  ギャ: 'گیا',
  ギュ: 'گیو',
  ギョ: 'گیُ',
  ジャ: 'جا',
  ジュ: 'جو',
  ジョ: 'جُ',
  ビャ: 'بیا',
  ビュ: 'بیو',
  ビョ: 'بیُ',
  ピャ: 'پیا',
  ピュ: 'پیو',
  ピョ: 'پیُ',
};
const VOICED_YOON_ROMAJI: Readonly<Record<string, string>> = {
  ぎゃ: 'gya',
  ぎゅ: 'gyu',
  ぎょ: 'gyo',
  じゃ: 'ja',
  じゅ: 'ju',
  じょ: 'jo',
  びゃ: 'bya',
  びゅ: 'byu',
  びょ: 'byo',
  ぴゃ: 'pya',
  ぴゅ: 'pyu',
  ぴょ: 'pyo',
  ギャ: 'gya',
  ギュ: 'gyu',
  ギョ: 'gyo',
  ジャ: 'ja',
  ジュ: 'ju',
  ジョ: 'jo',
  ビャ: 'bya',
  ビュ: 'byu',
  ビョ: 'byo',
  ピャ: 'pya',
  ピュ: 'pyu',
  ピョ: 'pyo',
};

/**
 * The LOCKED foreign-small compounds (the mark-foreign-small rule — loan
 * morae like ファ/ティ/ヴァ that the chapter 01 rule deck teaches). Locked
 * from the card conventions (フ=«فو» → ファ=«فا»؛ テ=«ته» → ティ=«تی»؛ ヴ =
 * the vu of the rule display «وُ (vu)» → ヴァ=«وا»). Standalone SMALL
 * kana (ァ ィ ャ …) stay OUT — they are rule-display glyphs, not word morae;
 * if one ever reaches a word reading the walk errors (never guesses).
 */
const FOREIGN_SMALL_FA: Readonly<Record<string, string>> = {
  ファ: 'فا',
  フィ: 'فی',
  フェ: 'فه',
  フォ: 'فُ',
  ティ: 'تی',
  ディ: 'دی',
  ヴァ: 'وا',
  ヴィ: 'وی',
  ヴェ: 'وه',
  ヴォ: 'وُ',
  ヴ: 'وُ',
  チェ: 'چه',
  ジェ: 'جه',
  シェ: 'شه',
};
const FOREIGN_SMALL_ROMAJI: Readonly<Record<string, string>> = {
  ファ: 'fa',
  フィ: 'fi',
  フェ: 'fe',
  フォ: 'fo',
  ティ: 'ti',
  ディ: 'di',
  ヴァ: 'va',
  ヴィ: 'vi',
  ヴェ: 've',
  ヴォ: 'vo',
  ヴ: 'vu',
  チェ: 'che',
  ジェ: 'je',
  シェ: 'she',
};

/** The per-mora label table — derived ONCE from the card truth. */
function buildMoraTables(): {
  faByGlyph: Map<string, string>;
  romajiByGlyph: Map<string, string>;
} {
  const teachingByKanaId = new Map(KANA_TEACHING.map((t) => [t.kanaId, t]));
  const faByGlyph = new Map<string, string>();
  const romajiByGlyph = new Map<string, string>();
  for (const item of KANA_ITEMS) {
    const teaching = teachingByKanaId.get(item.kanaId);
    if (teaching) {
      faByGlyph.set(item.glyph, normalizeCardFa(teaching.pronunciationFa));
    }
    romajiByGlyph.set(item.glyph, item.romaji);
  }
  for (const [glyph, fa] of Object.entries(VOICED_YOON_FA)) faByGlyph.set(glyph, fa);
  for (const [glyph, rm] of Object.entries(VOICED_YOON_ROMAJI)) romajiByGlyph.set(glyph, rm);
  for (const [glyph, fa] of Object.entries(FOREIGN_SMALL_FA)) faByGlyph.set(glyph, fa);
  for (const [glyph, rm] of Object.entries(FOREIGN_SMALL_ROMAJI)) romajiByGlyph.set(glyph, rm);
  return { faByGlyph, romajiByGlyph };
}

const { faByGlyph: KANA_FA_BY_GLYPH, romajiByGlyph: KANA_ROMAJI_BY_GLYPH } = buildMoraTables();

/** One mora in the walk. */
interface Mora {
  /** The full glyph string of the mora (compound yōon = 2 chars). */
  glyph: string;
  /** Standalone vowel mora (no consonant onset) — rendered by the vowel tables. */
  vowel?: 'a' | 'i' | 'u' | 'e' | 'o';
  /** Sokuon precedes this mora (Persian shadda / romaji doubled consonant). */
  geminate?: boolean;
  /** This mora is the mora nasal ん/ン. */
  nasal?: boolean;
  /** The script of the mora's first glyph (initial-vowel forms differ). */
  kata?: boolean;
}

/** The walk = a sequence of morae and ー-elongation events (an elongation
 * always transforms the PREVIOUS mora — コーヒー stretches コ then ヒ). */
type WalkEvent = { kind: 'mora'; mora: Mora } | { kind: 'elongate' };

const STANDALONE_VOWELS = 'あいうえおアイウエオ' as const;
const VOWEL_OF = {
  あ: 'a',
  い: 'i',
  う: 'u',
  え: 'e',
  お: 'o',
  ア: 'a',
  イ: 'i',
  ウ: 'u',
  エ: 'e',
  オ: 'o',
} as const;

/** Walk a kana string into morae + elongation events. Unknown glyphs → errors. */
function walk(reading: string): { events: WalkEvent[]; errors: string[] } {
  const cleaned = reading.replace(new RegExp(`[${TILDE_PREFIX}]`, 'g'), '');
  const events: WalkEvent[] = [];
  const errors: string[] = [];
  let geminate = false;
  let i = 0;
  while (i < cleaned.length) {
    const ch = cleaned[i] ?? '';
    const next = cleaned[i + 1] ?? '';
    if (ch === ' ' || ch === '　') {
      i += 1;
      continue; // word separators are transparent to the mora walk
    }
    if (SOKUON.includes(ch)) {
      geminate = true;
      i += 1;
      continue;
    }
    if (CHOOONPU === ch) {
      events.push({ kind: 'elongate' });
      i += 1;
      continue;
    }
    if (MORAL_NASAL.includes(ch)) {
      events.push({ kind: 'mora', mora: { glyph: ch, nasal: true, geminate } });
      geminate = false;
      i += 1;
      continue;
    }
    // Standalone vowels come FIRST — the vowel tables (initial/medial letter
    // forms) own them, never the bank row labels.
    if (STANDALONE_VOWELS.includes(ch)) {
      events.push({
        kind: 'mora',
        mora: {
          glyph: ch,
          vowel: VOWEL_OF[ch as keyof typeof VOWEL_OF],
          kata: /[\u30a0-\u30ff]/.test(ch),
          geminate,
        },
      });
      geminate = false;
      i += 1;
      continue;
    }
    const isSmall = SMALL_KANA.includes(ch);
    const compound = isSmall ? '' : SMALL_KANA.includes(next) ? next : '';
    const glyph = ch + compound;
    if (KANA_ROMAJI_BY_GLYPH.has(glyph)) {
      events.push({ kind: 'mora', mora: { glyph, kata: /[\u30a0-\u30ff]/.test(ch), geminate } });
      geminate = false;
      i += glyph.length;
      continue;
    }
    if (isSmall) {
      // a small kana whose compound is not in the locked tables — never guess.
      errors.push(`compound «${glyph}» is not in the locked mora tables`);
    } else {
      errors.push(`uncovered glyph «${ch}» (U+${ch.codePointAt(0)?.toString(16) ?? '?'})`);
    }
    i += Math.max(1, glyph.length);
  }
  if (geminate) errors.push('trailing っ with no following mora');
  return { events, errors };
}

/** Apply the sokuon shadda to a mora's Persian label (first letter). */
function withShadda(label: string): string {
  if (!label) return label;
  return label[0] + '\u0651' + label.slice(1);
}

/** The vowel letter a Persian label carries (diacritics resolve to their
 * letter: ُ→و، َ→ا، ِ→ی; letter-final labels speak for themselves). */
function vowelLetterOf(label: string): string | null {
  const stripped = label.replace(/[ّْ]/g, '');
  const last = stripped[stripped.length - 1];
  if (last && VOWEL_LETTERS.includes(last)) return last;
  const mark = label.replace(/[^َُِ]/g, '').at(-1);
  if (mark === '\u064f') return 'و';
  if (mark === '\u064e') return 'ا';
  if (mark === '\u0650') return 'ی';
  return null;
}

/** Stretch the last Persian part with ー (the double-letter style — the same
 * convention the romaji walk doubles its vowels: کوو↔koo, هیی↔hii).
 * Letter-final labels take ONE more letter (جو → جوو — the vowel letter
 * doubles); diacritic-final labels strip the mark and write the letter twice
 * (کُ → کوو). Both land on exactly two vowel letters — the long vowel. */
function elongateFaPart(part: string): { part: string; ok: boolean } {
  const letter = vowelLetterOf(part);
  if (!letter) return { part, ok: false };
  if (/[َُِ]$/.test(part)) {
    return { part: part.replace(/[َُِ]$/, '') + letter + letter, ok: true };
  }
  return { part: part + letter, ok: true };
}

/** Persian transliteration of a kana reading — the locked word-level standard. */
export function transliterateKanaToFa(reading: string): { fa: string; errors: string[] } {
  const { events, errors } = walk(reading);
  const parts: string[] = [];
  let prevEndedInYa = false;
  let prevWasNasal = false;
  for (const event of events) {
    if (event.kind === 'elongate') {
      const last = parts[parts.length - 1];
      if (last === undefined) {
        errors.push('ー with no previous mora');
        continue;
      }
      const stretched = elongateFaPart(last);
      if (!stretched.ok) errors.push('ー after a mora with no vowel letter');
      parts[parts.length - 1] = stretched.part;
      continue;
    }
    const { mora } = event;
    let label: string;
    if (mora.nasal) {
      label = 'ن';
    } else if (mora.vowel) {
      const initial = parts.length === 0;
      const table = mora.kata
        ? initial
          ? VOWEL_INITIAL_FA_KATA
          : VOWEL_MEDIAL_FA_KATA
        : initial
          ? VOWEL_INITIAL_FA
          : VOWEL_MEDIAL_FA;
      label = (table as Record<string, string>)[mora.glyph] ?? '';
      if (!label) {
        errors.push(`no vowel form for «${mora.glyph}»`);
      }
    } else {
      label = KANA_FA_BY_GLYPH.get(mora.glyph) ?? '';
      if (!label) {
        errors.push(`no locked Persian label for «${mora.glyph}»`);
      }
    }
    if (mora.geminate) label = withShadda(label);
    if (label) {
      if (prevWasNasal || (prevEndedInYa && label.startsWith('ی'))) {
        parts.push('\u200c');
      }
      parts.push(label);
    }
    prevWasNasal = Boolean(mora.nasal);
    prevEndedInYa = !mora.nasal && label.endsWith('ی');
  }
  return { fa: parts.join(''), errors: [...new Set(errors)] };
}

/** Standard romaji (double-vowel style) of a kana reading — same mora walk. */
export function transliterateKanaToRomaji(reading: string): { romaji: string; errors: string[] } {
  const { events, errors } = walk(reading);
  const parts: string[] = [];
  let prevVowel: string | null = null;
  for (const event of events) {
    if (event.kind === 'elongate') {
      const letter = prevVowel ?? parts.at(-1)?.slice(-1);
      if (!letter) {
        errors.push('ー with no previous vowel');
        continue;
      }
      parts.push(letter);
      continue;
    }
    const { mora } = event;
    if (mora.nasal) {
      parts.push('n');
      prevVowel = null;
      continue;
    }
    let syllable: string;
    if (mora.vowel) {
      // え + い = the long-«ee» (sensee) — the owner notes' notation rule.
      if (mora.vowel === 'i' && prevVowel === 'e') syllable = 'e';
      else syllable = mora.vowel;
    } else {
      syllable = KANA_ROMAJI_BY_GLYPH.get(mora.glyph) ?? '';
      if (!syllable) errors.push(`no locked romaji for «${mora.glyph}»`);
    }
    if (mora.geminate) {
      const first = syllable[0];
      if (first) syllable = first + syllable;
      else errors.push('っ with no following consonant');
    }
    parts.push(syllable);
    prevVowel = syllable.slice(-1) === 'n' ? null : syllable.slice(-1);
  }
  return { romaji: parts.join(''), errors: [...new Set(errors)] };
}

/** Coverage check: every KANA_ITEMS glyph must carry BOTH a card Persian label
 * and romaji — this is the gate that makes the derivation controlled (a new
 * kana without a card label fails CI instead of silently transliterating). */
export function uncoveredKanaBank(): { missingFa: string[]; missingRomaji: string[] } {
  const missingFa: string[] = [];
  const missingRomaji: string[] = [];
  for (const item of KANA_ITEMS) {
    if (!KANA_FA_BY_GLYPH.has(item.glyph)) missingFa.push(`${item.kanaId} (${item.glyph})`);
    if (!KANA_ROMAJI_BY_GLYPH.has(item.glyph)) missingRomaji.push(`${item.kanaId} (${item.glyph})`);
  }
  return { missingFa, missingRomaji };
}
