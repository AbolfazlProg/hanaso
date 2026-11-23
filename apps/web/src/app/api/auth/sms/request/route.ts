/**
 * HANASO — POST /api/auth/sms/request (M1 · AUTH-ACCOUNTS — mission §۱-ب).
 *
 * The SMS infrastructure EXISTS (model, service, rate buckets — see
 * modules/auth/sms.ts) but is deliberately INERT: this route always answers
 * 503 with the honest «به‌زودی» message. No code is generated, no row is
 * written, no fake send ever happens — the owner rule: «هیچ پیامک یا ورود
 * آزمایشی جعلی ارسال نشود». Activation later = providing the gateway
 * credentials + removing this single gate.
 */
import { NextResponse } from 'next/server';
import { authNoStore } from '@/lib/auth/api';
import { fail } from '@/modules/shared';

export const dynamic = 'force-dynamic';

export async function POST() {
  // INERT until the owner provides the SMS gateway credentials — the shape is
  // production-ready for the activation day (service + rate buckets exist).
  return authNoStore(
    NextResponse.json(
      fail({
        code: 'auth/sms_not_available',
        message: 'ورود با پیامک به‌زودی فعال می‌شود — تا آن زمان از روش‌های فعال ورود استفاده کن.',
      }),
      { status: 503 },
    ),
  );
}
