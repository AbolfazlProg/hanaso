/**
 * HANASO — POST /api/auth/methods/unlink (M1 · AUTH-ACCOUNTS — mission §۲).
 *
 * Remove a login method from the account (the user-managed methods surface).
 * The ONE hard rule: never the LAST active method (lockout protection) —
 * 409 with the exact consequence message. Google/email unlink = disable the
 * identity row (relinkable later); mnemonic removal is warned by the UI with
 * its exact consequence text before this call.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, sameOriginOk } from '@/lib/auth/api';
import { resolveAccountFromRequest } from '@/lib/auth/server';
import { unlinkMethod, type ProviderName } from '@/modules/auth/identities';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const unlinkSchema = z.object({ provider: z.enum(['mnemonic', 'google', 'email', 'sms']) });

export async function POST(req: Request) {
  if (!sameOriginOk(req)) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/csrf', message: 'درخواست از مبدا غیرمجاز رد شد.' }), { status: 403 }),
    );
  }
  const account = await resolveAccountFromRequest(req);
  if (!account) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/no_session', message: 'برای مدیریت روش‌های ورود، وارد حساب خودت شو.' }), {
        status: 401,
      }),
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/invalid_json', message: 'body must be JSON' }), { status: 400 }),
    );
  }
  const parsed = unlinkSchema.safeParse(body);
  if (!parsed.success || parsed.data.provider === 'sms') {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/validation_failed', message: 'روش درخواستی معتبر نیست.' }), { status: 400 }),
    );
  }
  const result = await unlinkMethod(account.userId, parsed.data.provider as ProviderName);
  if (!result.ok) {
    if (result.reason === 'last_method') {
      return authNoStore(
        NextResponse.json(
          fail({
            code: 'auth/last_method',
            message: 'این تنها روش ورود فعال حساب است — برای حذف آن، ابتدا روش دیگری را فعال کن تا حساب قفل نشود.',
          }),
          { status: 409 },
        ),
      );
    }
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/method_not_found', message: 'این روش روی حساب تو فعال نیست.' }), {
        status: 404,
      }),
    );
  }
  console.info(`[auth] unlink provider=${parsed.data.provider} user=${account.userId}`);
  return authNoStore(NextResponse.json(ok({ removed: parsed.data.provider })));
}
