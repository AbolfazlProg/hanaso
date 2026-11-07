'use client';
/**
 * HANASO — KanaCard v6 (TASK-LEARNING-08 Addendum-3 → approved intro layout).
 *
 * ONE page, ONE environment, ZERO stage-switching: the big WritingCanvas is
 * the heart of the card from the first second to the last. Addendum-3 §5 —
 * the NUMBERED stroke-order teaching animation is the FIRST content the
 * learner sees, playing in the canvas itself (no faint static template),
 * with the explanations unfolding AROUND it while it runs.
 *
 * APPROVED KANA INTRODUCTION LAYOUT (owner-approved wireframe) — the
 * introduction is now five ordered sections, nothing below the canvas jumps
 * in between, and the CTA lives at the very END, in the page footer:
 *
 *   §۱  عنوان کاراکتر        — script·row label + the BIG glyph + reading
 *   §۲  کادر بزرگ آموزش نوشتن  — the hero canvas box (numbered stroke-order
 *                               animation; strokes persist; the page's visual
 *                               heart) + stroke progress + stage hints
 *   §۳  دو باکس آموزشی        — «روش نوشتن» (start/direction/order/tips + live
 *                               stroke narration & feedback) | «تلفظ و یادسپار"
 *                               (fa+latin reading, character audio, mnemonic,
 *                               confusable pair) — side by side on desktop
 *   §۴  نمونه‌های کاربردی      — ALL related examples in ONE full-width box
 *                               (word + fa reading + meaning + own audio +
 *                               authored pronunciation guides)
 *   §۵  Footer               — subtle divider → «پایان معرفی کاراکتر» → the
 *                               CTA «شروع تمرین نوشتن ←» → the caption —
 *                               AFTER every introduction element, never under
 *                               the canvas or between the teaching boxes
 *
 * Timeline (kept — the stage machine is untouched):
 *   1 intro    the numbered stroke-order animation in the hero canvas
 *   2 ready    the ONE interactive stop: the footer CTA (Addendum-2 §4)
 *   3 guided   practice on the dashed guide in the same canvas
 *   4 free     writing from memory in the same canvas
 *   done       completion — the walk continues (onWritingDone)
 *
 * During practice (guided/free) the intro-only sections COLLAPSE into folds
 * (Addendum-5 §1 kept — nothing is deleted, one tap reopens) while the
 * canvas, the stroke guide and the practice status stay around the canvas.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Ear, Hand, Info, Mic, PenLine, RotateCcw, Volume2 } from 'lucide-react';
import { fa } from '@/messages/fa';
import { KANA_READING_FA_BY_GLYPH, KANA_TEACHING_BY_ID } from '@/modules/curriculum/content/kana-teaching';
import { KANA_ITEMS_BY_GLYPH } from '@/modules/curriculum/content/kana-items';
import { kanaWordRomaji } from '@/modules/curriculum/kana-romaji';
import type { KanaItem } from '@/modules/curriculum/types';
import { JaBlock } from '@/components/patterns/ja-block';
import { MixedFaJaText } from '@/components/curriculum/mixed-fa-ja-text';
import { ExampleAudioButton } from '@/components/curriculum/example-audio-button';
import { WritingCanvas } from '@/components/writing/writing-canvas';
import { loadWritingCharData, writingAvailability, type WritingCharData } from '@/modules/writing';
import { strokeInfoFa, type StrokeInfoFa } from '@/modules/writing/render';
import type { StrokeJudgement, WritingAttemptState } from '@/modules/writing/engine';
import { createAttemptState } from '@/modules/writing/engine';
import { useAudioToggle } from '@/modules/audio/toggle-playback';
import { EXPERIENCE } from '@/config/experience';

export type KanaStage = 'intro' | 'ready' | 'guided' | 'free' | 'done';

/**
 * Legacy snapshot mapping (v4 had demo/explain stages; v5 merged them into
 * intro/ready — Addendum-3 §5): someone who saved mid-«demo» simply re-watches
 * the teaching pass; someone who saved at «explain» has already seen it.
 */
export function normalizeKanaStage(stage: string | undefined): KanaStage {
  if (stage === 'encounter' || stage === 'demo') return 'intro';
  if (stage === 'explain') return 'ready';
  if (stage === 'ready' || stage === 'guided' || stage === 'free' || stage === 'done') return stage;
  return 'intro';
}

export interface KanaCardProgress {
  stage: KanaStage;
}

/**
 * Approved intro layout §۴ — ONE usage example related to this glyph: the
 * station's example-set entry whose Japanese word CONTAINS the character
 * (structural subset of the example-set block item — station-runner passes
 * the authored objects unchanged, in their authored educational order).
 */
export interface KanaRelatedExample {
  id: string;
  role: 'anchor' | 'near' | 'varied' | 'faded' | 'reading';
  ja: string;
  reading: string;
  fa: string;
  whyFa: string;
  pronFa?: string;
}

