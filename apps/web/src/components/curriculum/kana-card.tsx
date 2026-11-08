'use client';
/**
 * HANASO — KanaCard v6 (TASK-LEARNING-09 — responsive learning experience).
 *
 * ONE page, ONE environment, ZERO stage-switching: the big WritingCanvas is
 * the heart of the card from the first second to the last. Addendum-3 §5 —
 * the NUMBERED stroke-order teaching animation is the FIRST content the
 * learner sees, playing in the canvas itself (no faint static template),
 * with the explanations unfolding AROUND it while it runs.
 *
 * TASK-LEARNING-09 — the responsive re-architecture (owner audit 2026-11-09):
 *   • the card is a CSS @container — the layout responds to the REAL card
 *     width, not to device names: phones get one tidy column, ≥42rem content
 *     gets the balanced two-column grid (canvas column + info column)
 *   • semantic grouping (owner §5): group 1 «رسم و ترتیب نوشتن» = canvas +
 *     stroke dots + action slot + the live stage panel (they are NEVER
 *     separated again — the panel sits WITH the canvas on every size);
 *     group 2 «شناخت و تلفظ» = reading + writing tip + mnemonic story +
 *     confusable pair; group 3 «واژگان» = the merged readable examples
 *   • §6 — «واژهٔ قابل‌خواندن» + «نمونه‌های کاربردی» are ONE section now
 *     («نمونه‌های قابل‌خواندن»), deduplicated by word — a word never renders
 *     twice; the host word stays the ANCHOR card (caption + staggered reveal)
 *   • §15 — the mnemonic story is BACK in the introduction flow for every
 *     kana that has one (all 92 authored stories render with their honest
 *     «داستانِ یادسپار» label — never as a fact; the data keeps its status)
 *   • spacing rhythm: clear gaps BETWEEN the semantic groups, tight and
 *     regular gaps INSIDE each group; no min-height fillers — the action slot
 *     keeps the canvas still simply because nothing above it ever changes
 *
 * Timeline (unchanged — v5 behavior preserved):
 *   1 intro    the numbered stroke-order animation in the canvas + the
 *              sound + the reading — the explanations unfold around it
 *   2 ready    the ONE interactive stop: «فهمیدم، شروع کنیم» (the single CTA
 *              of the whole flow — TASK-HANASO-CTA-01 footer position kept)
 *   3 guided   practice on the dashed guide in the same canvas
 *   4 free     writing from memory in the same canvas
 *   done       completion — the walk continues (onWritingDone)
 *
 * Addendum-3 §2 — «تکرار آموزش» replays the numbered animation IN PLACE at
 * any stage (canvas replaySignal); the stage/lesson/attempt state is never
 * reset, and rapid clicks are absorbed (button disabled while replaying).
 *
 * Addendum-3 §4 — the page's space is filled with per-character teaching
 * content (reading, current stroke, writing tips, the readable word with its
 * own audio, the confusable pair) — data-driven, never a mechanical template.
 *
 * Addendum-3 §11 — the mnemonic (still `draft` in the data) is NOT shown as
 * final content: only VERIFIED mnemonics render (no review badge anywhere in
 * the learner UI; the status lives on in the data for the admin tooling).
 *
 * Addendum-3 §12 — attribution is one short license line (KanjiVG CC BY-SA
 * + VOICEVOX credit — both required by their licenses); the full texts live
 * in writing-data/licenses/ — nothing else technical in the teaching space.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Ear, Hand, Info, Mic, RotateCcw, Volume2 } from 'lucide-react';
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
 * TASK-HANASO-CTA-01 — a related usage example rendered inside the kana
 * introduction (content order §۴): the station's example-set entry whose
 * Japanese word CONTAINS the character (structural subset of the example-set
 * block item — station-runner passes the authored objects unchanged, in
 * their authored educational order).
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

/**
 * TASK-LEARNING-09 §۶ — one entry of the merged «نمونه‌های قابل‌خواندن»
 * section: the host readable word (isHost — the anchor card) or one of the
 * related usage examples, deduplicated by word (never rendered twice).
 */
