/**
 * HANASO — POST /api/auth/session/end (M1 · AUTH-ACCOUNTS).
 *
 * Logout of THIS device: revoke the server-side session row + clear the
 * cookie. Idempotent for anonymous callers (nothing to end).
 */
import { NextResponse } from 'next/server';
import { authNoStore, sameOriginOk } from '@/lib/auth/api';
import { resolveAccountFromRequest } from '@/lib/auth/server';
import { clearSessionCookie, revokeSession } from '@/modules/auth/session';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameOriginOk(req)) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/csrf', message: 'درخواست از مبدا غیرمجاز رد شد.' }), { status: 403 }),
    );
  }
  const account = await resolveAccountFromRequest(req);
  if (!account) {
    return authNoStore(NextResponse.json(ok({ ended: false })));
  }
  await revokeSession(account.sessionId);
  const response = NextResponse.json(ok({ ended: true }));
  clearSessionCookie(response);
  console.info(`[auth] logout session=${account.sessionId}`);
  return authNoStore(response);
}
