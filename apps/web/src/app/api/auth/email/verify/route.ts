/**
 * HANASO — POST /api/auth/email/verify (M1 · AUTH-ACCOUNTS — mission §۱-ج).
 *
 * Verifies the 6-digit code and completes the flow:
 *  - login purpose: the (email) identity must already exist (only an
 *    OTP-verified mailbox can create one) → session + guest-progress merge;
 *  - link purpose: the OTP row's target user (the account that requested it)
 *    gains the (email) identity — proof the mailbox consented.
 *
 * Anti-abuse: the code row itself caps attempts (5) and expires (10 min);
 * per-destination verify failures are also ledgered (10/hour).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, establishSession, sameOriginOk } from '@/lib/auth/api';
import { resolveAccountFromRequest } from '@/lib/auth/server';
import { verifyOtp } from '@/modules/auth/email-otp';
import { attachEmailIdentity, findUserEmailIdentity, touchMethodUsage } from '@/modules/auth/identities';
import { RATE_BUCKETS, recordRateEvent, tooManyEvents } from '@/modules/auth/rate-limit';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const verifySchema = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/),
  purpose: z.enum(['login', 'link']).optional(),
});

export async function POST(req: Request) {
  if (!sameOriginOk(req)) {
    return authNoStore(NextResponse.json(fail({ code: 'auth/csrf', message: 'درخواست از مبدا غیرمجاز رد شد.' }), { status: 403 }));
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return authNoStore(NextResponse.json(fail({ code: 'auth/invalid_json', message: 'body must be JSON' }), { status: 400 }));
  }
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return authNoStore(NextResponse.json(fail({ code: 'auth/validation_failed', message: 'کد باید ۶ رقم باشد.' }), { status: 400 }));
  }
  const email = parsed.data.email.toLowerCase();
  const account = await resolveAccountFromRequest(req);
  const purpose = parsed.data.purpose ?? (account ? 'link' : 'login');

  const failBucket = `${RATE_BUCKETS.otpVerifyDestination}:${email}`;
  if (await tooManyEvents(failBucket, 60 * 60 * 1000, 10)) {
    return authNoStore(NextResponse.json(fail({ code: 'auth/rate_limited', message: 'تلاش‌های تأیید بیش از حد مجاز است — یک ساعت دیگر تلاش کن.' }), { status: 429 }));
  }

  const result = await verifyOtp({ channel: 'email', destination: email, purpose, code: parsed.data.code });
  if (result.outcome !== 'ok') {
    await recordRateEvent(failBucket);
    const message =
      result.outcome === 'no_active_code'
        ? 'کدی برای این ایمیل صادر نشده است — ابتدا درخواست کد بده.'
        : result.outcome === 'expired'
          ? 'کد منقضی شده است — دوباره کد بگیر.'
          : result.outcome === 'too_many_attempts'
            ? 'تلاش‌های ناموفق این کد بیش از حد مجاز بود — کد جدید بگیر.'
            : 'کد واردشده درست نیست.';
    return authNoStore(NextResponse.json(fail({ code: `auth/otp_${result.outcome}`, message }), { status: 401 }));
  }

  if (purpose === 'link') {
    const targetUserId = result.userId ?? account?.userId;
    if (!targetUserId) {
      return authNoStore(NextResponse.json(fail({ code: 'auth/no_session', message: 'نشست اتصال ایمیل یافت نشد — دوباره درخواست کد بده.' }), { status: 401 }));
    }
    const attached = await attachEmailIdentity({ userId: targetUserId, email });
    if (!attached.ok) {
      return authNoStore(
        NextResponse.json(
          fail({ code: 'auth/email_owned_by_other', message: 'این ایمیل به حساب دیگری متصل است — برای مدیریت آن وارد همان حساب شو.' }),
          { status: 409 },
        ),
      );
    }
    return authNoStore(NextResponse.json(ok({ method: 'email', linked: true })));
  }

  // login: the identity must exist
  const identity = await findUserEmailIdentity(email);
  if (!identity || identity.disabledAt) {
    return authNoStore(
      NextResponse.json(
        fail({ code: 'auth/no_account_for_email', message: 'حسابی با این ایمیل پیدا نشد — ابتدا ثبت‌نام کن یا از روش دیگری وارد شو.' }),
        { status: 404 },
      ),
    );
  }
  await touchMethodUsage('email', email);
  const response = NextResponse.json(ok({ userId: identity.userId, method: 'email' }));
  const { mergedGuest } = await establishSession(response, req, identity.userId, 'email');
  console.info(`[auth] email login user=${identity.userId} mergedGuest=${mergedGuest}`);
  return authNoStore(response);
}