interface ReadableExampleCard {
  key: string;
  isHost: boolean;
  ja: string;
  readingFa: string | null;
  meaningFa: string;
  whyFa?: string;
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
  /** TASK-HANASO-CTA-01 §۴ — related usage examples (word contains the glyph). */
  relatedExamples?: KanaRelatedExample[];
  /** TASK-HANASO-CTA-01 §۴ — per-word audio pair registry (null = no asset). */
  exampleAudioByWord?: Record<string, { opus: string; m4a: string } | null>;
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
  confusableNoteFa,
  audioUrls,
  wordAudioUrls,
  relatedExamples,
  exampleAudioByWord,
  onWritingAttempt,
  onWritingDone,
  initialProgress,
  onProgress,
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
   *
   * TASK-HANASO-CTA-01 — the confirm now lives in the FOOTER at the end of
   * the introduction content (after the related examples), so when the
   * teaching pass finishes, the footer is brought into view: the learner
   * SEES «معرفی این کاراکتر تمام شد! حالا نوبت توست.» + the CTA the moment
   * it becomes active (the old layout had it right under the canvas, always
   * in view — this preserves that discoverability). Only fires on the LIVE
   * intro→ready transition; a restored «ready» stage never yanks the page.
   */
  const ctaFooterRef = useRef<HTMLElement | null>(null);
  const introJustFinishedRef = useRef(false);
  const onIntroDone = useCallback(() => {
    playOnce('teach-done');
    introJustFinishedRef.current = true;
    setStage('ready');
  }, [playOnce]);

  useEffect(() => {
    if (stage !== 'ready' || !introJustFinishedRef.current) return;
    introJustFinishedRef.current = false;
    const el = ctaFooterRef.current;
    if (!el || typeof window === 'undefined') return;
    const header = document.querySelector('header.sticky');
    const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    const rect = el.getBoundingClientRect();
    // center the small footer in the viewport (minus the sticky header) so the
    // CTA and a glimpse of the content above it are both visible
    const top = rect.top + window.scrollY - Math.max(0, (window.innerHeight - rect.height) / 2) - headerBottom / 2 - 12;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  }, [stage]);

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
    const header = document.querySelector('header.sticky');
    const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    const top = el.getBoundingClientRect().top + window.scrollY - Math.max(0, headerBottom) - 12;
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

  /** «فهمیدم، شروع کنیم» → guided practice in the SAME canvas. */
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
  /** §15 (TASK-LEARNING-09) — the mnemonic story renders for EVERY kana that
   *  has one (all 92 authored stories are back in the introduction flow) with
   *  its honest label; the review status stays in the data for the tooling. */
  const mnemonic = mn ?? null;
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

  // -------------------------------------------------- §8/§9 cards (shared JSX)
  // Addendum-5 §1 (kept): the same cards render OPEN in the full intro view
  // and inside the collapsed practice fold — ONE definition, no drift.
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

  /**
   * TASK-LEARNING-09 §۶ — ONE vocabulary list «نمونه‌های قابل‌خواندن»: the host
   * readable word (the ANCHOR — enriched with the matching example's Persian
   * reading/guides when the station's example-set carries the same word) + the
   * related usage examples, deduplicated by word — a word never renders twice.
   * Kana with neither → no section at all (no placeholder, §۷).
   */
  const readableExamples = useMemo<ReadableExampleCard[]>(() => {
    const cards: ReadableExampleCard[] = [];
    const seen = new Set<string>();
    if (hostWord) {
      seen.add(hostWord.word);
      const match = (relatedExamples ?? []).find((ex) => ex.ja === hostWord.word);
      cards.push({
        key: `host-${hostWord.word}`,
        isHost: true,
        ja: hostWord.word,
        readingFa: match?.reading ?? null,
        meaningFa: hostWord.meaningFa,
        whyFa: match?.whyFa,
        pronFa: match?.pronFa,
      });
    }
    for (const ex of relatedExamples ?? []) {
      if (seen.has(ex.ja)) continue; // the anchor card already carries this word
      seen.add(ex.ja);
      cards.push({
        key: ex.id,
        isHost: false,
        ja: ex.ja,
        readingFa: ex.reading,
        meaningFa: ex.fa,
        whyFa: ex.whyFa,
        pronFa: ex.pronFa,
      });
    }
    return cards;
  }, [hostWord, relatedExamples]);

