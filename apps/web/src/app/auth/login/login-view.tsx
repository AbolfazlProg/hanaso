/**
 * HANASO — the login view (M2 · AUTH-PASSWORD — the primary way in).
 *
 * ONE form: the identifier (username OR verified email) + the password.
 * Google stays one tap below the «یا» divider (its whole point is
 * simplicity — no password). A passwordless account (google/phrase born)
 * gets an honest door-sign from the API (auth/password_not_set) instead of
 * a dead-end «wrong password» — the banner routes it to the right door.
 *
 * Errors come from the API's Persian envelope — no internals, no leakage.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthBanner, AuthField, GoogleButton, OrDivider, PasswordField } from '@/components/auth/auth-fields';
import { fa } from '@/messages/fa';

export function LoginView({ googleConfigured, notice }: { googleConfigured: boolean; notice: string | null }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: { code?: string; message?: string } };
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      router.refresh();
      router.push('/');
    } catch {
      setError(fa.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {notice ? <AuthBanner tone="notice">{notice}</AuthBanner> : null}
      {error ? <AuthBanner tone="error">{error}</AuthBanner> : null}

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void login();
        }}
      >
        <AuthField
          label={fa.auth.identifierLabel}
          latin
          required
          name="identifier"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <PasswordField
          label={fa.auth.passwordLabel}
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" variant="cta" size="main" loading={busy} className="mt-1 w-full">
          {fa.auth.loginSubmit}
        </Button>
      </form>

      <a
        href="/auth/recover"
        hrefLang="fa"
        className="mx-auto text-small font-bold text-ai underline decoration-2 underline-offset-4 transition-colors hover:text-ai-deep"
      >
        {fa.auth.forgotPassword}
      </a>

      <OrDivider />

      {googleConfigured ? (
        <GoogleButton href="/api/auth/google/start" label={fa.auth.googleStart} hint={fa.auth.loginGoogleHint} />
      ) : (
        <AuthBanner tone="notice" role="status">
          {fa.auth.googleUnconfigured}
        </AuthBanner>
      )}

      <p className="border-t border-ink-faint/30 pt-4 text-center text-small text-ink-soft">
        {fa.auth.noAccount}{' '}
        <a
          href="/auth/signup"
          hrefLang="fa"
          className="font-black text-indigo underline decoration-2 underline-offset-4 transition-colors hover:text-ai"
        >
          {fa.auth.signupCta}
        </a>
      </p>

      <a
        href="/"
        hrefLang="fa"
        className="mx-auto inline-flex items-center gap-1.5 text-caption font-bold text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        {fa.notFound.backHome}
      </a>
    </div>
  );
}
