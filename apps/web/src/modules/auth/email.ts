/**
 * HANASO — Email login/link transport (M1 · AUTH-ACCOUNTS — mission §۱-ج).
 *
 * Full infrastructure, honest activation state:
 *  - transport is chosen by env (`EMAIL_TRANSPORT=none|resend|smtp`) — none is
 *    the default and every login attempt then answers 503 with a clear
 *    Persian message: the method EXISTS but is not activated. No code is
 *    generated, no row is written, no fake success is ever returned (owner
 *    rule: without credentials there must be no fake login).
 *  - `resend` → pure HTTPS via fetch (zero deps): POST /v1/email with the
 *    API key from RESEND_API_KEY.
 *  - `smtp` → nodemailer (pure-JS) with SMTP_HOST/PORT/USER/PASS, TLS for
 *    465, STARTTLS for 587, from EMAIL_FROM.
 *  - The OTP itself lives in otp_codes hashed (scrypt) — see email-otp.ts.
 */
import type { SendResult } from './email-otp';

export type EmailTransportKind = 'none' | 'resend' | 'smtp';

export interface EmailTransportInfo {
  readonly kind: EmailTransportKind;
  readonly configured: boolean;
  readonly missing: string[];
}

/** Read the transport decision + the exact missing variables (for ops, never leaked to end users). */
export function emailTransportInfo(): EmailTransportInfo {
  const kind = (process.env.EMAIL_TRANSPORT ?? 'none') as EmailTransportKind;
  if (kind === 'resend') {
    const missing: string[] = [];
    if (!process.env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
    if (!process.env.EMAIL_FROM) missing.push('EMAIL_FROM');
    return { kind, configured: missing.length === 0, missing };
  }
  if (kind === 'smtp') {
    const missing: string[] = [];
    if (!process.env.SMTP_HOST) missing.push('SMTP_HOST');
    if (!process.env.SMTP_PORT) missing.push('SMTP_PORT');
    if (!process.env.SMTP_USER) missing.push('SMTP_USER');
    if (!process.env.SMTP_PASS) missing.push('SMTP_PASS');
    if (!process.env.EMAIL_FROM) missing.push('EMAIL_FROM');
    return { kind, configured: missing.length === 0, missing };
  }
  return { kind: 'none', configured: false, missing: ['EMAIL_TRANSPORT'] };
}

/** The sender identity (also the config probe — empty means misconfigured). */
export function emailFrom(): string {
  return process.env.EMAIL_FROM ?? 'HANASO <no-reply@hanaso.ir>';
}

/** The 6-digit code email (login + link + password recovery share the template, only the lead differs). */
export function otpEmailBody(
  code: string,
  purpose: 'login' | 'link' | 'password_reset',
  ttlMinutes: number,
): { subject: string; text: string; html: string } {
  const lead =
    purpose === 'login'
      ? 'کد ورود شما به هاناسو'
      : purpose === 'password_reset'
        ? 'کد بازیابی رمز عبور هاناسو'
        : 'کد تأیید اتصال ایمیل به حساب هاناسو';
  const ttlFa = new Intl.NumberFormat('fa-IR').format(ttlMinutes);
  const subject = `هاناسو — ${lead}`;
  const text = [
    `${lead}:`,
    '',
    `کد یک‌بارمصرف: ${code}`,
    '',
    `این کد ${ttlFa} دقیقه اعتبار دارد و فقط یک بار قابل استفاده است.`,
    'اگر خودتان این درخواست را نداده‌اید، این پیام را نادیده بگیرید؛ حساب شما امن است.',
  ].join('\n');
  const html = [
    '<div dir="rtl" lang="fa" style="font-family:Vazirmatn,Tahoma,sans-serif;max-width:480px;margin:0 auto;color:#1c2430">',
    `<h2 style="margin:0 0 12px">${lead}</h2>`,
    `<p style="font-size:28px;font-weight:800;letter-spacing:6px;direction:ltr;text-align:center;margin:16px 0">${code}</p>`,
    `<p style="font-size:14px">این کد ${ttlFa} دقیقه اعتبار دارد و فقط یک بار قابل استفاده است.</p>`,
    '<p style="font-size:12px;color:#5a6472">اگر خودتان این درخواست را نداده‌اید، این پیام را نادیده بگیرید؛ حساب شما امن است.</p>',
    '</div>',
  ].join('\n');
  return { subject, text, html };
}

/**
 * Send one email through the configured transport.
 * `simulate` (tests only) captures instead of sending — never available in production.
 */
export async function sendEmail(
  input: { to: string; subject: string; text: string; html: string },
  options: { simulate?: (m: { to: string; subject: string }) => void } = {},
): Promise<SendResult> {
  if (process.env.NODE_ENV === 'production' && options.simulate) {
    return { ok: false, reason: 'transport_not_configured' };
  }
  if (options.simulate) {
    options.simulate({ to: input.to, subject: input.subject });
    return { ok: true };
  }
  const info = emailTransportInfo();
  if (!info.configured) return { ok: false, reason: 'transport_not_configured' };
  try {
    if (info.kind === 'resend') {
      return await sendViaResend(input);
    }
    return await sendViaSmtp(input);
  } catch {
    // never leak provider internals to callers — ops reads the container log
    return { ok: false, reason: 'send_failed' };
  }
}

async function sendViaResend(input: { to: string; subject: string; text: string; html: string }): Promise<SendResult> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: emailFrom(),
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return { ok: false, reason: 'send_failed' };
  return { ok: true };
}

async function sendViaSmtp(input: { to: string; subject: string; text: string; html: string }): Promise<SendResult> {
  const port = Number(process.env.SMTP_PORT);
  const nodemailer = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: emailFrom(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return { ok: true };
}
