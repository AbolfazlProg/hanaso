/**
 * HANASO — restore drill primitives (TASK-M0-10 DB-layer / Issue #11; TR-030).
 *
 * Restores a `pg_dump -Fc` archive into an ISOLATED TEST database — the live database
 * is never a restore target («بکاپ تست‌شده = تنها بکاپ معتبر», KB infrastructure §۸).
 * Shared by the ops CLI (`db-cli restore`) and the integration drill test so the exact
 * code path that runs in production drills is the one that is tested.
 *
 * Guard hardening (PR #74 review round — r2/S2): the live-DB refusal is NOT a plain
 * string compare. Targets are validated as strict identifiers BEFORE any SQL, the live
 * name is compared percent-decoded and URL-normalized (libpq decodes the path — a raw
 * pathname comparison can be bypassed with `hanaso%73`), and the app's DATABASE_URL
 * name plus the system databases are refused as well.
 */
import { spawn } from 'node:child_process';

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
      reject(new Error(`${cmd} failed to start: ${err.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

/** Strict database identifier — everything else (paths, quotes, %, spaces) is rejected. */
const DATABASE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Databases a restore/drop must NEVER touch, regardless of configuration. */
export const SYSTEM_DATABASES: readonly string[] = ['postgres', 'template0', 'template1'];

/** True when `name` is a safe standalone database identifier (no quoting needed). */
export function isValidDatabaseName(name: string): boolean {
  return DATABASE_NAME_RE.test(name);
}

/**
 * The database name of a URL as libpq sees it: WHATWG parsing normalizes dot-segments
 * (`/../hanaso` collapses), then the path is percent-decoded (`hanaso%73` → `hanasos`).
 */
export function databaseNameFromUrl(url: string): string {
  const path = new URL(url).pathname.replace(/^\//, '').replace(/\/+$/, '');
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // invalid escape sequence — keep the raw form (the strict target check rejects it anyway)
  }
  return decoded || 'postgres';
}

export function urlForDatabase(url: string, database: string): string {
  if (!isValidDatabaseName(database)) {
    // urlForDatabase must never be reachable with a hostile value: `new URL()` would
    // silently normalize `../x` style path traversal into the LIVE database path.
    throw new Error(`invalid database name "${database}" — must match ${DATABASE_NAME_RE}`);
  }
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

/** Every database name this process considers LIVE (direct URL + app URL + system DBs). */
export function liveDatabaseNames(serverUrl: string): Set<string> {
  const names = new Set<string>([databaseNameFromUrl(serverUrl), ...SYSTEM_DATABASES]);
  const appUrl = process.env.DATABASE_URL;
  if (appUrl) {
    try {
      names.add(databaseNameFromUrl(appUrl));
    } catch {
      // a malformed app URL must not break the guard — the strict target check still applies
    }
  }
  return names;
}

/** Recreate `database` from scratch on the server behind `serverUrl` (admin path). */
export async function resetDatabase(serverUrl: string, database: string): Promise<void> {
  if (!isValidDatabaseName(database)) {
    throw new Error(`invalid database name "${database}" — must match ${DATABASE_NAME_RE}`);
  }
  const { Client } = await import('pg');
  const client = new Client({ connectionString: urlForDatabase(serverUrl, 'postgres') });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${database}"`);
  } finally {
    await client.end();
  }
}

export interface RestoreResult {
  database: string;
  file: string;
  seconds: number;
}

/**
 * pg_restore an archive into `target` (recreated first). REFUSES when target equals a
 * LIVE database name (direct URL, app DATABASE_URL, or a system database) — the live DB
 * is never restorable by automation. The target must also be a strict identifier.
 */
export async function restoreDump(options: {
  serverUrl: string;
  file: string;
  target: string;
}): Promise<RestoreResult> {
  if (!isValidDatabaseName(options.target)) {
    throw new Error(
      `invalid database name "${options.target}" — must match ${DATABASE_NAME_RE} (no paths, quotes, or percent-encoding)`,
    );
  }
  const live = liveDatabaseNames(options.serverUrl);
  if (live.has(options.target)) {
    throw new Error(
      `refusing to restore into the LIVE database "${options.target}" — pick a test database (e.g. hanaso_restore_test)`,
    );
  }
  const started = Date.now();
  await resetDatabase(options.serverUrl, options.target);
  const targetUrl = urlForDatabase(options.serverUrl, options.target);
  const restore = await run('pg_restore', ['--no-owner', '--no-privileges', '--dbname', targetUrl, options.file], {
    timeoutMs: 10 * 60_000,
  });
  if (restore.code !== 0) {
    throw new Error(`pg_restore exited ${restore.code}: ${restore.stderr.trim().slice(0, 2000)}`);
  }
  return { database: options.target, file: options.file, seconds: (Date.now() - started) / 1000 };
}
