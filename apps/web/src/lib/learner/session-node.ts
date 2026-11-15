/**
 * HANASO — Session tokens, NODE runtime side (TASK-HANASO-24 / CP-02).
 *
 * Used by the identity resolvers (route handlers, RSC pages) and by tests.
 * Synchronous on purpose: the resolver seam stays sync (its many callers and
 * tests depend on that); WebCrypto (async) lives in ./session-web for the
 * edge middleware. Both compute identical HMAC-SHA256 bytes.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getSessionSecret, parseSessionToken, sessionTokenMessage } from './session';

function computeSignatureSync(uuid: string, secret: string): string {
  return createHmac('sha256', secret).update(sessionTokenMessage(uuid), 'utf8').digest('base64url');
}

/** Mint a signed session token for a known-good uuid (server + tests). */
export function signSessionTokenSync(uuid: string): string {
  return `${uuid}.${computeSignatureSync(uuid, getSessionSecret())}`;
}

/**
 * Verify a cookie value: valid signature → the uuid; anything else (absent,
 * malformed, legacy raw, WRONG SIGNATURE) → null. Constant-time comparison.
 */
export function verifySessionTokenSync(value: string): string | null {
  const parts = parseSessionToken(value);
  if (!parts) return null;
  const expected = Buffer.from(computeSignatureSync(parts.uuid, getSessionSecret()), 'utf8');
  const given = Buffer.from(parts.signature, 'utf8');
  if (given.length !== expected.length) return null;
  return timingSafeEqual(given, expected) ? parts.uuid : null;
}
