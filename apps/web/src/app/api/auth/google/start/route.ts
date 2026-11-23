/**
 * HANASO — GET /api/auth/google/start (M1 · AUTH-ACCOUNTS — mission §۱-د).
 *
 * Starts the Authorization Code + PKCE flow:
 *  - state (32B) + nonce + PKCE S256 verifier/challenge;
 *  - the DB row keeps state/nonce/purpose/redirectTo + the verifier's sha256
 *    (5-minute TTL, single-use);
 *  - the RAW verifier rides the httpOnly SIGNED `hanaso_oauth_tx` cookie
 *    (path /api/auth/google) — the DB never sees it raw;
 *  - `purpose=link` (from the security settings, WITH a live session) marks
 *    the row as an attach-flow; otherwise it is a login.
 *
 * Without GOOGLE_CLIENT_ID/SECRET the route redirects back with the honest
 * unconfigured marker — never a fake flow.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { oauthStates } from '../../../../../../db/schema';
import { OAUTH_COOKIE_MAX_AGE_S, OAUTH_COOKIE_NAME, signOauthCookie } from '@/lib/auth/oauth-cookie';
import { resolveAccountFromRequest } from '@/lib/auth/server';
import { clientContext } from '@/lib/auth/api';
import { buildGoogleAuthUrl, generatePkcePair, googleEnv, pkceVerifierHash, randomUrlToken, OAUTH_STATE_TTL_MS } from '@/modules/auth/google';
import { RATE_BUCKETS, recordRateEvent, tooManyEvents } from '@/modules/auth/rate-limit';

export const dynamic = 'force-dynamic';

/** Internal-path-only redirect targets (no open redirect through the callback). */
function safeRedirectTo(raw: string | null): string {
  const candidate = raw ?? '/';
  return /^\/[A-Za-z0-9/_-]*$/.test(candidate) ? candidate : '/';
}

function requestOrigin(req: NextRequest): string {
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  const host = req.headers.get('host') ?? url.host;
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const origin = requestOrigin(req);
  const url = new URL(req.url);
  const wantsLink = url.searchParams.get('purpose') === 'link';
  const redirectTo = safeRedirectTo(url.searchParams.get('redirectTo'));
  const backPath = wantsLink ? '/settings/security' : '/auth/login';

  const env = googleEnv();
  if (!env.clientId || !env.clientSecret) {
    return NextResponse.redirect(`${origin}${backPath}?google=unconfigured`);
  }

  const account = wantsLink ? await resolveAccountFromRequest(req) : null;
  if (wantsLink && !account) {
    return NextResponse.redirect(`${origin}${backPath}?google=no_session`);
  }

  const { ipPrefix } = clientContext(req);
  const ipBucket = `${RATE_BUCKETS.oauthStartIp}:${ipPrefix ?? 'unknown'}`;
  if (await tooManyEvents(ipBucket, 60 * 60 * 1000, 20)) {
    return NextResponse.redirect(`${origin}${backPath}?google=rate_limited`);
  }
  await recordRateEvent(ipBucket);

  const state = randomUrlToken();
  const nonce = randomUrlToken(24);
  const { verifier, challenge } = generatePkcePair();

  const { db } = getDbClient();
  await db.insert(oauthStates).values({
    state,
    nonce,
    codeVerifierHash: pkceVerifierHash(verifier),
    purpose: wantsLink ? 'link' : 'login',
    userId: account?.userId ?? null,
    redirectTo,
    expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
  });

  const authUrl = buildGoogleAuthUrl({
    clientId: env.clientId,
    redirectUri: `${origin}/api/auth/google/callback`,
    state,
    nonce,
    codeChallenge: challenge,
    loginHint: url.searchParams.get('loginHint'),
  });
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(OAUTH_COOKIE_NAME, signOauthCookie(state, verifier), {
    path: '/api/auth/google',
    httpOnly: true,
    sameSite: 'lax', // the ONLY cross-site hop (google → callback) — Lax keeps it alive there
    secure: process.env.NODE_ENV === 'production',
    maxAge: OAUTH_COOKIE_MAX_AGE_S,
  });
  return response;
}
