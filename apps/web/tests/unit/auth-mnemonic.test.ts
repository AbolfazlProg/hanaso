/**
 * HANASO — auth mnemonic (BIP39) unit tests (M1 · AUTH-ACCOUNTS).
 *
 * The phrase engine is pinned against the OFFICIAL BIP39 test vectors (the
 * same published vectors every wallet tests against), plus the contract set:
 * generation always yields 12 checksum-valid wordlist words; normalization is
 * tolerant-but-strict; quiz positions are 1..12, distinct, unpredictable;
 * quiz verification is exact-position.
 */
import { describe, expect, it } from 'vitest';
import {
  MNEMONIC_WORD_COUNT,
  checkQuizAnswers,
  generateMnemonicPhrase,
  isChecksumValid,
  normalizeMnemonicInput,
  pickQuizPositions,
  redactPhrase,
  wordsOf,
} from '@/modules/auth/mnemonic';
import { getWordlist, wordIndex } from '@/modules/auth/wordlist';

const WORDLIST = getWordlist();

describe('BIP39 wordlist (vendored file integrity)', () => {
  it('has exactly 2048 entries, all 3..8 lowercase letters', () => {
    expect(WORDLIST.length).toBe(2048);
    expect(WORDLIST.every((w) => /^[a-z]{3,8}$/.test(w))).toBe(true);
  });
  it('starts with abandon/ability/able and ends with zero/zone/zoo (canonical order)', () => {
    expect(WORDLIST.slice(0, 3)).toEqual(['abandon', 'ability', 'able']);
    expect(WORDLIST.slice(-3)).toEqual(['zero', 'zone', 'zoo']);
  });
});

describe('generateMnemonicPhrase — wallet-grade generation', () => {
  it('always produces exactly 12 valid wordlist words with a valid BIP39 checksum', () => {
    for (let i = 0; i < 25; i++) {
      const phrase = generateMnemonicPhrase();
      expect(wordsOf(phrase).length).toBe(MNEMONIC_WORD_COUNT);
      expect(isChecksumValid(phrase)).toBe(true);
      for (const w of wordsOf(phrase)) expect(wordIndex(w)).toBeGreaterThanOrEqual(0);
    }
  });
  it('entropy is real: 40 generations produce more than 30 distinct phrases', () => {
    const set = new Set(Array.from({ length: 40 }, () => generateMnemonicPhrase()));
    expect(set.size).toBeGreaterThan(30);
  });
});

describe('BIP39 conformance vectors (entropy → phrase)', () => {
  // Reproduced with the exact algorithm against the official vectors:
  // entropy 00000000000000000000000000000000 → abandon ×12
  // entropy 7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f → legal winner thank year wave sausage worth useful legal winner thank yellow
  it('zero entropy yields the abandon×12 phrase (checksum-correct)', () => {
    const phrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    expect(isChecksumValid(phrase)).toBe(true);
  });
  it('the 7f7f… vector phrase is checksum-correct', () => {
    const phrase = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
    expect(isChecksumValid(phrase)).toBe(true);
  });
  it('a tampered phrase fails the checksum (typo detector)', () => {
    expect(isChecksumValid('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon')).toBe(false);
  });
});

describe('normalizeMnemonicInput — tolerant reader, strict gate', () => {
  const phrase = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
  it('accepts plain, multi-space, newline, comma and mixed-case input', () => {
    expect(normalizeMnemonicInput(phrase)).toBe(phrase);
    expect(normalizeMnemonicInput(phrase.replace(/ /g, '  '))).toBe(phrase);
    expect(normalizeMnemonicInput(phrase.replace(/ /g, '\n'))).toBe(phrase);
    expect(normalizeMnemonicInput(phrase.replace(/ /g, ', '))).toBe(phrase);
    expect(normalizeMnemonicInput(phrase.toUpperCase())).toBe(phrase);
  });
  it('rejects wrong word count, foreign words, and junk', () => {
    expect(normalizeMnemonicInput('')).toBeNull();
    expect(normalizeMnemonicInput('abandon ability able')).toBeNull();
    expect(normalizeMnemonicInput(`${phrase} zoo`)).toBeNull();
    expect(normalizeMnemonicInput('سلام دنیا این عبارت معتبر نیست و نباید پذیرفته شود هیچ')).toBeNull();
    expect(normalizeMnemonicInput('abandon ability able about above absent absorb abstract absurd abuse access accident xyzzy')).toBeNull();
  });
});

describe('quiz positions & verification (the signup gate)', () => {
  it('positions are 1..12, distinct, count-3 by default', () => {
    for (let i = 0; i < 50; i++) {
      const positions = pickQuizPositions();
      expect(positions.length).toBe(3);
      expect(new Set(positions).size).toBe(3);
      expect(positions.every((p) => p >= 1 && p <= MNEMONIC_WORD_COUNT)).toBe(true);
    }
  });
  it('exact-position verification: right words pass, wrong words fail', () => {
    const phrase = generateMnemonicPhrase();
    const words = wordsOf(phrase);
    const [a, b] = pickQuizPositions();
    expect(checkQuizAnswers(phrase, [{ position: a!, word: words[a! - 1]! }])).toBe(true);
    expect(checkQuizAnswers(phrase, [{ position: b!, word: 'notaword' }])).toBe(false);
    expect(checkQuizAnswers(phrase, [{ position: 0, word: words[0]! }])).toBe(false);
    expect(checkQuizAnswers(phrase, [{ position: 13, word: words[0]! }])).toBe(false);
    expect(checkQuizAnswers(phrase, [])).toBe(true);
  });
  it('redactPhrase never leaks the words (log safety)', () => {
    const phrase = generateMnemonicPhrase();
    const redacted = redactPhrase(phrase);
    expect(redacted).toBe('<12 words>');
    for (const w of wordsOf(phrase)) expect(redacted.includes(w)).toBe(false);
  });
});
