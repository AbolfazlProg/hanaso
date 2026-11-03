/**
 * HANASO — server-side store singletons with DATABASE_URL switching (TASK-M0-10 / Issue #11).
 *
 * - No DATABASE_URL → the DEV-ONLY in-memory repositories (local dev, CI smoke without
 *   a DB) — exactly the pre-M0-10 behavior.
 * - DATABASE_URL set → the Postgres repositories behind the SAME interfaces (routes
 *   never change shape; only `await` was added in M0-10).
 *
 * The analytics event store stays in-memory for the PoC (ADR-016 pipeline = M6 scope;
 * documented in PROJECT_STATUS — not silently persisted).
 */
import { InMemoryAttemptRepository, PgAttemptRepository, type AttemptRepository } from '@/modules/mastery/server';
import { InMemoryProgressRepository, PgProgressRepository, type ProgressRepository } from '@/modules/progress/server';
import {
  InMemoryChapterProgressRepository,
  InMemoryStationProgressRepository,
  type ChapterProgressRepository,
  type StationProgressRepository,
} from '@/modules/curriculum/repository';
import { PgChapterProgressRepository, PgStationProgressRepository } from '@/db/repositories/curriculum';
import type { PocEvent } from './event-store';
import { InMemoryEventStore } from './event-store';
import { databaseConfigured, getDbClient } from '@/db/client';

let attemptStore: AttemptRepository | null = null;
let eventStore: InMemoryEventStore | null = null;
let progressStore: ProgressRepository | null = null;
let stationProgressStore: StationProgressRepository | null = null;
let chapterProgressStore: ChapterProgressRepository | null = null;

/** True when the Postgres-backed repositories are active. */
export function usingPostgresStores(): boolean {
  return databaseConfigured();
}

export function getAttemptStore(): AttemptRepository {
  attemptStore ??= usingPostgresStores() ? new PgAttemptRepository(getDbClient()) : new InMemoryAttemptRepository();
  return attemptStore;
}

export function getEventStore(): InMemoryEventStore {
  eventStore ??= new InMemoryEventStore();
  return eventStore;
}

export function getProgressStore(): ProgressRepository {
  progressStore ??= usingPostgresStores() ? new PgProgressRepository(getDbClient()) : new InMemoryProgressRepository();
  return progressStore;
}

/** Island walk progress (TASK-LEARNING-01) — station states. */
export function getStationProgressStore(): StationProgressRepository {
  stationProgressStore ??= usingPostgresStores()
    ? new PgStationProgressRepository(getDbClient())
    : new InMemoryStationProgressRepository();
  return stationProgressStore;
}

/** Island walk progress (TASK-LEARNING-01) — chapter A→D aggregate. */
export function getChapterProgressStore(): ChapterProgressRepository {
  chapterProgressStore ??= usingPostgresStores()
    ? new PgChapterProgressRepository(getDbClient())
    : new InMemoryChapterProgressRepository();
  return chapterProgressStore;
}

/** TEST-ONLY: drop cached singletons (switch env between unit/integration runs). */
export function resetStoresForTests(): void {
  attemptStore = null;
  progressStore = null;
  eventStore = null;
  stationProgressStore = null;
  chapterProgressStore = null;
}

export type { PocEvent };
