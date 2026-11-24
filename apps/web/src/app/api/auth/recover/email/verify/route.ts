/**
 * HANASO — POST /api/auth/recover/email/verify (M2 · AUTH-PASSWORD — door ۲).
 *
 * The OTP + the NEW password in one step: verify the 6-digit code against
 * the account's verified email → set the new password → revoke EVERY session
 * (theft response) → issue the fresh post-reset session.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, establishSession, sameOriginOk } from '@/lib/auth/api';
import { verifyOtp } from '@/modules/auth/email-otp';
import { completeEmailReset, findUserIdByVerifiedEmail } from '@/modules/auth/recover';
import { validatePassword } from '@/modules/auth/password-policy';
import { RATE_BUCKETS, recordRateEvent, tooManyEvents } from '@/modules/auth/rate-limit';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const verifySchema = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  if (!sameOriginOk(req)) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/csrf', message: 'درخواست از مبدا غیرمجاز رد شد.' }), { status: 403 }),
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
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/validation_failed', message: 'کد و رمز جدید را کامل بنویس.' }), {
        status: 400,
      }),
    );
  }
  const email = parsed.data.email.toLowerCase();
  const passwordCheck = validatePassword(parsed.data.newPassword, { email });
  if (!passwordCheck.ok) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/password_invalid',
          message:
            passwordCheck.reason === 'too_short'
              ? 'رمز عبور جدید باید دست‌کم ۸ نویسه باشد.'
              : passwordCheck.reason === 'too_common'
                ? 'این رمز خیلی رایج است — یکی نامعمول‌تر انتخاب کن.'
                : 'رمز عبور جدید قوی نیست — ۱۲ نویسه یا بیشتر، یا ترکیب حروف بزرگ/کوچک، رقم و نماد.',
        }),
        { status: 400 },
      ),
    );
  }

  const failBucket = `${RATE_BUCKETS.otpVerifyDestination}:${email}`;
  if (await tooManyEvents(failBucket, 60 * 60 * 1000, 10)) {
    return authNoStore(
      NextResponse.json(
        fail({ code: 'auth/rate_limited', message: 'تلاش‌های تأیید بیش از حد مجاز است — یک ساعت دیگر تلاش کن.' }),
        { status: 429 },
      ),
    );
  }

  const verified = await verifyOtp({
    channel: 'email',
    destination: email,
    purpose: 'password_reset',
    code: parsed.data.code,
  });
  if (verified.outcome !== 'ok') {
    await recordRateEvent(failBucket);
    const message =
      verified.outcome === 'expired'
        ? 'کد منقضی شده است — کد تازه بگیر.'
        : verified.outcome === 'too_many_attempts'
          ? 'تلاش‌های ناموفق زیاد است — کد تازه بگیر.'
          : 'کد درست نیست — دوباره بررسی کن.';
    return authNoStore(NextResponse.json(fail({ code: 'auth/otp_rejected', message }), { status: 401 }));
  }
  const userId = await findUserIdByVerifiedEmail(email);
  if (!userId) {
    // the code verified but the email identity vanished mid-flight — honest refuse
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/account_not_found', message: 'حسابی با این ایمیل پیدا نشد.' }), {
        status: 404,
      }),
    );
  }

  await completeEmailReset(userId, parsed.data.newPassword);
  const response = NextResponse.json(ok({ userId, method: 'password', allSessionsRevoked: true }));
  const { mergedGuest } = await establishSession(response, req, userId, 'password');
  console.info(`[auth] password reset via email-otp user=${userId} mergedGuest=${mergedGuest}`);
  return authNoStore(response);
}
