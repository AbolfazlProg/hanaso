'use client';

/**
 * HANASO — PracticeHub (TASK-HANASO-22) — the interactive half of /practice.
 *
 * Renders the server-computed honest status (focused targets / mixed unlock /
 * weak suggestions / review note) and runs the practice session INLINE:
 * generate → answer×n → complete, with a safe exit that records what was
 * answered. All state changes show immediate visual feedback (mission §11 —
 * every click answers), and nothing is announced as success before the
 * server confirms (the complete response drives the recap).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CircleCheck, CircleAlert, Dumbbell, Layers, Lightbulb, Loader2, Repeat2, Target, Volume2 } from 'lucide-react';
import { fa } from '@/messages/fa';
import type { ClientPracticeItem } from '@/modules/practice/session';
import { KANA_DIMENSION_LABELS_FA, isKanaDimension } from '@/modules/practice/kana/dimensions';

/* ------------------------------------------------------------------ view types */

export interface PracticeStatusView {
  completedStations: number;
  focusTargets: { stationSlug: string; titleFa: string }[];
  mixedUnlocked: boolean;
  mixedMinStations: number;
  eligibleForReview: number;
  weakObjects: { objectId: string; labelFa: string }[];
  recentSessions: { id: string; kind: 'focused' | 'mixed'; items: number; firstTryCorrect: number; completedAt: string | null }[];
}

interface GeneratedSession {
  sessionId: string;
  kind: 'focused' | 'mixed';
  noteFa: string | null;
  items: ClientPracticeItem[];
}

interface CompleteOutcome {
  items: number;
  firstTryCorrect: number;
  newlyEligible: number;
}

const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

/* ------------------------------------------------------------------ hub */

