/**
 * HANASO — restore drill primitives (TASK-M0-10 DB-layer / Issue #11; TR-030).
 *
 * Restores a `pg_dump -Fc` archive into an ISOLATED TEST database — the live database
 * is never a restore target («بکاپ تست‌شده = تنها بکاپ معتبر», KB infrastructure §۸).
 * Shared by the ops CLI (`db-cli restore`) and the integration drill test so the exact
 * code path that runs in production drills is the one that is tested.
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

export function databaseNameFromUrl(url: string): string {
  return new URL(url).pathname.replace(/^\//, '') || 'postgres';
}

export function urlForDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${database}`;
  return parsed.toString();
}

/** Recreate `database` from scratch on the server behind `serverUrl` (admin path). */
export async function resetDatabase(serverUrl: string, database: string): Promise<void> {
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
 * pg_restore an archive into `target` (recreated first). REFUSES when target equals the
 * database named by `serverUrl` — the live DB is never restorable by automation.
 */
export async function restoreDump(options: {
  serverUrl: string;
  file: string;
  target: string;
}): Promise<RestoreResult> {
  const live = databaseNameFromUrl(options.serverUrl);
  if (options.target === live) {
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
