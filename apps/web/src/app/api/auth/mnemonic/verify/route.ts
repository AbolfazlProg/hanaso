/**
 * HANASO — POST /api/auth/mnemonic/verify (M1 · AUTH-ACCOUNTS — mission §۱-الف).
 *
 * The signup gate: the user must prove they saved the phrase by picking the
 * right word at the wizard's 3 random positions. On success the account is
 * created, the session cookie is issued, and this browser's guest progress
 * rows migrate into the account (mission §۳). On failure the wizard stays
 * retryable inside its 15-minute window.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authNoStore, establishSession, sameOriginOk } from '@/lib/auth/api';
import { GUEST_LEARNER_ID, resolveLearnerIdFromRequest } from '@/lib/learner/server';
import { completeWizard } from '@/modules/auth/mnemonic-signup';
import { fail, ok } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const answerSchema = z.object({
  registrationId: z.string().uuid(),
  answers: z
    .array(z.object({ position: z.number().int().min(1).max(12), word: z.string().min(1).max(20) }))
    .min(3)
    .max(3),
});

const WRONG_QUIZ = 'کلمات انتخابی درست نیست — عبارت را دوباره از صفحهٔ نمایش آن بررسی کن و دوباره تلاش کن.';

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
  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) {
    return authNoStore(
      NextResponse.json(fail({ code: 'auth/validation_failed', message: 'پاسخ‌های تأیید شکل درستی ندارند.' }), {
        status: 400,
      }),
    );
  }
  const guestId = await resolveLearnerIdFromRequest(req);
  if (guestId === GUEST_LEARNER_ID) {
    return authNoStore(
      NextResponse.json(
        fail({
          code: 'auth/no_browser_identity',
          message: 'نشست ساخت حساب این مرورگر یافت نشد — از اول فرایند را شروع کن.',
        }),
        { status: 400 },
      ),
    );
  }
  const outcome = await completeWizard({
    registrationId: parsed.data.registrationId,
    guestLearnerId: guestId,
    answers: parsed.data.answers,
  });
  switch (outcome.kind) {
    case 'ok': {
      const response = NextResponse.json(
        ok({ userId: outcome.userId, newAccount: outcome.newAccount, method: 'mnemonic' }),
        { status: 201 },
      );
      const { mergedGuest } = await establishSession(response, req, outcome.userId, 'mnemonic');
      console.info(`[auth] mnemonic login established user=${outcome.userId} mergedGuest=${mergedGuest}`);
      return authNoStore(response);
    }
    case 'wrong':
      return authNoStore(NextResponse.json(fail({ code: 'auth/quiz_wrong', message: WRONG_QUIZ }), { status: 400 }));
    case 'expired':
    case 'not_found':
      return authNoStore(
        NextResponse.json(
          fail({ code: 'auth/wizard_expired', message: 'فرصت تأیید عبارت تمام شده — دوباره از اول شروع کن.' }),
          { status: 410 },
        ),
      );
    case 'bound':
      return authNoStore(
        NextResponse.json(
          fail({ code: 'auth/wizard_bound', message: 'این فرایند ثبت‌نام متعلق به این مرورگر نیست.' }),
          { status: 403 },
        ),
      );
    case 'phrase_seal':
    case 'already_enrolled':
    default:
      return authNoStore(
        NextResponse.json(
          fail({ code: 'auth/wizard_state', message: 'وضعیت فرایند نامعتبر است — دوباره از اول شروع کن.' }),
          { status: 400 },
        ),
      );
  }
}
