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
import { ArrowRight, CheckCircle2, CircleAlert, Ear, Lightbulb, Volume2 } from 'lucide-react';
import { EXPERIENCE } from '@/config/experience';
import { fa } from '@/messages/fa';
import type { ClientExercise } from '@/modules/curriculum/grading';
import { mergeEliminated } from '@/modules/curriculum/station-walk';
import { JaBlock } from '@/components/patterns/ja-block';
import { getCachedAudio, preloadAudio, reportPlaybackError } from '@/modules/audio/client-cache';
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
   * TL-13 (A-6): `attemptNo` (optional) restores the in-flight attempt number.
   */
  initialProgress?: { index: number; firstTryCorrect: number; attemptNo?: number };
  /**
   * TASK-LEARNING-08 (WP-5): fired on every question transition so the host can
   * persist the walk snapshot (never only at station end). TL-13 (A-6): the
   * current attempt number rides along (refresh keeps the ladder honest).
   */
  onProgress?: (progress: { index: number; firstTryCorrect: number; attemptNo?: number }) => void;
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
    /** Addendum-5 §3 — the correct answer's committed audio (hearable after
     *  answering; absent when no asset exists → the control stays hidden). */
    correctAudio?: { what: string; opus: string; m4a: string };
    /** TASK-LEARNING-10 §3 — the correct answer's reading for the integrated
     *  answer card (glyph + Persian reading + Latin romaji). */
    correctReading?: { glyph: string; fa: string; latin: string };
    /** TASK-HANASO-20 (BUG-007): the authored rationale for the learner's own
     *  wrong pick — why *this* choice is wrong (level 1+ of the ladder). */
    distractorRationaleFa?: string;
  };
}

/**
 * TASK-LEARNING-08 Addendum-5 §3 — a cache-backed play control for a question
 * sound (the shared LRU — the same asset never downloads twice). Normal speed
 * 1.0 (the owner's speed policy), replayable, honest when no asset exists.
 */
