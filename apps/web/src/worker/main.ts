/**
 * HANASO — pg-boss worker entry (TASK-M0-10 DB-layer / Issue #11; TR-011).
 *
 * Separate compose service from the same image (KB deployment-strategy: «worker از روز
 * اول سرویس compose جدا از همان image است»), connecting through PgBouncer like the app.
 *
 * pg-boss 12 behind PgBouncer transaction pooling: `useListenNotify: false` — the
 * LISTEN/NOTIFY listener needs a session-pinned connection (pg-boss constructor docs:
 * "not through PgBouncer in transaction or statement pooling mode"); polling-only is the
 * documented fallback and perfectly sufficient for two cron jobs. Transaction-scoped
 * advisory locks (pg-boss schema setup) are safe in transaction pooling.
 *
 * Jobs (crons live ONLY here — KB infrastructure-and-devops §۴):
 * - `ops.backup`    30 3 * * *  (Asia/Tehran) — nightly pg_dump -Fc + verify + retention
 * - `ops.db-verify`  0 4 * * *  (Asia/Tehran) — consistency counts after the backup
 */
import { PgBoss, type Job } from 'pg-boss';
import { runBackup } from './backup';
import { runDbVerify } from './verify';
import { JOB_BACKUP, JOB_BACKUP_CRON, JOB_DB_VERIFY, JOB_DB_VERIFY_CRON, JOB_TZ } from './schedules';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`worker: ${name} is required`);
  return value;
}

function log(job: string, message: string, extra?: unknown): void {
  console.log(JSON.stringify({ at: new Date().toISOString(), job, message, extra }));
}

export async function main(): Promise<void> {
  const databaseUrl = requiredEnv('DATABASE_URL'); // PgBouncer (transaction mode)
  const directUrl = requiredEnv('DIRECT_DATABASE_URL'); // postgres: pg_dump/pg_restore
  const backupDir = process.env.BACKUP_DIR ?? '/backups';

  const boss = new PgBoss({
    connectionString: databaseUrl,
    max: 2,
    useListenNotify: false,
    application_name: 'hanaso-worker',
  });

  boss.on('error', (err: Error) =>
    console.error(JSON.stringify({ at: new Date().toISOString(), kind: 'boss-error', message: err.message })),
  );
  boss.on('warning', (warning: { message: string }) =>
    console.warn(JSON.stringify({ at: new Date().toISOString(), kind: 'boss-warning', message: warning.message })),
  );

  await boss.start();

  // pg-boss 12: queues must exist before send/work/schedule (createQueue is idempotent).
  await boss.createQueue(JOB_BACKUP);
  await boss.createQueue(JOB_DB_VERIFY);

  await boss.work(JOB_BACKUP, { pollingIntervalSeconds: 15 }, async (jobs: Job<null>[]) => {
    let outcome: Awaited<ReturnType<typeof runBackup>> | null = null;
    for (const job of jobs) {
      outcome = await runBackup({ directUrl, backupDir });
      log(JOB_BACKUP, `backup ok (job ${job.id})`, outcome);
    }
    return outcome ? { file: outcome.file, bytes: outcome.bytes, archiveEntries: outcome.archiveEntries } : null;
  });

  await boss.work(JOB_DB_VERIFY, { pollingIntervalSeconds: 15 }, async (jobs: Job<null>[]) => {
    let report: Awaited<ReturnType<typeof runDbVerify>> | null = null;
    for (const job of jobs) {
      report = await runDbVerify({ url: directUrl });
      log(JOB_DB_VERIFY, `verify ok (job ${job.id})`, report);
    }
    return report;
  });

  // Idempotent upserts on every boot (pg-boss scheduling docs) — tz pinned to the users' zone.
  await boss.schedule(JOB_BACKUP, JOB_BACKUP_CRON, null, { tz: JOB_TZ });
  await boss.schedule(JOB_DB_VERIFY, JOB_DB_VERIFY_CRON, null, { tz: JOB_TZ });

  log(
    'worker',
    `started — jobs: ${JOB_BACKUP} (${JOB_BACKUP_CRON} ${JOB_TZ}), ${JOB_DB_VERIFY} (${JOB_DB_VERIFY_CRON} ${JOB_TZ})`,
  );

  const shutdown = async (signal: string) => {
    log('worker', `shutting down (${signal})`);
    try {
      await boss.stop({ graceful: true, timeout: 10_000 });
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

process.on('unhandledRejection', (err) => {
  console.error(JSON.stringify({ at: new Date().toISOString(), kind: 'unhandledRejection', message: String(err) }));
  process.exit(1);
});

main().catch((err) => {
  console.error(
    JSON.stringify({
      at: new Date().toISOString(),
      kind: 'fatal',
      message: err instanceof Error ? err.message : String(err),
    }),
  );
  process.exit(1);
});
