/**
 * HANASO — nightly backup routine (TASK-M0-10 DB-layer / Issue #11; TR-030).
 *
 * KB infrastructure-and-devops §۸: `pg_dump -Fc` شبانه + تست restore — «بکاپ تست‌شده =
 * تنها بکاپ معتبر». This module is the single implementation shared by the pg-boss
 * `ops.backup` job (nightly 03:30 Asia/Tehran) and the manual `db-cli backup` drill.
 *
 * - runs from a DIRECT connection (never through PgBouncer — pg_dump needs a consistent
 *   snapshot; KB database-architecture §۱/§۸-۴);
 * - writes to `<file>.part` and renames only AFTER `pg_restore --list` verifies the
 *   archive (PR #74 review r1/S2: a crash mid-dump must never leave a partial file
 *   that retention would keep as the day's backup);
 * - refuses to dump when the pg_dump client is older than the server (review r3/S2 —
 *   `dumpClientCompatible` is enforced, not just exported);
 * - holds a session advisory lock so a manual drill cannot race the nightly job
 *   (review r1/S3);
 * - passes credentials via `PGPASSWORD` (never on the argv, review r2/S3);
 * - retention mirrors the KB restic policy (--keep-daily 7 --keep-weekly 4
 *   --keep-monthly 6) applied to the local dump files; the restic→object-storage
 *   off-site copy stays open (documented in PROJECT_STATUS — no credentials yet).
 */
import { spawn } from 'node:child_process';
import { mkdir, readdir, rename, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

export const BACKUP_FILE_PREFIX = 'hanaso-';
export const BACKUP_FILE_SUFFIX = '.dump';
/** In-flight dumps carry this suffix — retention and the `.dump` scan ignore them. */
const PART_SUFFIX = '.part';

/** pg_try_advisory_lock key — fixed, arbitrary (H-A-N-A-S-O backup). */
const BACKUP_ADVISORY_KEY = 0x48414e41;

/** KB retention policy: 7 daily + 4 weekly + 6 monthly (union keeps, rest prunes). */
export interface RetentionPolicy {
  daily: number;
  weekly: number;
  monthly: number;
}

export const KB_RETENTION: RetentionPolicy = { daily: 7, weekly: 4, monthly: 6 };

export interface BackupOutcome {
  file: string;
  bytes: number;
  dumpedAt: string;
  pgDumpVersion: string;
  serverVersion: string;
  /** TOC entries from `pg_restore --list` — >0 proves the archive is readable. */
  archiveEntries: number;
  durationMs: number;
  pruned: string[];
  kept: string[];
}

/** `hanaso-20261102-033000.dump` — UTC timestamp, one file per run. */
export function backupFileName(now: Date = new Date()): string {
  const iso = now.toISOString().replace(/[:T]/g, '-').replace(/\..+$/, '');
  return `${BACKUP_FILE_PREFIX}${iso}${BACKUP_FILE_SUFFIX}`;
}

export function parseBackupDate(file: string): Date | null {
  const match = /^hanaso-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.dump$/.exec(file);
  if (!match) return null;
  const [y, mo, d, h, mi, s] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(y!, mo! - 1, d!, h!, mi!, s!));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** ISO week key (e.g. 2026-W44) — Monday-based, the restic/cron convention. */
function isoWeekKey(date: Date): string {
  const t = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = t.getUTCDay() || 7; // Sunday → 7
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Which files survive KB retention (union of newest-per-day/week/month buckets),
 * newest first. Pure — unit-tested against synthetic listings.
 */
export function selectKeptFiles(files: string[], policy: RetentionPolicy = KB_RETENTION): string[] {
  const dated = files
    .map((f) => ({ f, at: parseBackupDate(f) }))
    .filter((x): x is { f: string; at: Date } => x.at !== null)
    .sort((a, b) => b.at.getTime() - a.at.getTime());

  const keep = new Set<string>();
  const days = new Set<string>();
  const weeks = new Set<string>();
  const months = new Set<string>();

  for (const { f, at } of dated) {
    const day = at.toISOString().slice(0, 10);
    const week = isoWeekKey(at);
    const month = at.toISOString().slice(0, 7);
    if (days.size < policy.daily && !days.has(day)) {
      days.add(day);
      keep.add(f);
    } else if (weeks.size < policy.weekly && !weeks.has(week)) {
      weeks.add(week);
      keep.add(f);
    } else if (months.size < policy.monthly && !months.has(month)) {
      months.add(month);
      keep.add(f);
    }
  }
  return [...keep];
}

/** Never leak the password from a connection URL into logs/errors. */
export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '<invalid-url>';
  }
}

function run(
  cmd: string,
  args: string[],
  opts: { timeoutMs: number; env?: NodeJS.ProcessEnv },
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: opts.env });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), opts.timeoutMs);
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`${cmd} failed to start: ${err.message} (is the binary on PATH?)`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

/**
 * Split a connection URL into argv-safe components + a `PGPASSWORD` env, so the
 * credential never appears in `/proc/<pid>/cmdline` (review r2/S3).
 */
