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
 * TASK-LEARNING-07 Wave 3 (Issue #106 — feedback ladder client wiring):
 * - F2 elimination: on a wrong 2nd attempt the server eliminates one wrong
 *   option (`eliminateOptionIds`) — the row greys it out and NEVER re-sends it.
 * - F4 return-to-teaching: when the ladder is exhausted the server points at
 *   the authored teaching block (`referenceBlockId`) — «بازگشت به آموزش» hands
 *   the jump to the host runner (it owns the block order).
 *
 * TASK-LEARNING-08 (WP-5 — owner feedback D + E):
 * - AUTO-NEXT: a CORRECT answer advances automatically after a short,
 *   centrally-configured delay (src/config/experience.ts). Wrong answers NEVER
 *   auto-advance (retry/return-to-teaching stays the learner's choice). The
 *   manual «ادامه» button stays and clicking it during the delay advances
 *   immediately (timer cancelled — no double advance).
 * - WALK PROGRESS: every question transition reports {index, firstTryCorrect}
 *   to the host (StationRunner) which persists the walk snapshot — refresh /
 *   back / close-and-return resume at the same question.
 *
 * A11y: feedback panel is in-place (not a modal) with role=status + aria-live
 * (SKL-002 §۳-۶); options are uniform (no color-only distinction — SKL-004 §۶).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, Ear, Lightbulb } from 'lucide-react';
import { EXPERIENCE } from '@/config/experience';
import { fa } from '@/messages/fa';
import type { ClientExercise } from '@/modules/curriculum/grading';
import { mergeEliminated } from '@/modules/curriculum/station-walk';
import { JaBlock } from '@/components/patterns/ja-block';
import { LineAudioButton } from './line-audio-button';

export interface ExerciseSessionProps {
  chapterSlug: string;
  stationSlug: string;
  exercises: ClientExercise[];
  audioByLine: Record<string, string>;
  /** TASK-LEARNING-02: m4a fallback (dual-format — Reviewer-C S2). */
  audioFallbackByLine?: Record<string, string>;
  audioAvailable: boolean;
  /** Fires after the whole set finishes with the first-try score (0..1). */
  onSessionDone?: (score: number, graded: number) => void;
  /**
   * Issue #106 (F4): the host runner's «بازگشت به آموزش» handler — jumps the
   * walk back to the authored teaching block the server named. Absent = the
   * button stays hidden (e.g. hosts without a block order).
   */
  onReturnToBlock?: (blockId: string) => void;
  /**
   * TASK-LEARNING-08 (WP-5 — owner feedback E): restore the in-flight question
   * position for THIS exercise block (from the persisted walk snapshot).
   */
  initialProgress?: { index: number; firstTryCorrect: number };
  /**
   * TASK-LEARNING-08 (WP-5): fired on every question transition so the host can
   * persist the walk snapshot (never only at station end).
   */
  onProgress?: (progress: { index: number; firstTryCorrect: number }) => void;
}

interface GradeResponse {
  outcome: {
    correct: boolean;
    level: 0 | 1 | 2 | 3;
    feedbackFa: string;
    reveal?: string;
    /** #106 F2: wrong-option ids to grey out (wrong 2nd attempt). */
    eliminateOptionIds?: string[];
    /** #106 F4: teaching block to return to (ladder exhausted at F3). */
    referenceBlockId?: string;
  };
}

export function ExerciseSession({
  chapterSlug,
  stationSlug,
  exercises,
  audioByLine,
  audioFallbackByLine,
  audioAvailable,
  onSessionDone,
  onReturnToBlock,
  initialProgress,
  onProgress,
}: ExerciseSessionProps) {
  const [index, setIndex] = useState(() =>
    initialProgress ? Math.min(Math.max(0, initialProgress.index), Math.max(0, exercises.length - 1)) : 0,
  );
  const [attemptNo, setAttemptNo] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [nameValue, setNameValue] = useState('');
  const [feedback, setFeedback] = useState<GradeResponse['outcome'] | null>(null);
  const [busy, setBusy] = useState(false);
  const [firstTryCorrect, setFirstTryCorrect] = useState(() =>
    initialProgress ? Math.max(0, Math.min(initialProgress.firstTryCorrect, exercises.length)) : 0,
  );
  const [hintRevealed, setHintRevealed] = useState(false);
  /** #106 F2: option ids the server eliminated — they stay dead for every later attempt. */
  const [eliminated, setEliminated] = useState<string[]>([]);

  /**
   * WP-5 auto-next: the pending advance timer + a fired-once latch. The manual
   * «ادامه» button and the timer both funnel through advance() — whoever fires
   * FIRST wins; the latch makes the loser a no-op (no double advance, no race).
   */
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advancedRef = useRef(false);

  // report the in-flight position to the host on every question transition
  useEffect(() => {
    onProgress?.({ index, firstTryCorrect });
  }, [index, firstTryCorrect, onProgress]);

  // drop any pending auto-next timer when the block unmounts (back-nav, F4 return)
  useEffect(
    () => () => {
      if (autoNextTimerRef.current !== null) clearTimeout(autoNextTimerRef.current);
    },
    [],
  );

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
    setEliminated([]); // eliminations live inside ONE exercise, never across them
  }, []);

  const advance = useCallback(() => {
    // WP-5: manual + auto advance share this single gate — the second caller is a no-op.
    if (advancedRef.current) return;
    advancedRef.current = true;
    if (autoNextTimerRef.current !== null) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    if (isLast) {
      onSessionDone?.(firstTryCorrect / total, total);
      return; // stays latched — this block is done (host unmounts/replaces it)
    }
    setIndex((i) => i + 1);
    reset();
    // re-arm happens in the [index] effect — never synchronously here, so a
    // rapid double fire (timer + click in the same tick) cannot double-advance.
  }, [firstTryCorrect, isLast, onSessionDone, reset, total]);

  /**
   * WP-5 (owner feedback D): schedule the automatic advance after a CORRECT
   * answer. Delay comes from ONE config spot; a later-attempt correct answer
   * waits a touch longer (its feedback usually explains something). Wrong
   * answers NEVER auto-advance — retry and return-to-teaching are choices.
   */
  const scheduleAutoNext = useCallback(
    (wasFirstTry: boolean) => {
      if (autoNextTimerRef.current !== null) clearTimeout(autoNextTimerRef.current);
      const delay = wasFirstTry ? EXPERIENCE.autoNextDelayMsCorrect : EXPERIENCE.autoNextDelayMsCorrectAfterRetry;
      autoNextTimerRef.current = setTimeout(
        () => {
          autoNextTimerRef.current = null;
          advance();
        },
        Math.min(delay, EXPERIENCE.autoNextMaxDelayMs),
      );
    },
    [advance],
  );

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
        // #106 F2: fold the server's elimination into the persistent set and never
        // keep an eliminated option selected (the next attempt must not re-send it).
        if (outcome.eliminateOptionIds && outcome.eliminateOptionIds.length > 0) {
          const ids = outcome.eliminateOptionIds;
          setEliminated((cur) => mergeEliminated(cur, ids));
          setSelected((sel) => (sel !== null && ids.includes(sel) ? null : sel));
        }
        // WP-5 (owner feedback D): correct → auto-advance after the configured
        // delay; wrong → stays put (retry / return-to-teaching are the choices).
        if (outcome.correct) scheduleAutoNext(attemptNo === 1);
        return outcome;
      } catch {
        // Reviewer-B S1: never fail silently — a dead «بررسی پاسخ» button reads as broken.
        setFeedback({ correct: false, level: 0, feedbackFa: fa.curriculum.gradingUnavailable });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [attemptNo, chapterSlug, ex, scheduleAutoNext, stationSlug],
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
      setSelected(null);
      setOrdered([]);
      setBuilt([]);
    }
    setFeedback(null);
    // `eliminated` intentionally SURVIVES the retry — an eliminated option stays
    // eliminated for every later attempt of the SAME exercise (#106 F2); only
    // reset() (advancing to the next exercise) clears it.
  }, [ex]);

  const remainingChunks = useMemo(() => ex?.chunks?.filter((c) => !ordered.includes(c.id)) ?? [], [ex, ordered]);
  const remainingChips = useMemo(() => ex?.chips?.filter((c) => !built.includes(c.id)) ?? [], [ex, built]);

  // WP-5: arm the advance gate for the CURRENT question (runs after the index
  // actually changed — the latch stays closed between the change and this effect).
  useEffect(() => {
    advancedRef.current = false;
  }, [index]);

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
            audioUrlFallback={audioFallbackByLine?.[ex.audioLineRef]}
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
        <OptionRow
          options={ex.options}
          selected={selected}
          eliminated={eliminated}
          locked={feedback?.correct === true}
          onSelect={setSelected}
        />
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
            ) : feedback.level === 0 ? (
              <>
                <CircleAlert aria-hidden className="size-5 text-ink-soft" />
                {fa.curriculum.gradingUnavailableTitle}
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
              {feedback.reveal}
            </p>
          )}
          {/* #106 F4: the ladder is exhausted — offer the authored teaching block. */}
          {!feedback.correct && feedback.referenceBlockId && onReturnToBlock && (
            <ReturnToTeachingButton blockId={feedback.referenceBlockId} onReturn={onReturnToBlock} />
          )}
          {!feedback.correct && !feedback.reveal && feedback.level > 0 && attemptNo < 3 && (
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
        {/*
         * TASK-LEARNING-08 Addendum-2 §7: after a CORRECT answer there is NO
         * «ادامه» button anymore — the system itself advances after the short
         * review beat (scheduleAutoNext). A visible manual-override button next
         * to an automatic advance read as duplication/confusion. The button
         * survives ONLY on the wrong-answer path when the ladder is exhausted
         * (attempt 3, reveal shown) — there advancing is the learner's choice.
         */}
        {feedback && !feedback.correct && attemptNo >= 3 && (
          <button
            type="button"
            onClick={advance}
            className="h-11 min-w-28 rounded-md bg-shu px-5 text-body font-bold text-paper transition-colors hover:bg-shu-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            {isLast ? fa.curriculum.stationDone : fa.curriculum.continueBlock}
          </button>
        )}
        {feedback?.correct && !isLast && (
          <span aria-hidden className="self-center text-caption text-ink-faint" data-autonext-hint>
            {fa.curriculum.autoNextHint}
          </span>
        )}
      </div>
      {hintRevealed && !feedback && <p className="text-small text-ink-soft">{fa.curriculum.showHint}…</p>}
    </section>
  );
}

