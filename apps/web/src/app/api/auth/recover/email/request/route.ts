/**
 * HANASO — POST /api/auth/recover/email/request (M2 · AUTH-PASSWORD — door ۲).
 *
 * Password recovery via the account's VERIFIED email: the user gives their
 * username OR email; a 6-digit OTP (purpose='password_reset') goes to the
 * verified address on file.
 *
 * ANTI-ENUMERATION by design (mission §۴: no sensitive leakage): unknown
 * identifiers, accounts without a verified email — all answer the SAME 202
 * envelope («اگر حسابی با این شناسه باشد…») and nothing is sent. Only a real
 * verified-email account triggers a send. The transport-unconfigured state
 * stays honestly 503 (owner rule — never a fake «code sent»).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, clientContext, sameOriginOk } from '@/lib/auth/api';
import { emailTransportInfo, otpEmailBody, sendEmail } from '@/modules/auth/email';
import { OTP_TTL_MS } from '@/modules/auth/email-otp';
import { issuePasswordResetOtp } from '@/modules/auth/recover';
import { RATE_BUCKETS, recordRateEvent, tooManyEvents } from '@/modules/auth/rate-limit';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const requestSchema = z.object({ identifier: z.string().min(1).max(254) });

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
      NextResponse.json(fail({ code: 'auth/validation_failed', message: 'شناسه را بنویس.' }), { status: 400 }),
    );
  }
  const identifier = parsed.data.identifier.trim().toLowerCase();

  // the honest activation gate — BEFORE any code is generated
  if (!emailTransportInfo().configured) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/email_not_configured',
          message: 'بازیابی با ایمیل هنوز فعال نشده است — سرویس ارسال ایمیل در حال آماده‌سازی است.',
        }),
        { status: 503 },
      ),
    );
  }

  // destination-level throttles (protect the mailbox, not the secret)
  const { ipPrefix } = clientContext(req);
  const ipBucket = `${RATE_BUCKETS.otpSendIp}:${ipPrefix ?? 'unknown'}`;
  if (await tooManyEvents(ipBucket, 60 * 60 * 1000, 10)) {
    return authNoStore(
      NextResponse.json(
        fail({ code: 'auth/rate_limited', message: 'درخواست‌های این نشست بیش از حد مجاز است — یک ساعت دیگر تلاش کن.' }),
        { status: 429 },
      ),
    );
  }
  await recordRateEvent(ipBucket);

  const issued = await issuePasswordResetOtp(identifier);
  if (!issued) {
    // unknown identifier / no verified email — the SAME neutral envelope
    return authNoStore(NextResponse.json(ok({ sent: true }), { status: 202 }));
  }
  const destBucket = `${RATE_BUCKETS.otpSendDestination}:${issued.email}`;
  if ((await tooManyEvents(destBucket, 60 * 1000, 1)) || (await tooManyEvents(destBucket, 60 * 60 * 1000, 5))) {
    // throttled mailbox — still no leak (same envelope, no send)
    return authNoStore(NextResponse.json(ok({ sent: true }), { status: 202 }));
  }
  await recordRateEvent(destBucket);

  const { subject, text, html } = otpEmailBody(issued.code, 'password_reset', Math.round(OTP_TTL_MS / 60_000));
  const sent = await sendEmail({ to: issued.email, subject, text, html });
  if (!sent.ok) {
    // the account exists but the mail never left — say so honestly (the user
    // knows their own address; this leaks nothing an attacker can use)
    return authNoStore(
      NextResponse.json(
        fail({ code: 'auth/email_send_failed', message: 'ارسال ایمیل موفق نشد — کمی بعد دوباره تلاش کن.' }),
        { status: 502 },
      ),
    );
  }
  return authNoStore(
    NextResponse.json(ok({ sent: true, expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString() }), { status: 202 }),
  );
}
