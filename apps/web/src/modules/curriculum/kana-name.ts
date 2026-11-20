/**
 * HANASO — the LOCAL name→katakana engine (Part-2 و).
 *
 * The k13 station promises «نوشتن نام خودت به کاتاکانا» — a REAL teaching
 * exercise: the learner types their name (Persian script or Latin/Finglish),
 * the engine DETECTS a pronunciation and SUGGESTS katakana mora-by-mora, the
 * learner may correct both, and then BUILDS the name from a card tray
 * (required morae + extra distractor cards, duplicates included).
 *
 * Hard constraints honored here:
 *  - NO external service, NO paid API — a pure, rule-based local module;
 *  - names have NO single correct katakana — the engine states its own
 *    confidence honestly and the exercise never blames a disagreement;
 *  - every suggested glyph is TAUGHT by the chapter (all 46 katakana base
 *    glyphs + dakuten/handakuten + the foreign combos of k12-foreign);
 *  - WHY Latin/Finglish input is preferred is part of the pedagogy: Persian
 *    script omits the short vowels (نما = «Nama» or «Nema»?) — the Latin
 *    input carries them, so the suggestion is more precise. The Persian-mode
 *    suggestion therefore stays honestly «medium confidence».
 *
 * The mapping is morphic (letter→mora), tuned for NAMES (not dictionary
 * words): each consonant takes the vowel that follows it in the input, an
 * unvoweled consonant takes its default u-mora (Japanese native convention),
 * and word-final n → ン. Doubled vowels → the vowel + chōonpu ー (taught k8).
 */

/** One suggested mora — the kana plus the input letters that produced it. */
export interface NameMora {
  kana: string;
  /** The input letters this mora came from (for the per-mora correction UI). */
  from: string;
}

export interface NameSuggestion {
  /** The input script detected (the two supported modes). */
  script: 'fa' | 'en';
  /** The mora sequence — the suggestion the tray is built from. */
  morae: NameMora[];
  /**
   * 'high' = the Latin/Finglish input (short vowels explicit);
   * 'medium' = the Persian script (short vowels absent — the honest limit).
   */
  confidence: 'high' | 'medium';
  /** The Persian honesty note rendered with the suggestion. */
  noteFa: string;
}

/** The taught katakana pool the EXTRA tray cards sample from. */
export const TRAY_EXTRAS_POOL: readonly string[] = [
  'ア', 'イ', 'ウ', 'エ', 'オ',
  'カ', 'キ', 'ク', 'ケ', 'コ', 'サ', 'シ', 'ス', 'セ', 'ソ',
  'タ', 'チ', 'ツ', 'テ', 'ト', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ',
  'ハ', 'ヒ', 'フ', 'ヘ', 'ホ', 'マ', 'ミ', 'ム', 'メ', 'モ',
  'ヤ', 'ユ', 'ヨ', 'ラ', 'リ', 'ル', 'レ', 'ロ', 'ワ', 'ン',
  'ガ', 'ギ', 'グ', 'ゲ', 'ゴ', 'ザ', 'ジ', 'ズ', 'ゼ', 'ゾ',
  'ダ', 'ヂ', 'ヅ', 'デ', 'ド', 'バ', 'ビ', 'ブ', 'ベ', 'ボ',
  'パ', 'ピ', 'プ', 'ペ', 'ポ', 'ー',
] as const;

/* ------------------------------------------------------------------ Latin/Finglish */

/** Latin digraph → the kana that replaces it BEFORE vowel resolution. */
// ASCII-safe internal sound markers (the dingbat gate bans ⓡ-class glyphs):
// 0=sh 1=ch 2=ts/th 3=kh 4=gh 5=dh 6=ph 7=ck
const LATIN_DIGRAPHS: Record<string, string> = {
  sh: '0', ch: '1', ts: '2', kh: '3', gh: '4', th: '2', dh: '5', ph: '6', ck: '7',
};

