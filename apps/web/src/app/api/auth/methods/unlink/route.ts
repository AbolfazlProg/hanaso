/**
 * HANASO — POST /api/auth/methods/unlink (M1 §۲ → M2 · AUTH-PASSWORD).
 *
 * Remove a recovery/login method from the account (the user-managed methods
 * surface). The hard rules: never the LAST active method (lockout
 * protection) — 409 with the exact consequence message; the PASSWORD is not
 * a removable method at all (M2: it is the primary credential — changed via
 * /api/auth/password/change, never unlinked) — 409 password_immutable.
 * Google/email unlink = disable the identity row (relinkable later).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, sameOriginOk } from '@/lib/auth/api';
import { resolveAccountFromRequest } from '@/lib/auth/server';
import { unlinkMethod } from '@/modules/auth/identities';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const unlinkSchema = z.object({ provider: z.enum(['password', 'mnemonic', 'google', 'email', 'sms']) });

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
  const result = await unlinkMethod(account.userId, parsed.data.provider);
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
    if (result.reason === 'password_immutable') {
      return authNoStore(
        NextResponse.json(
          fail({
            code: 'auth/password_immutable',
            message: 'رمز عبور روش اصلی ورود است — حذف نمی‌شود؛ از «تغییر رمز عبور» استفاده کن.',
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
