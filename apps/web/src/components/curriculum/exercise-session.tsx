'use client';
/**
 * HANASO — ExerciseSession (TASK-LEARNING-01) — the interactive practice island.
 *
 * Three L2 interaction shapes (no IME yet — semi-free template builds per the
 * blueprint «قالب نیمه‌آزاد L2»): select (MCQ-3 / cloze / listening), order
 * (click-to-order), build (chip composer). Grading is SERVER-side via
 * /api/curriculum/station (answer key never in the client — SKL-013); the
 * F-ladder (F1 statement → F2 hint → F3 reveal) comes back from the server.
 *
 * A11y: feedback panel is in-place (not a modal) with role=status + aria-live
 * (SKL-002 §۳-۶); options are uniform (no color-only distinction — SKL-004 §۶).
 */
import { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Lightbulb } from 'lucide-react';
import { fa } from '@/messages/fa';
import type { ClientExercise } from '@/modules/curriculum/grading';
import { JaBlock } from '@/components/patterns/ja-block';
import { LineAudioButton } from './line-audio-button';

export interface ExerciseSessionProps {
  chapterSlug: string;
  stationSlug: string;
  exercises: ClientExercise[];
  audioByLine: Record<string, string>;
  audioAvailable: boolean;
  /** Fires after the whole set finishes with the first-try score (0..1). */
  onSessionDone?: (score: number, graded: number) => void;
}

interface GradeResponse {
  outcome: { correct: boolean; level: 0 | 1 | 2 | 3; feedbackFa: string; reveal?: string };
}