/** One Latin consonant sound → its kana by the FOLLOWING vowel. */
type VowelKey = 'a' | 'i' | 'u' | 'e' | 'o';
type ConsonantRow = Record<VowelKey, string>;
const LATIN_CONSONANT: Record<string, ConsonantRow> = {
  k: { a: 'カ', i: 'キ', u: 'ク', e: 'ケ', o: 'コ' },
  '7': { a: 'カ', i: 'キ', u: 'ク', e: 'ケ', o: 'コ' },
  g: { a: 'ガ', i: 'ギ', u: 'グ', e: 'ゲ', o: 'ゴ' },
  '4': { a: 'ガ', i: 'ギ', u: 'グ', e: 'ゲ', o: 'ゴ' },
  s: { a: 'サ', i: 'シ', u: 'ス', e: 'セ', o: 'ソ' },
  z: { a: 'ザ', i: 'ジ', u: 'ズ', e: 'ゼ', o: 'ゾ' },
  '5': { a: 'ザ', i: 'ジ', u: 'ズ', e: 'ゼ', o: 'ゾ' },
  '2': { a: 'チャ', i: 'チ', u: 'チュ', e: 'チェ', o: 'チョ' }, // ts/th family
  t: { a: 'タ', i: 'ティ', u: 'トゥ', e: 'テ', o: 'ト' }, // ti→ティ — the k12-foreign combo
  d: { a: 'ダ', i: 'ディ', u: 'ドゥ', e: 'デ', o: 'ド' }, // di→ディ — the k12-foreign combo
  n: { a: 'ナ', i: 'ニ', u: 'ヌ', e: 'ネ', o: 'ノ' },
  h: { a: 'ハ', i: 'ヒ', u: 'フ', e: 'ヘ', o: 'ホ' },
  '3': { a: 'ハ', i: 'ヒ', u: 'フ', e: 'ヘ', o: 'ホ' }, // kh
  f: { a: 'ファ', i: 'フィ', u: 'フ', e: 'フェ', o: 'フォ' }, // the k12-foreign combos
  '6': { a: 'ファ', i: 'フィ', u: 'フ', e: 'フェ', o: 'フォ' }, // ph
  b: { a: 'バ', i: 'ビ', u: 'ブ', e: 'ベ', o: 'ボ' },
  p: { a: 'パ', i: 'ピ', u: 'プ', e: 'ペ', o: 'ポ' },
  m: { a: 'マ', i: 'ミ', u: 'ム', e: 'メ', o: 'モ' },
  y: { a: 'ヤ', i: 'イ', u: 'ユ', e: 'エ', o: 'ヨ' },
  l: { a: 'ラ', i: 'リ', u: 'ル', e: 'レ', o: 'ロ' },
  r: { a: 'ラ', i: 'リ', u: 'ル', e: 'レ', o: 'ロ' },
  w: { a: 'ワ', i: 'ウィ', u: 'ウ', e: 'ウェ', o: 'ヲ' },
  v: { a: 'ヴァ', i: 'ヴィ', u: 'ヴ', e: 'ヴェ', o: 'ヴォ' }, // taught k12-foreign
  j: { a: 'ジャ', i: 'ジ', u: 'ジュ', e: 'ジェ', o: 'ジョ' },
  '0': { a: 'シャ', i: 'シ', u: 'シュ', e: 'シェ', o: 'ショ' }, // sh
  '1': { a: 'チャ', i: 'チ', u: 'チュ', e: 'チェ', o: 'チョ' }, // ch
  c: { a: 'カ', i: 'シ', u: 'ク', e: 'セ', o: 'コ' }, // c+a/u/o→k, c+i/e→s
  q: { a: 'カ', i: 'キ', u: 'ク', e: 'ケ', o: 'コ' },
  x: { a: 'クサ', i: 'クシ', u: 'クス', e: 'クセ', o: 'クソ' },
};

/** The standalone vowels. */
const LATIN_VOWEL: Record<string, string> = { a: 'ア', i: 'イ', u: 'ウ', e: 'エ', o: 'オ' };

