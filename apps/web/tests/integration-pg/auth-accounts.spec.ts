/**
 * HANASO — M2 · AUTH-PASSWORD integration suite (REAL PostgreSQL 18).
 *
 * The owner's revised architecture (2026-11-24), end-to-end through the REAL
 * route handlers and the REAL database:
 *  - THE primary login: username+password registration (guest progress
 *    merged), re-login, email-identifier login, the generic 401 (no
 *    differentiation), the 5-fails lockout, the passwordless door-sign;
 *  - the four RECOVERY doors: phrase (enroll → quiz → reset, every session
 *    revoked), email OTP (real transport capture, anti-enumeration neutral
 *    202), google (log in + set password from settings), sms («به‌زودی»);
 *  - password change (current-password proof, other-sessions revoked) and
 *    the first-credential SET on a google-born account;
 *  - username set (once) → then username+password login works;
 *  - NO duplicate accounts (google dedupe onto the email identity);
 *  - unlink rules: the password is immutable (changed, never unlinked);
 *    the last method refuses; CSRF origin gate; sms inert.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createSign, generateKeyPairSync } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

import { POST as phraseRoute } from '@/app/api/auth/mnemonic/phrase/route';
import { POST as verifyRoute } from '@/app/api/auth/mnemonic/verify/route';
import { POST as enrollRoute } from '@/app/api/auth/mnemonic/enroll/route';
import { POST as registerRoute } from '@/app/api/auth/register/route';
import { POST as loginRoute } from '@/app/api/auth/login/route';
import { POST as recoverPhraseRoute } from '@/app/api/auth/recover/phrase/route';
import { POST as recoverEmailRequestRoute } from '@/app/api/auth/recover/email/request/route';
import { POST as recoverEmailVerifyRoute } from '@/app/api/auth/recover/email/verify/route';
import { POST as passwordChangeRoute } from '@/app/api/auth/password/change/route';
import { POST as usernameRoute } from '@/app/api/auth/account/username/route';
import { POST as emailRequestRoute } from '@/app/api/auth/email/request/route';
import { POST as emailVerifyRoute } from '@/app/api/auth/email/verify/route';
import { POST as smsRequestRoute } from '@/app/api/auth/sms/request/route';
import { GET as googleStartRoute } from '@/app/api/auth/google/start/route';
import { GET as googleCallbackRoute } from '@/app/api/auth/google/callback/route';
import { POST as endAllRoute } from '@/app/api/auth/session/end-all/route';
import { GET as methodsRoute } from '@/app/api/auth/methods/route';
import { POST as unlinkRoute } from '@/app/api/auth/methods/unlink/route';

import { getDbClient, resetDbClientForTests } from '@/db/client';
import {
  authIdentities,
  learnerMerges,
  authRateEvents,
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

const USERNAME = 'parisa_test';
const PASSWORD = 'NimDuniA1384!x';
const PASSWORD2 = 'YeRamzeTaze#2026';

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
    sentCode = (payload.text.match(/(\d{6})/) ?? [])[1] ?? '';
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

/** The live password of user1 (tests reset it through the recovery doors). */
function pw(): string {
  return (G.__PW__ ??= PASSWORD);
}

/** Clear the shared rate ledger — the fast suite must not eat its own limits. */
async function clearRateLedger(): Promise<void> {
  const { db } = getDbClient();
  await db.delete(authRateEvents);
}

