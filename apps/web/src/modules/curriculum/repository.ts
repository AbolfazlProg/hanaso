/**
 * HANASO — Curriculum progress repositories (TASK-LEARNING-01).
 *
 * Async contracts behind the store switch (lib/poc/stores.ts pattern):
 * in-memory DEV-ONLY without DATABASE_URL; `app.station_progress` +
 * `app.chapter_progress` behind the SAME interface with it (db/repositories).
 *
 * TASK-HANASO-17 (§۸): StationState carries `lastActivityAt` — the resume-TTL
 * clock. MERGE SEMANTICS (both twins identical, Pg included): when the caller
 * does NOT pass lastActivityAt (a plain re-enter of an existing row) the
 * stored value is PRESERVED; when it passes one (meaningful activity) the
 * clock moves. First write of a row always stamps now() — the first entry IS
 * meaningful activity.
 */
import type { ChapterState, StationState } from './types';

export interface StationProgressRepository {
  get(userId: string, stationSlug: string): Promise<StationState | null>;
  upsert(userId: string, stationSlug: string, state: StationState): Promise<StationState>;
  listForUnit(userId: string, stationSlugs: string[]): Promise<StationState[]>;
  incrementAttempts(userId: string, stationSlug: string): Promise<number>;
}

export interface ChapterProgressRepository {
  get(userId: string, chapterSlug: string): Promise<ChapterState | null>;
  upsert(userId: string, chapterSlug: string, state: ChapterState, masteryAttemptId?: string): Promise<ChapterState>;
}

/** Normalize a maybe-ISO string to ISO (defensive; null passes through). */
function isoOrNull(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

/** DEV-ONLY in-memory fallback (no DATABASE_URL) — same contract as the Pg impls. */
export class InMemoryStationProgressRepository implements StationProgressRepository {
  private readonly rows = new Map<string, StationState>();

  private key(userId: string, slug: string): string {
    return `${userId}::${slug}`;
  }

  async get(userId: string, stationSlug: string): Promise<StationState | null> {
    const row = this.rows.get(this.key(userId, stationSlug));
    return row ? { ...row } : null;
  }

  async upsert(userId: string, stationSlug: string, state: StationState): Promise<StationState> {
    const key = this.key(userId, stationSlug);
    const existing = this.rows.get(key);
    /* HANASO-17 §۸ merge semantics (identical to the Pg twin):
     *   currentBlock: string → set · null → CLEAR · undefined → preserve.
     *   lastActivityAt: given → move the clock · undefined → preserve
     *   (a plain re-enter never extends the resume deadline). First write of a
     *   row stamps now() — the first entry IS meaningful activity. */
    const merged: StationState = {
      ...state,
      currentBlock: state.currentBlock !== undefined ? (state.currentBlock ?? undefined) : existing?.currentBlock,
      lastActivityAt: isoOrNull(state.lastActivityAt ?? existing?.lastActivityAt) ?? new Date().toISOString(),
    };
    this.rows.set(key, merged);
    return { ...merged };
  }

  async listForUnit(userId: string, stationSlugs: string[]): Promise<StationState[]> {
    return stationSlugs.flatMap((slug) => {
      const st = this.rows.get(this.key(userId, slug));
      return st ? [{ ...st }] : [];
    });
  }

  async incrementAttempts(userId: string, stationSlug: string): Promise<number> {
    const key = this.key(userId, stationSlug);
    const current = this.rows.get(key) ?? {
      stationSlug,
      status: 'in_progress' as const,
      bestScore: null,
      attemptCount: 0,
    };
    // graded answers ARE meaningful activity (HANASO-17 §۸) — the clock moves.
    const next: StationState = {
      ...current,
      attemptCount: current.attemptCount + 1,
      lastActivityAt: new Date().toISOString(),
    };
    this.rows.set(key, next);
    return next.attemptCount;
  }
}

export class InMemoryChapterProgressRepository implements ChapterProgressRepository {
  private readonly rows = new Map<string, ChapterState>();

  private key(userId: string, slug: string): string {
    return `${userId}::${slug}`;
  }

  async get(userId: string, chapterSlug: string): Promise<ChapterState | null> {
    const row = this.rows.get(this.key(userId, chapterSlug));
    return row ? { ...row } : null;
  }

  async upsert(
    userId: string,
    chapterSlug: string,
    state: ChapterState,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _masteryAttemptId?: string,
  ): Promise<ChapterState> {
    this.rows.set(this.key(userId, chapterSlug), { ...state });
    return { ...state };
  }
}
