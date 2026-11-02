/**
 * TASK-M0-10 — pg-boss worker against REAL PostgreSQL 18 (Issue #11).
 *
 * Boots the queue the same way the compose worker does (useListenNotify:false — the
 * PgBouncer transaction-mode constraint), then round-trips a real job and asserts the
 * production schedule rows (03:30 backup / 04:00 verify, Asia/Tehran).
 *
 * PR #74 review r3/S2: queue names/crons/tz come from src/worker/schedules.ts — the
 * SAME constants the production worker registers with — so this test fails if the
 * worker's registration ever drifts from the documented schedule.
 */
import { PgBoss, type Job } from 'pg-boss';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { WORKER_SCHEDULES, JOB_TZ } from '@/worker/schedules';
import { ensureTestDatabase } from './helpers';

let boss: PgBoss | null = null;
let pool: Pool | null = null;
const processed: string[] = [];

beforeAll(async () => {
  const url = await ensureTestDatabase();
  pool = new Pool({ connectionString: url, max: 2 });
});

afterAll(async () => {
  await boss?.stop({ graceful: true, timeout: 5_000 }).catch(() => undefined);
  await pool?.end();
});

describe('pg-boss 12 (polling mode — the production wiring)', () => {
  it('starts, creates its schema, and processes a sent job', async () => {
    boss = new PgBoss({
      connectionString: process.env.DIRECT_DATABASE_URL!,
      max: 2,
      useListenNotify: false,
      application_name: 'hanaso-test-worker',
    });
    await boss.start();
    await boss.createQueue('test.ping'); // pg-boss 12: queues must exist before send/work

    await boss.work('test.ping', { pollingIntervalSeconds: 1 }, async (jobs: Job<{ message: string }>[]) => {
      for (const job of jobs) processed.push(job.data.message);
      return { echoed: jobs[0]?.data.message ?? null };
    });

    const id = await boss.send('test.ping', { message: 'hello-from-pg' });
    expect(id).toBeTruthy();

    const deadline = Date.now() + 30_000;
    while (processed.length === 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    expect(processed).toEqual(['hello-from-pg']);
  });

  it('stores the production cron schedules in pgboss.schedule', async () => {
    // register with the SHARED constants — exactly what the worker does on boot
    for (const { name, cron } of WORKER_SCHEDULES) {
      await boss!.createQueue(name);
      await boss!.schedule(name, cron, null, { tz: JOB_TZ });
    }

    const { rows } = await pool!.query<{ name: string; cron: string; timezone: string }>(
      'SELECT name, cron, timezone FROM pgboss.schedule ORDER BY name',
    );
    expect(rows).toEqual(
      [...WORKER_SCHEDULES]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ name, cron }) => ({ name, cron, timezone: JOB_TZ })),
    );
  });

  it('records completed jobs for observability (db-cli jobs reads this table)', async () => {
    const { rows } = await pool!.query<{ state: string }>("SELECT state FROM pgboss.job WHERE name = 'test.ping'");
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.map((r) => r.state)).toContain('completed');
  });
});
