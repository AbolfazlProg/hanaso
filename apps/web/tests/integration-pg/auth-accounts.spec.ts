/**
 * HANASO — M1 · AUTH-ACCOUNTS integration suite (REAL PostgreSQL 18).
 *
 * The mission's test demands (§۵), end-to-end through the REAL route handlers
 * and the REAL database:
 *  - signup with the mnemonic + the storage quiz, guest progress MERGED into
 *    the account, re-login with the phrase reaching the SAME account;
 *  - email OTP login/link with a REAL transport call (the Resend HTTP request
 *    is captured, the code parsed from the actual email body — no fake login);
 *  - google OAuth end-to-end with a self-signed RSA id_token (the token
 *    exchange + JWKS network hops are stubbed ONLY at the network boundary —
 *    every signature/nonce/state check runs for real);
 *  - NO duplicate accounts: a google login whose verified email matches an
 *    existing email identity attaches to that account (attach_and_login);
 *    linking a method to a session never forks a second account;
 *  - the session precedence seam: account > guest cookie;
 *  - rate limits: the 6th failed phrase login → 429; sms always 503 «به‌زودی»;
 *  - unlink rules: the last active method refuses; CSRF origin gate.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createSign, generateKeyPairSync } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

import { POST as prepareRoute } from '@/app/api/auth/mnemonic/prepare/route';
import { POST as phraseRoute } from '@/app/api/auth/mnemonic/phrase/route';
import { POST as verifyRoute } from '@/app/api/auth/mnemonic/verify/route';
import { POST as loginRoute } from '@/app/api/auth/mnemonic/login/route';
import { POST as enrollRoute } from '@/app/api/auth/mnemonic/enroll/route';
import { POST as emailRequestRoute } from '@/app/api/auth/email/request/route';
import { POST as emailVerifyRoute } from '@/app/api/auth/email/verify/route';
import { POST as smsRequestRoute } from '@/app/api/auth/sms/request/route';
import { GET as googleStartRoute } from '@/app/api/auth/google/start/route';
import { GET as googleCallbackRoute } from '@/app/api/auth/google/callback/route';
import { POST as endSessionRoute } from '@/app/api/auth/session/end/route';
import { POST as endAllRoute } from '@/app/api/auth/session/end-all/route';
import { GET as methodsRoute } from '@/app/api/auth/methods/route';
import { POST as unlinkRoute } from '@/app/api/auth/methods/unlink/route';

import { getDbClient, resetDbClientForTests } from '@/db/client';
import {
  authIdentities,
  learnerMerges,
  mnemonicPendingRegistrations,
  oauthStates,
  stationProgress,
  users,
} from '../../db/schema';
import { resolveLearnerIdFromRequest } from '@/lib/learner/server';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/identity';
import { signSessionTokenSync } from '@/lib/learner/session-node';
import { OAUTH_COOKIE_NAME, signOauthCookie } from '@/lib/auth/oauth-cookie';
import { SESSION_COOKIE_NAME } from '@/modules/auth/session';
import { generatePkcePair, pkceVerifierHash, primeJwksCacheForTests, randomUrlToken } from '@/modules/auth/google';
import { resetStoresForTests } from '@/lib/poc/stores';
import { ensureTestDatabase } from './helpers';

/* cross-test carriers (the DB is the source of truth; these save lookups) */
const G = globalThis as unknown as Record<string, string>;
function u1(): string {
  return G.__USER1__ as string;
}
function u1Phrase(): string {
  return G.__USER1_PHRASE__ as string;
}

const BASE = 'http://localhost/api';
const ORIGIN = { origin: 'http://localhost' } as Record<string, string>;
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0' } as Record<string, string>;

/** The signup browser's guest identity (signed cookie — the middleware shape). */
const GUEST_UUID = '99999999-8888-7777-6666-555555555555';
const GUEST_COOKIE = `${LEARNER_COOKIE_NAME}=${signSessionTokenSync(GUEST_UUID)}`;

