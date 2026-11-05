'use client';
/**
 * HANASO — StationRunner (TASK-LEARNING-01) — the LESSON ENGINE island.
 *
 * Walks a station's teaching blocks IN AUTHORED ORDER (order lives in data —
 * DATA-CONTRACT §۲). The station arrives PRE-STRIPPED from the RSC shell
 * (client-transport.ts — no answer keys cross the boundary); EVERY interaction
 * grades through /api/curriculum/station (bank exercises AND block interactions:
 * discovery / prediction / integrate replies — SKL-013).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Ear,
  MessageCircleQuestion,
  PlayCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { fa } from '@/messages/fa';
import type { ClientExercise } from '@/modules/curriculum/grading';
import type { ClientStation, ClientTeachingBlock } from '@/modules/curriculum/client-transport';
import type { Chapter, Station } from '@/modules/curriculum/types';
import {
  blockResult,
  prevStep,
  stationFinishScore,
  stepOfBlock,
  withBlockResult,
  type BlockResults,
} from '@/modules/curriculum/station-walk';
import {
  clampStepIndex,
  clearWalkSnapshot,
  loadWalkSnapshot,
  saveWalkSnapshot,
  type ExerciseBlockProgress,
  type StationWalkSnapshot,
} from '@/modules/curriculum/walk-persistence';
import { JaBlock } from '@/components/patterns/ja-block';
import { FuriganaText } from '@/components/patterns/furigana-text';
import { MixedFaJaText } from './mixed-fa-ja-text';
import { LineAudioButton } from './line-audio-button';
import { ExerciseSession } from './exercise-session';
import { WritingPractice } from '@/components/writing/writing-practice';
import { KanaCard } from './kana-card';
import { KANA_ITEMS_BY_ID } from '@/modules/curriculum/content/kana-items';

const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

interface Line {
  id: string;
  tokens: { surface: string }[];
  fa: string;
  speaker: string;
}

export interface StationRunnerProps {
  chapterSlug: string;
  /** The stripped station (no answer material — server grades everything). */
  station: ClientStation;
  chapter: Pick<Chapter, 'words' | 'expressions'>;
  clientExercises: Record<string, ClientExercise>;
  dialogue: {
    lines: Line[];
    speakers: Record<string, string>;
  };
  audioByLine: Record<string, string>;
  audioFallbackByLine?: Record<string, string>;
  audioAvailable: boolean;
  /**
   * Issue #103 (TASK-LEARNING-07): wordId → resolved INDEPENDENT word-audio URL pair
   * (wordAudio registry — DD-119, resolved server-side). Null/absent = honest fallback
   * to the source-line audio on the vocab card.
   */
  wordAudioByWord?: Record<string, { opus: string; m4a: string } | null>;
  /**
   * TASK-LEARNING-08 (WP-2/WP-3): kanaId → resolved PRE-GENERATED audio pair
   * (public/audio/kana registry — DD-081). Null = no committed asset yet; the
   * card hides the sound affordance honestly (owner feedback A).
   */
  kanaAudioByKanaId?: Record<string, { opus: string; m4a: string } | null>;
}

/** Grading round-trip for one block interaction. */
async function gradeBlock(payload: {
  chapterSlug: string;
  stationSlug: string;
  blockId: string;
  stepIndex?: number;
  answer: { kind: string; optionId?: string; orderedIds?: string[]; chipOrder?: string[]; nameValue?: string };
}): Promise<{ correct: boolean; feedbackFa: string } | null> {
  try {
    const res = await fetch('/api/curriculum/station', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'grade-block', ...payload }),
    });
    const json = (await res.json()) as { data?: { outcome: { correct: boolean; feedbackFa: string } } };
    return json.data?.outcome ?? null;
  } catch {
    return null;
  }
}

/**
 * TASK-LEARNING-08 (WP-5): fetch the server-side resume anchor (the in_progress
 * station's last synced block). Read from the SAME API the walk writes to — the
 * client fetch works identically in dev (route-handler store) and production
 * (Postgres), unlike an RSC prop (RSC and route handlers may read different
 * module instances in dev).
 */