function KanaSoundButton({
  urls,
  label,
  ariaLabel,
  dataAttr,
}: {
  urls: { opus: string; m4a: string };
  label: string;
  ariaLabel: string;
  dataAttr: string;
}) {
  const [playing, setPlaying] = useState(false);
  const play = useCallback(() => {
    const el = getCachedAudio(urls.opus);
    if (!el) return;
    try {
      el.pause();
      el.playbackRate = 1; // normal = real normal (Addendum-2 §8 policy)
      try {
        el.preservesPitch = true;
      } catch {
        /* engines without the property */
      }
      el.currentTime = 0;
      el.onerror = () => {
        if (urls.m4a && !el.src.endsWith(urls.m4a)) {
          el.src = urls.m4a;
          void el.play().catch(() => reportPlaybackError(el.src));
        } else {
          reportPlaybackError(el.src);
        }
      };
      const p = el.play();
      if (p && typeof p.then === 'function') p.catch(() => reportPlaybackError(el.src));
      setPlaying(true);
      el.onended = () => setPlaying(false);
    } catch {
      reportPlaybackError(urls.opus);
    }
  }, [urls]);
  return (
    <button
      type="button"
      onClick={play}
      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-ai bg-card px-4 text-small font-bold text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
      aria-label={ariaLabel}
      data-question-audio={dataAttr}
    >
      <Volume2 aria-hidden className={`size-5 ${playing ? 'text-shu' : ''}`} />
      {label}
    </button>
  );
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
  /**
   * TL-13 (A-6): the in-flight attempt number survives a refresh — a question
   * the learner already answered wrong does NOT become first-try-eligible again
   * (no score inflation through reload).
   */
  const [attemptNo, setAttemptNo] = useState(() =>
    initialProgress?.attemptNo ? Math.min(Math.max(1, initialProgress.attemptNo), 3) : 1,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<string[]>([]);
  const [built, setBuilt] = useState<string[]>([]);
  const [nameValue, setNameValue] = useState('');
  const [feedback, setFeedback] = useState<GradeResponse['outcome'] | null>(null);
  const [busy, setBusy] = useState(false);
  const [firstTryCorrect, setFirstTryCorrect] = useState(() =>
    initialProgress ? Math.max(0, Math.min(initialProgress.firstTryCorrect, exercises.length)) : 0,
  );
  /**
   * TASK-HANASO-21 — the SYNCHRONOUS mirror of firstTryCorrect.
   *
   * Why a ref besides the state: the score of the LAST question of a session
   * is read by `advance()` — which fires from a 1.5s auto-next timer or an
   * audio-end beat. Those closures captured `advance` BEFORE React committed
   * the setFirstTryCorrect increment, so the owner-observed bug reported the
   * final correct answer as NOT first-try-correct (2/3 instead of 3/3 on
   * stn-kana-k8 → 409 criterion_not_met on a PERFECT walk → the retry
   * re-submitted the same stale score forever = a dead end). The ref is
   * incremented in the SAME synchronous branch as the state update, so EVERY
   * advance path — fresh closure or stale closure — reads the CURRENT truth.
   */
  const firstTryCorrectRef = useRef(
    initialProgress ? Math.max(0, Math.min(initialProgress.firstTryCorrect, exercises.length)) : 0,
  );
  const [hintRevealed, setHintRevealed] = useState(false);
  /** #106 F2: option ids the server eliminated — they stay dead for every later attempt. */
  const [eliminated, setEliminated] = useState<string[]>([]);

  /**
   * TL-13 (A-2): SYNCHRONOUS re-entrancy guard for grade submission. The
   * `disabled={busy}` button only protects after React commits — clicks fired
   * in the SAME tick (double-tap, ghost click, assistive double-activation)
   * all reach check() before the re-render. Live-reproduced: 4 rapid clicks →
   * 4 grade POSTs (attemptCount 12→16, firstTryCorrect +4 for ONE answer).
   * The ref closes within the first call's synchronous prologue.
   */
  const gradingRef = useRef(false);

  /**
   * WP-5 auto-next: the pending advance timer + a fired-once latch. The manual
   * «ادامه» button and the timer both funnel through advance() — whoever fires
   * FIRST wins; the latch makes the loser a no-op (no double advance, no race).
   */
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advancedRef = useRef(false);

  const advanceRef = useRef<(() => void) | null>(null);
  const scheduleAutoNextRef = useRef<((wasFirstTry: boolean) => void) | null>(null);

  /* ---------------- TASK-LEARNING-10 §5: the correct-answer sound owns the clock
   *
   * After a CORRECT answer the pronunciation AUTO-PLAYS once (no extra click —
   * the owner's rule); the auto-next then waits for the sound to END + a short
   * review beat, so the next question can never appear before the learner has
   * heard/read the answer. A failed or stalled load NEVER locks the question:
   * an immediate failure falls back to the configured fixed delay, a stall is
   * bounded by autoNextAudioFallbackMs, a short note is shown, and the replay
   * control always stays available. Every playback (auto or manual replay)
   * runs through ONE controller — manual and auto can never overlap, and the
   * whole flow is event-scoped (fired from the grade handler), so re-renders
   * can never re-trigger a play.
   */
  const [outcomeAudioPlaying, setOutcomeAudioPlaying] = useState(false);
  const [outcomeAudioFailed, setOutcomeAudioFailed] = useState(false);
  const outcomeAudioCtlRef = useRef<{
    el: HTMLAudioElement | null;
    urls: { opus: string; m4a: string } | null;
    beatTimer: ReturnType<typeof setTimeout> | null;
    fallbackTimer: ReturnType<typeof setTimeout> | null;
    /** correct path: end → beat → advance (a wrong-path reveal play never advances) */
    advanceArmed: boolean;
    triedM4a: boolean;
  }>({ el: null, urls: null, beatTimer: null, fallbackTimer: null, advanceArmed: false, triedM4a: false });

  const clearOutcomeTimers = useCallback(() => {
    const ctl = outcomeAudioCtlRef.current;
    if (ctl.beatTimer !== null) {
      clearTimeout(ctl.beatTimer);
      ctl.beatTimer = null;
    }
    if (ctl.fallbackTimer !== null) {
      clearTimeout(ctl.fallbackTimer);
      ctl.fallbackTimer = null;
    }
  }, []);

  const stopOutcomeAudio = useCallback(() => {
    clearOutcomeTimers();
    const ctl = outcomeAudioCtlRef.current;
    const el = ctl.el;
    ctl.advanceArmed = false;
    if (el) {
      el.onended = null;
      el.onerror = null;
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        /* jsdom and engines without media — the state flags are what matter */
      }
    }
    ctl.el = null;
    ctl.urls = null;
    setOutcomeAudioPlaying(false);
  }, [clearOutcomeTimers]);

  /** The sound is not hearable. Two shapes:
   *  - IMMEDIATE failure (load/play rejected, both formats dead): a short note
   *    + the standard fixed delay — the panel just appeared, so the learner
   *    still gets the normal reading beat. Never locked.
   *  - STALL (no ended, no error — caught by the fallback bound): the panel has
   *    already been up for autoNextAudioFallbackMs, so there is no long wait
   *    (never locked) — but the honest note still has to be SEEABLE, so the
   *    question holds for one short review beat and then advances. A note
   *    that dies in the same commit as the advance would never be read.
   * Both show the honest note; the replay control stays available. */
  const onOutcomeAudioUnavailable = useCallback(
    (advanceArmed: boolean, kind: 'immediate' | 'stall') => {
      stopOutcomeAudio();
      setOutcomeAudioFailed(true);
      if (!advanceArmed) return;
      if (kind === 'immediate') {
        scheduleAutoNextRef.current?.(false);
      } else {
        outcomeAudioCtlRef.current.beatTimer = setTimeout(() => advanceRef.current?.(), EXPERIENCE.autoNextAudioBeatMs);
      }
    },
    [stopOutcomeAudio],
  );

  /** Fire-and-hear: play the correct-answer sound once. `withAdvance` (the
   *  correct path) arms end→beat→advance; the wrong-path reveal play never
   *  advances (retry stays the learner's choice there). */
  const startOutcomeAudio = useCallback(
    (urls: { opus: string; m4a: string }, withAdvance: boolean) => {
      stopOutcomeAudio();
      setOutcomeAudioFailed(false);
      const ctl = outcomeAudioCtlRef.current;
      ctl.urls = urls;
      ctl.advanceArmed = withAdvance;
      ctl.triedM4a = false;
      const el = getCachedAudio(urls.opus);
      if (!el) {
        onOutcomeAudioUnavailable(withAdvance, 'immediate');
        return;
      }
      ctl.el = el;
      el.onended = () => {
        setOutcomeAudioPlaying(false);
        const armed = outcomeAudioCtlRef.current.advanceArmed;
        clearOutcomeTimers();
        if (armed) {
          outcomeAudioCtlRef.current.beatTimer = setTimeout(
            () => advanceRef.current?.(),
            EXPERIENCE.autoNextAudioBeatMs,
          );
        }
      };
      el.onerror = () => {
        const c = outcomeAudioCtlRef.current;
        if (!c.triedM4a && c.urls && c.el && !c.el.src.endsWith(c.urls.m4a)) {
          c.triedM4a = true;
          c.el.src = c.urls.m4a;
          void c.el.play().catch(() => onOutcomeAudioUnavailable(c.advanceArmed, 'immediate'));
          return;
        }
        onOutcomeAudioUnavailable(outcomeAudioCtlRef.current.advanceArmed, 'immediate');
      };
      try {
        el.playbackRate = 1; // normal = real normal (owner speed policy)
        try {
          el.preservesPitch = true;
        } catch {
          /* engines without the property */
        }
        el.currentTime = 0;
        const p = el.play();
        setOutcomeAudioPlaying(true);
        if (withAdvance) {
          outcomeAudioCtlRef.current.fallbackTimer = setTimeout(
            () => onOutcomeAudioUnavailable(outcomeAudioCtlRef.current.advanceArmed, 'stall'),
            EXPERIENCE.autoNextAudioFallbackMs,
          );
        }
        if (p && typeof p.then === 'function') {
          p.then(() => undefined).catch(() =>
            onOutcomeAudioUnavailable(outcomeAudioCtlRef.current.advanceArmed, 'immediate'),
          );
        }
      } catch {
        onOutcomeAudioUnavailable(withAdvance, 'immediate');
      }
    },
    [clearOutcomeTimers, onOutcomeAudioUnavailable, stopOutcomeAudio],
  );

  /** The visible replay control: a manual replay cancels any pending advance
   *  beat/fallback and re-arms end→beat→advance, so a replaying learner is
   *  never advanced mid-listen. */
  const replayOutcomeAudio = useCallback(() => {
    const ctl = outcomeAudioCtlRef.current;
    if (!ctl.urls) return;
    const urls = ctl.urls;
    const armed = ctl.advanceArmed;
    startOutcomeAudio(urls, armed);
  }, [startOutcomeAudio]);

  // report the in-flight position to the host on every question transition
  // TL-13 (A-6): attemptNo rides along, so a mid-question refresh restores the
  // real attempt number (wrong-then-reload no longer resets the ladder).
  useEffect(() => {
    onProgress?.({ index, firstTryCorrect, attemptNo });
  }, [index, firstTryCorrect, attemptNo, onProgress]);

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
    // TL-10 §5: leaving this question stops its outcome sound (never bleeds
    // into the next question's own sounds).
    stopOutcomeAudio();
    // WP-5: manual + auto advance share this single gate — the second caller is a no-op.
    if (advancedRef.current) return;
    advancedRef.current = true;
    if (autoNextTimerRef.current !== null) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    if (isLast) {
      // TASK-HANASO-21: the score MUST read the synchronous ref — a closure
      // captured before the last increment is exactly the stale-score bug.
      onSessionDone?.(firstTryCorrectRef.current / total, total);
      return; // stays latched — this block is done (host unmounts/replaces it)
    }
    setIndex((i) => i + 1);
    reset();
    // re-arm happens in the [index] effect — never synchronously here, so a
    // rapid double fire (timer + click in the same tick) cannot double-advance.
  }, [isLast, onSessionDone, reset, stopOutcomeAudio, total]);

  /* TL-10 §5: late-bind the advance/schedule callbacks into the outcome-audio
   * controller (it is declared earlier); reads happen only inside event
   * handlers and timers, never during render. */
  advanceRef.current = advance;

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
          // TASK-HANASO-21: LATE-BOUND advance — never the captured closure.
          // The captured `advance` froze the pre-increment firstTryCorrect of
          // the render that scheduled the timer; the ref always holds the
          // latest committed advance (whose score now reads the synchronous
          // firstTryCorrectRef anyway — defense in depth, both layers fixed).
          advanceRef.current?.();
        },
        Math.min(delay, EXPERIENCE.autoNextMaxDelayMs),
      );
    },
    // TASK-HANASO-21: `advance` no longer read from the closure — the dep is
    // intentionally gone (the timer resolves through advanceRef at fire time).
    [],
  );
  /* TL-10 §5: late-bind (see the note at advanceRef above). */
  scheduleAutoNextRef.current = scheduleAutoNext;

  const grade = useCallback(
    async (payload: Record<string, unknown>) => {
      // TL-13 (A-2): same-tick re-entrancy — the FIRST call closes the gate;
      // every later call in the same commit window is a no-op (never a second
      // grade POST, never a second firstTryCorrect increment).
      if (gradingRef.current) return;
      gradingRef.current = true;
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
        if (outcome.correct && attemptNo === 1) {
          setFirstTryCorrect((n) => n + 1);
          // TASK-HANASO-21: the synchronous mirror — incremented in the SAME
          // guarded branch (the gradingRef gate keeps this single-entry), so
          // any later advance (timer, audio beat, fallback) reads the truth.
          firstTryCorrectRef.current += 1;
        }
        // #106 F2: fold the server's elimination into the persistent set and never
        // keep an eliminated option selected (the next attempt must not re-send it).
        if (outcome.eliminateOptionIds && outcome.eliminateOptionIds.length > 0) {
          const ids = outcome.eliminateOptionIds;
          setEliminated((cur) => mergeEliminated(cur, ids));
          setSelected((sel) => (sel !== null && ids.includes(sel) ? null : sel));
        }
        // WP-5 (owner feedback D) + TASK-LEARNING-10 §5: on a CORRECT answer the
        // correct pronunciation AUTO-PLAYS once and the auto-next waits for it
        // to END (+ a short beat). No committed asset (or an unavailable one)
        // falls back to the configured fixed delay — the flow never locks.
        // On a WRONG answer the sound plays only when the reveal itself appears
        // (F3 — the moment the correct answer is shown), never before, and the
        // question stays put (retry / return-to-teaching are the choices).
        if (outcome.correct && outcome.correctAudio) {
          startOutcomeAudio(outcome.correctAudio, true);
        } else if (outcome.correct) {
          scheduleAutoNext(attemptNo === 1);
        } else if (outcome.reveal && outcome.correctAudio) {
          startOutcomeAudio(outcome.correctAudio, false);
        }
        return outcome;
      } catch {
        // Reviewer-B S1: never fail silently — a dead «بررسی پاسخ» button reads as broken.
        setFeedback({ correct: false, level: 0, feedbackFa: fa.curriculum.gradingUnavailable });
        return null;
      } finally {
        gradingRef.current = false;
        setBusy(false);
      }
    },
    [attemptNo, chapterSlug, ex, scheduleAutoNext, startOutcomeAudio, stationSlug],
  );

  const check = useCallback(async () => {
    if (!ex) return;
    // TL-13 (A-2): the busy state is ALSO checked here so a stale-props click
    // (option selected → rapid double activation before commit) never re-enters.
    if (busy || gradingRef.current) return;
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

  /* TASK-LEARNING-08 Addendum-5 §3 — LISTENING questions AUTO-PLAY their sound
   * at question start (the sound IS the question — the owner's rule). Warms
   * the shared cache then plays once per question; the visible control always
   * offers replay. Recognition questions NEVER auto-play (the kana sound is
   * the ANSWER there — playing it would leak it «ناخواسته»).
   * TASK-LEARNING-13: rule-listening (word-level minimal-pair discrimination)
   * shares the exact same behavior — the WORD recording is the question. */
  const listenPrompt = ex?.type === 'kana-listening' || ex?.type === 'rule-listening' ? (ex.promptAudio ?? null) : null;
  useEffect(() => {
    if (!listenPrompt) return;
    let cancelled = false;
    const t = setTimeout(() => {
      void preloadAudio(listenPrompt.opus).then((el) => {
        if (cancelled || !el) return;
        try {
          el.playbackRate = 1;
          el.preservesPitch = true;
          el.currentTime = 0;
          const p = el.play();
          if (p && typeof p.then === 'function') p.catch(() => reportPlaybackError(el.src));
        } catch {
          reportPlaybackError(listenPrompt.opus);
        }
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [index, listenPrompt?.opus]);

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
      aria-label={`${fa.curriculum.gateQuestion} ${faNum(index + 1)} ${fa.curriculum.gateOf} ${faNum(total)}`}
      className="flex flex-col gap-4"
    >
      <header className="flex items-center justify-between gap-2">
        <p className="text-small text-ink-soft" dir="rtl">
          {/* TL-13 (A-7): Persian digits — the rest of the walk UI (block rail,
              map, kana cards) already uses faNum (SKL-003 §۴); this counter was
              the lone Latin-digit holdout. */}
          {faNum(index + 1)} / {faNum(total)}
        </p>
        <p className="text-caption text-ink-soft">{skillLabel(ex.targetSkill)}</p>
      </header>

      <p className="text-body font-medium">{ex.promptFa}</p>

      {/* Addendum-5 §3 — a LISTENING question: the sound IS the question. It
          auto-plays at question start (see the effect above) and the replay
          control is always visible. No glyph is shown — the shapes live in the
          options.
          TASK-LEARNING-13: rule-listening (word-level discrimination) shares
          the same panel — the WORD recording is the question, the written word
          is the answer and never renders pre-answer (the station page strips
          promptJa for this type). */}
      {(ex.type === 'kana-listening' || ex.type === 'rule-listening') && ex.promptAudio ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-md border border-ai/40 bg-indigo-wash/30 p-4"
          data-listen-question
        >
          <KanaSoundButton
            urls={ex.promptAudio}
            label={fa.curriculum.exHearQuestionSound}
            ariaLabel={fa.curriculum.exHearQuestionSoundAria}
            dataAttr="replay"
          />
          <span className="text-caption leading-[var(--leading-fa)] text-ink-soft">
            {fa.curriculum.exListenAutoNote}
          </span>
        </div>
      ) : null}

      {/* Addendum-5 §3 — a RECALL question (reading → glyph): the prompt's own
          sound is hearable BEFORE answering — it is the audio form of the
          visible Persian prompt (e.g. «آ»), so it can never reveal WHICH glyph
          is correct. Reinforces the sound↔shape link the question trains. */}
      {ex.type === 'kana-recall' && ex.promptAudio ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-md border border-ink-faint bg-card p-3"
          data-recall-sound
        >
          <KanaSoundButton
            urls={ex.promptAudio}
            label={fa.curriculum.exHearQuestionSound}
            ariaLabel={fa.curriculum.exHearQuestionSoundAria}
            dataAttr="prompt"
          />
          <span className="text-caption leading-[var(--leading-fa)] text-ink-faint">
            {fa.curriculum.exPromptSoundNote}
          </span>
        </div>
      ) : null}

      {ex.audioLineRef && (
        <div className="flex items-center gap-3 rounded-md border border-ink-faint bg-card p-3">
          {/* Addendum-5 §3 — a listening question's line AUTO-PLAYS at question
              start; the button stays for replay. */}
          <LineAudioButton
            lineId={ex.audioLineRef}
            audioUrl={audioByLine[ex.audioLineRef] ?? ''}
            audioUrlFallback={audioFallbackByLine?.[ex.audioLineRef]}
            audioAvailable={audioAvailable}
            rate={0.9}
            autoPlay
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
          ) : ex.type === 'kana-recognition' ? (
            /* Addendum-4 §4 — a reading-recognition question: the kana glyph IS
               the question — the focal point, big and readable on mobile too
               (was text-lead/18px — far too small for the subject of the
               question). */
            <span className="flex justify-center py-2" lang="ja" dir="ltr">
              <JaBlock className="text-[clamp(3.25rem,14vw,5rem)] font-bold leading-[1.15] text-ink">
                {ex.promptJa}
              </JaBlock>
            </span>
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

      {/* ---- feedback panel (in-place, role=status — SKL-002 §۳-۶) ----
       * TASK-LEARNING-10 §3: rebuilt as an INTEGRATED answer card — one clear
       * structure with the question's own visual language: status row, the
       * character + its Persian|Latin reading, the teaching copy, and a compact
       * Aizen replay control. The correct-answer sound AUTO-PLAYS (started by
       * the grade handler); this control is only a replay, never a required
       * click (the owner's rule: no extra click to hear the pronunciation). */}
      {feedback && (
        <div
          role="status"
          aria-live="polite"
          data-feedback-panel
          className={[
            'flex flex-col gap-3 rounded-md border p-4',
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
          {/* TASK-LEARNING-10 §3 — the answer card: the character at a readable
              size + its reading, Persian as the primary guide and Latin as the
              complement («کی | ki» — the owner's display rule). */}
          {feedback.correctReading && (
            <div
              className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-ink-faint bg-surface-warm px-4 py-3"
              data-feedback-reading
            >
              <JaBlock className="text-[clamp(2.75rem,11vw,4rem)] font-bold leading-[1.15] text-ink">
                {feedback.correctReading.glyph}
              </JaBlock>
              <p className="flex flex-wrap items-baseline gap-x-2">
                {feedback.correctReading.fa ? (
                  <span className="text-h3 font-black text-ink">{feedback.correctReading.fa}</span>
                ) : null}
                {feedback.correctReading.fa && feedback.correctReading.latin ? (
                  <span aria-hidden className="text-body text-ink-faint">
                    |
                  </span>
                ) : null}
                <span className="text-body font-medium text-ink-soft" dir="ltr" lang="ja">
                  {feedback.correctReading.latin}
                </span>
              </p>
            </div>
          )}
          {/* the teaching copy — never a duplicate of the status title (the
              server's first-try correct copy is exactly «درست!») */}
          {feedback.feedbackFa !== fa.curriculum.correct && (
            <p className="text-body leading-[var(--leading-fa)]">{feedback.feedbackFa}</p>
          )}
          {/* TASK-HANASO-20 (BUG-007): the picked distractor's OWN rationale —
              why *this* choice is wrong, straight under the ladder line. */}
          {feedback.distractorRationaleFa && (
            <p data-distractor-rationale className="text-small leading-[var(--leading-fa)] text-ink-soft">
              {feedback.distractorRationaleFa}
            </p>
          )}
          {feedback.reveal && (
            <p className="text-body text-ink-soft" dir="auto">
              {feedback.reveal}
            </p>
          )}
          {/* TASK-LEARNING-10 §3/§5 — the compact replay control (small,
              professional, Aizen-consistent — replaces the old big standalone
              labeled button). Auto-play already ran from the grade handler;
              this is a replay. The honest short note shows when the sound is
              unavailable; the control never disappears before it is used. */}
          {feedback.correctAudio ? (
            <div className="flex flex-wrap items-center gap-3" data-feedback-audio>
              <button
                type="button"
                onClick={replayOutcomeAudio}
                data-question-audio="correct"
                aria-label={fa.curriculum.exHearCorrectPronAria(feedback.correctAudio.what)}
                className={[
                  'flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai',
                  outcomeAudioPlaying
                    ? 'border-ai bg-indigo-wash text-ai'
                    : 'border-ink-faint bg-card text-ink-soft hover:border-ai hover:text-ai',
                ].join(' ')}
              >
                <Volume2 aria-hidden className="size-5" />
              </button>
              <span className="text-small leading-[var(--leading-fa)] text-ink-soft">
                {outcomeAudioFailed ? fa.curriculum.audioUnavailableShort : fa.curriculum.exHearCorrectPron}
              </span>
            </div>
          ) : null}
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
         * «ادامه» button anymore — the system itself advances after the sound
         * ends + the review beat (TL-10 §5) or the fallback bound. A visible
         * manual-override button next to an automatic advance read as
         * duplication/confusion. The button survives ONLY on the wrong-answer
         * path when the ladder is exhausted (attempt 3, reveal shown) — there
         * advancing is the learner's choice.
         * TASK-LEARNING-10 §7: a normal forward action is never red — Aizen's
         * shu red is reserved for real errors/warnings, so this is the primary
         * indigo like every other forward action, and its label is a plain
         * action («ادامه»), never a status text posed as a button.
         */}
        {feedback && !feedback.correct && attemptNo >= 3 && (
          <button
            type="button"
            onClick={advance}
            className="h-11 min-w-28 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            {fa.curriculum.continueBlock}
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

/**
 * Addendum-4 §4 — an option that is nothing but a short kana string is a
 * SHAPE the learner must recognize (kana-recall «کانای «آ» کدام است؟») — render
 * it as a glyph (font-jp, h2, bold), never as 16px body text. Words/sentences
 * and Persian labels keep the uniform radio look (SKL-004 §۶).
 */
const KANA_OPTION_RE = /^[\u3040-\u30ff\u31f0-\u31ff]+$/;
/* TL-13: word-length options (rule-listening pairs like おばあさん/いえ/いいえ —
 * up to 6 kana) render as big glyphs too: the SHAPE is what the learner is
 * discriminating; body text would hide the very difference being taught. */
const isKanaGlyphOption = (label: string): boolean => KANA_OPTION_RE.test(label) && label.length <= 6;

/** The select row — uniform radios (SKL-004 §۶) with #106 F2 elimination states.
 *  TASK-LEARNING-09 §۸: the options flow into TWO columns once the card has
 *  real horizontal room (tablets/desktop) — glyph tiles and Persian labels
 *  alike; phones keep the single column (touch targets stay full-width). */
export function OptionRow({ options, selected, eliminated, locked, onSelect }: OptionRowProps) {
  return (
    <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            {isKanaGlyphOption(opt.label) ? (
              /* Addendum-4 §4 — a kana-shape option renders as a real JP glyph
                 (ja-block stack — `font-jp` alone is a no-op utility), big and
                 bold; the plain span stays for words/sentences/Persian labels. */
              <JaBlock className={'text-h2 font-bold' + (isEliminated ? ' line-through' : '')}>{opt.label}</JaBlock>
            ) : (
              <span dir="auto" className={isEliminated ? 'line-through' : undefined}>
                {opt.label}
              </span>
            )}
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

/** Persian digits for the question counter (SKL-003 §۴ — TL-13 A-7). */
function faNum(n: number): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);
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