export function ExerciseSession({
  chapterSlug,
  stationSlug,
  exercises,
  audioByLine,
  audioAvailable,
  onSessionDone,
}: ExerciseSessionProps) {
  const [index, setIndex] = useState(0);
  const [attemptNo, setAttemptNo] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [nameValue, setNameValue] = useState('');
  const [feedback, setFeedback] = useState<GradeResponse['outcome'] | null>(null);
  const [busy, setBusy] = useState(false);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [hintRevealed, setHintRevealed] = useState(false);

  const ex = exercises[index];
  const total = exercises.length;
  const isLast = index === total - 1;

  const reset = useCallback(() => {
    setSelected(null);
    setOrdered([]);
    setBuilt([]);
    setFeedback(null);
    setAttemptNo(1);
    setHintRevealed(false);
  }, []);

  const grade = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true);
      try {
        const res = await fetch('/api/curriculum/station', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'grade',
            chapterSlug,
            stationSlug,
            exerciseId: ex!.id,
            attemptNo,
            answer: payload,
          }),
        });
        const json = (await res.json()) as { data?: GradeResponse; error?: unknown };
        const outcome = json.data?.outcome;
        if (!outcome) throw new Error('grade failed');
        setFeedback(outcome);
        if (outcome.correct && attemptNo === 1) setFirstTryCorrect((n) => n + 1);
        return outcome;
      } finally {
        setBusy(false);
      }
    },
    [attemptNo, chapterSlug, ex, stationSlug],
  );

  const check = useCallback(async () => {
    if (!ex) return;
    if (ex.options || ex.clozeTokens) {
      if (!selected) return;
      await grade({ kind: 'option', optionId: selected });
    } else if (ex.chunks) {
      if (ordered.length !== ex.chunks.length) return;
      await grade({ kind: 'order', orderedIds: ordered });
    } else if (ex.chips) {
      if (built.length !== ex.chips.length) return;
      await grade({ kind: 'build', chipOrder: built, nameValue });
    }
  }, [built, ex, grade, nameValue, ordered, selected]);

  const retry = useCallback(() => {
    setAttemptNo((n) => Math.min(3, n + 1));
    if (ex?.chips && ex.chips.some((c) => c.ja === '___NAME___')) {
      // keep built chips for the template (only reorder allowed), keep the name
      setBuilt([]);
    } else {
      reset();
    }
    setFeedback(null);
  }, [ex, reset]);

  const advance = useCallback(() => {
    if (isLast) {
      onSessionDone?.(firstTryCorrect / total, total);
      return;
    }
    setIndex((i) => i + 1);
    reset();
  }, [firstTryCorrect, isLast, onSessionDone, reset, total]);

  const remainingChunks = useMemo(() => ex?.chunks?.filter((c) => !ordered.includes(c.id)) ?? [], [ex, ordered]);
  const remainingChips = useMemo(() => ex?.chips?.filter((c) => !built.includes(c.id)) ?? [], [ex, built]);

  if (!ex) return null;

  const canCheck =
    ex.options || ex.clozeTokens
      ? selected !== null
      : ex.chunks
        ? ordered.length === ex.chunks.length
        : built.length === ex.chips!.length &&
          (!ex.chips!.some((c) => c.ja === '___NAME___') || nameValue.trim().length > 0);

  return (
    <section
      aria-label={`${fa.curriculum.gateQuestion} ${index + 1} ${fa.curriculum.gateOf} ${total}`}
      className="flex flex-col gap-4"
    >
      <header className="flex items-center justify-between gap-2">
        <p className="text-small text-ink-soft">
          {index + 1} / {total}
        </p>
        <p className="text-caption text-ink-soft">{skillLabel(ex.targetSkill)}</p>
      </header>

      <p className="text-body font-medium">{ex.promptFa}</p>

      {ex.audioLineRef && (
        <div className="flex items-center gap-3 rounded-md border border-ink-faint bg-card p-3">
          <LineAudioButton
            lineId={ex.audioLineRef}
            audioUrl={audioByLine[ex.audioLineRef] ?? ''}
            audioAvailable={audioAvailable}
            rate={0.9}
          />
          <span className="text-small text-ink-soft">🎧 فقط گوش کن</span>
        </div>
      )}

      {(ex.promptJa || ex.clozeTokens) && (
        <div className="rounded-md bg-surface-warm p-4">
          {ex.clozeTokens ? (
            <JaBlock className="text-lead">
              {ex.clozeTokens.map((tok, i) =>
                tok === null ? (
                  <span key={i} className="mx-1 inline-block min-w-16 border-b-2 border-shu text-center text-shu">
                    {selected ? labelFor(ex, selected) : '？'}
                  </span>
                ) : (
                  <span key={i}>{tok}</span>
                ),
              )}
            </JaBlock>
          ) : (
            <JaBlock className="text-lead">{ex.promptJa}</JaBlock>
          )}
          {ex.promptJaReading && ex.promptJa && (
            <p className="mt-2 text-caption text-ink-soft" dir="ltr" lang="ja">
              {ex.promptJaReading}
            </p>
          )}
        </div>
      )}

      {/* ---- select ---- */}
      {ex.options && (
        <div role="radiogroup" className="flex flex-col gap-2">
          {ex.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected === opt.id}
              disabled={feedback?.correct === true}
              onClick={() => setSelected(opt.id)}
              className={[
                'min-h-11 rounded-md border px-4 py-3 text-start text-body transition-colors',
                selected === opt.id
                  ? 'border-ai bg-indigo-wash text-ink'
                  : 'border-ink-faint bg-card text-ink hover:border-ai',
                feedback?.correct === true && feedback ? '' : '',
              ].join(' ')}
            >
              <span dir="auto">{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ---- order (click-to-order) ---- */}
      {ex.chunks && (
        <div className="flex flex-col gap-3">
          <div
            className="flex min-h-14 flex-wrap items-center gap-2 rounded-md border border-dashed border-ink-faint bg-card p-3"
            dir="ltr"
            lang="ja"
          >
            {ordered.map((id) => {
              const chunk = ex.chunks!.find((c) => c.id === id)!;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={feedback !== null}
                  onClick={() => setOrdered((o) => o.filter((x) => x !== id))}
                  className="rounded-sm border border-ink-faint bg-surface-warm px-3 py-2 text-ja"
                >
                  {chunk.ja}
                </button>
              );
            })}
            {ordered.length === 0 && <span className="text-small text-ink-faint">…</span>}
          </div>
          <div className="flex flex-wrap gap-2" dir="ltr" lang="ja">
            {remainingChunks.map((chunk) => (
              <button
                key={chunk.id}
                type="button"
                disabled={feedback !== null}
                onClick={() => setOrdered((o) => [...o, chunk.id])}
                className="rounded-sm border border-ink-faint bg-card px-3 py-2 text-ja transition-colors hover:border-ai"
              >
                {chunk.ja}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- build (template chips + free name slot) ---- */}
      {ex.chips && (
        <div className="flex flex-col gap-3">
          <div
            className="flex min-h-14 flex-wrap items-center gap-2 rounded-md border border-dashed border-ink-faint bg-card p-3"
            dir="ltr"
            lang="ja"
          >
            {built.map((id) => {
              const chip = ex.chips!.find((c) => c.id === id)!;
              return chip.ja === '___NAME___' ? (
                <input
                  key={id}
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  placeholder={fa.curriculum.typeYourName}
                  aria-label={fa.curriculum.typeYourName}
                  disabled={feedback !== null}
                  className="h-11 w-28 rounded-sm border border-ai bg-paper px-2 text-center text-body"
                  dir="auto"
                />
              ) : (
                <button
                  key={id}
                  type="button"
                  disabled={feedback !== null}
                  onClick={() => setBuilt((b) => b.filter((x) => x !== id))}
                  className="rounded-sm border border-ink-faint bg-surface-warm px-3 py-2 text-ja"
                >
                  {chip.ja}
                </button>
              );
            })}
            {built.length === 0 && <span className="text-small text-ink-faint">…</span>}
          </div>
          <div className="flex flex-wrap gap-2" dir="ltr" lang="ja">
            {remainingChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                disabled={feedback !== null}
                onClick={() => setBuilt((b) => [...b, chip.id])}
                className="rounded-sm border border-ink-faint bg-card px-3 py-2 text-ja transition-colors hover:border-ai"
              >
                {chip.ja}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- feedback panel (in-place, role=status — SKL-002 §۳-۶) ---- */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={[
            'flex flex-col gap-2 rounded-md border p-4',
            feedback.correct ? 'border-success bg-card' : 'border-error bg-card',
          ].join(' ')}
        >
          <p className="flex items-center gap-2 text-body font-bold">
            {feedback.correct ? (
              <>
                <CheckCircle2 aria-hidden className="size-5 text-success" />
                {fa.curriculum.correct}
              </>
            ) : (
              <>
                <CircleAlert aria-hidden className="size-5 text-error" />
                {fa.curriculum.incorrect}
              </>
            )}
          </p>
          <p className="text-body">{feedback.feedbackFa}</p>
          {feedback.reveal && (
            <p className="text-body text-ink-soft" dir="auto">
              ✓ {feedback.reveal}
            </p>
          )}
          {!feedback.correct && !feedback.reveal && attemptNo < 3 && (
            <button
              type="button"
              onClick={() => setHintRevealed(true)}
              className="flex w-fit items-center gap-1 text-small text-ai underline underline-offset-4"
            >
              <Lightbulb aria-hidden className="size-4" />
              {fa.curriculum.showHint}
            </button>
          )}
        </div>
      )}

      {/* ---- actions ---- */}
      <div className="flex flex-wrap items-center gap-3">
        {!feedback && (
          <button
            type="button"
            onClick={check}
            disabled={!canCheck || busy}
            className="h-11 min-w-28 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai disabled:opacity-45"
          >
            {fa.curriculum.checkAnswer}
          </button>
        )}
        {feedback && !feedback.correct && attemptNo < 3 && (
          <button
            type="button"
            onClick={retry}
            className="h-11 min-w-28 rounded-md border border-ai px-5 text-body font-bold text-ai transition-colors hover:bg-indigo-wash"
          >
            {fa.curriculum.tryAgain}
          </button>
        )}
        {feedback && (feedback.correct || attemptNo >= 3) && (
          <button
            type="button"
            onClick={advance}
            className="h-11 min-w-28 rounded-md bg-shu px-5 text-body font-bold text-paper transition-colors hover:bg-shu-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            {isLast ? fa.curriculum.stationDone : fa.curriculum.continueBlock}
          </button>
        )}
      </div>
      {hintRevealed && !feedback && <p className="text-small text-ink-soft">{fa.curriculum.showHint}…</p>}
    </section>
  );
}

function labelFor(ex: ClientExercise, optionId: string): string {
  return ex.options?.find((o) => o.id === optionId)?.label ?? '';
}

function skillLabel(skill: ClientExercise['targetSkill']): string {
  switch (skill) {
    case 'vocab':
      return 'واژگان';
    case 'grammar':
      return 'گرامر';
    case 'listening':
      return 'شنیداری';
    case 'expression':
      return 'عبارت‌ها';
    case 'production':
      return 'تولید';
    case 'structure':
      return 'ساختار';
  }
}