async function loginCookie(identifier: string, password: string): Promise<string> {
  const res = await loginRoute(post(`${BASE}/auth/login`, { identifier, password }));
  return cookieOf(res, SESSION_COOKIE_NAME);
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

describe('registration — username + password (THE primary signup)', () => {
  it('a weak/common password is refused before any row is written', async () => {
    const weak = await json<{ ok: boolean; error: { code: string } }>(
      await registerRoute(post(`${BASE}/auth/register`, { username: USERNAME, password: 'password' })),
    );
    expect(weak.ok).toBe(false);
    expect(weak.error.code).toBe('auth/password_invalid');
    const { db } = getDbClient();
    expect((await db.select({ c: sql<number>`count(*)::int` }).from(users))[0]!.c).toBe(0);
  });

  it('a reserved/malformed username is refused', async () => {
    const reserved = await json<{ ok: boolean; error: { code: string } }>(
      await registerRoute(post(`${BASE}/auth/register`, { username: 'admin', password: PASSWORD })),
    );
    expect(reserved.ok).toBe(false);
    expect(reserved.error.code).toBe('auth/username_invalid');
    const malformed = await json<{ ok: boolean; error: { code: string } }>(
      await registerRoute(post(`${BASE}/auth/register`, { username: 'سلام', password: PASSWORD })),
    );
    expect(malformed.ok).toBe(false);
  });

  it('the happy path: account + username + password identity + session + guest merge', async () => {
    // plant the pre-account browser's progress row BEFORE signup
    const { db } = getDbClient();
    const stationId = (
      (await db.execute(sql`select id from content.lessons limit 1`)).rows[0] as { id: string } | undefined
    )?.id;
    if (stationId) {
      await db.insert(stationProgress).values({ userId: GUEST_UUID, stationId, status: 'in_progress' });
    }
    const res = await registerRoute(post(`${BASE}/auth/register`, { username: USERNAME, password: PASSWORD }));
    const body = await json<{ ok: boolean; data: { userId: string; username: string } }>(res);
    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.username).toBe(USERNAME);
    G.__USER1__ = body.data.userId;
    G.__PW__ = PASSWORD;
    expect(res.headers.get('set-cookie') ?? '').toContain(`${SESSION_COOKIE_NAME}=`);
    expect(res.headers.get('set-cookie') ?? '').toContain('HttpOnly');
    // users.username + the password identity (scrypt, never raw)
    const user = (await db.select().from(users).where(eq(users.id, u1())))[0]!;
    expect(user.username).toBe(USERNAME);
    const pw = await db.select().from(authIdentities).where(eq(authIdentities.provider, 'password'));
    expect(pw).toHaveLength(1);
    expect(pw[0]!.userId).toBe(u1());
    expect(pw[0]!.credentialHash).toMatch(/^scrypt\$/);
    expect((pw[0]!.credentialHash ?? '').includes(PASSWORD)).toBe(false);
    // the guest row MERGED into the account (ledger-guarded, exactly once)
    if (stationId) {
      const moved = await db.select().from(stationProgress).where(eq(stationProgress.userId, u1()));
      expect(moved).toHaveLength(1);
      const ledger = await db.select().from(learnerMerges).where(eq(learnerMerges.fromLearnerId, GUEST_UUID));
      expect(ledger).toHaveLength(1);
    }
  });

  it('the SAME username can never register twice', async () => {
    const res = await registerRoute(post(`${BASE}/auth/register`, { username: USERNAME, password: PASSWORD }));
    expect(res.status).toBe(409);
    const { db } = getDbClient();
    expect((await db.select({ c: sql<number>`count(*)::int` }).from(users))[0]!.c).toBe(1);
  });
});

