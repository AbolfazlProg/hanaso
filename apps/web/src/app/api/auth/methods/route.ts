/**
 * HANASO — GET /api/auth/methods (M1 · AUTH-ACCOUNTS — mission §۲).
 *
 * The security-settings data: the account's active methods, the live session
 * devices (label, method, last-seen), and the activation state of the other
 * methods (email transport / google credentials / sms به‌زودی) so the UI can
 * render honest affordances only.
 */
import { NextResponse } from 'next/server';
import { resolveAccountFromRequest } from '@/lib/auth/server';
import { getUserById, listSessions } from '@/modules/auth/session';
import { listActiveMethods } from '@/modules/auth/identities';
import { emailTransportInfo } from '@/modules/auth/email';
import { googleConfigured } from '@/modules/auth/google';
import { fail } from '@/modules/shared';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const account = await resolveAccountFromRequest(req);
  if (!account) {
    return NextResponse.json(
      fail({ code: 'auth/no_session', message: 'برای مدیریت روش‌های ورود، وارد حساب خودت شو.' }),
      {
        status: 401,
        headers: { 'cache-control': 'no-store' },
      },
    );
  }
  return NextResponse.json(
    {
      ok: true,
      data: {
        user: await getUserById(account.userId),
        methods: await listActiveMethods(account.userId),
        sessions: (await listSessions(account.userId)).map((s) => ({
          id: s.id,
          method: s.method,
          deviceLabel: s.deviceLabel,
          ipPrefix: s.ipPrefix,
          createdAt: s.createdAt,
          lastSeenAt: s.lastSeenAt,
          current: s.id === account.sessionId,
        })),
        featureState: {
          email: emailTransportInfo().configured,
          google: googleConfigured(),
          sms: false,
        },
      },
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
