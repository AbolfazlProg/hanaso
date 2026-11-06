'use client';
/**
 * HANASO — KanaCard v4 (TASK-LEARNING-08 v4 — owner final correction).
 *
 * ONE page, ONE environment, ZERO stage-switching (owner §1/§10): the big
 * WritingCanvas is the heart of the card from the first second to the last.
 * The character appears INSIDE the canvas (ink writing itself), the sound
 * plays, the stroke-order demonstration runs, the explanations unfold AROUND
 * the canvas, and practice (guided → free) happens in the SAME canvas — all
 * automatically. There is NO «مرحلهٔ بعد» button anywhere; the only controls
 * are «تکرار آموزش», the audio replay, and «راهنما» during practice.
 *
 * Timeline (auto — owner §3, five stages):
 *   1 intro    the glyph writes itself in the canvas + sound once + reading
 *   2 demo     slow teaching pass: per-stroke number badge on the canvas,
 *              start dot, direction arrow + the narrated side panel
 *   3 explain  the finished glyph rests in soft ink; pronunciation note →
 *              mnemonic → the real word (char-by-char in Japanese reading
 *              order, the target kana highlighted) → confusable pair
 *   4 guided   practice on the dashed guide in the same canvas
 *   5 free     writing from memory in the same canvas
 *   done       completion — the walk continues (onWritingDone).
 *
 * Everything teaching-related the v3 card showed still lives here —
 * reorganized AROUND the canvas (owner §2), nothing useful deleted.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ear, Hand, RotateCcw, Volume2 } from 'lucide-react';
import { fa } from '@/messages/fa';
import { KANA_TEACHING_BY_ID } from '@/modules/curriculum/content/kana-teaching';
import type { KanaItem } from '@/modules/curriculum/types';
import { JaBlock } from '@/components/patterns/ja-block';
import { MixedFaJaText } from '@/components/curriculum/mixed-fa-ja-text';
import { WritingCanvas } from '@/components/writing/writing-canvas';
import { loadWritingCharData, writingAvailability, type WritingCharData } from '@/modules/writing';
import { strokeInfoFa, type StrokeInfoFa } from '@/modules/writing/render';
import type { StrokeJudgement, WritingAttemptState } from '@/modules/writing/engine';

export type KanaStage = 'intro' | 'demo' | 'explain' | 'guided' | 'free' | 'done';

/** Old snapshots say «encounter» — v4 renamed it to «intro». */
export function normalizeKanaStage(stage: string | undefined): KanaStage {
  if (stage === 'encounter') return 'intro';
  if (
    stage === 'intro' ||
    stage === 'demo' ||
    stage === 'explain' ||
    stage === 'guided' ||
    stage === 'free' ||
    stage === 'done'
  )
    return stage;
  return 'intro';
}

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