describe('login — username/email + password (THE primary way in)', () => {
  it('username + password reaches the SAME account (no new rows)', async () => {
    const res = await loginRoute(post(`${BASE}/auth/login`, { identifier: USERNAME, password: PASSWORD }));
    const body = await json<{ ok: boolean; data: { userId: string; method: string } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.userId).toBe(u1());
    expect(body.data.method).toBe('password');
    expect(res.headers.get('set-cookie')).toContain(SESSION_COOKIE_NAME);
  });

  it('the identifier is normalized (uppercase + @-paste still logs in)', async () => {
    const res = await loginRoute(
      post(`${BASE}/auth/login`, { identifier: `  @${USERNAME.toUpperCase()} `, password: PASSWORD }),
    );
    const body = await json<{ ok: boolean; data: { userId: string } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.userId).toBe(u1());
  });

  it('wrong password and UNKNOWN identifier answer the SAME generic 401 (no differentiation)', async () => {
    const wrongPw = await json<{ ok: boolean; error: { code: string; message: string } }>(
      await loginRoute(post(`${BASE}/auth/login`, { identifier: USERNAME, password: 'WrongPassword!1' })),
    );
    const unknown = await json<{ ok: boolean; error: { code: string; message: string } }>(
      await loginRoute(post(`${BASE}/auth/login`, { identifier: 'ghost_user', password: 'Whatever!1' })),
    );
    expect(wrongPw.ok).toBe(false);
    expect(unknown.ok).toBe(false);
    expect(wrongPw.error.code).toBe(unknown.error.code);
    expect(wrongPw.error.message).toBe(unknown.error.message);
  });

  it('resolveLearnerIdFromRequest prefers the account session over the guest cookie', async () => {
    const raw = await loginCookie(USERNAME, PASSWORD);
    const both = await resolveLearnerIdFromRequest(
      new Request(`${BASE}/x`, { headers: { cookie: `${GUEST_COOKIE}; ${SESSION_COOKIE_NAME}=${raw}` } }),
    );
    expect(both).toBe(u1());
    const guestOnly = await resolveLearnerIdFromRequest(
      new Request(`${BASE}/x`, { headers: { cookie: GUEST_COOKIE } }),
    );
    expect(guestOnly).toBe(GUEST_UUID);
  });

  it('the 6th failed login hits the lockout (5 fails / 15 min)', async () => {
    let last = 200;
    for (let i = 0; i < 6; i++) {
      last = (await loginRoute(post(`${BASE}/auth/login`, { identifier: USERNAME, password: 'Nope!12345' }))).status;
    }
    expect(last).toBe(429);
    await clearRateLedger();
  });

  it('logout revokes the session; logout-all kills EVERY device', async () => {
    const t1 = await loginCookie(USERNAME, pw());
    const t2 = await loginCookie(USERNAME, pw());
    expect(
      (await methodsRoute(new Request(`${BASE}/auth/methods`, { headers: { cookie: `${SESSION_COOKIE_NAME}=${t1}` } })))
        .status,
    ).toBe(200);
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

describe('recovery door ۱ — the phrase (enroll → quiz → reset)', () => {
  it('enroll on the logged-in account: prepare → phrase re-display → quiz → attached', async () => {
    const cookie = `${SESSION_COOKIE_NAME}=${await loginCookie(USERNAME, pw())}`;
    const prep = await json<{ ok: boolean; data: { registrationId: string; words: string[]; positions: number[] } }>(
      await enrollRoute(post(`${BASE}/auth/mnemonic/enroll`, {}, cookie)),
    );
    expect(prep.ok).toBe(true);
    expect(prep.data.words).toHaveLength(12);
    const again = await json<{ ok: boolean; data: { words: string[] } }>(
      await phraseRoute(post(`${BASE}/auth/mnemonic/phrase`, { registrationId: prep.data.registrationId }, cookie)),
    );
    expect(again.data.words).toEqual(prep.data.words);
    // wrong quiz NEVER attaches
    const wrong = prep.data.positions.map((p) => ({ position: p, word: 'abandon' }));
    const wrongRes = await json<{ ok: boolean }>(
      await verifyRoute(
        post(`${BASE}/auth/mnemonic/verify`, { registrationId: prep.data.registrationId, answers: wrong }, cookie),
      ),
    );
    expect(wrongRes.ok).toBe(false);
    const { db } = getDbClient();
    expect((await db.select().from(authIdentities).where(eq(authIdentities.provider, 'mnemonic'))).length).toBe(0);
    // the correct quiz attaches the phrase to the SAME account
    const answers = prep.data.positions.map((p) => ({ position: p, word: prep.data.words[p - 1]! }));
    const done = await json<{ ok: boolean; data: { userId: string; newAccount: boolean } }>(
      await verifyRoute(
        post(`${BASE}/auth/mnemonic/verify`, { registrationId: prep.data.registrationId, answers }, cookie),
      ),
    );
    expect(done.ok).toBe(true);
    expect(done.data.newAccount).toBe(false);
    expect(done.data.userId).toBe(u1());
    G.__USER1_PHRASE__ = prep.data.words.join(' ');
    const pending = await db.select().from(mnemonicPendingRegistrations);
    expect(pending).toHaveLength(0); // the sealed phrase is destroyed
  });

  it('recover/phrase: verify → NEW password → every session revoked → fresh session', async () => {
    await clearRateLedger();
    // two live sessions before the reset
    const oldA = await loginCookie(USERNAME, pw());
    const oldB = await loginCookie(USERNAME, pw());
    const res = await recoverPhraseRoute(
      post(`${BASE}/auth/recover/phrase`, { phrase: u1Phrase(), newPassword: PASSWORD2 }),
    );
    const body = await json<{ ok: boolean; data: { userId: string; allSessionsRevoked: boolean } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.userId).toBe(u1());
    expect(body.data.allSessionsRevoked).toBe(true);
    expect(res.headers.get('set-cookie') ?? '').toContain(SESSION_COOKIE_NAME);
    // the OLD sessions are dead
    expect(
      (
        await methodsRoute(
          new Request(`${BASE}/auth/methods`, { headers: { cookie: `${SESSION_COOKIE_NAME}=${oldA}` } }),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await methodsRoute(
          new Request(`${BASE}/auth/methods`, { headers: { cookie: `${SESSION_COOKIE_NAME}=${oldB}` } }),
        )
      ).status,
    ).toBe(401);
    // the OLD password no longer logs in; the NEW one does
    expect((await loginRoute(post(`${BASE}/auth/login`, { identifier: USERNAME, password: pw() }))).status).toBe(401);
    expect((await loginRoute(post(`${BASE}/auth/login`, { identifier: USERNAME, password: PASSWORD2 }))).status).toBe(
      200,
    );
    G.__PW__ = PASSWORD2;
  });

  it('a wrong phrase answers ONE honest 401', async () => {
    const body = await json<{ ok: boolean; error: { code: string } }>(
      await recoverPhraseRoute(
        post(`${BASE}/auth/recover/phrase`, {
          phrase: `${u1Phrase().split(' ').slice(0, 11).join(' ')} zoo`,
          newPassword: PASSWORD2,
        }),
      ),
    );
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('auth/phrase_rejected');
  });

  it('a malformed phrase (foreign words) is rejected before the DB', async () => {
    const body = await json<{ ok: boolean; error: { code: string } }>(
      await recoverPhraseRoute(
        post(`${BASE}/auth/recover/phrase`, {
          phrase: 'سلام دنیا عبارت نادرست است برای ورود تست',
          newPassword: PASSWORD2,
        }),
      ),
    );
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('auth/phrase_malformed');
  });
});

describe('email — the REAL transport path (link + recovery, no fake sends)', () => {
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
    const res = await recoverEmailRequestRoute(post(`${BASE}/auth/recover/email/request`, { identifier: USERNAME }));
    expect(res.status).toBe(503);
    const { db } = getDbClient();
    const rows = (await db.execute(sql`select count(*)::int as c from app.otp_codes`)).rows[0] as { c: number };
    expect(rows.c).toBe(0);
    process.env.EMAIL_TRANSPORT = 'resend';
  });

  it('an anonymous email-code request is refused (the login purpose is retired)', async () => {
    const res = await emailRequestRoute(
      post(`${BASE}/auth/email/request`, { email: 'x@example.com', purpose: 'login' }),
    );
    expect(res.status).toBe(400); // the schema itself refuses the retired purpose
    const res2 = await emailRequestRoute(post(`${BASE}/auth/email/request`, { email: 'x@example.com' }));
    expect(res2.status).toBe(401); // and without it, the session requirement speaks
  });

  it('the LINK flow: session + OTP → the email identity attaches to the SAME account', async () => {
    vi.stubGlobal('fetch', resendStub());
    await clearRateLedger();
    const cookie = `${GUEST_COOKIE}; ${SESSION_COOKIE_NAME}=${await loginCookie(USERNAME, pw())}`;
    const email = 'parisa@example.com';
    const linkReq = await emailRequestRoute(post(`${BASE}/auth/email/request`, { email, purpose: 'link' }, cookie));
    expect(linkReq.status).toBe(202);
    const { db } = getDbClient();
    const raw = (await db.execute(sql`select code_hash from app.otp_codes order by created_at desc limit 1`))
      .rows[0] as { code_hash: string };
    expect(raw.code_hash.startsWith('scrypt$')).toBe(true);
    expect(raw.code_hash.includes(sentCode)).toBe(false);
    // wrong code consumes an attempt; the right code links
    const wrong = await json<{ ok: boolean; error: { code: string } }>(
      await emailVerifyRoute(post(`${BASE}/auth/email/verify`, { email, code: '000000', purpose: 'link' }, cookie)),
    );
    expect(wrong.error.code).toBe('auth/otp_wrong_code');
    const right = await json<{ ok: boolean; data: { linked: boolean } }>(
      await emailVerifyRoute(post(`${BASE}/auth/email/verify`, { email, code: sentCode, purpose: 'link' }, cookie)),
    );
    expect(right.ok).toBe(true);
    expect(right.data.linked).toBe(true);
    const identities = await db.select().from(authIdentities).where(eq(authIdentities.provider, 'email'));
    expect(identities).toHaveLength(1);
    expect(identities[0]!.userId).toBe(u1());
  });

  it('login with the EMAIL identifier + password (the verified email routes)', async () => {
    const res = await loginRoute(post(`${BASE}/auth/login`, { identifier: 'parisa@example.com', password: pw() }));
    const body = await json<{ ok: boolean; data: { userId: string } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.userId).toBe(u1());
  });

  it('register with an email owned by another account refuses (no duplicates)', async () => {
    process.env.EMAIL_TRANSPORT = 'resend';
    const res = await registerRoute(
      post(`${BASE}/auth/register`, { username: 'second_user', password: PASSWORD, email: 'parisa@example.com' }),
    );
    expect(res.status).toBe(409);
    const { db } = getDbClient();
    expect((await db.select({ c: sql<number>`count(*)::int` }).from(users))[0]!.c).toBe(1);
  });

  it('recovery door ۲: identifier → OTP → NEW password → sessions revoked → session issued', async () => {
    vi.stubGlobal('fetch', resendStub());
    await clearRateLedger();
    // a live session that must die on reset
    const doomed = await loginCookie(USERNAME, pw());
    const req = await recoverEmailRequestRoute(post(`${BASE}/auth/recover/email/request`, { identifier: USERNAME }));
    expect(req.status).toBe(202);
    expect(sentCode).toMatch(/^\d{6}$/);
    const reset = await recoverEmailVerifyRoute(
      post(`${BASE}/auth/recover/email/verify`, { email: 'parisa@example.com', code: sentCode, newPassword: PASSWORD }),
    );
    G.__PW__ = PASSWORD;
    expect(reset.status).toBe(200);
    expect(reset.headers.get('set-cookie') ?? '').toContain(SESSION_COOKIE_NAME);
    expect(
      (
        await methodsRoute(
          new Request(`${BASE}/auth/methods`, { headers: { cookie: `${SESSION_COOKIE_NAME}=${doomed}` } }),
        )
      ).status,
    ).toBe(401);
    // the new password logs in
    expect((await loginRoute(post(`${BASE}/auth/login`, { identifier: USERNAME, password: pw() }))).status).toBe(200);
  });

  it('anti-enumeration: an UNKNOWN identifier answers the SAME neutral 202', async () => {
    vi.stubGlobal('fetch', resendStub());
    const unknown = await recoverEmailRequestRoute(
      post(`${BASE}/auth/recover/email/request`, { identifier: 'ghost_user' }),
    );
    expect(unknown.status).toBe(202);
    const body = await json<{ ok: boolean; data?: unknown }>(unknown);
    expect(body.ok).toBe(true);
    // nothing was sent (the stub never captured a code for this request)
    const { db } = getDbClient();
    const rows = (
      await db.execute(sql`select count(*)::int as c from app.otp_codes where destination = 'ghost@example.com'`)
    ).rows[0] as { c: number };
    expect(rows.c).toBe(0);
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
    const googleIdentity = await db.select().from(authIdentities).where(eq(authIdentities.provider, 'google'));
    expect(googleIdentity).toHaveLength(1);
    G.__GOOGLE_USER__ = googleIdentity[0]!.userId;
    const user = (await db.select().from(users).where(eq(users.id, G.__GOOGLE_USER__!)))[0]!;
    expect(user.email).toBe('gmail-learner@example.com');
    expect(user.emailVerifiedAt).not.toBeNull();
    const consumed = (await db.select().from(oauthStates).where(eq(oauthStates.state, state)))[0]!;
    expect(consumed.consumedAt).not.toBeNull();
  });

  it('the google-born account has NO password → the login form says which door to use', async () => {
    const body = await json<{ ok: boolean; error: { code: string } }>(
      await loginRoute(post(`${BASE}/auth/login`, { identifier: 'gmail-learner@example.com', password: 'whatever!1' })),
    );
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('auth/password_not_set');
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
    // a NEW google sub whose verified email IS user1's email identity
    vi.stubGlobal(
      'fetch',
      tokenExchangeStub(mintGoogleIdToken({ nonce, sub: 'google-sub-new-person-9', email: 'parisa@example.com' })),
    );
    const cookie = `${OAUTH_COOKIE_NAME}=${encodeURIComponent(signOauthCookie(state, verifier))}`;
    const res = await googleCallbackRoute(
      new NextRequest(`http://localhost/api/auth/google/callback?code=c&state=${state}`, { headers: { cookie } }),
    );
    expect(res.headers.get('location')).toContain('google=login_ok');
    const after = (await db.select({ c: sql<number>`count(*)::int` }).from(users))[0]!.c;
    expect(after).toBe(before); // the anti-duplicate law
    const googleRows = await db.select().from(authIdentities).where(eq(authIdentities.provider, 'google'));
    expect(googleRows.some((g) => g.userId === u1())).toBe(true); // attached to user1
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
      userId: u1(),
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

  it('recovery door ۳ (google): set a password on the google-born account, then username+password login', async () => {
    await clearRateLedger();
    const { db } = getDbClient();
    // log in as the google user (existing sub → login path)
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
    // first credential SET: no currentPassword needed (the session IS the proof)
    const set = await passwordChangeRoute(
      post(`${BASE}/auth/password/change`, { newPassword: 'GoogleBorn!2026' }, withSession),
    );
    const setBody = await json<{ ok: boolean; data: { firstCredential: boolean } }>(set);
    expect(setBody.ok).toBe(true);
    expect(setBody.data.firstCredential).toBe(true);
    // set the username (phrase users can set a username — the owner rule)
    const name = await usernameRoute(
      post(`${BASE}/auth/account/username`, { username: 'google_learner' }, withSession),
    );
    expect(name.status).toBe(200);
    // NOW username+password login works on the google-born account
    const login = await loginRoute(
      post(`${BASE}/auth/login`, { identifier: 'google_learner', password: 'GoogleBorn!2026' }),
    );
    const loginBody = await json<{ ok: boolean; data: { userId: string } }>(login);
    expect(loginBody.ok).toBe(true);
    expect(loginBody.data.userId).toBe(G.__GOOGLE_USER__);
    // the account now has password + google + username methods, ONE account
    const methods = await db.select().from(authIdentities).where(eq(authIdentities.userId, G.__GOOGLE_USER__!));
    expect(methods.map((m) => m.provider).sort()).toEqual(['google', 'password']);
    const user = (await db.select().from(users).where(eq(users.id, G.__GOOGLE_USER__!)))[0]!;
    expect(user.username).toBe('google_learner');
  });

  it('username set is ONCE (already_set) and taken handles refuse (409)', async () => {
    await clearRateLedger();
    const cookie = `${SESSION_COOKIE_NAME}=${await loginCookie('google_learner', 'GoogleBorn!2026')}`;
    const again = await json<{ ok: boolean; error: { code: string } }>(
      await usernameRoute(post(`${BASE}/auth/account/username`, { username: 'other_name' }, cookie)),
    );
    expect(again.ok).toBe(false);
    expect(again.error.code).toBe('auth/already_set');
    const fresh = await registerRoute(
      post(`${BASE}/auth/register`, { username: 'google_learner', password: PASSWORD }),
    );
    expect(fresh.status).toBe(409);
  });
});

describe('password change + unlink rules', () => {
  it('change requires the CURRENT password (a stolen session cannot rotate)', async () => {
    await clearRateLedger();
    const cookie = `${SESSION_COOKIE_NAME}=${await loginCookie(USERNAME, pw())}`;
    const wrong = await passwordChangeRoute(
      post(`${BASE}/auth/password/change`, { currentPassword: 'NotTheOld!1', newPassword: 'BrandNew#2026!' }, cookie),
    );
    expect(wrong.status).toBe(401);
    const { db } = getDbClient();
    const pwRow = (await db.select().from(authIdentities).where(eq(authIdentities.provider, 'password')))[0]!;
    expect((pwRow.credentialHash ?? '').includes('BrandNew')).toBe(false);
  });

  it('the happy change: other sessions die, the CURRENT device stays', async () => {
    await clearRateLedger();
    const current = await loginCookie(USERNAME, pw());
    const other = await loginCookie(USERNAME, pw());
    const cookie = `${GUEST_COOKIE}; ${SESSION_COOKIE_NAME}=${current}`;
    const res = await passwordChangeRoute(
      post(`${BASE}/auth/password/change`, { currentPassword: pw(), newPassword: 'BrandNew#2026!' }, cookie),
    );
    G.__PW__ = 'BrandNew#2026!';
    const body = await json<{ ok: boolean; data: { otherSessionsRevoked: boolean } }>(res);
    expect(body.ok).toBe(true);
    expect(body.data.otherSessionsRevoked).toBe(true);
    // the current session SURVIVES
    expect(
      (
        await methodsRoute(
          new Request(`${BASE}/auth/methods`, { headers: { cookie: `${SESSION_COOKIE_NAME}=${current}` } }),
        )
      ).status,
    ).toBe(200);
    // the other session is dead
    expect(
      (
        await methodsRoute(
          new Request(`${BASE}/auth/methods`, { headers: { cookie: `${SESSION_COOKIE_NAME}=${other}` } }),
        )
      ).status,
    ).toBe(401);
    // the new password logs in
    expect((await loginRoute(post(`${BASE}/auth/login`, { identifier: USERNAME, password: pw() }))).status).toBe(200);
  });

  it('the password method is NEVER unlinkable (immutable — changed, not removed)', async () => {
    await clearRateLedger();
    const cookie = `${SESSION_COOKIE_NAME}=${await loginCookie(USERNAME, pw())}`;
    const body = await json<{ ok: boolean; error: { code: string } }>(
      await unlinkRoute(post(`${BASE}/auth/methods/unlink`, { provider: 'password' }, cookie)),
    );
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('auth/password_immutable');
  });

  it('unlink never removes the LAST active method', async () => {
    await clearRateLedger();
    const cookie = `${SESSION_COOKIE_NAME}=${await loginCookie(USERNAME, pw())}`;
    // user1 holds password + mnemonic + email(+google attached earlier by dedupe)
    const removeEmail = await unlinkRoute(post(`${BASE}/auth/methods/unlink`, { provider: 'email' }, cookie));
    expect(removeEmail.status).toBe(200);
    const removeMnemonic = await unlinkRoute(post(`${BASE}/auth/methods/unlink`, { provider: 'mnemonic' }, cookie));
    expect(removeMnemonic.status).toBe(200);
    const removeGoogle = await unlinkRoute(post(`${BASE}/auth/methods/unlink`, { provider: 'google' }, cookie));
    expect(removeGoogle.status).toBe(200);
    // only the password remains — it can never be unlinked (and it isn't a
    // "last method" removal because the password is the primary credential)
    const methods = await json<{ ok: boolean; data: { methods: { provider: string }[]; sessions: unknown[] } }>(
      await methodsRoute(new Request(`${BASE}/auth/methods`, { headers: { cookie } })),
    );
    expect(methods.data.methods.map((m) => m.provider)).toEqual(['password']);
    expect(methods.data.sessions.length).toBeGreaterThan(0);
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
    const cross = new Request(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: GUEST_COOKIE, origin: 'https://evil.example' },
      body: JSON.stringify({ username: 'csrf_user', password: PASSWORD }),
    });
    const res = await registerRoute(cross);
    expect(res.status).toBe(403);
    const { db } = getDbClient();
    expect(
      (
        await db
          .select({ c: sql<number>`count(*)::int` })
          .from(users)
          .where(eq(users.username, 'csrf_user'))
      )[0]!.c,
    ).toBe(0);
  });
});
