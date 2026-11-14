/**
 * HANASO — Station/chapter progress machines (TASK-LEARNING-01) — PURE module.
 *
 * State models per island architecture §۹:
 * - station: (derived locked/available) → in_progress → completed | needs_retry
 *   (+ skipped via Test-Out ≡ completed for prereqs — O5-2). Retry after 2 failed
 *   completion attempts passes soft with a recorded weakness (no dead-ends).
 * - chapter: started → stations_complete → mastery_attempted → understood | remediate.
 *   `understood` ONLY from a passed gate attempt (DD-048) — never from walking.
 */
import type { ChapterState, Station, StationState } from './types';

export type StationEvent =
  | { type: 'station_entered'; stationSlug: string }
  | { type: 'station_completed'; stationSlug: string; score: number | null }
  | { type: 'station_retry_failed'; stationSlug: string; score: number };

export const MAX_SOFT_RETRIES = 2;

/**
 * Fold one station event into the stored state (immutable). Returns the new state
 * or null when the event is a no-op (e.g. completing an already-completed station).
 * Per-answer counters (attemptCount/bestScore) are maintained by the repository —
 * the machine only governs STATUS transitions.
 */
export function applyStationEvent(state: StationState | undefined, event: StationEvent): StationState | null {
  const base: StationState = state ?? {
    stationSlug: event.stationSlug,
    status: 'in_progress',
    bestScore: null,
    attemptCount: 0,
  };
  switch (event.type) {
    case 'station_entered':
      if (base.status === 'completed' || base.status === 'skipped') return null; // re-visit: keep state
      return { ...base, status: 'in_progress' };
    case 'station_completed': {
      const best = Math.max(base.bestScore ?? 0, event.score ?? 0);
      return { ...base, status: 'completed', bestScore: best, currentBlock: undefined };
    }
    case 'station_retry_failed': {
      if (base.status === 'needs_retry') return null;
      return { ...base, status: 'needs_retry', bestScore: event.score };
    }
  }
}

/** Completion of the station walk that satisfies prerequisites. */
export function stationSatisfiesPrereq(state: StationState | undefined): boolean {
  return (
    state !== undefined &&
    (state.status === 'completed' || state.status === 'skipped' || state.status === 'needs_retry')
  );
}

export type ChapterEvent =
  | { type: 'chapter_started' }
  | { type: 'stations_completed' }
  | {
      type: 'gate_attempted';
      passed: boolean;
      weighted: number | null;
      measures: Record<string, number | null>;
      attemptId?: string;
    }
  | { type: 'remediation_loop' };

const CHAPTER_FLOW: Record<ChapterState['status'], ChapterState['status'][]> = {
  started: ['stations_complete', 'mastery_attempted', 'understood', 'remediate'],
  stations_complete: ['mastery_attempted'],
  mastery_attempted: ['understood', 'remediate'],
  remediate: ['mastery_attempted', 'understood'],
  understood: [], // terminal — only a NEW chapter version reopens it (content revision)
};

/**
 * Fold one chapter event (immutable). The understood transition is only valid from
 * a passed gate attempt (the route verifies the attempt exists + passed before
 * emitting it — same server-side gate the PoC /api/progress enforces).
 */
export function applyChapterEvent(
  state: ChapterState | undefined,
  event: ChapterEvent,
  maxLoops = 3,
): ChapterState | null {
  const base: ChapterState = state ?? {
    status: 'started',
    bestWeighted: null,
    bestMeasures: null,
    remediationCount: 0,
  };
  switch (event.type) {
    case 'chapter_started':
      return base.status === 'started' ? null : base; // idempotent entry
    case 'stations_completed': {
      if (base.status !== 'started') return null;
      return { ...base, status: 'stations_complete' };
    }
    case 'gate_attempted': {
      const best = Math.max(base.bestWeighted ?? 0, event.weighted ?? 0);
      const measures = mergeMeasures(base.bestMeasures, event.measures);
      if (event.passed) {
        return {
          ...base,
          status: 'understood',
          bestWeighted: best,
          bestMeasures: measures,
          remediationCount: 0,
        };
      }
      const loops = base.remediationCount + 1;
      return {
        ...base,
        status: loops >= maxLoops ? 'remediate' : base.status === 'started' ? 'mastery_attempted' : base.status,
        bestWeighted: best,
        bestMeasures: measures,
        remediationCount: loops,
      };
    }
    case 'remediation_loop':
      return { ...base, remediationCount: Math.min(base.remediationCount + 1, maxLoops) };
  }
  void CHAPTER_FLOW;
}

function mergeMeasures(
  old: Record<string, number | null> | null,
  incoming: Record<string, number | null>,
): Record<string, number | null> {
  const merged: Record<string, number | null> = { ...(old ?? {}) };
  for (const [k, v] of Object.entries(incoming)) {
    merged[k] = Math.max(merged[k] ?? 0, v ?? 0);
  }
  return merged;
}

/** Soft completion: needs_retry counts as walked (no dead-ends — island §۹). */
export function stationWalkDone(state: StationState | undefined): boolean {
  return state !== undefined && state.status !== 'in_progress';
}

/** All core stations of the chapter walked (any terminal state)? */
export function allCoreWalked(stations: Station[], states: Map<string, StationState>): boolean {
  return stations.filter((s) => s.core).every((s) => stationWalkDone(states.get(s.slug)));
}
