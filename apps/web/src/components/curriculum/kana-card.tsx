'use client';
/**
 * HANASO — KanaCard v3 (TASK-LEARNING-08 phase 2 / #117).
 *
 * The owner's verdict on v2: everything-at-once — a wall of explanations,
 * six drawing controls and a giant attribution block. The v3 card is ONE
 * staged experience that unfolds like a well-made Japanese notebook (#117
 * §2/§4/§6): the learner is never confronted with the full page, and the
 * drawing engine is the TEACHER, not a side panel.
 *
 *   1 encounter — the glyph alone, big, with its sound (once) and reading.
 *   2 demo      — slow ink-flow stroke-by-stroke demonstration with the
 *                 narrated side panel («ضربهٔ ۱ از ۳ — از بالا-چپ شروع کن»).
 *   3 explain   — gradual reveal: reading notes → mnemonic → a real readable
 *                 word → confusable pair (staggered ink-style entrances).
 *   4 guided    — trace each stroke on the dashed guide; the v2 engine judges
 *                 with precise Persian feedback + an assist ladder.
 *   5 free      — write from memory; the engine evaluates; help escalates
 *                 (guide flash → assisted pass) — never an endless fail loop.
 *   done        — compact completion; the station auto-advances.
 *
 * Minimal controls only (#117 §2): «نمایش دوباره», «راهنما», the stage CTA,
 * and the audio replay. No mode tabs, no guide toggles, no reset buttons.
 *
 * Audio coordination (#117 §5): one shared Audio element per card, exactly
 * 1.0× playback, played once at encounter, once when the demo completes and
 * once when guided practice begins — replay on demand, never overlapping.
 *
 * Writing is a required part of the walk (#117 §8): onWritingDone fires when
 * the free-writing stage completes; the station keeps the learner here until
 * then (fair — the assist ladder guarantees completion).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ear, Hand, Play, RotateCcw, Volume2 } from 'lucide-react';
import { fa } from '@/messages/fa';
import { KANA_TEACHING_BY_ID } from '@/modules/curriculum/content/kana-teaching';
import type { KanaItem } from '@/modules/curriculum/types';
import { JaBlock } from '@/components/patterns/ja-block';
import { MixedFaJaText } from '@/components/curriculum/mixed-fa-ja-text';
import { WritingCanvas } from '@/components/writing/writing-canvas';
import { loadWritingCharData, writingAvailability, type WritingCharData } from '@/modules/writing';
import { strokeInfoFa, type StrokeInfoFa } from '@/modules/writing/render';
import type { StrokeJudgement, WritingAttemptState } from '@/modules/writing/engine';

export type KanaStage = 'encounter' | 'demo' | 'explain' | 'guided' | 'free' | 'done';

export interface KanaCardProgress {
  stage: KanaStage;
}

export interface KanaCardProps {
  kana: KanaItem;
  /** Romaji fading policy (unit-level block data). */
  showRomaji: boolean;
  /** Optional confusable note authored on the block (kept for back-compat). */
  confusableNoteFa?: string;
  /** Server-resolved audio pair for THIS glyph (null = no committed asset). */
  audioUrls: { opus: string; m4a: string } | null;
  /** Writing-practice record callback (structured summary only — DD-111). */
  onWritingAttempt?: (summary: {
    character: string;
    mode: 'guided' | 'free';
    verdict: string;
    strokesTotal: number;
    strokesFirstTry: number;
    totalMistakes: number;
    hintsShown: number;
    completed: boolean;
    durationMs: number;
  }) => void;
  /** Fires when the free-writing stage completes (the walk gate — #117 §8). */
  onWritingDone?: () => void;
  /** Restored stage (refresh/back resume — #117 §10). */
  initialProgress?: KanaCardProgress | undefined;
  /** Stage persistence hook. */
  onProgress?: (progress: KanaCardProgress) => void;
}