function labelFor(ex: ClientExercise, optionId: string): string {
  return ex.options?.find((o) => o.id === optionId)?.label ?? '';
}

/** Props of the select row (exported for markup tests — tests/unit/ui). */
export interface OptionRowProps {
  options: { id: string; label: string }[];
  selected: string | null;
  /** #106 F2: server-eliminated option ids — visually AND logically off. */
  eliminated: readonly string[];
  /** True once the answer was correct (the whole row locks). */
  locked: boolean;
  onSelect: (optionId: string) => void;
}

/** The select row — uniform radios (SKL-004 §۶) with #106 F2 elimination states. */
export function OptionRow({ options, selected, eliminated, locked, onSelect }: OptionRowProps) {
  return (
    <div role="radiogroup" className="flex flex-col gap-2">
      {options.map((opt) => {
        const isEliminated = eliminated.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected === opt.id}
            aria-disabled={isEliminated || undefined}
            disabled={locked || isEliminated}
            onClick={() => {
              if (isEliminated) return; // never re-send an eliminated option (#106)
              onSelect(opt.id);
            }}
            className={[
              'min-h-11 rounded-md border px-4 py-3 text-start text-body transition-colors',
              isEliminated
                ? 'cursor-not-allowed border-ink-faint bg-surface-sunken text-ink-faint opacity-60'
                : selected === opt.id
                  ? 'border-ai bg-indigo-wash text-ink'
                  : 'border-ink-faint bg-card text-ink hover:border-ai',
            ].join(' ')}
          >
            <span dir="auto" className={isEliminated ? 'line-through' : undefined}>
              {opt.label}
            </span>
            {isEliminated && (
              <span className="mt-1 block text-caption text-ink-faint">{fa.curriculum.eliminatedOption}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Issue #106 (F4): «بازگشت به آموزش» — rendered when the server says the ladder
 * is exhausted and points at an authored teaching block. The HOST (StationRunner)
 * owns what returning means (jumping to that block's step in the walk).
 */
export function ReturnToTeachingButton({
  blockId,
  onReturn,
}: {
  blockId: string;
  onReturn: (blockId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onReturn(blockId)}
      className="flex h-11 w-fit items-center gap-2 rounded-md border border-ai px-5 text-small font-bold text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
    >
      <ArrowRight aria-hidden className="size-4" />
      {fa.curriculum.returnToTeaching}
    </button>
  );
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
