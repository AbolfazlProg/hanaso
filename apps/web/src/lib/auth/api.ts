/**
 * HANASO — auth API helpers (M1 · AUTH-ACCOUNTS — mission §۴).
 *
 * Shared hardening for every /api/auth/* mutating route:
 *  - `assertSameOrigin()` — CSRF gate: a POST must be same-origin (Origin or
 *    Referer host == the request host). SameSite=Lax already shields the JSON
 *    APIs; this belt ALSO covers the auth surface explicitly (mission:
 *    «محافظت از CSRF»).
 *  - `clientContext()` — device label + truncated IP for the session rows.
 *  - `authNoStore()` — every auth response is no-store (never cached).
 */
import { NextResponse } from 'next/server';
import { deviceLabelFromUserAgent, ipPrefixOf, createSession, setSessionCookie } from '@/modules/auth/session';
import { mergeGuestProgress } from '@/modules/auth/merge';
import { resolveLearnerIdFromRequest } from '@/lib/learner/server';

/** The mutating-auth CSRF gate: false → answer the ready 403 envelope. */
export function sameOriginOk(req: Request): boolean {
  // The request's own host — the Host header when present (every real
  // browser/proxy request), else the URL's host (direct-call route tests).
  const url = safeUrl(req.url);
  const host = req.headers.get('host') ?? url?.host;
  if (!host) return false;
  const origin = req.headers.get('origin');
  if (origin) {
    const parsed = safeUrl(origin);
    return parsed?.host === host;
  }
  const referer = req.headers.get('referer');
  if (referer) {
    const parsed = safeUrl(referer);
    return parsed?.host === host;
  }
  return false; // no origin evidence at all on a state-changing request — refuse
}

function safeUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

/** Attach `cache-control: no-store` to an auth response (identity data). */
export function authNoStore(response: NextResponse): NextResponse {
  response.headers.set('cache-control', 'no-store');
  return response;
}

/** Device label + privacy-truncated IP for session rows. */
export function clientContext(req: Request): { deviceLabel: string; ipPrefix: string | null } {
  const ua = req.headers.get('user-agent');
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0]!.trim() : (req.headers.get('x-real-ip') ?? null);
  return { deviceLabel: deviceLabelFromUserAgent(ua), ipPrefix: ipPrefixOf(ip) };
}

/**
 * The login completion atom (M1 · AUTH-ACCOUNTS): create the server-side
 * session row, set the httpOnly cookie, and migrate the browser's guest
 * progress rows into the account (mission §۳ — exactly once, ledger-guarded).
 * Returns the session row facts for logging (never the token).
 */
export async function establishSession(
  response: NextResponse,
  req: Request,
  userId: string,
  method: string,
): Promise<{ mergedGuest: boolean }> {
  const { deviceLabel, ipPrefix } = clientContext(req);
  const { token, expiresAt } = await createSession({ userId, method, deviceLabel, ipPrefix });
  setSessionCookie(response, token, expiresAt);
  const guestId = await resolveLearnerIdFromRequest(req);
  const outcome = await mergeGuestProgress(guestId, userId);
  return { mergedGuest: outcome.merged };
}