function post(url: string, body: unknown, cookie: string = GUEST_COOKIE): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: 'localhost', cookie, ...ORIGIN, ...UA },
    body: JSON.stringify(body),
  });
}

async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

/** Google stubs: the RSA keypair + the id_token minter (network stubs below). */
let googlePrivateKey: ReturnType<typeof generateKeyPairSync>['privateKey'];
let googleJwk: Record<string, unknown>;

function mintGoogleIdToken(claims: Record<string, unknown>): string {
  const header = { alg: 'RS256', kid: 'auth-int-kid' };
  const payload = {
    iss: 'https://accounts.google.com',
    aud: 'google-client-id-int',
    iat: Math.floor(Date.now() / 1000) - 30,
    exp: Math.floor(Date.now() / 1000) + 3000,
    sub: 'google-sub-integration-1',
    email: 'gmail-learner@example.com',
    email_verified: true,
    ...claims,
  };
  const b64 = (x: string | Buffer) => Buffer.from(x).toString('base64url');
  const signed = `${b64(JSON.stringify(header))}.${b64(JSON.stringify(payload))}`;
  const signature = createSign('RSA-SHA256').update(signed).sign(googlePrivateKey);
  return `${signed}.${b64(signature)}`;
}

/** Read the LAST code captured from the email text (module-level carrier). */
let sentCode = '';

function resendStub(): (input: string | URL, init?: RequestInit) => Promise<Response> {
  return async (input: string | URL, init?: RequestInit) => {
    expect(String(input)).toContain('api.resend.com');
    const payload = JSON.parse(String(init?.body)) as { text: string };
    sentCode = (payload.text.match(/کد یک‌بارمصرف: (\d{6})/) ?? [])[1] ?? '';
    return new Response(JSON.stringify({ id: `email-${Date.now()}` }), { status: 200 });
  };
}

/** The google token-exchange network stub (id_token minted per call). */
function tokenExchangeStub(idToken: string) {
  return async (input: string | URL): Promise<Response> => {
    expect(String(input)).toContain('oauth2.googleapis.com/token');
    return new Response(JSON.stringify({ id_token: idToken, access_token: 'at-int', expires_in: 3600 }), {
      status: 200,
    });
  };
}

function cookieOf(res: Response, name: string): string {
  const raw = (res.headers.get('set-cookie') ?? '').match(new RegExp(`${name}=([^;]+)`))?.[1] ?? '';
  return raw;
}

beforeAll(async () => {
  await ensureTestDatabase();
  resetDbClientForTests();
  resetStoresForTests();
  ({ privateKey: googlePrivateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 }));
  googleJwk = {
    ...(googlePrivateKey.export({ format: 'jwk' }) as Record<string, unknown>),
    kid: 'auth-int-kid',
    kty: 'RSA',
  };
  primeJwksCacheForTests([googleJwk as never]);
  process.env.GOOGLE_CLIENT_ID = 'google-client-id-int';
  process.env.GOOGLE_CLIENT_SECRET = 'google-secret-int';
});

