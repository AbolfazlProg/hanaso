/**
 * HANASO — kana-word romaji (TASK-LEARNING-08 Addendum-3 §8).
 *
 * The Latin reading is the COMPLEMENTARY guide (Persian leads everywhere).
 * Derived from the kana registry — never hand-typed, so it can never drift
 * from the structural data (DD-122).
 *
 * ー (chōonpu) lengthens the previous vowel (ノート → nooto); ん → n (m before
 * a labial p/b/m, per standard Japanese phonology); small yōon kana fuse with
 * the preceding base kana (きょう → kyou, きゅう → kyuu); the sokuon doubles
 * the following consonant (がっこう → gakkou); dakuten/handakuten are resolved
 * onto their base kana (が = か+゛ → ga); any non-kana character (e.g. ～)
 * passes through as-is.
 *
 * HANASO-KANA-REMEDIATION-02 (RP-04): the registry lists only base glyphs, so
 * composed voiced kana, small yōon kana and the sokuon used to leak raw kana
 * into the Latin output (がっこう → がっkou). Every kana is now decomposed and
 * rebuilt from its structural parts.
 */
import { KANA_ITEMS } from './content/kana-items';

const ROMAJI_BY_GLYPH = new Map<string, string>(KANA_ITEMS.map((k) => [k.glyph, k.romaji]));

const VOWELS = 'aiueo';
const VOWEL_TAIL = new RegExp(`[${VOWELS}]$`);

/** Combining voicing marks (NFD forms — NFC input is handled via VOICED_NFC). */
const DAKUTEN_NFD = '\u3099';
const HANDAKUTEN_NFD = '\u309A';

/** Precomposed (NFC) voiced kana → base kana; the mark itself is implied. */
const VOICED_NFC = new Map<string, { base: string; daku: boolean; handaku: boolean }>();
{
  const pairs: Array<[string, string, boolean, boolean]> = [
    // hiragana dakuten
    ['が', 'か', true, false],
    ['ぎ', 'き', true, false],
    ['ぐ', 'く', true, false],
    ['げ', 'け', true, false],
    ['ご', 'こ', true, false],
    ['ざ', 'さ', true, false],
    ['じ', 'し', true, false],
    ['ず', 'す', true, false],
    ['ぜ', 'せ', true, false],
    ['ぞ', 'そ', true, false],
    ['だ', 'た', true, false],
    ['ぢ', 'ち', true, false],
    ['づ', 'つ', true, false],
    ['で', 'て', true, false],
    ['ど', 'と', true, false],
    ['ば', 'は', true, false],
    ['び', 'ひ', true, false],
    ['ぶ', 'ふ', true, false],
    ['べ', 'へ', true, false],
    ['ぼ', 'ほ', true, false],
    // katakana dakuten
    ['ガ', 'カ', true, false],
    ['ギ', 'キ', true, false],
    ['グ', 'ク', true, false],
    ['ゲ', 'ケ', true, false],
    ['ゴ', 'コ', true, false],
    ['ザ', 'サ', true, false],
    ['ジ', 'シ', true, false],
    ['ズ', 'ス', true, false],
    ['ゼ', 'セ', true, false],
    ['ゾ', 'ソ', true, false],
    ['ダ', 'タ', true, false],
    ['ヂ', 'チ', true, false],
    ['ヅ', 'ツ', true, false],
    ['デ', 'テ', true, false],
    ['ド', 'ト', true, false],
    ['バ', 'ハ', true, false],
    ['ビ', 'ヒ', true, false],
    ['ブ', 'フ', true, false],
    ['ベ', 'ヘ', true, false],
    ['ボ', 'ホ', true, false],
    // handakuten (は-row only, both scripts)
    ['ぱ', 'は', false, true],
    ['ぴ', 'ひ', false, true],
    ['ぷ', 'ふ', false, true],
    ['ぺ', 'へ', false, true],
    ['ぽ', 'ほ', false, true],
    ['パ', 'ハ', false, true],
    ['ピ', 'ヒ', false, true],
    ['プ', 'フ', false, true],
    ['ペ', 'ヘ', false, true],
    ['ポ', 'ホ', false, true],
  ];
  for (const [voiced, base, daku, handaku] of pairs) {
    VOICED_NFC.set(voiced, { base, daku, handaku });
  }
}