  /**
   * §15 (TASK-LEARNING-09) — the mnemonic story card: a subtle teaching card
   * with the honest «داستانِ یادسپار» label (never presented as fact — the
   * data keeps its review status for the tooling). Renders for every kana
   * that HAS a story; a kana without one renders no card and no placeholder.
   */
  const mnemonicCard = mnemonic ? (
    <div className="kana-reveal kana-reveal-3 rounded-md bg-surface-2 p-4" data-mnemonic-card>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-small font-bold text-ink">{mnemonic.coreImageFa}</span>
        <span className="rounded-full bg-ink-faint/30 px-2 py-0.5 text-micro text-ink-faint">
          {mnemonic.honestLabelFa}
        </span>
      </div>
      <p className="mt-2 text-body leading-[var(--leading-fa)] text-ink">
        <MixedFaJaText text={mnemonic.storyFa} />
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
   * TASK-LEARNING-09 §۶ — the merged «نمونه‌های قابل‌خواندن» articles (shared
   * body for the open section AND the practice fold). Same card anatomy as the
   * station's example-set cards: the WORD is the hero (glyph highlighted
   * inside it), its OWN playable audio beside it, the Persian reading bold +
   * the meaning visually separated (Addendum-5 §6 rules kept), plus why/pron
   * guides. The ANCHOR (host) card keeps its caption + the staggered
   * char-by-char reveal (the v5 «واژهٔ قابل‌خواندن» choreography, now inside
   * the one section) and its Latin romaji complement.
   */
  const readableExamplesBody = readableExamples.map((ex) => (
    <article
      key={ex.key}
      className="flex flex-col rounded-md bg-surface-sunken/40 p-3"
      data-example-card
      data-example-word={ex.ja}
      data-host-word-card={ex.isHost ? 'true' : undefined}
    >
      {ex.isHost ? <p className="text-caption text-ink-faint">{fa.curriculum.kanaHostWordPrefix}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {ex.isHost ? (
          /* the anchor word keeps the v5 hero (a real <p> with the ja-block
             LTR island class) + the staggered char-by-char reveal */
          <p className="ja-block font-jp text-h2 font-bold text-ink" lang="ja" dir="ltr">
            {Array.from(ex.ja).map((ch, i) => (
              <span
                key={`${ch}-${i}`}
                className={`word-char-in ${ch === kana.glyph ? 'rounded-md bg-shu/20 px-1 text-shu-deep' : ''}`}
                style={{ animationDelay: `${300 + i * 450}ms` }}
              >
                {ch}
              </span>
            ))}
          </p>
        ) : (
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
        )}
        {/* Addendum-4 §7 (kept): every readable word keeps its OWN playable
            audio — independent asset bound to THIS word (the host word's own
            pair falls back in when the registry has no separate entry). No
            asset → no button. */}
        <ExampleAudioButton
          word={ex.ja}
          urls={exampleAudioByWord?.[ex.ja] ?? (ex.isHost ? wordAudioUrls : null) ?? null}
        />
      </div>
      {ex.readingFa ? (
        <p className="mt-2 border-b border-ink-faint/60 pb-2 text-h3 font-bold text-ink" dir="rtl">
          {ex.readingFa}
          {ex.isHost ? (
            <span className="ms-2 font-mono align-middle text-caption font-normal text-ink-soft" dir="ltr">
              {kanaWordRomaji(ex.ja)}
            </span>
          ) : null}
        </p>
      ) : ex.isHost ? (
        <p className="mt-2 border-b border-ink-faint/60 pb-2 text-h3 font-bold text-ink" dir="rtl">
          <span className="font-mono align-middle text-caption font-normal text-ink-soft" dir="ltr">
            {kanaWordRomaji(ex.ja)}
          </span>
        </p>
      ) : null}
      <p className="mt-2 text-body leading-[var(--leading-fa)] text-ink-soft">{ex.meaningFa}</p>
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
  ));

  // -------------------------------------------------- render
  return (
    <section
      className="@container flex flex-col gap-5 rounded-md border border-ink-faint bg-card p-4 @min-[42rem]:gap-6 @min-[42rem]:p-6"
      aria-label={`${readingFa} — ${stageTitle}`}
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
      </div>

      {/* ══════════ TASK-LEARNING-09 — THE environment ══════════
          The card is its own @container: below 42rem of CONTENT width the two
          semantic groups stack in one tidy column; from 42rem up they sit in
          the balanced two-column grid — the canvas column (owner §3 «ستون
          اصلی»: WritingCanvas + stroke-order teaching + practice status) and
          the info column (§3 «ستون مکمل»: reading, writing notes, mnemonic
          story, confusable pair). The canvas track never exceeds 26rem (never
          oversized), the info track caps at 34rem (readable line lengths),
          and the whole row centers in whatever space remains — smart use of
          the width, never forced filling. */}
      <div className="grid grid-cols-1 gap-6 @min-[42rem]:grid-cols-[minmax(19rem,26rem)_minmax(19rem,34rem)] @min-[42rem]:items-start @min-[42rem]:justify-center @min-[42rem]:gap-8">
        {/* ---- group 1 «رسم و ترتیب نوشتن» — the canvas column (owner §5).
            The heart of the lesson; never unmounts (§3). The STAGE PANEL now
            lives HERE (with the canvas it narrates — the old layout put it in
            the far teaching column, which is what the owner's «بخش‌های مرتبط
            از هم جدا افتاده‌اند» audit flagged). This wrapper is the scroll
            target when practice begins (Addendum-5 §1 kept). */}
        <div ref={canvasAnchorRef} className="flex min-w-0 flex-col gap-3" data-canvas-anchor>
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
          />
          {/* stroke progress dots — status feedback (owner §2: وضعیت پیشرفت) */}
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
              <span className="text-caption text-ink-faint">
                {faNum(currentStrokeIndex + 1)} / {faNum(totalStrokes)} {fa.curriculum.kanaStrokesWord}
              </span>
            </div>
          ) : null}
          {/* Addendum-4 §3 (TASK-LEARNING-09 revision) — the action slot: a calm
              one-line hint area under the canvas. No min-height filler (owner
              §5): nothing ABOVE the canvas ever changes, so the canvas stays
              still across stages on its own; the ready stage is deliberately
              empty (the CTA lives in the footer — TASK-HANASO-CTA-01). */}
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

