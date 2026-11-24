/**
 * HANASO — POST /api/auth/account/username (M2 · AUTH-PASSWORD — session-authed).
 *
 * Set the login handle for an account that has none (google-created or
 * legacy-phrase accounts — the «phrase users can set a username» rule). One
 * shot: once set, the handle is identity — a CHANGE would move a login
 * credential, so it stays put (the future profile page owns display names).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, sameOriginOk } from '@/lib/auth/api';
import { resolveAccountFromRequest } from '@/lib/auth/server';
import { setUsername } from '@/modules/auth/password';
import { validateUsername } from '@/modules/auth/password-policy';
import { RATE_BUCKETS, tooManyEvents, recordRateEvent } from '@/modules/auth/rate-limit';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const usernameSchema = z.object({ username: z.string().min(1).max(64) });

const USERNAME_MESSAGES: Record<string, string> = {
  empty: 'نام کاربری را بنویس.',
  too_short: 'نام کاربری باید دست‌کم ۳ نویسه باشد.',
  too_long: 'نام کاربری حداکثر ۳۰ نویسه می‌تواند باشد.',
  malformed: 'نام کاربری فقط می‌تواند از حروف انگلیسی، رقم و ـ (خط زیر) ساخته شود.',
  bad_shape: 'نام کاربری نباید با ـ شروع یا تمام شود و ــ پشت‌سرهم هم مجاز نیست.',
  reserved: 'این نام کاربری رزرو شده است — یکی دیگر انتخاب کن.',
};

export async function POST(req: Request) {
  if (!sameOriginOk(req)) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/csrf', message: 'درخواست از مبدا غیرمجاز رد شد.' }), { status: 403 }),
    );
  }
  const account = await resolveAccountFromRequest(req);
  if (!account) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/no_session', message: 'برای این کار باید وارد حساب‌ات شده باشی.' }), {
        status: 401,
      }),
    );
  }
  const bucket = `${RATE_BUCKETS.usernameSet}:${account.userId}`;
  if (await tooManyEvents(bucket, 60 * 60 * 1000, 5)) {
    return authNoStore(
      NextResponse.json(
        fail({ code: 'auth/rate_limited', message: 'تلاش‌های این کار بیش از حد مجاز است — یک ساعت دیگر تلاش کن.' }),
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
  const parsed = usernameSchema.safeParse(body);
  if (!parsed.success) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/validation_failed', message: 'نام کاربری را بنویس.' }), { status: 400 }),
    );
  }
  const check = validateUsername(parsed.data.username);
  if (!check.ok) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/username_invalid',
          message: USERNAME_MESSAGES[check.reason] ?? USERNAME_MESSAGES.malformed!,
        }),
        {
          status: 400,
        },
      ),
    );
  }
  await recordRateEvent(bucket);
  const result = await setUsername(account.userId, check.username);
  if (!result.ok) {
    const message =
      result.reason === 'taken'
        ? 'این نام کاربری قبلاً گرفته شده — یکی دیگر انتخاب کن.'
        : 'برای حساب‌ات قبلاً نام کاربری ثبت شده است.';
    return authNoStore(NextResponse.json(fail({ code: `auth/${result.reason}`, message }), { status: 409 }));
  }
  console.info(`[auth] username set user=${account.userId} username=${check.username}`);
  return authNoStore(NextResponse.json(ok({ username: check.username })));
}
