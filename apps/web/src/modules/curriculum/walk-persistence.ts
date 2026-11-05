/**
 * HANASO — Station walk persistence (TASK-LEARNING-08 / WP-5 — owner feedback E).
 *
 * Granular, per-station walk snapshots written on EVERY meaningful transition
 * (unit start, block step change, exercise advance, block result, completion)
 * — never only at station end, and never relying on beforeunload alone.
 *
 * Storage: localStorage keyed per (learnerId, chapter, station) — survives
 * refresh / back / close-and-return / exit-button (mission §8 scenarios 1–6).
 * The data crosses no network boundary; the SERVER-side resume anchor
 * (StationState.currentBlock via the station API) covers the same-browser-
 * cleared-storage case.
 *
 * Pure functions + a tiny JSON codec — unit-testable without a renderer.
 */
import { getOrCreateLearnerId } from '@/lib/learner/identity';
import type { BlockResults } from './station-walk';

/** Snapshot version (bump on shape change; old keys are simply ignored). */
export const WALK_SNAPSHOT_VERSION = 1;

/** Per exercise-block in-flight progress (the question the learner is on). */
export interface ExerciseBlockProgress {
  /** Question index inside the exercise set (0-based). */
  index: number;
  /** First-try-correct count earned so far in this block session. */
  firstTryCorrect: number;
}

export interface StationWalkSnapshot {
  v: typeof WALK_SNAPSHOT_VERSION;
  chapterSlug: string;
  stationSlug: string;
  /** Block step index (0-based) at save time. */
  stepIndex: number;
  /** Earned exercise results per block id (Issue #102 — they survive back/forward). */
  blockResults: BlockResults;
  /** In-flight exercise progress per exercise block id. */
  exerciseProgress: Record<string, ExerciseBlockProgress>;
  /** Last fired session score (null until an exercise set finishes). */
  sessionScore?: number | null;
  /** Epoch ms of the last meaningful transition. */
  updatedAt: number;
  /** True once the station finished — stale snapshots are then ignored. */
  completed?: boolean;
}

const PREFIX = 'hanaso.walk.v1';

function storageKey(learnerId: string, chapterSlug: string, stationSlug: string): string {
  return `${PREFIX}.${learnerId}.${chapterSlug}.${stationSlug}`;
}

/** Serialize + persist one snapshot (best-effort; storage failures are swallowed). */
export function saveWalkSnapshot(
  snapshot: Omit<StationWalkSnapshot, 'v' | 'updatedAt'> & { updatedAt?: number },
): void {
  if (typeof window === 'undefined') return;
  const learnerId = getOrCreateLearnerId();
  if (!learnerId) return;
  const full: StationWalkSnapshot = {
    ...snapshot,
    v: WALK_SNAPSHOT_VERSION,
    updatedAt: snapshot.updatedAt ?? Date.now(),
  };
  try {
    window.localStorage.setItem(
      storageKey(learnerId, snapshot.chapterSlug, snapshot.stationSlug),
      JSON.stringify(full),
    );
  } catch {
    /* quota/private mode — the walk still works, resume just won't persist */
  }
}

/**
 * Load the saved snapshot for one station. Returns null when absent, completed,
 * corrupt, or shape-mismatched (honest: no resume rather than a wrong position).
 */
export function loadWalkSnapshot(chapterSlug: string, stationSlug: string): StationWalkSnapshot | null {
  if (typeof window === 'undefined') return null;
  const learnerId = getOrCreateLearnerId();
  if (!learnerId) return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(storageKey(learnerId, chapterSlug, stationSlug));
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StationWalkSnapshot;
    if (
      parsed.v !== WALK_SNAPSHOT_VERSION ||
      parsed.chapterSlug !== chapterSlug ||
      parsed.stationSlug !== stationSlug ||
      typeof parsed.stepIndex !== 'number' ||
      parsed.stepIndex < 0 ||
      parsed.completed
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Drop the snapshot (after station completion — no stale resume data). */
export function clearWalkSnapshot(chapterSlug: string, stationSlug: string): void {
  if (typeof window === 'undefined') return;
  const learnerId = getOrCreateLearnerId();
  if (!learnerId) return;
  try {
    window.localStorage.removeItem(storageKey(learnerId, chapterSlug, stationSlug));
  } catch {
    /* ignore */
  }
}

/**
 * Guard for restore: a snapshot pointing past the block list (content changed
 * between visits) restores to the LAST valid block instead of overflowing.
 */
export function clampStepIndex(stepIndex: number, blockCount: number): number {
  if (blockCount <= 0) return 0;
  return Math.min(Math.max(0, stepIndex), blockCount - 1);
}
