/**
 * HANASO — the security settings client twin (M1 · AUTH-ACCOUNTS).
 *
 * Renders /api/auth/methods: the method cards (with unlink), the mnemonic
 * activation wizard (inline — same prepare→phrase→quiz flow, purpose=enroll),
 * the email linking form, the google linking redirect, and the devices list
 * with logout/logout-all. Every state message is the API's honest Persian
 * envelope text or fa.auth copy — never internals.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Laptop, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fa } from '@/messages/fa';

interface MethodRow {
  provider: string;
  verifiedAt: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}
interface SessionRow {
  id: string;
  method: string | null;
  deviceLabel: string | null;
  ipPrefix: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}
interface MethodsData {
  user: { id: string; displayName: string | null; email: string | null } | null;
  methods: MethodRow[];
  sessions: SessionRow[];
  featureState: { email: boolean; google: boolean; sms: boolean };
}

const PROVIDER_LABEL: Record<string, string> = {
  mnemonic: fa.auth.methodMnemonic,
  email: fa.auth.methodEmail,
  google: fa.auth.methodGoogle,
  sms: fa.auth.methodSms,
};

const faDate = (iso: string) => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso));

export function SecurityView() {
  const router = useRouter();
  const [data, setData] = useState<MethodsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [wizard, setWizard] = useState<{ registrationId: string; words: string[]; positions: number[] } | null>(null);
  const [wizardStep, setWizardStep] = useState<'phrase' | 'quiz'>('phrase');
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/methods');
      const json = (await res.json()) as { ok?: boolean; data?: MethodsData; error?: { message?: string } };
      if (json.ok && json.data) setData(json.data);
      else setError(json.error?.message ?? fa.auth.genericError);
    } catch {
      setError(fa.auth.genericError);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function call(
    url: string,
    body: unknown,
  ): Promise<{ res: Response; json: { ok?: boolean; data?: Record<string, unknown>; error?: { message?: string } } }> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok?: boolean; data?: Record<string, unknown>; error?: { message?: string } };
    return { res, json };
  }

  async function unlink(provider: string) {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { res, json } = await call('/api/auth/methods/unlink', { provider });
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      setOk(fa.auth.methodRemoved);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function logout(all: boolean) {
    if (all && !window.confirm(fa.auth.logoutAllConfirm)) return;
    setBusy(true);
    try {
      await call(`/api/auth/session/${all ? 'end-all' : 'end'}`, {});
      if (all) setOk(fa.auth.logoutAllOk);
      else router.push('/');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function startEnroll() {
    setBusy(true);
    setError(null);
    try {
      const { res, json } = await call('/api/auth/mnemonic/enroll', {});
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      setWizard({
        registrationId: json.data.registrationId as string,
        words: json.data.words as string[],
        positions: json.data.positions as number[],
      });
      setWizardStep('phrase');
      setConfirmed(false);
      setAnswers({});
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnroll() {
    if (!wizard) return;
    setBusy(true);
    setError(null);
    try {
      const payload = wizard.positions.map((position) => ({ position, word: answers[position] ?? '' }));
      const { res, json } = await call('/api/auth/mnemonic/verify', {
        registrationId: wizard.registrationId,
        answers: payload,
      });
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? fa.auth.signupQuizWrong);
        return;
      }
      setWizard(null);
      setOk(fa.auth.mnemonicEnrollOk);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function requestLinkCode() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { res, json } = await call('/api/auth/email/request', { email, purpose: 'link' });
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      setCodeSent(true);
      setOk(fa.auth.emailRequestOk);
    } finally {
      setBusy(false);
    }
  }

  async function verifyLinkCode() {
    setBusy(true);
    setError(null);
    try {
      const { res, json } = await call('/api/auth/email/verify', { email, code, purpose: 'link' });
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      setCodeSent(false);
      setCode('');
      setOk(fa.auth.emailLinkOk);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <p className="text-small text-ink-soft">{fa.common.loading}</p>;
  }

  const has = (provider: string) => data.methods.some((m) => m.provider === provider);
  const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

  return (
    <div className="flex flex-col gap-8">
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

      {/* ---- methods ---- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lead font-black text-ink">{fa.auth.methodsTitle}</h2>
        <div className="flex flex-col gap-2">
          {(['mnemonic', 'google', 'email'] as const).map((provider) => {
            const row = data.methods.find((m) => m.provider === provider);
            return (
              <div
                key={provider}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-indigo/30 bg-surface-warm px-3 py-2.5"
              >
                <span className="inline-flex items-center gap-2 text-body font-bold text-ink">
                  {provider === 'mnemonic' ? (
                    <ShieldCheck aria-hidden className="size-5 text-indigo" />
                  ) : provider === 'google' ? (
                    <BadgeCheck aria-hidden className="size-5 text-indigo" />
                  ) : (
                    <Mail aria-hidden className="size-5 text-indigo" />
                  )}
                  {PROVIDER_LABEL[provider]}
                  {row ? (
                    <span className="rounded-full bg-matcha/20 px-2 py-0.5 text-micro font-black text-ink">
                      {fa.auth.methodActive}
                    </span>
                  ) : (
                    <span className="rounded-full bg-ink-soft/10 px-2 py-0.5 text-micro font-bold text-ink-soft">
                      —
                    </span>
                  )}
                </span>
                {row ? (
                  <button
                    type="button"
                    onClick={() => void unlink(provider)}
                    disabled={busy}
                    className="text-micro font-bold text-shu underline decoration-2 underline-offset-4 disabled:opacity-50"
                  >
                    {fa.auth.methodRemove}
                  </button>
                ) : (
                  <span className="text-micro text-ink-soft">{fa.auth.emailNotConfigured}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- the mnemonic activation prompt (never mandatory) ---- */}
      {!has('mnemonic') && !wizard && (
        <section className="flex flex-col gap-3 rounded-md border-2 border-indigo/40 bg-indigo-wash px-3 py-4">
          <h3 className="text-body font-black text-indigo">{fa.auth.mnemonicMissing}</h3>
          <p className="text-small text-ink-soft">{fa.auth.mnemonicMissingBody}</p>
          <Button size="sm" onClick={() => void startEnroll()} loading={busy}>
            {fa.auth.mnemonicEnrollCta}
          </Button>
        </section>
      )}

      {/* ---- the inline enroll wizard ---- */}
      {wizard && (
        <section className="flex flex-col gap-3 rounded-md border-2 border-indigo bg-paper px-3 py-4">
          {wizardStep === 'phrase' && (
            <>
              <h3 className="text-body font-black text-ink">{fa.auth.signupStepPhraseTitle}</h3>
              <p className="text-micro text-ink-soft">{fa.auth.signupStepPhraseBody}</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {wizard.words.map((word, i) => (
                  <div
                    key={`${word}-${i}`}
                    className="flex items-baseline gap-1.5 rounded border border-indigo/20 bg-indigo-wash px-1.5 py-1"
                  >
                    <span className="text-micro font-black text-indigo/70">{faNum(i + 1)}</span>
                    <span dir="ltr" className="font-mono text-small font-bold text-ink">
                      {word}
                    </span>
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-2 text-small text-ink">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 size-4 accent-indigo"
                />
                <span>{fa.auth.signupConfirmSaved}</span>
              </label>
              <Button size="sm" disabled={!confirmed} onClick={() => setWizardStep('quiz')}>
                {fa.common.continue}
              </Button>
            </>
          )}
          {wizardStep === 'quiz' && (
            <>
              <h3 className="text-body font-black text-ink">{fa.auth.signupStepQuizTitle}</h3>
              <p className="text-micro text-ink-soft">{fa.auth.signupStepQuizBody}</p>
              {wizard.positions.map((position) => (
                <input
                  key={position}
                  dir="ltr"
                  value={answers[position] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [position]: e.target.value }))}
                  placeholder={fa.auth.signupQuizInput(position)}
                  className="rounded-md border-2 border-indigo/40 bg-paper px-3 py-2 font-mono text-small text-ink focus-visible:border-indigo focus-visible:outline-2 focus-visible:outline-ai"
                  autoComplete="off"
                  spellCheck={false}
                />
              ))}
              <Button size="sm" loading={busy} onClick={() => void verifyEnroll()}>
                {fa.auth.signupQuizSubmit}
              </Button>
            </>
          )}
        </section>
      )}

      {/* ---- linking: email ---- */}
      {!has('email') && (
        <section className="flex flex-col gap-3 rounded-md border-2 border-indigo/25 px-3 py-4">
          <h3 className="text-body font-black text-ink">{fa.auth.emailLinkTitle}</h3>
          <p className="text-small text-ink-soft">
            {data.featureState.email ? fa.auth.emailLinkBody : fa.auth.emailNotConfigured}
          </p>
          {data.featureState.email && (
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void (codeSent ? verifyLinkCode() : requestLinkCode());
              }}
            >
              <input
                required
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={fa.auth.emailPlaceholder}
                className="rounded-md border-2 border-indigo/40 bg-paper px-3 py-2 text-small text-ink focus-visible:border-indigo focus-visible:outline-2 focus-visible:outline-ai"
              />
              {codeSent && (
                <input
                  required
                  inputMode="numeric"
                  pattern="\d{6}"
                  dir="ltr"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={fa.auth.emailCodePlaceholder}
                  className="rounded-md border-2 border-indigo/40 bg-paper px-3 py-2 text-center font-mono text-small text-ink focus-visible:border-indigo focus-visible:outline-2 focus-visible:outline-ai"
                />
              )}
              <Button type="submit" size="sm" loading={busy}>
                {codeSent ? fa.auth.emailVerify : fa.auth.emailLinkCta}
              </Button>
            </form>
          )}
        </section>
      )}

      {/* ---- linking: google ---- */}
      {!has('google') && (
        <section className="flex flex-col gap-3 rounded-md border-2 border-indigo/25 px-3 py-4">
          <h3 className="text-body font-black text-ink">{fa.auth.googleLinkTitle}</h3>
          <p className="text-small text-ink-soft">
            {data.featureState.google ? fa.auth.googleLinkBody : fa.auth.googleUnconfigured}
          </p>
          {data.featureState.google && (
            <a
              href="/api/auth/google/start?purpose=link&redirectTo=/settings/security"
              className="self-start rounded-md border-2 border-indigo bg-paper px-4 py-2 text-small font-bold text-ink transition-colors hover:bg-surface-warm"
            >
              {fa.auth.googleLinkCta}
            </a>
          )}
        </section>
      )}

      {/* ---- devices ---- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lead font-black text-ink">{fa.auth.devicesTitle}</h2>
        <div className="flex flex-col gap-2">
          {data.sessions.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-indigo/25 bg-surface-warm px-3 py-2.5"
            >
              <span className="inline-flex items-center gap-2 text-small font-bold text-ink">
                <Laptop aria-hidden className="size-4 text-indigo" />
                {s.deviceLabel ?? '—'}
                {s.current && (
                  <span className="rounded-full bg-indigo/10 px-2 py-0.5 text-micro font-black text-indigo">
                    {fa.auth.deviceCurrent}
                  </span>
                )}
              </span>
              <span className="text-micro text-ink-soft">
                {fa.auth.deviceLastSeen(faDate(s.lastSeenAt))} · {PROVIDER_LABEL[s.method ?? ''] ?? '—'}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void logout(false)} loading={busy}>
            {fa.auth.logout}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void logout(true)} loading={busy}>
            {fa.auth.logoutAll}
          </Button>
        </div>
      </section>
    </div>
  );
}
