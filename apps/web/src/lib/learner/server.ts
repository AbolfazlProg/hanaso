/**
 * HANASO — Learner id, server side (TASK-LEARNING-08 / WP-5 — resolves #109).
 *
 * Resolves the per-browser learner id from the `hanaso_lid` cookie (set by the
 * client twin in `./identity.ts`). Falls back to POC_DEFAULT_USER_ID ONLY when
 * the cookie is missing/invalid — first-ever visit before the bootstrap script
 * ran, or server tests. When better-auth lands (M1) the session user id takes
 * precedence and guest progress merges into the account (documented migration).
 *
 * TWO seams on purpose:
 * - `resolveLearnerId()` — RSC pages (next/headers cookies; always inside a
 *   request scope there).
 * - `resolveLearnerIdFromRequest(req)` — route handlers parse the cookie header
 *   straight off the Request, which keeps the handlers unit-testable by direct
 *   POST/GET calls (the integration-suite pattern this repo already uses).
 */
import { cookies } from 'next/headers';
import { POC_DEFAULT_USER_ID } from '@/lib/poc/principal';
import { LEARNER_COOKIE_NAME, isLearnerId } from './identity';

export { LEARNER_COOKIE_NAME, isLearnerId };

function cookieValueFromHeader(header: string): string {
  const match = header.match(new RegExp(`(?:^|;\\s*)${LEARNER_COOKIE_NAME}=([^;]+)`));
  const raw = match?.[1] ? decodeURIComponent(match[1]) : '';
  return isLearnerId(raw) ? raw : POC_DEFAULT_USER_ID;
}

/**
 * The learner id for an RSC render (cookie-resolved via next/headers).
 */
export async function resolveLearnerId(): Promise<string> {
  const jar = await cookies();
  return cookieValueFromHeader(jar.get(LEARNER_COOKIE_NAME)?.value ?? '');
}

/**
 * The learner id for a route handler — parsed from the Request cookie header
 * (no next/headers dependency → direct-call tests work unchanged).
 */
export function resolveLearnerIdFromRequest(req: Request): string {
  return cookieValueFromHeader(req.headers.get('cookie') ?? '');
}
