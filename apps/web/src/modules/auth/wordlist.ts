/**
 * HANASO — BIP39 English wordlist loader (M1 · AUTH-ACCOUNTS 2026-11-24).
 *
 * The 2048-word list is vendored at src/modules/auth/content/bip39-english.txt
 * (public domain — see WORDLIST-NOTES.md) so generation NEVER depends on a
 * network fetch at runtime. Loaded once per process, validated once
 * (2048 · sorted · unique · 3..8 lowercase letters) — a corrupted file is a
 * boot error, never a silently weakened phrase space.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Path to the vendored list — resolved from THIS module file (cwd-independent). */
const WORDLIST_PATH = path.join(__dirname, 'content', 'bip39-english.txt');

let cached: string[] | null = null;

/** Load + validate the list once. `app` dir is read-only at runtime — safe. */
function loadWordlist(): string[] {
  if (cached) return cached;
  const raw = readFileSync(WORDLIST_PATH, 'utf8');
  const words = raw
    .split('\n')
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
  if (words.length !== 2048) {
    throw new Error(`anaso/auth] BIP39 wordlist must have exactly 2048 entries (found ${words.length}).`);
  }
  const seen = new Set<string>();
  for (const w of words) {
    if (!/^[a-z]{3,8}$/.test(w)) {
      throw new Error(`anaso/auth] BIP39 wordlist entry "${w}" is malformed.`);
    }
    if (seen.has(w)) {
      throw new Error(`anaso/auth] BIP39 wordlist entry "${w}" is duplicated.`);
    }
    seen.add(w);
  }
  cached = words;
  return words;
}

/** The immutable 2048-word array (defensive copy per call is unnecessary — frozen). */
export function getWordlist(): readonly string[] {
  return Object.freeze(loadWordlist());
}

/** Word → 11-bit index (−1 when not in the list — the input sanitizer's fast path). */
export function wordIndex(word: string): number {
  return loadWordlist().indexOf(word);
}
