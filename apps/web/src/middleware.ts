/**
 * HANASO — Learner identity middleware (TASK-HANASO-20 — BUG-001 remediation;
 * TASK-HANASO-24 — RC-2 hardening: signed tokens, httpOnly+Secure, GET-only
 * minting).
 *
 * The 24 contract (see lib/learner/session.ts):
 *  1. a request whose `hanaso_lid` cookie carries a VALID SIGNATURE passes
 *     through untouched (the common case — zero crypto work beyond one HMAC);
 *  2. a legacy RAW uuid (pre-24 cookie) is re-issued SIGNED with the SAME uuid
 *     on the first response — one-time transition, no re-keying, no orphaned
 *     progress rows, no fresh identity for existing learners;
 *  3. an absent/invalid cookie on a SAFE request (GET/HEAD — page loads, RSC
 *     navigations) mints a fresh per-browser uuid, signed, httpOnly, Secure;
 *  4. an absent/invalid cookie on a STATE-CHANGING request (POST/PUT/…)
 *     passes through WITHOUT minting: the route guards resolve the guest
 *     scope and answer 401. This kills the pre-24 mint-and-proceed hole
 *     (audit BUG-039: every cookie-less POST grew PG rows unauthenticated —
 *     the in-code 401 guards were dead code over HTTP).
 *
 * Cookie flags: httpOnly (JS can never read/forge it), samesite=lax (cross-site
 * POSTs carry no cookie → CSRF on the JSON-only mutating APIs is closed by
 * Lax + content-type; Strict would strip the cookie on external-link arrivals
 * and mint strangers fresh identities), secure (https, X-Forwarded-Proto, or
 * production — 127.0.0.1 QA stays usable: browsers treat it as trustworthy).
 */
import { NextRequest, NextResponse } from 'next/server';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/identity';
import { isRawLegacyLearnerValue } from '@/lib/learner/session';
import { signSessionTokenWeb, verifySessionTokenWeb } from '@/lib/learner/session-web';

/** One year — unchanged from pre-24 (identity stability across visits). */
const COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365;

function shouldMint(request: NextRequest): boolean {
  return request.method === 'GET' || request.method === 'HEAD';
}

function secureCookie(request: NextRequest): boolean {
  if (request.nextUrl.protocol === 'https:') return true;
  const forwarded = request.headers.get('x-forwarded-proto');
  if (forwarded === 'https') return true;
  return process.env.NODE_ENV === 'production';
}

/**
 * TASK-HANASO-24 hardening (live QA S5 finding): the raw-uuid → signed
 * re-issue must not be a PERMANENT forgery oracle (anyone holding a pre-24
 * raw value could otherwise get it re-signed forever). It is bounded by a
 * wall clock:
 *
 *  - dev/test (NODE_ENV !== 'production'): always allowed (no real learners);
 *  - production WITHOUT HANASO_LEGACY_TOKEN_CUTOFF: DISABLED — fail-closed;
 *  - production WITH it (an ISO datetime, set at deploy to deploy+grace):
 *    allowed only while now < cutoff. After the grace passes, raw values are
 *    garbage like any other malformed cookie (fresh mint on GET, 401 on
 *    writes). The deploy runbook (RELEASE_CANDIDATE) generates the value.
 */
function legacyReissueAllowed(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const cutoff = process.env.HANASO_LEGACY_TOKEN_CUTOFF;
  if (typeof cutoff !== 'string' || cutoff.length === 0) return false;
  const t = Date.parse(cutoff);
  return Number.isFinite(t) ? Date.now() < t : false;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // TASK-HANASO-24 (subagent A-02): a value that fails URI decoding is treated
  // as absent — never a 500 on every route.
  const raw = request.cookies.get(LEARNER_COOKIE_NAME)?.value ?? '';
  let existing = '';
  if (raw) {
    try {
      existing = decodeURIComponent(raw);
    } catch {
      existing = '';
    }
  }

  // 1. already a valid signed token — nothing to do
  if (existing && (await verifySessionTokenWeb(existing)) !== null) {
    return NextResponse.next();
  }

  // 2. legacy RAW uuid → re-issue SIGNED, same uuid — but ONLY inside the
  //    bounded grace window (legacyReissueAllowed); outside it the raw value
  //    is just garbage (fresh identity on GET, guest on writes).
  // 4. state-changing request without any identity → do NOT mint (401 at the
  //    route guards); a garbage/foreign value on such a request likewise.
  const legacyUuid =
    existing && isRawLegacyLearnerValue(existing) && legacyReissueAllowed() ? existing : null;
  if (!legacyUuid && !shouldMint(request)) {
    return NextResponse.next();
  }

  const uuid = legacyUuid ?? crypto.randomUUID();
  const token = await signSessionTokenWeb(uuid);
  // the same response's RSC render / route handler already resolves it
  // (request side) and the browser remembers it (response side)
  request.cookies.set(LEARNER_COOKIE_NAME, token);
  const response = NextResponse.next({ request });
  response.cookies.set(LEARNER_COOKIE_NAME, token, {
    path: '/',
    maxAge: COOKIE_MAX_AGE_S,
    sameSite: 'lax',
    httpOnly: true, // TASK-HANASO-24: the client twin must never read/write it
    secure: secureCookie(request),
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
