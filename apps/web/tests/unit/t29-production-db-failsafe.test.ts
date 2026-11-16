/**
 * TASK-HANASO-29 — Subagent B M2 regression: production must NEVER silently
 * fall back to the in-memory DEV-ONLY repositories.
 *
 * Before the fix: with no DATABASE_URL the app quietly ran on volatile
 * in-memory stores in ANY environment and /api/ready still reported ok:true
 * (database "skipped"). A manual compose bring-up without the variable looked
 * healthy while every restart wiped learner progress.
 *
 * After the fix (same fail-closed contract as HANASO_SESSION_SECRET):
 *  - NODE_ENV=production (or any non-dev/test value) + no DATABASE_URL
 *    → every repository getter THROWS at first access;
 *  - /api/ready reports database "fail" → ok:false → 503;
 *  - NODE_ENV=development/test + no DATABASE_URL → the honest dev fallback
 *    (in-memory) + ready "skipped" stay allowed;
 *  - DATABASE_URL set → Postgres stores (positive path unchanged).
 *
 * Env is mutated per test and restored afterwards (vitest runs in-band in
 * this file — no cross-file leakage; each case re-reads process.env).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ENV_KEYS = ['DATABASE_URL', 'NODE_ENV'] as const;

describe('TASK-HANASO-29 M2 — production fail-safe without DATABASE_URL', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
  });

  /* NODE_ENV is typed readonly by @types/node; tests mutate it anyway (the
   * runtime allows it) — go through the record view to satisfy tsc. */
  const env = process.env as Record<string, string | undefined>;
  const setNodeEnv = (v: string | undefined) => {
    if (v === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = v;
  };

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete env[k];
      else env[k] = saved[k];
    }
    // drop cached module state so the next import re-evaluates the guards
    vi.resetModules();
  });

  async function freshStores() {
    const mod = await import('@/lib/poc/stores');
    const client = await import('@/db/client');
    return { mod, client };
  }

  it('production + no DATABASE_URL → store getter THROWS (fail-closed, like the session secret)', async () => {
    setNodeEnv('production');
    delete process.env.DATABASE_URL;
    const { mod } = await freshStores();
    expect(() => mod.getStationProgressStore()).toThrow(/DATABASE_URL/);
    expect(() => mod.getAttemptStore()).toThrow(/DATABASE_URL/);
  });

  it('unset NODE_ENV + no DATABASE_URL → also THROWS (no silent default to dev stores)', async () => {
    setNodeEnv(undefined);
    delete process.env.DATABASE_URL;
    const { mod } = await freshStores();
    expect(() => mod.getProgressStore()).toThrow(/DATABASE_URL/);
  });

  it("typo'd NODE_ENV + no DATABASE_URL → also THROWS (explicit allowlist only)", async () => {
    setNodeEnv('prod'); // not on the dev/test allowlist
    delete process.env.DATABASE_URL;
    const { mod } = await freshStores();
    expect(() => mod.getChapterProgressStore()).toThrow(/DATABASE_URL/);
  });

  it('development + no DATABASE_URL → the honest in-memory dev fallback still works', async () => {
    setNodeEnv('development');
    delete process.env.DATABASE_URL;
    const { mod } = await freshStores();
    expect(() => mod.getStationProgressStore()).not.toThrow();
    expect(mod.usingPostgresStores()).toBe(false);
  });

  it('test + no DATABASE_URL → in-memory fallback allowed (CI smoke without a DB)', async () => {
    setNodeEnv('test');
    delete process.env.DATABASE_URL;
    const { mod } = await freshStores();
    expect(() => mod.getPracticeSessionStore()).not.toThrow();
  });

  it('ready check: production + no DATABASE_URL → status fail (route would 503, not ok)', async () => {
    setNodeEnv('production');
    delete process.env.DATABASE_URL;
    vi.resetModules();
    const { checkDatabaseReadiness } = await import('@/db/readiness');
    const r = await checkDatabaseReadiness();
    expect(r.status).toBe('fail');
    expect(r.detail).toContain('production');
  });

  it('ready check: development + no DATABASE_URL → honest skipped (unchanged dev behavior)', async () => {
    setNodeEnv('development');
    delete process.env.DATABASE_URL;
    vi.resetModules();
    const { checkDatabaseReadiness } = await import('@/db/readiness');
    const r = await checkDatabaseReadiness();
    expect(r.status).toBe('skipped');
  });

  it('ready check: DATABASE_URL set → attempts a REAL pool check (positive path unchanged)', async () => {
    setNodeEnv('production');
    process.env.DATABASE_URL = 'postgresql://127.0.0.1:1/none'; // unreachable, but configured
    vi.resetModules();
    const { checkDatabaseReadiness } = await import('@/db/readiness');
    const r = await checkDatabaseReadiness();
    // configured-but-unreachable is an honest fail (never "skipped"/"ok") —
    // and the guard did NOT throw because the variable IS set
    expect(r.status).toBe('fail');
    expect(r.detail).not.toContain('production must not run');
  });

  it('guard never leaks connection values — the thrown message names the variable only', async () => {
    setNodeEnv('production');
    process.env.DATABASE_URL = 'postgresql://u:SECRET-VALUE@h/db';
    vi.resetModules();
    const { assertProductionDatabase } = await import('@/db/client');
    // configured → no throw; the secret value is irrelevant to the guard
    expect(() => assertProductionDatabase()).not.toThrow();
    delete process.env.DATABASE_URL;
    const { assertProductionDatabase: fresh } = await import('@/db/client');
    try {
      fresh();
      expect.unreachable('should have thrown');
    } catch (e) {
      expect((e as Error).message).not.toContain('SECRET-VALUE');
      expect((e as Error).message).toContain('DATABASE_URL');
    }
  });
});
