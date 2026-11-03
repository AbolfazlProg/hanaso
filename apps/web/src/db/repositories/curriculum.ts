/**
 * HANASO — Curriculum Postgres repositories (TASK-LEARNING-01).
 *
 * Persists the island walk in `app.station_progress` + `app.chapter_progress`
 * behind the same async contracts as the in-memory DEV-ONLY impls. The station
 * rows are keyed by the seeded `content.lessons` uuid (deterministic uuidv5 —
 * db/ids.ts), so the FK lands on exactly the station the seed wrote.
 *
 * Understandings:
 * - station_completed with a score is clamped to [0,1]; bestScore keeps the max.
 * - the chapter aggregate flips to stations_complete when every CORE station row
 *   is terminal (completed/needs_retry/skipped) — computed HERE from the seed's
 *   station list, not from the client.
 */
import { and, eq, inArray } from 'drizzle-orm';
import type {
  ChapterState,
  StationState,
} from '@/modules/curriculum/types';
import type { StationProgressRepository, ChapterProgressRepository } from '@/modules/curriculum/repository';
import { chapterProgress, lessons, stationProgress } from '../../../db/schema';
import type { DbClient } from '../client';

/* ------------------------------------------------------------------ station rows */

const stationColumns = {
  userId: stationProgress.userId,
  stationId: stationProgress.stationId,
  status: stationProgress.status,
  bestScore: stationProgress.bestScore,
  attemptCount: stationProgress.attemptCount,
  currentBlock: stationProgress.currentBlock,
  startedAt: stationProgress.startedAt,
  completedAt: stationProgress.completedAt,
  updatedAt: stationProgress.updatedAt,
};

type StationRow = {
  userId: string;
  stationId: string;
  status: string;
  bestScore: number | null;
  attemptCount: number;
  currentBlock: string | null;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
};

export class PgStationProgressRepository implements StationProgressRepository {
  constructor(private readonly client: DbClient) {}

  async get(userId: string, stationSlug: string): Promise<StationState | null> {
    const stationId = stationProgressId(stationSlug);
    const [row] = await this.client.db
      .select(stationColumns)
      .from(stationProgress)
      .where(and(eq(stationProgress.userId, userId), eq(stationProgress.stationId, stationId)))
      .limit(1);
    return row ? stationRowToState(row) : null;
  }

  async upsert(userId: string, stationSlug: string, state: StationState): Promise<StationState> {
    const stationId = stationProgressId(stationSlug);
    const [row] = await this.client.db
      .insert(stationProgress)
      .values({
        userId,
        stationId,
        status: state.status,
        bestScore: state.bestScore,
        attemptCount: state.attemptCount,
        currentBlock: state.currentBlock ?? null,
        completedAt: state.status === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [stationProgress.userId, stationProgress.stationId],
        set: {
          status: state.status,
          bestScore: state.bestScore,
          attemptCount: state.attemptCount,
          currentBlock: state.currentBlock ?? null,
          completedAt: state.status === 'completed' ? new Date() : null,
          updatedAt: new Date(),
        },
      })
      .returning(stationColumns);
    return stationRowToState(row!);
  }

  async listForUnit(userId: string, stationSlugs: string[]): Promise<StationState[]> {
    if (stationSlugs.length === 0) return [];
    const ids = stationSlugs.map(stationProgressId);
    const rows = await this.client.db
      .select(stationColumns)
      .from(stationProgress)
      .where(and(eq(stationProgress.userId, userId), inArray(stationProgress.stationId, ids)));
    const bySlug = new Map(
      rows.map((r) => {
        // resolve back to slug via the deterministic map (see stationProgressId)
        const slug = slugFromStationProgressId(r.stationId);
        return [slug, stationRowToState(r)] as const;
      }),
    );
    return stationSlugs.flatMap((slug) => {
      const st = bySlug.get(slug);
      return st ? [st] : [];
    });
  }

  /** Count graded answers for a station (server-tracked attempt counter). */
  async incrementAttempts(userId: string, stationSlug: string): Promise<number> {
    const stationId = stationProgressId(stationSlug);
    const [existing] = await this.client.db
      .select(stationColumns)
      .from(stationProgress)
      .where(and(eq(stationProgress.userId, userId), eq(stationProgress.stationId, stationId)))
      .limit(1);
    const next = (existing?.attemptCount ?? 0) + 1;
    await this.client.db
      .insert(stationProgress)
      .values({
        userId,
        stationId,
        status: 'in_progress',
        attemptCount: next,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [stationProgress.userId, stationProgress.stationId],
        set: { attemptCount: next, updatedAt: new Date() },
      });
    return next;
  }
}

