/**
 * HANASO — shared fixtures for the real-PostgreSQL integration suite (TASK-M0-10).
 *
 * Each spec file calls `ensureTestDatabase()` in beforeAll: it (re)creates a dedicated
 * `hanaso_test` database on the server named by TEST_DATABASE_URL / DIRECT_DATABASE_URL
 * / DATABASE_URL, applies the committed migrations, runs the seed, and points
 * DATABASE_URL at it — the same code paths production uses (src/db/migrate.ts + seed.ts).
 */
import { runMigrations } from '@/db/migrate';
import { runSeed } from '@/db/seed';
import { resetDatabase, urlForDatabase } from '@/db/restore';

export const TEST_DB_NAME = 'hanaso_test';

/** Reference URL of the test server (any db name — only host/port/credentials matter). */
export function serverUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'integration tests need TEST_DATABASE_URL (e.g. postgresql://postgres:postgres@127.0.0.1:5432/postgres)',
    );
  }
  return url;
}

let ready: Promise<string> | null = null;

/** Fresh migrated+seeded test database; resolves to its connection URL. */
export function ensureTestDatabase(): Promise<string> {
  ready ??= (async () => {
    const base = serverUrl();
    await resetDatabase(base, TEST_DB_NAME);
    const url = urlForDatabase(base, TEST_DB_NAME);
    await runMigrations({ url });
    await runSeed({ url });
    // switch the app modules (stores, readiness) onto the test database
    process.env.DATABASE_URL = url;
    process.env.DIRECT_DATABASE_URL = url;
    return url;
  })();
  return ready;
}
