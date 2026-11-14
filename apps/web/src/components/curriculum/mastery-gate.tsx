'use client';
/**
 * HANASO — MasteryGate (TASK-LEARNING-01) — stage D client island.
 *
 * Flow (DD-048): replay the anchor dialogue with LESS support (subtitles hidden
 * until tapped — the anchor player page handles replay; here we offer the audio
 * re-listen) → answer the 10-question gate bank (server-graded — answers NEVER
 * in the client) → qualitative verdict (AC-947: no raw % — the 「理解」 seal)
 * → point-return remediation map on failure (max 3 loops per session).
 *
 * TASK-HANASO-25 (BUG-001): kana-listening gate items now carry promptAudio
 * (attached by the assessment page — same contract as the journey station
 * page). The sound IS the question: it auto-plays when the question appears
 * and the replay control stays visible. Recognition/decode items NEVER get a
 * sound here — the sound equals the answer for those types.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CircleCheck, Ear, Loader2, RotateCcw, Volume2 } from 'lucide-react';
import { fa } from '@/messages/fa';
import type { ClientExercise } from '@/modules/curriculum/grading';
import { JaBlock } from '@/components/patterns/ja-block';
import { LineAudioButton } from './line-audio-button';
import { getCachedAudio, reportPlaybackError } from '@/modules/audio/client-cache';

export interface MasteryGateProps {
  chapterSlug: string;
  exercises: ClientExercise[];
  audioByLine: Record<string, string>;
  audioAvailable: boolean;
  /** slug → Persian title (data-driven — no hardcoded station names). */
  stationTitles: Record<string, string>;
}

type Phase = 'intro' | 'questions' | 'result';
type GateResult = {
  outcome: 'passed' | 'remediate' | 'incomplete';
  remediationStations: string[];
  wrongByMeasure: Record<string, string[]>;
};