export function PracticeHub({ status }: { status: PracticeStatusView }) {
  const [session, setSession] = useState<GeneratedSession | null>(null);
  const [busy, setBusy] = useState<null | 'focused' | 'mixed'>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async (kind: 'focused' | 'mixed', scopeKey: string) => {
    setError(null);
    setBusy(kind);
    try {
      const res = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'generate', skill: 'kana', kind, scopeKey }),
      });
      const json = (await res.json()) as { data?: GeneratedSession; error?: { message?: string } };
      if (!res.ok || !json.data) {
        setError(json.error?.message ?? fa.practice.loadFailed);
        return;
      }
      setSession(json.data);
    } catch {
      setError(fa.practice.loadFailed);
    } finally {
      setBusy(null);
    }
  }, []);

  if (session) {
    return (
      <PracticeSessionRunner
        session={session}
        onExit={(outcome) => {
          setSession(null);
          if (outcome) window.location.reload(); // refresh the honest hub numbers
        }}
      />
    );
  }

  const lastFocus = status.focusTargets[status.focusTargets.length - 1];

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Focused practice card ---- */}
      <article className="rounded-md border-2 border-indigo bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <p className="flex items-center gap-2 text-caption font-bold uppercase tracking-[0.14em] text-ink-faint">
          <Target aria-hidden className="size-4" />
          {fa.practice.focusedTitle}
        </p>
        <h2 className="mt-2 text-h2 font-black text-ink">{fa.practice.focusedTitle}</h2>
        <p className="mt-1 text-small leading-[var(--leading-fa)] text-ink-soft">{fa.practice.focusedBody}</p>
        {lastFocus ? (
          <>
            <p className="mt-4 text-body font-bold text-ink">{lastFocus.titleFa}</p>
            <button
              type="button"
              onClick={() => void start('focused', lastFocus.stationSlug)}
              disabled={busy !== null}
              data-testid="start-focused"
              className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai disabled:opacity-45"
            >
              {busy === 'focused' ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
              {busy === 'focused' ? fa.practice.loadingSession : fa.practice.startFocused}
              {busy !== 'focused' ? <ArrowLeft aria-hidden className="size-4" /> : null}
            </button>
            {status.focusTargets.length > 1 ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-small text-ai underline underline-offset-4">
                  درس‌های تمرین‌شدنی دیگر ({faNum(status.focusTargets.length)})
                </summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {status.focusTargets.slice(0, -1).map((t) => (
                    <li key={t.stationSlug}>
                      <button
                        type="button"
                        onClick={() => void start('focused', t.stationSlug)}
                        disabled={busy !== null}
                        className="text-small text-ink-soft underline underline-offset-4 hover:text-ai disabled:opacity-45"
                      >
                        {t.titleFa}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : (
          <p className="mt-4 rounded-md border border-ink-faint bg-surface-warm px-4 py-3 text-small leading-[var(--leading-fa)] text-ink-soft">
            {fa.practice.noTargets}
          </p>
        )}
      </article>

      {/* ---- Mixed practice card ---- */}
      <article
        className={
          status.mixedUnlocked
            ? 'rounded-md border-2 border-ink bg-card p-5 sm:p-6'
            : 'rounded-md border-2 border-dashed border-ink-faint bg-surface-warm p-5 sm:p-6'
        }
      >
        <p className="flex items-center gap-2 text-caption font-bold uppercase tracking-[0.14em] text-ink-faint">
          <Layers aria-hidden className="size-4" />
          {fa.practice.mixedTitle}
        </p>
        <h2 className="mt-2 text-h3 font-black text-ink">{fa.practice.mixedTitle}</h2>
        <p className="mt-1 text-small leading-[var(--leading-fa)] text-ink-soft">{fa.practice.mixedBody}</p>
        {status.mixedUnlocked ? (
          <button
            type="button"
            onClick={() => void start('mixed', 'chapter:kana-foundation-01')}
            disabled={busy !== null}
            data-testid="start-mixed"
            className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-md border-2 border-ink bg-paper px-6 text-body font-bold text-ink transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai disabled:opacity-45"
          >
            {busy === 'mixed' ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
            {busy === 'mixed' ? fa.practice.loadingSession : fa.practice.startMixed}
            {busy !== 'mixed' ? <ArrowLeft aria-hidden className="size-4" /> : null}
          </button>
        ) : (
          <p className="mt-4 text-small leading-[var(--leading-fa)] text-ink-soft">
            {fa.practice.mixedLockedBody(status.mixedMinStations)}
          </p>
        )}
      </article>

      {error ? (
        <p role="alert" className="flex items-center gap-2 rounded-md border border-error bg-card px-4 py-3 text-small text-error">
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {/* ---- weak suggestions (evidence-backed only) ---- */}
      {status.weakObjects.length > 0 ? (
        <section className="rounded-md border border-shu/50 bg-card p-5">
          <h3 className="flex items-center gap-2 text-h3 font-bold text-shu">
            <Lightbulb aria-hidden className="size-5" />
            {fa.practice.weakTitle}
          </h3>
          <p className="mt-1 text-small text-ink-soft">{fa.practice.weakBody}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {status.weakObjects.map((w) => (
              <li
                key={w.objectId}
                lang="ja"
                dir="ltr"
                className="rounded-full border border-ink-faint bg-surface-warm px-3 py-1 text-small text-ink"
              >
                {w.labelFa}
              </li>
            ))}
          </ul>
          {status.mixedUnlocked ? (
            <p className="mt-3 text-caption text-ink-soft">«{fa.practice.startMixed}» این موارد را با وزن بیشتری تمرین می‌کند.</p>
          ) : null}
        </section>
      ) : null}

      {/* ---- honest review line + recent sessions ---- */}
      <p className="flex items-start gap-2.5 rounded-md border border-ink-faint bg-surface-warm px-4 py-3 text-small leading-[var(--leading-fa)] text-ink-soft">
        <Repeat2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-faint" />
        {status.eligibleForReview > 0
          ? `${fa.practice.eligibleCount(status.eligibleForReview)} ${fa.practice.reviewNote}`
          : fa.practice.reviewNote}
      </p>

      {status.recentSessions.length > 0 ? (
        <section className="rounded-md border border-ink-faint bg-card p-5">
          <h3 className="text-h3 font-bold text-ink">{fa.practice.recentTitle}</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {status.recentSessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 text-small text-ink-soft">
                <span className="flex items-center gap-2">
                  <Dumbbell aria-hidden className="size-3.5" />
                  {s.kind === 'focused' ? fa.practice.focusedTitle : fa.practice.mixedTitle}
                </span>
                <span>
                  {faNum(s.firstTryCorrect)} / {faNum(s.items)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ session runner */

type Feedback = { correct: boolean; revealFa?: string } | null;

export function PracticeSessionRunner({
  session,
  onExit,
}: {
  session: GeneratedSession;
  onExit: (outcome: CompleteOutcome | null) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [attemptNo, setAttemptNo] = useState(1);
  const [busy, setBusy] = useState(false);
  const [recap, setRecap] = useState<CompleteOutcome | null>(null);
  const [completing, setCompleting] = useState(false);
  const answeredRef = useRef<{ itemId: string; ms: number }[]>([]);
  const itemStartRef = useRef<number>(Date.now());
  const gradingRef = useRef(false);

  const item = session.items[index];
  const isLast = index === session.items.length - 1;
  const dimensionLabel = item && isKanaDimension(item.dimension) ? KANA_DIMENSION_LABELS_FA[item.dimension] : null;

  useEffect(() => {
    itemStartRef.current = Date.now();
  }, [index]);

  /* auto-play the sound when the sound IS the question (K3/K6 — lesson parity). */
  useEffect(() => {
    const audio = item?.interaction.kind === 'choice' || item?.interaction.kind === 'write' ? item.interaction.promptAudio : null;
    if (!audio) return;
    const el = new Audio(audio.m4a);
    el.play().catch(() => {
      /* autoplay blocked — the visible replay control covers it (lesson rule). */
    });
    return () => {
      el.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- per-item autoplay only
  }, [index]);

  const answer = useCallback(
    async (payload: { kind: 'choice'; optionId: string } | { kind: 'write'; accepted: boolean }) => {
      if (!item || gradingRef.current) return;
      gradingRef.current = true;
      setBusy(true);
      try {
        const res = await fetch('/api/practice', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'answer', sessionId: session.sessionId, itemId: item.id, attemptNo, answer: payload }),
        });
        const json = (await res.json()) as { data?: { correct: boolean; revealFa?: string }; error?: { message?: string } };
        if (!res.ok || !json.data) {
          setFeedback({ correct: false, revealFa: json.error?.message ?? fa.practice.loadFailed });
          return;
        }
        setFeedback({ correct: json.data.correct, revealFa: json.data.revealFa });
        if (attemptNo === 1 || json.data.correct) {
          answeredRef.current.push({ itemId: item.id, ms: Date.now() - itemStartRef.current });
        }
      } catch {
        setFeedback({ correct: false, revealFa: fa.practice.loadFailed });
      } finally {
        gradingRef.current = false;
        setBusy(false);
      }
    },
    [attemptNo, item, session.sessionId],
  );

  const complete = useCallback(
    async (exitEarly: boolean) => {
      setCompleting(true);
      try {
        const res = await fetch('/api/practice', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'complete', sessionId: session.sessionId, items: answeredRef.current }),
        });
        const json = (await res.json()) as { data?: CompleteOutcome };
        setRecap(
          json.data ?? { items: answeredRef.current.length, firstTryCorrect: 0, newlyEligible: 0 },
        );
      } catch {
        setRecap({ items: answeredRef.current.length, firstTryCorrect: 0, newlyEligible: 0 });
      } finally {
        setCompleting(false);
      }
      void exitEarly;
    },
    [session.sessionId],
  );

  const next = useCallback(() => {
    if (isLast) {
      void complete(false);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setFeedback(null);
    setAttemptNo(1);
  }, [complete, isLast]);

  /* ---------------- recap ---------------- */
  if (recap) {
    return (
      <section role="status" aria-live="polite" className="flex flex-col gap-4 rounded-md border border-success bg-card p-6" data-testid="practice-recap">
        <p className="flex items-center gap-2 text-h3 font-black text-success">
          <CircleCheck aria-hidden className="size-6" />
          {fa.practice.finishTitle}
        </p>
        <p className="text-body text-ink">{fa.practice.finishFirstTry(recap.firstTryCorrect, recap.items)}</p>
        <p className="text-small leading-[var(--leading-fa)] text-ink-soft">{fa.practice.finishNote}</p>
        <p className="text-caption leading-[var(--leading-fa)] text-ink-faint">{fa.practice.reviewNote}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onExit(recap)}
            className="flex h-12 items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            {fa.practice.backToHub}
            <ArrowLeft aria-hidden className="size-4" />
          </button>
          <Link
            href="/learn"
            className="flex h-12 items-center gap-2 rounded-md border border-ai px-6 text-body font-bold text-ai transition-colors hover:bg-indigo-wash"
          >
            {fa.nav.journey}
          </Link>
        </div>
      </section>
    );
  }

  if (!item) return null;

  /* ---------------- one item ---------------- */
  const canCheck = item.interaction.kind === 'choice' && selected !== null;
  const missedOnce = feedback !== null && !feedback.correct;

  return (
    <section className="flex flex-col gap-5" data-testid="practice-session" aria-label={fa.practice.title}>
      {/* progress header */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-small font-bold text-ink-soft">{fa.practice.sessionProgress(index + 1, session.items.length)}</p>
        {dimensionLabel ? (
          <span className="rounded-full border border-ink-faint bg-surface-warm px-3 py-1 text-caption text-ink-soft">
            {fa.practice.dimensionBadge(dimensionLabel)}
          </span>
        ) : null}
      </div>

      {/* prompt */}
      <div className="rounded-md bg-surface-warm p-4">
        <p className="text-body leading-[var(--leading-fa)] text-ink">{item.interaction.promptFa}</p>
        {item.interaction.kind === 'choice' && item.interaction.promptJa ? (
          item.interaction.promptJa.length <= 3 && /^[\u3040-\u30ff]+$/.test(item.interaction.promptJa) ? (
            <p lang="ja" dir="ltr" className="mt-3 flex justify-center">
              <span className="text-[clamp(3.25rem,14vw,5rem)] font-bold leading-[1.15] text-ink">{item.interaction.promptJa}</span>
            </p>
          ) : (
            <p lang="ja" dir="ltr" className="mt-3 text-center text-h2 font-bold text-ink">
              {item.interaction.promptJa}
            </p>
          )
        ) : null}
        {item.interaction.promptAudio ? (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => {
                const el = new Audio(item.interaction.kind === 'choice' || item.interaction.kind === 'write' ? item.interaction.promptAudio!.m4a : '');
                el.play().catch(() => {});
              }}
              aria-label={fa.practice.playAudio}
              className="grid size-14 place-items-center rounded-full border-2 border-ink bg-card text-ink transition-colors hover:border-ai hover:text-ai focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
            >
              <Volume2 aria-hidden className="size-6" />
            </button>
          </div>
        ) : null}
      </div>

      {/* options */}
      {item.interaction.kind === 'choice' ? (
        <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {item.interaction.options.map((opt) => {
            const isPicked = selected === opt.id;
            const isWrongPick = feedback && !feedback.correct && isPicked;
            const isRightPick = feedback?.correct && isPicked;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isPicked}
                disabled={feedback !== null}
                onClick={() => setSelected(opt.id)}
                data-testid={`practice-option`}
                className={[
                  'min-h-14 rounded-md border-2 px-4 text-start transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai',
                  /^[\u3040-\u30ff]+$/.test(opt.label) && opt.label.length <= 6
                    ? 'text-h2 font-bold'
                    : 'text-body font-medium',
                  isRightPick
                    ? 'border-success bg-card text-ink'
                    : isWrongPick
                      ? 'border-error bg-card text-ink'
                      : isPicked
                        ? 'border-ai bg-indigo-wash text-ink'
                        : 'border-ink-faint bg-card text-ink hover:border-ai',
                  'disabled:cursor-default',
                ].join(' ')}
                dir={/^[\u3040-\u30ff\u31f0-\u31ff]/.test(opt.label) ? 'ltr' : 'auto'}
                lang={/^[\u3040-\u30ff]/.test(opt.label) ? 'ja' : 'fa'}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : (
        <WriteItem
          character={item.interaction.character}
          onAccepted={() => void answer({ kind: 'write', accepted: true })}
        />
      )}

      {/* feedback (in-place, gentle — mission §4.3) */}
      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          data-practice-feedback
          className="flex flex-col gap-2 rounded-md border p-4 animate-[var(--anim-fade-up)]"
          style={{ borderColor: feedback.correct ? 'var(--color-success)' : 'var(--color-error)' }}
        >
          <p className="flex items-center gap-2 text-body font-bold" style={{ color: feedback.correct ? 'var(--color-success)' : 'var(--color-error)' }}>
            {feedback.correct ? <CircleCheck aria-hidden className="size-5" /> : <CircleAlert aria-hidden className="size-5" />}
            {feedback.correct ? fa.practice.correct : fa.practice.incorrect}
          </p>
          {feedback.revealFa ? (
            <p className="text-body leading-[var(--leading-fa)] text-ink" dir="auto">
              {feedback.revealFa}
            </p>
          ) : (
            <p className="text-small leading-[var(--leading-fa)] text-ink-soft">یک بار دیگر فکر کن و تلاش کن — پاسخ هنوز لو نرفته.</p>
          )}
        </div>
      ) : null}

      {/* actions */}
      <div className="flex flex-wrap items-center gap-3">
        {item.interaction.kind === 'choice' && feedback === null ? (
          <button
            type="button"
            onClick={() => void answer({ kind: 'choice', optionId: selected! })}
            disabled={!canCheck || busy}
            data-testid="practice-check"
            className="h-11 min-w-28 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai disabled:opacity-45"
          >
            {busy ? <Loader2 aria-hidden className="mx-auto size-4 animate-spin" /> : fa.practice.checkAnswer}
          </button>
        ) : null}
        {missedOnce && attemptNo < 2 ? (
          <button
            type="button"
            onClick={() => {
              setAttemptNo(2);
              setFeedback(null);
              setSelected(null);
            }}
            className="h-11 min-w-28 rounded-md border border-ai px-5 text-body font-bold text-ai transition-colors hover:bg-indigo-wash"
          >
            {fa.practice.tryAgain}
          </button>
        ) : null}
        {feedback !== null && (feedback.correct || attemptNo >= 2 || feedback.revealFa) ? (
          <button
            type="button"
            onClick={next}
            data-testid="practice-next"
            className="h-11 min-w-28 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            {isLast ? fa.practice.finishTitle : fa.practice.continue}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void complete(true)}
          disabled={completing || answeredRef.current.length === 0}
          className="ms-auto flex h-11 items-center gap-1 text-small text-ink-soft underline underline-offset-4 transition-colors hover:text-error disabled:opacity-45"
        >
          {completing ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
          {fa.practice.exit}
        </button>
      </div>

      {session.noteFa ? <p className="text-caption text-ink-faint">{session.noteFa}</p> : null}
      <p className="text-caption leading-[var(--leading-fa)] text-ink-faint">{fa.practice.writingNote}</p>
    </section>
  );
}

/* ------------------------------------------------------------------ write item */

function WriteItem({ character, onAccepted }: { character: string; onAccepted: () => void }) {
  /* The shared writing canvas judges locally (lesson parity). Lazy-loaded so
   * the hub stays light for choice-only users. */
  const [Canvas, setCanvas] = useState<React.ComponentType<React.ComponentProps<typeof import('@/components/writing/writing-canvas').WritingCanvas>> | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import('@/components/writing/writing-canvas').then((mod) => {
      if (!cancelled) setCanvas(() => mod.WritingCanvas);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const acceptedRef = useRef(false);
  if (!Canvas) {
    return (
      <div className="grid min-h-64 place-items-center rounded-md border border-ink-faint bg-card" role="status">
        <Loader2 aria-hidden className="size-6 animate-spin text-ink-faint" />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-ink-faint bg-card p-4">
      <Canvas
        character={character}
        mode="free"
        onAttemptComplete={() => {
          if (!acceptedRef.current) {
            acceptedRef.current = true;
            onAccepted();
          }
        }}
      />
      <p className="text-caption text-ink-soft">وقتی همهٔ ضربه‌ها پذیرفته شد، تمرین همین‌جا ثبت می‌شود.</p>
    </div>
  );
}