async function fetchServerResumeAnchor(chapterSlug: string, stationSlug: string): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/curriculum/station?chapter=${encodeURIComponent(chapterSlug)}&station=${encodeURIComponent(stationSlug)}`,
      { cache: 'no-store' },
    );
    const json = (await res.json()) as { data?: { state?: { status?: string; currentBlock?: string | null } | null } };
    const state = json.data?.state;
    if (state && state.status === 'in_progress' && state.currentBlock) return state.currentBlock;
    return null;
  } catch {
    return null;
  }
}

/**
 * TASK-LEARNING-08 (WP-5 — owner feedback E): fire-and-forget walk position sync
 * (station `enter`/`progress` actions). Keeps the SERVER-side resume anchor
 * (StationState.currentBlock) fresh on every block transition; never blocks the
 * walk on network state and never double-fires for the same step.
 */
async function syncWalkPosition(
  action: 'enter' | 'progress',
  payload: { chapterSlug: string; stationSlug: string; currentBlockId: string; stepIndex: number },
): Promise<void> {
  try {
    await fetch('/api/curriculum/station', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      keepalive: action === 'progress', // survives a tab close mid-flight
    });
  } catch {
    /* offline: the LOCAL snapshot still carries the walk (mission §8.5) */
  }
}

/**
 * TASK-LEARNING-07 (DD-105/DD-111): record a handwriting practice summary.
 * Structured summary only — raw pen paths never leave the browser. Best-effort:
 * analytics must never break the practice flow.
 */
async function recordWritingPractice(payload: {
  chapterSlug: string;
  stationSlug: string;
  blockId?: string;
  character: string;
  mode: 'guided' | 'trace' | 'free';
  verdict: string;
  strokesTotal: number;
  strokesFirstTry: number;
  totalMistakes: number;
  hintsShown: number;
  completed: boolean;
  durationMs: number;
}): Promise<void> {
  try {
    await fetch('/api/curriculum/station', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'writing-practice', ...payload }),
    });
  } catch {
    /* honest best-effort — the practice verdict is already shown to the user */
  }
}

export function StationRunner(props: StationRunnerProps) {
  const {
    station,
    chapter,
    clientExercises,
    dialogue,
    audioByLine,
    audioFallbackByLine,
    audioAvailable,
    wordAudioByWord,
    kanaAudioByKanaId,
    chapterSlug,
  } = props;
  const router = useRouter();
  /*
   * WP-5 (owner feedback E): the walk starts at step 0 for SSR/hydration, then a
   * mount effect restores the persisted snapshot (localStorage first — it also
   * carries earned results + in-flight exercise positions; server anchor only as
   * a fallback). `restoreChecked` gates the first paint so the learner never sees
   * block 1 flash before jumping to the real position.
   */
  const [step, setStep] = useState(0);
  const [restoreChecked, setRestoreChecked] = useState(false);
  const [resumedNotice, setResumedNotice] = useState(false);
  const [sessionScore, setSessionScore] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  /**
   * Issue #102: earned exercise results per block id — they live OUTSIDE the
   * current step, so stepping back (and forward again) never loses them. A
   * block with a recorded result renders the skip panel instead of re-grading.
   */
  const [blockResults, setBlockResults] = useState<BlockResults>({});
  /** WP-5: in-flight exercise positions per block id (survives refresh). */
  const [exerciseProgress, setExerciseProgress] = useState<Record<string, ExerciseBlockProgress>>({});

  const blocks = station.blocks;
  const block = blocks[step];
  const lineById = useMemo(() => new Map(dialogue.lines.map((l) => [l.id, l])), [dialogue.lines]);

  /* ---------------- WP-5: restore the persisted walk (once, after mount) ---- */
  useEffect(() => {
    if (restoreChecked) return;
    setRestoreChecked(true);
    const snapshot = loadWalkSnapshot(chapterSlug, station.slug);
    if (snapshot) {
      const restored = clampStepIndex(snapshot.stepIndex, blocks.length);
      setStep(restored);
      setBlockResults(snapshot.blockResults ?? {});
      setExerciseProgress(snapshot.exerciseProgress ?? {});
      if (typeof snapshot.sessionScore === 'number') setSessionScore(snapshot.sessionScore);
      if (snapshot.stepIndex > 0 || Object.keys(snapshot.blockResults ?? {}).length > 0) {
        setResumedNotice(true);
        window.setTimeout(() => setResumedNotice(false), 4000);
      }
      return;
    }
    // no local snapshot — the server anchor is the honest fallback (cleared
    // localStorage on the same browser; a different browser has a different
    // learner id and thus no claim on this walk).
    void fetchServerResumeAnchor(chapterSlug, station.slug).then((anchor) => {
      if (!anchor) return;
      const target = stepOfBlock(blocks, anchor);
      if (target !== null && target > 0) {
        setStep(target);
        setResumedNotice(true);
        window.setTimeout(() => setResumedNotice(false), 4000);
      }
    });
    // restore + fallback run exactly once per mount (deps limited on purpose)
  }, []);

  /* ---------------- WP-5: persist + sync on every meaningful transition ------ */
  const persistedRef = useRef<StationWalkSnapshot | null>(null);
  const syncStepRef = useRef(-1);
  useEffect(() => {
    if (!restoreChecked) return;
    if (completed || !block) return;
    const snapshot = {
      chapterSlug,
      stationSlug: station.slug,
      stepIndex: step,
      blockResults,
      exerciseProgress,
      sessionScore,
    };
    persistedRef.current = snapshot as StationWalkSnapshot;
    saveWalkSnapshot(snapshot);
    if (syncStepRef.current !== step) {
      syncStepRef.current = step;
      void syncWalkPosition(step === 0 ? 'enter' : 'progress', {
        chapterSlug,
        stationSlug: station.slug,
        currentBlockId: block.id,
        stepIndex: step,
      });
    }
  }, [restoreChecked, step, blockResults, exerciseProgress, sessionScore]);

  const finishSession = useCallback(
    async (score: number | null, taskCompleted = false) => {
      setSessionScore(score);
      setCompleting(true);
      try {
        const res = await fetch('/api/curriculum/station', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'complete',
            chapterSlug,
            stationSlug: station.slug,
            score,
            taskCompleted,
          }),
        });
        setCompleted(res.ok);
        if (res.ok) clearWalkSnapshot(chapterSlug, station.slug); // walk done — no stale resume
      } finally {
        setCompleting(false);
      }
    },
    [chapterSlug, station.slug],
  );

  const next = useCallback(() => {
    if (step < blocks.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    if (station.completion.kind === 'viewed') {
      void finishSession(null);
    } else if (station.completion.kind === 'task_completed') {
      void finishSession(null, true);
    } else {
      // Issue #102: the LAST authored exercise block's earned result finishes the
      // station (a re-visited earlier block's skip must not overwrite it).
      void finishSession(stationFinishScore(blocks, blockResults, sessionScore) ?? 0);
    }
  }, [blockResults, blocks, finishSession, sessionScore, station.completion.kind, step]);

  /**
   * Issue #102 «مرحلهٔ قبل»: one block back — earned exercise results survive by
   * design (they live in blockResults, not in the rendered block component).
   */
  const prev = useCallback(() => {
    setStep((s) => prevStep(s));
  }, []);

  /**
   * Issue #106 (F4): jump the walk back to the authored teaching block the
   * feedback ladder named (blocks render one-at-a-time, so "returning" = moving
   * the step pointer; an unresolvable id keeps the learner where they are).
   */
  const returnToBlock = useCallback(
    (blockId: string) => {
      const target = stepOfBlock(station.blocks, blockId);
      if (target !== null) setStep(target);
    },
    [station.blocks],
  );

  const doneHref = `/learn/${chapterSlug}/journey`;

  /*
   * WP-5: the restore check runs on mount; until it settles, a one-line placeholder
   * prevents block 1 from flashing before the jump to the real position (also
   * keeps SSR markup and client hydration identical).
   */
  if (!restoreChecked) {
    return (
      <p className="text-small text-ink-soft" role="status">
        {fa.common.loading}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* WP-5 (owner feedback E): honest resume notice — the walk came back. */}
      {resumedNotice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-md border border-ai/40 bg-indigo-wash/60 px-4 py-2 text-small text-ink"
          data-walk-resumed
        >
          <RotateCcw aria-hidden className="size-4 text-ai" />
          <span>
            <b>{fa.curriculum.walkResumedTitle}. </b>
            {fa.curriculum.walkResumedBody}
          </span>
        </p>
      )}

      {/* progress rail + step counter */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-1" aria-hidden>
          {blocks.map((b, i) => (
            <span
              key={b.id}
              className={[
                'h-1.5 flex-1 rounded-full transition-colors',
                i < step ? 'bg-ai' : i === step ? 'bg-shu' : 'bg-surface-sunken',
              ].join(' ')}
            />
          ))}
        </div>
        <p className="shrink-0 text-caption text-ink-soft" aria-live="polite">
          {faNum(step + 1)} / {faNum(blocks.length)}
        </p>
      </div>

      {block && (
        <BlockView
          block={block}
          stationSlug={station.slug}
          chapterSlug={chapterSlug}
          chapter={chapter}
          clientExercises={clientExercises}
          lineById={lineById}
          speakers={dialogue.speakers}
          audioByLine={audioByLine}
          audioFallbackByLine={audioFallbackByLine}
          audioAvailable={audioAvailable}
          wordAudioByWord={wordAudioByWord}
          kanaAudioByKanaId={kanaAudioByKanaId}
          isLastBlock={step === blocks.length - 1}
          exerciseScore={block.kind === 'exercise' ? blockResult(blockResults, block.id) : null}
          exerciseInitialProgress={block.kind === 'exercise' ? exerciseProgress[block.id] : undefined}
          onExerciseProgress={(progress) => {
            if (block.kind !== 'exercise') return;
            setExerciseProgress((prev) => {
              const cur = prev[block.id];
              if (cur && cur.index === progress.index && cur.firstTryCorrect === progress.firstTryCorrect) {
                return prev;
              }
              return { ...prev, [block.id]: progress };
            });
          }}
          onReturnToBlock={returnToBlock}
          onExerciseDone={(score) => {
            if (block.kind === 'exercise') {
              setBlockResults((r) => withBlockResult(r, block.id, score));
              // the block is done — its in-flight position is no longer needed
              setExerciseProgress((prev) => {
                if (!(block.id in prev)) return prev;
                const next = { ...prev };
                delete next[block.id];
                return next;
              });
            }
            setSessionScore(score);
            if (step < blocks.length - 1) setStep((s) => s + 1);
            else void finishSession(score);
          }}
          onSceneDone={() => {
            // INTEGRATE: the communicative task finished → complete the station
            if (step < blocks.length - 1) setStep((s) => s + 1);
            else void finishSession(null, true);
          }}
        />
      )}

      {/*
       * Action row (Issue #102): «مرحلهٔ قبل» appears from the 2nd block onward for
       * EVERY block kind; the forward button keeps its exercise/scene exceptions
       * (those blocks own their completion CTA inside BlockView).
       */}
      {(step > 0 || (block && block.kind !== 'exercise' && block.kind !== 'character-scene')) && (
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={prev}
              className="flex h-11 items-center gap-2 rounded-md border border-ink-faint bg-card px-5 text-body font-bold text-ink transition-colors hover:bg-surface-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
            >
              <ArrowRight aria-hidden className="size-4" />
              {fa.curriculum.prevBlock}
            </button>
          )}
          {block && block.kind !== 'exercise' && block.kind !== 'character-scene' && (
            <button
              type="button"
              onClick={next}
              disabled={completing}
              className="flex h-11 items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai disabled:opacity-45"
            >
              {step === blocks.length - 1 ? fa.curriculum.stationDone : fa.curriculum.continueBlock}
              <ArrowLeft aria-hidden className="size-4" />
            </button>
          )}
        </div>
      )}

      {completed && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-3 rounded-md border border-success bg-card p-5"
        >
          <p className="flex items-center gap-2 text-body font-bold text-success">
            <CheckCircle2 aria-hidden className="size-5" />
            {fa.curriculum.stationDone}
          </p>
          <button
            type="button"
            onClick={() => router.push(doneHref)}
            className="flex h-11 w-fit items-center gap-2 rounded-md bg-shu px-5 text-body font-bold text-paper transition-colors hover:bg-shu-deep"
          >
            {fa.curriculum.backToJourney}
            <ArrowLeft aria-hidden className="size-4" />
          </button>
        </div>
      )}
      {completing && !completed && <p className="text-small text-ink-soft">{fa.common.loading}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ block renderers */

/**
 * TASK-LEARNING-07 (DD-105/DD-111): writing-practice block — the owner-ordered
 * handwriting capability as a TEACHING-layer station block. One canvas with a
 * switchable target picker (small station sets) + optional confusable-pair
 * focus chips. Practice-layer only (never a mastery gate — DD-106): summaries
 * are recorded best-effort via the station API and raw pen paths never leave
 * the browser.
 */
function WritingPracticeBlock({
  block,
  chapterSlug,
  stationSlug,
}: {
  block: Extract<ClientTeachingBlock, { kind: 'writing-practice' }>;
  chapterSlug: string;
  stationSlug: string;
}) {
  const [activeChar, setActiveChar] = useState(block.characters[0] ?? '');
  if (!activeChar) return null;
  const pairChars = (block.focusPairs ?? []).flatMap(([a, b]) => [a, b]);
  return (
    <section className="flex flex-col gap-4" aria-label={fa.curriculum.writingBlockTitle}>
      <h3 className="text-h3 font-bold">{fa.curriculum.writingBlockTitle}</h3>
      {block.instructionsFa ? (
        <p className="text-body leading-[var(--leading-fa)] text-ink-soft">{block.instructionsFa}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-small text-ink-faint">{fa.curriculum.writingPickChar}</span>
        {block.characters.map((ch) => (
          <button
            key={ch}
            type="button"
            onClick={() => setActiveChar(ch)}
            aria-pressed={activeChar === ch}
            className={`min-h-11 min-w-11 rounded-md border-2 px-3 font-jp text-h3 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai ${
              activeChar === ch
                ? 'border-indigo bg-indigo text-paper'
                : 'border-ink-faint bg-card text-ink hover:bg-surface-warm'
            }`}
          >
            {ch}
          </button>
        ))}
      </div>
      <WritingPractice
        key={activeChar}
        character={activeChar}
        initialMode={block.initialMode}
        onAttempt={(summary) => {
          void recordWritingPractice({
            chapterSlug,
            stationSlug,
            blockId: block.id,
            character: summary.character,
            mode: summary.mode,
            verdict: summary.verdict,
            strokesTotal: summary.strokesTotal,
            strokesFirstTry: summary.strokesFirstTry,
            totalMistakes: summary.totalMistakes,
            hintsShown: summary.hintsShown,
            completed: summary.completed,
            durationMs: summary.durationMs,
          });
        }}
      />
      {block.focusPairs && block.focusPairs.length > 0 ? (
        <div className="rounded-md border border-shu/40 bg-surface-warm p-4">
          <p className="text-small font-bold text-ink">{fa.curriculum.writingPairFocusTitle}</p>
          <p className="mt-1 text-small text-ink-soft">{fa.curriculum.writingPairNote}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pairChars.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setActiveChar(ch)}
                aria-pressed={activeChar === ch}
                className={`min-h-11 min-w-11 rounded-md border-2 px-3 font-jp text-h3 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai ${
                  activeChar === ch
                    ? 'border-shu bg-shu text-paper'
                    : 'border-ink-faint bg-card text-ink hover:bg-surface-warm'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BlockView({
  block,
  stationSlug,
  chapterSlug,
  chapter,
  clientExercises,
  lineById,
  speakers,
  audioByLine,
  audioFallbackByLine,
  audioAvailable,
  wordAudioByWord,
  kanaAudioByKanaId,
  isLastBlock,
  exerciseScore,
  exerciseInitialProgress,
  onExerciseProgress,
  onReturnToBlock,
  onExerciseDone,
  onSceneDone,
}: {
  block: ClientTeachingBlock;
  stationSlug: string;
  chapterSlug: string;
  chapter: Pick<Chapter, 'words' | 'expressions'>;
  clientExercises: Record<string, ClientExercise>;
  lineById: Map<string, Line>;
  speakers: Record<string, string>;
  audioByLine: Record<string, string>;
  audioFallbackByLine?: Record<string, string>;
  audioAvailable: boolean;
  wordAudioByWord?: Record<string, { opus: string; m4a: string } | null>;
  /** WP-2/WP-3: resolved kana audio pairs (kanaId → opus+m4a | null). */
  kanaAudioByKanaId?: Record<string, { opus: string; m4a: string } | null>;
  /** True on the last authored block (drives the skip-panel CTA label). */
  isLastBlock: boolean;
  /**
   * Issue #102: the block's already-earned exercise score (null = not completed
   * yet — render the live ExerciseSession). Only meaningful for exercise blocks.
   */
  exerciseScore: number | null;
  /** WP-5 (owner feedback E): persisted in-flight position for this block. */
  exerciseInitialProgress?: { index: number; firstTryCorrect: number };
  /** WP-5: question-transition reporter → the host persists the walk snapshot. */
  onExerciseProgress?: (progress: { index: number; firstTryCorrect: number }) => void;
  /** Issue #106 (F4): host-owned «بازگشت به آموزش» jump handler. */
  onReturnToBlock?: (blockId: string) => void;
  onExerciseDone: (score: number) => void;
  onSceneDone: () => void;
}) {
  switch (block.kind) {
    case 'scene':
      return (
        <section className="rounded-md border border-ink-faint bg-card p-5">
          <h2 className="flex items-center gap-2 text-h3 font-bold text-indigo">
            <Sparkles aria-hidden className="size-5" />
            {block.titleFa}
          </h2>
          <p className="mt-3 text-body leading-[var(--leading-fa)] text-ink">
            <MixedFaJaText text={block.bodyFa} />
          </p>
        </section>
      );

    case 'vocab-card': {
      const word = chapter.words.find((w) => w.id === block.wordId)!;
      const line = lineById.get(word.lineRef);
      // Issue #103: prefer the word's INDEPENDENT audio when the registry has a
      // committed asset; honest fallback to the source-line audio otherwise.
      const wordAudio = wordAudioByWord?.[word.id] ?? null;
      const useWordAudio = wordAudio !== null;
      const audioLineId = useWordAudio ? word.id : line?.id;
      const audioUrl = useWordAudio ? wordAudio!.opus : line ? (audioByLine[line.id] ?? '') : '';
      const audioFallback = useWordAudio ? wordAudio!.m4a : line ? audioFallbackByLine?.[line.id] : undefined;
      return (
        <section className="rounded-md border border-ink-faint bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {/*
               * Issue #105 (meaning-first): absolute beginners read Persian before
               * Japanese — the MEANING leads with the strongest type weight, the
               * term follows second with furigana (never hidden, just re-weighted).
               */}
              <p className="text-h2 font-black leading-tight text-ink">{word.meaningFa}</p>
              {word.termFurigana ? (
                <JaBlock className="mt-2 text-lead font-bold">
                  <FuriganaText>{word.termFurigana}</FuriganaText>
                </JaBlock>
              ) : (
                <JaBlock className="mt-2 text-lead font-bold">{word.term}</JaBlock>
              )}
              <p className="mt-1 text-small text-ink-soft" dir="ltr" lang="ja">
                {word.readingKana} · {word.romaji}
              </p>
            </div>
            {(useWordAudio || line) && (
              <LineAudioButton
                lineId={audioLineId!}
                audioUrl={audioUrl}
                audioUrlFallback={audioFallback}
                /* a resolved word asset is playable even when the dialogue-level
                   audio is still pending generation (bytes live in the registry) */
                audioAvailable={useWordAudio || audioAvailable}
                label={useWordAudio ? 'پخش تلفظ واژه' : fa.curriculum.playLine}
              />
            )}
          </div>
          {word.noteFa && (
            <p className="mt-2 flex items-start gap-2 text-small text-ink-soft">
              <BookOpenText aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>
                <b>{fa.curriculum.wordCardNote}: </b>
                {word.noteFa}
              </span>
            </p>
          )}
          {line && (
            <div className="mt-4 rounded-md bg-surface-warm p-4">
              <p className="text-caption text-ink-soft">{fa.curriculum.inDialogue}:</p>
              <JaBlock className="mt-2 text-body">
                {line.tokens.map((t, i) => (
                  <span
                    key={i}
                    className={
                      word.surfaceInLine && t.surface.includes(word.surfaceInLine.slice(0, 2))
                        ? 'rounded-sm bg-indigo-wash px-0.5 font-bold text-indigo'
                        : undefined
                    }
                  >
                    {t.surface}
                  </span>
                ))}
              </JaBlock>
              <p className="mt-2 text-small text-ink-soft">{line.fa}</p>
            </div>
          )}
        </section>
      );
    }

    case 'kana-card': {
      /*
       * TASK-LEARNING-08 (WP-2 — owner feedback A+C): the glyph card is now a
       * REAL TEACHING moment (KanaCard v2 — DD-121): sound-first + Persian
       * pronunciation + pair comparison + the writing engine INSIDE the card
       * (Observe → Trace → Free recall). Structure stays data-driven (DD-122).
       */
      const kana = KANA_ITEMS_BY_ID[block.kanaId];
      if (!kana) {
        return (
          <section className="rounded-md border border-danger/40 bg-card p-5">
            <p className="text-body text-ink">{fa.curriculum.kanaCardMissing(block.kanaId)}</p>
          </section>
        );
      }
      return (
        <KanaCard
          kana={kana}
          showRomaji={block.showRomaji}
          confusableNoteFa={block.confusableNoteFa}
          audioUrls={kanaAudioByKanaId?.[kana.kanaId] ?? null}
          onWritingAttempt={(summary) => {
            void recordWritingPractice({
              chapterSlug,
              stationSlug,
              blockId: block.id,
              character: summary.character,
              mode: summary.mode,
              verdict: summary.verdict,
              strokesTotal: summary.strokesTotal,
              strokesFirstTry: summary.strokesFirstTry,
              totalMistakes: summary.totalMistakes,
              hintsShown: summary.hintsShown,
              completed: summary.completed,
              durationMs: summary.durationMs,
            });
          }}
        />
      );
    }

    case 'expression-card': {
      const expr = chapter.expressions.find((e) => e.id === block.expressionId)!;
      const line = lineById.get(expr.lineRef);
      return (
        <section className="rounded-md border border-ink-faint bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <JaBlock className="text-h3 font-bold">{expr.ja}</JaBlock>
            {line && (
              <LineAudioButton
                lineId={line.id}
                audioUrl={audioByLine[line.id] ?? ''}
                audioUrlFallback={audioFallbackByLine?.[line.id]}
                audioAvailable={audioAvailable}
              />
            )}
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-surface-warm p-3">
              <dt className="text-caption text-ink-soft">کارکرد</dt>
              <dd className="mt-1 text-body">{expr.functionFa}</dd>
            </div>
            <div className="rounded-md bg-surface-warm p-3">
              <dt className="text-caption text-ink-soft">رسمیت</dt>
              <dd className="mt-1 text-body">{expr.formalityFa}</dd>
            </div>
            <div className="rounded-md bg-surface-warm p-3">
              <dt className="text-caption text-ink-soft">پاسخ متقابل</dt>
              <dd className="mt-1 text-body">{expr.replyFa}</dd>
            </div>
            {expr.taarofNoteFa && (
              <div className="rounded-md border border-warning/40 bg-surface-warm p-3">
                <dt className="text-caption text-ink-soft">نکتهٔ تعارف</dt>
                <dd className="mt-1 text-small">{expr.taarofNoteFa}</dd>
              </div>
            )}
          </dl>
        </section>
      );
    }

    case 'guided-discovery':
      return (
        <DiscoveryBlock
          block={block}
          stationSlug={stationSlug}
          chapterSlug={chapterSlug}
          lineById={lineById}
          audioByLine={audioByLine}
          audioFallbackByLine={audioFallbackByLine}
          audioAvailable={audioAvailable}
        />
      );

    case 'structured-input':
      return (
        <DiscoveryBlock
          block={block}
          stationSlug={stationSlug}
          chapterSlug={chapterSlug}
          lineById={lineById}
          audioByLine={audioByLine}
          audioFallbackByLine={audioFallbackByLine}
          audioAvailable={audioAvailable}
        />
      );

    case 'rule-card':
      return (
        <section className="rounded-md border-2 border-indigo bg-card p-5">
          <JaBlock className="text-h3 font-bold text-indigo">{block.patternJa}</JaBlock>
          <h3 className="mt-2 text-body font-bold">
            <MixedFaJaText text={block.titleFa} />
          </h3>
          <p className="mt-3 text-body leading-[var(--leading-fa)]">
            <MixedFaJaText text={block.bodyFa} />
          </p>
          {block.structureTable && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-small">
                <thead>
                  <tr className="border-b border-ink-faint text-ink-soft">
                    {block.structureTable.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-start font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.structureTable.rows.map((row, i) => (
                    <tr key={i} className="border-b border-ink-faint/50">
                      {row.map((cell, j) => (
                        <td key={j} dir="auto" className="px-3 py-2">
                          <MixedFaJaText text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {block.persianBridgeFa && (
            <p className="mt-4 flex items-start gap-2 rounded-md border-s-2 border-s-ai bg-surface-warm p-3 text-body">
              <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-ai" />
              <MixedFaJaText text={block.persianBridgeFa} />
            </p>
          )}
          {block.honestyLabelFa && <p className="mt-2 text-caption text-ink-faint">{block.honestyLabelFa}</p>}
        </section>
      );

    case 'example-set':
      return (
        <section className="flex flex-col gap-3">
          <h3 className="text-h3 font-bold">{fa.curriculum.examplesTitle}</h3>
          {block.examples.map((example) => (
            <article key={example.id} className="rounded-md border border-ink-faint bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-ai px-3 py-1 text-caption text-ai">
                  {roleLabel(example.role)}
                </span>
                {example.lineRef && <span className="text-caption text-ink-soft">{fa.curriculum.inDialogue}</span>}
              </div>
              <JaBlock className="mt-3 text-lead font-bold">{example.ja}</JaBlock>
              <p className="mt-1 text-caption text-ink-soft" dir="ltr" lang="ja">
                {example.reading}
              </p>
              <p className="mt-2 text-body">{example.fa}</p>
              <p className="mt-1 text-small text-ink-soft">
                <MixedFaJaText text={example.whyFa} />
              </p>
              {example.selfExplainFa && (
                <p className="mt-3 flex items-start gap-2 rounded-md bg-surface-warm p-3 text-small">
                  <MessageCircleQuestion aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-soft" />
                  <MixedFaJaText text={example.selfExplainFa} />
                </p>
              )}
            </article>
          ))}
        </section>
      );

    case 'writing-practice':
      /* TASK-LEARNING-07 (DD-105/DD-111): practice-layer block — the forward
       * button stays available; summaries are recorded best-effort (never a gate). */
      return <WritingPracticeBlock block={block} chapterSlug={chapterSlug} stationSlug={stationSlug} />;

    case 'exercise': {
      const items = block.exerciseIds
        .map((id) => clientExercises[id])
        .filter((e): e is ClientExercise => e !== undefined);
      if (items.length === 0) return null;
      /*
       * Issue #102: a previously completed exercise block stays completed — the
       * earned result (exerciseScore) is offered as a skip panel, so walking back
       * and forward again never re-grades or re-requires the session.
       */
      if (exerciseScore != null) {
        return (
          <section className="flex flex-col gap-4 rounded-md border border-ink-faint bg-card p-5">
            <h3 className="flex items-center gap-2 text-h3 font-bold text-success">
              <CheckCircle2 aria-hidden className="size-5" />
              {fa.curriculum.exerciseAlreadyDoneTitle}
            </h3>
            <p className="text-body leading-[var(--leading-fa)] text-ink-soft">
              {fa.curriculum.exerciseAlreadyDoneBody}
            </p>
            <button
              type="button"
              onClick={() => onExerciseDone(exerciseScore)}
              className="flex h-11 w-fit items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
            >
              {isLastBlock ? fa.curriculum.stationDone : fa.curriculum.continueBlock}
              <ArrowLeft aria-hidden className="size-4" />
            </button>
          </section>
        );
      }
      return (
        <section className="rounded-md border border-ink-faint bg-card p-5">
          <ExerciseSession
            chapterSlug={chapterSlug}
            stationSlug={stationSlug}
            exercises={items}
            audioByLine={audioByLine}
            audioFallbackByLine={audioFallbackByLine}
            audioAvailable={audioAvailable}
            onSessionDone={(score) => onExerciseDone(score)}
            onReturnToBlock={onReturnToBlock}
            initialProgress={exerciseInitialProgress}
            onProgress={onExerciseProgress}
          />
        </section>
      );
    }

    case 'listening-task':
      return (
        <section className="rounded-md border border-ink-faint bg-card p-5">
          <h3 className="flex items-center gap-2 text-h3 font-bold text-indigo">
            <Ear aria-hidden className="size-5" />
            {fa.curriculum.listeningTaskTitle}
          </h3>
          <p className="mt-3 text-body text-ink-soft">{fa.curriculum.listeningTaskBody}</p>
        </section>
      );

    case 'character-scene':
      return (
        <CharacterSceneBlock
          block={block}
          stationSlug={stationSlug}
          chapterSlug={chapterSlug}
          speakers={speakers}
          onSceneDone={onSceneDone}
        />
      );

    case 'wrap-up':
      return (
        <section className="rounded-md border-2 border-shu/60 bg-card p-5">
          <h3 className="text-h3 font-bold text-shu">{block.titleFa}</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {block.itemsFa.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-body">
                <CheckCircle2 aria-hidden className="mt-1 size-4 shrink-0 text-success" />
                <MixedFaJaText text={item} />
              </li>
            ))}
          </ul>
          {block.fsrsNoteFa && <p className="mt-3 text-caption text-ink-soft">{block.fsrsNoteFa}</p>}
        </section>
      );

    case 'dialogue-player':
      return (
        <section className="flex flex-col gap-3 rounded-md border-2 border-ai bg-card p-5">
          <h3 className="flex items-center gap-2 text-h3 font-bold text-ai">
            <PlayCircle aria-hidden className="size-5" />
            {fa.curriculum.replayDialogue}
          </h3>
          <p className="text-body text-ink-soft">{fa.curriculum.dialogueGoToListen}</p>
          <Link
            href={`/learn/${chapterSlug}/dialogue`}
            className="flex h-12 w-fit items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
          >
            {fa.curriculum.replayDialogue}
            <ArrowLeft aria-hidden className="size-4" />
          </Link>
        </section>
      );
  }
}

/* ---- guided discovery + structured input (server-graded choice) ---- */
function DiscoveryBlock({
  block,
  stationSlug,
  chapterSlug,
  lineById,
  audioByLine,
  audioFallbackByLine,
  audioAvailable,
}: {
  block:
    | Extract<ClientTeachingBlock, { kind: 'guided-discovery' }>
    | Extract<ClientTeachingBlock, { kind: 'structured-input' }>;
  stationSlug: string;
  chapterSlug: string;
  lineById: Map<string, Line>;
  audioByLine: Record<string, string>;
  audioFallbackByLine?: Record<string, string>;
  audioAvailable: boolean;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ correct: boolean; feedbackFa: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const answer = async (optionId: string) => {
    setPicked(optionId);
    setBusy(true);
    const result = await gradeBlock({
      chapterSlug,
      stationSlug,
      blockId: block.id,
      answer: { kind: 'option', optionId },
    });
    setOutcome(result ?? { correct: false, feedbackFa: '' });
    setBusy(false);
  };

  const displayLine = 'displayLineRef' in block ? lineById.get(block.displayLineRef) : undefined;
  const compareLine =
    'compareLineRef' in block && block.compareLineRef ? lineById.get(block.compareLineRef) : undefined;

  return (
    <section className="flex flex-col gap-4 rounded-md border border-ink-faint bg-card p-5">
      {(displayLine || compareLine) && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-caption text-ink-soft">
            <MessageCircleQuestion aria-hidden className="size-4" />
            به این خط‌ها نگاه کن:
          </p>
          {[displayLine, compareLine].filter(Boolean).map((l) => (
            <div key={l!.id} className="flex items-center gap-3 rounded-md bg-surface-warm p-3">
              <LineAudioButton
                lineId={l!.id}
                audioUrl={audioByLine[l!.id] ?? ''}
                audioUrlFallback={audioFallbackByLine?.[l!.id]}
                audioAvailable={audioAvailable}
              />
              <JaBlock className="text-body">
                {l!.tokens.map((t, i) => {
                  const hl =
                    'highlightSurfaces' in block && block.highlightSurfaces?.some((h) => t.surface.endsWith(h));
                  return (
                    <span key={i} className={hl ? 'rounded-sm bg-indigo-wash px-0.5 font-bold text-shu' : undefined}>
                      {t.surface}
                    </span>
                  );
                })}
              </JaBlock>
            </div>
          ))}
        </div>
      )}
      {'lineRef' in block && block.lineRef && !displayLine && (
        <p className="text-caption text-ink-soft">{fa.curriculum.inDialogue}</p>
      )}
      <p className="text-body font-bold">
        <MixedFaJaText text={block.questionFa} />
      </p>
      <div role="radiogroup" className="flex flex-col gap-2">
        {block.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={picked === opt.id}
            disabled={outcome !== null || busy}
            onClick={() => void answer(opt.id)}
            className={[
              'min-h-11 rounded-md border px-4 py-3 text-start text-body transition-colors',
              picked === opt.id ? 'border-ai bg-indigo-wash font-bold' : 'border-ink-faint bg-card hover:border-ai',
            ].join(' ')}
          >
            <span dir="auto">{opt.label}</span>
          </button>
        ))}
      </div>
      {outcome && (
        <div role="status" aria-live="polite" className="rounded-md bg-surface-warm p-3 text-body">
          {outcome.correct && <p className="font-bold text-success">{fa.curriculum.correct}</p>}
          {outcome.feedbackFa && <p className="mt-1">{outcome.feedbackFa}</p>}
        </div>
      )}
    </section>
  );
}

/* ---- character scene (INTEGRATE — server-graded replies) ---- */
function CharacterSceneBlock({
  block,
  stationSlug,
  chapterSlug,
  speakers,
  onSceneDone,
}: {
  block: Extract<ClientTeachingBlock, { kind: 'character-scene' }>;
  stationSlug: string;
  chapterSlug: string;
  speakers: Record<string, string>;
  onSceneDone: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [reply, setReply] = useState<Record<number, { ok: boolean }>>({});
  const [built, setBuilt] = useState<string[]>([]);
  const [nameValue, setNameValue] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = block.steps.slice(0, stepIndex + 1);
  const current = block.steps[stepIndex];
  const replySpec = current?.userReply;
  const finished = stepIndex === block.steps.length - 1 && reply[stepIndex];

  const advance = () => {
    if (stepIndex < block.steps.length - 1) setStepIndex(stepIndex + 1);
    else onSceneDone();
  };

  const submitReply = async () => {
    if (!replySpec) return;
    setBusy(true);
    let answer: { kind: string; optionId?: string; chipOrder?: string[]; nameValue?: string };
    if (replySpec.kind === 'choice') {
      answer = { kind: 'option', optionId: choice ?? '' };
    } else {
      answer = { kind: 'build', chipOrder: built, nameValue };
    }
    const result = await gradeBlock({
      chapterSlug,
      stationSlug,
      blockId: block.id,
      stepIndex,
      answer,
    });
    setReply((r) => ({ ...r, [stepIndex]: { ok: result?.correct ?? false } }));
    setBusy(false);
  };

  return (
    <section className="flex flex-col gap-4" aria-label={fa.curriculum.yourTurn}>
      {visible.map((s, i) => {
        const isUser = s.speaker === 'user';
        const answered = reply[i];
        return (
          <article
            key={i}
            className={[
              'rounded-md border p-4',
              isUser ? 'border-ai bg-indigo-wash/40' : 'border-ink-faint bg-card',
            ].join(' ')}
          >
            <p className="text-caption font-bold text-ink-soft">
              {isUser ? fa.curriculum.yourTurn : (speakers[s.speaker] ?? s.speaker)}
            </p>
            <JaBlock className="mt-2 text-lead font-bold">
              {s.ja.split('___NAME___').map((part, j, arr) => (
                <span key={j}>
                  {part}
                  {j < arr.length - 1 && (
                    <span className="rounded-sm bg-shu/15 px-1 text-shu">{nameValue || '___'}</span>
                  )}
                </span>
              ))}
            </JaBlock>
            <p className="mt-2 text-small text-ink-soft" dir="auto">
              {s.fa.replace('___NAME___', nameValue || '…')}
            </p>

            {s.userReply && i === stepIndex && !answered && (
              <div className="mt-4 flex flex-col gap-3 border-t border-ink-faint pt-4">
                <p className="text-body font-bold">{s.userReply.promptFa}</p>
                {s.userReply.kind === 'choice' ? (
                  <div role="radiogroup" className="flex flex-col gap-2">
                    {(s.userReply.options ?? []).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={choice === opt.id}
                        onClick={() => setChoice(opt.id)}
                        className={[
                          'min-h-11 rounded-md border px-4 py-3 text-start text-body transition-colors',
                          choice === opt.id
                            ? 'border-ai bg-indigo-wash font-bold'
                            : 'border-ink-faint bg-card hover:border-ai',
                        ].join(' ')}
                      >
                        <span dir="auto">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div
                      className="flex min-h-12 flex-wrap items-center gap-2 rounded-md border border-dashed border-ink-faint bg-card p-3"
                      dir="ltr"
                      lang="ja"
                    >
                      {built.map((id) => {
                        const chip = (s.userReply!.chips ?? []).find((c) => c.id === id)!;
                        return chip.ja === '___NAME___' ? (
                          <input
                            key={id}
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            placeholder={fa.curriculum.typeYourName}
                            aria-label={fa.curriculum.typeYourName}
                            className="h-11 w-28 rounded-sm border border-ai bg-paper px-2 text-center text-body"
                            dir="auto"
                          />
                        ) : (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setBuilt((b) => b.filter((x) => x !== id))}
                            className="rounded-sm border border-ink-faint bg-surface-warm px-3 py-2 text-ja"
                          >
                            {chip.ja}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2" dir="ltr" lang="ja">
                      {(s.userReply.chips ?? [])
                        .filter((c) => !built.includes(c.id))
                        .map((chip) => (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => setBuilt((b) => [...b, chip.id])}
                            className="rounded-sm border border-ink-faint bg-card px-3 py-2 text-ja transition-colors hover:border-ai"
                          >
                            {chip.ja}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={submitReply}
                  disabled={
                    busy ||
                    (s.userReply.kind === 'choice' ? !choice : built.length !== (s.userReply.chips?.length ?? 0))
                  }
                  className="h-11 w-fit rounded-md bg-shu px-5 text-body font-bold text-paper transition-colors hover:bg-shu-deep disabled:opacity-45"
                >
                  {fa.curriculum.checkAnswer}
                </button>
              </div>
            )}
            {answered && (
              <p role="status" aria-live="polite" className="mt-3 flex items-center gap-1.5 text-body text-success">
                <CheckCircle2 aria-hidden className="size-4" />
                {fa.curriculum.correct}
              </p>
            )}
          </article>
        );
      })}

      {reply[stepIndex] && !finished && (
        <button
          type="button"
          onClick={advance}
          className="flex h-11 w-fit items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
        >
          {fa.curriculum.continueBlock}
        </button>
      )}
      {finished && (
        <button
          type="button"
          onClick={onSceneDone}
          className="flex h-11 w-fit items-center gap-2 rounded-md bg-shu px-5 text-body font-bold text-paper transition-colors hover:bg-shu-deep"
        >
          {fa.curriculum.stationDone}
        </button>
      )}
    </section>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case 'anchor':
      return 'لنگر از مکالمه';
    case 'near':
      return 'هم‌قاب';
    case 'varied':
      return 'بافت جدید';
    case 'faded':
      return 'جای‌خالی';
    case 'reading':
      // TASK-LEARNING-06: reading-moment item (05A §۴) — a real word the learner
      // can now decode; label communicates the «حالا می‌توانی بخوانی» moment.
      return 'حالا می‌توانی بخوانی';
    default:
      return role;
  }
}

export type { Station };
