/**
 * HANASO — Drizzle schema barrel — TASK-SLICE-01 / Issue #40.
 * Two schemas per KB database-architecture §۱: `content` (pipeline-owned, rebuildable)
 * and `app` (user data, never rewritten by publishes). Consumed by drizzle-kit
 * (drizzle.config.ts) and the schema migration test — the running app stays on the
 * in-memory DEV-ONLY repositories until DATABASE_URL lands (M0-10/M1).
 */
export * as contentSchema from './content';
export * as appSchema from './app';
