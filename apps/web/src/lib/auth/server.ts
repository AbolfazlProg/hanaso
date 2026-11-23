/**
 * HANASO — auth server seams (M1 · AUTH-ACCOUNTS).
 *
 * The ONE precedence chain for learner identity from this mission on:
 *
 *   1. PREVIEW cookie (owner QA namespace — still first, unchanged contract);
 *   2. `hanaso_session` cookie → DB-verified account session → the account's
 *      user id (all progress, FSRS, events, settings key to it);
 *   3. the signed guest `hanaso_lid` cookie (the pre-account browser flow);
 *   4. GUEST scope.
 *
 * Two seams on purpose (mirroring lib/learner/server.ts):
 *  - `resolveAccount()` — RSC pages (next/headers);
 *  - `resolveAccountFromRequest(req)` — route handlers (cookie header parsing,
 *    direct-call unit-testable).
 *
 * Both swallow transport/DB errors into `null` (→ honest guest scope) — an
 * identity seam must degrade like the rest of the store layer, never 500 a
 * whole page render.
 */
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, resolveSession, type AccountSession } from '@/modules/auth/session';

export { SESSION_COOKIE_NAME };
export type { AccountSession };

/** Parse the LAST `hanaso_session` cookie value off a raw cookie header. */
export function sessionTokenFromCookieHeader(header: string): string | null {
  const re = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`, 'g');
  let last: string | null = null;
  for (const m of header.matchAll(re)) last = m[1] ?? null;
  if (!last) return null;
  try {
    return decodeURIComponent(last);
  } catch {
    return null;
  }
}

/** Route-handler seam: the verified account behind this Request, or null. */
export async function resolveAccountFromRequest(req: Request): Promise<AccountSession | null> {
  const header = req.headers.get('cookie') ?? '';
  const token = sessionTokenFromCookieHeader(header);
  if (!token) return null;
  try {
    return await resolveSession(token);
  } catch {
    return null;
  }
}

/** RSC seam: the verified account behind this render, or null. */
export async function resolveAccount(): Promise<AccountSession | null> {
  let token: string | null = null;
  try {
    const jar = await cookies();
    token = jar.get(SESSION_COOKIE_NAME)?.value ?? null;
  } catch {
    return null; // outside a request scope (static generation) — no session
  }
  if (!token) return null;
  try {
    return await resolveSession(token);
  } catch {
    return null;
  }
}
