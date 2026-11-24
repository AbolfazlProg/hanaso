/**
 * HANASO — the security settings client twin (M2 · AUTH-PASSWORD).
 *
 * Sections: password (change — or SET, when the account was born
 * google/phrase), username (the login handle, settable once), the
 * recovery/login method cards (mnemonic enroll, email link, google link —
 * unlinkable except the password, which is CHANGED not removed), and the
 * devices list with logout/logout-all. Every state message is the API's
 * honest Persian envelope text or fa.auth copy — never internals.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AtSign, BadgeCheck, KeyRound, Laptop, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthBanner, AuthField, PasswordField } from '@/components/auth/auth-fields';
import { fa } from '@/messages/fa';
import { validatePassword, validateUsername } from '@/modules/auth/password-policy';

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
  user: { id: string; username: string | null; displayName: string | null; email: string | null } | null;
  methods: MethodRow[];
  sessions: SessionRow[];
  featureState: { email: boolean; google: boolean; sms: boolean };
}

const PROVIDER_LABEL: Record<string, string> = {
  password: fa.auth.methodPassword,
  mnemonic: fa.auth.methodMnemonic,
  email: fa.auth.methodEmail,
  google: fa.auth.methodGoogle,
  sms: fa.auth.methodSms,
};

const faDate = (iso: string) => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(iso));
const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

export function SecurityView() {
  const router = useRouter();
  const [data, setData] = useState<MethodsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* password change/set */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirm, setNewConfirm] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);

  /* username set */
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  /* email link */
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  /* mnemonic enroll wizard */
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

  async function changePassword() {
    const hasNow = has('password');
    const check = validatePassword(newPassword, {
      username: data?.user?.username ?? null,
      email: data?.user?.email ?? null,
    });
    if (!check.ok) {
      setPwError(
        check.reason === 'too_short'
          ? 'رمز عبور جدید باید دست‌کم ۸ نویسه باشد.'
          : check.reason === 'too_common'
            ? 'این رمز خیلی رایج است — یکی نامعمول‌تر انتخاب کن.'
            : check.reason === 'contains_identifier'
              ? 'رمز عبور نباید نام کاربری یا ایمیلت را در خود داشته باشد.'
              : fa.auth.strengthNeeds,
      );
      return;
    }
    if (newPassword !== newConfirm) {
      setPwError(fa.auth.passwordsDontMatch);
      return;
    }
    setPwError(null);
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const payload: Record<string, string> = { newPassword };
      if (hasNow) payload.currentPassword = currentPassword;
      const { res, json } = await call('/api/auth/password/change', payload);
      if (!res.ok || !json.ok) {
        setError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setNewConfirm('');
      setOk(hasNow ? fa.auth.passwordChangeOk : fa.auth.passwordSetOk);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function setUsernameSubmit() {
    const check = validateUsername(username);
    if (!check.ok) {
      setUsernameError(
        check.reason === 'too_short'
          ? 'نام کاربری باید دست‌کم ۳ نویسه باشد.'
          : check.reason === 'too_long'
            ? 'نام کاربری حداکثر ۳۰ نویسه می‌تواند باشد.'
            : check.reason === 'reserved'
              ? 'این نام کاربری رزرو شده است.'
              : 'فقط حروف انگلیسی، رقم و ـ (خط زیر) — ۳ تا ۳۰ نویسه.',
      );
      return;
    }
    setUsernameError(null);
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const { res, json } = await call('/api/auth/account/username', { username });
      if (!res.ok || !json.ok) {
        setUsernameError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      setOk(fa.auth.usernameSetOk);
      await load();
    } finally {
      setBusy(false);
    }
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
      setOk(fa.auth.phraseEnrollOk);
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
      setOk('کد به ایمیلت رفت — پوشهٔ هرزنامه را هم چک کن.');
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

  return (
    <div className="flex flex-col gap-8">
      {error ? <AuthBanner tone="error">{error}</AuthBanner> : null}
      {ok ? (
        <AuthBanner tone="success" role="status">
          {ok}
        </AuthBanner>
      ) : null}

      {/* ---- password: change or set ---- */}
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lead font-black text-ink">
          <KeyRound aria-hidden className="size-5 text-indigo" />
          {fa.auth.passwordSectionTitle}
        </h2>
        <form
          className="flex flex-col gap-3 rounded-md border-2 border-indigo/25 bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void changePassword();
          }}
        >
          <p className="text-small leading-relaxed text-ink-soft">
            {has('password') ? fa.auth.passwordChangeBody : fa.auth.passwordSetBody}
          </p>
          {has('password') ? (
            <PasswordField
              label={fa.auth.currentPasswordLabel}
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          ) : null}
          <PasswordField
            label={fa.auth.newPasswordLabel}
            meter
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <PasswordField
            label={fa.auth.confirmLabel}
            required
            autoComplete="new-password"
            value={newConfirm}
            onChange={(e) => setNewConfirm(e.target.value)}
          />
          {pwError ? <AuthBanner tone="error">{pwError}</AuthBanner> : null}
          <Button type="submit" variant="cta" size="main" loading={busy} className="w-full sm:w-auto">
            {has('password') ? fa.auth.passwordChangeCta : fa.auth.passwordSetCta}
          </Button>
        </form>
      </section>

      {/* ---- username: the login handle ---- */}
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-lead font-black text-ink">
          <AtSign aria-hidden className="size-5 text-indigo" />
          {fa.auth.usernameSectionTitle}
        </h2>
        {data.user?.username ? (
          <p className="rounded-md border-2 border-success/40 bg-success/5 px-3 py-2.5 text-small font-bold text-success">
            {fa.auth.usernameCurrent(data.user.username)}
          </p>
        ) : (
          <form
            className="flex flex-col gap-3 rounded-md border-2 border-indigo/25 bg-card p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void setUsernameSubmit();
            }}
          >
            <p className="text-small leading-relaxed text-ink-soft">{fa.auth.usernameSetBody}</p>
            <AuthField
              label={fa.auth.usernameLabel}
              hint={fa.auth.usernameHint}
              latin
              required
              autoComplete="username"
              placeholder={fa.auth.usernamePlaceholder}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {usernameError ? <AuthBanner tone="error">{usernameError}</AuthBanner> : null}
            <Button type="submit" size="main" loading={busy} className="w-full sm:w-auto">
              {fa.auth.usernameSetCta}
            </Button>
          </form>
        )}
      </section>

      {/* ---- the recovery/login method cards ---- */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lead font-black text-ink">{fa.auth.methodsTitle}</h2>
        <div className="flex flex-col gap-2">
          {(['password', 'mnemonic', 'google', 'email', 'sms'] as const).map((provider) => {
            const row = data.methods.find((m) => m.provider === provider);
            const icon =
              provider === 'password' ? (
                <KeyRound aria-hidden className="size-5 text-indigo" />
              ) : provider === 'mnemonic' ? (
                <ShieldCheck aria-hidden className="size-5 text-indigo" />
              ) : provider === 'google' ? (
                <BadgeCheck aria-hidden className="size-5 text-indigo" />
              ) : provider === 'sms' ? (
                <Laptop aria-hidden className="size-5 text-indigo" />
              ) : (
                <Mail aria-hidden className="size-5 text-indigo" />
              );
            const disabledRow = provider === 'sms';
            return (
              <div
                key={provider}
                className={[
                  'flex flex-wrap items-center justify-between gap-2 rounded-md border-2 px-3 py-2.5',
                  disabledRow
                    ? 'border-dashed border-ink-faint/40 bg-surface-warm/50'
                    : 'border-indigo/30 bg-surface-warm',
                ].join(' ')}
              >
                <span className="inline-flex items-center gap-2 text-body font-bold text-ink">
                  {icon}
                  {PROVIDER_LABEL[provider]}
                  {disabledRow ? (
                    <span className="rounded-full bg-ink-soft/10 px-2 py-0.5 text-micro font-bold text-ink-soft">
                      {fa.auth.soon}
                    </span>
                  ) : row ? (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-micro font-black text-success">
                      {fa.auth.methodActive}
                    </span>
                  ) : (
                    <span className="rounded-full bg-ink-soft/10 px-2 py-0.5 text-micro font-bold text-ink-soft">
                      —
                    </span>
                  )}
                </span>
                {provider === 'password' && row ? (
                  <span className="text-caption text-ink-soft">{fa.auth.methodPrimaryHint}</span>
                ) : row ? (
                  <button
                    type="button"
                    onClick={() => void unlink(provider)}
                    disabled={busy}
                    className="cursor-pointer text-caption font-bold text-shu underline decoration-2 underline-offset-4 disabled:opacity-50"
                  >
                    {fa.auth.methodRemove}
                  </button>
                ) : disabledRow ? (
                  <span className="text-caption text-ink-soft">{fa.auth.smsSoon}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- the mnemonic activation prompt (never mandatory) ---- */}
      {!has('mnemonic') && !wizard && (
        <section className="flex flex-col gap-3 rounded-md border-2 border-indigo/40 bg-indigo-wash px-4 py-4">
          <h3 className="flex items-center gap-2 text-body font-black text-indigo">
            <ShieldCheck aria-hidden className="size-5" />
            {fa.auth.mnemonicMissing}
          </h3>
          <p className="text-small leading-relaxed text-ink-soft">{fa.auth.mnemonicMissingBody}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void startEnroll()}
            loading={busy}
            className="self-start"
          >
            {fa.auth.mnemonicEnrollCta}
          </Button>
        </section>
      )}

      {/* ---- the inline enroll wizard ---- */}
      {wizard && (
        <section className="flex flex-col gap-3 rounded-md border-2 border-indigo bg-card px-4 py-4">
          {wizardStep === 'phrase' && (
            <>
              <h3 className="text-body font-black text-ink">{fa.auth.signupStepPhraseTitle}</h3>
              <p className="text-caption leading-relaxed text-ink-soft">{fa.auth.signupStepPhraseBody}</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {wizard.words.map((word, i) => (
                  <div
                    key={`${word}-${i}`}
                    className="flex items-baseline gap-1.5 rounded-sm border border-indigo/20 bg-paper px-1.5 py-1"
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
                <span className="leading-relaxed">{fa.auth.signupConfirmSaved}</span>
              </label>
              <Button size="sm" disabled={!confirmed} onClick={() => setWizardStep('quiz')}>
                {fa.common.continue}
              </Button>
            </>
          )}
          {wizardStep === 'quiz' && (
            <>
              <h3 className="text-body font-black text-ink">{fa.auth.signupStepQuizTitle}</h3>
              <p className="text-caption leading-relaxed text-ink-soft">{fa.auth.signupStepQuizBody}</p>
              {wizard.positions.map((position) => (
                <input
                  key={position}
                  dir="ltr"
                  value={answers[position] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [position]: e.target.value }))}
                  placeholder={fa.auth.signupQuizInput(position)}
                  className="w-full rounded-md border-2 border-ink/25 bg-paper px-3 py-2.5 text-left font-mono text-small text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-150 focus:border-shu focus:shadow-focus-input focus:outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
              ))}
              <Button size="sm" variant="cta" loading={busy} onClick={() => void verifyEnroll()}>
                {fa.auth.signupQuizSubmit}
              </Button>
            </>
          )}
        </section>
      )}

      {/* ---- linking: email ---- */}
      {!has('email') && (
        <section className="flex flex-col gap-3 rounded-md border-2 border-indigo/25 px-4 py-4">
          <h3 className="text-body font-black text-ink">{fa.auth.emailLinkTitle}</h3>
          <p className="text-small leading-relaxed text-ink-soft">
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
              <AuthField
                label={fa.auth.emailOptionalLabel}
                latin
                required
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {codeSent ? (
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
              ) : null}
              <Button type="submit" size="sm" className="self-start" loading={busy}>
                {codeSent ? 'تأیید و اتصال' : fa.auth.emailLinkCta}
              </Button>
            </form>
          )}
        </section>
      )}

      {/* ---- linking: google ---- */}
      {!has('google') && (
        <section className="flex flex-col gap-3 rounded-md border-2 border-indigo/25 px-4 py-4">
          <h3 className="text-body font-black text-ink">{fa.auth.googleLinkTitle}</h3>
          <p className="text-small leading-relaxed text-ink-soft">
            {data.featureState.google ? fa.auth.googleLinkBody : fa.auth.googleUnconfigured}
          </p>
          {data.featureState.google && (
            <a
              href="/api/auth/google/start?purpose=link&redirectTo=/settings/security"
              className="self-start rounded-md border-2 border-indigo bg-card px-4 py-2 text-small font-bold text-ink transition-colors hover:bg-indigo-wash"
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
                {s.current ? (
                  <span className="rounded-full bg-indigo/10 px-2 py-0.5 text-micro font-black text-indigo">
                    {fa.auth.deviceCurrent}
                  </span>
                ) : null}
              </span>
              <span className="text-caption text-ink-soft">
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
