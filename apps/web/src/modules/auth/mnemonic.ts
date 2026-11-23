/**
 * HANASO — Recovery-phrase (mnemonic) engine (M1 · AUTH-ACCOUNTS 2026-11-24).
 *
 * Owner mandate (mission §۱-الف): wallet-grade phrases — generated with
 * cryptographic randomness, shown once, verified by a random-position quiz
 * before the account activates, and re-usable for later logins.
 *
 * This module is the BIP39 core (pure crypto — no DB, no framework):
 *  - `generateMnemonicPhrase()` — 128 bits of `crypto.randomBytes` entropy →
 *    the standard BIP39 12-word phrase (SHA-256 checksum, 11-bit indices).
 *    Conformance: the classic BIP39 vectors are pinned in unit tests.
 *  - `normalizeMnemonicInput()` — the ONLY accepted spelling of a phrase at
 *    rest or over the wire: 12 words, NFKD, lowercase, single-space split,
 *    all in the wordlist. Rejoined with single spaces. Tolerant of the typing
 *    styles real users produce (commas, newlines, leading/trailing space) but
 *    STRICT about the word set and the count.
 *  - `checkQuizAnswers()` — the signup gate: for each asked position the
 *    user's chosen word must equal the phrase's word at that position.
 *  - `pickQuizPositions()` — 3 distinct positions via rejection sampling on
 *    `randomBytes` (never Math.random — the quiz must not be predictable).
 */
import { createHash, randomBytes } from 'node:crypto';
import { getWordlist, wordIndex } from './wordlist';

/** A BIP39 phrase is 12 words in this deployment (128-bit entropy). */
export const MNEMONIC_WORD_COUNT = 12;

/** The signup quiz asks for 3 distinct positions (mission: «چند موقعیت تصادفی»). */
export const QUIZ_POSITION_COUNT = 3;

/** Positions are 1-based (shown to the user as کلمهٔ ۳ / کلمهٔ ۹ …). */
export interface QuizPositions {
  readonly positions: number[];
}

/** Generate a fresh 12-word phrase (BIP39 checksum-correct, 128-bit entropy). */
export function generateMnemonicPhrase(): string {
  const words = getWordlist();
  // 128 bits entropy → +4-bit checksum → 132 bits → 12 × 11-bit indices.
  const entropy = randomBytes(16);
  const checksumBits = (createHash('sha256').update(entropy).digest()[0] ?? 0) >> 4; // top 4 bits
  // Pack 132 bits (entropy||checksum4) into 12 11-bit words.
  const bits: number[] = [];
  for (const byte of entropy) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }
  for (let i = 3; i >= 0; i--) bits.push((checksumBits >> i) & 1);
  const out: string[] = [];
  for (let w = 0; w < MNEMONIC_WORD_COUNT; w++) {
    let idx = 0;
    for (let b = 0; b < 11; b++) idx = (idx << 1) | (bits[w * 11 + b] ?? 0);
    out.push(words[idx] as string);
  }
  return out.join(' ');
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
    if (wordIndex(w) === -1) return null;
  }
  return candidates.join(' ');
}

/** Split an ALREADY normalized phrase (internal only — never trust raw input here). */
export function wordsOf(phrase: string): string[] {
  return phrase.split(' ');
}

/** True when the phrase carries its correct BIP39 checksum (typo detector). */
export function isChecksumValid(phrase: string): boolean {
  const words = wordsOf(phrase);
  if (words.length !== MNEMONIC_WORD_COUNT) return false;
  const bits: number[] = [];
  for (const w of words) {
    const idx = wordIndex(w);
    if (idx === -1) return false;
    for (let b = 10; b >= 0; b--) bits.push((idx >> b) & 1);
  }
  const entropyBits = bits.slice(0, 128);
  const checksumBits = bits.slice(128, 132);
  const bytes: number[] = [];
  for (let i = 0; i < 16; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | (entropyBits[i * 8 + b] ?? 0);
    bytes.push(byte);
  }
  const expected = (createHash('sha256').update(Buffer.from(bytes)).digest()[0] ?? 0) >> 4;
  let given = 0;
  for (let i = 0; i < 4; i++) given = (given << 1) | (checksumBits[i] ?? 0);
  return expected === given;
}

/**
 * Pick `count` distinct positions (1..12) with rejection sampling over
 * `randomBytes` — unpredictable quizzes, no modulo bias.
 */
export function pickQuizPositions(count: number = QUIZ_POSITION_COUNT): number[] {
  if (count < 1 || count > MNEMONIC_WORD_COUNT) {
    throw new Error(`anaso/auth] quiz count must be 1..${MNEMONIC_WORD_COUNT} (got ${count}).`);
  }
  const picked = new Set<number>();
  while (picked.size < count) {
    // randomBytes(1) % 12 — bias is 256/12-uniform-remainder; rejection removes it.
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
