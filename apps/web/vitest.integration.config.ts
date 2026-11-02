import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * HANASO — REAL PostgreSQL integration suite (TASK-M0-10 / Issue #11).
 *
 * Runs against an actual PostgreSQL 18 (local portable install, or the CI service
 * container): migrations + seed + repositories + routes + worker + the backup/restore
 * drill. A mock is never a substitute here — the owner's constraint: «تست Mock جایگزین
 * Integration Test واقعی نیست».
 *
 * Point it at a server with:  TEST_DATABASE_URL=postgresql://user:pass@host:port/postgres
 * (any database name works — a dedicated `hanaso_test` database is (re)created per file).
 *
 * SINGLE-RUNNER ONLY (PR #74 review r3/S3): the fixed database names
 * (`hanaso_test` / `hanaso_restore_test`) are DROPped per file — two concurrent
 * runs against one server would destroy each other's databases mid-run.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/integration-pg/**/*.spec.ts'],
    // real DB + pg_dump/pg_restore spawns: generous timeouts
    testTimeout: 120_000,
    hookTimeout: 180_000,
    // sequential files, isolated module registry per file → per-file clean database
    fileParallelism: false,
    maxWorkers: 1,
  },
});
