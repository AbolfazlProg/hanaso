/**
 * TASK-M0-10 — pg-boss worker against REAL PostgreSQL 18 (Issue #11).
 *
 * Boots the queue the same way the compose worker does (useListenNotify:false — the
 * PgBouncer transaction-mode constraint), then round-trips a real job and asserts the
 * production schedule rows (03:30 backup / 04:00 verify, Asia/Tehran).
 */
import { PgBoss, type Job } from 'pg-boss';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
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
    // the worker registers these on every boot (idempotent upserts) — same calls here
    await boss!.createQueue('ops.backup');
    await boss!.createQueue('ops.db-verify');
    await boss!.schedule('ops.backup', '30 3 * * *', null, { tz: 'Asia/Tehran' });
    await boss!.schedule('ops.db-verify', '0 4 * * *', null, { tz: 'Asia/Tehran' });

    const { rows } = await pool!.query<{ name: string; cron: string; timezone: string }>(
      'SELECT name, cron, timezone FROM pgboss.schedule ORDER BY name',
    );
    expect(rows).toEqual([
      { name: 'ops.backup', cron: '30 3 * * *', timezone: 'Asia/Tehran' },
      { name: 'ops.db-verify', cron: '0 4 * * *', timezone: 'Asia/Tehran' },
    ]);
  });

  it('records completed jobs for observability (db-cli jobs reads this table)', async () => {
    const { rows } = await pool!.query<{ state: string }>("SELECT state FROM pgboss.job WHERE name = 'test.ping'");
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.map((r) => r.state)).toContain('completed');
  });
});
