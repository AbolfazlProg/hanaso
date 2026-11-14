/**
 * HANASO — worker job schedule definitions (TASK-M0-10 DB-layer / Issue #11).
 *
 * Single source of truth for queue names, crons and the timezone, shared by the
 * worker entry (registration) AND the integration test (assertion) — PR #74 review
 * r3/S2: a test that re-declares the constants it claims to verify drifts silently.
 *
 * KB infrastructure-and-devops §۴: crons live ONLY here.
 */

export const JOB_BACKUP = 'ops.backup';
export const JOB_BACKUP_CRON = '30 3 * * *'; // 03:30 — nightly pg_dump + verify + retention

export const JOB_DB_VERIFY = 'ops.db-verify';
export const JOB_DB_VERIFY_CRON = '0 4 * * *'; // 04:00 — consistency counts after the backup

/** Crons fire in the users' timezone (owner + learners are in Iran). */
export const JOB_TZ = 'Asia/Tehran';

/** (queue, cron) pairs — the exact rows `pgboss.schedule` must hold after boot. */
export const WORKER_SCHEDULES: ReadonlyArray<{ name: string; cron: string }> = [
  { name: JOB_BACKUP, cron: JOB_BACKUP_CRON },
  { name: JOB_DB_VERIFY, cron: JOB_DB_VERIFY_CRON },
];
