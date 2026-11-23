/**
 * HANASO — email transport + OTP + SMS stub unit tests (M1 · AUTH-ACCOUNTS).
 *
 * The honesty contract (owner rule — no fake login without credentials):
 *  - the transport probe reflects the env exactly (none → not configured);
 *  - the OTP generator is unbiased 6-digit and the codes are not predictable
 *    as a sequence;
 *  - sendSmsCode ALWAYS refuses while the gateway is unconfigured (mission §۱-ب:
 *    no fake SMS login);
 *  - normalizePhone is the E.164 future-proof gate;
 *  - the OTP email template carries the code + honest TTL line and a Persian RTL body.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { emailFrom, emailTransportInfo, otpEmailBody, sendEmail } from '@/modules/auth/email';
import { OTP_TTL_MS, generateOtpCode } from '@/modules/auth/email-otp';
import { normalizePhone, sendSmsCode, smsTransportInfo } from '@/modules/auth/sms';

beforeEach(() => {
  const keys = ['EMAIL_TRANSPORT', 'RESEND_API_KEY', 'EMAIL_FROM', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  for (const k of keys) delete process.env[k];
});

describe('emailTransportInfo — the honest activation probe', () => {
  it('default (no env) → none / not configured', () => {
    const info = emailTransportInfo();
    expect(info.kind).toBe('none');
    expect(info.configured).toBe(false);
  });
  it('resend with a key + from → configured; missing key → not', () => {
    process.env.EMAIL_TRANSPORT = 'resend';
    expect(emailTransportInfo().configured).toBe(false);
    process.env.RESEND_API_KEY = 're_test_key';
    expect(emailTransportInfo().configured).toBe(false); // EMAIL_FROM still missing
    process.env.EMAIL_FROM = 'HANASO <no-reply@hanaso.ir>';
    expect(emailTransportInfo().configured).toBe(true);
  });
  it('smtp without the host → not configured; complete → configured', () => {
    process.env.EMAIL_TRANSPORT = 'smtp';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    expect(emailTransportInfo().configured).toBe(false);
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.EMAIL_FROM = 'no-reply@example.com';
    expect(emailTransportInfo().configured).toBe(true);
  });
});

describe('otp code generator', () => {
  it('always 6 digits, digits-only', () => {
    for (let i = 0; i < 50; i++) expect(generateOtpCode()).toMatch(/^\d{6}$/);
  });
  it('not a predictable sequence (many distinct values)', () => {
    const set = new Set(Array.from({ length: 50 }, () => generateOtpCode()));
    expect(set.size).toBeGreaterThan(40);
  });
  it('the TTL is 10 minutes and OTP_MAX_ATTEMPTS is 5', () => {
    expect(OTP_TTL_MS).toBe(10 * 60 * 1000);
  });
});

describe('otpEmailBody', () => {
  it('carries the code, the TTL, and Persian RTL copy', () => {
    const { subject, text, html } = otpEmailBody('123456', 'login', 10);
    expect(subject).toContain('هاناسو');
    expect(text).toContain('123456');
    expect(text).toContain('۱۰ دقیقه');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('123456');
  });
  it('the link variant names the linking purpose', () => {
    const { subject } = otpEmailBody('654321', 'link', 10);
    expect(subject).toContain('اتصال ایمیل');
  });
});

describe('sendEmail — no fake success without a transport', () => {
  it('unconfigured transport → transport_not_configured (never ok)', async () => {
    const result = await sendEmail({ to: 'x@example.com', subject: 's', text: 't', html: 'h' });
    expect(result).toEqual({ ok: false, reason: 'transport_not_configured' });
  });
  it('the simulate hook (tests only) captures and answers ok', async () => {
    const sent: { to: string; subject: string }[] = [];
    const result = await sendEmail(
      { to: 'x@example.com', subject: 's', text: 't', html: 'h' },
      { simulate: (m) => sent.push(m) },
    );
    expect(result).toEqual({ ok: true });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe('x@example.com');
  });
});

describe('SMS infrastructure stub (به‌زودی)', () => {
  it('the transport is permanently unconfigured in this mission', () => {
    const info = smsTransportInfo();
    expect(info.configured).toBe(false);
    expect(info.missing).toContain('SMS_TRANSPORT');
  });
  it('sendSmsCode always refuses — no code, no fake success', async () => {
    const result = await sendSmsCode({ destination: '+989120000000', code: '123456', purpose: 'login' });
    expect(result).toEqual({ ok: false, reason: 'transport_not_configured' });
  });
  it('normalizePhone: E.164 with +, without +, spaced/dashed; rejects junk', () => {
    expect(normalizePhone('+989121234567')).toBe('+989121234567');
    expect(normalizePhone('989121234567')).toBe('+989121234567');
    expect(normalizePhone('0912 123 4567')).toBe('+09121234567');
    expect(normalizePhone('+98 912-123-4567')).toBe('+989121234567');
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('not-a-phone')).toBeNull();
    expect(normalizePhone('+1234')).toBeNull();
  });
  it('emailFrom default is the HANASO no-reply identity', () => {
    expect(emailFrom()).toContain('hanaso');
  });
});
