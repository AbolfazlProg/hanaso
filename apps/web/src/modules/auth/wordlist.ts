/**
 * HANASO — BIP39 English wordlist (M3 · owner revision 2026-11-24: «از یه
 * کتابخونه‌ای که قبلاً خودشو اثبات کرده استفاده کن»).
 *
 * The 2048-word list now comes FROM THE PROVEN LIBRARY itself —
 * `@scure/bip39` (the noble ecosystem, MIT, audited; the modern successor
 * of bitcoinjs's bip39). The vendored JSON module is retired; the canonical
 * official `.txt` stays beside this file purely as an audit artifact, and a
 * unit test pins library === txt so a compromised dependency update cannot
 * silently swap the phrase space.
 *
 * Validated once per process (2048 · unique · 3..8 lowercase) — a corrupted
 * list is a boot error, never a weakened phrase space.
 */
import { wordlist as libWordlist } from '@scure/bip39/wordlists/english.js';

const cached: readonly string[] = libWordlist.slice();

/** Load + validate once (module scope — compile-time data from the library). */
if (cached.length !== 2048) {
  throw new Error(`[hanaso/auth] BIP39 wordlist must have exactly 2048 entries (found ${cached.length}).`);
}
const seen = new Set<string>();
for (const w of cached) {
  if (!/^[a-z]{3,8}$/.test(w)) {
    throw new Error(`[hanaso/auth] BIP39 wordlist entry "${w}" is malformed.`);
  }
  if (seen.has(w)) {
    throw new Error(`[hanaso/auth] BIP39 wordlist entry "${w}" is duplicated.`);
  }
  seen.add(w);
}

/** The immutable 2048-word array (frozen — the phrase space is fixed). */
export function getWordlist(): readonly string[] {
  return cached;
}

/** O(1) membership (the input sanitizer's fast path). */
export function isKnownWord(word: string): boolean {
  return seen.has(word);
}

/** Word → 11-bit index (−1 when not in the list). */
export function wordIndex(word: string): number {
  return cached.indexOf(word);
}
