/**
 * HANASO — Curriculum progress repositories (TASK-LEARNING-01).
 *
 * Async contracts behind the store switch (lib/poc/stores.ts pattern):
 * in-memory DEV-ONLY without DATABASE_URL; `app.station_progress` +
 * `app.chapter_progress` behind the SAME interface with it (db/repositories).
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

/** DEV-ONLY in-memory fallback (no DATABASE_URL) — same contract as the Pg impls. */
export class InMemoryStationProgressRepository implements StationProgressRepository {
  private readonly rows = new Map<string, StationState>();

  private key(userId: string, slug: string): string {
    return `${userId}::${slug}`;
  }

  async get(userId: string, stationSlug: string): Promise<StationState | null> {
    return this.rows.get(this.key(userId, stationSlug)) ?? null;
  }

  async upsert(userId: string, stationSlug: string, state: StationState): Promise<StationState> {
    this.rows.set(this.key(userId, stationSlug), { ...state });
    return { ...state };
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
    const next = { ...current, attemptCount: current.attemptCount + 1 };
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
    return this.rows.get(this.key(userId, chapterSlug)) ?? null;
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