          {/* ---- slot 1 — the stage panel (Addendum-4 §3 kept: every slot is
              ALWAYS present in the SAME order for every kana; only the CONTENT
              follows the stage — no box ever appears from nowhere). ---- */}
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
          {/* Addendum-4 §2/§3 — ready: the FULL stroke-order overview. This panel
              is completely INDEPENDENT of «تکرار آموزش» — a replay re-runs the
              animation inside the canvas only; nothing around it moves. */}
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
          {/* guided: the current stroke narration + live feedback INSIDE the same
              panel (no separate box appearing on mistakes). */}
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
          {/* Addendum-4 §5 — free: a NEUTRAL panel. It never reveals the start
              point, the direction or the movement — the learner decides alone;
              guidance only on request (the help button) or after repeated
              misses. */}
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
              {/* free: the way back to guided practice (owner §6) — kept, inside
                  the same panel so nothing new appears below. */}
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
        </div>

        {/* ---- group 2 «شناخت و تلفظ» — the info column (owner §3/§5): the
            reading with the character's own sound, the writing notes, the
            mnemonic story (§15 — back in the flow) and the confusable pair.
            Data-driven: a kana without a piece of content renders no card and
            no placeholder (§۷) — the column simply stays compact. During
            practice (Addendum-5 §1 kept) the intro-only cards collapse into
            ONE fold; the writing tips stay open (practice-relevant). ---- */}
        <div className="flex min-w-0 flex-col gap-3" dir="rtl">
          {teaching?.strokeHintFa ? (
            <div className="kana-reveal kana-reveal-2 rounded-md bg-surface-2 p-4" data-writing-tip>
              <p className="text-small font-bold text-ink">{fa.curriculum.kanaWritingTipTitle}</p>
              <p className="mt-2 text-body leading-[var(--leading-fa)] text-ink">
                <MixedFaJaText text={teaching.strokeHintFa} />
              </p>
            </div>
          ) : null}

