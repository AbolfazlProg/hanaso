'use client';
/**
 * HANASO — KanjiWritingCard (SMART-RUBY 2026-11-23 §۴ — mission «اصلاح بخش
 * نوشتاری کانجی»).
 *
 * The kanji writing experience AT THE KANA WRITING LEVEL (KanaCard v5/v6
 * parity), over the ONE shared writing engine — the same WritingCanvas, the
 * same judging engine (order + direction + shape), the same assist ladder:
 * there is NO second writing system; this card feeds kanji-specific data to
 * the shared stack (the mission's «همان کامپوننت و موتور مشترک»).
 *
 * Per character the timeline is the kana timeline:
 *   1 intro    the numbered stroke-order teaching pass in the big canvas
 *              (KanjiVG data — 1024² centerline, stroke badge, start dot,
 *              direction arrow) with the live Persian stroke narration
 *   2 ready    the ONE confirm CTA («شروع تمرین نوشتن») — the kana-parity
 *              FOOTER CTA (big, bold, at the very end of the slide — the
 *              «ادامه» slot; 2026-11-24 owner order «بولدتر و سرِ جای دکمهٔ
 *              ادامه»)
 *   3 guided   tracing on the dashed guide + start dot; wrong direction /
 *              order gets the engine's Persian feedback; 2nd miss flashes
 *              the stroke guide (help escalation); accepted strokes morph
 *              into the standard form in place
 *   4 free     writing from memory; per-stroke hint on demand; the reference
 *              glyph overlay after completion
 *   done       → auto-advance to the next kanji of the block
 *
 * Touch/pen/mouse are unified by the canvas (pointer events + capture); the
 * anchor words (the carriers the learner was already taught, K3) ride beside
 * the canvas with their OWN standalone audio — the kanji's reading is heard
 * where it lives (D-0006).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ear, Layers, Play, RotateCcw, ArrowLeft } from 'lucide-react';
import { fa } from '@/messages/fa';
import { JaBlock } from '@/components/patterns/ja-block';
import { SmartJaText } from '@/components/patterns/smart-ja-text';
import { LineAudioButton } from '@/components/curriculum/line-audio-button';
import { WritingCanvas } from '@/components/writing/writing-canvas';
import { createAttemptState, type StrokeJudgement, type WritingAttemptState } from '@/modules/writing/engine';
import { loadWritingCharData, writingAvailability, type WritingCharData } from '@/modules/writing';
import { strokeInfoFa, type StrokeInfoFa } from '@/modules/writing/render';
import { EXPERIENCE } from '@/config/experience';
import { useLearnerJa } from '@/components/patterns/learner-ja-provider';
import { alignBaseToReading } from '@/modules/curriculum/knowledge/reading-model';

/* TL-13 (A-7): Persian digits (SKL-003 §۴). */
const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

export type KanjiWritingStage = 'intro' | 'ready' | 'guided' | 'free' | 'done';

export interface KanjiWritingAnchor {
  wordId: string;
  term: string;
  readingKana: string;
  meaningFa: string;
  audio: { opus: string; m4a: string } | null;
}

export interface KanjiWritingEntry {
  literal: string;
  meaningFa: string;
  strokeCount: number;
  kanjiId?: string;
  anchors: KanjiWritingAnchor[];
}

export interface KanjiWritingCardProps {
  blockId: string;
  chapterSlug: string;
  stationSlug: string;
  characters: KanjiWritingEntry[];
  instructionsFa?: string;
  /** Restored stage per literal (refresh/back resume). */
  initialStageByLiteral?: Record<string, string>;
  /** Stage persistence hook (the walk's block-stage map). */
  onProgress?: (literal: string, stage: KanjiWritingStage) => void;
  /** KANJI-WRITE-FIX §۲ — the (single-kanji) deck's free-writing completed →
   * the walk continues (the SAME #117 §8 gate semantics as the kana card).
   * Fires once per deck completion. */
  onWritingDone?: () => void;
}

