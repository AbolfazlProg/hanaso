/**
 * HANASO — POST /api/auth/mnemonic/prepare (M1 · AUTH-ACCOUNTS — mission §۱-الف).
 *
 * Starts the signup wizard: generates a fresh BIP39 phrase (crypto-random,
 * checksum-correct), seals it into a 15-minute pending registration bound to
 * THIS browser's guest cookie, and returns the words + the 3 quiz positions.
 * The account itself is created ONLY after the quiz passes (verify route) —
 * «بدون تأیید موفق، حساب فعال نشود».
 *
 * Guards: same-origin POST; ≤3 wizards/hour per guest browser; the returned
 * registrationId is worthless without this browser's signed guest cookie.
 */
import { NextResponse } from 'next/server';
import { authNoStore, sameOriginOk } from '@/lib/auth/api';
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
  const guestId = await resolveLearnerIdFromRequest(req);
  if (guestId === GUEST_LEARNER_ID) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/no_browser_identity',
          message:
            'برای ساخت حساب، مرورگر باید کوکی هویت را پذیرفته باشد — کوکی‌ها را فعال کن و صفحه را دوباره باز کن.',
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
          message: 'درخواست‌های ساخت حساب بیش از حد مجاز است — یک ساعت دیگر تلاش کن.',
        }),
        { status: 429 },
      ),
    );
  }
  await recordRateEvent(bucket);

  const wizard = await startWizard({ guestLearnerId: guestId, purpose: 'signup' });
  return authNoStore(NextResponse.json(ok(wizard), { status: 201 }));
}
