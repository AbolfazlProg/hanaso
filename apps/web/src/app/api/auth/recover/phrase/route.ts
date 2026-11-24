/**
 * HANASO — POST /api/auth/recover/phrase (M2 · AUTH-PASSWORD — recovery door ۱).
 *
 * «عبارت بازیابی» — the 12-word BIP39 phrase as a PASSWORD RECOVERY method
 * (the M1 daily login tab is retired; the phrase now proves ownership to set
 * a NEW password). Flow: normalize → lookup key → scrypt possession proof →
 * set the new password → REVOKE EVERY session (theft response) → issue the
 * fresh post-reset session.
 *
 * Brute-force hardening: 5 failed attempts per phrase / 15 min (the M1
 * bucket), 40 attempts/hour per IP.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, clientContext, establishSession, sameOriginOk } from '@/lib/auth/api';
import { normalizeMnemonicInput, redactPhrase } from '@/modules/auth/mnemonic';
import { deriveLookupKey } from '@/modules/auth/credentials';
import { resetPasswordWithPhrase } from '@/modules/auth/recover';
import { validatePassword } from '@/modules/auth/password-policy';
import { RATE_BUCKETS, recordRateEvent, tooManyEvents } from '@/modules/auth/rate-limit';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const recoverSchema = z.object({
  phrase: z.string().min(1).max(600),
  newPassword: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  if (!sameOriginOk(req)) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/csrf', message: 'درخواست از مبدا غیرمجاز رد شد.' }), { status: 403 }),
    );
  }
  const { ipPrefix } = clientContext(req);
  const ipBucket = `${RATE_BUCKETS.loginIp}:${ipPrefix ?? 'unknown'}`;
  if (await tooManyEvents(ipBucket, 60 * 60 * 1000, 40)) {
    return authNoStore(
      NextResponse.json(
        fail({ code: 'auth/rate_limited', message: 'تلاش‌ها بیش از حد مجاز است — یک ساعت دیگر تلاش کن.' }),
        { status: 429 },
      ),
    );
  }
  await recordRateEvent(ipBucket);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/invalid_json', message: 'body must be JSON' }), { status: 400 }),
    );
  }
  const parsed = recoverSchema.safeParse(body);
  if (!parsed.success) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/validation_failed', message: 'ورودی‌ها خوانا نیستند.' }), { status: 400 }),
    );
  }
  const phrase = normalizeMnemonicInput(parsed.data.phrase);
  if (!phrase) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/phrase_malformed',
          message: 'عبارت باید ۱۲ کلمهٔ دقیق فهرست باشد — بررسی کن که همهٔ کلمات کامل نوشته شده باشند.',
        }),
        { status: 400 },
      ),
    );
  }
  const passwordCheck = validatePassword(parsed.data.newPassword);
  if (!passwordCheck.ok) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/password_invalid',
          message:
            passwordCheck.reason === 'too_short'
              ? 'رمز عبور جدید باید دست‌کم ۸ نویسه باشد.'
              : 'رمز عبور جدید قوی نیست — ۱۲ نویسه یا بیشتر، یا ترکیب حروف بزرگ/کوچک، رقم و نماد.',
        }),
        { status: 400 },
      ),
    );
  }

  const failBucket = `${RATE_BUCKETS.phraseLoginFail}:${deriveLookupKey(phrase)}`;
  if (await tooManyEvents(failBucket, 15 * 60 * 1000, 5)) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/locked',
          message: 'به‌دلیل تلاش‌های ناموفق، این مسیر بازیابی موقتاً قفل شده — ۱۵ دقیقه بعد دوباره تلاش کن.',
        }),
        { status: 429 },
      ),
    );
  }

  const reset = await resetPasswordWithPhrase(phrase, parsed.data.newPassword);
  if (!reset) {
    await recordRateEvent(failBucket);
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/phrase_rejected', message: 'عبارت واردشده با هیچ حسابی مطابقت ندارد.' }), {
        status: 401,
      }),
    );
  }

  const response = NextResponse.json(ok({ userId: reset.userId, method: 'password', allSessionsRevoked: true }));
  const { mergedGuest } = await establishSession(response, req, reset.userId, 'password');
  console.info(
    `[auth] password reset via phrase user=${reset.userId} phrase=${redactPhrase(phrase)} mergedGuest=${mergedGuest}`,
  );
  return authNoStore(response);
}
