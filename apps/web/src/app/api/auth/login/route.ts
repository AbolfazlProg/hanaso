/**
 * HANASO — POST /api/auth/login (M2 · AUTH-PASSWORD — THE primary login).
 *
 * One identifier field (username OR verified email) + the password.
 * Brute-force hardening (mission §۴ carried over):
 *  - 5 failed attempts per identifier / 15 min → 15-minute lockout;
 *  - 40 attempts/hour per IP prefix;
 *  - ONE generic error for unknown identifier / no password / wrong password
 *    (which check failed is never leaked).
 *  - a passwordless account (google-created / legacy phrase) gets an honest
 *    redirect hint instead of a dead-end — that account EXISTS, the user
 *    just needs the right door (google button / recovery page).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, clientContext, establishSession, sameOriginOk } from '@/lib/auth/api';
import { findLoginCandidate, loginWithPassword, parseLoginIdentifier } from '@/modules/auth/login';
import { touchPasswordUsage } from '@/modules/auth/password';
import { RATE_BUCKETS, recordRateEvent, tooManyEvents } from '@/modules/auth/rate-limit';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  identifier: z.string().min(1).max(254),
  password: z.string().min(1).max(200),
});

const GENERIC_INVALID = 'نام کاربری/ایمیل یا رمز عبور درست نیست.';

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
        fail({ code: 'auth/rate_limited', message: 'تلاش‌های ورود بیش از حد مجاز است — یک ساعت دیگر تلاش کن.' }),
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
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/validation_failed', message: GENERIC_INVALID }), { status: 400 }),
    );
  }
  const identifier = parseLoginIdentifier(parsed.data.identifier);
  if (!identifier) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/invalid_identifier', message: GENERIC_INVALID }), { status: 400 }),
    );
  }

  const failBucket = `${RATE_BUCKETS.passwordLoginFail}:${identifier.value}`;
  if (await tooManyEvents(failBucket, 15 * 60 * 1000, 5)) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/locked',
          message: 'به‌دلیل تلاش‌های ناموفق، این مسیر ورود موقتاً قفل شده — ۱۵ دقیقه بعد دوباره تلاش کن.',
        }),
        { status: 429 },
      ),
    );
  }

  const candidate = await findLoginCandidate(identifier);
  if (!candidate) {
    await recordRateEvent(failBucket);
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/invalid_credentials', message: GENERIC_INVALID }), { status: 401 }),
    );
  }
  const outcome = await loginWithPassword(candidate, parsed.data.password);
  if (outcome.kind === 'passwordless') {
    // honest door-sign, not an enumeration leak: this account cannot have a
    // password at all (google/phrase born) — the generic error would be a
    // dead-end for a real user who forgot WHICH door they used.
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/password_not_set',
          message:
            'برای این حساب هنوز رمز عبوری ثبت نشده — اگر حساب‌ات را با گوگل ساختی با دکمهٔ «ورود با گوگل» وارد شو، وگرنه از «بازیابی رمز عبور» ادامه بده.',
        }),
        { status: 409 },
      ),
    );
  }
  if (outcome.kind === 'invalid') {
    await recordRateEvent(failBucket);
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/invalid_credentials', message: GENERIC_INVALID }), { status: 401 }),
    );
  }

  await touchPasswordUsage(outcome.userId);
  const response = NextResponse.json(ok({ userId: outcome.userId, method: 'password' }));
  const { mergedGuest } = await establishSession(response, req, outcome.userId, 'password');
  console.info(`[auth] password login user=${outcome.userId} identifier=${identifier.kind} mergedGuest=${mergedGuest}`);
  return authNoStore(response);
}