/** Decompose one character into base + voicing marks (NFC table or NFD marks). */
function decompose(ch: string): { base: string; daku: number; handaku: number } | null {
  const nfc = VOICED_NFC.get(ch);
  if (nfc !== undefined) return { base: nfc.base, daku: nfc.daku ? 1 : 0, handaku: nfc.handaku ? 1 : 0 };
  let base = ch;
  let daku = 0;
  let handaku = 0;
  for (;;) {
    if (base.endsWith(DAKUTEN_NFD)) {
      daku += 1;
      base = base.slice(0, -1);
    } else if (base.endsWith(HANDAKUTEN_NFD)) {
      handaku += 1;
      base = base.slice(0, -1);
    } else {
      break;
    }
  }
  if (daku + handaku === 0) return null;
  return { base, daku, handaku };
}

/** Small kana that fuse with the preceding base kana. */
const SMALL_Y = new Map<string, string>([
  ['ゃ', 'ya'],
  ['ゅ', 'yu'],
  ['ょ', 'yo'],
  ['ャ', 'ya'],
  ['ュ', 'yu'],
  ['ョ', 'yo'],
]);
const SMALL_F = new Map<string, string>([
  ['ァ', 'fa'],
  ['ィ', 'i'],
  ['ゥ', 'u'],
  ['ェ', 'e'],
  ['ォ', 'o'],
  ['ぁ', 'a'],
  ['ぃ', 'i'],
  ['ぅ', 'u'],
  ['ぇ', 'e'],
  ['ぉ', 'o'],
]);

/** Voiceless→voiced consonant pairs used when resolving ゛ (ふ fu → ぶ bu). */
const VOICED_CONSONANT: Record<string, string> = { k: 'g', s: 'z', t: 'd', h: 'b', p: 'b', f: 'b' };

/** Resolve one full kana character (voicing included) to romaji, or null. */
function romajiOf(ch: string): string | null {
  // Full composed glyph already in the registry (あ, を, ん, ア…) — trust it.
  const direct = ROMAJI_BY_GLYPH.get(ch);
  if (direct !== undefined) return direct;

  const dec = decompose(ch);
  if (dec === null) return null;
  let romaji = ROMAJI_BY_GLYPH.get(dec.base);
  if (romaji === undefined) return null;

  if (dec.daku > 0) {
    if (romaji === 'shi') return 'ji'; // じ
    if (romaji === 'chi') return 'ji'; // ぢ (Hepburn; rare)
    if (romaji === 'tsu') return 'zu'; // づ (Hepburn; rare)
    const c = romaji[0] as string;
    const voiced = VOICED_CONSONANT[c];
    if (voiced === undefined) return null; // voicing an unvoiceable kana
    romaji = voiced + romaji.slice(1);
  }
  if (dec.handaku > 0) {
    // handakuten is は-row only: ha→pa, hi→pi, fu→pu (Hepburn f), he→pe, ho→po.
    if (romaji[0] !== 'h' && romaji[0] !== 'f') return null;
    romaji = 'p' + romaji.slice(1); // ふ fu → ぷ pu
  }
  return romaji;
}

/** True when the trailing romaji syllable is fusable (ends in i, preceded by a consonant). */
function trailingSyllable(out: string): { consonant: string; vowel: string } | null {
  if (!out.endsWith('i') || out.length < 2) return null;
  const c = out[out.length - 2] as string;
  if (VOWELS.includes(c)) return null; // bare vowel (い) — fuses as y-glide below
  return { consonant: c, vowel: 'i' };
}

/** The initial consonant (or cluster: sh/ch/ts/j) of a syllable like 'sha', 'tsu'. */
function onsetOf(romaji: string): string | null {
  const m = /^(?:sh|ch|ts|j|[kstnhmrgzdbp])[aiueo]/.exec(romaji);
  return m ? m[0]!.slice(0, -1)! : null;
}

