/**
 * HANASO — operations CLI (TASK-M0-10 DB-layer / Issue #11).
 *
 * Shipped inside the app image as a self-contained bundle (`apps/web/.tools/db-cli.mjs`,
 * see scripts/bundle-tools.mjs) and run through the compose `migrate`/one-shot services
 * or `docker compose exec`. Every command prints JSON on stdout (operator-friendly and
 * drill-script-friendly) and exits non-zero on failure.
 *
 * Connection discipline (KB database-architecture §۱):
 * - DIRECT_DATABASE_URL (postgres, bypassing PgBouncer): migrate, seed, backup, restore,
 *   verify. Falls back to DATABASE_URL for local dev (no PgBouncer there).
 * - DATABASE_URL (PgBouncer, the app's own path): `ready`.
 *
 * SAFETY: `restore` REFUSES to target the database named by the direct URL — restoring
 * over live user data is never an automated action (owner constraint: «هیچ‌گاه اطلاعات
 * اصلی را برای آزمایش Restore یا Seed پاک نکن»).
 */
import { existsSync } from 'node:fs';
import { runMigrations } from './migrate';
import { runSeed } from './seed';
import { runCurriculumSeed } from './seed-curriculum';
import { checkDatabaseReadiness } from './readiness';
import { restoreDump, urlForDatabase } from './restore';
import { runBackup } from '../worker/backup';
import { runDbVerify } from '../worker/verify';

interface Args {
  command: string;
  flags: Map<string, string>;
}

function parseArgs(argv: string[]): Args {
  const [command, ...rest] = argv;
  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i]!;
    if (token.startsWith('--')) {
      const [key, inline] = token.replace(/^--/, '').split('=', 2);
      if (inline !== undefined) flags.set(key!, inline);
      else if (i + 1 < rest.length && !rest[i + 1]!.startsWith('--')) flags.set(key!, rest[++i]!);
      else flags.set(key!, 'true');
    }
  }
  return { command: command ?? 'help', flags };
}

function env(name: string, fallback?: string): string | undefined {
  return process.env[name] ?? fallback;
}

/** The direct (non-PgBouncer) URL — required for anything touching dumps or DDL. */
function directUrl(required = true): string {
  const url = env('DIRECT_DATABASE_URL') ?? env('DATABASE_URL');
  if (!url && required) {
    console.error('DIRECT_DATABASE_URL (or DATABASE_URL) is required for this command');
    process.exit(2);
  }
  return url!;
}

/* --------------------------------- commands --------------------------------- */

async function cmdMigrate(): Promise<void> {
  const result = await runMigrations({ url: directUrl() });
  console.log(JSON.stringify({ ok: true, command: 'migrate', ...result }));
}

async function cmdSeed(): Promise<void> {
  const result = await runSeed({ url: directUrl() });
  console.log(JSON.stringify({ ok: true, command: 'seed', ...result }));
}

async function cmdReady(): Promise<void> {
  if (!env('DATABASE_URL')) {
    console.log(JSON.stringify({ ok: false, command: 'ready', error: 'DATABASE_URL is required' }));
    process.exit(2);
  }
  const result = await checkDatabaseReadiness();
  console.log(JSON.stringify({ ok: result.status === 'ok', command: 'ready', database: result }));
  process.exit(result.status === 'ok' ? 0 : 1);
}

async function cmdBackup(): Promise<void> {
  const backupDir = env('BACKUP_DIR', '/backups')!;
  const outcome = await runBackup({ directUrl: directUrl(), backupDir });
  console.log(JSON.stringify({ ok: true, command: 'backup', ...outcome }));
}

async function cmdRestore(args: Args): Promise<void> {
  const url = directUrl();
  const file = args.flags.get('file');
  if (!file || !existsSync(file)) {
    console.error(JSON.stringify({ ok: false, command: 'restore', error: `--file <path> is required (got: ${file})` }));
    process.exit(2);
  }
  const target = args.flags.get('database') ?? 'hanaso_restore_test';
  try {
    const result = await restoreDump({ serverUrl: url, file, target });
    console.log(JSON.stringify({ ok: true, command: 'restore', ...result }));
  } catch (err) {
    console.error(
      JSON.stringify({ ok: false, command: 'restore', error: err instanceof Error ? err.message : String(err) }),
    );
    process.exit(1);
  }
}

async function cmdVerify(args: Args): Promise<void> {
  const url = directUrl();
  const target = args.flags.get('database');
  const report = await runDbVerify({ url: target ? urlForDatabase(url, target) : url });
  console.log(JSON.stringify({ ok: true, command: 'verify', ...report }));
}

async function cmdJobs(): Promise<void> {
  const { Pool } = await import('pg');
  const pool = new Pool({ connectionString: env('DATABASE_URL') ?? directUrl(), max: 1 });
  try {
    const schedules = (
      await pool.query<{ name: string; cron: string; tz: string }>(
        'SELECT name, cron, timezone AS tz FROM pgboss.schedule ORDER BY name',
      )
    ).rows;
    const jobsByState = (
      await pool.query<{ state: string; count: string }>(
        'SELECT state, count(*) AS count FROM pgboss.job GROUP BY state ORDER BY state',
      )
    ).rows;
    console.log(
      JSON.stringify({
        ok: true,
        command: 'jobs',
        schedules,
        jobs: Object.fromEntries(jobsByState.map((r) => [r.state, Number(r.count)])),
      }),
    );
  } finally {
    await pool.end();
  }
}

function cmdHelp(): void {
  console.log(
    [
      'HANASO db-cli — commands:',
      '  migrate                     apply committed drizzle migrations (direct connection)',
      '  seed                        idempotent content seed (characters/dialogue/lines/lesson)',
      '  ready                       readiness check via DATABASE_URL (PgBouncer path), exits 1 on fail',
      '  backup                      pg_dump -Fc + pg_restore --list verify + KB retention',
      '  restore --file F [--database D]   restore a dump into a TEST database (never the live one)',
      '  verify [--database D]       per-table counts + pgboss queue depth report',
      '  jobs                        pg-boss schedules + job counts by state',
    ].join('\n'),
  );
}

/* ----------------------------------- main ----------------------------------- */

const USAGE_EXIT = 2;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case 'migrate':
      await cmdMigrate();
      break;
    case 'seed:curriculum': {
      const result = await runCurriculumSeed({ url: directUrl() });
      console.log(JSON.stringify({ ok: true, command: 'seed:curriculum', ...result }));
      break;
    }
    case 'seed':
      await cmdSeed();
      break;
    case 'ready':
      await cmdReady();
      break;
    case 'backup':
      await cmdBackup();
      break;
    case 'restore':
      await cmdRestore(args);
      break;
    case 'verify':
      await cmdVerify(args);
      break;
    case 'jobs':
      await cmdJobs();
      break;
    default:
      cmdHelp();
      process.exit(args.command === 'help' ? 0 : USAGE_EXIT);
  }
}

main().catch((err) => {
  console.error(
    JSON.stringify({ ok: false, command: 'db-cli', error: err instanceof Error ? err.message : String(err) }),
  );
  process.exit(1);
});
