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
  Eye,
  MessageCircleQuestion,
  Mic,
  Play,
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
/* TASK-HANASO-17 §۸ — the same 7-day policy clocks the LOCAL walk snapshot
 * (never only localStorage AND never only the server — both layers agree). */
import { resumeFreshness } from '@/modules/curriculum/resume-policy';
import { JaBlock } from '@/components/patterns/ja-block';
import { FuriganaText } from '@/components/patterns/furigana-text';
import { MixedFaJaText } from './mixed-fa-ja-text';
import { LineAudioButton } from './line-audio-button';
import { ExerciseSession } from './exercise-session';
import { WritingCanvas } from '@/components/writing/writing-canvas';
import { KanaCard, normalizeKanaStage, type KanaCardProgress, type KanaRelatedExample } from './kana-card';
import { ExampleAudioButton } from './example-audio-button';
import { KANA_ITEMS_BY_ID, KANA_ITEMS_BY_GLYPH } from '@/modules/curriculum/content/kana-items';
import { loadWritingCharData, writingAvailability } from '@/modules/writing';
import { getCachedAudio, preloadAudio } from '@/modules/audio/client-cache';

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
  /**
   * TASK-LEARNING-10 §6 — the next CORE station on the learning map after this
   * one (server-resolved from the real chapter data, same core-path ordering
   * the island map uses). Drives the completion CTA: present → «رفتن به
   * ایستگاه بعدی» deep-linked to it; null/absent → «ادامهٔ مسیر» to the island
   * map (the mastery gate has just opened there). Absent prop = the host has
   * no map context — the map CTA is the safe fallback.
   */
  nextCoreStation?: { slug: string; titleFa: string } | null;
  /**
   * TASK-HANASO-17 §۶ — LESSON REPLAY (`?mode=review`): the completed lesson
   * re-opens from the TOP with all content (slides, audio, exercises); the
   * runner re-registers NOTHING (no `complete` POST, no enrollment, no
   * rewards) — the completion record stays exactly as first earned.
   */
  replayMode?: boolean;
  /**
   * TASK-HANASO-17 §۸ — expired-resume restart (`?restart=1`, from the Home
   * «شروع دوبارهٔ درس» CTA): any local/server resume pointer is dropped and
   * the walk starts at block 0 with the neutral notice.
   */
  restartRequested?: boolean;
  /**
   * TASK-HANASO-17 §۷ — the map deep-link (carries this station's `?s=`
   * section). Every exit (header back + the completion CTA) returns to the
   * SAME map section. Absent = the plain chapter map.
   */
  mapHref?: string;
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
  /**
   * TASK-LEARNING-08 Addendum-3 §9: kanaId → the host word's OWN audio pair
   * (public/audio/hostwords registry). Null = not generated; the word card
   * hides its play control honestly.
   */
  hostWordAudioByKanaId?: Record<string, { opus: string; m4a: string } | null>;
  /**
   * TASK-LEARNING-08 Addendum-4 §7: example word → its OWN audio pair from the
   * SAME per-word registry (one asset per unique word — an example and a host
   * word that are the same word share the word's asset, never another word's).
   * Null = no committed asset; the example card hides its play control honestly
   * (never a dead button, never a neighboring character/word sound).
   */
  exampleAudioByWord?: Record<string, { opus: string; m4a: string } | null>;
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
 * TASK-LEARNING-08 (WP-5) + TASK-LEARNING-10 §6: fetch the server-side walk
 * state for this station. Read from the SAME API the walk writes to — the
 * client fetch works identically in dev (route-handler store) and production
 * (Postgres), unlike an RSC prop (RSC and route handlers may read different
 * module instances in dev).
 *
 * TL-10 §6 adds the `completed` branch: a refresh (or a re-visit) of an
 * ALREADY-COMPLETED station re-renders its completion state instead of
 * silently restarting the walk — the owner's protection «از دست رفتن وضعیت
 * ایستگاه پس از Refresh».
 */