function suggestLatin(name: string): NameSuggestion {
  const morae: NameMora[] = [];
  const lower = name.toLowerCase().replace(/[^a-z]/g, '');
  const at = (idx: number): string => lower.charAt(idx); // '' past the end — index-safe
  let i = 0;
  let pendingGeminate = false;
  while (i < lower.length) {
    const two = lower.slice(i, i + 2);
    // doubled vowel → the vowel + chōonpu (taught k8)
    const vow2 = /^(.)\1$/.exec(two);
    if (vow2 && vow2[1] && vow2[1] in LATIN_VOWEL && morae.length > 0) {
      const v: string = vow2[1];
      morae.push({ kana: LATIN_VOWEL[v]! + 'ー', from: two });
      i += 2;
      continue;
    }
    // doubled consonant → sokuon mark (the katakana ッ — the h15 rule class)
    const cons2 = /^(.)\1$/.exec(two);
    if (cons2 && cons2[1] && cons2[1] in LATIN_CONSONANT && at(i + 2) !== '') {
      pendingGeminate = true;
      i += 1;
      continue;
    }
    const digraph = LATIN_DIGRAPHS[two];
    const cur = at(i);
    const c = digraph ?? (cur in LATIN_CONSONANT ? cur : null);
    if (c) {
      const next = at(i + (digraph ? 2 : 1));
      const consumed = digraph ? 2 : 1;
      // the CyV cluster: r+y+a → リ+ヤ (the i-mora then the y-vowel) — the
      // natural Japanese split of a consonant+y+vowel cluster in NAMES
      if (!digraph && next === 'y') {
        const afterY = at(i + 2);
        if (afterY in LATIN_VOWEL) {
          const ci: string = LATIN_CONSONANT[c]!.i;
          const yv: string = LATIN_CONSONANT['y']![afterY as VowelKey];
          if (pendingGeminate) {
            morae.push({ kana: 'ッ', from: at(i - 1) });
            pendingGeminate = false;
          }
          morae.push({ kana: ci, from: lower.slice(i, i + 1) });
          morae.push({ kana: yv, from: lower.slice(i + 1, i + 3) });
          i += 3;
          continue;
        }
      }
      const vowelKey = next in LATIN_VOWEL ? (next as VowelKey) : null;
      // word-final n / n-before-consonant → ン (the nasal mora — h7 teaches it)
      if (c === 'n' && !(next !== '' && next in LATIN_VOWEL)) {
        if (pendingGeminate) {
          morae.push({ kana: 'ッ', from: at(i - 1) });
          pendingGeminate = false;
        }
        morae.push({ kana: 'ン', from: lower.slice(i, i + consumed) });
        i += consumed;
        continue;
      }
      if (vowelKey) {
        const row: ConsonantRow = LATIN_CONSONANT[c as keyof typeof LATIN_CONSONANT]!;
        const base: string = row[vowelKey];
        if (pendingGeminate) {
          morae.push({ kana: 'ッ', from: at(i - 1) });
          pendingGeminate = false;
        }
        morae.push({ kana: base, from: lower.slice(i, i + consumed + 1) });
        i += consumed + 1;
        continue;
      }
      // unvoweled consonant → the default u-mora (word-final sh→シュ etc.)
      if (pendingGeminate) {
        morae.push({ kana: 'ッ', from: at(i - 1) });
        pendingGeminate = false;
      }
      morae.push({ kana: LATIN_CONSONANT[c]!.u, from: lower.slice(i, i + consumed) });
      i += consumed;
      continue;
    }
    if (cur in LATIN_VOWEL) {
      morae.push({ kana: LATIN_VOWEL[cur]!, from: cur });
      i += 1;
      continue;
    }
    if (cur === 'n' || cur === 'N') {
      // handled by the consonant table; safety net for stripped forms
      morae.push({ kana: 'ン', from: cur });
      i += 1;
      continue;
    }
    i += 1; // skip anything unmappable (honest loss — noted in the UI)
  }
  return {
    script: 'en',
    morae,
    confidence: 'high',
    noteFa:
      'این پیشنهاد از نوشتِ لاتین/فینگلیش تو ساخته شد — واکه‌های کوتاه در نوشتهٔ تو هست، پس پیشنهاد دقیق است. با فینگلیشِ دقیق‌تر (نه املای فارسی) پیشنهاد بهتری می‌گیری.',
  };
}

/* ------------------------------------------------------------------ Persian script */

/**
 * Persian letters → the LATIN sound key of the shared consonant table (the
 * same mora planes the Finglish path uses — ONE standard, two alphabets).
 * The vowel letters (ا آ ی و) are NOT mapped here: they SELECT the mora
 * plane of the consonant before them (س+ا → サ، ر+ی → リ، ن+ی → ニ).
 */
const FA_SOUND: Record<string, string> = {
  ب: 'b', پ: 'p', ت: 't', ث: 's', ج: 'j', چ: '1', ح: 'h', خ: 'h', د: 'd',
  ذ: 'z', ر: 'r', ز: 'z', ژ: 'j', س: 's', ش: '0', ص: 's', ض: 'z', ط: 't',
  ظ: 'z', غ: '4', ف: 'f', ق: 'k', ک: 'k', ك: 'k', گ: 'g', ل: 'l', م: 'm',
  ن: 'n', ه: 'h', و: 'v', ی: 'y', ي: 'y', ئ: 'y',
};

/** The lam-alef ligature = ONE mora ラ (l+a). */
const FA_LIGATURES: Record<string, string> = { لا: 'ラ' };

/** Persian vowel letter → the mora plane it selects for the preceding consonant. */
const FA_VOWEL_PLANE: Record<string, VowelKey> = { ا: 'a', آ: 'a', ی: 'i', ي: 'i', و: 'u' };

