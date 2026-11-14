/**
 * HANASO — daily DB verify job (TASK-M0-10 DB-layer / Issue #11).
 *
 * A cheap, honest consistency probe scheduled right after the nightly backup (04:00
 * Asia/Tehran): table counts + newest row timestamps + pg-boss queue depth. Logged by
 * the worker (docker logs) and returned as JSON so the drill script can diff it against
 * the restore-verification output (same query, different database).
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export interface DbVerifyReport {
  database: string;
  checkedAt: string;
  serverVersion: string;
  tables: Record<string, number>;
  newest: { attempts: string | null; lessonProgress: string | null };
  pgboss: Record<string, number>;
  /** false when the pgboss schema is absent (e.g. a fresh DB before the worker booted). */
  pgbossAvailable: boolean;
}

/** The canonical per-table count list — shared by verify + restore drills. */
export const VERIFY_TABLES = [
  'content.characters',
  'content.dialogues',
  'content.dialogue_lines',
  'content.lessons',
  'app.dialogue_mastery_attempts',
  'app.lesson_progress',
] as const;

export async function runDbVerify(options: { url: string }): Promise<DbVerifyReport> {
  const pool = new Pool({ connectionString: options.url, max: 1, connectionTimeoutMillis: 10_000 });
  try {
    const db = drizzle(pool);
    const database = (await pool.query<{ name: string }>('SELECT current_database() AS name')).rows[0]?.name ?? '';
    const serverVersion =
      (await pool.query<{ server_version: string }>('SELECT current_setting($1) AS server_version', ['server_version']))
        .rows[0]?.server_version ?? '';

    const tables: Record<string, number> = {};
    for (const table of VERIFY_TABLES) {
      const [schemaName, tableName] = table.split('.');
      const result = await db.execute(sql.raw(`select count(*)::int as count from "${schemaName}"."${tableName}"`));
      tables[table] = Number((result.rows[0] as { count: number }).count);
    }

    const newestAttempts =
      (
        await pool.query<{ max: string | null }>(
          'SELECT max(created_at)::text AS max FROM app.dialogue_mastery_attempts',
        )
      ).rows[0]?.max ?? null;
    const newestProgress =
      (await pool.query<{ max: string | null }>('SELECT max(updated_at)::text AS max FROM app.lesson_progress')).rows[0]
        ?.max ?? null;

    let pgboss: Record<string, number> = {};
    let pgbossAvailable = false;
    try {
      const pgbossRows = (
        await pool.query<{ state: string; count: string }>(
          'SELECT state, count(*) AS count FROM pgboss.job GROUP BY state',
        )
      ).rows;
      pgbossAvailable = true;
      for (const row of pgbossRows) pgboss[row.state] = Number(row.count);
    } catch {
      pgboss = {};
    }

    return {
      database,
      checkedAt: new Date().toISOString(),
      serverVersion,
      tables,
      newest: { attempts: newestAttempts, lessonProgress: newestProgress },
      pgboss,
      pgbossAvailable,
    };
  } finally {
    await pool.end();
  }
}
