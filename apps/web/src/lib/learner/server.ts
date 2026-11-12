/**
 * HANASO — Learner id, server side (TASK-LEARNING-08 / WP-5 — resolves #109;
 * TASK-HANASO-20 — the shared poc-user fallback is RETIRED, see below).
 *
 * Resolves the per-browser learner id from the `hanaso_lid` cookie. The cookie
 * is minted by `src/middleware.ts` on the very FIRST server response (same
 * render already resolves it), mirrored by the client twin in `./identity.ts`.
 *
 * TASK-HANASO-20 (BUG-001 remediation — audit/TASK-HANASO-19 BUG_REGISTER §1):
 * the old no-cookie fallback to the SHARED `poc-user` made every first-visit
 * SSR render another visitor's progress («۴ ایستگاه کامل کرده‌ای» + a CTA into a
 * locked lesson whose completion then 409s). The fallback is now the reserved
 * GUEST scope instead:
 *  - RSC reads under the guest scope see the honest EMPTY state — no rows are
 *    ever written under it, so it can never surface another visitor's data;
 *  - state-changing API actions REJECT the guest scope (`learner/no_identity`,
 *    401) — a cookie-less client can never write into anyone's store;
 *  - real traffic resolves a proper per-browser identity from the first
 *    response (middleware); the guest scope only survives for middleware-
 *    bypassed paths and direct handler tests.
 * When better-auth lands (M1) the session user id takes precedence and guest
 * progress merges into the account (documented migration).
 *
 * TWO seams on purpose:
 * - `resolveLearnerId()` — RSC pages (next/headers cookies; always inside a
 *   request scope there).
 * - `resolveLearnerIdFromRequest(req)` — route handlers parse the cookie header
 *   straight off the Request, which keeps the handlers unit-testable by direct
 *   POST/GET calls (the integration-suite pattern this repo already uses).
 */
import { cookies } from 'next/headers';
import { LEARNER_COOKIE_NAME, isLearnerId } from './identity';

export { LEARNER_COOKIE_NAME, isLearnerId };

/**
 * Reserved read-only scope for requests without a valid learner cookie.
 * Deliberately NOT a UUID shape: `isLearnerId` rejects it, so it can never be
 * set through the cookie path, and the middleware replaces any such value with
 * a fresh per-browser id. It is also not `poc-user` — the legacy shared store
 * stays untouched (and unreachable) for this product slice.
 */
export const GUEST_LEARNER_ID = 'guest';

function resolveCookieValue(raw: string | null | undefined): string {
  return raw && isLearnerId(raw) ? raw : GUEST_LEARNER_ID;
}

/**
 * The learner id for an RSC render (cookie-resolved via next/headers).
 *
 * TASK-HANASO-16 (bug found by the browser QA of the new /learn): the cookie
 * VALUE must go through isLearnerId directly — it is NOT a header string, so
 * the old `cookieValueFromHeader(value)` never matched its `name=value` regex
 * and EVERY RSC page silently fell back to POC_DEFAULT_USER_ID while the API
 * routes resolved the real per-browser learner (server HTML ≠ client refresh).
 *
 * TASK-HANASO-20: absent/invalid cookie → GUEST_LEARNER_ID (empty honest
 * state), NEVER the shared poc-user.
 */
export async function resolveLearnerId(): Promise<string> {
  const jar = await cookies();
  return resolveCookieValue(decodeURIComponent(jar.get(LEARNER_COOKIE_NAME)?.value ?? ''));
}

/**
 * The learner id for a route handler — parsed from the Request cookie header
 * (no next/headers dependency → direct-call tests work unchanged).
 * Absent/invalid cookie → GUEST_LEARNER_ID; write actions must reject it
 * (401 learner/no_identity) — see the station API route for the guard.
 */
export function resolveLearnerIdFromRequest(req: Request): string {
  const header = req.headers.get('cookie') ?? '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${LEARNER_COOKIE_NAME}=([^;]+)`));
  return resolveCookieValue(match?.[1] ? decodeURIComponent(match[1]) : null);
}