          {inPractice && (readingCard || mnemonicCard || pairCard) ? (
            <details className="rounded-md border border-ink-faint bg-surface-sunken/60" data-intro-fold="info">
              <summary className="cursor-pointer select-none px-4 py-3 text-caption font-bold text-ink-soft">
                <Info aria-hidden className="ml-1 inline size-4 align-middle" />
                {fa.curriculum.kanaIntroFoldInfo}
              </summary>
              <div className="flex flex-col gap-3 px-4 pb-4">
                {readingCard}
                {mnemonicCard}
                {pairCard}
              </div>
            </details>
          ) : (
            <>
              {readingCard}
              {mnemonicCard}
              {pairCard}
            </>
          )}
        </div>
      </div>

      {/* ══════════ TASK-LEARNING-09 §۶ — نمونه‌های قابل‌خواندن (content order ۴) ══════════
          ONE merged vocabulary section (the owner's §۶ order): the host
          readable word (the anchor) + the related usage examples of THIS
          character (station example-set entries whose word contains the
          glyph), deduplicated by word — never two cards for the same word.
          Persian reading + meaning + per-word audio + why/pron guides (the
          Addendum-5 §6 card anatomy). The cards flow into a responsive grid
          (1 → 2 → 3 columns by real available width). They close the
          introduction content BEFORE the footer CTA. During practice they
          collapse into ONE fold (Addendum-5 §1 — the focused practice view;
          nothing is ever deleted). A kana with no readable vocabulary renders
          NO section at all (§۷ — no placeholder). */}
      {readableExamples.length > 0 ? (
        inPractice ? (
          <details className="rounded-md border border-ink-faint bg-surface-sunken/60" data-intro-fold="examples">
            <summary className="cursor-pointer select-none px-4 py-3 text-caption font-bold text-ink-soft">
              <Info aria-hidden className="ml-1 inline size-4 align-middle" />
              {fa.curriculum.kanaReadableExamplesFold}
            </summary>
            <div className="examples-grid px-4 pb-4">{readableExamplesBody}</div>
          </details>
        ) : (
          <section className="rounded-md border border-ink-faint p-4" data-intro-examples>
            <p className="text-h3 font-bold text-ink">{fa.curriculum.kanaReadableExamplesTitle}</p>
            <div className="examples-grid mt-3">{readableExamplesBody}</div>
          </section>
        )
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

      {/* ══════════ TASK-HANASO-CTA-01 §۴ — Footer و CTA شروع تمرین (content order ۵) ══════════
          A small, independent, tidy footer — THE last element of the card: a
          divider, the one-line lead, and the ONE primary action of the page.
          Nothing (example or information) sits below it. The button keeps the
          exact proven click behavior: progress saved, soft-scroll to the top of
          the WritingCanvas, Guided writing begins on the SAME page (no route). */}
      {stage === 'ready' && !inPractice ? (
        <footer
          ref={ctaFooterRef}
          className="flex flex-col items-center gap-3 border-t border-ink-faint pt-4 text-center"
          data-intro-cta-footer
        >
          <p className="text-body font-bold text-ink">{fa.curriculum.kanaIntroFooterLead}</p>
          {/* Addendum-2 §4 (kept): the ONE interactive stop. Addendum-4 §3 (kept):
              a REAL primary button — now the natural closing step of the whole
              introduction. Arrow = lucide icon (no emoji, Issue #108). */}
          <button
            type="button"
            onClick={startPractice}
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

/** Persian digits for the stroke counter. */
function faNum(n: number): string {
  return String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);
}