function pgConnection(url: string): { args: string[]; env: NodeJS.ProcessEnv; database: string } {
  const parsed = new URL(url);
  const envVars: NodeJS.ProcessEnv = { ...process.env };
  const password = decodeURIComponent(parsed.password);
  if (password) envVars.PGPASSWORD = password;
  const sslmode = parsed.searchParams.get('sslmode');
  if (sslmode) envVars.PGSSLMODE = sslmode;
  return {
    args: [
      '--host',
      parsed.hostname,
      '--port',
      parsed.port || '5432',
      '--username',
      decodeURIComponent(parsed.username),
    ],
    env: envVars,
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')) || 'postgres',
  };
}

/** `pg_dump --version` → "pg_dump (PostgreSQL) 18.6" → "18.6". */
export async function pgDumpVersion(): Promise<string> {
  const { stdout } = await run('pg_dump', ['--version'], { timeoutMs: 10_000 });
  return stdout.trim().replace(/^pg_dump \(PostgreSQL\)\s*/, '');
}

/** pg_dump major must be >= server major, else the dump silently misses features. */
export function dumpClientCompatible(clientVersion: string, serverVersion: string): boolean {
  const client = Number(clientVersion.split('.')[0]);
  const server = Number(serverVersion.split('.')[0]);
  return Number.isFinite(client) && Number.isFinite(server) && client >= server;
}

/**
 * One verified backup: pg_dump -Fc → pg_restore --list → atomic rename → prune.
 * Throws with a redacted, actionable message on any failure (the pg-boss job marks
 * the run failed — visible in `db-cli jobs`).
 */
export async function runBackup(options: {
  directUrl: string;
  backupDir: string;
  policy?: RetentionPolicy;
  now?: Date;
}): Promise<BackupOutcome> {
  const started = Date.now();
  const file = backupFileName(options.now ?? new Date());
  const target = path.join(options.backupDir, file);
  const part = `${target}${PART_SUFFIX}`;

  await mkdir(options.backupDir, { recursive: true });

  // Server version + advisory lock on a direct connection, held for the whole run.
  const { Client } = await import('pg');
  const conn = new Client({ connectionString: options.directUrl, connectionTimeoutMillis: 10_000 });
  let serverVersion = '';
  try {
    await conn.connect();
  } catch (err) {
    throw new Error(
      `backup: cannot reach the database (${redactUrl(options.directUrl)}): ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  try {
    serverVersion = (await conn.query<{ v: string }>(`SELECT current_setting('server_version') AS v`)).rows[0]?.v ?? '';
    const locked = (await conn.query<{ ok: boolean }>('SELECT pg_try_advisory_lock($1) AS ok', [BACKUP_ADVISORY_KEY]))
      .rows[0]?.ok;
    if (!locked) {
      throw new Error('backup: another backup is already running (pg_try_advisory_lock) — refusing to race it');
    }

    const version = await pgDumpVersion();
    if (!dumpClientCompatible(version, serverVersion)) {
      throw new Error(
        `backup: pg_dump client ${version} is older than server ${serverVersion} — refusing (silent feature loss)`,
      );
    }

    const connection = pgConnection(options.directUrl);
    const dump = await run(
      'pg_dump',
      [...connection.args, '--dbname', connection.database, '--format=custom', '--file', part, '--no-password'],
      { timeoutMs: 10 * 60_000, env: connection.env },
    );
    if (dump.code !== 0) {
      await unlink(part).catch(() => undefined);
      throw new Error(
        `pg_dump exited ${dump.code}: ${dump.stderr.trim() || 'no stderr'} (url: ${redactUrl(options.directUrl)})`,
      );
    }

    // Verify BEFORE the file counts: a dump that cannot be listed is not a backup.
    const listing = await run('pg_restore', ['--list', part], { timeoutMs: 60_000, env: connection.env });
    const archiveEntries = listing.stdout.split('\n').filter((l) => /^\s*\d+;\s+\d+\s+\d+\s/.test(l)).length;
    if (listing.code !== 0 || archiveEntries <= 0) {
      await unlink(part).catch(() => undefined);
      throw new Error(
        `pg_restore --list failed or listed nothing (code ${listing.code}, ${archiveEntries} entries: ${listing.stderr.trim()}) — dump deleted, not counted as a backup`,
      );
    }

    // Atomic publish: only a fully verified archive ever gets the final .dump name.
    await rename(part, target);
    const bytes = (await stat(target)).size;

    const all = (await readdir(options.backupDir)).filter(
      (f) => f.startsWith(BACKUP_FILE_PREFIX) && f.endsWith(BACKUP_FILE_SUFFIX),
    );
    const kept = selectKeptFiles(all, options.policy ?? KB_RETENTION);
    const pruned: string[] = [];
    for (const f of all) {
      if (!kept.includes(f)) {
        await unlink(path.join(options.backupDir, f)).catch(() => undefined);
        pruned.push(f);
      }
    }

    return {
      file,
      bytes,
      dumpedAt: (options.now ?? new Date()).toISOString(),
      pgDumpVersion: version,
      serverVersion,
      archiveEntries,
      durationMs: Date.now() - started,
      pruned,
      kept,
    };
  } finally {
    await conn.end().catch(() => undefined);
  }
}
