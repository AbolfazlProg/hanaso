/**
 * HANASO — the login hub client twin (M1 · AUTH-ACCOUNTS).
 *
 * One method panel visible at a time (the mnemonic by default — the primary
 * anchor), the others one tap away. Every state is honest: email says
 * not-yet-active when the transport is unconfigured (503 mapped to the same
 * Persian copy), sms is a permanently disabled chip («به‌زودی»), google hides
 * behind the env probe. Error messages come from the API's Persian envelope —
 * no internals, no sensitive leakage.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, MessageSquare, ShieldCheck, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fa } from '@/messages/fa';

type Method = 'mnemonic' | 'email' | 'google' | 'sms';

const METHODS: { key: Method; label: string; hint: string; Icon: typeof ShieldCheck }[] = [
  { key: 'mnemonic', label: fa.auth.methodMnemonic, hint: fa.auth.methodMnemonicHint, Icon: ShieldCheck },
  { key: 'email', label: fa.auth.methodEmail, hint: fa.auth.methodEmailHint, Icon: Mail },
  { key: 'google', label: fa.auth.methodGoogle, hint: fa.auth.methodGoogleHint, Icon: BadgeCheck },
  { key: 'sms', label: fa.auth.methodSms, hint: fa.auth.methodSmsHint, Icon: MessageSquare },
];

export function LoginView({
  emailConfigured,
  googleConfigured,
  googleMessage,
  notice,
}: {
  emailConfigured: boolean;
  googleConfigured: boolean;
  googleMessage: string | null;
  notice: string | null;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>('mnemonic');
  const [phrase, setPhrase] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function call(
    url: string,
    body: unknown,
  ): Promise<{ res: Response; json: { ok?: boolean; error?: { message?: string } } }> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok?: boolean; error?: { message?: string } };
    return { res, json };
  }

  async function loginWithPhrase() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { res, json } = await call('/api/auth/mnemonic/login', { phrase });
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      setOk(fa.auth.phraseLoginOk);
      router.refresh();
      router.push('/');
    } catch {
      setError(fa.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function requestCode() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { res, json } = await call('/api/auth/email/request', { email, purpose: 'login' });
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      setCodeSent(true);
      setOk(fa.auth.emailRequestOk);
    } catch {
      setError(fa.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { res, json } = await call('/api/auth/email/verify', { email, code, purpose: 'login' });
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      setOk(fa.auth.emailLoginOk);
      router.refresh();
      router.push('/');
    } catch {
      setError(fa.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-6" aria-live="polite">
      {/* the method rail — the active one carries the panel below */}
      <div role="tablist" aria-label={fa.auth.loginTitle} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {METHODS.map(({ key, label, hint, Icon }) => {
          const disabled = key === 'sms';
          const selected = method === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={disabled}
              onClick={() => setMethod(key)}
              className={[
                'flex min-h-20 flex-col items-center justify-center gap-1 rounded-md border-2 px-2 py-3 text-center transition-colors',
                disabled
                  ? 'cursor-not-allowed border-dashed border-ink-soft/40 text-ink-soft/50'
                  : selected
                    ? 'border-indigo bg-indigo-wash text-indigo'
                    : 'border-indigo/30 bg-surface-warm text-ink-soft hover:border-indigo/60 hover:text-ink',
              ].join(' ')}
            >
              <Icon aria-hidden className="size-5" />
              <span className="text-small font-bold">{label}</span>
              <span className="text-micro text-ink-soft">{disabled ? fa.auth.soon : hint}</span>
            </button>
          );
        })}
      </div>

      {(googleMessage || notice) && (
        <p className="rounded-md border-2 border-shu/40 bg-surface-warm px-3 py-2 text-small text-ink">
          {googleMessage ?? notice}
        </p>
      )}
      {error && (
        <p
          className="rounded-md border-2 border-shu/60 bg-surface-warm px-3 py-2 text-small font-bold text-shu"
          role="alert"
        >
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-md border-2 border-matcha/50 bg-matcha-wash px-3 py-2 text-small font-bold text-ink">
          {ok}
        </p>
      )}

      {method === 'mnemonic' && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void loginWithPhrase();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-body font-bold">{fa.auth.phraseLabel}</span>
            <textarea
              required
              dir="ltr"
              rows={3}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={fa.auth.phrasePlaceholder}
              className="rounded-md border-2 border-indigo/40 bg-paper px-3 py-2 font-mono text-small text-ink focus-visible:border-indigo focus-visible:outline-2 focus-visible:outline-ai"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <Button type="submit" size="main" loading={busy}>
            {fa.auth.phraseSubmit}
          </Button>
          <p className="text-micro text-ink-soft">{fa.auth.forgotHint}</p>
        </form>
      )}

      {method === 'email' && !emailConfigured && (
        <p className="rounded-md border-2 border-dashed border-ink-soft/40 bg-surface-warm px-3 py-3 text-small text-ink-soft">
          {fa.auth.emailNotConfigured}
        </p>
      )}

      {method === 'email' && emailConfigured && (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void (codeSent ? verifyCode() : requestCode());
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-body font-bold">{fa.auth.emailLabel}</span>
            <input
              required
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={fa.auth.emailPlaceholder}
              className="rounded-md border-2 border-indigo/40 bg-paper px-3 py-2 text-small text-ink focus-visible:border-indigo focus-visible:outline-2 focus-visible:outline-ai"
              autoComplete="email"
            />
          </label>
          {codeSent && (
            <label className="flex flex-col gap-1.5">
              <span className="text-body font-bold">{fa.auth.emailCodeLabel}</span>
              <input
                required
                inputMode="numeric"
                pattern="\d{6}"
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={fa.auth.emailCodePlaceholder}
                className="rounded-md border-2 border-indigo/40 bg-paper px-3 py-2 text-center font-mono tracking-6 text-small text-ink focus-visible:border-indigo focus-visible:outline-2 focus-visible:outline-ai"
                autoComplete="one-time-code"
              />
            </label>
          )}
          <Button type="submit" size="main" loading={busy}>
            {codeSent ? fa.auth.emailVerify : fa.auth.emailRequestCode}
          </Button>
        </form>
      )}

      {method === 'google' && (
        <div className="flex flex-col gap-3">
          {googleConfigured ? (
            <a
              href="/api/auth/google/start"
              className="flex h-12 items-center justify-center gap-2 rounded-md border-2 border-indigo bg-paper px-4 text-body font-bold text-ink transition-colors hover:bg-surface-warm"
            >
              <BadgeCheck aria-hidden className="size-5" />
              {fa.auth.googleStart}
            </a>
          ) : (
            <p className="rounded-md border-2 border-dashed border-ink-soft/40 bg-surface-warm px-3 py-3 text-small text-ink-soft">
              {fa.auth.googleUnconfigured}
            </p>
          )}
        </div>
      )}

      <p className="border-t-2 border-indigo/15 pt-4 text-small text-ink-soft">
        {fa.auth.noAccount}{' '}
        <a
          href="/auth/signup"
          hrefLang="fa"
          className="font-black text-indigo underline decoration-2 underline-offset-4"
        >
          {fa.auth.signupCta}
        </a>
      </p>
    </section>
  );
}
