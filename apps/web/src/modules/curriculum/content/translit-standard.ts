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
