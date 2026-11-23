/**
 * HANASO — SMS login infrastructure stub (M1 · AUTH-ACCOUNTS — mission §۱-ب).
 *
 * FULLY BUILT, DELIBERATELY INERT (owner rule: «هیچ پیامک یا ورود آزمایشی
 * جعلی ارسال نشود»):
 *  - the DB model is otp_codes(channel='sms') + the rate buckets exist;
 *  - this service has the exact production shape (normalizePhone → send →
 *    verify) but `smsTransportInfo()` is permanently 'disabled' — the send
 *    path refuses before generating any code;
 *  - the route /api/auth/sms/request answers 503 «به‌زودی» and the login UI
 *    renders the method as a disabled chip.
 * When the owner provides the SMS gateway credentials, this file gains the
 * transport (env-gated exactly like email) and NOTHING else changes.
 */
import { sendEmail } from './email';
import type { SendResult } from './email-otp';

/** The future env names, documented now (ops readiness — none are read yet): */
export const SMS_ENV_VARIABLES = ['SMS_TRANSPORT', 'SMS_API_KEY', 'SMS_SENDER_NUMBER'] as const;

/** Always disabled in this mission — the single activation gate. */
export function smsTransportInfo(): { configured: false; missing: typeof SMS_ENV_VARIABLES } {
  return { configured: false, missing: SMS_ENV_VARIABLES };
}

/** E.164-ish normalization for future phone inputs — pure, tested now. */
export function normalizePhone(raw: string): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 20) return null;
  const digits = raw.replace(/[\s\-()]/g, '');
  if (digits.startsWith('+')) {
    if (/^\+\d{8,15}$/.test(digits)) return digits;
    return null;
  }
  if (/^\d{8,15}$/.test(digits)) return `+${digits}`;
  return null;
}

/**
 * The future send seam — implemented against the email transport contract
 * TODAY so the activation is a transport swap only. Refuses (never sends,
 * never returns fake success) while the gateway is unconfigured.
 */
export async function sendSmsCode(input: {
  destination: string;
  code: string;
  purpose: 'login' | 'link';
}): Promise<SendResult> {
  void input;
  void sendEmail;
  return { ok: false, reason: 'transport_not_configured' };
}