/** Beat between auto stages — long enough to feel calm, short enough to flow. */
const STAGE_BEAT_MS = 650;
/** The explain stage settles before practice begins (content STAYS visible). */
const EXPLAIN_SETTLE_MS = 4200;

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
  const [stage, setStage] = useState<KanaStage>(() => normalizeKanaStage(initialProgress?.stage));
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
  /** Auto-advance timers — cancelled on every stage change (owner §4: state
   *  must survive interruption/replay without ever breaking the controls). */
  const beatTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  attemptRef.current = attempt;

  const clearBeats = useCallback(() => {
    for (const t of beatTimersRef.current) clearTimeout(t);
    beatTimersRef.current = [];
  }, []);
  const beat = useCallback((fn: () => void, ms: number) => {
    beatTimersRef.current.push(setTimeout(fn, ms));
  }, []);

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
    clearBeats();
    onProgress?.({ stage });
  }, [stage, onProgress, clearBeats]);

  useEffect(
    () => () => {
      clearBeats();
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [clearBeats],
  );

  // -------------------------------------------------- audio: one element, 1.0×, no overlap
  const playSound = useCallback(() => {
    if (!audioUrls) return;
    audioRef.current?.pause();
    const el = new Audio(audioUrls.opus);
    el.playbackRate = 1; // owner §5: normal speed is exactly 1.0
    el.addEventListener('error', () => {
      el.src = audioUrls.m4a; // dual-format fallback (ADR-009)
      void Promise.resolve(el.play()).catch(() => undefined);
    });
    audioRef.current = el;
    // jsdom/test DOMs return undefined from play() — guard without changing
    // the real-browser promise semantics
    void Promise.resolve(el.play()).catch(() => undefined);
  }, [audioUrls]);

  /** Audio moments (owner §5): intro once → demo end once → guided entry once. */
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
    if (stage === 'intro') playOnce('intro');
    if (stage === 'guided') playOnce('guided');
  }, [stage, playOnce]);

  // -------------------------------------------------- the auto timeline
  /** intro finished (glyph fully inked) → a beat → the teaching demo. */
  const onIntroDone = useCallback(() => {
    beat(() => setStage('demo'), STAGE_BEAT_MS);
  }, [beat]);

  /** demo finished → the character's sound once → explanations. */
  const onDemoDone = useCallback(() => {
    playOnce('demo-done');
    setStage('explain');
  }, [playOnce]);

  /** explain content settles → practice begins in the SAME canvas. */
  useEffect(() => {
    if (stage !== 'explain') return;
    beat(() => {
      attemptStartRef.current = Date.now();
      setFeedback(null);
      setRestartSignal((n) => n + 1);
      setStage('guided');
    }, EXPLAIN_SETTLE_MS);
  }, [stage, beat]);

  /** «تکرار آموزش» — the whole teaching timeline replays from the top. */
  const replayTeaching = useCallback(() => {
    clearBeats();
    setFeedback(null);
    setDemoStroke(-1);
    setHintSignal(0);
    setRestartSignal((n) => n + 1);
    setStage('intro');
  }, [clearBeats]);

  const handleJudgement = useCallback((j: StrokeJudgement, state: WritingAttemptState) => {
    setAttempt(state);
    setFeedback(j.feedbackFa);
    // help escalation (owner §6): the second miss on a stroke flashes the guide
    if (j.judge === 'rejected' || j.judge === 'uncertain_retry') {
      if (state.missesOnStroke >= 2) setHintSignal((n) => n + 1);
    }
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
    beat(() => {
      attemptStartRef.current = Date.now();
      setFeedback(null);
      setRestartSignal((n) => n + 1);
      setStage('free');
    }, 1500);
  }, [beat, playOnce, reportAttempt]);

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
  const inPractice = stage === 'guided' || stage === 'free';
  const inShow = stage === 'intro' || stage === 'demo';

  const stageTitle =
    stage === 'intro'
      ? fa.curriculum.kanaStageIntroTitle
      : stage === 'demo'
        ? fa.curriculum.kanaStageDemoTitle
        : stage === 'explain'
          ? fa.curriculum.kanaStageExplainTitle
          : stage === 'guided'
            ? fa.curriculum.kanaStageGuidedTitle
            : stage === 'free'
              ? fa.curriculum.kanaStageFreeTitle
              : fa.curriculum.kanaStageDoneTitle(kana.glyph);

  const stageChip =
    stage === 'intro'
      ? fa.curriculum.kanaStageChipIntro
      : stage === 'demo'
        ? fa.curriculum.kanaStageChipDemo
        : stage === 'explain'
          ? fa.curriculum.kanaStageChipExplain
          : stage === 'guided'
            ? fa.curriculum.kanaStageChipGuided
            : stage === 'free'
              ? fa.curriculum.kanaStageChipFree
              : fa.curriculum.kanaStageChipDone;

  // -------------------------------------------------- render
  return (
    <section
      className="flex flex-col gap-4 rounded-md border border-ink-faint bg-card p-5"
      aria-label={`${kana.romaji} — ${stageTitle}`}
      data-kana-stage={stage}
    >
      {/* ---- header: stage chip + title + the essential controls ---- */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-small font-bold text-ai">
          <Hand aria-hidden className="size-4" />
          {stageTitle}
          <span className="rounded-full border border-ink-faint bg-surface-sunken px-2 py-0.5 text-micro font-normal text-ink-soft">
            {stageChip}
          </span>
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
          <button
            type="button"
            onClick={replayTeaching}
            className="flex min-h-9 items-center gap-1 rounded-md border border-ai px-3 text-caption font-bold text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            <RotateCcw aria-hidden className="size-4" />
            {fa.curriculum.kanaReplayTeaching}
          </button>
          {inPractice ? (
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

      {/* ---- THE environment: the canvas (always) + the teaching column ---- */}
      <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center">
        {/* canvas column — the heart of the lesson; never unmounts */}
        <div className="w-full max-w-[26rem] shrink">
          <WritingCanvas
            character={kana.glyph}
            mode={
              stage === 'intro' ? 'intro' : stage === 'explain' ? 'reference' : stage === 'done' ? 'reference' : stage
            }
            restartSignal={restartSignal}
            hintSignal={hintSignal}
            onIntroDone={onIntroDone}
            onDemoStrokeStart={setDemoStroke}
            onDemoDone={onDemoDone}
            onJudgement={handleJudgement}
            onAttemptComplete={inPractice ? (stage === 'guided' ? onGuidedComplete : onFreeComplete) : undefined}
            key={`${stage}-${restartSignal}`}
          />
          {/* stroke progress dots — status feedback (owner §2: وضعیت پیشرفت) */}
          {totalStrokes > 0 ? (
            <div
              className="mt-3 flex flex-wrap items-center justify-center gap-2"
              aria-label={fa.curriculum.kanaStageStrokeProgress}
            >
              {Array.from({ length: totalStrokes }, (_, i) => {
                const done = inShow ? i < demoStroke : attempt ? attempt.completed.includes(i) : false;
                const current = inShow ? i === demoStroke : attempt ? attempt.expectedIndex === i : false;
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
          {stage === 'intro' ? (
            <p className="mt-2 text-center text-caption text-ink-faint">{fa.curriculum.kanaStageIntroHint}</p>
          ) : null}
        </div>

        {/* teaching column — what the teacher says AROUND the notebook */}
        <div className="w-full max-w-[24rem] space-y-3 lg:max-w-[22rem]" dir="rtl">
          {/* reading — from the very first second (owner §2: تلفظ) */}
          <div className="kana-reveal rounded-md border border-ink-faint bg-surface-sunken/60 p-4">
            <div className="flex flex-wrap items-baseline gap-3">
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
            {teaching?.pronunciationNoteFa ? (
              <p
                className={`mt-2 text-small leading-[var(--leading-fa)] text-ink-soft ${
                  stage === 'intro' ? 'opacity-0' : 'kana-reveal'
                }`}
              >
                {teaching.pronunciationNoteFa}
              </p>
            ) : null}
          </div>

          {/* live stroke narration — during the demo AND practice (owner §2) */}
          {inShow || inPractice ? (
            strokeInfo ? (
              <div
                className="rounded-md border border-ai/40 bg-indigo-wash/40 p-4 transition-colors"
                data-stroke-info={strokeInfo.label}
              >
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
            )
          ) : null}

          {/* live feedback (owner §6: precise, never vague) */}
          {feedback && inPractice ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-md border border-shu/40 bg-surface-warm px-3 py-2 text-small leading-[var(--leading-fa)] text-ink"
              data-writing-feedback
            >
              {feedback}
            </p>
          ) : null}

          {/* mnemonic — unfolds at the explain stage and stays (owner §3) */}
          {mn && stage !== 'intro' && stage !== 'demo' ? (
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
          ) : null}

          {/* the real word — char by char in Japanese reading order (owner §3
              مرحلهٔ چهارم): the characters appear gradually, the target kana is
              highlighted, the meaning follows the last character. */}
          {kana.hostWord && stage !== 'intro' && stage !== 'demo' ? (
            <div className="kana-reveal kana-reveal-3 rounded-md border border-ai/30 bg-indigo-wash/30 p-4">
              <p className="text-caption text-ink-faint">{fa.curriculum.kanaHostWordPrefix}</p>
              <p className="mt-1 font-jp text-h2 font-bold text-ink" lang="ja" dir="ltr">
                {Array.from(kana.hostWord.word).map((ch, i) => (
                  <span
                    key={`${ch}-${i}`}
                    className={`word-char-in ${ch === kana.glyph ? 'rounded-md bg-shu/20 px-1 text-shu-deep' : ''}`}
                    style={{ animationDelay: `${300 + i * 450}ms` }}
                  >
                    {ch}
                  </span>
                ))}
              </p>
              <p
                className="word-meaning-in mt-1 text-body text-ink-soft"
                style={{ animationDelay: `${300 + Array.from(kana.hostWord.word).length * 450 + 250}ms` }}
              >
                — {kana.hostWord.meaningFa}
              </p>
            </div>
          ) : null}

          {/* confusable pair, side by side — stays after the explain stage */}
          {mn?.pairGlyphs && mn.pairGlyphs.length > 0 && stage !== 'intro' && stage !== 'demo' ? (
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
          ) : null}
          {!mn?.pairGlyphs && confusableNoteFa && stage !== 'intro' && stage !== 'demo' ? (
            <p className="kana-reveal kana-reveal-4 text-small text-ink-faint">{confusableNoteFa}</p>
          ) : null}

          {/* free stage: the way back to guided practice (owner §6) */}
          {stage === 'free' ? (
            <button
              type="button"
              onClick={() => {
                attemptStartRef.current = Date.now();
                setFeedback(null);
                setRestartSignal((n) => n + 1);
                setStage('guided');
              }}
              className="min-h-10 rounded-md border border-ink-faint bg-card px-4 text-caption font-bold text-ink transition-colors hover:bg-surface-warm"
            >
              {fa.curriculum.kanaStageBackToGuided}
            </button>
          ) : null}

          {/* done — compact completion inside the same environment */}
          {stage === 'done' ? (
            <div
              role="status"
              className="kana-reveal flex flex-col gap-3 rounded-md border border-success/50 bg-success/10 p-4"
            >
              <p className="text-body font-bold text-success">{fa.curriculum.kanaStageFreeDone}</p>
              <button
                type="button"
                onClick={() => {
                  attemptStartRef.current = Date.now();
                  setFeedback(null);
                  setRestartSignal((n) => n + 1);
                  setStage('free');
                }}
                className="min-h-10 w-fit rounded-md border border-ink-faint bg-card px-4 text-caption font-bold text-ink transition-colors hover:bg-surface-warm"
              >
                {fa.curriculum.kanaStagePracticeAgain}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* engine + data + audio attribution — compact, out of the teaching flow
          (owner §7). VOICEVOX:九州そら credit is a license requirement. */}
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
          . صداها: VOICEVOX:九州そら — از پیش تولیدشده و آفلاین. ارزیابی و رسم کاملاً در مرورگر شما انجام می‌شود؛ مسیر
          قلم شما هرگز ارسال نمی‌شود.
        </p>
      </details>
    </section>
  );
}

/** Persian digits for the stroke counter. */
function faNum(n: number): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);
}
