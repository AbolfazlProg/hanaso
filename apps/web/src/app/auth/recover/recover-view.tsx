/**
 * HANASO — the recovery view (M2 · AUTH-PASSWORD — the four doors).
 * See page.tsx for the flow contract. All errors come from the API's
 * Persian envelope; the email request shows the SAME neutral confirmation
 * for existing and unknown identifiers (anti-enumeration).
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, KeyRound, Mail, MessageSquare, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AUTH_INPUT_BASE, AuthBanner, AuthField, GoogleButton, PasswordField } from '@/components/auth/auth-fields';
import { fa } from '@/messages/fa';
import { validatePassword } from '@/modules/auth/password-policy';

type Door = 'phrase' | 'email' | 'google' | 'sms';

const DOORS: { key: Door; label: string; hint: string; Icon: typeof ShieldCheck; disabled?: boolean }[] = [
  { key: 'phrase', label: fa.auth.recoverMethodPhrase, hint: fa.auth.recoverMethodPhraseHint, Icon: KeyRound },
  { key: 'email', label: fa.auth.recoverMethodEmail, hint: fa.auth.recoverMethodEmailHint, Icon: Mail },
  { key: 'google', label: fa.auth.recoverMethodGoogle, hint: fa.auth.recoverMethodGoogleHint, Icon: BadgeCheck },
  {
    key: 'sms',
    label: fa.auth.recoverMethodSms,
    hint: fa.auth.recoverMethodSmsHint,
    Icon: MessageSquare,
    disabled: true,
  },
];

export function RecoverView({
  emailConfigured,
  googleConfigured,
}: {
  emailConfigured: boolean;
  googleConfigured: boolean;
}) {
  const router = useRouter();
  const [door, setDoor] = useState<Door>('phrase');
  const [phrase, setPhrase] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function call(
    url: string,
    body: unknown,
  ): Promise<{
    res: Response;
    json: { ok?: boolean; data?: Record<string, unknown>; error?: { message?: string } };
  }> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok?: boolean; data?: Record<string, unknown>; error?: { message?: string } };
    return { res, json };
  }

  function checkNewPassword(): boolean {
    const check = validatePassword(newPassword);
    if (!check.ok) {
      setFieldError(
        check.reason === 'too_short'
          ? 'رمز عبور جدید باید دست‌کم ۸ نویسه باشد.'
          : check.reason === 'too_common'
            ? 'این رمز خیلی رایج است — یکی نامعمول‌تر انتخاب کن.'
            : fa.auth.strengthNeeds,
      );
      return false;
    }
    if (newPassword !== confirm) {
      setFieldError(fa.auth.passwordsDontMatch);
      return false;
    }
    setFieldError(null);
    return true;
  }

  async function recoverWithPhrase() {
    if (!checkNewPassword()) return;
    setBusy(true);
    setError(null);
    try {
      const { res, json } = await call('/api/auth/recover/phrase', { phrase, newPassword });
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      setOk(fa.auth.recoverPhraseOk);
      router.refresh();
      setTimeout(() => router.push('/'), 1200);
    } catch {
      setError(fa.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function requestCode() {
    setBusy(true);
    setError(null);
    try {
      const { res, json } = await call('/api/auth/recover/email/request', { identifier });
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      setCodeSent(true);
      setOk(fa.auth.recoverEmailSent);
    } catch {
      setError(fa.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndReset() {
    if (!checkNewPassword()) return;
    const email = identifier.includes('@') ? identifier.trim().toLowerCase() : '';
    if (!email) {
      setError('نشانی ایمیل را کامل بنویس.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { res, json } = await call('/api/auth/recover/email/verify', { email, code, newPassword });
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      setOk(fa.auth.recoverEmailOk);
      router.refresh();
      setTimeout(() => router.push('/'), 1200);
    } catch {
      setError(fa.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* the four doors */}
      <div role="tablist" aria-label={fa.auth.recoverTitle} className="grid grid-cols-2 gap-2">
        {DOORS.map(({ key, label, hint, Icon, disabled }) => {
          const selected = door === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={disabled}
              onClick={() => {
                setDoor(key);
                setError(null);
                setOk(null);
                setFieldError(null);
                setCodeSent(false);
              }}
              className={[
                'flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-md border-2 px-2 py-2.5 text-center transition-colors duration-150',
                disabled
                  ? 'cursor-not-allowed border-dashed border-ink-faint/40 text-ink-faint'
                  : selected
                    ? 'border-indigo bg-indigo-wash text-indigo'
                    : 'border-ink/20 bg-card text-ink-soft hover:border-indigo/50 hover:text-ink',
              ].join(' ')}
            >
              <Icon aria-hidden className="size-4" />
              <span className="text-small font-bold">{label}</span>
              <span className="text-caption">{disabled ? fa.auth.soon : hint}</span>
            </button>
          );
        })}
      </div>

      {error ? <AuthBanner tone="error">{error}</AuthBanner> : null}
      {ok ? (
        <AuthBanner tone="success" role="status">
          {ok}
        </AuthBanner>
      ) : null}
      {fieldError ? <AuthBanner tone="error">{fieldError}</AuthBanner> : null}

      {door === 'phrase' && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void recoverWithPhrase();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recover-phrase" className="text-small font-bold text-ink">
              {fa.auth.recoverPhraseLabel}
            </label>
            <textarea
              id="recover-phrase"
              required
              dir="ltr"
              rows={3}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={fa.auth.recoverPhrasePlaceholder}
              className={AUTH_INPUT_BASE + 'text-left font-mono text-small'}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <PasswordField
            label={fa.auth.recoverNewPasswordLabel}
            meter
            hint={fa.auth.strengthNeeds}
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <PasswordField
            label={fa.auth.recoverNewPasswordConfirmLabel}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <Button type="submit" variant="cta" size="main" loading={busy} className="w-full">
            {fa.auth.recoverPhraseSubmit}
          </Button>
        </form>
      )}

      {door === 'email' && !emailConfigured && (
        <AuthBanner tone="notice" role="status">
          {fa.auth.emailNotConfigured}
        </AuthBanner>
      )}

      {door === 'email' && emailConfigured && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void (codeSent ? verifyAndReset() : requestCode());
          }}
        >
          <AuthField
            label={fa.auth.recoverEmailIdentifierLabel}
            latin
            required
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={codeSent}
          />
          {codeSent ? (
            <>
              <AuthField
                label={fa.auth.recoverEmailCodeLabel}
                latin
                required
                inputMode="numeric"
                pattern="\d{6}"
                autoComplete="one-time-code"
                placeholder={fa.auth.recoverEmailCodePlaceholder}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <PasswordField
                label={fa.auth.recoverNewPasswordLabel}
                meter
                hint={fa.auth.strengthNeeds}
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <PasswordField
                label={fa.auth.recoverNewPasswordConfirmLabel}
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </>
          ) : null}
          <Button type="submit" variant="cta" size="main" loading={busy} className="w-full">
            {codeSent ? fa.auth.recoverEmailSubmit : fa.auth.recoverEmailRequestCta}
          </Button>
        </form>
      )}

      {door === 'google' && (
        <div className="flex flex-col gap-4">
          <p className="text-small leading-relaxed text-ink-soft">{fa.auth.recoverGoogleBody}</p>
          {googleConfigured ? (
            <GoogleButton href="/api/auth/google/start" label={fa.auth.recoverGoogleCta} />
          ) : (
            <AuthBanner tone="notice" role="status">
              {fa.auth.googleUnconfigured}
            </AuthBanner>
          )}
        </div>
      )}

      <a
        href="/auth/login"
        hrefLang="fa"
        className="mx-auto text-small font-bold text-ai underline decoration-2 underline-offset-4 transition-colors hover:text-ai-deep"
      >
        {fa.auth.recoverBackToLogin}
      </a>
    </div>
  );
}