type ServerResume = { kind: 'anchor'; blockId: string } | { kind: 'completed' } | { kind: 'expired' } | null;
async function fetchServerResume(chapterSlug: string, stationSlug: string): Promise<ServerResume> {
  try {
    const res = await fetch(
      `/api/curriculum/station?chapter=${encodeURIComponent(chapterSlug)}&station=${encodeURIComponent(stationSlug)}`,
      { cache: 'no-store' },
    );
    const json = (await res.json()) as {
      data?: { state?: { status?: string; currentBlock?: string | null } | null; resumeExpired?: boolean };
    };
    const state = json.data?.state;
    if (state?.status === 'completed') return { kind: 'completed' };
    /* TASK-HANASO-17 §۸: the SERVER computed the 7-day expiry (source of
     * truth — multi-device consistent, §10). An expired anchor restores
     * NOTHING; the walk restarts from the top with the neutral notice. */
    if (json.data?.resumeExpired) return { kind: 'expired' };
    if (state && state.status === 'in_progress' && state.currentBlock) {
      return { kind: 'anchor', blockId: state.currentBlock };
    }
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
    nextCoreStation,
    replayMode = false,
    restartRequested = false,
    mapHref,
    clientExercises,
    dialogue,
    audioByLine,
    audioFallbackByLine,
    audioAvailable,
    wordAudioByWord,
    kanaAudioByKanaId,
    hostWordAudioByKanaId,
    exampleAudioByWord,
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
  /**
   * CP-04 fix (TL-10 §6 gap): the server resume must settle before ANY walk
   * position is persisted. On a revisit of a COMPLETED station the persist
   * effect used to race the resume and plant a fresh step-0 snapshot, so the
   * NEXT refresh restored that empty walk instead of the completion panel —
   * the owner-reported bug, surviving TL-10's first fix from the second
   * refresh on (live-reproduced on production 2026-11-10, probe5: reload #1
   * panel ✓ → reload #2 walk restart ✗).
   */
  const [resumeSettled, setResumeSettled] = useState(false);
  const [resumedNotice, setResumedNotice] = useState(false);
  const [sessionScore, setSessionScore] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  /**
   * TASK-HANASO-17 §۶ — the replay walk reached its end: a NON-interactive
   * end panel (message + ONE CTA back to the map section). Nothing was
   * POSTed; the panel is purely informational.
   */
  const [replayEnded, setReplayEnded] = useState(false);
  /**
   * TASK-HANASO-17 §۶ — «مرور دوباره» after the completion panel: the walk
   * re-runs locally in replay semantics (no second `complete` POST even when
   * the server row is already completed).
   */
  const [localReplay, setLocalReplay] = useState(false);
  /**
   * TASK-HANASO-17 §۸ — the neutral restart notice («از ابتدای درس شروع
   * می‌کنیم») shown when the 7-day policy dropped the resume pointer or the
   * Home CTA explicitly restarted the lesson. Behavioral-UX §۴: neutral tone,
   * no absence-shaming, no red numbers.
   */
  const [restartNotice, setRestartNotice] = useState(false);
  /**
   * TL-13 (A-3): an honest completion-failure notice + retry. The old flow
   * swallowed a failed/aborted `complete` POST (silent dead button + unhandled
   * rejection — live-reproduced by aborting the network). The score of the
   * failed attempt is kept so the retry re-submits exactly what was earned.
   */
  const [completionFailed, setCompletionFailed] = useState(false);
  const completionFailedRef = useRef(false);
  /**
   * Issue #102: earned exercise results per block id — they live OUTSIDE the
   * current step, so stepping back (and forward again) never loses them. A
   * block with a recorded result renders the skip panel instead of re-grading.
   */
  const [blockResults, setBlockResults] = useState<BlockResults>({});
  /** WP-5: in-flight exercise positions per block id (survives refresh). */
  const [exerciseProgress, setExerciseProgress] = useState<Record<string, ExerciseBlockProgress>>({});
  /**
   * TASK-LEARNING-08 phase 2 (#117 §8/§10): kana-card v3 stage per block id —
   * writing is a REQUIRED part of the walk (the block gates forward movement
   * until its free-writing stage completes) and the stage survives refresh.
   */
  const [kanaCardStages, setKanaCardStages] = useState<Record<string, string>>({});

  /* ------- TASK-HANASO-CTA-01 §۴ — related usage examples per kana ---------
   * Each kana card's related usage examples = the station's example-set
   * entries whose Japanese word CONTAINS that glyph, in their authored
   * educational order. Computed ONCE per station (data-driven; no content
   * duplication, no new content structure — the walk's own example-set block
   * stays exactly where it is). */
  const relatedExamplesByKanaId = useMemo(() => {
    const map: Record<string, KanaRelatedExample[]> = {};
    for (const b of station.blocks) {
      if (b.kind !== 'example-set') continue;
      for (const ex of b.examples) {
        for (const ch of Array.from(new Set(ex.ja))) {
          const item = KANA_ITEMS_BY_GLYPH[ch];
          if (item) (map[item.kanaId] ??= []).push(ex);
        }
      }
    }
    return map;
  }, [station.blocks]);

  const blocks = station.blocks;
  const block = blocks[step];
  const lineById = useMemo(() => new Map(dialogue.lines.map((l) => [l.id, l])), [dialogue.lines]);

  /* ------- Addendum-3 §3/§10: targeted prefetch of the NEXT kana card -------
   * While the learner works on the current card (many seconds before the
   * walk auto-advances), the NEXT kana's stroke data and BOTH audio assets
   * are warmed — one element each, deduped, never a bulk preload — so the
   * transition shows no skeleton flash and no network round-trip. */
  const nextKanaBlock = useMemo(
    () => station.blocks.find((b, i) => b.kind === 'kana-card' && i > step),
    [station.blocks, step],
  );
  useEffect(() => {
    if (!nextKanaBlock || nextKanaBlock.kind !== 'kana-card') return;
    const item = KANA_ITEMS_BY_ID[nextKanaBlock.kanaId];
    if (!item) return;
    void writingAvailability(item.glyph).then((a) => {
      if (a.status === 'available') loadWritingCharData(item.glyph).catch(() => undefined);
    });
    const pair = kanaAudioByKanaId?.[nextKanaBlock.kanaId];
    if (pair) void preloadAudio(pair.opus);
    const hostPair = hostWordAudioByKanaId?.[nextKanaBlock.kanaId];
    if (hostPair) void preloadAudio(hostPair.opus);
  }, [nextKanaBlock, kanaAudioByKanaId, hostWordAudioByKanaId]);

  /* ------- Addendum-5 §5 — targeted preload of the NEXT example-set block's
   * word audio (bounded: only the words of the ONE upcoming example block;
   * deduped + LRU-bounded by the shared cache — never a bulk preload, never a
   * repeat download: the same asset plays from cache when the block arrives). */
  const nextExampleBlock = useMemo(
    () => station.blocks.find((b, i) => b.kind === 'example-set' && i > step),
    [station.blocks, step],
  );
  useEffect(() => {
    if (!nextExampleBlock || nextExampleBlock.kind !== 'example-set') return;
    for (const ex of nextExampleBlock.examples.slice(0, 6)) {
      const pair = exampleAudioByWord?.[ex.ja];
      if (pair) void preloadAudio(pair.opus);
    }
  }, [nextExampleBlock, exampleAudioByWord]);

  /* ---------------- WP-5: restore the persisted walk (once, after mount) ----
   *
   * TASK-HANASO-17 §۶/§۸ adds two honest pre-branches BEFORE any restore:
   *   · `restartRequested` (?restart=1, from the Home restart CTA): the local
   *     snapshot is DROPPED and the server anchor is IGNORED — the walk starts
   *     at block 0 with the neutral notice (the 7-day policy already dropped
   *     the anchor server-side; this enter re-clears it idempotently).
   *   · `replayMode` (?mode=review, from the map's review rows): a completed
   *     lesson re-opens from the TOP — a local snapshot WITH earned progress
   *     still restores (a deliberately half-finished REPLAY continues), but
   *     the server's `completed` record never walls the walk off.
   * Everything else is the exact TL-08/TL-10 behavior (snapshot first, then
   * the server anchor/completion as fallback and authority). */
  useEffect(() => {
    if (restoreChecked) return;
    setRestoreChecked(true);
    if (restartRequested) {
      // §۸ — the expired walk pointer is deliberately dropped, history intact.
      clearWalkSnapshot(chapterSlug, station.slug);
      setRestartNotice(true);
      window.setTimeout(() => setRestartNotice(false), 6000);
      void fetchServerResume(chapterSlug, station.slug)
        .then((resume) => {
          // only the server's completion record still matters after a restart
          // (the station may have been finished on another device meanwhile)
          if (resume?.kind === 'completed') setCompleted(true);
        })
        .finally(() => setResumeSettled(true));
      return;
    }
    let snapshot = loadWalkSnapshot(chapterSlug, station.slug);
    /* TASK-HANASO-17 §۸ — the LOCAL snapshot obeys the same 7-day TTL: an
     * expired snapshot restores nothing. The restart NOTICE is deferred until
     * the server resume settles: a FRESH server anchor (the learner was
     * active on another device) restores the walk instead — only a server
     * that agrees on the expiry (or has no anchor at all) shows the notice. */
    let localExpired = false;
    if (snapshot && resumeFreshness(snapshot.updatedAt, Date.now()) === 'expired') {
      clearWalkSnapshot(chapterSlug, station.slug);
      snapshot = null;
      localExpired = true;
    }
    if (snapshot) {
      const restored = clampStepIndex(snapshot.stepIndex, blocks.length);
      setStep(restored);
      setBlockResults(snapshot.blockResults ?? {});
      setExerciseProgress(snapshot.exerciseProgress ?? {});
      setKanaCardStages(snapshot.kanaCardStages ?? {});
      if (typeof snapshot.sessionScore === 'number') setSessionScore(snapshot.sessionScore);
      if (
        snapshot.stepIndex > 0 ||
        Object.keys(snapshot.blockResults ?? {}).length > 0 ||
        // TL-13 (A-8): in-flight exercise/kana progress is ALSO real resumed
        // work — the notice fired only for block-level moves before, leaving a
        // mid-question restore silent.
        Object.keys(snapshot.exerciseProgress ?? {}).length > 0 ||
        Object.keys(snapshot.kanaCardStages ?? {}).length > 0
      ) {
        setResumedNotice(true);
        window.setTimeout(() => setResumedNotice(false), 4000);
      }
      /* CP-04 fix (TL-10 §6 gap): DO NOT stop at the local snapshot. The
       * server resume below is consulted on EVERY mount now: a revisit of a
       * completed station could carry a PLANTED empty step-0 snapshot (see
       * resumeSettled above) or a review that never progressed — the server's
       * completion record is the truth and wins over an EMPTY walk. A
       * snapshot with EARNED progress keeps the walk (a deliberate mid-review
       * resume — the user left work in flight). */
    }
    // the server walk state is the honest fallback for the position (cleared
    // localStorage on the same browser; a different browser has a different
    // learner id and thus no claim on this walk) AND the authority on
    // completion.
    // TL-10 §6: `completed` → the station re-renders its completion state
    // (refresh/re-visit never loses it, and the walk never silently restarts).
    void fetchServerResume(chapterSlug, station.slug)
      .then((resume) => {
        if (!resume) return;
        const emptyWalk =
          localExpired ||
          !snapshot ||
          (snapshot.stepIndex === 0 &&
            Object.keys(snapshot.blockResults ?? {}).length === 0 &&
            Object.keys(snapshot.exerciseProgress ?? {}).length === 0 &&
            Object.keys(snapshot.kanaCardStages ?? {}).length === 0);
        /* TASK-HANASO-17 §۶ — replay mode: the server's completion record is
         * expected here and must NOT wall off the replay walk; only a restart
         * or an EXPIRED anchor redirects the walk to block 0. */
        if (resume.kind === 'completed' && replayMode) {
          return;
        }
        if (resume.kind === 'expired') {
          /* §۸ — server-authoritative expiry: drop the local snapshot too and
           * restart from the top with the neutral notice (a snapshot that is
           * itself older than the TTL restores nothing). */
          const stale = !snapshot || resumeFreshness(snapshot.updatedAt, Date.now()) !== 'fresh' ? true : false;
          if (stale) {
            clearWalkSnapshot(chapterSlug, station.slug);
            setStep(0);
            setBlockResults({});
            setExerciseProgress({});
            setKanaCardStages({});
            setRestartNotice(true);
            window.setTimeout(() => setRestartNotice(false), 6000);
          }
          return;
        }
        if (resume.kind === 'completed') {
          if (emptyWalk) {
            setCompleted(true);
            // TL-13 (A-1): the walk rail/counter must tell the truth on a
            // completed station — the full walk is DONE, not «1 / n». The step
            // pointer moves to the last authored block (the rail renders
            // «n / n» with every segment filled).
            setStep(Math.max(0, blocks.length - 1));
            // heal a planted snapshot (also covers browsers that already
            // carry the stale step-0 snapshot from BEFORE this fix)
            clearWalkSnapshot(chapterSlug, station.slug);
          }
          return; // a snapshot WITH progress keeps its mid-review walk
        }
        if (snapshot) return; // a local walk exists — it owns the position
        const target = stepOfBlock(blocks, resume.blockId);
        if (target !== null && target > 0) {
          setStep(target);
          setResumedNotice(true);
          window.setTimeout(() => setResumedNotice(false), 4000);
          return;
        }
        if (localExpired) {
          // §۸: the local snapshot expired AND the server holds no usable
          // anchor — the neutral restart notice is now honest.
          setRestartNotice(true);
          window.setTimeout(() => setRestartNotice(false), 6000);
        }
      })
      .finally(() => setResumeSettled(true));
    // restore + fallback run exactly once per mount (deps limited on purpose;
    // replayMode/restartRequested are per-mount URL props — stable for the
    // mount, and restoreChecked already guarantees a single execution).
  }, [replayMode, restartRequested]);

  /* ---------------- WP-5: persist + sync on every meaningful transition ------ */
  const persistedRef = useRef<StationWalkSnapshot | null>(null);
  const syncStepRef = useRef(-1);
  useEffect(() => {
    if (!restoreChecked) return;
    /* CP-04 fix: never persist a walk position before the server resume has
     * settled (see resumeSettled) — this race planted the step-0 snapshot that
     * made the NEXT refresh of a completed station restart the walk. */
    if (!resumeSettled) return;
    if (completed || replayEnded || !block) return;
    const snapshot = {
      chapterSlug,
      stationSlug: station.slug,
      stepIndex: step,
      blockResults,
      exerciseProgress,
      kanaCardStages,
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
  }, [restoreChecked, step, blockResults, exerciseProgress, kanaCardStages, sessionScore]);

  /** TL-13 (A-3): the retry re-submits the LAST completion payload verbatim
   *  (score + taskCompleted flag — a viewed/task station retries identically). */
  const lastCompletionRef = useRef<{ score: number | null; taskCompleted: boolean }>({
    score: null,
    taskCompleted: false,
  });

  const finishSession = useCallback(
    async (score: number | null, taskCompleted = false) => {
      setSessionScore(score);
      lastCompletionRef.current = { score, taskCompleted };
      /*
       * TASK-HANASO-17 §۶ — REPLAY never re-registers: in replay mode (or a
       * local re-walk after the completion panel) the end is a NON-interactive
       * panel; the completion record, enrollments and rewards stay exactly as
       * first earned (the mission rule: «Completion اصلی دوباره ثبت نمی‌شود»).
       */
      if (replayMode || localReplay) {
        setReplayEnded(true);
        clearWalkSnapshot(chapterSlug, station.slug);
        return;
      }
      setCompleting(true);
      // TL-13 (A-3): a retry clears the failure state up-front; it re-arms if
      // this attempt fails again.
      completionFailedRef.current = false;
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
        if (res.ok) {
          setCompletionFailed(false);
          clearWalkSnapshot(chapterSlug, station.slug); // walk done — no stale resume
        } else {
          // TL-13 (A-3): honest failure (409 criterion/prereq, 5xx, offline) — the
          // learner sees WHY nothing happened and can retry in place.
          completionFailedRef.current = true;
          setCompletionFailed(true);
        }
      } catch {
        // network error / abort — same honest path (never an unhandled rejection)
        completionFailedRef.current = true;
        setCompletionFailed(true);
      } finally {
        setCompleting(false);
      }
    },
    [chapterSlug, station.slug, replayMode, localReplay],
  );

  /** TL-13 (A-3): the retry button re-submits the last earned payload. */
  const retryCompletion = useCallback(() => {
    const { score, taskCompleted } = lastCompletionRef.current;
    void finishSession(score, taskCompleted);
  }, [finishSession]);

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

  /*
   * TASK-HANASO-17 §۷ — the completion CTA is now ONE action with ONE
   * destination: «پایان درس و بازگشت به مسیر» back to the map SECTION that
   * holds this station (?s= deep-link from the host page). The next lesson is
   * SHOWN as a text line under the CTA («درس بعدی: …») — never auto-opened,
   * never a second CTA (owner §7: the learner decides whether to continue).
   */
  const completionTarget = useMemo(
    () => ({
      href: mapHref ?? `/learn/${chapterSlug}/journey`,
      label: fa.curriculum.ctaFinishStation,
    }),
    [mapHref, chapterSlug],
  );

  /* TL-10 §6: rapid double-click on the CTA navigates exactly once. */
  const navLatchRef = useRef(false);
  const goCompletionDestination = useCallback(() => {
    if (navLatchRef.current) return;
    navLatchRef.current = true;
    router.push(completionTarget.href);
  }, [completionTarget.href, router]);

  /*
   * TL-10 §6 + TASK-HANASO-17 §۶: «مرور دوباره» — the tertiary text action
   * that re-walks a completed station from the top for practice. It restarts
   * the LOCAL walk only and flips the runner into REPLAY semantics: no
   * `complete` POST fires again (the server's completion record and rewards
   * stay exactly as first registered — `already: true` was never even needed).
   */
  const reviewWalkAgain = useCallback(() => {
    setCompleted(false);
    setReplayEnded(false);
    setLocalReplay(true);
    setStep(0);
    setBlockResults({});
    setExerciseProgress({});
    setKanaCardStages({});
    setSessionScore(null);
    setResumedNotice(false);
  }, []);

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
      {/* TASK-HANASO-17 §۸ — the neutral restart notice (behavioral-UX §۴:
           no absence-shaming, no red numbers; the history is intact). */}
      {restartNotice && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-ink-faint bg-surface-warm px-4 py-2 text-small leading-[var(--leading-fa)] text-ink"
          data-walk-restarted
        >
          <RotateCcw aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-soft" />
          <span>
            <b>{fa.curriculum.walkRestartedTitle}. </b>
            {fa.curriculum.walkRestartedBody}
          </span>
        </p>
      )}

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

      {/*
       * TL-10 §6: once the station is completed, the walk content RETIRES —
       * the completion panel is the one clear state (message + ONE CTA). No
       * half-alive walk buttons next to it (the «مرور دوباره» link brings the
       * walk back for practice).
       */}
      {!completed && !replayEnded && block && (
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
          hostWordAudioByKanaId={hostWordAudioByKanaId}
          exampleAudioByWord={exampleAudioByWord}
          isLastBlock={step === blocks.length - 1}
          exerciseScore={block.kind === 'exercise' ? blockResult(blockResults, block.id) : null}
          exerciseInitialProgress={block.kind === 'exercise' ? exerciseProgress[block.id] : undefined}
          onExerciseProgress={(progress) => {
            if (block.kind !== 'exercise') return;
            setExerciseProgress((prev) => {
              const cur = prev[block.id];
              if (
                cur &&
                cur.index === progress.index &&
                cur.firstTryCorrect === progress.firstTryCorrect &&
                (cur.attemptNo ?? 1) === (progress.attemptNo ?? 1)
              ) {
                return prev;
              }
              return { ...prev, [block.id]: progress };
            });
          }}
          onReturnToBlock={returnToBlock}
          kanaCardStage={block.kind === 'kana-card' ? normalizeKanaStage(kanaCardStages[block.id]) : undefined}
          relatedExamplesByKanaId={relatedExamplesByKanaId}
          onKanaProgress={(progress: { stage: string }) => {
            if (block.kind !== 'kana-card') return;
            setKanaCardStages((prev) =>
              prev[block.id] === progress.stage ? prev : { ...prev, [block.id]: progress.stage },
            );
          }}
          onKanaWritingDone={() => {
            // #117 §8: the writing stage completed — the walk continues.
            if (step < blocks.length - 1) setStep((s) => s + 1);
            else void finishSession(null);
          }}
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
       * Action row (Issue #102 + #117 §8): «مرحلهٔ قبل» appears from the 2nd block
       * onward; the forward button keeps its exercise/scene exceptions AND the
       * kana-card gate (writing is required — no skipping past a kana card by
       * button until its free-writing stage completes; the card owns its CTA
       * and auto-advances via onKanaWritingDone).
       */}
      {!completed &&
        !replayEnded &&
        (step > 0 ||
          (block && block.kind !== 'exercise' && block.kind !== 'character-scene' && block.kind !== 'kana-card')) && (
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
            {block && block.kind !== 'exercise' && block.kind !== 'character-scene' && block.kind !== 'kana-card' && (
              <button
                type="button"
                onClick={next}
                disabled={completing}
                className="flex h-11 items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai disabled:opacity-45"
              >
                {/* TL-10 §6/§7: a plain forward action — a status text is never
                 posed as a button, and a normal action is never red. */}
                {fa.curriculum.continueBlock}
                <ArrowLeft aria-hidden className="size-4" />
              </button>
            )}
          </div>
        )}

      {/*
       * TASK-LEARNING-10 §6 — the completion panel, redesigned after the owner's
       * order: the success moment is a NON-INTERACTIVE status message
       * («این ایستگاه را با موفقیت پشت سر گذشتی!») followed by exactly ONE
       * primary CTA whose label names its real destination. The old flow had
       * a «ایستگاه تمام شد» BUTTON and then a second red «بازگشت به نقشه»
       * button — two sequential actions for one transition; both are gone.
       * The replay/review tertiary action stays a quiet text link (never a
       * second primary CTA), and the color is Aizen's primary indigo — red is
       * reserved for errors only (TL-10 §7 rule 9).
       *
       * TASK-HANASO-17 §۷ — the CTA now ALWAYS returns to the map section of
       * THIS station («پایان درس و بازگشت به مسیر» + ?s=) and the NEXT lesson
       * is a caption TEXT line under it — shown, never auto-opened, never a
       * second CTA (the old «رفتن به ایستگاه بعدی» deep-link is gone).
       */}
      {completed && !replayEnded && (
        <div
          role="status"
          aria-live="polite"
          data-station-complete
          className="flex flex-col gap-3 rounded-md border border-success bg-card p-5"
        >
          <p className="flex items-center gap-2 text-body font-bold text-success">
            <CheckCircle2 aria-hidden className="size-5" />
            {fa.curriculum.stationCompletedMessage}
          </p>
          <button
            type="button"
            onClick={goCompletionDestination}
            className="flex h-12 w-fit items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            {completionTarget.label}
            <ArrowLeft aria-hidden className="size-4" />
          </button>
          {nextCoreStation ? (
            <p className="text-caption text-ink-soft">{fa.curriculum.nextStationShown(nextCoreStation.titleFa)}</p>
          ) : null}
          <button
            type="button"
            onClick={reviewWalkAgain}
            className="flex w-fit items-center gap-1 text-small text-ai underline underline-offset-4"
          >
            <RotateCcw aria-hidden className="size-4" />
            {fa.curriculum.reviewStationAgain}
          </button>
        </div>
      )}

      {/*
       * TASK-HANASO-17 §۶ — the REPLAY end panel: the re-walk finished.
       * NON-interactive status + ONE CTA back to the same map section; a quiet
       * note explains that nothing was re-registered. A tertiary text link
       * replays the lesson once more from the top.
       */}
      {replayEnded && (
        <div
          role="status"
          aria-live="polite"
          data-replay-ended
          className="flex flex-col gap-3 rounded-md border-2 border-ink bg-card p-5"
        >
          <p className="flex items-center gap-2 text-body font-bold text-ink">
            <CheckCircle2 aria-hidden className="size-5" />
            {fa.curriculum.replayEndedMessage}
          </p>
          <p className="text-small leading-[var(--leading-fa)] text-ink-soft">{fa.curriculum.replayEndedNote}</p>
          <button
            type="button"
            onClick={goCompletionDestination}
            className="flex h-12 w-fit items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            {completionTarget.label}
            <ArrowLeft aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            onClick={reviewWalkAgain}
            className="flex w-fit items-center gap-1 text-small text-ai underline underline-offset-4"
          >
            <RotateCcw aria-hidden className="size-4" />
            {fa.curriculum.replayAgain}
          </button>
        </div>
      )}
      {completing && !completed && <p className="text-small text-ink-soft">{fa.common.loading}</p>}

      {/*
       * TL-13 (A-3): the honest completion-failure notice. The complete POST
       * failed (offline / server error / criterion rejected) — the walk is NOT
       * lost (local + server anchors keep it), but the learner must know and
       * must have a one-click retry. Never a silent dead button again.
       */}
      {completionFailed && !completed && !completing && (
        <div
          role="alert"
          data-completion-failed
          className="flex flex-col gap-2 rounded-md border border-error bg-card p-4"
        >
          <p className="text-body font-bold text-error">{fa.curriculum.completionFailedTitle}</p>
          <p className="text-small leading-[var(--leading-fa)] text-ink-soft">{fa.curriculum.completionFailedBody}</p>
          <button
            type="button"
            onClick={retryCompletion}
            className="flex h-11 w-fit items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            <RotateCcw aria-hidden className="size-4" />
            {fa.curriculum.completionRetry}
          </button>
        </div>
      )}
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
  /*
   * TASK-LEARNING-08 phase 2 (#117 §2): the drill keeps its character picker
   * (small station sets) but drops the mode tabs/toggles of the old panel —
   * one canvas, free writing with per-stroke feedback, an on-demand demo and
   * the same compact attribution. Practice-layer only (never a gate — DD-106).
   */
  const [activeChar, setActiveChar] = useState(block.characters[0] ?? '');
  const [demo, setDemo] = useState(false);
  const [restartSignal, setRestartSignal] = useState(0);
  const [hintSignal, setHintSignal] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<import('@/modules/writing/engine').WritingAttemptState | null>(null);
  const attemptStartRef = useRef<number | null>(null);
  const attemptRef = useRef<import('@/modules/writing/engine').WritingAttemptState | null>(null);
  attemptRef.current = attempt;
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
            onClick={() => {
              setActiveChar(ch);
              setDemo(false);
              setFeedback(null);
              setRestartSignal((n) => n + 1);
            }}
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
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:justify-center">
        <WritingCanvas
          key={`${activeChar}-${demo}-${restartSignal}`}
          character={activeChar}
          mode={demo ? 'demo' : 'free'}
          restartSignal={restartSignal}
          hintSignal={hintSignal}
          onDemoDone={() => setDemo(false)}
          onJudgement={(j, state) => {
            setAttempt(state);
            setFeedback(j.feedbackFa);
            if ((j.judge === 'rejected' || j.judge === 'uncertain_retry') && state.missesOnStroke >= 2) {
              setHintSignal((n) => n + 1);
            }
          }}
          onAttemptComplete={(state) => {
            const started = attemptStartRef.current ?? Date.now();
            void recordWritingPractice({
              chapterSlug,
              stationSlug,
              blockId: block.id,
              character: activeChar,
              mode: 'free',
              verdict:
                state.totalMisses === 0
                  ? 'correct'
                  : state.assistedCount > 0
                    ? 'correct_with_hints'
                    : 'accepted_with_review',
              strokesTotal: state.history.length,
              strokesFirstTry: state.firstTry,
              totalMistakes: state.totalMisses,
              hintsShown: state.assistedCount,
              completed: true,
              durationMs: Date.now() - started,
            });
            setFeedback(fa.curriculum.kanaStageFreeDone);
          }}
        />
        <div className="w-full max-w-[20rem] space-y-3" dir="rtl">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                attemptStartRef.current = Date.now();
                setDemo((d) => !d);
                setFeedback(null);
              }}
              className="flex min-h-10 items-center gap-1 rounded-md border border-ai px-3 text-caption font-bold text-ai transition-colors hover:bg-indigo-wash"
            >
              <Play aria-hidden className="size-4" />
              {fa.curriculum.kanaStageDemoReplay}
            </button>
            {!demo ? (
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
                  className="min-h-10 rounded-md border border-ink-faint bg-card px-3 text-caption font-bold text-ink transition-colors hover:bg-surface-warm"
                >
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
          ) : (
            <p className="text-small leading-[var(--leading-fa)] text-ink-soft">{fa.curriculum.writingPairNote}</p>
          )}
        </div>
      </div>
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
  hostWordAudioByKanaId,
  exampleAudioByWord,
  isLastBlock,
  exerciseScore,
  exerciseInitialProgress,
  onExerciseProgress,
  onReturnToBlock,
  onExerciseDone,
  onSceneDone,
  kanaCardStage,
  onKanaProgress,
  onKanaWritingDone,
  relatedExamplesByKanaId,
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
  /** Addendum-3 §9: the host word's own audio pair (kanaId → opus+m4a | null). */
  hostWordAudioByKanaId?: Record<string, { opus: string; m4a: string } | null>;
  /** Addendum-4 §7: example word → its own audio pair (word → opus+m4a | null). */
  exampleAudioByWord?: Record<string, { opus: string; m4a: string } | null>;
  /** True on the last authored block (drives the skip-panel CTA label). */
  isLastBlock: boolean;
  /**
   * Issue #102: the block's already-earned exercise score (null = not completed
   * yet — render the live ExerciseSession). Only meaningful for exercise blocks.
   */
  exerciseScore: number | null;
  /** WP-5 (owner feedback E): persisted in-flight position for this block.
   *  TL-13 (A-6): `attemptNo` restores the in-flight attempt number too. */
  exerciseInitialProgress?: { index: number; firstTryCorrect: number; attemptNo?: number };
  /** WP-5: question-transition reporter → the host persists the walk snapshot
   *  (TL-13 A-6: the attempt number rides along). */
  onExerciseProgress?: (progress: { index: number; firstTryCorrect: number; attemptNo?: number }) => void;
  /** Issue #106 (F4): host-owned «بازگشت به آموزش» jump handler. */
  onReturnToBlock?: (blockId: string) => void;
  onExerciseDone: (score: number) => void;
  onSceneDone: () => void;
  /** #117 §10: restored kana-card stage for this block (undefined = fresh). */
  kanaCardStage?: string;
  /** #117 §10: stage persistence reporter. */
  onKanaProgress?: (progress: { stage: string }) => void;
  /** #117 §8: the staged writing experience completed → the walk continues. */
  onKanaWritingDone?: () => void;
  /** TASK-HANASO-CTA-01 §۴: kanaId → its related usage examples (station-wide). */
  relatedExamplesByKanaId?: Record<string, KanaRelatedExample[]>;
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
          key={block.id}
          kana={kana}
          showRomaji={block.showRomaji}
          confusableNoteFa={block.confusableNoteFa}
          audioUrls={kanaAudioByKanaId?.[kana.kanaId] ?? null}
          wordAudioUrls={hostWordAudioByKanaId?.[kana.kanaId] ?? null}
          relatedExamples={relatedExamplesByKanaId?.[kana.kanaId]}
          exampleAudioByWord={exampleAudioByWord}
          initialProgress={kanaCardStage ? ({ stage: kanaCardStage } as KanaCardProgress) : undefined}
          onProgress={onKanaProgress}
          onWritingDone={onKanaWritingDone}
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
          {/* TASK-LEARNING-09 §۸ — the example cards flow into the same
              adaptive grid as the kana card's merged vocabulary section
              (1 → 2 → 3 columns by real width; no reserved empty columns). */}
          <div className="examples-grid">
            {block.examples.map((example) => (
              <article key={example.id} className="rounded-md border border-ink-faint bg-card p-4" data-example-card>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border border-ai px-3 py-1 text-caption text-ai">
                    {roleLabel(example.role)}
                  </span>
                  {example.lineRef && <span className="text-caption text-ink-soft">{fa.curriculum.inDialogue}</span>}
                </div>
                {/* Addendum-5 §6 — the WORD is the hero of the card: big, readable
                  Japanese with the play control right beside it (recognizable,
                  thumb-sized) — the audio is part of the example, not a footer
                  decoration. */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <JaBlock className="text-[clamp(1.75rem,7vw,2.35rem)] font-bold leading-snug text-ink">
                    {example.ja}
                  </JaBlock>
                  {/* Addendum-4 §7 — every example word gets its OWN playable
                    audio (independent asset bound to THIS word; normal ⇄ slow
                    cycle like every other teaching sound). No asset → no
                    button (never dead, never misbound). */}
                  <ExampleAudioButton word={example.ja} urls={exampleAudioByWord?.[example.ja] ?? null} />
                </div>
                {/* Addendum-5 §6 — the Persian reading is BIG and bold, and the
                  meaning sits on its own visually separated line (reading ≠
                  translation — the learner should never conflate them). */}
                <p className="mt-2 border-b border-ink-faint/60 pb-2 text-h3 font-bold text-ink" dir="rtl">
                  {example.reading}
                </p>
                <p className="mt-2 text-body leading-[var(--leading-fa)] text-ink-soft">{example.fa}</p>
                <p className="mt-1 text-small text-ink-soft">
                  <MixedFaJaText text={example.whyFa} />
                </p>
                {/* Addendum-5 §6 — a SHORT pronunciation guide, authored ONLY for
                  words with a real pronunciation point (mouth / lips / tongue /
                  airflow / how it differs from the nearest Persian sound) —
                  never a mechanical template on every card. Persian leads. */}
                {example.pronFa ? (
                  <div
                    className="mt-3 flex items-start gap-2 rounded-md border border-shu/40 bg-surface-warm p-3"
                    data-pron-guide
                  >
                    <Mic aria-hidden className="mt-1 size-4 shrink-0 text-shu-deep" />
                    <div>
                      <p className="text-small font-bold text-ink">{fa.curriculum.examplePronGuideTitle}</p>
                      <p className="mt-1 text-small leading-[var(--leading-fa)] text-ink">
                        <MixedFaJaText text={example.pronFa} />
                      </p>
                    </div>
                  </div>
                ) : null}
                {example.selfExplainFa && (
                  <p className="mt-3 flex items-start gap-2 rounded-md bg-surface-warm p-3 text-small">
                    <MessageCircleQuestion aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-soft" />
                    <MixedFaJaText text={example.selfExplainFa} />
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      );

    case 'rule-prereq': {
      /* TL-14 — prerequisites slide: reactivation/first-look, receptive, free next. */
      return (
        <section className="rounded-md border-2 border-ai/50 bg-card p-5" data-rule-prereq>
          <h3 className="text-h3 font-bold">
            <MixedFaJaText text={block.titleFa} />
          </h3>
          <div className="examples-grid mt-3">
            {block.items.map((item, i) => {
              const glyphKana = item.glyph ? KANA_ITEMS_BY_GLYPH[item.glyph] : undefined;
              const urls = item.word
                ? (exampleAudioByWord?.[item.word] ?? null)
                : glyphKana
                  ? (kanaAudioByKanaId?.[glyphKana.kanaId] ?? null)
                  : null;
              return (
                <article
                  key={i}
                  className="rounded-md border border-ink-faint bg-card p-4"
                  data-prereq-item={item.glyph ?? item.word}
                  data-first-look={item.firstLook ? 'true' : undefined}
                >
                  {item.firstLook && (
                    <span className="rounded-full border border-warning/50 bg-surface-warm px-3 py-1 text-caption text-ink">
                      {fa.curriculum.rulePrereqFirstLook}
                    </span>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <JaBlock className="text-[clamp(2rem,9vw,3rem)] font-bold leading-snug text-ink">
                      {item.glyph ?? item.word}
                    </JaBlock>
                    <ExampleAudioButton word={item.word ?? item.glyph ?? ''} urls={urls} />
                  </div>
                  <p className="mt-2 border-b border-ink-faint/60 pb-2 text-h3 font-bold text-ink" dir="rtl">
                    {item.readingFa}
                  </p>
                  {item.noteFa && (
                    <p className="mt-2 text-small leading-[var(--leading-fa)] text-ink-soft">
                      <MixedFaJaText text={item.noteFa} />
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      );
    }

    case 'rule-contrast':
      /* TL-14 — the live pair slide (audio A→B + beats + optional micro-question). */
      return (
        <RuleContrastBlock
          block={block}
          chapterSlug={chapterSlug}
          stationSlug={stationSlug}
          exampleAudioByWord={exampleAudioByWord}
        />
      );

    case 'rule-step': {
      /* TL-14 — ONE concept per slide (notice/explain) with optional predict ask. */
      const wordUrls = block.word ? (exampleAudioByWord?.[block.word.ja] ?? null) : null;
      return (
        <section
          className="rounded-md border-2 border-indigo/60 bg-card p-5"
          data-rule-step
          data-step-role={block.role}
        >
          <p className="flex items-center gap-2 text-caption text-ink-soft">
            {block.role === 'notice' ? (
              <Eye aria-hidden className="size-4" />
            ) : (
              <BookOpenText aria-hidden className="size-4" />
            )}
            {block.role === 'notice' ? fa.curriculum.ruleStepNoticeLabel : fa.curriculum.ruleStepExplainLabel}
          </p>
          {block.titleFa && (
            <h3 className="mt-2 text-h3 font-bold">
              <MixedFaJaText text={block.titleFa} />
            </h3>
          )}
          {block.word && (
            <div className="mt-3 rounded-md bg-surface-warm p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <HighlightedJa
                    ja={block.word.ja}
                    highlight={block.word.highlight}
                    className="text-[clamp(1.75rem,7vw,2.35rem)] font-bold leading-snug text-ink"
                  />
                  {block.word.beats != null && (
                    <div className="mt-2">
                      <BeatsDots beats={block.word.beats} label={fa.curriculum.ruleBeatsLabel} />
                    </div>
                  )}
                </div>
                <ExampleAudioButton word={block.word.ja} urls={wordUrls} />
              </div>
              <p className="mt-2 border-b border-ink-faint/60 pb-2 text-h3 font-bold text-ink" dir="rtl">
                {block.word.readingFa}
              </p>
              <p className="mt-2 text-body leading-[var(--leading-fa)] text-ink-soft">
                <MixedFaJaText text={block.word.fa} />
              </p>
            </div>
          )}
          <p className="mt-3 text-body leading-[var(--leading-fa)]">
            <MixedFaJaText text={block.bodyFa} />
          </p>
          {block.miniTable && <RuleTableView table={block.miniTable} />}
          {block.ask && (
            <div className="mt-4">
              <MicroAskPanel chapterSlug={chapterSlug} stationSlug={stationSlug} blockId={block.id} ask={block.ask} />
            </div>
          )}
        </section>
      );
    }

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
            key={block.id}
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
/* ---------------- TASK-LEARNING-14 — slide-by-slide rule teaching ---------------- */

/** Mora beat dots — the visual analog of duration (research §۶: S11). */
function BeatsDots({ beats, label }: { beats: number; label: string }) {
  return (
    <p className="flex items-center gap-2" data-beats={beats}>
      <span className="flex items-center gap-1" aria-hidden>
        {Array.from({ length: beats }, (_, i) => (
          <span key={i} className="size-2.5 rounded-full bg-indigo" />
        ))}
      </span>
      <span className="text-caption text-ink-soft">
        {faNum(beats)} {label}
      </span>
    </p>
  );
}

/** Japanese word with the rule-bearing substrings visually emphasized. */
function HighlightedJa({ ja, highlight, className }: { ja: string; highlight: string[]; className?: string }) {
  const parts: { text: string; hl: boolean }[] = [];
  let rest = ja;
  while (rest.length > 0) {
    let best = -1;
    let bestLen = 0;
    for (const h of highlight) {
      const idx = rest.indexOf(h);
      if (idx >= 0 && (best === -1 || idx < best)) {
        best = idx;
        bestLen = h.length;
      }
    }
    if (best === -1) {
      parts.push({ text: rest, hl: false });
      break;
    }
    if (best > 0) parts.push({ text: rest.slice(0, best), hl: false });
    parts.push({ text: rest.slice(best, best + bestLen), hl: true });
    rest = rest.slice(best + bestLen);
  }
  return (
    <JaBlock className={className}>
      {parts.map((p, i) =>
        p.hl ? (
          <span key={i} className="rounded-sm bg-indigo-wash px-0.5 font-bold text-shu" data-rule-highlight>
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </JaBlock>
  );
}

/** Shared structure-table renderer (rule-card + rule-step miniTable). */
function RuleTableView({ table }: { table: { headers: string[]; rows: string[][] } }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-small">
        <thead>
          <tr className="border-b border-ink-faint text-ink-soft">
            {table.headers.map((h) => (
              <th key={h} className="px-3 py-2 text-start font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
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
  );
}

/**
 * TL-14 — play word A then word B back-to-back (the live contrast moment:
 * the learner hears the pair as a pair, not as two isolated clicks).
 * Uses the shared cached Audio elements (no re-download); unmount stops the chain.
 */
function useSequentialWordPlay() {
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef(false);
  // leaving the slide (walk moved on) breaks the A→B chain
  useEffect(() => {
    return () => {
      stopRef.current = true;
    };
  }, []);
  const playBoth = useCallback(
    async (a: { opus: string; m4a: string } | null, b: { opus: string; m4a: string } | null) => {
      if (!a || !b || stopRef.current) return;
      stopRef.current = false;
      setPlaying(true);
      try {
        const elA = getCachedAudio(a.opus);
        if (elA) {
          elA.currentTime = 0;
          await elA.play().catch(() => undefined);
          await new Promise<void>((resolve) => {
            elA.onended = () => resolve();
            setTimeout(resolve, 4000);
          });
        }
        if (stopRef.current) return;
        await new Promise((r) => setTimeout(r, 550));
        if (stopRef.current) return;
        const elB = getCachedAudio(b.opus);
        if (elB) {
          elB.currentTime = 0;
          await elB.play().catch(() => undefined);
          await new Promise<void>((resolve) => {
            elB.onended = () => resolve();
            setTimeout(resolve, 4000);
          });
        }
      } finally {
        if (!stopRef.current) setPlaying(false);
      }
    },
    [],
  );
  return { playing, playBoth };
}

/** One side of a rule-contrast slide. */
function ContrastPanel({
  word,
  urls,
}: {
  word: { ja: string; readingFa: string; fa: string; highlight: string[]; beats: number };
  urls: { opus: string; m4a: string } | null;
}) {
  return (
    <article
      className="flex flex-col gap-2 rounded-md border border-ink-faint bg-card p-4"
      data-contrast-word={word.ja}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <HighlightedJa
          ja={word.ja}
          highlight={word.highlight}
          className="text-[clamp(1.75rem,7vw,2.35rem)] font-bold leading-snug text-ink"
        />
        <ExampleAudioButton word={word.ja} urls={urls} />
      </div>
      <BeatsDots beats={word.beats} label={fa.curriculum.ruleBeatsLabel} />
      <p className="border-b border-ink-faint/60 pb-2 text-h3 font-bold text-ink" dir="rtl">
        {word.readingFa}
      </p>
      <p className="text-body leading-[var(--leading-fa)] text-ink-soft">
        <MixedFaJaText text={word.fa} />
      </p>
    </article>
  );
}

/**
 * TL-14 — the unscored micro-question (predict / notice-check) on a rule slide.
 * Same round-trip as DiscoveryBlock (grade-block, SKL-013); the reveal teaches
 * in BOTH outcomes (pretesting — a wrong guess still primes learning).
 */
function MicroAskPanel({
  chapterSlug,
  stationSlug,
  blockId,
  ask,
}: {
  chapterSlug: string;
  stationSlug: string;
  blockId: string;
  ask: { questionFa: string; options: { id: string; label: string }[] };
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
      blockId,
      answer: { kind: 'option', optionId },
    });
    setOutcome(result ?? { correct: false, feedbackFa: fa.curriculum.gradingUnavailable });
    setBusy(false);
  };

  return (
    <div className="rounded-md border border-ai/40 bg-surface-warm/60 p-4" data-micro-ask>
      <p className="flex items-start gap-2 text-body font-bold">
        <MessageCircleQuestion aria-hidden className="mt-1 size-4 shrink-0 text-ai" />
        <MixedFaJaText text={ask.questionFa} />
      </p>
      <div role="radiogroup" className="mt-3 flex flex-col gap-2">
        {ask.options.map((opt) => (
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
        <div role="status" aria-live="polite" className="mt-3 rounded-md bg-card p-3 text-body">
          <p className={outcome.correct ? 'font-bold text-success' : 'font-bold text-ink'}>
            {outcome.correct ? fa.curriculum.ruleAskGuessedCorrect : fa.curriculum.ruleAskGuessedWrong}
          </p>
          {outcome.feedbackFa && (
            <p className="mt-1 leading-[var(--leading-fa)]">
              <MixedFaJaText text={outcome.feedbackFa} />
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** TL-14 — the contrast slide block renderer. */
function RuleContrastBlock({
  block,
  chapterSlug,
  stationSlug,
  exampleAudioByWord,
}: {
  block: Extract<ClientTeachingBlock, { kind: 'rule-contrast' }>;
  chapterSlug: string;
  stationSlug: string;
  exampleAudioByWord?: Record<string, { opus: string; m4a: string } | null>;
}) {
  const urlsA = exampleAudioByWord?.[block.a.ja] ?? null;
  const urlsB = exampleAudioByWord?.[block.b.ja] ?? null;
  const { playing, playBoth } = useSequentialWordPlay();
  return (
    <section className="flex flex-col gap-4" data-rule-contrast>
      {block.titleFa && <h3 className="text-h3 font-bold">{block.titleFa}</h3>}
      <div className="grid gap-3 sm:grid-cols-2">
        <ContrastPanel word={block.a} urls={urlsA} />
        <ContrastPanel word={block.b} urls={urlsB} />
      </div>
      {urlsA && urlsB && (
        <button
          type="button"
          onClick={() => void playBoth(urlsA, urlsB)}
          disabled={playing}
          className="flex h-11 w-fit items-center gap-2 rounded-md border-2 border-ai bg-card px-5 text-body font-bold text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai disabled:opacity-60"
          data-play-both
        >
          <Play aria-hidden className="size-4" />
          {playing ? fa.curriculum.ruleContrastPlaying : fa.curriculum.ruleContrastPlayBoth}
        </button>
      )}
      {block.ask && (
        <MicroAskPanel chapterSlug={chapterSlug} stationSlug={stationSlug} blockId={block.id} ask={block.ask} />
      )}
    </section>
  );
}

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
                  className="h-11 w-fit rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep disabled:opacity-45"
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
          className="flex h-11 w-fit items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
        >
          {/* TL-10 §6/§7: a plain forward action — never a status text posed as
             a button, and a normal action is never red. */}
          {fa.curriculum.continueBlock}
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
