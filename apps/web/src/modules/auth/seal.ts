/**
 * HANASO — AES-256-GCM sealing for the signup wizard's pending phrase
 * (M1 · AUTH-ACCOUNTS). The raw 12-word phrase is shown to the user ONCE and
 * lives server-side ONLY inside `phrase_sealed` during the ≤15-minute wizard
 * window (mission: never raw at rest). Key = HKDF(HANASO_SESSION_SECRET,
 * info='hanaso:auth:seal:v1') — no new secret to manage, no DB-readable
 * ciphertext even with a full table dump.
 *
 * Format: base64(iv, 12 bytes) + '.' + base64(tag, 16) + '.' + base64(ciphertext).
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { sealingKey } from './credentials';

/** Seal — throws only on crypto misuse (never on untrusted input length). */
export function sealPhrase(normalizedPhrase: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sealingKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(normalizedPhrase, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ciphertext.toString('base64')}`;
}

/** Unseal — null on ANY tampering/malformed input (auth tag failure = garbage). */
export function unsealPhrase(sealed: string): string | null {
  const parts = sealed.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  try {
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const ciphertext = Buffer.from(parts[2], 'base64');
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) return null;
    const decipher = createDecipheriv('aes-256-gcm', sealingKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return null; // auth-tag mismatch (tampered/rotated secret) — treat as garbage
  }
}