export function kanaWordRomaji(word: string): string {
  let out = '';
  const chars = [...word];

  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i] as string;

    if (ch === 'ー') {
      // Chōonpu: lengthen the previous vowel (nooto, koohii).
      if (VOWEL_TAIL.test(out)) out += out[out.length - 1];
      continue;
    }
    if (ch === '～') {
      out += '~'; // fullwidth tilde → the ASCII complement
      continue;
    }

    // Small yōon: fuse onto the previous syllable (き+ょ → kyo).
    const y = SMALL_Y.get(ch);
    if (y !== undefined) {
      if (out.length === 0) {
        out = y; // dangling small kana — read it standalone
        continue;
      }
      // Hepburn irregular fusions need the two-char cluster (shi→sha, chi→cho, ji→ju).
      if (out.endsWith('shi')) out = `${out.slice(0, -3)}sh${y[1]}`;
      else if (out.endsWith('chi')) out = `${out.slice(0, -3)}ch${y[1]}`;
      else if (out.endsWith('ji')) out = `${out.slice(0, -2)}j${y[1]}`;
      else {
        const syl = trailingSyllable(out);
        if (syl !== null) {
          // ki+yo → kyo (drop the i, add y+vowel).
          out = `${out.slice(0, -2)}${syl.consonant}${y}`;
        } else {
          // Base ends in a bare vowel (い+ゃ → iya): append as-is.
          out += y;
        }
      }
      continue;
    }

    // Small vowel kana (外来 ィ/ゥ…): フ+ァ → fa, テ+ィ → ti, ディ → di.
    const f = SMALL_F.get(ch);
    if (f !== undefined) {
      const last = out[out.length - 1] ?? '';
      const prev = out.slice(0, -1);
      if (out.length >= 2 && VOWELS.includes(last)) {
        if (out.endsWith('fu'))
          out = `${out.slice(0, -1)}${f[1]}`; // フ+ァ → fa (swap the vowel)
        else if (out.endsWith('te') && f === 'i')
          out = `${out.slice(0, -1)}i`; // テ+ィ → ti
        else if (out.endsWith('de') && f === 'i')
          out = `${out.slice(0, -1)}i`; // デ+ィ → di
        else out = `${prev}${f[0]}`; // re-vocalize the preceding vowel
        continue;
      }
      out += f;
      continue;
    }

    // Sokuon: geminate the next syllable's onset (が+っ+こ → gakkou).
    // Hepburn gemination: sh → s (ざっし zasshi), ch → t (ちょっと chotto), ts → ts (まっつ mattsu).
    if (ch === 'っ' || ch === 'ッ') {
      const next = chars[i + 1];
      if (next !== undefined) {
        // Next is a small yōon (き+ゃ): geminate the base's consonant (kkya).
        if (SMALL_Y.has(next)) {
          const onset = out.endsWith('shi') ? 's' : out.endsWith('chi') ? 't' : onsetOf(out);
          if (out.length > 0 && onset !== null && onset !== '') {
            out += onset;
            continue;
          }
        }
        const nextRomaji = romajiOf(next);
        const onset = nextRomaji !== null ? onsetOf(nextRomaji) : null;
        if (onset === 'sh') out += 's';
        else if (onset === 'ch') out += 't';
        else if (onset === 'ts')
          out += 't'; // ま+っ+つ → mattsu (single t; the syllable brings its own ts)
        else if (onset !== null && onset !== '') out += onset;
        else out += ch; // vowel/n follows — keep the sokuon visible rather than guess
        continue;
      }
      out += ch; // dangling sokuon — keep visible rather than guess
      continue;
    }

    // Moraic nasal: n, or m before labials (さんぽ → sampo — Hepburn).
    if (ch === 'ん' || ch === 'ン') {
      const next = chars[i + 1];
      const nextRomaji = next !== undefined ? romajiOf(next) : null;
      if (nextRomaji !== null && /^[pbm]/.test(nextRomaji)) out += 'm';
      else out += 'n';
      continue;
    }

    out += romajiOf(ch) ?? ch;
  }
  return out;
}