export function KanaCard({
  kana,
  showRomaji,
  confusableNoteFa,
  audioUrls,
  onWritingAttempt,
  onWritingDone,
  initialProgress,
  onProgress,
}: KanaCardProps) {
  const teaching = KANA_TEACHING_BY_ID[kana.kanaId];
  const [stage, setStage] = useState<KanaStage>(initialProgress?.stage ?? 'encounter');
  const [charData, setCharData] = useState<WritingCharData | null>(null);
  const [demoStroke, setDemoStroke] = useState(-1);
  const [attempt, setAttempt] = useState<WritingAttemptState | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [restartSignal, setRestartSignal] = useState(0);
  const [hintSignal, setHintSignal] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stageEnteredRef = useRef<KanaStage | null>(null);
  const attemptStartRef = useRef<number | null>(null);
  /** Latest attempt state for the completion reporters. */
  const attemptRef = useRef<WritingAttemptState | null>(null);
  attemptRef.current = attempt;

  // -------------------------------------------------- data + stage persistence
  useEffect(() => {
    let cancelled = false;
    void writingAvailability(kana.glyph).then((a) => {
      if (cancelled || a.status !== 'available') return;
      loadWritingCharData(kana.glyph)
        .then((d) => {
          if (!cancelled) setCharData(d);
        })
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [kana.glyph]);

  useEffect(() => {
    if (stageEnteredRef.current === stage) return;
    stageEnteredRef.current = stage;
    onProgress?.({ stage });
  }, [stage, onProgress]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  // -------------------------------------------------- audio: one element, 1.0×, no overlap
  const playSound = useCallback(() => {
    if (!audioUrls) return;
    audioRef.current?.pause();
    const el = new Audio(audioUrls.opus);
    el.playbackRate = 1; // #117 §5: normal speed is exactly 1.0
    el.addEventListener('error', () => {
      el.src = audioUrls.m4a; // dual-format fallback (ADR-009)
      void Promise.resolve(el.play()).catch(() => undefined);
    });
    audioRef.current = el;
    // jsdom/test DOMs return undefined from play() — guard without changing
    // the real-browser promise semantics
    void Promise.resolve(el.play()).catch(() => undefined);
  }, [audioUrls]);

  // audio once per defined moment: encounter → demo end → guided entry
  const audioMomentsRef = useRef<Set<string>>(new Set());
  const playOnce = useCallback(
    (moment: string) => {
      if (audioMomentsRef.current.has(moment)) return;
      audioMomentsRef.current.add(moment);
      playSound();
    },
    [playSound],
  );

  useEffect(() => {
    if (stage === 'encounter') playOnce('encounter');
    if (stage === 'guided') playOnce('guided');
  }, [stage, playOnce]);

  // -------------------------------------------------- stage transitions
  const goDemo = useCallback(() => {
    setFeedback(null);
    setDemoStroke(-1);
    setStage('demo');
  }, []);

  const onDemoDone = useCallback(() => {
    playOnce('demo-done');
    setStage('explain');
  }, [playOnce]);

  const handleJudgement = useCallback((j: StrokeJudgement, state: WritingAttemptState) => {
    setAttempt(state);
    setFeedback(j.feedbackFa);
    // help escalation (#117 §7): the second miss on a stroke flashes the guide
    if (j.judge === 'rejected' || j.judge === 'uncertain_retry') {
      if (state.missesOnStroke >= 2) setHintSignal((n) => n + 1);
    }
  }, []);

  const startAttempt = useCallback((mode: 'guided' | 'free') => {
    attemptStartRef.current = Date.now();
    setFeedback(null);
    setStage(mode);
    setRestartSignal((n) => n + 1);
  }, []);

  const reportAttempt = useCallback(
    (mode: 'guided' | 'free') => {
      const state = attemptRef.current;
      if (!state) return;
      onWritingAttempt?.({
        character: kana.glyph,
        mode,
        verdict:
          state.totalMisses === 0 ? 'correct' : state.assistedCount > 0 ? 'correct_with_hints' : 'accepted_with_review',
        strokesTotal: charData?.medians.length ?? 0,
        strokesFirstTry: state.firstTry,
        totalMistakes: state.totalMisses,
        hintsShown: state.assistedCount,
        completed: true,
        durationMs: attemptStartRef.current ? Date.now() - attemptStartRef.current : state.history.length * 3000,
      });
    },
    [charData, kana.glyph, onWritingAttempt],
  );

  const onGuidedComplete = useCallback(() => {
    reportAttempt('guided');
    playOnce('guided');
    setFeedback(fa.curriculum.kanaStageGuidedDone);
    window.setTimeout(() => setStage('free'), 1500);
  }, [playOnce, reportAttempt]);

  const onFreeComplete = useCallback(() => {
    reportAttempt('free');
    setFeedback(fa.curriculum.kanaStageFreeDone);
    setStage('done');
    onWritingDone?.();
  }, [onWritingDone, reportAttempt]);

  // -------------------------------------------------- derived panel data
  const currentStrokeIndex =
    stage === 'demo'
      ? Math.max(demoStroke, 0)
      : attempt
        ? Math.min(attempt.expectedIndex, (charData?.medians.length ?? 1) - 1)
        : 0;
  const strokeInfo: StrokeInfoFa | null = useMemo(
    () => (charData ? strokeInfoFa(charData, currentStrokeIndex) : null),
    [charData, currentStrokeIndex],
  );
  const totalStrokes = charData?.medians.length ?? 0;

  const mn = teaching?.mnemonic;
  const stageTitle =
    stage === 'encounter'
      ? fa.curriculum.kanaStageEncounterTitle
      : stage === 'demo'
        ? fa.curriculum.kanaStageDemoTitle
        : stage === 'explain'
          ? fa.curriculum.kanaStageExplainTitle
          : stage === 'guided'
            ? fa.curriculum.kanaStageGuidedTitle
            : stage === 'free'
              ? fa.curriculum.kanaStageFreeTitle
              : fa.curriculum.kanaStageDoneTitle(kana.glyph);

  // -------------------------------------------------- render
  return (
    <section
      className="flex flex-col gap-4 rounded-md border border-ink-faint bg-card p-5"
      aria-label={`${kana.romaji} — ${stageTitle}`}
      data-kana-stage={stage}
    >
      {/* ---- stage header: title + the two essential controls ---- */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-small font-bold text-ai">
          <Hand aria-hidden className="size-4" />
          {stageTitle}
        </p>
        <div className="flex items-center gap-2">
          {audioUrls ? (
            <button
              type="button"
              onClick={playSound}
              className="flex min-h-9 items-center gap-1 rounded-md border border-ai px-3 text-caption font-bold text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
              aria-label={fa.curriculum.kanaSoundLabel(kana.glyph)}
            >
              <Volume2 aria-hidden className="size-4" />
              {fa.curriculum.kanaSoundReplay}
            </button>
          ) : null}
          {stage === 'demo' ? (
            <button
              type="button"
              onClick={() => setRestartSignal((n) => n + 1)}
              className="flex min-h-9 items-center gap-1 rounded-md border border-ai px-3 text-caption font-bold text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
            >
              <RotateCcw aria-hidden className="size-4" />
              {fa.curriculum.kanaStageDemoReplay}
            </button>
          ) : null}
          {stage === 'guided' || stage === 'free' ? (
            <button
              type="button"
              onClick={() => setHintSignal((n) => n + 1)}
              className="min-h-9 rounded-md border border-ai px-3 text-caption font-bold text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
            >
              {fa.curriculum.kanaStageHelpBtn}
            </button>
          ) : null}
        </div>
      </div>

      {/* ---- Stage 1 · encounter: the glyph ALONE with its sound ---- */}
      {stage === 'encounter' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <JaBlock className="font-jp text-[clamp(6rem,26vw,10rem)] font-bold leading-none text-ink">
            {kana.glyph}
          </JaBlock>
          <div className="flex flex-wrap items-center justify-center gap-3 text-center" dir="rtl">
            {showRomaji ? (
              <span className="font-mono text-h3 font-bold text-indigo" dir="ltr">
                {kana.romaji}
              </span>
            ) : null}
            {teaching ? <span className="text-h3 font-bold text-ink">{teaching.pronunciationFa}</span> : null}
            {audioUrls ? (
              <span className="text-caption text-ink-faint">{fa.curriculum.kanaStageAudioOnce}</span>
            ) : (
              <span className="flex items-center gap-1 text-caption text-ink-faint">
                <Ear aria-hidden className="size-3" />
                {fa.curriculum.kanaAudioPending}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={goDemo}
            className="flex min-h-11 items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            <Play aria-hidden className="size-4" />
            {fa.curriculum.kanaStageEncounterCta}
          </button>
        </div>
      )}

      {/* ---- Stages 2/4/5 · the unified canvas + narrated side panel ---- */}
      {(stage === 'demo' || stage === 'guided' || stage === 'free') && (
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-start md:justify-center">
          <div className="w-full max-w-[26rem] shrink">
            <WritingCanvas
              character={kana.glyph}
              mode={stage === 'demo' ? 'demo' : stage}
              restartSignal={restartSignal}
              hintSignal={hintSignal}
              onDemoStrokeStart={setDemoStroke}
              onDemoDone={onDemoDone}
              onJudgement={handleJudgement}
              onAttemptComplete={stage === 'guided' ? onGuidedComplete : stage === 'free' ? onFreeComplete : undefined}
              key={`${stage}-${restartSignal}`}
            />
            {/* stroke progress dots — status feedback the owner asked to keep */}
            {totalStrokes > 0 ? (
              <div
                className="mt-3 flex flex-wrap items-center justify-center gap-2"
                aria-label={fa.curriculum.kanaStageStrokeProgress}
              >
                {Array.from({ length: totalStrokes }, (_, i) => {
                  const done = stage === 'demo' ? i < demoStroke : attempt ? attempt.completed.includes(i) : false;
                  const current = stage === 'demo' ? i === demoStroke : attempt ? attempt.expectedIndex === i : false;
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
                <span className="text-caption text-ink-faint">
                  {faNum(currentStrokeIndex + 1)} / {faNum(totalStrokes)} {fa.curriculum.kanaStrokesWord}
                </span>
              </div>
            ) : null}
          </div>

          {/* narrated side panel (#117 §4: per-stroke guide beside the glyph) */}
          <div className="w-full max-w-[22rem] space-y-3" dir="rtl">
            {strokeInfo ? (
              <div className="rounded-md border border-ai/40 bg-indigo-wash/40 p-4" data-stroke-info={strokeInfo.label}>
                <p className="text-body font-bold text-ink">{strokeInfo.label}</p>
                <p className="mt-2 text-small text-ink">{strokeInfo.startFa}</p>
                <p className="mt-1 text-small text-ink">{strokeInfo.directionFa}</p>
                <p className="mt-2 text-caption leading-[var(--leading-fa)] text-ink-soft">{strokeInfo.movementFa}</p>
                {teaching?.strokeHintFa ? (
                  <p className="mt-3 border-t border-ink-faint/50 pt-2 text-caption leading-[var(--leading-fa)] text-ink-soft">
                    <MixedFaJaText text={teaching.strokeHintFa} />
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-small text-ink-faint">{fa.common.loading}</p>
            )}

            {/* live feedback (#117 §1: precise, never vague) */}
            {feedback ? (
              <p
                role="status"
                aria-live="polite"
                className="rounded-md border border-shu/40 bg-surface-warm px-3 py-2 text-small leading-[var(--leading-fa)] text-ink"
                data-writing-feedback
              >
                {feedback}
              </p>
            ) : null}

            {stage === 'free' ? (
              <button
                type="button"
                onClick={() => startAttempt('guided')}
                className="min-h-10 rounded-md border border-ink-faint bg-card px-4 text-caption font-bold text-ink transition-colors hover:bg-surface-warm"
              >
                {fa.curriculum.kanaStageBackToGuided}
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* ---- Stage 3 · explain: gradual reveal, ink-style entrances ---- */}
      {stage === 'explain' && (
        <div className="space-y-4">
          {/* reading & features */}
          <div className="kana-reveal flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <JaBlock className="font-jp text-[clamp(3rem,10vw,4.5rem)] font-bold leading-none text-ink">
                {kana.glyph}
              </JaBlock>
              <div className="space-y-1 pt-1">
                {showRomaji ? (
                  <p className="font-mono text-h3 font-bold text-indigo" dir="ltr">
                    {kana.romaji}
                  </p>
                ) : null}
                {teaching ? <p className="text-h3 font-bold text-ink">{teaching.pronunciationFa}</p> : null}
              </div>
            </div>
            {teaching?.pronunciationNoteFa ? (
              <p className="max-w-sm text-small leading-[var(--leading-fa)] text-ink-soft">
                {teaching.pronunciationNoteFa}
              </p>
            ) : null}
          </div>

          {/* mnemonic (honest draft label — OQ-051) */}
          {mn && (
            <div className="kana-reveal kana-reveal-2 rounded-md bg-surface-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-small font-bold text-ink">{mn.coreImageFa}</span>
                <span className="rounded-full bg-ink-faint/30 px-2 py-0.5 text-micro text-ink-faint">
                  {mn.honestLabelFa}
                </span>
                <span className="rounded-full border border-amber-600/50 px-2 py-0.5 text-micro text-amber-700">
                  {fa.curriculum.kanaMnemonicDraft}
                </span>
              </div>
              <p className="mt-2 text-body leading-[var(--leading-fa)] text-ink">
                <MixedFaJaText text={mn.storyFa} />
              </p>
            </div>
          )}

          {/* a real readable word — with its meaning (#117 §6) */}
          {kana.hostWord && (
            <div className="kana-reveal kana-reveal-3 rounded-md border border-ai/30 bg-indigo-wash/30 p-4">
              <p className="text-caption text-ink-faint">{fa.curriculum.kanaHostWordPrefix}</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <JaBlock className="font-jp text-h2 font-bold text-ink" lang="ja">
                  {kana.hostWord.word}
                </JaBlock>
                <span className="text-body text-ink-soft">— {kana.hostWord.meaningFa}</span>
              </div>
            </div>
          )}

          {/* confusable pair, side by side */}
          {mn?.pairGlyphs && mn.pairGlyphs.length > 0 && (
            <div className="kana-reveal kana-reveal-4 rounded-md border border-shu/40 bg-surface-warm p-4">
              <p className="text-small font-bold text-ink">{fa.curriculum.kanaPairCompareTitle}</p>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <span className="flex flex-col items-center gap-1">
                  <JaBlock className="grid size-14 place-items-center rounded-md border-2 border-ai bg-card font-jp text-h2 font-bold text-ink">
                    {kana.glyph}
                  </JaBlock>
                  <span className="font-mono text-caption text-ai" dir="ltr">
                    {kana.romaji}
                  </span>
                </span>
                {mn.pairGlyphs.map((glyph) => (
                  <span key={glyph} className="flex flex-col items-center gap-1">
                    <JaBlock className="grid size-14 place-items-center rounded-md border-2 border-ink-faint bg-card font-jp text-h2 font-bold text-ink-soft">
                      {glyph}
                    </JaBlock>
                    <span className="text-caption text-ink-faint">{fa.curriculum.kanaPairOther}</span>
                  </span>
                ))}
              </div>
              {mn.pairHintFa ? (
                <p className="mt-3 text-small leading-[var(--leading-fa)] text-ink">
                  <MixedFaJaText text={mn.pairHintFa} />
                </p>
              ) : null}
            </div>
          )}
          {!mn?.pairGlyphs && confusableNoteFa ? (
            <p className="kana-reveal kana-reveal-4 text-small text-ink-faint">{confusableNoteFa}</p>
          ) : null}

          <button
            type="button"
            onClick={() => startAttempt('guided')}
            className="kana-reveal kana-reveal-5 flex min-h-11 items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            <Hand aria-hidden className="size-4" />
            {fa.curriculum.kanaStageExplainCta}
          </button>
        </div>
      )}

      {/* ---- done: compact completion ---- */}
      {stage === 'done' && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div
            role="status"
            className="flex items-center gap-3 rounded-md border border-success/50 bg-success/10 px-5 py-3"
          >
            <JaBlock className="font-jp text-h1 font-bold text-ink">{kana.glyph}</JaBlock>
            <p className="text-body font-bold text-success">{fa.curriculum.kanaStageFreeDone}</p>
          </div>
          <button
            type="button"
            onClick={() => startAttempt('free')}
            className="min-h-10 rounded-md border border-ink-faint bg-card px-4 text-caption font-bold text-ink transition-colors hover:bg-surface-warm"
          >
            {fa.curriculum.kanaStagePracticeAgain}
          </button>
        </div>
      )}

      {/* engine + data attribution — compact, out of the teaching flow (#117 §9) */}
      <details className="border-t border-ink-faint pt-2 text-micro text-ink-faint">
        <summary className="cursor-pointer select-none">دربارهٔ ابزار رسم و منابع</summary>
        <p className="mt-1 leading-[var(--leading-fa)]">
          دادهٔ ترتیب ضربه‌ها: KanjiVG (CC BY-SA 3.0) —{' '}
          <a
            href="/writing-data/licenses/README-KanjiVG.md"
            className="text-ai underline"
            target="_blank"
            rel="noreferrer"
          >
            مجوزها
          </a>
          . ارزیابی و رسم کاملاً در مرورگر شما انجام می‌شود؛ مسیر قلم شما هرگز ارسال نمی‌شود.
        </p>
      </details>
    </section>
  );
}

/** Persian digits for the stroke counter. */
function faNum(n: number): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);
}
