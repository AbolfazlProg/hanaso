/**
 * HANASO — Google OAuth / OpenID Connect login (M1 · AUTH-ACCOUNTS — mission §۱-د).
 *
 * Authorization Code Flow with the full defense set (owner mandate):
 *  - PKCE (S256 code_challenge; the raw verifier rides an httpOnly SIGNED
 *    cookie back to the callback — its sha256 rides the DB row, so neither
 *    side stores the verifier raw at rest);
 *  - `state` — one-time (single oauth_states row, consumed on use), 5-minute TTL;
 *  - `nonce` — compared against the id_token claim (replay/decoy token killer);
 *  - full id_token verification against Google's LIVE JWKS (RS256 signature,
 *    issuer, audience, expiry, iat);
 *  - email must be `email_verified` before it can drive any linking decision.
 *
 * Activation: GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET env vars. Without them
 * the start route answers 503 (به‌زودی-style honest state) — no fake flow.
 */
import { createHash, createPublicKey, randomBytes, verify as rsaVerify, type JsonWebKey as cryptoJsonWebKey } from 'node:crypto';

export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

/** 5 minutes — the whole start→callback window. */
export const OAUTH_STATE_TTL_MS = 5 * 60 * 1000;

export interface GoogleEnv {
  readonly clientId: string;
  readonly clientSecret: string;
}

/** Read the env pair — empty strings mean NOT ACTIVATED (the 503 path). */
export function googleEnv(): GoogleEnv {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  };
}

/** True only when both credentials exist (the honest activation probe). */
export function googleConfigured(): boolean {
  const env = googleEnv();
  return env.clientId.length > 0 && env.clientSecret.length > 0;
}

/** Random URL-safe opaque strings (state, nonce). */
export function randomUrlToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** PKCE pair — S256. The verifier NEVER goes to the DB (cookie-only). */
export function generatePkcePair(): { verifier: string; challenge: string; challengeMethod: 'S256' } {
  const verifier = randomBytes(48).toString('base64url'); // 64 chars, RFC 7636 §4.1 compliant
  const challenge = createHash('sha256').update(verifier, 'utf8').digest('base64url');
  return { verifier, challenge, challengeMethod: 'S256' };
}

/** sha256 hex of the verifier — what the DB row stores. */
export function pkceVerifierHash(verifier: string): string {
  return createHash('sha256').update(verifier, 'utf8').digest('hex');
}

/** The exact authorization URL (pure — unit-testable). */
export function buildGoogleAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  loginHint?: string | null;
}): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', input.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', input.state);
  url.searchParams.set('nonce', input.nonce);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');
  if (input.loginHint) url.searchParams.set('login_hint', input.loginHint);
  return url.toString();
}