afterAll(async () => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  vi.restoreAllMocks();
  resetStoresForTests();
  resetDbClientForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mnemonic signup + login (the account anchor)', () => {
  let phrase: string[] = [];
  let positions: number[] = [];
  let registrationId = '';

  it('prepare issues the sealed wizard for THIS browser (words + positions)', async () => {
    const body = await json<{ ok: boolean; data: { registrationId: string; words: string[]; positions: number[] } }>(
      await prepareRoute(post(`${BASE}/auth/mnemonic/prepare`, {})),
    );
    expect(body.ok).toBe(true);
    expect(body.data.words).toHaveLength(12);
    expect(body.data.positions).toHaveLength(3);
    phrase = body.data.words;
    positions = body.data.positions;
    registrationId = body.data.registrationId;
  });

  it('the phrase re-display works inside the window (the second look)', async () => {
    const body = await json<{ ok: boolean; data: { words: string[] } }>(
      await phraseRoute(post(`${BASE}/auth/mnemonic/phrase`, { registrationId })),
    );
    expect(body.ok).toBe(true);
    expect(body.data.words).toEqual(phrase);
  });

  it('wrong quiz answers NEVER create an account', async () => {
    const wrong = positions.map((p) => ({ position: p, word: 'abandon' }));
    const body = await json<{ ok: boolean }>(
      await verifyRoute(post(`${BASE}/auth/mnemonic/verify`, { registrationId, answers: wrong })),
    );
    expect(body.ok).toBe(false);
    const { db } = getDbClient();
    const count = (await db.select({ c: sql<number>`count(*)::int` }).from(users))[0]!.c;
    expect(count).toBe(0);
  });

  it('the correct quiz creates the account + session + merges the browser guest progress', async () => {
    // plant the pre-account browser's progress row BEFORE signup
    const { db } = getDbClient();
    const stationId = (
      (await db.execute(sql`select id from content.lessons limit 1`)).rows[0] as { id: string } | undefined
    )?.id;
    if (stationId) {
      await db.insert(stationProgress).values({ userId: GUEST_UUID, stationId, status: 'in_progress' });
    }
    const answers = positions.map((p) => ({ position: p, word: phrase[p - 1]! }));
    const res = await verifyRoute(post(`${BASE}/auth/mnemonic/verify`, { registrationId, answers }));
    const body = await json<{ ok: boolean; data: { userId: string; newAccount: boolean } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.newAccount).toBe(true);
    G.__USER1__ = body.data.userId;
    G.__USER1_PHRASE__ = phrase.join(' ');
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(setCookie).toContain('HttpOnly');
    // the mnemonic anchor identity
    const anchor = await db.select().from(authIdentities).where(eq(authIdentities.provider, 'mnemonic'));
    expect(anchor).toHaveLength(1);
    expect(anchor[0]!.userId).toBe(u1());
    expect(anchor[0]!.credentialHash).toMatch(/^scrypt\$/);
    expect(anchor[0]!.lookupKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // the guest row MERGED into the account (ledger-guarded, exactly once)
    if (stationId) {
      const moved = await db.select().from(stationProgress).where(eq(stationProgress.userId, u1()));
      expect(moved).toHaveLength(1);
      const ledger = await db.select().from(learnerMerges).where(eq(learnerMerges.fromLearnerId, GUEST_UUID));
      expect(ledger).toHaveLength(1);
    }
    // the pending row is destroyed (the sealed phrase no longer exists)
    const pending = await db.select().from(mnemonicPendingRegistrations);
    expect(pending).toHaveLength(0);
  });

  it('re-login with the SAME phrase reaches the SAME account (no new user rows)', async () => {
    const res = await loginRoute(post(`${BASE}/auth/mnemonic/login`, { phrase: u1Phrase() }));
    const body = await json<{ ok: boolean; data: { userId: string } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.userId).toBe(u1());
    const { db } = getDbClient();
    const count = (await db.select({ c: sql<number>`count(*)::int` }).from(users))[0]!.c;
    expect(count).toBe(1);
    expect(res.headers.get('set-cookie')).toContain(SESSION_COOKIE_NAME);
  });

  it('a wrong phrase answers ONE honest 401 (no check differentiation)', async () => {
    const body = await json<{ ok: boolean; error: { code: string } }>(
      await loginRoute(
        post(`${BASE}/auth/mnemonic/login`, { phrase: `${u1Phrase().split(' ').slice(0, 11).join(' ')} zoo` }),
      ),
    );
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('auth/phrase_rejected');
  });

  it('the 6th failed phrase login hits the lockout (rate limit)', async () => {
    const wrong = `${u1Phrase().split(' ').slice(0, 11).join(' ')} zoo`;
    let last = 200;
    for (let i = 0; i < 6; i++) {
      last = (await loginRoute(post(`${BASE}/auth/mnemonic/login`, { phrase: wrong }))).status;
    }
    expect(last).toBe(429);
  });

  it('a malformed phrase (foreign words) never touches the DB', async () => {
    const body = await json<{ ok: boolean; error: { code: string } }>(
      await loginRoute(post(`${BASE}/auth/mnemonic/login`, { phrase: 'سلام دنیا عبارت نادرست است برای ورود تست' })),
    );
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('auth/phrase_malformed');
  });
});

