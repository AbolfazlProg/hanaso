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
 * TASK-HANASO-24 (subagent A-02): a cookie value that fails URI decoding
 * (e.g. `hanaso_lid=%`) degrades to GUEST — never a 500 on every route.
 */
function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return '';
  }
}

/**
 * The learner id for an RSC render (cookie-resolved via next/headers).
 * Absent/invalid/unsigned cookie → GUEST_LEARNER_ID (empty honest state),
 * NEVER the shared poc-user.
 */
export async function resolveLearnerId(): Promise<string> {
  const jar = await cookies();
  return resolveSessionTokenValue(safeDecode(jar.get(LEARNER_COOKIE_NAME)?.value ?? ''));
}

/**
 * The learner id for a route handler — parsed from the Request cookie header
 * (no next/headers dependency → direct-call tests work unchanged).
 * Absent/invalid/unsigned cookie → GUEST_LEARNER_ID; write actions must
 * reject it (401 learner/no_identity) — see the station API route for the
 * guard pattern every state-changing route follows.
 *
 * TASK-HANASO-24 (subagent A-03): with DUPLICATE `hanaso_lid` cookies the
 * middleware and the RSC jar effectively take the LAST occurrence — this
 * parser now does the same (LAST-wins everywhere). A first-position planted
 * value (sibling-subdomain cookie injection) can no longer diverge from what
 * the middleware resolved for the very same request.
 */
export function resolveLearnerIdFromRequest(req: Request): string {
  const header = req.headers.get('cookie') ?? '';
  const re = new RegExp(`(?:^|;\\s*)${LEARNER_COOKIE_NAME}=([^;]+)`, 'g');
  let last: string | null = null;
  for (const m of header.matchAll(re)) last = m[1] ?? null;
  return resolveSessionTokenValue(last ? safeDecode(last) : null);
}

/** Shared policy: verify the signature (constant-time) → uuid | guest. */
function resolveSessionTokenValue(raw: string | null): string {
  if (!raw) return GUEST_LEARNER_ID;
  return verifySessionTokenSync(raw) ?? GUEST_LEARNER_ID;
}
