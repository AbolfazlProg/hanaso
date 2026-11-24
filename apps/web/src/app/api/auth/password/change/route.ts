/**
 * HANASO — POST /api/auth/password/change (M2 · AUTH-PASSWORD — session-authed).
 *
 * Two honest shapes, ONE route:
 *  - the account HAS a password → the CURRENT password is required (proof
 *    of possession; a stolen session alone cannot rotate the credential);
 *  - the account has NONE yet (google-created / legacy phrase) → the session
 *    itself is the proof (first-credential activation).
 * On success every OTHER session of the account is revoked (the current
 * device stays signed in); the fresh hash gets a fresh scrypt salt.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, sameOriginOk } from '@/lib/auth/api';
import { resolveAccountFromRequest, sessionTokenFromCookieHeader } from '@/lib/auth/server';
import { hasPassword, setPassword, verifyPassword, getUsername } from '@/modules/auth/password';
import { getUserById, resolveSession, revokeAllSessions, revokeOtherSessions } from '@/modules/auth/session';
import { validatePassword } from '@/modules/auth/password-policy';
import { RATE_BUCKETS, recordRateEvent, tooManyEvents } from '@/modules/auth/rate-limit';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const changeSchema = z.object({
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(1).max(200),
});

const PASSWORD_MESSAGES: Record<string, string> = {
  too_short: 'رمز عبور جدید باید دست‌کم ۸ نویسه باشد.',
  too_long: 'رمز عبور جدید حداکثر ۱۲۸ نویسه می‌تواند باشد.',
  too_common: 'این رمز خیلی رایج است — یکی نامعمول‌تر انتخاب کن.',
  contains_identifier: 'رمز عبور نباید نام کاربری یا ایمیلت را در خود داشته باشد.',
  too_weak: 'رمز عبور جدید قوی نیست — ۱۲ نویسه یا بیشتر، یا ترکیب حروف بزرگ/کوچک، رقم و نماد.',
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
  const bucket = `${RATE_BUCKETS.passwordChange}:${account.userId}`;
  if (await tooManyEvents(bucket, 60 * 60 * 1000, 5)) {
    return authNoStore(
      NextResponse.json(
        fail({ code: 'auth/rate_limited', message: 'تغییرهای رمز بیش از حد مجاز است — یک ساعت دیگر تلاش کن.' }),
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
  const parsed = changeSchema.safeParse(body);
  if (!parsed.success) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/validation_failed', message: 'رمز جدید را کامل بنویس.' }), { status: 400 }),
    );
  }
  const user = await getUserById(account.userId);
  const username = await getUsername(account.userId);
  const passwordCheck = validatePassword(parsed.data.newPassword, { username, email: user?.email ?? null });
  if (!passwordCheck.ok) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/password_invalid',
          message: PASSWORD_MESSAGES[passwordCheck.reason] ?? PASSWORD_MESSAGES.too_weak!,
        }),
        { status: 400 },
      ),
    );
  }

  const had = await hasPassword(account.userId);
  if (had) {
    const currentOk = await verifyPassword(account.userId, parsed.data.currentPassword ?? '');
    if (!currentOk) {
      await recordRateEvent(bucket);
      return authNoStore(
        NextResponse.json(fail({ code: 'auth/current_password_wrong', message: 'رمز عبور فعلی درست نیست.' }), {
          status: 401,
        }),
      );
    }
  }

  await setPassword(account.userId, parsed.data.newPassword);
  // every OTHER session dies; the current device stays signed in
  const token = sessionTokenFromCookieHeader(req.headers.get('cookie') ?? '');
  const current = token ? await resolveSession(token) : null;
  if (current && current.userId === account.userId) {
    await revokeOtherSessions(account.userId, current.sessionId);
  } else {
    await revokeAllSessions(account.userId);
  }
  console.info(`[auth] password ${had ? 'change' : 'set'} user=${account.userId} otherSessionsRevoked=true`);
  return authNoStore(NextResponse.json(ok({ changed: true, firstCredential: !had, otherSessionsRevoked: true })));
}