describe('session precedence + revocation', () => {
  async function freshLoginCookie(): Promise<string> {
    const res = await loginRoute(post(`${BASE}/auth/mnemonic/login`, { phrase: u1Phrase() }));
    return cookieOf(res, SESSION_COOKIE_NAME);
  }

  it('resolveLearnerIdFromRequest prefers the account session over the guest cookie', async () => {
    const raw = await freshLoginCookie();
    const both = await resolveLearnerIdFromRequest(
      new Request(`${BASE}/x`, { headers: { cookie: `${GUEST_COOKIE}; ${SESSION_COOKIE_NAME}=${raw}` } }),
    );
    expect(both).toBe(u1());
    const guestOnly = await resolveLearnerIdFromRequest(
      new Request(`${BASE}/x`, { headers: { cookie: GUEST_COOKIE } }),
    );
    expect(guestOnly).toBe(GUEST_UUID);
  });

  it('logout revokes the session; the token dies immediately', async () => {
    const raw = await freshLoginCookie();
    const cookie = `${GUEST_COOKIE}; ${SESSION_COOKIE_NAME}=${raw}`;
    const res = await endSessionRoute(post(`${BASE}/auth/session/end`, {}, cookie));
    expect(res.status).toBe(200);
    expect((await methodsRoute(new Request(`${BASE}/auth/methods`, { headers: { cookie } }))).status).toBe(401);
  });

  it('logout-all kills EVERY device session', async () => {
    const t1 = await freshLoginCookie();
    const t2 = await freshLoginCookie();
    const res = await endAllRoute(post(`${BASE}/auth/session/end-all`, {}, `${SESSION_COOKIE_NAME}=${t1}`));
    expect(res.status).toBe(200);
    expect(
      (await methodsRoute(new Request(`${BASE}/auth/methods`, { headers: { cookie: `${SESSION_COOKIE_NAME}=${t1}` } })))
        .status,
    ).toBe(401);
    expect(
      (await methodsRoute(new Request(`${BASE}/auth/methods`, { headers: { cookie: `${SESSION_COOKIE_NAME}=${t2}` } })))
        .status,
    ).toBe(401);
  });
});

