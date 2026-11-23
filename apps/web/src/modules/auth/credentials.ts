/**
 * HANASO — Credential hashing for the auth module (M1 · AUTH-ACCOUNTS).
 *
 * Owner mandate (mission §۱-الف): «اطلاعات حساس به‌صورت متن خام ذخیره نشوند و
 * اعتبارسنجی امن با مشتق‌سازی کلید و Hash مقاوم انجام شود» — nothing raw, key
 * derivation + strong hashing. Two primitives, both domain-separated:
 *
 *  - `deriveLookupKey(phrase)` — DETERMINISTIC HMAC-SHA256 over the normalized
 *    phrase keyed with HANASO_SESSION_SECRET (via an HKDF subkey so the value
 *    never collides with the guest-cookie HMAC domain). Deterministic on
 *    purpose: login is an O(1) index hit. Server-keyed: a leaked DB copy alone
 *    cannot map back to phrases without the process secret.
 *
 *  - `hashMnemonic(phrase)` / `verifyMnemonic(phrase, encoded)` — scrypt
 *    (node:crypto, memory-hard: N=2^15, r=8, p=1, 32-byte key) with a fresh
 *    16-byte random salt. The encoded form `scrypt$16384$8$1$<b64salt>$<b64hash>`
 *    is self-describing for future parameter upgrades. Verification is
 *    constant-time.
 *
 *  - OTP codes reuse the same encoder (they are equally secrets — 6 digits —
 *    and scrypt makes even a DB copy useless for code-guessing).
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual, hkdfSync } from 'node:crypto';
import { getSessionSecret } from '@/lib/learner/session';

/** Domain separation for the lookup-key HMAC (never reuse the cookie domain). */
const LOOKUP_KEY_DOMAIN = 'hanaso:auth:lookup:v1';
/** Domain separation for the phrase/OTP sealing subkey. */
export const SEAL_KEY_INFO = Buffer.from('hanaso:auth:seal:v1', 'utf8');

/** scrypt work factors — memory-hard 16 MiB, ~40ms on the VPS core (safe: logins are rare). */
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const SALT_LEN = 16;

/** The 32-byte HKDF subkey used to seal pending phrases (AES-256-GCM). */
function authSubkey(): Buffer {
  const secret = Buffer.from(getSessionSecret(), 'utf8');
  if (secret.length < 16) {
    throw new Error('anaso/auth] HANASO_SESSION_SECRET is too short for auth derivation (>= 32 chars expected).');
  }
  return Buffer.from(hkdfSync('sha256', secret, new Uint8Array(0), new Uint8Array(SEAL_KEY_INFO), 32));
}

/**
 * The deterministic login lookup key — base64url(HMAC(HKDF-subkey, phrase)).
 * Same phrase ⇒ same key ⇒ O(1) `auth_identities.lookup_key` hit. NOT a
 * verifier (fast keyed hash — its only job is routing, scrypt does the proof).
 */
export function deriveLookupKey(normalizedPhrase: string): string {
  return createHmac('sha256', authSubkey()).update(`${LOOKUP_KEY_DOMAIN}:${normalizedPhrase}`).digest('base64url');
}

/** The AES-256-GCM key for sealing the signup wizard's pending phrase. */
export function sealingKey(): Buffer {
  return authSubkey();
}

/** scrypt-hash a secret (phrase or OTP) → self-describing encoded string. */
export function hashSecret(secret: string): string {
  const salt = randomBytes(SALT_LEN);
  return encodeScrypt(salt, scryptSync(secret, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: 64 << 20 }));
}

function encodeScrypt(salt: Buffer, hash: Buffer): string {
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/**
 * Constant-time verify of a secret against its encoded scrypt form.
 * `encoded` null/undefined (no mnemonic set) → always false.
 */
export function verifySecret(secret: string, encoded: string | null | undefined): boolean {
  if (typeof encoded !== 'string') return false;
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt' || !parts[4] || !parts[5]) return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || N <= 0 || r <= 0 || p <= 0) return false;
  if (N > 1 << 22 || r > 1024 || p > 64) return false; // refuse absurd params (DoS guard)
  let salt: Buffer, expected: Buffer;
  try {
    salt = Buffer.from(parts[4], 'base64');
    expected = Buffer.from(parts[5], 'base64');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;
  const actual = scryptSync(secret, salt, SCRYPT_KEYLEN, { N, r, p, maxmem: 128 << 20 });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