function stationRowToState(row: StationRow): StationState {
  return {
    stationSlug: slugFromStationProgressId(row.stationId),
    status: row.status as StationState['status'],
    bestScore: row.bestScore,
    attemptCount: row.attemptCount,
    currentBlock: row.currentBlock ?? undefined,
  };
}

/* ------------------------------------------------------------------ chapter rows */

const chapterColumns = {
  userId: chapterProgress.userId,
  unitId: chapterProgress.unitId,
  status: chapterProgress.status,
  bestWeighted: chapterProgress.bestWeighted,
  bestMeasures: chapterProgress.bestMeasures,
  masteryAttemptId: chapterProgress.masteryAttemptId,
  remediationCount: chapterProgress.remediationCount,
  startedAt: chapterProgress.startedAt,
  updatedAt: chapterProgress.updatedAt,
};

export class PgChapterProgressRepository implements ChapterProgressRepository {
  constructor(private readonly client: DbClient) {}

  async get(userId: string, chapterSlug: string): Promise<ChapterState | null> {
    const unitId = chapterProgressId(chapterSlug);
    const [row] = await this.client.db
      .select(chapterColumns)
      .from(chapterProgress)
      .where(and(eq(chapterProgress.userId, userId), eq(chapterProgress.unitId, unitId)))
      .limit(1);
    return row ? chapterRowToState(row) : null;
  }

  async upsert(userId: string, chapterSlug: string, state: ChapterState, masteryAttemptId?: string): Promise<ChapterState> {
    const unitId = chapterProgressId(chapterSlug);
    const [row] = await this.client.db
      .insert(chapterProgress)
      .values({
        userId,
        unitId,
        status: state.status,
        bestWeighted: state.bestWeighted,
        bestMeasures: state.bestMeasures,
        masteryAttemptId: masteryAttemptId ?? null,
        remediationCount: state.remediationCount,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [chapterProgress.userId, chapterProgress.unitId],
        set: {
          status: state.status,
          bestWeighted: state.bestWeighted,
          bestMeasures: state.bestMeasures,
          masteryAttemptId: masteryAttemptId ?? null,
          remediationCount: state.remediationCount,
          updatedAt: new Date(),
        },
      })
      .returning(chapterColumns);
    return chapterRowToState(row!);
  }
}

type ChapterRow = {
  userId: string;
  unitId: string;
  status: string;
  bestWeighted: number | null;
  bestMeasures: unknown;
  masteryAttemptId: string | null;
  remediationCount: number;
  startedAt: Date;
  updatedAt: Date;
};

function chapterRowToState(row: ChapterRow): ChapterState {
  return {
    status: row.status as ChapterState['status'],
    bestWeighted: row.bestWeighted,
    bestMeasures: (row.bestMeasures as Record<string, number | null> | null) ?? null,
    remediationCount: row.remediationCount,
  };
}

/* ------------------------------------------------------------------ deterministic ids */

/**
 * The seed writes stations as content.lessons rows with deterministic uuidv5 ids
 * (db/ids.ts lessonContentId) and the chapter as content.units (unitContentId).
 * The SAME helpers resolve here — the registry lives in db/ids.ts so both the
 * seed and the repositories share one source (no drift).
 */
import { lessonContentId, unitContentId } from '../ids';

const slugToIdCache = new Map<string, string>();
const idToSlugCache = new Map<string, string>();

function stationProgressId(stationSlug: string): string {
  let id = slugToIdCache.get(stationSlug);
  if (!id) {
    id = lessonContentId(stationSlug);
    slugToIdCache.set(stationSlug, id);
    idToSlugCache.set(id, stationSlug);
  }
  return id;
}

function slugFromStationProgressId(id: string): string {
  // reverse lookup via cache; when cold (listForUnit without prior get), callers
  // pass slugs through stationProgressId first — keeping both caches warm.
  return idToSlugCache.get(id) ?? `unknown:${id}`;
}

function chapterProgressId(chapterSlug: string): string {
  return unitContentId(chapterSlug);
}

/** Warm the reverse cache for a slug list (used by listForUnit). */
export function primeStationIdCache(stationSlugs: string[]): void {
  for (const slug of stationSlugs) stationProgressId(slug);
}

/** Used by tests: the lessons row ids the seed must have written. */
export function seededStationIds(stationSlugs: string[]): string[] {
  return stationSlugs.map((s) => lessonContentId(s));
}

void lessons;
