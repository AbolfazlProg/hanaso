/**
 * HANASO — GET /api/auth/google/callback (M1 · AUTH-ACCOUNTS — mission §۱-د).
 *
 * The most-attacked endpoint of the mission, hence the full gate ladder:
 *  1. `error` param → back with the honest marker;
 *  2. state row: exists, unexpired, UNCONSUMED (single-use — replay dies);
 *  3. the signed `hanaso_oauth_tx` cookie: signature valid + state echoes the
 *     row + the sha256 of its verifier matches the row (the cookie↔row pair);
 *  4. code exchange (server-to-server, PKCE verifier from the cookie);
 *  5. id_token verified against Google's live JWKS: signature, issuer,
 *     audience, expiry, iat, nonce;
 *  6. email must be email_verified before any linking decision;
 *  7. resolution: login (google sub known) / attach_and_login (verified email
 *     matches an email identity — the anti-duplicate path) / create_account;
 *     for purpose=link rows: attach to the wizard's account with the
 *     takeover guards (sub/email on another account → refuse);
 *  8. redirectTo is the row's internal-path value — no open redirect.
 *
 * On success the session cookie is set and the browser lands on redirectTo.
 * Every failure lands on the login/settings page with a stable marker string
 * (the page renders the Persian message; internals never leak).
 */
import { NextRequest, NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { getDbClient } from '@/db/client';
import { oauthStates } from '../../../../../../db/schema';
import { OAUTH_COOKIE_NAME, verifyOauthCookie } from '@/lib/auth/oauth-cookie';
import { establishSession } from '@/lib/auth/api';
import { attachGoogleIdentity, createAccountWithIdentity, resolveGoogleLogin, touchMethodUsage } from '@/modules/auth/identities';
import { exchangeCodeForTokens, googleEnv, verifyGoogleIdToken } from '@/modules/auth/google';

export const dynamic = 'force-dynamic';

function requestOrigin(req: NextRequest): string {
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = req.headers.get('host') ?? url.host;
  return `${proto}://${host}`;
}

const FAILURES: Record<string, string> = {
  state: 'google=invalid_state',
  expired: 'google=expired',
  cookie: 'google=invalid_state',
  exchange: 'google=exchange_failed',
  token: 'google=token_invalid',
  sub: 'google=token_invalid',
  linked_other: 'google=already_other_account',
  email_other: 'google=email_other_account',
  no_session: 'google=no_session',
};

export async function GET(req: NextRequest) {
  const origin = requestOrigin(req);
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');
  const backPath = () => `${origin}/auth/login`;

  if (errorParam) {
    return NextResponse.redirect(backPath() + (errorParam === 'access_denied' ? '?google=cancelled' : '?google=provider_error'));
  }
  if (!code || !state) {
    return NextResponse.redirect(`${origin}/auth/login?google=invalid_state`);
  }

  const { db } = getDbClient();
  const rows = await db.select().from(oauthStates).where(eq(oauthStates.state, state)).limit(1);
  const row = rows[0];
  if (!row || row.consumedAt) {
    return NextResponse.redirect(`${origin}/auth/login?${FAILURES.state}`);
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(oauthStates).where(eq(oauthStates.state, state));
    return NextResponse.redirect(`${origin}/auth/login?${FAILURES.expired}`);
  }
  const cookie = verifyOauthCookie(req.cookies.get(OAUTH_COOKIE_NAME)?.value);
  if (!cookie || cookie.state !== state) {
    return NextResponse.redirect(`${origin}/auth/login?${FAILURES.cookie}`);
  }
  const env = googleEnv();
  const redirectUri = `${origin}/api/auth/google/callback`;
  const tokens = await exchangeCodeForTokens({ env, code, codeVerifier: cookie.verifier, redirectUri });
  if (!tokens) {
    await db.update(oauthStates).set({ consumedAt: new Date() }).where(eq(oauthStates.state, state));
    return NextResponse.redirect(`${origin}/auth/login?${FAILURES.exchange}`);
  }
  const verified = await verifyGoogleIdToken(tokens.idToken, row.nonce, env.clientId);
  if (!verified.ok) {
    await db.update(oauthStates).set({ consumedAt: new Date() }).where(eq(oauthStates.state, state));
    return NextResponse.redirect(`${origin}/auth/login?${FAILURES.token}`);
  }
  const { sub, email, emailVerified } = verified.identity;
  // consume the row NOW (guarded — only if still unconsumed): the flow is
  // single-use from this point on
  await db.update(oauthStates).set({ consumedAt: new Date() }).where(and(eq(oauthStates.state, state), isNull(oauthStates.consumedAt)));

  const destination = row.redirectTo.startsWith('/') ? row.redirectTo : '/';

  if (row.purpose === 'link') {
    const userId = row.userId!;
    const attached = await attachGoogleIdentity({ userId, sub, email, emailVerified });
    if (!attached.ok) {
      const marker = attached.reason === 'google_already_linked_to_other' ? FAILURES.linked_other : FAILURES.email_other;
      return NextResponse.redirect(`${origin}/settings/security?${marker}`);
    }
    return NextResponse.redirect(`${origin}${destination}?google=linked`);
  }

  const resolution = await resolveGoogleLogin({ sub, email, emailVerified });
  let userId: string;
  if (resolution.kind === 'login') {
    userId = resolution.userId;
    await touchMethodUsage('google', sub);
  } else if (resolution.kind === 'attach_and_login') {
    userId = resolution.userId;
    const attached = await attachGoogleIdentity({ userId, sub, email, emailVerified });
    if (!attached.ok) {
      return NextResponse.redirect(`${origin}/auth/login?${FAILURES.email_other}`);
    }
  } else {
    const created = await createAccountWithIdentity({
      provider: 'google',
      providerAccountId: sub,
      email: emailVerified ? email : null,
      emailVerifiedAt: emailVerified ? new Date() : null,
    });
    userId = created.userId;
  }

  const response = NextResponse.redirect(`${origin}${destination}?google=login_ok`);
  const { mergedGuest } = await establishSession(response, req, userId, 'google');
  console.info(`[auth] google login user=${userId} mergedGuest=${mergedGuest}`);
  return response;
}
