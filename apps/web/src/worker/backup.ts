/**
 * HANASO — nightly backup routine (TASK-M0-10 DB-layer / Issue #11; TR-030).
 *
 * KB infrastructure-and-devops §۸: `pg_dump -Fc` شبانه + تست restore — «بکاپ تست‌شده =
 * تنها بکاپ معتبر». This module is the single implementation shared by the pg-boss
 * `ops.backup` job (nightly 03:30 Asia/Tehran) and the manual `db-cli backup` drill.
 *
 * - runs from a DIRECT connection (never through PgBouncer — pg_dump needs a consistent
 *   snapshot; KB database-architecture §۱/§۸-۴);
 * - verifies EVERY dump with `pg_restore --list` before counting it as kept;
 * - retention mirrors the KB restic policy (--keep-daily 7 --keep-weekly 4 --keep-monthly 6)
 *   applied to the local dump files; the restic→object-storage off-site copy stays open
 *   (documented in PROJECT_STATUS — no credentials yet).
 */
import { spawn } from 'node:child_process';
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

export const BACKUP_FILE_PREFIX = 'hanaso-';
export const BACKUP_FILE_SUFFIX = '.dump';

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
  opts: { timeoutMs: number },
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
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
 * One verified backup: pg_dump -Fc → pg_restore --list → prune. Throws with a redacted,
 * actionable message on any failure (the pg-boss job marks the run failed — visible in
 * `db-cli jobs`).
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

  await mkdir(options.backupDir, { recursive: true });

  const version = await pgDumpVersion();
  const dump = await run(
    'pg_dump',
    ['--dbname', options.directUrl, '--format=custom', '--file', target, '--no-password'],
    { timeoutMs: 10 * 60_000 },
  );
  if (dump.code !== 0) {
    throw new Error(
      `pg_dump exited ${dump.code}: ${dump.stderr.trim() || 'no stderr'} (url: ${redactUrl(options.directUrl)})`,
    );
  }

  // Verify BEFORE counting the file: a dump that cannot be listed is not a backup.
  const listing = await run('pg_restore', ['--list', target], { timeoutMs: 60_000 });
  if (listing.code !== 0) {
    await unlink(target).catch(() => undefined);
    throw new Error(`pg_restore --list failed (${listing.stderr.trim()}) — dump deleted, not counted as a backup`);
  }
  const archiveEntries = listing.stdout.split('\n').filter((l) => /^\s*\d+;\s+\d+\s+\d+\s/.test(l)).length;

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
    archiveEntries,
    durationMs: Date.now() - started,
    pruned,
    kept,
  };
}
