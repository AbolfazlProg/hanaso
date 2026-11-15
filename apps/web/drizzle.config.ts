import { defineConfig } from 'drizzle-kit';

/**
 * HANASO — drizzle-kit config — TASK-SLICE-01 / Issue #40.
 * `generate` only (no live DB needed): emits SQL migrations into db/migrations from the
 * two-schema Drizzle model. `push`/`migrate` run later with DATABASE_URL (M0-10/M1).
 */
export default defineConfig({
  schema: ['./db/schema/content.ts', './db/schema/app.ts'],
  out: './db/migrations',
  dialect: 'postgresql',
  strict: true,
  verbose: true,
});