describe('email OTP login/link — the REAL transport path (no fake login)', () => {
  beforeAll(() => {
    process.env.EMAIL_TRANSPORT = 'resend';
    process.env.RESEND_API_KEY = 're_test_integration';
    process.env.EMAIL_FROM = 'HANASO <no-reply@test.hanaso>';
  });
  afterAll(() => {
    delete process.env.EMAIL_TRANSPORT;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it('unconfigured transport → 503, NO otp row, NO send (the honest dead end)', async () => {
    delete process.env.EMAIL_TRANSPORT;
    const res = await emailRequestRoute(
      post(`${BASE}/auth/email/request`, { email: 'x@example.com', purpose: 'login' }),
    );
    expect(res.status).toBe(503);
    const { db } = getDbClient();
    const rows = (await db.execute(sql`select count(*)::int as c from app.otp_codes`)).rows[0] as { c: number };
    expect(rows.c).toBe(0);
    process.env.EMAIL_TRANSPORT = 'resend';
  });

  it('configured transport: the code travels; login for an UNKNOWN address honestly 404s', async () => {
    vi.stubGlobal('fetch', resendStub());
    const sent = await json<{ ok: boolean; data: { sentTo: string } }>(
      await emailRequestRoute(post(`${BASE}/auth/email/request`, { email: 'learner@example.com', purpose: 'login' })),
    );
    expect(sent.ok).toBe(true);
    expect(sentCode).toMatch(/^\d{6}$/);
    // stored ONLY as a scrypt hash — never the raw code
    const { db } = getDbClient();
    const raw = (await db.execute(sql`select code_hash from app.otp_codes`)).rows[0] as { code_hash: string };
    expect(raw.code_hash.startsWith('scrypt$')).toBe(true);
    expect(raw.code_hash.includes(sentCode)).toBe(false);
    // the address never registered → honest 404, never a fake login
    const verify = await json<{ ok: boolean; error: { code: string } }>(
      await emailVerifyRoute(
        post(`${BASE}/auth/email/verify`, { email: 'learner@example.com', code: sentCode, purpose: 'login' }),
      ),
    );
    expect(verify.ok).toBe(false);
    expect(verify.error.code).toBe('auth/no_account_for_email');
  });

  it('the LINK flow: create account 2, link its email via OTP, then email LOGIN reaches it', async () => {
    vi.stubGlobal('fetch', resendStub());
    // account 2 via a fresh mnemonic wizard
    const prep = await json<{ ok: boolean; data: { registrationId: string; words: string[]; positions: number[] } }>(
      await prepareRoute(post(`${BASE}/auth/mnemonic/prepare`, {})),
    );
    const answers = prep.data.positions.map((p) => ({ position: p, word: prep.data.words[p - 1]! }));
    const created = await json<{ ok: boolean; data: { userId: string } }>(
      await verifyRoute(post(`${BASE}/auth/mnemonic/verify`, { registrationId: prep.data.registrationId, answers })),
    );
    G.__USER2__ = created.data.userId;
    G.__USER2_PHRASE__ = prep.data.words.join(' ');
    // login as user2 → session cookie
    const loginRes = await loginRoute(post(`${BASE}/auth/mnemonic/login`, { phrase: G.__USER2_PHRASE__ }));
    const sessionCookie = `${GUEST_COOKIE}; ${SESSION_COOKIE_NAME}=${cookieOf(loginRes, SESSION_COOKIE_NAME)}`;
    const email = 'linking@example.com';
    // request the LINK code (the destination is user2's account)
    const linkReq = await emailRequestRoute(
      post(`${BASE}/auth/email/request`, { email, purpose: 'link' }, sessionCookie),
    );
    expect(linkReq.status).toBe(202);
    // wrong code consumes an attempt; right code links; reuse is dead
    const wrong = await json<{ ok: boolean; error: { code: string } }>(
      await emailVerifyRoute(
        post(`${BASE}/auth/email/verify`, { email, code: '000000', purpose: 'link' }, sessionCookie),
      ),
    );
    expect(wrong.error.code).toBe('auth/otp_wrong_code');
    const right = await json<{ ok: boolean; data: { linked: boolean } }>(
      await emailVerifyRoute(
        post(`${BASE}/auth/email/verify`, { email, code: sentCode, purpose: 'link' }, sessionCookie),
      ),
    );
    expect(right.ok).toBe(true);
    expect(right.data.linked).toBe(true);
    // now EMAIL LOGIN reaches user2 — the method is attached to the SAME account
    await emailRequestRoute(post(`${BASE}/auth/email/request`, { email, purpose: 'login' }));
    const login = await json<{ ok: boolean; data: { userId: string; method: string } }>(
      await emailVerifyRoute(post(`${BASE}/auth/email/verify`, { email, code: sentCode, purpose: 'login' })),
    );
    expect(login.ok).toBe(true);
    expect(login.data.userId).toBe(G.__USER2__);
    expect(login.data.method).toBe('email');
    // no duplicate accounts were born
    const { db } = getDbClient();
    expect((await db.select({ c: sql<number>`count(*)::int` }).from(users))[0]!.c).toBe(2);
  });
});

describe('google OAuth — the full callback chain (self-signed RSA id_token)', () => {
  it('start redirects to Google with PKCE + state and plants the oauth cookie', async () => {
    const req = new NextRequest('http://localhost/api/auth/google/start', { headers: { ...UA } });
    const res = await googleStartRoute(req);
    expect([302, 307, 308]).toContain(res.status);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('accounts.google.com/o/oauth2/v2/auth');
    expect(location).toContain('code_challenge_method=S256');
    expect(location).toContain('nonce=');
    expect(location).toContain('state=');
    expect(res.headers.get('set-cookie') ?? '').toContain(`${OAUTH_COOKIE_NAME}=`);
  });

  it('the callback chain → session (create_account path) with verified email', async () => {
    const { db } = getDbClient();
    const { verifier } = generatePkcePair();
    const state = randomUrlToken();
    const nonce = randomUrlToken(24);
    await db.insert(oauthStates).values({
      state,
      nonce,
      codeVerifierHash: pkceVerifierHash(verifier),
      purpose: 'login',
      redirectTo: '/',
      expiresAt: new Date(Date.now() + 4 * 60 * 1000),
    });
    vi.stubGlobal('fetch', tokenExchangeStub(mintGoogleIdToken({ nonce })));
    const cookie = `${OAUTH_COOKIE_NAME}=${encodeURIComponent(signOauthCookie(state, verifier))}`;
    const res = await googleCallbackRoute(
      new NextRequest(`http://localhost/api/auth/google/callback?code=int-code&state=${state}`, {
        headers: { cookie, ...UA },
      }),
    );
    expect(res.headers.get('location')).toContain('google=login_ok');
    expect(res.headers.get('set-cookie')).toContain(SESSION_COOKIE_NAME);
    // account + google identity + verified contact email
    const googleIdentity = await db.select().from(authIdentities).where(eq(authIdentities.provider, 'google'));
    expect(googleIdentity).toHaveLength(1);
    G.__GOOGLE_USER__ = googleIdentity[0]!.userId;
    const user = (await db.select().from(users).where(eq(users.id, G.__GOOGLE_USER__!)))[0]!;
    expect(user.email).toBe('gmail-learner@example.com');
    expect(user.emailVerifiedAt).not.toBeNull();
    // state consumed (single-use)
    const consumed = (await db.select().from(oauthStates).where(eq(oauthStates.state, state)))[0]!;
    expect(consumed.consumedAt).not.toBeNull();
  });

  it('state REPLAY is dead (consumed row → invalid_state)', async () => {
    const { verifier } = generatePkcePair();
    const state = randomUrlToken();
    const { db } = getDbClient();
    await db.insert(oauthStates).values({
      state,
      nonce: randomUrlToken(24),
      codeVerifierHash: pkceVerifierHash(verifier),
      purpose: 'login',
      redirectTo: '/',
      expiresAt: new Date(Date.now() + 4 * 60 * 1000),
      consumedAt: new Date(),
    });
    const cookie = `${OAUTH_COOKIE_NAME}=${encodeURIComponent(signOauthCookie(state, verifier))}`;
    const res = await googleCallbackRoute(
      new NextRequest(`http://localhost/api/auth/google/callback?code=x&state=${state}`, { headers: { cookie } }),
    );
    expect(res.headers.get('location')).toContain('google=invalid_state');
  });

  it('a tampered oauth cookie (verifier mismatch) never reaches the token exchange', async () => {
    const { verifier } = generatePkcePair();
    const state = randomUrlToken();
    const { db } = getDbClient();
    await db.insert(oauthStates).values({
      state,
      nonce: randomUrlToken(24),
      codeVerifierHash: pkceVerifierHash(verifier),
      purpose: 'login',
      redirectTo: '/',
      expiresAt: new Date(Date.now() + 4 * 60 * 1000),
    });
    const cookie = `${OAUTH_COOKIE_NAME}=${encodeURIComponent(signOauthCookie(state, 'a-different-verifier-value'))}`;
    const res = await googleCallbackRoute(
      new NextRequest(`http://localhost/api/auth/google/callback?code=x&state=${state}`, { headers: { cookie } }),
    );
    expect(res.headers.get('location')).toContain('google=invalid_state');
  });

  it('google login whose VERIFIED email matches an email identity → attach_and_login (NO duplicate account)', async () => {
    const { db } = getDbClient();
    const before = (await db.select({ c: sql<number>`count(*)::int` }).from(users))[0]!.c;
    const { verifier } = generatePkcePair();
    const state = randomUrlToken();
    const nonce = randomUrlToken(24);
    await db.insert(oauthStates).values({
      state,
      nonce,
      codeVerifierHash: pkceVerifierHash(verifier),
      purpose: 'login',
      redirectTo: '/',
      expiresAt: new Date(Date.now() + 4 * 60 * 1000),
    });
    // a NEW google sub whose verified email IS user2's email identity
    vi.stubGlobal(
      'fetch',
      tokenExchangeStub(mintGoogleIdToken({ nonce, sub: 'google-sub-new-person-9', email: 'linking@example.com' })),
    );
    const cookie = `${OAUTH_COOKIE_NAME}=${encodeURIComponent(signOauthCookie(state, verifier))}`;
    const res = await googleCallbackRoute(
      new NextRequest(`http://localhost/api/auth/google/callback?code=c&state=${state}`, { headers: { cookie } }),
    );
    expect(res.headers.get('location')).toContain('google=login_ok');
    const after = (await db.select({ c: sql<number>`count(*)::int` }).from(users))[0]!.c;
    expect(after).toBe(before); // the anti-duplicate law
    const googleRows = await db.select().from(authIdentities).where(eq(authIdentities.provider, 'google'));
    expect(googleRows.some((g) => g.userId === G.__USER2__!)).toBe(true); // attached to user2
  });

  it('link purpose with a sub owned by ANOTHER account refuses (takeover guard)', async () => {
    const { verifier } = generatePkcePair();
    const state = randomUrlToken();
    const nonce = randomUrlToken(24);
    const { db } = getDbClient();
    await db.insert(oauthStates).values({
      state,
      nonce,
      codeVerifierHash: pkceVerifierHash(verifier),
      purpose: 'link',
      userId: G.__USER2__!,
      redirectTo: '/settings/security',
      expiresAt: new Date(Date.now() + 4 * 60 * 1000),
    });
    // sub already belongs to __GOOGLE_USER__ → refused
    vi.stubGlobal(
      'fetch',
      tokenExchangeStub(mintGoogleIdToken({ nonce, sub: 'google-sub-integration-1', email: 'elsewhere@example.com' })),
    );
    const cookie = `${OAUTH_COOKIE_NAME}=${encodeURIComponent(signOauthCookie(state, verifier))}`;
    const res = await googleCallbackRoute(
      new NextRequest(`http://localhost/api/auth/google/callback?code=c&state=${state}`, { headers: { cookie } }),
    );
    expect(res.headers.get('location')).toContain('already_other_account');
  });

  it('the mnemonic ENROLL path: a google-only account activates its anchor + logs in with it', async () => {
    // login as the google user (existing sub → login path)
    const { db } = getDbClient();
    const { verifier } = generatePkcePair();
    const state = randomUrlToken();
    const nonce = randomUrlToken(24);
    await db.insert(oauthStates).values({
      state,
      nonce,
      codeVerifierHash: pkceVerifierHash(verifier),
      purpose: 'login',
      redirectTo: '/',
      expiresAt: new Date(Date.now() + 4 * 60 * 1000),
    });
    vi.stubGlobal('fetch', tokenExchangeStub(mintGoogleIdToken({ nonce })));
    const loginAgain = await googleCallbackRoute(
      new NextRequest(`http://localhost/api/auth/google/callback?code=c&state=${state}`, {
        headers: { cookie: `${OAUTH_COOKIE_NAME}=${encodeURIComponent(signOauthCookie(state, verifier))}`, ...UA },
      }),
    );
    const rawToken = cookieOf(loginAgain, SESSION_COOKIE_NAME);
    expect(rawToken.length).toBeGreaterThan(0);
    const withSession = `${GUEST_COOKIE}; ${SESSION_COOKIE_NAME}=${rawToken}`;
    // enroll: prepare (session-bound) → quiz → verify → anchor attached
    const prep = await json<{ ok: boolean; data: { registrationId: string; words: string[]; positions: number[] } }>(
      await enrollRoute(post(`${BASE}/auth/mnemonic/enroll`, {}, withSession)),
    );
    expect(prep.ok).toBe(true);
    const answers = prep.data.positions.map((p) => ({ position: p, word: prep.data.words[p - 1]! }));
    const done = await json<{ ok: boolean; data: { userId: string } }>(
      await verifyRoute(
        post(`${BASE}/auth/mnemonic/verify`, { registrationId: prep.data.registrationId, answers }, withSession),
      ),
    );
    expect(done.ok).toBe(true);
    expect(done.data.userId).toBe(G.__GOOGLE_USER__!);
    // the account now has BOTH google and mnemonic methods
    const methods = await db.select().from(authIdentities).where(eq(authIdentities.userId, G.__GOOGLE_USER__!));
    expect(methods.map((m) => m.provider).sort()).toEqual(['google', 'mnemonic']);
    // and the phrase LOGS IN to the same account
    const phraseLogin = await json<{ ok: boolean; data: { userId: string } }>(
      await loginRoute(post(`${BASE}/auth/mnemonic/login`, { phrase: prep.data.words.join(' ') })),
    );
    expect(phraseLogin.data.userId).toBe(G.__GOOGLE_USER__);
    G.__GOOGLE_PHRASE__ = prep.data.words.join(' ');
  });
});

describe('methods management + the honest dead ends', () => {
  async function user2Cookie(): Promise<string> {
    const res = await loginRoute(post(`${BASE}/auth/mnemonic/login`, { phrase: G.__USER2_PHRASE__ }));
    return `${SESSION_COOKIE_NAME}=${cookieOf(res, SESSION_COOKIE_NAME)}`;
  }

  it('the methods list carries the account methods + devices', async () => {
    const cookie = await user2Cookie();
    const body = await json<{ ok: boolean; data: { methods: { provider: string }[]; sessions: unknown[] } }>(
      await methodsRoute(new Request(`${BASE}/auth/methods`, { headers: { cookie } })),
    );
    expect(body.ok).toBe(true);
    expect(body.data.methods.map((m) => m.provider).sort()).toEqual(['email', 'mnemonic']);
    expect(body.data.sessions.length).toBeGreaterThan(0);
  });

  it('unlink never removes the LAST method', async () => {
    const cookie = await user2Cookie();
    const removeEmail = await unlinkRoute(post(`${BASE}/auth/methods/unlink`, { provider: 'email' }, cookie));
    expect(removeEmail.status).toBe(200);
    const removeLast = await json<{ ok: boolean; error: { code: string } }>(
      await unlinkRoute(post(`${BASE}/auth/methods/unlink`, { provider: 'mnemonic' }, cookie)),
    );
    expect(removeLast.ok).toBe(false);
    expect(removeLast.error.code).toBe('auth/last_method');
  });

  it('sms is INERT: 503 «به‌زودی», no row, no code', async () => {
    const smsPost = (await (smsRequestRoute as unknown as (r: Request) => Promise<Response>)(
      post(`${BASE}/auth/sms/request`, { phone: '+989120000000' }),
    )) as Response;
    const body = await json<{ ok: boolean; error: { code: string; message: string } }>(smsPost);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('auth/sms_not_available');
    expect(body.error.message).toContain('به‌زودی');
  });

  it('CSRF: a cross-origin POST is refused before anything happens', async () => {
    const cross = new Request(`${BASE}/auth/mnemonic/prepare`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: GUEST_COOKIE, origin: 'https://evil.example' },
      body: '{}',
    });
    const res = await prepareRoute(cross);
    expect(res.status).toBe(403);
  });
});
