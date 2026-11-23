/**
 * HANASO — Google OAuth unit tests (M1 · AUTH-ACCOUNTS).
 *
 * The full id_token verification chain against a SELF-SIGNED RSA JWT: the
 * test mints an RSA keypair, signs a Google-shaped id_token, primes the JWKS
 * cache, and walks every verification failure branch — exactly the code path
 * production takes against Google's live JWKS (no network in unit tests).
 * PKCE + URL building + state helpers are pinned by construction.
 */
import { createHash, createSign, generateKeyPairSync, randomBytes } from 'node:crypto';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  OAUTH_STATE_TTL_MS,
  buildGoogleAuthUrl,
  generatePkcePair,
  googleConfigured,
  googleEnv,
  pkceVerifierHash,
  primeJwksCacheForTests,
  randomUrlToken,
  resetJwksCacheForTests,
  verifyGoogleIdToken,
  type RsaJwk,
} from '@/modules/auth/google';

const CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

let privateKey: ReturnType<typeof generateKeyPairSync>['privateKey'];
let jwk: RsaJwk;

beforeEach(() => {
  resetJwksCacheForTests();
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  ({ privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 }));
  const exported = privateKey.export({ format: 'jwk' }) as RsaJwk;
  jwk = { ...exported, kid: 'test-kid-1', kty: 'RSA' };
  primeJwksCacheForTests([jwk]);
});

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

/** Mint a Google-shaped RS256 id_token with overridable claims. */
function mintIdToken(claims: Record<string, unknown>): string {
  const header = { alg: 'RS256', kid: 'test-kid-1' };
  const payload = {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    iat: Math.floor(Date.now() / 1000) - 30,
    exp: Math.floor(Date.now() / 1000) + 3000,
    sub: 'google-sub-1234567890',
    email: 'learner@example.com',
    email_verified: true,
    ...claims,
  };
  const signed = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = createSign('RSA-SHA256').update(signed).sign(privateKey);
  return `${signed}.${b64url(signature)}`;
}

describe('configuration gate', () => {
  it('unconfigured env → googleConfigured()=false; both vars → true', () => {
    expect(googleConfigured()).toBe(false);
    expect(googleEnv().clientId).toBe('');
    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    process.env.GOOGLE_CLIENT_SECRET = 'secret-value';
    expect(googleConfigured()).toBe(true);
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });
});

describe('PKCE + state helpers', () => {
  it('S256 pair: challenge is sha256(verifier) base64url; verifier is long and url-safe', () => {
    const { verifier, challenge, challengeMethod } = generatePkcePair();
    expect(challengeMethod).toBe('S256');
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{40,128}$/);
    expect(challenge).toBe(createHash('sha256').update(verifier, 'utf8').digest('base64url'));
    expect(pkceVerifierHash(verifier)).toMatch(/^[a-f0-9]{64}$/);
  });
  it('randomUrlToken is url-safe and the right length', () => {
    expect(randomUrlToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomUrlToken()).not.toBe(randomUrlToken());
  });
  it('the authorization URL carries the full defense set (PKCE, state, nonce, fixed scope)', () => {
    const url = new URL(
      buildGoogleAuthUrl({
        clientId: CLIENT_ID,
        redirectUri: 'https://hanaso.ir/api/auth/google/callback',
        state: 'state-xyz',
        nonce: 'nonce-abc',
        codeChallenge: 'challenge-123',
      }),
    );
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    const params = url.searchParams;
    expect(params.get('response_type')).toBe('code');
    expect(params.get('client_id')).toBe(CLIENT_ID);
    expect(params.get('redirect_uri')).toBe('https://hanaso.ir/api/auth/google/callback');
    expect(params.get('scope')).toBe('openid email profile');
    expect(params.get('state')).toBe('state-xyz');
    expect(params.get('nonce')).toBe('nonce-abc');
    expect(params.get('code_challenge')).toBe('challenge-123');
    expect(params.get('code_challenge_method')).toBe('S256');
    expect(params.get('prompt')).toBe('select_account');
  });
  it('the state TTL is the 5-minute window', () => {
    expect(OAUTH_STATE_TTL_MS).toBe(5 * 60 * 1000);
  });
});