function normalizeStage(stage: string | undefined): KanjiWritingStage {
  if (stage === 'encounter' || stage === 'demo') return 'intro';
  if (stage === 'explain') return 'ready';
  if (stage === 'ready' || stage === 'guided' || stage === 'free' || stage === 'done') return stage;
  return 'intro';
}

export function KanjiWritingCard({
  blockId,
  chapterSlug,
  stationSlug,
  characters,
  instructionsFa,
  initialStageByLiteral,
  onProgress,
  onWritingDone,
}: KanjiWritingCardProps): React.JSX.Element {
  const { model } = useLearnerJa();

  const [activeIdx, setActiveIdx] = useState(0);
  const [stageByLiteral, setStageByLiteral] = useState<Record<string, KanjiWritingStage>>(() => {
    const initial: Record<string, KanjiWritingStage> = {};
    for (const c of characters) {
      // the walk's block-stage map keys kanji writing as `${blockId}:${literal}`
      initial[c.literal] = normalizeStage(
        initialStageByLiteral?.[`${blockId}:${c.literal}`] ?? initialStageByLiteral?.[c.literal],
      );
    }
    return initial;
  });
  const active = characters[activeIdx]!;
  const stage = stageByLiteral[active.literal] ?? 'intro';

  const [charData, setCharData] = useState<WritingCharData | null>(null);
  const [demoStroke, setDemoStroke] = useState(-1);
  const [attempt, setAttempt] = useState<WritingAttemptState | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [restartSignal, setRestartSignal] = useState(0);
  const [hintSignal, setHintSignal] = useState(0);
  const [replayRunning, setReplayRunning] = useState(false);
  const [replaySignal, setReplaySignal] = useState(0);
  const [allDone, setAllDone] = useState(false);

  const stageEnteredRef = useRef<string | null>(null);
  const attemptStartRef = useRef<number | null>(null);
  const attemptRef = useRef<WritingAttemptState | null>(null);
  const beatTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  attemptRef.current = attempt;

  const clearBeats = useCallback(() => {
    for (const t of beatTimersRef.current) clearTimeout(t);
    beatTimersRef.current = [];
  }, []);
  const beat = useCallback((fn: () => void, ms: number) => {
    beatTimersRef.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => clearBeats(), [clearBeats]);

  /* data + stage persistence (the shared walk snapshot map keys blocks) */
  useEffect(() => {
    let cancelled = false;
    setCharData(null);
    void writingAvailability(active.literal).then((a) => {
      if (cancelled || a.status !== 'available') return;
      loadWritingCharData(active.literal)
        .then((d) => {
          if (!cancelled) setCharData(d);
        })
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [active.literal]);

  useEffect(() => {
    if (stageEnteredRef.current === `${active.literal}:${stage}`) return;
    stageEnteredRef.current = `${active.literal}:${stage}`;
    clearBeats();
    onProgress?.(active.literal, stage);
  }, [active.literal, stage, onProgress, clearBeats]);

  const setStage = useCallback((literal: string, next: KanjiWritingStage) => {
    setStageByLiteral((prev) => (prev[literal] === next ? prev : { ...prev, [literal]: next }));
  }, []);

  /* the reading chips: the segments THIS kanji consumes inside its (already
   * taught) anchor words — computed by the shared reading model, never
   * hand-authored (D-0006: readings ride inside the anchor words). */
  const readingChips = useMemo(() => {
    const chips: string[] = [];
    for (const a of active.anchors) {
      const seg = alignBaseToReading(a.term, a.readingKana, model);
      if (!seg) continue;
      for (const s of seg) {
        if (s.isKanji && s.ch === active.literal && !chips.includes(s.reading)) chips.push(s.reading);
      }
    }
    return chips;
  }, [active, model]);

  /* the timeline (KanaCard parity) */
  const onIntroDone = useCallback(() => {
    setStage(active.literal, 'ready');
  }, [active.literal, setStage]);

  const beginPractice = useCallback(
    (next: 'guided' | 'free') => {
      attemptStartRef.current = Date.now();
      setFeedback(null);
      setRestartSignal((n) => n + 1);
      setAttempt(createAttemptState(active.literal));
      setStage(active.literal, next);
    },
    [active.literal, setStage],
  );

  const replayTeaching = useCallback(() => {
    if (replayRunning) return; // rapid-click guard
    setDemoStroke(-1);
    if (stage === 'intro') {
      setRestartSignal((n) => n + 1);
      return;
    }
    setReplayRunning(true);
    setReplaySignal((n) => n + 1);
  }, [replayRunning, stage]);

  const onReplayDone = useCallback(() => setReplayRunning(false), []);

  const reportAttempt = useCallback(
    (mode: 'guided' | 'free') => {
      const state = attemptRef.current;
      if (!state) return;
      void fetch('/api/curriculum/station', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'writing-practice',
          chapterSlug,
          stationSlug,
          blockId,
          character: active.literal,
          mode,
          verdict:
            state.totalMisses === 0
              ? 'correct'
              : state.assistedCount > 0
                ? 'correct_with_hints'
                : 'accepted_with_review',
          strokesTotal: charData?.medians.length ?? active.strokeCount,
          strokesFirstTry: state.firstTry,
          totalMistakes: state.totalMisses,
          hintsShown: state.assistedCount,
          completed: true,
          durationMs: attemptStartRef.current ? Date.now() - attemptStartRef.current : state.history.length * 3000,
        }),
      }).catch(() => undefined); // best-effort record — never a gate (DD-106)
    },
    [chapterSlug, stationSlug, blockId, active.literal, active.strokeCount, charData],
  );

  const handleJudgement = useCallback((j: StrokeJudgement, state: WritingAttemptState) => {
    setAttempt(state);
    setFeedback(j.feedbackFa);
    if (j.judge === 'rejected' || j.judge === 'uncertain_retry') {
      if (state.missesOnStroke >= 2) setHintSignal((n) => n + 1);
    }
  }, []);

  const onGuidedComplete = useCallback(() => {
    reportAttempt('guided');
    setFeedback(fa.curriculum.kanaStageGuidedDone);
    beat(() => beginPractice('free'), EXPERIENCE.kanaReviewPauseMs);
  }, [beat, beginPractice, reportAttempt]);

  const onFreeComplete = useCallback(() => {
    reportAttempt('free');
    setFeedback(fa.curriculum.kanaStageFreeDone);
    beat(() => {
      setStage(active.literal, 'done');
      /* KANJI-WRITE-FIX §۲ — writing is REQUIRED: completing the deck owns the
       * walk's forward movement (the same auto-advance as the kana card —
       * the «ادامه» button is never offered on this slide). The transport
       * feeds this card ONE kanji per slide, so the deck completes after THIS
       * kanji's free write; the multi-kanji fallback (an un-split deck that
       * slipped through) advances internally and fires on the LAST kanji. */
      if (activeIdx < characters.length - 1) {
        // the NEXT kanji of the block starts its own teaching pass
        setActiveIdx(activeIdx + 1);
      } else {
        setAllDone(true);
        onWritingDone?.();
      }
    }, EXPERIENCE.kanaReviewPauseMs);
  }, [beat, active.literal, setStage, activeIdx, characters.length, reportAttempt, onWritingDone]);

  /* derived panel data (KanaCard parity: the live narration + progress dots) */
  const showingTeaching = stage === 'intro' || replayRunning;
  const currentStrokeIndex = showingTeaching
    ? Math.max(demoStroke, 0)
    : attempt
      ? Math.min(attempt.expectedIndex, (charData?.medians.length ?? 1) - 1)
      : 0;
  const strokeInfo: StrokeInfoFa | null = useMemo(
    () => (charData ? strokeInfoFa(charData, currentStrokeIndex) : null),
    [charData, currentStrokeIndex],
  );
  const totalStrokes = charData?.medians.length ?? active.strokeCount;
  const inPractice = stage === 'guided' || stage === 'free';

  const stageTitle =
    stage === 'intro'
      ? fa.curriculum.kanaStageIntroTitle
      : stage === 'ready'
        ? fa.curriculum.kanaStageReadyTitle
        : stage === 'guided'
          ? fa.curriculum.kanaStageGuidedTitle
          : stage === 'free'
            ? fa.curriculum.kanaStageFreeTitle
            : fa.curriculum.kanaStageDoneTitle(active.literal);

  return (
    <section
      className="flex flex-col gap-4"
      aria-label={fa.curriculum.writingBlockTitle}
      data-kanji-writing-block
      data-kj-stage={stage}
      data-kj-active={active.literal}
    >
      <h3 className="text-h3 font-bold">{fa.curriculum.writingBlockTitle}</h3>
      {instructionsFa ? <p className="text-body leading-[var(--leading-fa)] text-ink-soft">{instructionsFa}</p> : null}

      {/* the kanji picker with per-kanji progress (stage chips — RTL grid).
       * KANJI-WRITE-FIX §۱: the transport feeds ONE kanji per slide — a
       * single-entry deck renders NO picker (the slide IS the kanji's own). */}
      {characters.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-small text-ink-faint">{fa.curriculum.writingPickChar}</span>
          {characters.map((c, i) => {
            const cStage = stageByLiteral[c.literal] ?? 'intro';
            const done = cStage === 'done';
            return (
              <button
                key={c.literal}
                type="button"
                onClick={() => {
                  setActiveIdx(i);
                  setFeedback(null);
                  setRestartSignal((n) => n + 1);
                }}
                aria-pressed={i === activeIdx}
                className={`flex min-h-11 items-center gap-2 rounded-md border-2 px-3 font-jp text-h3 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai ${
                  i === activeIdx
                    ? 'border-indigo bg-indigo text-paper'
                    : done
                      ? 'border-success bg-card text-success'
                      : 'border-ink-faint bg-card text-ink hover:bg-surface-warm'
                }`}
              >
                {c.literal}
                <span className="text-micro font-normal">
                  {done
                    ? fa.curriculum.kanaStageChipDone
                    : cStage === 'intro' || cStage === 'ready'
                      ? fa.curriculum.kanaStageChipIntro
                      : cStage === 'guided'
                        ? fa.curriculum.kanaStageChipGuided
                        : fa.curriculum.kanaStageChipFree}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {allDone ? (
        <div
          role="status"
          className="rounded-md border-2 border-success bg-card p-6 text-center"
          data-kanji-writing-done
        >
          <p className="text-h3 font-black text-success">
            {fa.curriculum.kanaStageDoneTitle(characters.map((c) => c.literal).join(' '))}
          </p>
          <p className="mt-1 text-body text-ink-soft">{fa.curriculum.kanaStageFreeDone}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(18rem,26rem)_minmax(16rem,22rem)] md:justify-center">
          {/* group 1 «رسم و ترتیب نوشتن» — the big canvas + progress + actions */}
          <div className="flex min-w-0 flex-col gap-3" data-canvas-anchor>
            <WritingCanvas
              key={`${active.literal}-${restartSignal}`}
              character={active.literal}
              mode={stage === 'intro' ? 'intro' : stage === 'ready' || stage === 'done' ? 'reference' : stage}
              restartSignal={restartSignal}
              replaySignal={replaySignal}
              onReplayDone={onReplayDone}
              hintSignal={hintSignal}
              onIntroDone={onIntroDone}
              onDemoStrokeStart={setDemoStroke}
              onJudgement={handleJudgement}
              onAttemptComplete={inPractice ? (stage === 'guided' ? onGuidedComplete : onFreeComplete) : undefined}
            />
            {/* stroke progress dots — status feedback */}
            {totalStrokes > 0 ? (
              <div
                className="flex flex-wrap items-center justify-center gap-2"
                aria-label={fa.curriculum.kanaStageStrokeProgress}
              >
                {Array.from({ length: totalStrokes }, (_, i) => {
                  const done = showingTeaching ? i < demoStroke : attempt ? attempt.completed.includes(i) : false;
                  const current = showingTeaching ? i === demoStroke : attempt ? attempt.expectedIndex === i : false;
                  return (
                    <span
                      key={i}
                      className={`size-3 rounded-full border transition-colors ${
                        done
                          ? 'border-success bg-success/50'
                          : current
                            ? 'border-shu bg-shu/40'
                            : 'border-ink-faint bg-surface-sunken'
                      }`}
                    />
                  );
                })}
                <span className="text-caption text-ink-soft">
                  {faNum(currentStrokeIndex + 1)} / {faNum(totalStrokes)} {fa.curriculum.kanaStrokesWord}
                </span>
              </div>
            ) : null}
            {/* the action slot */}
            <div className="flex w-full flex-col items-center gap-1 text-center" data-stage-action={stage}>
              {stage === 'intro' ? (
                <p className="max-w-xl text-caption leading-[var(--leading-fa)] text-ink-faint">
                  {fa.curriculum.kanaStageIntroHint}
                </p>
              ) : null}
              {stage === 'guided' ? (
                <p className="max-w-xl text-caption leading-[var(--leading-fa)] text-ink-soft">
                  {fa.curriculum.kanaStageGuidedHint}
                </p>
              ) : null}
              {stage === 'free' ? (
                <p className="max-w-xl text-caption leading-[var(--leading-fa)] text-ink-soft">
                  {fa.curriculum.kanaStageFreeHint}
                </p>
              ) : null}
              {stage === 'done' ? (
                <p className="max-w-xl text-caption font-bold text-success">{fa.curriculum.kanaStageDoneHint}</p>
              ) : null}
            </div>
            {/* the live stroke narration (intro/replay) — Persian, per stroke */}
            {(stage === 'intro' || replayRunning) && strokeInfo ? (
              <div className="rounded-md border border-ai/40 bg-indigo-wash/40 p-4" data-stroke-info={strokeInfo.label}>
                <p className="text-body font-bold text-ink">{strokeInfo.label}</p>
                <p className="mt-2 text-small text-ink">{strokeInfo.startFa}</p>
                <p className="mt-1 text-small text-ink">{strokeInfo.directionFa}</p>
                <p className="mt-2 text-caption leading-[var(--leading-fa)] text-ink-soft">{strokeInfo.movementFa}</p>
              </div>
            ) : null}
            {/* the controls: replay / hint / restart — the ready CTA lives in
             * the slide's FOOTER now (kana parity): ONE big bold primary at
             * the very end of the card, exactly where every other block keeps
             * its «ادامه» (the walk's forward button is gated off kanji
             * writing slides — KANJI-WRITE-FIX §۲ — so the footer IS the
             * forward slot; 2026-11-24 owner order «بولدتر و سرِ جای دکمهٔ
             * ادامه»). */}
            <div className="flex flex-wrap justify-center gap-2" dir="rtl">
              <button
                type="button"
                onClick={replayTeaching}
                disabled={replayRunning}
                className="flex min-h-10 items-center gap-1 rounded-md border border-ai px-3 text-caption font-bold text-ai transition-colors hover:bg-indigo-wash disabled:opacity-50"
              >
                <Play aria-hidden className="size-4" />
                {fa.curriculum.kanaReplayTeaching}
              </button>
              {inPractice ? (
                <>
                  <button
                    type="button"
                    onClick={() => setHintSignal((n) => n + 1)}
                    className="min-h-10 rounded-md border border-ai px-3 text-caption font-bold text-ai transition-colors hover:bg-indigo-wash"
                  >
                    {fa.curriculum.kanaStageHelpBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      attemptStartRef.current = Date.now();
                      setFeedback(null);
                      setRestartSignal((n) => n + 1);
                    }}
                    className="flex min-h-10 items-center gap-1 rounded-md border border-ink-faint bg-card px-3 text-caption font-bold text-ink transition-colors hover:bg-surface-warm"
                  >
                    <RotateCcw aria-hidden className="size-4" />
                    {fa.curriculum.kanaStageWriteAgain}
                  </button>
                </>
              ) : null}
            </div>
            {feedback ? (
              <p
                role="status"
                aria-live="polite"
                className="rounded-md border border-shu/40 bg-surface-warm px-3 py-2 text-small leading-[var(--leading-fa)] text-ink"
              >
                {feedback}
              </p>
            ) : null}
          </div>

          {/* group 2 — the kanji's identity + readings + anchors (info column) */}
          <div className="flex min-w-0 flex-col gap-4" dir="rtl">
            <div className="rounded-md border border-ink-faint bg-card p-4" data-kanji-writing-info>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-h3 font-black text-ink">{active.meaningFa}</p>
                  <JaBlock className="mt-1 text-word-hero font-bold leading-snug">{active.literal}</JaBlock>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-ink-faint bg-surface-warm px-3 py-1.5 text-caption font-bold text-ink">
                  <Layers aria-hidden className="size-3.5" />
                  {faNum(active.strokeCount)} ضربه
                </span>
              </div>
              <p className="mt-2 text-caption text-ink-soft">{stageTitle}</p>
              {readingChips.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-caption text-ink-soft">خوانش در واژه‌های آموخته‌شده:</span>
                  {readingChips.map((r) => (
                    <span
                      key={r}
                      lang="ja"
                      dir="ltr"
                      className="rounded-full bg-surface-warm px-2.5 py-1 text-small font-bold text-ink"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {/* the anchor words — the carriers (K3) with their OWN standalone audio */}
            {active.anchors.length > 0 ? (
              <div className="rounded-md bg-surface-warm p-4">
                <p className="text-caption text-ink-soft">واژه‌هایی که یاد گرفتی و این کانجی درشان نشسته:</p>
                <ul className="mt-3 flex flex-col gap-2">
                  {active.anchors.map((w) => (
                    <li key={w.wordId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <div className="min-w-0">
                        <JaBlock className="text-body font-bold">
                          <SmartJaText tokens={[{ surface: w.term, reading: w.readingKana }]} />
                        </JaBlock>
                        <span className="text-caption text-ink-soft"> — {w.meaningFa}</span>
                      </div>
                      {w.audio ? (
                        <LineAudioButton
                          lineId={w.wordId}
                          audioUrl={w.audio.opus}
                          audioUrlFallback={w.audio.m4a}
                          audioAvailable
                          label={fa.curriculum.wordAudioPlay}
                        />
                      ) : (
                        <span className="flex items-center gap-1 text-caption text-ink-soft">
                          <Ear aria-hidden className="size-3" />
                          {fa.curriculum.wordAudioPending}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ══════════ CTA footer — TASK-HANASO-CTA-01 §۴ parity (2026-11-24
          owner order: «دکمهٔ شروع تمرین نوشتن بولدتر و واضح‌تر، سرِ جایی که در
          بقیهٔ بخش‌ها دکمهٔ ادامه بود») ══════════
          The ONE primary action of the slide — the SAME footer CTA the kana
          card ends with (divider + lead + the big bold primary), sitting at the
          very end of the slide content: exactly the slot where every other
          block's «ادامه» lives (the walk gates its own forward button off
          kanji writing slides — KANJI-WRITE-FIX §۲ — so THIS footer is the
          forward slot). Only in the ready beat: intro auto-plays on entry and
          guided/free advance themselves. */}
      {!allDone && stage === 'ready' && !inPractice ? (
        <footer
          className="flex flex-col items-center gap-3 border-t border-ink-faint pt-4 text-center"
          data-kj-cta-footer
        >
          <p className="text-body font-bold text-ink">{fa.curriculum.kanaIntroFooterLead}</p>
          <button
            type="button"
            onClick={() => beginPractice('guided')}
            className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-ai px-8 text-lead font-bold text-paper shadow-card transition-all hover:bg-indigo-deep hover:shadow-card active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai sm:w-auto sm:min-w-[18rem]"
            data-ready-cta
          >
            {fa.curriculum.kanaStageReadyCta}
            <ArrowLeft aria-hidden className="size-5" />
          </button>
        </footer>
      ) : null}
    </section>
  );
}
