/**
 * HANASO — Recovery-phrase (mnemonic) engine (M1 → M3 · owner revision
 * 2026-11-24: wallet-grade phrases from a PROVEN LIBRARY).
 *
 * Owner mandate: «روش کیف‌پولی و امن … از یه کتابخونه‌ای که قبلاً خودشو
 * اثبات کرده استفاده کن تا امنیتش بالاتر بره» — the generation and
 * checksum math now live in `@scure/bip39` (the audited noble ecosystem:
 * the same engine real wallets use), NOT hand-rolled bit-packing.
 *
 * This module keeps the HANASO-specific contract (pure — no DB, no framework):
 *  - `generateMnemonicPhrase()` — the library's CSPRNG-backed 128-bit
 *    generator → the standard 12-word BIP39 phrase (checksum-correct).
 *    Conformance: the official BIP39 vectors are pinned in unit tests.
 *  - `normalizeMnemonicInput()` — the ONLY accepted spelling of a phrase at
 *    rest or over the wire: 12 words, NFKD, lowercase, single-space split,
 *    all in the wordlist. Tolerant of the typing styles real users produce
 *    (commas, newlines, leading/trailing space) but STRICT about the word
 *    set and the count.
 *  - `isChecksumValid()` — the library's full BIP39 validation (typo
 *    detector on recovery).
 *  - `checkQuizAnswers()` — the activation gate: for each asked position the
 *    user's typed word must equal the phrase's word at that position. No
 *    autocomplete (owner: «باید خود یوزر تایپ کنه») — a RECALL test.
 *  - `pickQuizPositions()` — 3 distinct positions via rejection sampling on
 *    `randomBytes` (never Math.random — the quiz must not be predictable).
 */
import { randomBytes } from 'node:crypto';
import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { isKnownWord } from './wordlist';

/** A BIP39 phrase is 12 words in this deployment (128-bit entropy). */
export const MNEMONIC_WORD_COUNT = 12;

/** The activation quiz asks for 3 distinct positions (mission: «چند موقعیت تصادفی»). */
export const QUIZ_POSITION_COUNT = 3;

/** Positions are 1-based (shown to the user as کلمهٔ ۳ / کلمهٔ ۹ …). */
export interface QuizPositions {
  readonly positions: number[];
}

/** Generate a fresh 12-word phrase (BIP39 checksum-correct, 128-bit entropy, CSPRNG). */
export function generateMnemonicPhrase(): string {
  // 128 bits → 12 words. The library draws entropy from node:crypto's
  // CSPRNG and packs entropy+checksum exactly per the BIP39 spec.
  return generateMnemonic(wordlist, 128);
}

/**
 * Normalize raw user/piped input to the canonical phrase form.
 * Returns null when it is not exactly 12 valid wordlist words — the caller
 * decides the error message; this never throws (untrusted input).
 */
export function normalizeMnemonicInput(raw: string): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 600) return null;
  const candidates = raw
    .normalize('NFKD')
    .toLowerCase()
    .split(/[\s,،;؛\n\r\t]+/)
    .filter((w) => w.length > 0);
  if (candidates.length !== MNEMONIC_WORD_COUNT) return null;
  for (const w of candidates) {
    if (!isKnownWord(w)) return null;
  }
  return candidates.join(' ');
}

/** Split an ALREADY normalized phrase (internal only — never trust raw input here). */
export function wordsOf(phrase: string): string[] {
  return phrase.split(' ');
}

/** True when the phrase carries its correct BIP39 checksum (the library's full validation). */
export function isChecksumValid(phrase: string): boolean {
  try {
    return validateMnemonic(phrase, wordlist);
  } catch {
    return false; // malformed input — never throw on untrusted phrases
  }
}

/**
 * Pick `count` distinct positions (1..12) with rejection sampling over
 * `randomBytes` — unpredictable quizzes, no modulo bias.
 */
export function pickQuizPositions(count: number = QUIZ_POSITION_COUNT): number[] {
  if (count < 1 || count > MNEMONIC_WORD_COUNT) {
    throw new Error(`[hanaso/auth] quiz count must be 1..${MNEMONIC_WORD_COUNT} (got ${count}).`);
  }
  const picked = new Set<number>();
  while (picked.size < count) {
    // randomBytes(1) % 12 — rejection removes the remainder bias.
    for (;;) {
      const b = randomBytes(1)[0] ?? 0;
      if (b < 252) {
        // 252 = 21×12 — the unbiased prefix of the byte space.
        picked.add((b % 12) + 1);
        break;
      }
    }
  }
  return [...picked].sort((a, b) => a - b);
}

/** Verify the quiz: every {position, word} must match the (decrypted) phrase. */
export function checkQuizAnswers(phrase: string, answers: { position: number; word: string }[]): boolean {
  const words = wordsOf(phrase);
  if (words.length !== MNEMONIC_WORD_COUNT) return false;
  for (const a of answers) {
    if (!Number.isInteger(a.position) || a.position < 1 || a.position > MNEMONIC_WORD_COUNT) return false;
    if (typeof a.word !== 'string') return false;
    if (words[a.position - 1] !== a.word.trim().toLowerCase()) return false;
  }
  return true;
}

/** Redact a phrase for logs — word COUNT only, never the words (mission rule). */
export function redactPhrase(phrase: string): string {
  return `<${wordsOf(phrase).length} words>`;
}