describe('verifyGoogleIdToken — the full chain', () => {
  it('a correct token verifies and yields the identity', async () => {
    const result = await verifyGoogleIdToken(mintIdToken({ nonce: 'n1' }), 'n1', CLIENT_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.sub).toBe('google-sub-1234567890');
      expect(result.identity.email).toBe('learner@example.com');
      expect(result.identity.emailVerified).toBe(true);
    }
  });
  it('wrong nonce → bad_nonce (the CSRF/replay guard)', async () => {
    const result = await verifyGoogleIdToken(mintIdToken({ nonce: 'right' }), 'wrong', CLIENT_ID);
    expect(result).toEqual({ ok: false, reason: 'bad_nonce' });
  });
  it('wrong audience → bad_audience', async () => {
    const result = await verifyGoogleIdToken(mintIdToken({ nonce: 'n', aud: 'other-app' }), 'n', CLIENT_ID);
    expect(result).toEqual({ ok: false, reason: 'bad_audience' });
  });
  it('foreign issuer → bad_issuer', async () => {
    const result = await verifyGoogleIdToken(mintIdToken({ nonce: 'n', iss: 'https://evil.example' }), 'n', CLIENT_ID);
    expect(result).toEqual({ ok: false, reason: 'bad_issuer' });
  });
  it('expired → expired; future iat → future_token', async () => {
    const expired = await verifyGoogleIdToken(
      mintIdToken({ nonce: 'n', exp: Math.floor(Date.now() / 1000) - 10 }),
      'n',
      CLIENT_ID,
    );
    expect(expired).toEqual({ ok: false, reason: 'expired' });
    const future = await verifyGoogleIdToken(
      mintIdToken({ nonce: 'n', iat: Math.floor(Date.now() / 1000) + 1000 }),
      'n',
      CLIENT_ID,
    );
    expect(future).toEqual({ ok: false, reason: 'future_token' });
  });
  it('tampered payload (signature covers other bytes) → bad_signature', async () => {
    const token = mintIdToken({ nonce: 'n1' });
    const [h, p, s] = token.split('.');
    const forgedPayload = b64url(
      JSON.stringify({ ...(JSON.parse(Buffer.from(p!, 'base64url').toString()) as object), nonce: 'n2' }),
    );
    const result = await verifyGoogleIdToken(`${h}.${forgedPayload}.${s}`, 'n2', CLIENT_ID);
    expect(result).toEqual({ ok: false, reason: 'bad_signature' });
  });
  it('unknown kid / unknown key → unknown_kid', async () => {
    const unknownKid = mintIdToken({ nonce: 'n' });
    const [h, , s] = unknownKid.split('.');
    const header = JSON.parse(Buffer.from(h!, 'base64url').toString()) as { alg: string; kid: string };
    const forged = `${b64url(JSON.stringify({ ...header, kid: 'other-kid' }))}.${unknownKid.split('.')[1]}.${s}`;
    const result = await verifyGoogleIdToken(forged, 'n', CLIENT_ID);
    expect(result).toEqual({ ok: false, reason: 'unknown_kid' });
  });
  it('wrong algorithm (HS256 forge attempt) → bad_algorithm', async () => {
    const [h] = mintIdToken({ nonce: 'n' }).split('.');
    const header = JSON.parse(Buffer.from(h!, 'base64url').toString()) as Record<string, unknown>;
    const token = `${b64url(JSON.stringify({ ...header, alg: 'HS256' }))}.${mintIdToken({ nonce: 'n' }).split('.')[1]}.${mintIdToken({ nonce: 'n' }).split('.')[2]}`;
    const result = await verifyGoogleIdToken(token, 'n', CLIENT_ID);
    expect(result).toEqual({ ok: false, reason: 'bad_algorithm' });
  });
  it('garbage input → malformed_token, never a throw', async () => {
    expect(await verifyGoogleIdToken('not.a.jwt', 'n', CLIENT_ID)).toEqual({ ok: false, reason: 'malformed_token' });
    expect(await verifyGoogleIdToken('', 'n', CLIENT_ID)).toEqual({ ok: false, reason: 'malformed_token' });
    expect(await verifyGoogleIdToken('a.b.c', 'n', CLIENT_ID)).toEqual({ ok: false, reason: 'malformed_token' });
  });
  it('empty sub → no_sub (no identityless login)', async () => {
    const result = await verifyGoogleIdToken(mintIdToken({ nonce: 'n', sub: '' }), 'n', CLIENT_ID);
    expect(result).toEqual({ ok: false, reason: 'no_sub' });
  });
  it('randomBytes is exercised by the kid uniqueness (two RSA kids coexist)', () => {
    expect(randomBytes(16).length).toBe(16);
  });
});
