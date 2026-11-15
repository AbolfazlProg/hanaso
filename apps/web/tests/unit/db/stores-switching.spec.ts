/**
 * HANASO — store switching unit tests (TASK-M0-10 DB-layer).
 * Without DATABASE_URL the app MUST keep running on the in-memory repositories
 * (local dev + CI smoke path) — same as the pre-M0-10 behavior.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  getAttemptStore,
  getEventStore,
  getProgressStore,
  resetStoresForTests,
  usingPostgresStores,
} from '@/lib/poc/stores';
import { InMemoryAttemptRepository } from '@/modules/mastery/server';
import { InMemoryProgressRepository } from '@/modules/progress/server';

const ORIGINAL = process.env.DATABASE_URL;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL;
  resetStoresForTests();
});

describe('lib/poc/stores without DATABASE_URL (the no-DB path)', () => {
  it('uses the in-memory repositories', () => {
    delete process.env.DATABASE_URL;
    resetStoresForTests();

    expect(usingPostgresStores()).toBe(false);
    expect(getAttemptStore()).toBeInstanceOf(InMemoryAttemptRepository);
    expect(getProgressStore()).toBeInstanceOf(InMemoryProgressRepository);
    expect(getEventStore().count()).toBe(0);
  });

  it('in-memory repositories are now async (same interface as the Pg impls)', async () => {
    delete process.env.DATABASE_URL;
    resetStoresForTests();

    const attempts = getAttemptStore();
    const created = await attempts.create(
      {
        dialogueId: 'dlg-cafe-morning-01',
        userId: 'u1',
        scores: { M1: 1, M2: null, M3: null, M4: null, M5: null },
        weakPoints: [],
      },
      'passed',
    );
    expect(created.attemptNo).toBe(1);
    expect(await attempts.list('dlg-cafe-morning-01')).toHaveLength(1);
  });

  it('usingPostgresStores flips when DATABASE_URL appears', () => {
    delete process.env.DATABASE_URL;
    resetStoresForTests();
    expect(usingPostgresStores()).toBe(false);

    process.env.DATABASE_URL = 'postgresql://hanaso:x@postgres:5432/hanaso';
    expect(usingPostgresStores()).toBe(true);
    // NOTE: constructing the Pg stores here would open a pool — covered by the
    // integration suite against real PostgreSQL instead.
  });
});
