/**
 * HANASO — PoC server-side singletons (TASK-DLG-POC-01).
 *
 * // DEV-ONLY — in-memory stores for the PoC API routes. The Vertical Slice replaces
 * these with Postgres-backed repositories behind the same interfaces (ADR data model);
 * until DATABASE_URL exists (M0-10/M1) the slice keeps running on these.
 */
import { InMemoryAttemptRepository, type AttemptRepository } from '@/modules/mastery/server';
import { InMemoryProgressRepository, type ProgressRepository } from '@/modules/progress/server';
import type { PocEvent } from './event-store';
import { InMemoryEventStore } from './event-store';

let attemptStore: AttemptRepository | null = null;
let eventStore: InMemoryEventStore | null = null;
let progressStore: ProgressRepository | null = null;

export function getAttemptStore(): AttemptRepository {
  attemptStore ??= new InMemoryAttemptRepository();
  return attemptStore;
}

export function getEventStore(): InMemoryEventStore {
  eventStore ??= new InMemoryEventStore();
  return eventStore;
}

export function getProgressStore(): ProgressRepository {
  progressStore ??= new InMemoryProgressRepository();
  return progressStore;
}

export type { PocEvent };
