/**
 * HANASO — /auth/login (M2 · AUTH-PASSWORD).
 *
 * The primary door: username-or-email + password, with the one-click google
 * button beneath the divider. Server shell (RSC) + the client twin.
 */
import { fa } from '@/messages/fa';
import { googleConfigured } from '@/modules/auth/google';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginView } from './login-view';

export const dynamic = 'force-dynamic';

/** The google-callback markers → honest Persian messages (no internals). */
const GOOGLE_MESSAGES: Record<string, string> = {
  unconfigured: fa.auth.googleUnconfigured,
  cancelled: fa.auth.googleCancelled,
  login_ok: fa.auth.googleLoginOk,
  invalid_state: fa.auth.googleError,
  expired: fa.auth.googleError,
  exchange_failed: fa.auth.googleError,
  token_invalid: fa.auth.googleError,
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const params = await searchParams;
  const notice = params.google ? (GOOGLE_MESSAGES[params.google] ?? fa.auth.googleError) : null;
  return (
    <AuthShell title={fa.auth.loginTitle} lead={fa.auth.loginLead}>
      <LoginView googleConfigured={googleConfigured()} notice={notice} />
    </AuthShell>
  );
}