function suggestFa(name: string): NameSuggestion {
  const morae: NameMora[] = [];
  const chars = [...name];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    // the ligature first (لا = one mora)
    const two = ch + (chars[i + 1] ?? '');
    if (two in FA_LIGATURES) {
      morae.push({ kana: FA_LIGATURES[two]!, from: two });
      i += 1;
      continue;
    }
    const next = chars[i + 1] ?? '';
    const nextIsVowel = next in FA_VOWEL_PLANE;
    // the vowel letters FIRST (ی/و double as consonant sounds — but as LETTERS
    // they are vowels: the plane-selection wins; word-initial ی = ヤ the glide)
    if (ch in FA_VOWEL_PLANE && !(ch === 'ی' && i === 0)) {
      const prev = chars[i - 1] ?? '';
      const prevSound = FA_SOUND[prev];
      const plane = FA_VOWEL_PLANE[ch]!;
      if (prevSound) {
        // the consonant+vowel pair → ONE mora on the vowel's plane (سا → サ)
        morae.push({ kana: LATIN_CONSONANT[prevSound]![plane], from: prev + ch });
        continue;
      }
      // a standalone vowel (word-initial or after another vowel)
      const standalone = plane === 'a' ? 'ア' : plane === 'i' ? 'イ' : 'ウ';
      morae.push({ kana: standalone, from: ch });
      continue;
    }
    const sound = FA_SOUND[ch];
    if (sound) {
      // a following vowel letter OWNS this consonant's mora — push nothing now
      if (nextIsVowel) continue;
      // consonant without a following vowel letter: word-final → u-plane,
      // otherwise → a-plane (the honest default; the UI notes the ambiguity)
      const row = LATIN_CONSONANT[sound]!;
      const kana = next === '' ? row.u : row.a;
      morae.push({ kana, from: ch });
      continue;
    }
    // ZWNJ / spaces / diacritics — silent (honest loss)
  }
  // the same-vowel run lengthens (ا+ا / وو → the chōonpu, the k8 rule)
  const compact: NameMora[] = [];
  for (const m of morae) {
    const prev = compact[compact.length - 1];
    if (prev && prev.kana === m.kana && 'アイウエオ'.includes(m.kana)) {
      prev.kana = m.kana + 'ー';
      prev.from += m.from;
      continue;
    }
    compact.push(m);
  }
  return {
    script: 'fa',
    morae: compact,
    confidence: 'medium',
    noteFa:
      'نوشتار فارسی واکه‌های کوتاه را نمی‌نویسد — پس این پیشنهاد «تخمینِ متوسط» است؛ مثلاً «مریم» می‌تواند マリヤム هم باشد. اگر املای لاتین/فینگلیش نامت را بنویسی (مثل «Maryam»)، پیشنهاد دقیق‌تر می‌شود — و هر مورا را می‌توانی همین‌جا اصلاح کنی.',
  };
}

/* ------------------------------------------------------------------ API */

/** Detect the input script and produce the mora suggestion. */
export function suggestNameKatakana(name: string): NameSuggestion {
  const trimmed = name.trim();
  if (/[\u0600-\u06FF]/.test(trimmed)) return suggestFa(trimmed);
  return suggestLatin(trimmed);
}

/** The katakana surface of a suggestion (what the tray must spell). */
export function suggestionSurface(s: NameSuggestion): string {
  return s.morae.map((m) => m.kana).join('');
}

/**
 * Compare a learner arrangement against the suggestion. Tolerant on the
 * KNOWN variation points (transliteration has no single answer):
 *  - چ/ش class: チャ vs シャ-family swaps stay «acceptable» for this exercise;
 *  - a single ン/ノ-class nasal variation is tolerated word-medially.
 * The comparison is positional; the FIRST divergence index drives the hint.
 */
export interface ArrangementVerdict {
  correct: boolean;
  /** First differing position (drives the progressive hint). */
  firstMismatch: number | null;
  /** Position count matches the suggestion (the «count your morae» hint). */
  countMatches: boolean;
}

export function checkArrangement(built: string[], suggestion: NameSuggestion): ArrangementVerdict {
  const expected = suggestion.morae.map((m) => m.kana);
  const countMatches = built.length === expected.length;
  let firstMismatch: number | null = null;
  const len = Math.min(built.length, expected.length);
  for (let i = 0; i < len; i++) {
    if (built[i] !== expected[i]) {
      // the tolerated variation class: the affricate/shibilant family and the
      // nasal — never «wrong», just a different valid spelling of the same sound
      const tolerant =
        (/[シャチュジョ]/.test(expected[i]!) && /[シャチュジョ]/.test(built[i]!)) ||
        (expected[i] === 'ン' && built[i] === 'ノ') ||
        (expected[i] === 'ノ' && built[i] === 'ン');
      if (!tolerant) {
        firstMismatch = i;
        break;
      }
    }
  }
  if (firstMismatch === null && !countMatches) firstMismatch = Math.min(built.length, expected.length);
  return { correct: firstMismatch === null, firstMismatch, countMatches };
}

/** Fisher–Yates (pure — the caller passes a random source for tests). */
export function pickTrayExtras(count: number, exclude: Set<string>, rnd: () => number = Math.random): string[] {
  const pool = TRAY_EXTRAS_POOL.filter((k) => !exclude.has(k));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled.slice(0, count);
}
