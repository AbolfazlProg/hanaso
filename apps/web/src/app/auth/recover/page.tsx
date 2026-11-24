/**
 * HANASO — /auth/recover (M2 · AUTH-PASSWORD — the four recovery doors).
 *
 * «رمزت را فراموش کردی؟» — the hub for the owner's revised model: the four
 * methods (phrase / email / google / sms) are the four ways to RECOVER the
 * password, not four daily logins:
 *  - عبارت بازیابی: the 12 words + a new password in one verified step;
 *  - ایمیل: identifier → 6-digit OTP to the account's VERIFIED email → new
 *    password (anti-enumeration: the request answers the same neutral
 *    envelope whether or not the account exists);
 *  - گوگل: an honest pointer — log in with google, set a password in
 *    security settings (no separate phishing-shaped flow);
 *  - پیامک: «به‌زودی» — disabled chip, infrastructure only.
 */
import { fa } from '@/messages/fa';
import { emailTransportInfo } from '@/modules/auth/email';
import { googleConfigured } from '@/modules/auth/google';
import { AuthShell } from '@/components/auth/auth-shell';
import { RecoverView } from './recover-view';

export const dynamic = 'force-dynamic';

export default function RecoverPage() {
  return (
    <AuthShell title={fa.auth.recoverTitle} lead={fa.auth.recoverLead}>
      <RecoverView emailConfigured={emailTransportInfo().configured} googleConfigured={googleConfigured()} />
    </AuthShell>
  );
}
