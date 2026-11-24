/**
 * HANASO — /auth/signup (M2 · AUTH-PASSWORD).
 *
 * The primary registration: username + password (+ optional verified email).
 * After the account exists, the recovery-phrase offer runs inside the same
 * wizard (recommended, skippable). The BIP39 wordlist ships as a bundled
 * JSON module (8f5da6a) — the quiz datalist needs it.
 */
import { fa } from '@/messages/fa';
import { emailTransportInfo } from '@/modules/auth/email';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignupWizard } from './signup-wizard';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return (
    <AuthShell title={fa.auth.signupTitle} lead={fa.auth.signupLead}>
      <SignupWizard emailConfigured={emailTransportInfo().configured} />
    </AuthShell>
  );
}