export interface KanaCardProps {
  kana: KanaItem;
  /** Kept for back-compat — the Latin reading is ALWAYS shown now (§8). */
  showRomaji: boolean;
  /** Optional confusable note authored on the block (kept for back-compat). */
  confusableNoteFa?: string;
  /** Server-resolved audio pair for THIS glyph (null = no committed asset). */
  audioUrls: { opus: string; m4a: string } | null;
  /** Addendum-3 §9 — the host word's own audio pair (null = not generated). */
  wordAudioUrls: { opus: string; m4a: string } | null;
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
  /**
   * Approved intro layout §۴ — the station's example-set entries that contain
   * THIS glyph, in their authored educational order (empty/absent = the
   * examples section renders with the host word only, or not at all).
   */
  relatedExamples?: KanaRelatedExample[];
  /**
   * Approved intro layout §۴ — the per-word example audio registry (the SAME
   * record the example-set block uses; a word without a committed asset gets
   * no play control — honest, never misbound).
   */
  exampleAudioByWord?: Record<string, { opus: string; m4a: string } | null>;
}

export function KanaCard({
  kana,
  confusableNoteFa,
  audioUrls,
  wordAudioUrls,
  onWritingAttempt,
  onWritingDone,
  initialProgress,
  onProgress,
  relatedExamples,
  exampleAudioByWord,
}: KanaCardProps): React.JSX.Element {
  const teaching = KANA_TEACHING_BY_ID[kana.kanaId];
  const [stage, setStage] = useState<KanaStage>(() => normalizeKanaStage(initialProgress?.stage));
  const [charData, setCharData] = useState<WritingCharData | null>(null);
  const [demoStroke, setDemoStroke] = useState(-1);
  const [attempt, setAttempt] = useState<WritingAttemptState | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [restartSignal, setRestartSignal] = useState(0);
  const [hintSignal, setHintSignal] = useState(0);
  /** §2 — a canvas teaching replay is running (any stage). */
  const [replayRunning, setReplayRunning] = useState(false);
  const [replaySignal, setReplaySignal] = useState(0);

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
    },
    [clearBeats],
  );

  // -------------------------------------------------- audio (§9: normal ⇄ slow)
  const sound = useAudioToggle(audioUrls, kana.kanaId);
  const wordSound = useAudioToggle(wordAudioUrls, kana.hostWord?.word);

  /** Audio moments (owner §5): entry once → teaching-done once → guided entry once. */
  const audioMomentsRef = useRef<Set<string>>(new Set());
  const playOnce = useCallback(
    (moment: string) => {
      if (audioMomentsRef.current.has(moment)) return;
      audioMomentsRef.current.add(moment);
      // automatic moments stay at normal speed and never consume the learner's
      // click cycle (§9: the FIRST click is always normal)
      sound.playNormal();
    },
    [sound],
  );

  useEffect(() => {
    if (stage === 'intro') playOnce('intro');
    if (stage === 'guided') playOnce('guided');
  }, [stage, playOnce]);

  // -------------------------------------------------- the auto timeline
  /**
   * The numbered teaching pass finished → the ready beat (Addendum-2 §4 +
   * Addendum-3 §5: the animation is watched FIRST, then the ONE confirm).
   */
  const onIntroDone = useCallback(() => {
    playOnce('teach-done');
    setStage('ready');
  }, [playOnce]);

  /**
   * Addendum-4 §3/§5 — ONE helper for EVERY practice (re)start: bumps the
   * canvas restart, hands the PARENT a fresh attempt too (the old attempt used
   * to leak the PREVIOUS practice's last stroke into the new stage's panel and
   * progress dots), clears the feedback, then switches the stage. No stage
   * transition ever re-runs the teaching animation.
   *
   * Addendum-5 §1 — after the CTA «شروع تمرین نوشتن» the page SOFT-SCROLLS the
   * writing canvas fully into view (below the sticky header, measured at run
   * time — the canvas must never sit hidden under the bar) and the practice
   * starts IMMEDIATELY in the same canvas. No route, no new page.
   */
  const canvasAnchorRef = useRef<HTMLDivElement | null>(null);
  const scrollToCanvas = useCallback(() => {
    if (typeof window === 'undefined' || !canvasAnchorRef.current) return;
    const el = canvasAnchorRef.current;
    // Approved intro layout: the whole teaching card is brought into view —
    // the compact title row (with the practice controls: replay / help) stays
    // reachable below the sticky header, and the hero canvas sits fully
    // visible below it. (The previous layout scrolled the bare canvas to the
    // header edge, leaving the controls stranded underneath the sticky bar —
    // measured on production: replay button top 51px vs header bottom 80px.)
    const card = el.closest('section');
    const target = card ?? el;
    const header = document.querySelector('header.sticky');
    const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - Math.max(0, headerBottom) - 12;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  }, []);
  const beginPractice = useCallback(
    (next: 'guided' | 'free') => {
      attemptStartRef.current = Date.now();
      setFeedback(null);
      setRestartSignal((n) => n + 1);
      setAttempt(createAttemptState(kana.glyph)); // fresh — no stale stroke info
      setStage(next);
      // Addendum-5 §1: the canvas becomes the focal point the moment practice
      // begins — after React commits the new stage (rAF → next paint).
      requestAnimationFrame(() => scrollToCanvas());
    },
    [kana.glyph, scrollToCanvas],
  );

  /** «شروع تمرین نوشتن» (footer §۵) → guided practice in the SAME canvas. */
  const startPractice = useCallback(() => beginPractice('guided'), [beginPractice]);

  /**
   * Addendum-3 §2 — «تکرار آموزش»: replay the numbered animation from the
   * first stroke IN PLACE. NEVER resets the page, the lesson or the attempt —
   * in the intro stage it simply restarts the intro pass; later stages run a
   * canvas replay. Rapid clicks are absorbed (disabled while running).
   * Addendum-4 §2/§6: the replay's audio is an AUTOMATIC moment — normal
   * speed, never consuming the learner's click cycle.
   */
  const replayTeaching = useCallback(() => {
    if (replayRunning) return; // §2 rapid-click guard
    setDemoStroke(-1);
    sound.playNormal();
    if (stage === 'intro') {
      setRestartSignal((n) => n + 1);
      return;
    }
    setReplayRunning(true);
    setReplaySignal((n) => n + 1);
  }, [replayRunning, sound, stage]);

  const onReplayDone = useCallback(() => {
    setReplayRunning(false);
  }, []);

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
    setFeedback(fa.curriculum.kanaStageGuidedDone);
    // Addendum-2 §2 (kept): the review beat — the completed standard glyph
    // rests (§13 already replaced every stroke with its precise form), then
    // the free attempt starts on its own.
    beat(() => beginPractice('free'), EXPERIENCE.kanaReviewPauseMs);
  }, [beat, beginPractice, reportAttempt]);

  const onFreeComplete = useCallback(() => {
    reportAttempt('free');
    setFeedback(fa.curriculum.kanaStageFreeDone);
    // the same review beat at the end — the clean standard glyph is SEEN for
    // a moment, then the walk continues automatically (no «ادامه» button).
    beat(() => {
      setStage('done');
      onWritingDone?.();
    }, EXPERIENCE.kanaReviewPauseMs);
  }, [beat, onWritingDone, reportAttempt]);

  // -------------------------------------------------- derived panel data
  /** The numbered teaching pass is on screen — the intro stage or a §2 replay. */
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
  const totalStrokes = charData?.medians.length ?? 0;

  const mn = teaching?.mnemonic;
  /** §11 — ONLY approved (human-verified) mnemonics render (no badge, never «final» for a draft). */
  const verifiedMnemonic = mn?.status === 'approved' ? mn : null;
  const inPractice = stage === 'guided' || stage === 'free';
  /** Persian reading FIRST (Addendum-2 §3) — Latin is the small complement (§8). */
  const readingFa = teaching?.pronunciationFa ?? kana.romaji;
  const readingLatin = kana.romaji;
  const hostWord = kana.hostWord;

  const stageTitle =
    stage === 'intro'
      ? fa.curriculum.kanaStageIntroTitle
      : stage === 'ready'
        ? fa.curriculum.kanaStageReadyTitle
        : stage === 'guided'
          ? fa.curriculum.kanaStageGuidedTitle
          : stage === 'free'
            ? fa.curriculum.kanaStageFreeTitle
            : fa.curriculum.kanaStageDoneTitle(kana.glyph);

  const stageChip =
    stage === 'intro'
      ? fa.curriculum.kanaStageChipIntro
      : stage === 'ready'
        ? fa.curriculum.kanaStageChipReady
        : stage === 'guided'
          ? fa.curriculum.kanaStageChipGuided
          : stage === 'free'
            ? fa.curriculum.kanaStageChipFree
            : fa.curriculum.kanaStageChipDone;

  const speedChip = sound.mode === 'slow' ? fa.curriculum.kanaSpeedSlow : fa.curriculum.kanaSpeedNormal;

  // -------------------------------------------------- approved intro layout
  /** §۱ — the character's own name line: script + gojūon row (data-driven). */
  const scriptLabel = kana.script === 'kata' ? fa.curriculum.kanaIntroScriptKata : fa.curriculum.kanaIntroScriptHira;
  const rowLabel = fa.curriculum.kanaIntroRowLabel(kanaRowReadingFa(kana.row));
  /**
   * §۴ — the related usage examples, authored educational order kept. The
   * host word leads when the station's example set does not already contain
   * it (every datum the card had before is still rendered — nothing deleted).
   */
  const exampleList = relatedExamples ?? [];
  const hostWordAlreadyExample = hostWord ? exampleList.some((ex) => ex.ja === hostWord.word) : false;
  const hasExampleContent = exampleList.length > 0 || !!hostWord;

  // -------------------------------------------------- §8/§9 cards (shared JSX)
  // Addendum-5 §1: the same cards render OPEN in the full intro view and inside
  // the collapsed practice fold — ONE definition, no drift between the two.
  const readingCard = (
    <div className="kana-reveal rounded-md border border-ink-faint bg-surface-sunken/60 p-4" data-reading-card>
      <div className="flex flex-wrap items-baseline gap-2">
        {teaching ? <span className="text-h3 font-bold text-ink">{teaching.pronunciationFa}</span> : null}
        <span className="text-ink-faint" aria-hidden>
          |
        </span>
        <span className="font-mono text-caption text-ink-soft" dir="ltr">
          {readingLatin}
        </span>
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
        <p className="kana-reveal mt-2 text-small leading-[var(--leading-fa)] text-ink-soft">
          {teaching.pronunciationNoteFa}
        </p>
      ) : null}
    </div>
  );

  const wordCard = hostWord ? (
    <div className="kana-reveal kana-reveal-2 rounded-md border border-ai/30 bg-indigo-wash/30 p-4" data-word-card>
      <p className="text-caption text-ink-faint">{fa.curriculum.kanaHostWordPrefix}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="font-jp text-h2 font-bold text-ink" lang="ja" dir="ltr">
          {Array.from(hostWord.word).map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className={`word-char-in ${ch === kana.glyph ? 'rounded-md bg-shu/20 px-1 text-shu-deep' : ''}`}
              style={{ animationDelay: `${300 + i * 450}ms` }}
            >
              {ch}
            </span>
          ))}
        </p>
        {wordAudioUrls ? (
          <button
            type="button"
            onClick={wordSound.toggle}
            className="flex min-h-9 items-center gap-1 rounded-md border border-ai px-3 text-caption font-bold text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
            aria-label={`${fa.curriculum.kanaWordAudioLabel(hostWord.word)} — ${fa.curriculum.kanaSpeedLabel}: ${
              wordSound.mode === 'slow' ? fa.curriculum.kanaSpeedSlow : fa.curriculum.kanaSpeedNormal
            }`}
            data-word-audio
            data-audio-mode={wordSound.mode}
          >
            <Volume2 aria-hidden className="size-4" />
            {wordSound.mode === 'slow' ? fa.curriculum.kanaSpeedSlow : fa.curriculum.kanaSpeedNormal}
          </button>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-caption text-ink-soft" dir="ltr">
          {kanaWordRomaji(hostWord.word)}
        </span>
        <span className="text-body text-ink-soft">— {hostWord.meaningFa}</span>
      </div>
    </div>
  ) : null;

  /** §11 — the mnemonic card renders ONLY when verified; a draft is never shown
   *  as final content (no badge, no «review» state in the learner UI). */
  const mnemonicCard = verifiedMnemonic ? (
    <div className="kana-reveal kana-reveal-3 rounded-md bg-surface-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-small font-bold text-ink">{verifiedMnemonic.coreImageFa}</span>
        <span className="rounded-full bg-ink-faint/30 px-2 py-0.5 text-micro text-ink-faint">
          {verifiedMnemonic.honestLabelFa}
        </span>
      </div>
      <p className="mt-2 text-body leading-[var(--leading-fa)] text-ink">
        <MixedFaJaText text={verifiedMnemonic.storyFa} />
      </p>
    </div>
  ) : null;

  /** confusable pair, side by side — Persian | Latin under each glyph (§8). */
  const pairCard =
    mn?.pairGlyphs && mn.pairGlyphs.length > 0 ? (
      <div className="kana-reveal kana-reveal-4 rounded-md border border-shu/40 bg-surface-warm p-4">
        <p className="text-small font-bold text-ink">{fa.curriculum.kanaPairCompareTitle}</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <span className="flex flex-col items-center gap-1">
            <JaBlock className="grid size-14 place-items-center rounded-md border-2 border-ai bg-card font-jp text-h2 font-bold text-ink">
              {kana.glyph}
            </JaBlock>
            <span className="flex items-baseline gap-1 text-caption font-bold text-ink-soft">
              {readingFa.replace(/[«»]/g, '').replace(' کوتاه', '').trim()}
              <span className="font-mono text-micro font-normal text-ink-faint" dir="ltr">
                {readingLatin}
              </span>
            </span>
          </span>
          {mn.pairGlyphs.map((glyph) => (
            <span key={glyph} className="flex flex-col items-center gap-1">
              <JaBlock className="grid size-14 place-items-center rounded-md border-2 border-ink-faint bg-card font-jp text-h2 font-bold text-ink-soft">
                {glyph}
              </JaBlock>
              <span className="flex items-baseline gap-1 text-caption text-ink-faint">
                {KANA_READING_FA_BY_GLYPH[glyph] ?? fa.curriculum.kanaPairOther}
                <span className="font-mono text-micro text-ink-faint/70" dir="ltr">
                  {KANA_ITEMS_BY_GLYPH[glyph]?.romaji ?? ''}
                </span>
              </span>
            </span>
          ))}
        </div>
        {mn.pairHintFa ? (
          <p className="mt-3 text-small leading-[var(--leading-fa)] text-ink">
            <MixedFaJaText text={mn.pairHintFa} />
          </p>
        ) : null}
      </div>
    ) : !mn?.pairGlyphs && confusableNoteFa ? (
      <p className="kana-reveal kana-reveal-4 text-small text-ink-faint">{confusableNoteFa}</p>
    ) : null;

  /**
   * §۴ — the examples box body (ONE definition for the open view and the
   * practice fold — no drift). Each row mirrors the example-set block's card
   * contract exactly: the word is the hero (with THIS glyph highlighted
   * inside it), the Persian reading is big/bold and visually separated from
   * the meaning, the word's OWN audio control sits beside it (no asset → no
   * button — honest), and authored pronunciation guides render where they
   * exist. The host word leads only when the example set doesn't already
   * contain it.
   */
  const examplesBody = (
    <>
      {hostWord && !hostWordAlreadyExample ? wordCard : null}
      {exampleList.map((ex) => (
        <article
          key={ex.id}
          className="rounded-md bg-surface-sunken/40 p-3"
          data-example-card
          data-example-word={ex.ja}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <JaBlock className="text-[clamp(1.75rem,7vw,2.35rem)] font-bold leading-snug text-ink">
                {Array.from(ex.ja).map((ch, i) => (
                  <span
                    key={`${ch}-${i}`}
                    className={ch === kana.glyph ? 'rounded-md bg-shu/20 px-1 text-shu-deep' : undefined}
                  >
                    {ch}
                  </span>
                ))}
              </JaBlock>
              {ex.role === 'reading' ? (
                <span className="rounded-full border border-ai px-3 py-1 text-caption text-ai">
                  {fa.curriculum.kanaIntroExampleNowReadable}
                </span>
              ) : null}
            </div>
            <ExampleAudioButton word={ex.ja} urls={exampleAudioByWord?.[ex.ja] ?? null} />
          </div>
          <p className="mt-2 border-b border-ink-faint/60 pb-2 text-h3 font-bold text-ink" dir="rtl">
            {ex.reading}
          </p>
          <p className="mt-2 text-body leading-[var(--leading-fa)] text-ink-soft">{ex.fa}</p>
          {ex.whyFa ? (
            <p className="mt-1 text-small leading-[var(--leading-fa)] text-ink-soft">
              <MixedFaJaText text={ex.whyFa} />
            </p>
          ) : null}
          {ex.pronFa ? (
            <div
              className="mt-3 flex items-start gap-2 rounded-md border border-shu/40 bg-surface-warm p-3"
              data-pron-guide
            >
              <Mic aria-hidden className="mt-1 size-4 shrink-0 text-shu-deep" />
              <div>
                <p className="text-small font-bold text-ink">{fa.curriculum.examplePronGuideTitle}</p>
                <p className="mt-1 text-small leading-[var(--leading-fa)] text-ink">
                  <MixedFaJaText text={ex.pronFa} />
                </p>
              </div>
            </div>
          ) : null}
        </article>
      ))}
    </>
  );

  // -------------------------------------------------- render
  // APPROVED INTRODUCTION LAYOUT — five ordered sections; the CTA lives in
  // the FOOTER (§۵), after every piece of introduction content and examples —
  // never under the canvas, never between the teaching boxes.
  return (
    <section
      className="flex flex-col gap-5 rounded-md border border-ink-faint bg-card p-5"
      aria-label={`${readingFa} — ${stageTitle}`}
      data-kana-stage={stage}
    >
      {/* ══════════ §۱ — عنوان کاراکتر ══════════
          The character's own name line (script · row), the glyph itself BIG
          and clear, the Persian reading leading with Latin as the small
          complement — hierarchy aligned with the page header above.
          During practice the title COMPACTS (the focused view — the character
          itself is in the canvas): smaller glyph, tighter reading, and the
          practice controls stay reachable right under the sticky bar. */}
      <header className="flex flex-wrap items-center justify-between gap-3" data-intro-section="title">
        <div className="flex items-center gap-4">
          {/* the BIG glyph — the attribute rides on the wrapper so it never
              depends on pattern-component prop forwarding */}
          <div
            data-intro-glyph
            className={`grid shrink-0 place-items-center rounded-lg border-2 border-ink-faint bg-paper shadow-card ${
              inPractice ? 'size-14' : 'size-20'
            }`}
          >
            <JaBlock className={`font-jp font-bold text-ink ${inPractice ? 'text-h2' : 'text-[3.4rem] leading-none'}`}>
              {kana.glyph}
            </JaBlock>
          </div>
          <div className="min-w-0">
            {!inPractice ? (
              <p className="flex flex-wrap items-center gap-2 text-caption text-ink-soft">
                {scriptLabel}
                <span aria-hidden>·</span>
                {rowLabel}
              </p>
            ) : null}
            <p className="flex flex-wrap items-baseline gap-2">
              <span className={`${inPractice ? 'text-h3 font-bold' : 'text-h1 font-black'} leading-tight text-ink`}>
                {readingFa}
              </span>
              <span className="font-mono text-small text-ink-soft" dir="ltr">
                {readingLatin}
              </span>
              <span className="rounded-full border border-ink-faint bg-surface-sunken px-2 py-0.5 text-micro font-normal text-ink-soft">
                {stageChip}
              </span>
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-small font-bold text-ai">
              <Hand aria-hidden className="size-4" />
              {stageTitle}
            </p>
          </div>
        </div>
        {/* the essential controls — unchanged from the previous header row */}
        <div className="flex flex-wrap items-center gap-2">
          {audioUrls ? (
            <button
              type="button"
              onClick={sound.toggle}
              className="flex min-h-9 items-center gap-1 rounded-md border border-ai px-3 text-caption font-bold text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
              aria-label={`${fa.curriculum.kanaSoundLabel(kana.glyph)} — ${fa.curriculum.kanaSpeedLabel}: ${speedChip}`}
              data-audio-mode={sound.mode}
            >
              <Volume2 aria-hidden className="size-4" />
              {fa.curriculum.kanaSoundReplay}
              <span className="rounded-full bg-indigo-wash px-1.5 py-0.5 text-micro font-normal" dir="rtl">
                {speedChip}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={replayTeaching}
            disabled={replayRunning}
            aria-disabled={replayRunning}
            className="flex min-h-9 items-center gap-1 rounded-md border border-ai px-3 text-caption font-bold text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai disabled:cursor-not-allowed disabled:opacity-50"
            data-replay-btn
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
      </header>

      {/* ══════════ §۲ — کادر بزرگ آموزش نوشتن ══════════
          THE hero of the introduction: one large, prominent box holding the
          writing canvas. The numbered stroke-order animation runs HERE; after
          it the strokes stay in their standard form; there is room to study
          the shape closely. The canvas never unmounts across stages (§3 kept)
          and this anchor is the scroll target when practice begins (A5 §1). */}
      <div className="rounded-lg border border-ink-faint bg-surface-sunken/40 p-3 sm:p-4" data-intro-section="canvas">
        <div ref={canvasAnchorRef} className="mx-auto w-full" data-canvas-anchor>
          <WritingCanvas
            character={kana.glyph}
            mode={stage === 'intro' ? 'intro' : stage === 'ready' || stage === 'done' ? 'reference' : stage}
            restartSignal={restartSignal}
            replaySignal={replaySignal}
            onReplayDone={onReplayDone}
            hintSignal={hintSignal}
            onIntroDone={onIntroDone}
            onDemoStrokeStart={setDemoStroke}
            onJudgement={handleJudgement}
            onAttemptComplete={inPractice ? (stage === 'guided' ? onGuidedComplete : onFreeComplete) : undefined}
            maxWidthRem={34}
          />
        </div>
        {/* stroke progress dots — status feedback (owner §2: وضعیت پیشرفت) */}
        {totalStrokes > 0 ? (
          <div
            className="mt-3 flex flex-wrap items-center justify-center gap-2"
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
            <span className="text-caption text-ink-faint">
              {faNum(currentStrokeIndex + 1)} / {faNum(totalStrokes)} {fa.curriculum.kanaStrokesWord}
            </span>
          </div>
        ) : null}
        {/* Addendum-4 §3 (kept, CTA relocated): ONE fixed-height hint area under
            the canvas — ONLY the per-stage status text lives here now; the CTA
            moved to the page footer (§۵) so nothing interactive competes with
            watching the character. The layout still never jumps between stages. */}
        <div
          className="mx-auto mt-2 flex min-h-[3.75rem] w-full max-w-xl flex-col items-center justify-start gap-2 text-center"
          data-stage-action={stage}
        >
          {stage === 'intro' ? (
            <p className="text-caption leading-[var(--leading-fa)] text-ink-faint">
              {fa.curriculum.kanaStageIntroHint}
            </p>
          ) : null}
          {stage === 'ready' ? (
            <p className="text-caption leading-[var(--leading-fa)] text-ink-soft">{fa.curriculum.kanaStageReadyHint}</p>
          ) : null}
          {stage === 'guided' ? (
            <p className="text-caption leading-[var(--leading-fa)] text-ink-soft">
              {fa.curriculum.kanaStageGuidedHint}
            </p>
          ) : null}
          {stage === 'free' ? (
            <p className="text-caption leading-[var(--leading-fa)] text-ink-soft">{fa.curriculum.kanaStageFreeHint}</p>
          ) : null}
          {stage === 'done' ? (
            <p className="text-caption font-bold text-success">{fa.curriculum.kanaStageDoneHint}</p>
          ) : null}
        </div>
      </div>

      {/* ══════════ §۳ — دو باکس آموزشی کنار یکدیگر ══════════
          Desktop: two balanced side-by-side boxes (RTL grid). Mobile: one
          ordered column. Box ۱ «روش نوشتن» = HOW the character is written —
          the live stroke narration while the animation runs, the full
          stroke-order overview once ready, the current stroke + feedback
          while practicing, the neutral memory panel in free recall, plus the
          per-character writing tips. Box ۲ «تلفظ و یادسپار» = the SOUND and the
          SHAPE memory — Persian+Latin reading, the character's voice, the
          verified mnemonic, the confusable pair. */}
      <div className="grid items-start gap-4 md:grid-cols-2" data-intro-section="teaching">
        {/* ---- Box ۱ — روش نوشتن ---- */}
        <div className="flex flex-col gap-3 rounded-md border border-ink-faint bg-card p-4" data-teaching-box="how">
          <p className="flex items-center gap-2 text-h3 font-bold text-ink">
            <PenLine aria-hidden className="size-5 text-ai" />
            {fa.curriculum.kanaIntroHowToWriteTitle}
          </p>
          {/* intro: the live stroke narration follows the teaching pass */}
          {stage === 'intro' && strokeInfo ? (
            <div
              className="rounded-md border border-ai/40 bg-indigo-wash/40 p-4 transition-colors"
              data-stroke-info={strokeInfo.label}
            >
              <p className="text-body font-bold text-ink">{strokeInfo.label}</p>
              <p className="mt-2 text-small text-ink">{strokeInfo.startFa}</p>
              <p className="mt-1 text-small text-ink">{strokeInfo.directionFa}</p>
              <p className="mt-2 text-caption leading-[var(--leading-fa)] text-ink-soft">{strokeInfo.movementFa}</p>
            </div>
          ) : null}
          {/* ready: the FULL stroke-order overview — completely INDEPENDENT of
              «تکرار آموزش» (Addendum-4 §2 kept): a replay re-runs the canvas
              animation only; nothing around it moves. */}
          {stage === 'ready' && charData ? (
            <div className="rounded-md border border-ai/40 bg-indigo-wash/40 p-4" data-stage-panel="order">
              <p className="text-body font-bold text-ink">{fa.curriculum.kanaStageOrderTitle}</p>
              <ol className="mt-2 space-y-1.5">
                {charData.medians.map((_, i) => {
                  const info = strokeInfoFa(charData, i);
                  return (
                    <li key={i} className="flex items-baseline gap-2 text-small leading-[var(--leading-fa)] text-ink">
                      <span className="inline-grid size-6 shrink-0 place-items-center rounded-full border border-shu/60 bg-card text-caption font-bold text-shu-deep">
                        {faNum(i + 1)}
                      </span>
                      <span>
                        {info.startFa.replace(' شروع کن', '')} — {info.directionFa.replace(' بکش', '')}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-2 text-caption leading-[var(--leading-fa)] text-ink-soft">
                {fa.curriculum.kanaStageOrderRest}
              </p>
            </div>
          ) : null}
          {/* guided: the current stroke narration + live feedback INSIDE the
              same panel (no separate box appearing on mistakes). */}
          {stage === 'guided' && strokeInfo ? (
            <div
              className="rounded-md border border-ai/40 bg-indigo-wash/40 p-4 transition-colors"
              data-stroke-info={strokeInfo.label}
            >
              <p className="text-body font-bold text-ink">{strokeInfo.label}</p>
              <p className="mt-2 text-small text-ink">{strokeInfo.startFa}</p>
              <p className="mt-1 text-small text-ink">{strokeInfo.directionFa}</p>
              <p className="mt-2 text-caption leading-[var(--leading-fa)] text-ink-soft">{strokeInfo.movementFa}</p>
              {feedback ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-3 rounded-md border border-shu/40 bg-card px-3 py-2 text-small leading-[var(--leading-fa)] text-ink"
                  data-writing-feedback
                >
                  {feedback}
                </p>
              ) : null}
            </div>
          ) : null}
          {/* free: a NEUTRAL panel (Addendum-4 §5 kept) — no start point, no
              direction, no movement; guidance only on request. */}
          {stage === 'free' ? (
            <div className="rounded-md border border-shu/40 bg-surface-warm p-4" data-stage-panel="memory">
              <p className="text-body font-bold text-ink">{fa.curriculum.kanaStageFreeTitle}</p>
              <p className="mt-2 text-small leading-[var(--leading-fa)] text-ink">
                {fa.curriculum.kanaStageMemoryHint}
              </p>
              <p className="mt-2 text-caption leading-[var(--leading-fa)] text-ink-faint">
                {fa.curriculum.kanaStageMemoryHelp}
              </p>
              {feedback ? (
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-3 rounded-md border border-shu/40 bg-card px-3 py-2 text-small leading-[var(--leading-fa)] text-ink"
                  data-writing-feedback
                >
                  {feedback}
                </p>
              ) : null}
              {/* free: the way back to guided practice (owner §6) — kept. */}
              <button
                type="button"
                onClick={() => beginPractice('guided')}
                className="mt-3 min-h-10 w-fit cursor-pointer rounded-md border border-ink-faint bg-card px-4 text-caption font-bold text-ink transition-colors hover:bg-surface-warm"
              >
                {fa.curriculum.kanaStageBackToGuided}
              </button>
            </div>
          ) : null}
          {/* done — compact completion inside the same environment. */}
          {stage === 'done' ? (
            <div
              role="status"
              className="kana-reveal flex flex-col gap-3 rounded-md border border-success/50 bg-success/10 p-4"
              data-stage-panel="done"
            >
              <p className="text-body font-bold text-success">{fa.curriculum.kanaStageFreeDone}</p>
              <button
                type="button"
                onClick={() => beginPractice('free')}
                className="min-h-10 w-fit cursor-pointer rounded-md border border-ink-faint bg-card px-4 text-caption font-bold text-ink transition-colors hover:bg-surface-warm"
              >
                {fa.curriculum.kanaStagePracticeAgain}
              </button>
            </div>
          ) : null}
          {/* §4 — the per-character writing tips (fine points of THIS glyph) */}
          {teaching?.strokeHintFa ? (
            <div className="kana-reveal kana-reveal-3 rounded-md bg-surface-2 p-4">
              <p className="text-small font-bold text-ink">{fa.curriculum.kanaWritingTipTitle}</p>
              <p className="mt-2 text-body leading-[var(--leading-fa)] text-ink">
                <MixedFaJaText text={teaching.strokeHintFa} />
              </p>
            </div>
          ) : null}
        </div>

        {/* ---- Box ۲ — تلفظ و یادسپار ----
            The focused practice view (Addendum-5 §1 kept): while the learner
            writes, this whole box collapses into ONE fold — nothing deleted,
            one tap reopens; intro/ready/done keep the full open view. */}
        {inPractice && (teaching || verifiedMnemonic || mn?.pairGlyphs) ? (
          <details className="rounded-md border border-ink-faint bg-surface-sunken/60" data-intro-fold="pron">
            <summary className="cursor-pointer select-none px-4 py-3 text-caption font-bold text-ink-soft">
              <Info aria-hidden className="ml-1 inline size-4 align-middle" />
              {fa.curriculum.kanaIntroPronBoxTitle}
            </summary>
            <div className="flex flex-col gap-3 px-4 pb-4">
              {readingCard}
              {mnemonicCard}
              {pairCard}
            </div>
          </details>
        ) : (
          <div className="flex flex-col gap-3 rounded-md border border-ink-faint bg-card p-4" data-teaching-box="pron">
            <p className="flex items-center gap-2 text-h3 font-bold text-ink">
              <Volume2 aria-hidden className="size-5 text-ai" />
              {fa.curriculum.kanaIntroPronBoxTitle}
            </p>
            {readingCard}
            {mnemonicCard}
            {pairCard}
          </div>
        )}
      </div>

      {/* ══════════ §۴ — نمونه‌های کاربردی ══════════
          ALL related examples in ONE independent full-width box: the Japanese
          word (with THIS glyph highlighted inside it), the Persian reading big
          and bold, the meaning on its own separated line, the word's OWN audio
          control, and the authored pronunciation guide where one exists. The
          authored educational order is kept. During practice the box collapses
          into one fold (A5 §1 — data kept, one tap reopens). */}
      {hasExampleContent ? (
        inPractice ? (
          <details className="rounded-md border border-ink-faint bg-surface-sunken/60" data-intro-fold="examples">
            <summary className="cursor-pointer select-none px-4 py-3 text-caption font-bold text-ink-soft">
              <Info aria-hidden className="ml-1 inline size-4 align-middle" />
              {fa.curriculum.kanaIntroExamplesTitle}
            </summary>
            <div className="flex flex-col gap-4 px-4 pb-4">{examplesBody}</div>
          </details>
        ) : (
          <section className="rounded-md border border-ink-faint bg-card p-4" data-intro-section="examples">
            <p className="text-h3 font-bold text-ink">{fa.curriculum.kanaIntroExamplesTitle}</p>
            <div className="mt-3 flex flex-col gap-4">{examplesBody}</div>
          </section>
        )
      ) : null}

      {/* ══════════ §۵ — Footer و دکمهٔ شروع تمرین ══════════
          A subtle divider, an end-of-introduction marker, THE main action of
          the page, and a one-line caption. This footer sits AFTER all the
          introduction content and examples — the CTA is the natural next step
          once everything has been seen (the ONE interactive stop, A2 §4 kept).
          Hidden while practicing (the canvas owns the page then). */}
      {!inPractice ? (
        <footer
          className="flex flex-col items-center gap-3 border-t border-ink-faint pt-4 text-center"
          data-intro-section="footer"
        >
          <p className="flex items-center gap-3 text-caption text-ink-faint" data-intro-footer-marker>
            <span aria-hidden className="h-px w-10 bg-ink-faint/60" />
            {fa.curriculum.kanaIntroFooterMarker}
            <span aria-hidden className="h-px w-10 bg-ink-faint/60" />
          </p>
          {stage === 'ready' ? (
            <div className="flex w-full flex-col items-center gap-2">
              {/* Addendum-2 §4 (kept) + Addendum-4 §3 (kept): a REAL primary
                  button — now in the footer, full-width on mobile, comfortable
                  on desktop. */}
              <button
                type="button"
                onClick={startPractice}
                className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-ai px-8 text-lead font-bold text-paper shadow-card transition-all hover:bg-indigo-deep hover:shadow-card active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai sm:w-auto sm:min-w-[20rem]"
                data-ready-cta
              >
                {fa.curriculum.kanaStageReadyCta}
                <ArrowLeft aria-hidden className="size-5" />
              </button>
              <p className="text-caption leading-[var(--leading-fa)] text-ink-soft" data-intro-footer-caption>
                {fa.curriculum.kanaIntroFooterCaption}
              </p>
            </div>
          ) : null}
        </footer>
      ) : null}

      {/* §12 — attribution: ONE short line, only what the licenses require.
          KanjiVG (CC BY-SA 3.0) needs name + license + link; VOICEVOX
          character terms need the voice credit. Full texts live in
          writing-data/licenses/ — nothing else technical in the teaching UI. */}
      <details className="border-t border-ink-faint pt-2 text-micro text-ink-faint">
        <summary className="cursor-pointer select-none">منابع</summary>
        <p className="mt-1 leading-[var(--leading-fa)]">
          دادهٔ ضربه‌ها: KanjiVG (CC BY-SA 3.0) —{' '}
          <a
            href="/writing-data/licenses/README-KanjiVG.md"
            className="text-ai underline"
            target="_blank"
            rel="noreferrer"
          >
            مجوز
          </a>
          {' · '}صدا: VOICEVOX:ぞん子
        </p>
      </details>
    </section>
  );
}

/** Persian digits for the stroke counter. */
function faNum(n: number): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);
}

/**
 * §۱ — the gojūon row's Persian reading ('a-row' → 'آ', 'ka-row' → 'کا', …).
 * Covers the 11 basic rows of both kana scripts (the registry's 92 glyphs);
 * anything unexpected falls back to the raw row id — the label is cosmetic,
 * never a gate.
 */
function kanaRowReadingFa(row: string): string {
  const ROW_READINGS: Record<string, string> = {
    a: 'آ',
    ka: 'کا',
    sa: 'سا',
    ta: 'تا',
    na: 'نا',
    ha: 'ها',
    ma: 'ما',
    ya: 'یا',
    ra: 'را',
    wa: 'وا',
    n: 'ن',
  };
  const key = (row ?? '').replace(/-row$/, '');
  return ROW_READINGS[key] ?? row;
}
