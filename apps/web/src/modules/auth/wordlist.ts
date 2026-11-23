/**
 * HANASO — BIP39 English wordlist loader (M1 · AUTH-ACCOUNTS 2026-11-24).
 *
 * The 2048-word list ships as a JSON MODULE (bundled into the build — the
 * production lesson: a runtime readFileSync(__dirname…) does NOT survive the
 * Next.js standalone output, it 500'd the signup page live). The canonical
 * `.txt` stays beside it for audits; a unit test pins JSON == TXT so the two
 * can never drift. Validated once per process (2048 · unique · 3..8
 * lowercase) — a corrupted file is a boot error, never a weakened phrase
 * space.
 */
import rawList from './content/bip39-english.json';

const cached: readonly string[] = (rawList as unknown as string[]).slice();

/** Load + validate once (module scope — the list is compile-time data now). */
if (cached.length !== 2048) {
  throw new Error(`anaso/auth] BIP39 wordlist must have exactly 2048 entries (found ${cached.length}).`);
}
const seen = new Set<string>();
for (const w of cached) {
  if (!/^[a-z]{3,8}$/.test(w)) {
    throw new Error(`anaso/auth] BIP39 wordlist entry "${w}" is malformed.`);
  }
  if (seen.has(w)) {
    throw new Error(`anaso/auth] BIP39 wordlist entry "${w}" is duplicated.`);
  }
  seen.add(w);
}

/** The immutable 2048-word array (frozen — the phrase space is fixed). */
export function getWordlist(): readonly string[] {
  return cached;
}

/** Word → 11-bit index (−1 when not in the list — the input sanitizer's fast path). */
export function wordIndex(word: string): number {
  return cached.indexOf(word);
}
