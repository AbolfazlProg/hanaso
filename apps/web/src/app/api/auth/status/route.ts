/**
 * HANASO — /api/auth/status (M1 · AUTH-ACCOUNTS).
 *
 * The single source the UI asks «who am I?»: authenticated or anonymous, the
 * account facts, the active methods, and whether the mnemonic anchor exists
 * (the settings page prompts to activate it when missing — mission §۲: the
 * prompt exists, never mandatory).
 */
import { NextResponse } from 'next/server';
import { resolveAccountFromRequest } from '@/lib/auth/server';
import { getUserById, listSessions } from '@/modules/auth/session';
import { listActiveMethods } from '@/modules/auth/identities';
import { emailTransportInfo } from '@/modules/auth/email';
import { googleConfigured } from '@/modules/auth/google';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const account = await resolveAccountFromRequest(req);
  const response = NextResponse.json(
    {
      ok: true,
      data: account
        ? {
            authenticated: true,
            user: await getUserById(account.userId),
            methods: await listActiveMethods(account.userId),
            activeSessions: (await listSessions(account.userId)).length,
            featureState: featureState(),
          }
        : { authenticated: false, featureState: featureState() },
    },
    { headers: { 'cache-control': 'no-store' } },
  );
  return response;
}

/** Activation honesty: which methods are live RIGHT NOW (env-configured). */
function featureState() {
  return {
    email: emailTransportInfo().configured,
    google: googleConfigured(),
    sms: false, // mission §۱-ب: به‌زودی — infrastructure only
  };
}
