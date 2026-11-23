/**
 * HANASO — POST /api/auth/mnemonic/enroll (M1 · AUTH-ACCOUNTS — mission §۲).
 *
 * The logged-in user activates the recovery-phrase anchor (suggested, never
 * mandatory): starts the same generate→show→quiz wizard, but the verified
 * phrase attaches to the CURRENT account instead of creating a new one.
 * Guarded by a live session + same-origin POST.
 */
import { NextResponse } from 'next/server';
import { authNoStore, sameOriginOk } from '@/lib/auth/api';
import { resolveAccountFromRequest } from '@/lib/auth/server';
import { GUEST_LEARNER_ID, resolveLearnerIdFromRequest } from '@/lib/learner/server';
import { RATE_BUCKETS, recordRateEvent, tooManyEvents } from '@/modules/auth/rate-limit';
import { startWizard } from '@/modules/auth/mnemonic-signup';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameOriginOk(req)) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/csrf', message: 'درخواست از مبدا غیرمجاز رد شد.' }), { status: 403 }),
    );
  }
  const account = await resolveAccountFromRequest(req);
  if (!account) {
    return authNoStore(
      NextResponse.json(
        fail({ code: 'auth/no_session', message: 'برای فعال‌سازی عبارت بازیابی باید وارد حساب خودت باشی.' }),
        { status: 401 },
      ),
    );
  }
  const guestId = await resolveLearnerIdFromRequest(req);
  if (guestId === GUEST_LEARNER_ID) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/no_browser_identity',
          message: 'مرورگر باید کوکی هویت را پذیرفته باشد — کوکی‌ها را فعال کن و دوباره تلاش کن.',
        }),
        { status: 400 },
      ),
    );
  }
  const bucket = `${RATE_BUCKETS.signupGuest}:${guestId}`;
  if (await tooManyEvents(bucket, 60 * 60 * 1000, 3)) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/rate_limited',
          message: 'درخواست‌های فعال‌سازی بیش از حد مجاز است — یک ساعت دیگر تلاش کن.',
        }),
        { status: 429 },
      ),
    );
  }
  await recordRateEvent(bucket);
  const wizard = await startWizard({ guestLearnerId: guestId, purpose: 'enroll', userId: account.userId });
  return authNoStore(NextResponse.json(ok({ ...wizard, purpose: 'enroll' }), { status: 201 }));
}
