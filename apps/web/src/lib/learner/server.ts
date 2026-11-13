/**
 * HANASO — Learner id, server side (TASK-LEARNING-08 / WP-5 — resolves #109;
 * TASK-HANASO-20 — the shared poc-user fallback is RETIRED, see below;
 * TASK-HANASO-24 — the cookie value must now carry a valid SERVER SIGNATURE).
 *
 * Resolves the per-browser learner id from the `hanaso_lid` session token
 * (minted + signed by src/middleware.ts on the first GET response, mirrored
 * nowhere else — the client twin no longer touches the cookie).
 *
 * TASK-HANASO-20 (BUG-001 remediation — audit/TASK-HANASO-19 BUG_REGISTER §1):
 * the old no-cookie fallback to the SHARED `poc-user` made every first-visit
 * SSR render another visitor's progress. The fallback is the reserved GUEST
 * scope instead:
 *  - RSC reads under the guest scope see the honest EMPTY state;
 *  - state-changing API actions REJECT the guest scope (`learner/no_identity`,
 *    401) — a cookie-less client can never write into anyone's store;
 *
 * TASK-HANASO-24 (RC-2): a value without a valid HMAC signature — including a
 * legacy RAW uuid or a forged/garbled token — is GUEST, never an identity.
 * The signature is what makes the identity server-issued rather than merely
 * server-shaped.
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
import { verifySessionTokenSync } from './session-node';

export { LEARNER_COOKIE_NAME, isLearnerId };
export { signSessionTokenSync, verifySessionTokenSync } from './session-node';

/**
 * Reserved read-only scope for requests without a valid learner session token.
 * Deliberately NOT a UUID shape: `isLearnerId` rejects it, so it can never be
 * smuggled through the cookie path, and the middleware replaces any such value
 * with a fresh per-browser id. It is also not `poc-user` — the legacy shared
 * store stays untouched (and unreachable) for this product slice.
 */
export const GUEST_LEARNER_ID = 'guest';

/**
 * The learner id for an RSC render (cookie-resolved via next/headers).
 * Absent/invalid/unsigned cookie → GUEST_LEARNER_ID (empty honest state),
 * NEVER the shared poc-user.
 */
export async function resolveLearnerId(): Promise<string> {
  const jar = await cookies();
  return resolveSessionTokenValue(decodeURIComponent(jar.get(LEARNER_COOKIE_NAME)?.value ?? ''));
}

/**
 * The learner id for a route handler — parsed from the Request cookie header
 * (no next/headers dependency → direct-call tests work unchanged).
 * Absent/invalid/unsigned cookie → GUEST_LEARNER_ID; write actions must
 * reject it (401 learner/no_identity) — see the station API route for the
 * guard pattern every state-changing route follows.
 */
export function resolveLearnerIdFromRequest(req: Request): string {
  const header = req.headers.get('cookie') ?? '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${LEARNER_COOKIE_NAME}=([^;]+)`));
  return resolveSessionTokenValue(match?.[1] ? decodeURIComponent(match[1]) : null);
}

/** Shared policy: verify the signature (constant-time) → uuid | guest. */
function resolveSessionTokenValue(raw: string | null): string {
  if (!raw) return GUEST_LEARNER_ID;
  return verifySessionTokenSync(raw) ?? GUEST_LEARNER_ID;
}