/** The fixed server-side redirect_uri (NO client control — callback-abuse guard). */
export function googleRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}/api/auth/google/callback`;
}

export interface GoogleTokenResponse {
  idToken: string;
  accessToken: string;
  expiresIn: number;
}

/** Exchange the code (POST token endpoint — server-to-server only). */
export async function exchangeCodeForTokens(input: {
  env: GoogleEnv;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse | null> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: input.env.clientId,
    client_secret: input.env.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: 'authorization_code',
    code_verifier: input.codeVerifier,
  });
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Record<string, unknown>;
  const idToken = typeof json.id_token === 'string' ? json.id_token : '';
  const accessToken = typeof json.access_token === 'string' ? json.access_token : '';
  if (!idToken || !accessToken) return null;
  return { idToken, accessToken, expiresIn: Number(json.expires_in ?? 0) };
}

export interface GoogleIdentity {
  readonly sub: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly name: string | null;
}

/** A Google JWKS entry (RSA public key in JWK form). */
export interface RsaJwk extends cryptoJsonWebKey {
  kid?: string;
}

/** JWKS cache (1h) — the ONLY network dependency of id_token verification. */
interface JwksCache {
  keys: RsaJwk[];
  fetchedAt: number;
}
const jwksCache: JwksCache = { keys: [], fetchedAt: 0 };
const JWKS_TTL_MS = 60 * 60 * 1000;

/** Reset the JWKS cache (tests). */
export function resetJwksCacheForTests(): void {
  jwksCache.keys = [];
  jwksCache.fetchedAt = 0;
}

async function loadJwks(fetchImpl: typeof fetch): Promise<RsaJwk[]> {
  if (jwksCache.fetchedAt > Date.now() - JWKS_TTL_MS) return jwksCache.keys;
  const res = await fetchImpl(GOOGLE_JWKS_URI, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error('jwks_fetch_failed');
  const json = (await res.json()) as { keys?: RsaJwk[] };
  jwksCache.keys = json.keys ?? [];
  jwksCache.fetchedAt = Date.now();
  return jwksCache.keys;
}

/** For tests: preload a JWKS document without the network. */
export function primeJwksCacheForTests(keys: RsaJwk[]): void {
  jwksCache.keys = keys;
  jwksCache.fetchedAt = Date.now();
}

export type IdTokenFailure =
  | 'malformed_token'
  | 'bad_algorithm'
  | 'unknown_kid'
  | 'bad_signature'
  | 'bad_issuer'
  | 'bad_audience'
  | 'expired'
  | 'future_token'
  | 'bad_nonce'
  | 'no_sub'
  | 'jwks_fetch_failed';

/**
 * Verify an id_token END-TO-END against the live JWKS. Every check failure maps
 * to a stable reason string (client shows one honest Persian message; no details leak).
 */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedNonce: string,
  clientId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; identity: GoogleIdentity } | { ok: false; reason: IdTokenFailure }> {
  const parts = idToken.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return { ok: false, reason: 'malformed_token' };
  let header: { alg?: string; kid?: string };
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed_token' };
  }
  if (header.alg !== 'RS256') return { ok: false, reason: 'bad_algorithm' };
  const kid = header.kid;
  if (!kid) return { ok: false, reason: 'unknown_kid' };
  let keys: RsaJwk[];
  try {
    keys = await loadJwks(fetchImpl);
  } catch {
    return { ok: false, reason: 'jwks_fetch_failed' };
  }
  const jwk = keys.find((k) => k.kid === kid && k.kty === 'RSA');
  if (!jwk) return { ok: false, reason: 'unknown_kid' };
  let publicKey: ReturnType<typeof createPublicKey>;
  try {
    publicKey = createPublicKey({ key: jwk as cryptoJsonWebKey, format: 'jwk' });
  } catch {
    return { ok: false, reason: 'bad_signature' };
  }
  const signed = Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8');
  const signature = Buffer.from(parts[2], 'base64url');
  let signatureOk = false;
  try {
    signatureOk = rsaVerify('RSA-SHA256', signed, publicKey, signature);
  } catch {
    signatureOk = false;
  }
  if (!signatureOk) return { ok: false, reason: 'bad_signature' };
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.iss !== 'string' || !GOOGLE_ISSUERS.has(payload.iss)) return { ok: false, reason: 'bad_issuer' };
  if (payload.aud !== clientId) return { ok: false, reason: 'bad_audience' };
  const exp = Number(payload.exp);
  if (!Number.isFinite(exp) || exp <= nowSec) return { ok: false, reason: 'expired' };
  const iat = Number(payload.iat);
  if (!Number.isFinite(iat) || iat > nowSec + 300) return { ok: false, reason: 'future_token' };
  if (payload.nonce !== expectedNonce) return { ok: false, reason: 'bad_nonce' };
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  if (sub.length === 0) return { ok: false, reason: 'no_sub' };
  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
  const emailVerified = payload.email_verified === true;
  const name = typeof payload.name === 'string' ? payload.name : null;
  return { ok: true, identity: { sub, email, emailVerified, name } };
}
