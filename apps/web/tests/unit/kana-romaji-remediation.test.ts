/**
 * HANASO-KANA-REMEDIATION-02 — RP-04 regression guards for kanaWordRomaji.
 *
 * The audit (HANASO-KANA-AUDIT-01, KANA-AUD-005) proved the helper leaked raw
 * kana into its Latin output for every word containing dakuten, handakuten,
 * yōon or a sokuon (がっこう → がっkou). These tests pin the fixed behaviour:
 * composition, gemination, fusion, chōonpu, the moraic nasal — and a blanket
 * ban on mixed kana/Latin output across every real word of the chapter.
 */
import { describe, expect, it } from 'vitest';

import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import { kanaWordRomaji } from '@/modules/curriculum/kana-romaji';

// Every Japanese word that appears in a promptJa / option label / hostWord of
// chapter 1 (source of truth: the content modules + kana registry).
const CHAPTER_WORDS = [
  // hiragana host words & exercise words
  'あう',
  'あさ',
  'いえ',
  'いいえ',
  'えき',
  'おおきい',
  'おおさか',
  'かいぎ',
  'かいしゃ',
  'かぞく',
  'がくせい',
  'きょう',
  'きゃく',
  'きゅう',
  'くうき',
  'けっか',
  'ごご',
  'さん',
  'さんすう',
  'さんぽ',
  'さっき',
  'ざっし',
  'しお',
  'じゅう',
  'しんぶん',
  'すし',
  'せん',
  'せんせい',
  'とうきょう',
  'ともだち',
  'なつ',
  'ねこ',
  'のみ',
  'はな',
  'ひゃく',
  'いっしょ',
  'ちょっと',
  'ぱん',
  'えんぴつ',
  'いぬ',
  'みず',
  'めがね',
  'ゆき',
  'よる',
  'らーめん',
  'りんご',
  'わたし',
  // katakana host words & exercise words
  'ノート',
  'コーヒー',
  'ジュース',
  'ボールペン',
  'コンピューター',
  'ケーキ',
  'コーラ',
  'パン',
  'ピアノ',
  'ポスト',
  'ミルク',
  'メニュー',
  'タクシー',
  'テスト',
  'ドア',
  'エアコン',
  'カラオケ',
  'パソコン',
  'ラジオ',
  'ファイル',
  'メール',
  'ゲーム',
  'シャツ',
  'ジョギング',
];

describe('kanaWordRomaji — REMEDIATION-02 (RP-04: composed kana never leak into Latin)', () => {
  it('resolves dakuten/handakuten onto the base kana (audit case がっこう → がっkou)', () => {
    expect(kanaWordRomaji('がっこう')).toBe('gakkou');
    expect(kanaWordRomaji('ごご')).toBe('gogo');
    expect(kanaWordRomaji('ざっし')).toBe('zasshi');
    expect(kanaWordRomaji('しんぶん')).toBe('shimbun');
    expect(kanaWordRomaji('えんぴつ')).toBe('empitsu');
    expect(kanaWordRomaji('ぴかぴか')).toBe('pikapika');
    expect(kanaWordRomaji('みず')).toBe('mizu');
    expect(kanaWordRomaji('パン')).toBe('pan');
  });

  it('fuses small yōon kana (きょう/きゅう/しゃしん/びょういん)', () => {
    expect(kanaWordRomaji('きょう')).toBe('kyou');
    expect(kanaWordRomaji('きゅう')).toBe('kyuu');
    expect(kanaWordRomaji('しゃしん')).toBe('shashin');
    expect(kanaWordRomaji('びょういん')).toBe('byouin');
    expect(kanaWordRomaji('いしゃ')).toBe('isha');
    expect(kanaWordRomaji('じゅう')).toBe('juu');
    expect(kanaWordRomaji('ディスプレイ')).toBe('disupurei');
    expect(kanaWordRomaji('ファイル')).toBe('fairu');
  });

  it('geminate consonants follow Hepburn (sh→s, ch→t, ts→t)', () => {
    expect(kanaWordRomaji('ちょっと')).toBe('chotto');
    expect(kanaWordRomaji('まっつ')).toBe('mattsu');
    expect(kanaWordRomaji('いっしょ')).toBe('issho');
    expect(kanaWordRomaji('けっか')).toBe('kekka');
  });

  it('keeps chōonpu and non-kana behaviour of the original contract', () => {
    expect(kanaWordRomaji('ノート')).toBe('nooto');
    expect(kanaWordRomaji('コーヒー')).toBe('koohii');
    expect(kanaWordRomaji('あう')).toBe('au');
    expect(kanaWordRomaji('うえ')).toBe('ue');
    expect(kanaWordRomaji('すし')).toBe('sushi');
    expect(kanaWordRomaji('～かい')).toBe('~kai');
  });

  it('never emits mixed kana/Latin output for ANY real chapter word (RP-04 blanket guard)', () => {
    const registryWords = KANA_ITEMS.flatMap((k) => (k.hostWord ? [k.hostWord.word] : []));
    const all = [...new Set([...CHAPTER_WORDS, ...registryWords])];
    expect(all.length).toBeGreaterThan(70); // the sweep is real, not vacuous
    for (const w of all) {
      const out = kanaWordRomaji(w);
      expect(out, `${w} → ${out}`).toMatch(/^[\x20-\x7E\u3005\u30FC～]*$/);
    }
  });
});