export function MasteryGate({ chapterSlug, exercises, audioByLine, audioAvailable, stationTitles }: MasteryGateProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Record<string, { kind: string; optionId?: string; orderedIds?: string[]; chipOrder?: string[] }>
  >({});
  const [selected, setSelected] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GateResult | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);

  const ex = exercises[index];
  const isLast = index === exercises.length - 1;
  const answeredCount = Object.keys(answers).length;

  /* TASK-HANASO-25 (BUG-001): a listening question's sound auto-plays once
   * when the question appears (the sound IS the question). Same policy as
   * exercise-session.tsx — normal speed 1.0, replayable. Round-1 C4: the
   * cleanup PAUSES the outgoing element so two questions' sounds can never
   * overlap when the audio URL changes mid-playback. */
  const listenPrompt = ex?.type === 'kana-listening' || ex?.type === 'rule-listening' ? (ex.promptAudio ?? null) : null;
  useEffect(() => {
    if (!listenPrompt) return;
    const el = getCachedAudio(listenPrompt.opus);
    if (!el) return;
    try {
      el.playbackRate = 1;
      el.preservesPitch = true;
      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.then === 'function') p.catch(() => reportPlaybackError(el.src));
    } catch {
      reportPlaybackError(listenPrompt.opus);
    }
    return () => {
      try {
        el.pause();
      } catch {
        /* already torn down */
      }
    };
  }, [index, listenPrompt?.opus]);

  const record = useCallback(() => {
    if (!ex) return;
    if (ex.options) {
      if (selected) setAnswers((a) => ({ ...a, [ex.id]: { kind: 'option', optionId: selected } }));
    } else if (ex.chunks) {
      if (ordered.length) setAnswers((a) => ({ ...a, [ex.id]: { kind: 'order', orderedIds: ordered } }));
    }
  }, [ex, ordered, selected]);

  const submit = useCallback(async () => {
    record();
    setSubmitting(true);
    try {
      const payload = { ...answers };
      if (ex) {
        if (ex.options && selected) payload[ex.id] = { kind: 'option', optionId: selected };
        if (ex.chunks) payload[ex.id] = { kind: 'order', orderedIds: ordered };
      }
      const res = await fetch('/api/curriculum/mastery', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chapterSlug, answers: payload }),
      });
      const json = (await res.json()) as { data?: GateResult; error?: { code?: string; message?: string } };
      if (res.ok && json.data) {
        setResult(json.data);
        setPhase('result');
      } else {
        // e.g. 409 mastery/gate_locked — the walk is incomplete (direct URL entry)
        setGateError(
          json.error?.code === 'mastery/gate_locked'
            ? 'دروازهٔ فهم هنوز بسته است — اول همهٔ ایستگاه‌های اصلی مسیر را کامل کن.'
            : (json.error?.message ?? 'ارسال پاسخ‌ها ناموفق بود — دوباره تلاش کن.'),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [answers, chapterSlug, ex, ordered, record, selected]);

  if (phase === 'intro') {
    return (
      <div className="flex flex-col gap-5 rounded-md border-2 border-shu bg-card p-6">
        <h2 className="text-h2 font-bold">{fa.curriculum.gateTitle}</h2>
        <p className="text-body leading-[var(--leading-fa)] text-ink">{fa.curriculum.gateLead}</p>
        <div className="flex flex-col gap-2 rounded-md bg-surface-warm p-4">
          <p className="text-body font-bold">{fa.curriculum.gateReplay}</p>
          <p className="text-small text-ink-soft">
            اگر جایی از فصل برایت تازه مانده، مسیر ایستگاه‌ها را دوباره ببین. در پرسش‌های شنیداری فقط صدا داری.
          </p>
          <Link
            href={`/learn/${chapterSlug}/journey`}
            className="flex h-11 w-fit items-center gap-2 rounded-md border border-ai px-5 text-body font-bold text-ai transition-colors hover:bg-indigo-wash"
          >
            <RotateCcw aria-hidden className="size-4" />
            {fa.curriculum.gateReplay}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setPhase('questions')}
          className="flex h-12 w-fit items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-[background-color,translate] hover:bg-indigo-deep active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
        >
          {fa.curriculum.gateStart}
          <ArrowLeft aria-hidden className="size-4" />
        </button>
      </div>
    );
  }

  if (phase === 'result' && result) {
    const passed = result.outcome === 'passed';
    return (
      <div
        role="status"
        aria-live="polite"
        className={[
          'flex flex-col gap-5 rounded-md border-2 p-6',
          passed ? 'border-success bg-card' : 'border-warning bg-card',
        ].join(' ')}
      >
        {passed ? (
          <>
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="grid size-16 place-items-center rounded-full border-2 border-success text-h2 font-black text-success"
              >
                理解
              </span>
              <div>
                <h2 className="text-h2 font-bold text-success">{fa.curriculum.gatePassedTitle}</h2>
                <p className="mt-1 text-body text-ink-soft">{fa.curriculum.gatePassedBody}</p>
              </div>
            </div>
            <Link
              href={`/learn/${chapterSlug}/complete`}
              className="flex h-12 w-fit items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-[background-color,translate] hover:bg-indigo-deep active:translate-y-px"
            >
              {fa.curriculum.viewResult}
              <ArrowLeft aria-hidden className="size-4" />
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="grid size-16 place-items-center rounded-full border-2 border-warning text-h2 font-black text-warning"
              >
                もう一度
              </span>
              <div>
                <h2 className="text-h2 font-bold text-warning">{fa.curriculum.gateFailedTitle}</h2>
                <p className="mt-1 text-body text-ink-soft">{fa.curriculum.gateFailedBody}</p>
              </div>
            </div>
            <ul className="flex flex-col gap-2">
              {(result.remediationStations ?? []).map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/learn/${chapterSlug}/journey/${slug}`}
                    className="flex min-h-11 items-center gap-2 rounded-md border border-ai bg-indigo-wash/40 px-4 text-body transition-colors hover:bg-indigo-wash"
                  >
                    <CircleCheck aria-hidden className="size-4 text-ai" />
                    {stationTitles[slug] ?? slug}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={`/learn/${chapterSlug}/journey`}
              className="flex h-11 w-fit items-center gap-2 rounded-md border border-ink-faint px-5 text-body font-bold text-ink transition-colors hover:bg-surface-warm"
            >
              {fa.curriculum.backToJourney}
            </Link>
          </>
        )}
      </div>
    );
  }

  if (!ex) return null;

  const remaining = ex.chunks?.filter((c) => !ordered.includes(c.id)) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-2">
        <p className="text-small text-ink-soft">
          {fa.curriculum.gateQuestion} {faNum(index + 1)} {fa.curriculum.gateOf} {faNum(exercises.length)}
        </p>
        <p className="text-caption text-ink-faint">
          {faNum(answeredCount)} از {faNum(exercises.length)}
        </p>
      </header>

      <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-ai transition-[width] duration-300"
          style={{ width: `${((index + 1) / exercises.length) * 100}%` }}
        />
      </div>

      <section className="flex flex-col gap-4 rounded-md border border-ink-faint bg-card p-5">
        <p className="text-body font-medium">{ex.promptFa}</p>

        {/* TASK-HANASO-25 (BUG-001): the listening question's own sound — replay
            control always visible (auto-play happens on question change above).
            No glyph text is shown: the shapes live in the options. */}
        {listenPrompt ? (
          <div
            className="flex flex-wrap items-center gap-3 rounded-md border border-ai/40 bg-indigo-wash/30 p-4"
            data-listen-question
          >
            <button
              type="button"
              onClick={() => {
                const el = getCachedAudio(listenPrompt.opus);
                if (!el) return;
                try {
                  el.pause();
                  el.playbackRate = 1;
                  try {
                    el.preservesPitch = true;
                  } catch {
                    /* engines without the property */
                  }
                  el.currentTime = 0;
                  el.onerror = () => {
                    if (listenPrompt.m4a && !el.src.endsWith(listenPrompt.m4a)) {
                      el.src = listenPrompt.m4a;
                      void el.play().catch(() => reportPlaybackError(el.src));
                    } else {
                      reportPlaybackError(el.src);
                    }
                  };
                  const p = el.play();
                  if (p && typeof p.then === 'function') p.catch(() => reportPlaybackError(el.src));
                } catch {
                  reportPlaybackError(listenPrompt.opus);
                }
              }}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-ai bg-card px-4 text-small font-bold text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
              aria-label={fa.curriculum.exHearQuestionSoundAria}
              data-question-audio="gate-replay"
            >
              <Volume2 aria-hidden className="size-5" />
              {fa.curriculum.exHearQuestionSound}
            </button>
            <span className="text-caption leading-[var(--leading-fa)] text-ink-soft">
              {fa.curriculum.exListenAutoNote}
            </span>
          </div>
        ) : null}

        {ex.audioLineRef && (
          <div className="flex items-center gap-3 rounded-md bg-surface-warm p-3">
            <LineAudioButton
              lineId={ex.audioLineRef}
              audioUrl={audioByLine[ex.audioLineRef] ?? ''}
              audioAvailable={audioAvailable}
              rate={0.9}
            />
            <span className="flex items-center gap-1.5 text-small text-ink-soft">
              <Ear aria-hidden className="size-4 shrink-0" />
              فقط گوش کن
            </span>
          </div>
        )}

        {(ex.promptJa || ex.clozeTokens) && (
          <div className="rounded-md bg-surface-warm p-4">
            {ex.clozeTokens ? (
              <JaBlock className="text-lead">
                {ex.clozeTokens.map((tok, i) =>
                  tok === null ? <span key={i}>＿＿</span> : <span key={i}>{tok}</span>,
                )}
              </JaBlock>
            ) : (
              <JaBlock className="text-lead">{ex.promptJa}</JaBlock>
            )}
          </div>
        )}

        {ex.options ? (
          <div role="radiogroup" className="flex flex-col gap-2">
            {ex.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected === opt.id}
                onClick={() => setSelected(opt.id)}
                className={[
                  'min-h-11 rounded-md border px-4 py-3 text-start text-body transition-colors',
                  selected === opt.id
                    ? 'border-ai bg-indigo-wash font-bold'
                    : 'border-ink-faint bg-card hover:border-ai',
                ].join(' ')}
              >
                <span dir="auto">{opt.label}</span>
              </button>
            ))}
          </div>
        ) : ex.chunks ? (
          <div className="flex flex-col gap-3">
            <div
              className="flex min-h-14 flex-wrap items-center gap-2 rounded-md border border-dashed border-ink-faint bg-card p-3"
              dir="ltr"
              lang="ja"
            >
              {ordered.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setOrdered((o) => o.filter((x) => x !== id))}
                  className="rounded-sm border border-ink-faint bg-surface-warm px-3 py-2 text-ja"
                >
                  {ex.chunks!.find((c) => c.id === id)?.ja}
                </button>
              ))}
              {ordered.length === 0 && <span className="text-small text-ink-faint">…</span>}
            </div>
            <div className="flex flex-wrap gap-2" dir="ltr" lang="ja">
              {remaining.map((chunk) => (
                <button
                  key={chunk.id}
                  type="button"
                  onClick={() => setOrdered((o) => [...o, chunk.id])}
                  className="rounded-sm border border-ink-faint bg-card px-3 py-2 text-ja transition-colors hover:border-ai"
                >
                  {chunk.ja}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {gateError && (
        <div role="alert" className="flex flex-col gap-2 rounded-md border border-error bg-card p-4 text-body">
          <p>{gateError}</p>
          <Link href={`/learn/${chapterSlug}/journey`} className="w-fit font-bold text-ai underline underline-offset-4">
            {fa.curriculum.backToJourney}
          </Link>
        </div>
      )}

      <div className="flex items-center gap-3">
        {index > 0 && (
          <button
            type="button"
            onClick={() => {
              record();
              const prev = exercises[index - 1]!;
              setIndex(index - 1);
              setSelected(prev.options ? (answers[prev.id]?.optionId ?? null) : null);
              setOrdered(prev.chunks ? ((answers[prev.id]?.orderedIds as string[] | undefined) ?? []) : []);
            }}
            className="h-11 rounded-md border border-ink-faint px-5 text-body font-bold text-ink transition-colors hover:bg-surface-warm"
          >
            قبلی
          </button>
        )}
        {!isLast ? (
          <button
            type="button"
            onClick={() => {
              record();
              const nxt = exercises[index + 1]!;
              setIndex(index + 1);
              setSelected(nxt.options ? (answers[nxt.id]?.optionId ?? null) : null);
              setOrdered(nxt.chunks ? ((answers[nxt.id]?.orderedIds as string[] | undefined) ?? []) : []);
            }}
            disabled={ex.options ? !selected : ex.chunks ? ordered.length !== ex.chunks.length : true}
            className="flex h-11 items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-[background-color,translate] hover:bg-indigo-deep active:translate-y-px disabled:opacity-45"
          >
            {fa.curriculum.continueBlock}
            <ArrowLeft aria-hidden className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting || (ex.options ? !selected : ex.chunks ? ordered.length !== ex.chunks.length : true)}
            aria-busy={submitting}
            data-testid="gate-submit"
            className="flex h-11 items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-[background-color,translate] hover:bg-indigo-deep active:translate-y-px disabled:opacity-45"
          >
            {/* TASK-HANASO-22 §11: a slow network must SHOW the click registered. */}
            {submitting ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            {fa.curriculum.gateSubmit}
          </button>
        )}
      </div>
    </div>
  );
}

function faNum(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}
