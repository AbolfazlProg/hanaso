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
import {
  InMemoryLearningObjectRepository,
  InMemoryPracticeSessionRepository,
  type LearningObjectRepository,
  type PracticeSessionRepository,
} from '@/modules/practice/repository';
import { PgLearningObjectRepository, PgPracticeSessionRepository } from '@/db/repositories/practice';
import type { PocEvent } from './event-store';
import { InMemoryEventStore } from './event-store';
import { assertProductionDatabase, databaseConfigured, getDbClient } from '@/db/client';
import { createFsrsReviewStore, InMemoryFsrsReviewStore, type FsrsReviewStore } from '@/modules/fsrs/review-store';
import {
  createLearningEventsStore,
  InMemoryLearningEventsStore,
  type LearningEventsStore,
} from '@/modules/analytics/store';

/*
 * TASK-LEARNING-08 (WP-5): the singletons live on globalThis — Next dev
 * (turbopack) can instantiate this module SEPARATELY for RSC pages and route
 * handlers, and HMR re-evaluates modules on edits; a module-level `let` gave
 * each instance its own store (a mid-walk `enter` from the runner was invisible
 * to the station page's resume read — reproduced while fixing owner feedback E).
 * One process = one store set (the Prisma-client pattern). Postgres mode is
 * unaffected beyond pooling (both instances already targeted the same DB).
 */
const storeCache = globalThis as typeof globalThis & {
  __hanasoStores?: {
    attemptStore: AttemptRepository | null;
    eventStore: InMemoryEventStore | null;
    progressStore: ProgressRepository | null;
    stationProgressStore: StationProgressRepository | null;
    chapterProgressStore: ChapterProgressRepository | null;
    practiceSessionStore: PracticeSessionRepository | null;
    learningObjectStore: LearningObjectRepository | null;
    fsrsReviewStore: FsrsReviewStore | null;
    learningEventsStore: LearningEventsStore | null;
  };
};
storeCache.__hanasoStores ??= {
  attemptStore: null,
  eventStore: null,
  progressStore: null,
  stationProgressStore: null,
  chapterProgressStore: null,
  practiceSessionStore: null,
  learningObjectStore: null,
  fsrsReviewStore: null,
  learningEventsStore: null,
};
const singletons = storeCache.__hanasoStores;

/** True when the Postgres-backed repositories are active. */
export function usingPostgresStores(): boolean {
  return databaseConfigured();
}

/**
 * TASK-HANASO-29 (Subagent B M2): the in-memory DEV-ONLY fallback is FORBIDDEN
 * in production — a silent fallback loses every learner's progress on restart
 * while health checks stay green. Every repository getter funnels through this
 * guard: production without DATABASE_URL throws at the FIRST store access
 * (same fail-closed contract as HANASO_SESSION_SECRET). Dev (NODE_ENV=
 * 'development'/'test') keeps the honest in-memory behavior.
 */
function assertStoreBackend(): void {
  if (!usingPostgresStores()) assertProductionDatabase();
}

export function getAttemptStore(): AttemptRepository {
  assertStoreBackend();
  singletons.attemptStore ??= usingPostgresStores()
    ? new PgAttemptRepository(getDbClient())
    : new InMemoryAttemptRepository();
  return singletons.attemptStore;
}

export function getEventStore(): InMemoryEventStore {
  singletons.eventStore ??= new InMemoryEventStore();
  return singletons.eventStore;
}

export function getProgressStore(): ProgressRepository {
  assertStoreBackend();
  singletons.progressStore ??= usingPostgresStores()
    ? new PgProgressRepository(getDbClient())
    : new InMemoryProgressRepository();
  return singletons.progressStore;
}

/** Island walk progress (TASK-LEARNING-01) — station states. */
export function getStationProgressStore(): StationProgressRepository {
  assertStoreBackend();
  singletons.stationProgressStore ??= usingPostgresStores()
    ? new PgStationProgressRepository(getDbClient())
    : new InMemoryStationProgressRepository();
  return singletons.stationProgressStore;
}

/** Island walk progress (TASK-LEARNING-01) — chapter A→D aggregate. */
export function getChapterProgressStore(): ChapterProgressRepository {
  assertStoreBackend();
  singletons.chapterProgressStore ??= usingPostgresStores()
    ? new PgChapterProgressRepository(getDbClient())
    : new InMemoryChapterProgressRepository();
  return singletons.chapterProgressStore;
}

/** Independent-practice sessions (TASK-HANASO-22) — append-only evidence log. */
export function getPracticeSessionStore(): PracticeSessionRepository {
  assertStoreBackend();
  singletons.practiceSessionStore ??= usingPostgresStores()
    ? new PgPracticeSessionRepository(getDbClient())
    : new InMemoryPracticeSessionRepository();
  return singletons.practiceSessionStore;
}

/** Learning-object practice states (TASK-HANASO-22) — evidence only, never FSRS. */
export function getLearningObjectStore(): LearningObjectRepository {
  assertStoreBackend();
  singletons.learningObjectStore ??= usingPostgresStores()
    ? new PgLearningObjectRepository(getDbClient())
    : new InMemoryLearningObjectRepository();
  return singletons.learningObjectStore;
}

/* ------------------------------------------------------------------ owner-pass 2026-11-19 */
/* The two NEW learning-domain stores (review engine + durable events) follow the
 * exact same DATABASE_URL switch + globalThis singleton contract as the ones above. */

/** FSRS review engine persistence (M2 / OTD-001 — modules/fsrs/review-store.ts). */
export function getFsrsReviewStore(): FsrsReviewStore {
  assertStoreBackend();
  singletons.fsrsReviewStore ??= usingPostgresStores() ? createFsrsReviewStore() : new InMemoryFsrsReviewStore();
  return singletons.fsrsReviewStore;
}

/** Durable learning-behavior events (owner-pass monitoring mandate — modules/analytics/store.ts). */
export function getLearningEventsStore(): LearningEventsStore {
  assertStoreBackend();
  singletons.learningEventsStore ??= usingPostgresStores()
    ? createLearningEventsStore()
    : new InMemoryLearningEventsStore();
  return singletons.learningEventsStore;
}

/** TEST-ONLY: drop cached singletons (switch env between unit/integration runs). */
export function resetStoresForTests(): void {
  singletons.attemptStore = null;
  singletons.progressStore = null;
  singletons.eventStore = null;
  singletons.stationProgressStore = null;
  singletons.chapterProgressStore = null;
  singletons.practiceSessionStore = null;
  singletons.learningObjectStore = null;
  singletons.fsrsReviewStore = null;
  singletons.learningEventsStore = null;
}

export type { PocEvent };
