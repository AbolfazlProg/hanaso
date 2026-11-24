/**
 * HANASO — the signup wizard (M2 · AUTH-PASSWORD).
 *
 * The PRIMARY registration: username + a strong password (+ optional email
 * as a recovery contact, shown only while the mail transport is live). The
 * account is created and the session issued by /api/auth/register — the
 * guest progress of this browser merges in (mission §۳).
 *
 * Right after, the RECOVERY-PHRASE offer (recommended, skippable — «رمز
 * اصل است، عبارت پشتیبان»): the same generate→show-once→quiz wizard (now
 * purpose=enroll, attached to the fresh session) that security settings
 * uses. The exact M1 verification semantics survive: no phrase activates
 * without passing the random-position quiz.
 *
 * Client-side validation mirrors the server 1:1 (password-policy.ts) — the
 * user sees why a field is rejected BEFORE the round-trip.
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AUTH_INPUT_BASE, AuthBanner, AuthField, PasswordField } from '@/components/auth/auth-fields';
import { PhraseBackupPanel } from '@/components/auth/phrase-backup-panel';
import { fa } from '@/messages/fa';
import { validatePassword, validateUsername } from '@/modules/auth/password-policy';

type Step = 'form' | 'phrase-offer' | 'phrase' | 'quiz' | 'done';

interface WizardData {
  registrationId: string;
  words: string[];
  positions: number[];
}

const USERNAME_MESSAGES: Record<string, string> = {
  empty: 'نام کاربری را بنویس.',
  too_short: 'نام کاربری باید دست‌کم ۳ نویسه باشد.',
  too_long: 'نام کاربری حداکثر ۳۰ نویسه می‌تواند باشد.',
  malformed: 'فقط حروف انگلیسی، رقم و ـ (خط زیر).',
  bad_shape: 'شروع/پایان با ـ یا ــ پشت‌سرهم مجاز نیست.',
  reserved: 'این نام کاربری رزرو شده است.',
};

export function SignupWizard({ emailConfigured }: { emailConfigured: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  /** true when the user SKIPPED the phrase offer (the done copy differs). */
  const [skippedPhrase, setSkippedPhrase] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string; confirm?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [emailNote, setEmailNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<WizardData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [confirmed, setConfirmed] = useState(false);

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

  async function register() {
    // 1:1 with the server rules — fail fast, no round-trip
    const next: { username?: string; password?: string; confirm?: string } = {};
    const usernameCheck = validateUsername(username);
    if (!usernameCheck.ok) next.username = USERNAME_MESSAGES[usernameCheck.reason];
    const passwordCheck = validatePassword(password, { username, email });
    if (!passwordCheck.ok) next.password = PASSWORD_HINTS[passwordCheck.reason] ?? fa.auth.strengthNeeds;
    if (confirm !== password) next.confirm = fa.auth.passwordsDontMatch;
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, string> = { username, password };
      if (emailConfigured && email.trim().length > 0) payload.email = email.trim();
      const { res, json } = await call('/api/auth/register', payload);
      if (!res.ok || !json.ok) {
        // the API's field-specific codes map onto the inline field errors
        const code = (json as { error?: { code?: string } }).error?.code;
        if (code === 'auth/username_taken' || code === 'auth/username_invalid') {
          setFieldErrors({ username: json.error?.message ?? fa.auth.genericError });
        } else {
          setError(json.error?.message ?? fa.auth.genericError);
        }
        return;
      }
      const verification = json.data?.emailVerification;
      if (verification === 'sent') {
        setEmailNote(fa.auth.emailVerifyInlineBody);
      } else if (verification === 'failed') {
        setEmailNote(fa.auth.emailNotConfigured);
      }
      setStep('phrase-offer');
      router.refresh();
    } catch {
      setError(fa.auth.genericError);
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
      setData({
        registrationId: String(json.data.registrationId),
        words: (json.data.words as string[]) ?? [],
        positions: (json.data.positions as number[]) ?? [],
      });
      setAnswers({});
      setConfirmed(false);
      setStep('phrase');
    } catch {
      setError(fa.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function refetchPhrase() {
    if (!data) return;
    setBusy(true);
    try {
      const { res, json } = await call('/api/auth/mnemonic/phrase', { registrationId: data.registrationId });
      if (res.ok && json.ok && json.data?.words) {
        setData({ ...data, words: json.data.words as string[] });
      }
    } catch {
      /* the window may have closed — verify will say so honestly */
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!data) return;
    setBusy(true);
    setError(null);
    try {
      const payload = data.positions.map((position) => ({ position, word: answers[position] ?? '' }));
      const { res, json } = await call('/api/auth/mnemonic/verify', {
        registrationId: data.registrationId,
        answers: payload,
      });
      if (!res.ok || !json.ok) {
        if (res.status === 410) {
          setError(fa.auth.signupExpired);
          setStep('phrase-offer');
        } else {
          setError(json.error?.message ?? fa.auth.signupQuizWrong);
        }
        return;
      }
      setStep('done');
      router.refresh();
    } catch {
      setError(fa.auth.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <AuthBanner tone="error">{error}</AuthBanner> : null}

      {step === 'form' && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void register();
          }}
        >
          <AuthField
            label={fa.auth.usernameLabel}
            hint={fa.auth.usernameHint}
            error={fieldErrors.username}
            latin
            required
            name="username"
            autoComplete="username"
            placeholder={fa.auth.usernamePlaceholder}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <PasswordField
            label={fa.auth.newPasswordLabel}
            meter
            hint={fa.auth.strengthNeeds}
            error={fieldErrors.password}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <PasswordField
            label={fa.auth.confirmLabel}
            error={fieldErrors.confirm}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {emailConfigured ? (
            <AuthField
              label={fa.auth.emailOptionalLabel}
              latin
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          ) : null}

          <Button type="submit" variant="cta" size="main" loading={busy} className="mt-1 w-full">
            {fa.auth.signupSubmit}
          </Button>
        </form>
      )}

      {step === 'phrase-offer' && (
        <div className="flex flex-col gap-4">
          <AuthBanner tone="success">{fa.auth.signupOk}</AuthBanner>
          {emailNote ? (
            <AuthBanner tone="notice" role="status">
              {fa.auth.emailVerifyInlineTitle} — {emailNote}
            </AuthBanner>
          ) : null}
          <div className="rounded-md border-2 border-indigo/30 bg-indigo-wash p-4">
            <h2 className="flex items-center gap-2 text-h3 font-black text-indigo">
              <ShieldCheck aria-hidden className="size-5 shrink-0" />
              {fa.auth.phraseOfferTitle}
            </h2>
            <p className="mt-2 text-small leading-relaxed text-ink-soft">{fa.auth.phraseOfferBody}</p>
          </div>
          {/* ONE button grammar: primary CTA + secondary — full-width on
           * mobile (no squeezed two-line labels), side-by-side from sm up. */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="cta"
              size="main"
              loading={busy}
              onClick={() => void startEnroll()}
              className="w-full sm:flex-1"
            >
              <KeyRound aria-hidden className="size-4 shrink-0" />
              {fa.auth.phraseOfferCta}
            </Button>
            <Button
              variant="secondary"
              size="main"
              onClick={() => {
                setSkippedPhrase(true);
                setStep('done');
              }}
              className="w-full sm:flex-1"
            >
              {fa.auth.phraseOfferSkip}
            </Button>
          </div>
        </div>
      )}

      {step === 'phrase' && data && (
        <div className="flex flex-col gap-4">
          <h2 className="text-h3 font-black text-ink">{fa.auth.signupStepPhraseTitle}</h2>
          <p className="text-small leading-relaxed text-ink-soft">{fa.auth.signupStepPhraseBody}</p>
          <PhraseBackupPanel words={data.words} onRefetch={() => void refetchPhrase()} refetchBusy={busy} />
          <label className="flex items-start gap-2 text-small text-ink">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 size-4 accent-indigo"
              required
            />
            <span className="leading-relaxed">{fa.auth.signupConfirmSaved}</span>
          </label>
          <Button variant="cta" size="main" disabled={!confirmed} onClick={() => setStep('quiz')} className="w-full">
            {fa.common.continue}
          </Button>
        </div>
      )}

      {step === 'quiz' && data && (
        <div className="flex flex-col gap-4">
          <h2 className="text-h3 font-black text-ink">{fa.auth.signupStepQuizTitle}</h2>
          <p className="text-small leading-relaxed text-ink-soft">{fa.auth.signupStepQuizBody}</p>
          {data.positions.map((position) => (
            <label key={position} className="flex flex-col gap-1.5">
              <span className="text-small font-bold text-ink">{fa.auth.signupQuizInput(position)}</span>
              <input
                dir="ltr"
                value={answers[position] ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [position]: e.target.value }))}
                className={AUTH_INPUT_BASE + 'text-left font-mono text-small'}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          ))}
          <Button variant="cta" size="main" loading={busy} onClick={() => void verify()} className="w-full">
            {fa.auth.signupQuizSubmit}
          </Button>
          <button
            type="button"
            onClick={() => void refetchPhrase()}
            className="self-start rounded-sm px-1 text-caption font-bold text-ai underline decoration-2 underline-offset-4 transition-colors hover:text-ai-deep focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-shu"
          >
            {fa.auth.signupShowPhraseAgain}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col gap-4">
          {skippedPhrase ? (
            <AuthBanner tone="notice" role="status">
              {fa.auth.phraseOfferSkippedNote}
            </AuthBanner>
          ) : (
            <AuthBanner tone="success">{fa.auth.phraseEnrollOk}</AuthBanner>
          )}
          <Button variant="cta" size="main" onClick={() => router.push('/')} className="w-full">
            {fa.notFound.backHome}
          </Button>
        </div>
      )}
    </div>
  );
}

const PASSWORD_HINTS: Record<string, string> = {
  empty: 'رمز عبور را بنویس.',
  too_short: 'رمز عبور باید دست‌کم ۸ نویسه باشد.',
  too_long: 'رمز عبور حداکثر ۱۲۸ نویسه می‌تواند باشد.',
  too_common: 'این رمز خیلی رایج است — یکی نامعمول‌تر انتخاب کن.',
  contains_identifier: 'رمز عبور نباید نام کاربری یا ایمیلت را در خود داشته باشد.',
  too_weak: fa.auth.strengthNeeds,
};
