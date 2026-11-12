/**
 * HANASO — Learner identity middleware (TASK-HANASO-20 — BUG-001 remediation).
 *
 * The audit (audit/TASK-HANASO-19, BUG_REGISTER §1 + LIVE_WEBSITE_AUDIT §3)
 * reproduced the broken first-visit chain: a cookie-less request SSR-rendered
 * the SHARED `poc-user` progress («۴ ایستگاه کامل کرده‌ای», a CTA into a locked
 * lesson, then an unexplained 409 on its completion). The client bootstrap
 * created a fresh id only AFTER hydration and never re-rendered, so the very
 * first experience of every new learner was someone else's dashboard.
 *
 * This middleware moves id creation to the SERVER, on the FIRST response:
 *  - a request without a valid `hanaso_lid` cookie gets a freshly minted UUID;
 *  - the id is set on the REQUEST (the same response's RSC render / route
 *    handler already resolves it — server and client share one identity from
 *    the first byte) AND on the RESPONSE (`Set-Cookie`, 365d, same shape the
 *    client twin in identity.ts writes);
 *  - no-JS browsers get a real per-browser identity too (the old chain left
 *    them permanently on the shared account — data contamination both ways).
 *
 * The client bootstrap (LearnerIdBootstrap) stays as the belt-and-braces twin:
 * with this middleware it finds the cookie already present on mount and
 * reuses it (idempotent no-op).
 */
import { NextRequest, NextResponse } from 'next/server';
import { LEARNER_COOKIE_NAME, isLearnerId } from '@/lib/learner/identity';

/** Mirrors identity.ts (client twin) — one year, lax, readable by the client. */
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365;

export function middleware(request: NextRequest): NextResponse {
  const existing = request.cookies.get(LEARNER_COOKIE_NAME)?.value ?? '';
  if (isLearnerId(existing)) {
    return NextResponse.next();
  }
  // First-ever visit (or a malformed/foreign value): mint a per-browser id and
  // make THIS response render with it (request side) and remember it (response
  // side). crypto.randomUUID is available in the edge runtime.
  const id = crypto.randomUUID();
  request.cookies.set(LEARNER_COOKIE_NAME, id);
  const response = NextResponse.next({ request });
  response.cookies.set(LEARNER_COOKIE_NAME, id, {
    path: '/',
    maxAge: COOKIE_MAX_AGE_S,
    sameSite: 'lax',
    httpOnly: false, // the client twin reads it (localStorage mirror)
  });
  return response;
}

/**
 * Everything except Next's static internals and the committed audio/fonts
 * (binary assets never need an identity decision).
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|audio/).*)'],
};
