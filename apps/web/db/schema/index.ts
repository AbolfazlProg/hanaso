/**
 * HANASO — Drizzle schema barrel — TASK-SLICE-01 / Issue #40.
 * Two schemas per KB database-architecture §۱: `content` (pipeline-owned, rebuildable)
 * and `app` (user data, never rewritten by publishes). Consumed by drizzle-kit
 * (drizzle.config.ts), the schema migration test, and — since M0-10 — the Postgres
 * layer (client typing, repositories, seed).
 */
export * as contentSchema from './content';
export * as appSchema from './app';
export * from './content';
export * from './app';
