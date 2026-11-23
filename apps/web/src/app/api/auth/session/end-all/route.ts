/**
 * HANASO — POST /api/auth/session/end-all (M1 · AUTH-ACCOUNTS — mission §۴).
 *
 * «خروج از همه دستگاه‌ها»: revoke EVERY live session of the account (the
 * devices list goes to zero) + clear this browser's cookie. Any stolen token
 * dies with the same call.
 */
import { NextResponse } from 'next/server';
import { authNoStore, sameOriginOk } from '@/lib/auth/api';
import { resolveAccountFromRequest } from '@/lib/auth/server';
import { clearSessionCookie, revokeAllSessions } from '@/modules/auth/session';
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
  await revokeAllSessions(account.userId);
  const response = NextResponse.json(ok({ ended: true, all: true }));
  clearSessionCookie(response);
  console.info(`[auth] logout-all user=${account.userId}`);
  return authNoStore(response);
}
