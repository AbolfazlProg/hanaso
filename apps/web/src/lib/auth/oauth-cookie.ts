/**
 * HANASO — OAuth transaction cookie (M1 · AUTH-ACCOUNTS).
 *
 * Carries the RAW PKCE code_verifier through the Google redirect hop — the
 * ONLY place it exists in transitable form; the DB stores only its sha256.
 * The cookie value is HMAC-SHA256-signed (domain-separated from both the
 * learner cookie and the auth lookup key) and must echo the `state`, so the
 * callback can prove the cookie↔DB-row pair. httpOnly, 6-minute TTL, path
 * /api/auth/google (scoping: the cookie never rides other requests).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getSessionSecret } from '@/lib/learner/session';

export const OAUTH_COOKIE_NAME = 'hanaso_oauth_tx';
const DOMAIN = 'hanaso:oauth:v1:';
/** 6 minutes — the whole start→callback window (state TTL 5 + clock grace). */
export const OAUTH_COOKIE_MAX_AGE_S = 360;

/** Sign — `state.verifier.signature` (base64url pieces). */
export function signOauthCookie(state: string, verifier: string): string {
  const message = `${DOMAIN}${state}:${verifier}`;
  const signature = createHmac('sha256', getSessionSecret()).update(message, 'utf8').digest('base64url');
  return `${state}.${verifier}.${signature}`;
}

/** Verify + extract — null on any tamper (constant-time compare). */
export function verifyOauthCookie(value: string | null | undefined): { state: string; verifier: string } | null {
  if (typeof value !== 'string') return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const state = parts[0];
  const verifier = parts[1];
  const signature = parts[2];
  if (!state || !verifier || !signature) return null;
  if (state.length > 128 || verifier.length > 128 || signature.length !== 43) return null;
  const expected = Buffer.from(createHmac('sha256', getSessionSecret()).update(`${DOMAIN}${state}:${verifier}`, 'utf8').digest('base64url'), 'utf8');
  const given = Buffer.from(signature, 'utf8');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { state, verifier };
}
