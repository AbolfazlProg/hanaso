/**
 * HANASO — POST /api/auth/register (M2 · AUTH-PASSWORD — the primary signup).
 *
 * username + password (+ optional email as a recovery contact). The account
 * is created ACTIVE with the password credential and the session is issued
 * immediately (a username needs no external verification). The optional
 * email is stored untrusted; its OTP (purpose='link') activates it as a
 * recovery method — sent right here when the transport is configured.
 *
 * Honesty rules (owner): when the email transport is NOT configured and an
 * email was supplied, the route answers 503 — we refuse to store an address
 * we could never verify (no fake «we'll verify later» success).
 *
 * Rate limits: 3 signups/hour per guest browser (the M1 wizard bucket).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, establishSession, sameOriginOk } from '@/lib/auth/api';
import { resolveLearnerIdFromRequest } from '@/lib/learner/server';
import { emailTransportInfo, otpEmailBody, sendEmail } from '@/modules/auth/email';
import { issueOtp, OTP_TTL_MS } from '@/modules/auth/email-otp';
import { hashSecret } from '@/modules/auth/credentials';
import { registerWithPassword } from '@/modules/auth/register';
import { validatePassword, validateUsername } from '@/modules/auth/password-policy';
import { RATE_BUCKETS, recordRateEvent, tooManyEvents } from '@/modules/auth/rate-limit';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const registerSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1).max(200),
  email: z.string().email().max(254).optional(),
});

const USERNAME_MESSAGES: Record<string, string> = {
  empty: 'نام کاربری را بنویس.',
  too_short: 'نام کاربری باید دست‌کم ۳ نویسه باشد.',
  too_long: 'نام کاربری حداکثر ۳۰ نویسه می‌تواند باشد.',
  malformed: 'نام کاربری فقط می‌تواند از حروف انگلیسی، رقم و ـ (خط زیر) ساخته شود.',
  bad_shape: 'نام کاربری نباید با ـ شروع یا تمام شود و ــ پشت‌سرهم هم مجاز نیست.',
  reserved: 'این نام کاربری رزرو شده است — یکی دیگر انتخاب کن.',
};

const PASSWORD_MESSAGES: Record<string, string> = {
  empty: 'رمز عبور را بنویس.',
  too_short: 'رمز عبور باید دست‌کم ۸ نویسه باشد.',
  too_long: 'رمز عبور حداکثر ۱۲۸ نویسه می‌تواند باشد.',
  too_common: 'این رمز خیلی رایج است — یکی نامعمول‌تر انتخاب کن.',
  contains_identifier: 'رمز عبور نباید نام کاربری یا ایمیلت را در خود داشته باشد.',
  too_weak: 'رمز قوی‌تر انتخاب کن: ۱۲ نویسه یا بیشتر، یا ترکیبی از حروف بزرگ/کوچک، رقم و نماد.',
};

export async function POST(req: Request) {
  if (!sameOriginOk(req)) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/csrf', message: 'درخواست از مبدا غیرمجاز رد شد.' }), { status: 403 }),
    );
  }
  const guestId = await resolveLearnerIdFromRequest(req);
  const guestBucket = `${RATE_BUCKETS.signupGuest}:${guestId}`;
  if (await tooManyEvents(guestBucket, 60 * 60 * 1000, 3)) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/rate_limited',
          message: 'ثبت‌نام‌های این مرورگر بیش از حد مجاز است — یک ساعت دیگر تلاش کن.',
        }),
        { status: 429 },
      ),
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
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/validation_failed', message: 'ورودی‌ها خوانا نیستند.' }), { status: 400 }),
    );
  }
  const { username, password, email } = parsed.data;

  const usernameCheck = validateUsername(username);
  if (!usernameCheck.ok) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/username_invalid',
          message: USERNAME_MESSAGES[usernameCheck.reason] ?? USERNAME_MESSAGES.malformed!,
        }),
        {
          status: 400,
        },
      ),
    );
  }
  const passwordCheck = validatePassword(password, { username: usernameCheck.username, email });
  if (!passwordCheck.ok) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/password_invalid',
          message: PASSWORD_MESSAGES[passwordCheck.reason] ?? PASSWORD_MESSAGES.too_weak!,
        }),
        {
          status: 400,
        },
      ),
    );
  }

  // the honest email gate — BEFORE any row is written
  const wantsEmail = Boolean(email);
  if (wantsEmail && !emailTransportInfo().configured) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/email_not_configured',
          message:
            'تأیید ایمیل هنوز فعال نشده است — فعلاً بدون ایمیل ثبت‌نام کن؛ بعداً از تنظیمات امنیتی می‌توانی ایمیلت را وصل کنی.',
        }),
        { status: 503 },
      ),
    );
  }

  await recordRateEvent(guestBucket);
  const created = await registerWithPassword({
    username: usernameCheck.username,
    password,
    email: email ?? null,
    hashPassword: hashSecret,
  });
  if (!created.ok) {
    const message =
      created.reason === 'username_taken'
        ? 'این نام کاربری قبلاً گرفته شده — یکی دیگر انتخاب کن.'
        : 'این ایمیل به حساب دیگری متصل است — با همان حساب وارد شو.';
    return authNoStore(NextResponse.json(fail({ code: `auth/${created.reason}`, message }), { status: 409 }));
  }

  // the optional recovery email — OTP out of the gate (best-effort; the
  // settings page can always resend)
  let emailVerification: 'sent' | 'failed' | 'skipped' = 'skipped';
  if (wantsEmail && email) {
    const { code } = await issueOtp({
      channel: 'email',
      destination: email.toLowerCase(),
      purpose: 'link',
      userId: created.result.userId,
    });
    const { subject, text, html } = otpEmailBody(code, 'link', Math.round(OTP_TTL_MS / 60_000));
    const sent = await sendEmail({ to: email, subject, text, html });
    emailVerification = sent.ok ? 'sent' : 'failed';
  }

  const response = NextResponse.json(
    ok({ userId: created.result.userId, username: created.result.username, emailVerification }),
    { status: 201 },
  );
  const { mergedGuest } = await establishSession(response, req, created.result.userId, 'password');
  console.info(
    `[auth] password register user=${created.result.userId} username=${created.result.username} email=${emailVerification} mergedGuest=${mergedGuest}`,
  );
  return authNoStore(response);
}
