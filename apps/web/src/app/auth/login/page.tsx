/**
 * HANASO — /auth/login (M1 · AUTH-ACCOUNTS — mission §۴).
 *
 * The login HUB: the four methods side by side, each honest about its state:
 *  - mnemonic (the primary anchor) — the phrase textarea;
 *  - email — real OTP (503-honest until the transport is configured);
 *  - google — the full OAuth redirect (honest unconfigured notice without
 *    credentials);
 *  - sms — permanently disabled in this mission with the «به‌زودی» chip
 *    (infrastructure only, mission §۱-ب).
 *
 * Server shell (RSC) + the interactive client twin (login-view).
 */
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { fa } from '@/messages/fa';
import { emailTransportInfo } from '@/modules/auth/email';
import { googleConfigured } from '@/modules/auth/google';
import { LoginView } from './login-view';

export const dynamic = 'force-dynamic';

/** The google-callback / start markers → honest Persian messages (no internals). */
const GOOGLE_MESSAGES: Record<string, string> = {
  unconfigured: fa.auth.googleUnconfigured,
  cancelled: fa.auth.googleCancelled,
  login_ok: fa.auth.googleLoginOk,
  invalid_state: fa.auth.googleError,
  expired: fa.auth.googleError,
  exchange_failed: fa.auth.googleError,
  token_invalid: fa.auth.googleError,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; email?: string }>;
}) {
  const params = await searchParams;
  const googleMessage = params.google ? (GOOGLE_MESSAGES[params.google] ?? fa.auth.googleError) : null;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-4 pb-16 pt-10 md:pt-16">
      <header className="flex flex-col gap-3">
        <Link
          href="/"
          hrefLang="fa"
          className="inline-flex items-center gap-1.5 text-body font-bold text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-4" />
          {fa.notFound.backHome}
        </Link>
        <h1 className="text-h1 font-black text-indigo">{fa.auth.loginTitle}</h1>
        <p className="text-lead text-ink-soft">{fa.auth.loginLead}</p>
      </header>
      <LoginView
        emailConfigured={emailTransportInfo().configured}
        googleConfigured={googleConfigured()}
        googleMessage={googleMessage}
        notice={params.email === 'not_configured' ? fa.auth.emailNotConfigured : null}
      />
    </main>
  );
}
