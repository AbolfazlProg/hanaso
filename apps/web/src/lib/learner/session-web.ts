/**
 * HANASO — Session tokens, WEB runtime side (TASK-HANASO-24 / CP-02).
 *
 * The middleware runs in the EDGE runtime, where node:crypto is unavailable
 * but WebCrypto is. Same secret, same message, same base64url encoding as
 * ./session-node — byte-identical signatures across the two runtimes.
 */
import { getSessionSecret, parseSessionToken, sessionTokenMessage } from './session';

const encoder = new TextEncoder();

async function computeSignatureWeb(uuid: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(sessionTokenMessage(uuid)));
  // base64url without padding (43 chars for 32 bytes)
  let binary = '';
  const bytes = new Uint8Array(mac);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Mint a signed session token (edge middleware). */
export async function signSessionTokenWeb(uuid: string): Promise<string> {
  return `${uuid}.${await computeSignatureWeb(uuid, getSessionSecret())}`;
}

/** Verify a cookie value (edge middleware) — null when not a valid signed token. */
export async function verifySessionTokenWeb(value: string): Promise<string | null> {
  const parts = parseSessionToken(value);
  if (!parts) return null;
  const expected = await computeSignatureWeb(parts.uuid, getSessionSecret());
  // constant-time-ish compare over fixed-length base64url strings
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) === parts.signature.charCodeAt(i) ? 0 : 1;
  }
  return diff === 0 ? parts.uuid : null;
}
