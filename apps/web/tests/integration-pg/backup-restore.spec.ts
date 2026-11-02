/**
 * TASK-M0-10 — the REAL backup & restore drill (Issue #11; TR-030: «بکاپ تست‌شده =
 * تنها بکاپ معتبر»).
 *
 * 1. seeds data into the test DB (attempts + progress through the repositories),
 * 2. starts a pg-boss instance so the dump carries the pgboss schema (as in production),
 * 3. runs the production backup routine (pg_dump -Fc + pg_restore --list verify),
 * 4. restores the archive into an ISOLATED test database,
 * 5. verifies per-table counts match the source — with the source still connected.
 *
 * Skips (with an explicit message) when a pg_dump ≥ 18 is not on PATH (the suite pins
 * PostgreSQL 18; older dump clients would silently miss features). The drill runs for
 * real in CI (postgresql-client-18 via PGDG apt) and on the VPS (the app image ships
 * pg_dump/pg_restore copied from postgres:18-alpine).
 */
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PgBoss } from 'pg-boss';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runBackup } from '@/worker/backup';
import { runDbVerify } from '@/worker/verify';
import { restoreDump, urlForDatabase } from '@/db/restore';
import { resetDbClientForTests, getDbClient } from '@/db/client';
import { refreshContentMap } from '@/db/content-map';
import { PgAttemptRepository } from '@/db/repositories/attempts';
import { PgProgressRepository } from '@/db/repositories/progress';
import { ensureTestDatabase, serverUrl } from './helpers';

const RESTORE_TARGET = 'hanaso_restore_test';

const DRILL_TITLE = `backup & restore drill (pg_dump — verified at runtime)`;

let url = '';
let backupDir = '';
let boss: PgBoss | null = null;
let serverVersion = '';

/** Synchronous pg_dump probe — skipIf() needs the answer at COLLECTION time. */
function detectPgDump(): { available: boolean; clientVersion: string } {
  try {
    const res = spawnSync('pg_dump', ['--version'], { timeout: 5_000, encoding: 'utf8' });
    const version = (res.stdout ?? '').trim().replace(/^pg_dump \(PostgreSQL\)\s*/, '');
    const major = Number(version.split('.')[0]);
    return { available: res.status === 0 && Number.isFinite(major) && major >= 18, clientVersion: version };
  } catch {
    return { available: false, clientVersion: '' };
  }
}

const pgDumpProbe = detectPgDump();
const drillAvailable = pgDumpProbe.available;
const clientVersion = pgDumpProbe.clientVersion;

beforeAll(async () => {
  url = await ensureTestDatabase();
  backupDir = await mkdtemp(path.join(tmpdir(), 'hanaso-backup-drill-'));

  const { Pool } = await import('pg');
  const probe = new Pool({ connectionString: url, max: 1 });
  serverVersion = (await probe.query<{ v: string }>('SELECT current_setting($1) AS v', ['server_version'])).rows[0]!.v;
  await probe.end();

  // realistic state: content (seed) + user rows + the pgboss schema
  resetDbClientForTests();
  await refreshContentMap();
  const client = getDbClient();
  const attempts = new PgAttemptRepository(client);
  const progress = new PgProgressRepository(client);
  await attempts.create(
    {
      dialogueId: 'dlg-cafe-morning-01',
      userId: 'drill-user',
      scores: { M1: 1, M2: 1, M3: null, M4: 1, M5: 1 },
      weakPoints: [],
    },
    'passed',
  );
  await progress.upsert({
    userId: 'drill-user',
    dialogueId: 'dlg-cafe-morning-01',
    stage: 'D_mastery',
    status: 'understood',
    updatedAt: new Date().toISOString(),
  });

  boss = new PgBoss({ connectionString: url, max: 1, useListenNotify: false });
  await boss.start();
  await boss.createQueue('ops.backup'); // pg-boss 12: queue must exist before schedule
  await boss.schedule('ops.backup', '30 3 * * *', null, { tz: 'Asia/Tehran' });
});

afterAll(async () => {
  await boss?.stop({ graceful: true, timeout: 5_000 }).catch(() => undefined);
  resetDbClientForTests();
});

describe.skipIf(!drillAvailable)(DRILL_TITLE, () => {
  it('step 1 — takes a VERIFIED backup (pg_dump -Fc + pg_restore --list)', async () => {
    const outcome = await runBackup({ directUrl: url, backupDir });
    console.log('[drill] backup outcome:', JSON.stringify(outcome));

    expect(outcome.bytes).toBeGreaterThan(1000); // schema + data, not an empty file
    expect(outcome.archiveEntries).toBeGreaterThan(10); // TOC lists all relations
    expect(outcome.pgDumpVersion).toBe(clientVersion);
    expect(outcome.kept).toContain(outcome.file);
    expect((await readdir(backupDir)).filter((f) => f.endsWith('.dump'))).toHaveLength(1);
  });

  it('step 2 — restores the archive into an ISOLATED test database', async () => {
    const files = (await readdir(backupDir)).filter((f) => f.endsWith('.dump'));
    const result = await restoreDump({
      serverUrl: serverUrl(),
      file: path.join(backupDir, files[0]!),
      target: RESTORE_TARGET,
    });
    console.log('[drill] restore result:', JSON.stringify(result));
    expect(result.database).toBe(RESTORE_TARGET);
  });

  it('step 3 — per-table counts in the restored DB MATCH the source (data integrity)', async () => {
    const source = await runDbVerify({ url });
    const restored = await runDbVerify({ url: urlForDatabase(serverUrl(), RESTORE_TARGET) });
    console.log('[drill] source tables:', JSON.stringify(source.tables));
    console.log('[drill] restored tables:', JSON.stringify(restored.tables));

    expect(restored.tables).toEqual(source.tables);
    expect(restored.tables['app.dialogue_mastery_attempts']).toBe(1);
    expect(restored.tables['app.lesson_progress']).toBe(1);
    expect(restored.tables['content.dialogue_lines']).toBe(10);
    expect(restored.pgbossAvailable).toBe(true);
  });

  it('step 4 — refuses to restore into the LIVE database', async () => {
    const files = (await readdir(backupDir)).filter((f) => f.endsWith('.dump'));
    await expect(
      restoreDump({ serverUrl: url, file: path.join(backupDir, files[0]!), target: 'hanaso_test' }),
    ).rejects.toThrow(/LIVE database/);
  });

  it('step 5 — the source database stayed untouched and connected throughout', async () => {
    const source = await runDbVerify({ url });
    expect(source.tables['app.dialogue_mastery_attempts']).toBe(1);
    expect(source.tables['app.lesson_progress']).toBe(1);
    expect(source.pgbossAvailable).toBe(true);
  });
});

describe.skipIf(drillAvailable)('backup drill unavailable (documented skip)', () => {
  it('reports WHY it skipped (no compatible pg_dump on PATH)', () => {
    console.warn(
      `[drill] SKIPPED — pg_dump ${clientVersion || 'not found'} is not compatible with server ${serverVersion || 'unknown'}. ` +
        'The drill runs for real on the VPS (worker container ships postgresql18-client).',
    );
    expect(true).toBe(true);
  });
});
