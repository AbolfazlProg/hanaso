/**
 * HANASO — POST /api/auth/mnemonic/phrase (M1 · AUTH-ACCOUNTS).
 *
 * Re-display of the sealed phrase while the wizard window is open (the honest
 * second look — a user mid-quiz may want to re-read before answering). Bound
 * to the signup browser's guest cookie; the id alone is useless elsewhere.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, sameOriginOk } from '@/lib/auth/api';
import { GUEST_LEARNER_ID, resolveLearnerIdFromRequest } from '@/lib/learner/server';
import { refetchPhrase } from '@/modules/auth/mnemonic-signup';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

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
  const registrationId = z
    .string()
    .uuid()
    .safeParse((body as { registrationId?: unknown })?.registrationId);
  if (!registrationId.success) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/validation_failed', message: 'شناسهٔ فرایند نامعتبر است.' }), {
        status: 400,
      }),
    );
  }
  const guestId = await resolveLearnerIdFromRequest(req);
  if (guestId === GUEST_LEARNER_ID) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/wizard_bound', message: 'این فرایند ثبت‌نام متعلق به این مرورگر نیست.' }), {
        status: 403,
      }),
    );
  }
  const words = await refetchPhrase(registrationId.data, guestId);
  if (!words) {
    return authNoStore(
      NextResponse.json(
        fail({ code: 'auth/wizard_expired', message: 'فرصت نمایش عبارت تمام شده — دوباره از اول شروع کن.' }),
        { status: 410 },
      ),
    );
  }
  return authNoStore(NextResponse.json(ok({ words })));
}
