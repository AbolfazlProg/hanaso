/**
 * HANASO — POST /api/auth/email/request (M1 · AUTH-ACCOUNTS — mission §۱-ج).
 *
 * Issues the 6-digit one-time code for email login (anonymous) or email
 * linking (authenticated). HONEST ACTIVATION (owner rule — no fake login):
 * when the email transport is not configured (missing env credentials), the
 * route answers 503 and NOTHING happens — no code, no row, no success
 * message. When configured, the code is scrypt-hashed into otp_codes with a
 * 10-minute TTL, single active code per destination.
 *
 * Rate limits: 1 send/minute + 5/hour per destination; 10/hour per IP.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, clientContext, sameOriginOk } from '@/lib/auth/api';
import { resolveAccountFromRequest } from '@/lib/auth/server';
import { emailTransportInfo, otpEmailBody, sendEmail } from '@/modules/auth/email';
import { issueOtp, retireOtp, OTP_TTL_MS } from '@/modules/auth/email-otp';
import { RATE_BUCKETS, recordRateEvent, tooManyEvents } from '@/modules/auth/rate-limit';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  email: z.string().email().max(254),
  purpose: z.literal('link').optional(),
});

const UNCONFIGURED =
  'ورود با ایمیل هنوز فعال نشده است — سرویس ارسال ایمیل در حال آماده‌سازی است و به‌زودی فعال می‌شود. تا آن زمان از روش‌های فعال استفاده کن.';

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
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/validation_failed', message: 'نشانی ایمیل معتبر نیست.' }), { status: 400 }),
    );
  }
  const email = parsed.data.email.toLowerCase();
  const account = await resolveAccountFromRequest(req);
  if (!account) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/no_session',
          message:
            'کد ایمیل فقط برای تأیید اتصال صادر می‌شود — برای ورود، از فرم نام کاربری و رمز عبور استفاده کن؛ رمزت را فراموش کرده‌ای از «بازیابی رمز عبور» ادامه بده.',
        }),
        { status: 401 },
      ),
    );
  }
  const purpose = 'link';

  // The honest activation gate — before ANY code is generated.
  const transport = emailTransportInfo();
  if (!transport.configured) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/email_not_configured', message: UNCONFIGURED }), { status: 503 }),
    );
  }

  const { ipPrefix } = clientContext(req);
  const destBucket = `${RATE_BUCKETS.otpSendDestination}:${email}`;
  const ipBucket = `${RATE_BUCKETS.otpSendIp}:${ipPrefix ?? 'unknown'}`;
  if ((await tooManyEvents(destBucket, 60 * 1000, 1)) || (await tooManyEvents(destBucket, 60 * 60 * 1000, 5))) {
    return authNoStore(
      NextResponse.json(
        fail({ code: 'auth/rate_limited', message: 'درخواست کد بیش از حد مجاز است — کمی صبر کن و دوباره تلاش کن.' }),
        { status: 429 },
      ),
    );
  }
  if (await tooManyEvents(ipBucket, 60 * 60 * 1000, 10)) {
    return authNoStore(
      NextResponse.json(
        fail({ code: 'auth/rate_limited', message: 'درخواست‌های این نشست بیش از حد مجاز است — یک ساعت دیگر تلاش کن.' }),
        { status: 429 },
      ),
    );
  }
  await recordRateEvent(destBucket);
  await recordRateEvent(ipBucket);

  const { id: otpId, code } = await issueOtp({
    channel: 'email',
    destination: email,
    purpose,
    userId: account?.userId ?? null,
  });
  const { subject, text, html } = otpEmailBody(code, purpose, Math.round(OTP_TTL_MS / 60_000));
  const sent = await sendEmail({ to: email, subject, text, html });
  if (!sent.ok) {
    // nothing arrived — retire the row so no usable orphan code exists
    await retireOtp(otpId);
    return authNoStore(
      NextResponse.json(
        fail({ code: 'auth/email_send_failed', message: 'ارسال ایمیل موفق نشد — کمی بعد دوباره تلاش کن.' }),
        { status: 502 },
      ),
    );
  }
  return authNoStore(
    NextResponse.json(ok({ sentTo: email, purpose, expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString() }), {
      status: 202,
    }),
  );
}
