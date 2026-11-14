/**
 * HANASO — database readiness check (TASK-M0-10 DB-layer / Issue #11).
 *
 * KB infrastructure-and-devops §پایش: `GET /api/ready` = `SELECT 1` روی PG از همان
 * pool اپ + timestamp — "deploy gate, Gatus probe, restore drill". Never a fake ready:
 * when DATABASE_URL is configured but unreachable → status 'fail' (route returns 503).
 */
import { databaseConfigured, getDbClient } from './client';

export interface DatabaseReadiness {
  status: 'ok' | 'skipped' | 'fail';
  detail?: string;
  latencyMs?: number;
  serverVersion?: string;
}

/** One `SELECT 1` + `current_setting('server_version')` through the app pool. */
export async function checkDatabaseReadiness(): Promise<DatabaseReadiness> {
  if (!databaseConfigured()) {
    return {
      status: 'skipped',
      detail: 'no DATABASE_URL configured (in-memory DEV-ONLY repositories active)',
    };
  }
  const started = Date.now();
  try {
    const { pool } = getDbClient();
    const result = await pool.query<{ server_version: string }>({
      text: 'SELECT current_setting($1) AS server_version, 1 AS one',
      values: ['server_version'],
    });
    return {
      status: 'ok',
      latencyMs: Date.now() - started,
      serverVersion: result.rows[0]?.server_version,
    };
  } catch (err) {
    // server-side log keeps the raw driver error for ops; the public route redacts it
    console.error(
      JSON.stringify({
        at: new Date().toISOString(),
        kind: 'readiness-database-fail',
        message: err instanceof Error ? err.message : String(err),
      }),
    );
    return {
      status: 'fail',
      detail: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - started,
    };
  }
}
