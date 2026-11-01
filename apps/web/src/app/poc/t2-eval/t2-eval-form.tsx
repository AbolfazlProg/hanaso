'use client';
/**
 * HANASO — T2 blind speaker-identification form (TASK-DLG-POC-01 / KB dialogue-technical-poc-plan §۲).
 *
 * Plays placeholder audio line-by-line with the text HIDDEN; the evaluator picks who spoke.
 * ≥80% correct over ≥5 judgments = the T2 pass criterion (evaluated by the owner on Preview
 * with real voices — with placeholder sines this form only exercises the procedure).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CharacterRef, Dialogue } from '@/modules/dialogue';

interface BundleResponse {
  ok: boolean;
  data?: {
    dialogue: Dialogue;
    characters: CharacterRef[];
    audio: { available: boolean; note?: string; entries: { lineId: string; files: { opus: string; m4a: string } }[] };
  };
  error?: { code: string; message: string };
}

interface Trial {
  lineId: string;
  url: string;
  correctSpeaker: string;
}

const TRIALS = 10;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function T2EvalForm() {
  const [bundle, setBundle] = useState<NonNullable<BundleResponse['data']> | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [index, setIndex] = useState(-1); // -1 = not started
  const [answers, setAnswers] = useState<{ lineId: string; picked: string; correct: string; ok: boolean }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/dialogues/cafe-morning-01')
      .then(async (res) => {
        const body = (await res.json()) as BundleResponse;
        if (cancelled) return;
        if (!body.ok || !body.data) throw new Error(body.error?.message ?? `HTTP ${res.status}`);
        setBundle(body.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback(() => {
    if (!bundle) return;
    const byLine = new Map(bundle.audio.entries.map((e) => [e.lineId, e]));
    const picked = shuffle(bundle.dialogue.lines)
      .slice(0, TRIALS)
      .map((l) => ({
        lineId: l.id,
        url: byLine.get(l.id)?.files.opus ?? '',
        correctSpeaker: l.speaker,
      }));
    setTrials(picked);
    setAnswers([]);
    setIndex(0);
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 't2_eval_started', props: { trials: picked.length } }),
    }).catch(() => {});
  }, [bundle]);

  const playCurrent = useCallback(() => {
    const t = trials[index];
    if (!t || !t.url) return;
    void new Audio(t.url).play().catch(() => {
      /* browser gesture policy — the button click is the gesture; ignore transient failures */
    });
  }, [trials, index]);

  const answer = useCallback(
    (speakerId: string) => {
      const t = trials[index];
      if (!t) return;
      setAnswers((a) => [
        ...a,
        { lineId: t.lineId, picked: speakerId, correct: t.correctSpeaker, ok: speakerId === t.correctSpeaker },
      ]);
      setIndex((i) => i + 1);
    },
    [trials, index],
  );

  const finished = index >= trials.length && trials.length > 0;
  const correctCount = useMemo(() => answers.filter((a) => a.ok).length, [answers]);

  useEffect(() => {
    if (!finished || answers.length === 0) return;
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 't2_eval_completed',
        props: { correct: correctCount, total: answers.length, rate: correctCount / answers.length },
      }),
    }).catch(() => {});
  }, [finished, answers, correctCount]);

  if (loadError) {
    return <p role="alert">بارگذاری دیالوگ ناموفق بود: {loadError}</p>;
  }
  if (!bundle) return <p className="text-ink-soft">در حال بارگذاری…</p>;

  return (
    <div className="flex flex-col gap-4">
      {bundle.audio.available ? null : (
        <p className="rounded-md border border-ink-faint bg-surface-sunken px-4 py-2 text-small text-ink-soft">
          {bundle.audio.note} — این فرم بعد از تولید صداها معنادار است.
        </p>
      )}

      {index === -1 && (
        <div className="flex flex-col gap-3 rounded-lg border border-ink-faint bg-paper p-4">
          <p className="text-body">
            {TRIALS} جمله پخش می‌شود؛ متن پنهان است. پس از شنیدن، بگویید <b>چه کسی</b> حرف زده است. معیار قبولی T2:
            تشخیص صحیح ≥۸۰٪ توسط هر ارزیاب.
          </p>
          <button type="button" onClick={start} className="self-start rounded-md bg-ai px-4 py-2 text-small text-paper">
            شروع ارزیابی دوسوکور
          </button>
        </div>
      )}

      {index >= 0 && !finished && trials[index] && (
        <div className="flex flex-col gap-3 rounded-lg border border-ink-faint bg-paper p-4">
          <p className="text-small text-ink-soft">
            جملهٔ {index + 1} از {trials.length} — پاسخ‌های درست تاکنون: {correctCount}
          </p>
          <button
            type="button"
            onClick={playCurrent}
            className="self-start rounded-md bg-ai px-4 py-2 text-small text-paper"
          >
            ▶ پخش جمله
          </button>
          <div className="flex flex-wrap gap-2">
            {bundle.characters.map((c, ci) => (
              <button
                key={c.id}
                type="button"
                onClick={() => answer(c.id)}
                className="rounded-md border border-ink-faint px-4 py-2 text-small"
                style={{ borderColor: `var(--color-speaker-${ci + 1})` }}
              >
                {c.nameFa}
              </button>
            ))}
          </div>
        </div>
      )}

      {finished && (
        <div className="flex flex-col gap-3 rounded-lg border-2 border-ai bg-paper p-4" aria-live="polite">
          <h3 className="text-h3 font-bold text-ai">
            تشخیص درست: {correctCount} از {answers.length} ({Math.round((correctCount / answers.length) * 100)}٪)
          </h3>
          <p className="text-small text-ink-soft">
            معیار T2: ≥۸۰٪ (n≥۵ ارزیاب، دوسوکور). این اجرا با صداهای placeholder سینوسی است؛ نتیجهٔ معتبر پس از تولید
            VOICEVOX در Preview توسط مالک/ارزیاب‌ها ثبت می‌شود.
          </p>
          <ol className="flex flex-col gap-1 text-small">
            {answers.map((a, i) => (
              <li key={`${a.lineId}-${i}`} className={a.ok ? 'text-success' : 'text-error'}>
                {a.ok ? '✓' : '✗'} — گفته‌شده توسط{' '}
                {bundle.characters.find((c) => c.id === a.correct)?.nameFa ?? a.correct}
                {a.ok ? '' : `، شما گفتید ${bundle.characters.find((c) => c.id === a.picked)?.nameFa ?? a.picked}`}
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={start}
            className="self-start rounded-md border border-ink-faint px-4 py-2 text-small"
          >
            ارزیابی دوباره
          </button>
        </div>
      )}
    </div>
  );
}
