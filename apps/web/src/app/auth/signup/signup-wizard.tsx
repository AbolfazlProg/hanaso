/**
 * HANASO — the signup wizard client twin (M1 · AUTH-ACCOUNTS).
 *
 * Steps: intro → phrase (once + confirm-saved) → quiz (3 free-text word
 * answers, BIP39 datalist) → done. The word inputs are LTR + monospace (the
 * words are English); every step renders its own Persian copy from fa.auth.
 * The API contract: prepare → {registrationId, words, positions} → verify →
 * {userId, newAccount} + the session cookie (set by the response itself).
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fa } from '@/messages/fa';

type Step = 'intro' | 'phrase' | 'quiz' | 'done' | 'failed';

interface WizardData {
  registrationId: string;
  words: string[];
  positions: number[];
}

export function SignupWizard({ wordlist }: { wordlist: readonly string[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('intro');
  const [data, setData] = useState<WizardData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(
    url: string,
    body: unknown,
  ): Promise<{
    res: Response;
    json: { ok?: boolean; data?: WizardData & Record<string, unknown>; error?: { message?: string } };
  }> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      data?: WizardData & Record<string, unknown>;
      error?: { message?: string };
    };
    return { res, json };
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const { res, json } = await call('/api/auth/mnemonic/prepare', {});
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error?.message ?? fa.auth.genericError);
        return;
      }
      setData({ registrationId: json.data.registrationId, words: json.data.words, positions: json.data.positions });
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
        setData({ ...data, words: (json.data as { words: string[] }).words });
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
          setStep('failed');
          setError(fa.auth.signupExpired);
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

  function restart() {
    setStep('intro');
    setData(null);
    setError(null);
    void start();
  }

  const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

  return (
    <section className="flex flex-col gap-6" aria-live="polite">
      {error && (
        <p
          className="rounded-md border-2 border-shu/60 bg-surface-warm px-3 py-2 text-small font-bold text-shu"
          role="alert"
        >
          {error}
        </p>
      )}

      {step === 'intro' && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lead font-black text-ink">{fa.auth.signupStepIntroTitle}</h2>
          <ul className="flex flex-col gap-2 text-small text-ink-soft">
            {fa.auth.signupStepIntroBody.map((line) => (
              <li key={line} className="rounded-md border-2 border-indigo/25 bg-surface-warm px-3 py-2">
                {line}
              </li>
            ))}
          </ul>
          <Button size="main" loading={busy} onClick={() => void start()}>
            {fa.auth.signupStepIntroCta}
          </Button>
        </div>
      )}

      {step === 'phrase' && data && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lead font-black text-ink">{fa.auth.signupStepPhraseTitle}</h2>
          <p className="text-small text-ink-soft">{fa.auth.signupStepPhraseBody}</p>
          <div className="grid grid-cols-2 gap-2 rounded-md border-2 border-indigo/40 bg-paper p-3 sm:grid-cols-3">
            {data.words.map((word, i) => (
              <div
                key={`${word}-${i}`}
                className="flex items-baseline gap-2 rounded border border-indigo/20 bg-indigo-wash px-2 py-1.5"
              >
                <span className="text-micro font-black text-indigo/70">{faNum(i + 1)}</span>
                <span dir="ltr" className="font-mono text-small font-bold text-ink">
                  {word}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => void refetchPhrase()} loading={busy}>
              <RotateCcw aria-hidden className="size-4" />
              {fa.auth.signupShowPhraseAgain}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(data.words.join(' ')).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
              {fa.common.copy}
            </Button>
          </div>
          <label className="flex items-start gap-2 text-small text-ink">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 size-4 accent-indigo"
              required
            />
            <span>{fa.auth.signupConfirmSaved}</span>
          </label>
          <Button size="main" disabled={!confirmed} onClick={() => setStep('quiz')}>
            {fa.common.continue}
          </Button>
        </div>
      )}

      {step === 'quiz' && data && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lead font-black text-ink">{fa.auth.signupStepQuizTitle}</h2>
          <p className="text-small text-ink-soft">{fa.auth.signupStepQuizBody}</p>
          {data.positions.map((position) => (
            <label key={position} className="flex flex-col gap-1.5">
              <span className="text-body font-bold">{fa.auth.signupQuizInput(position)}</span>
              <input
                list="hanaso-bip39-words"
                dir="ltr"
                value={answers[position] ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [position]: e.target.value }))}
                className="rounded-md border-2 border-indigo/40 bg-paper px-3 py-2 font-mono text-small text-ink focus-visible:border-indigo focus-visible:outline-2 focus-visible:outline-ai"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          ))}
          <datalist id="hanaso-bip39-words">
            {wordlist.map((w) => (
              <option key={w} value={w} />
            ))}
          </datalist>
          <Button size="main" loading={busy} onClick={() => void verify()}>
            {fa.auth.signupQuizSubmit}
          </Button>
          <button
            type="button"
            onClick={() => void refetchPhrase()}
            className="self-start text-micro font-bold text-indigo underline decoration-2 underline-offset-4"
          >
            {fa.auth.signupShowPhraseAgain}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col gap-4">
          <p className="rounded-md border-2 border-matcha/60 bg-matcha-wash px-3 py-3 text-body font-black text-ink">
            {fa.auth.signupOk}
          </p>
          <Button size="main" onClick={() => router.push('/')}>
            {fa.notFound.backHome}
          </Button>
        </div>
      )}

      {step === 'failed' && (
        <div className="flex flex-col gap-4">
          <p className="text-small text-ink-soft">{fa.auth.signupExpired}</p>
          <Button size="main" onClick={restart}>
            {fa.auth.signupRetry}
          </Button>
        </div>
      )}
    </section>
  );
}
