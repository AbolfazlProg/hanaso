/**
 * HANASO — database readiness check (TASK-M0-10 DB-layer / Issue #11).
 *
 * KB infrastructure-and-devops §پایش: `GET /api/ready` = `SELECT 1` روی PG از همان
 * pool اپ + timestamp — "deploy gate, Gatus probe, restore drill". Never a fake ready:
 * when DATABASE_URL is configured but unreachable → status 'fail' (route returns 503).
 */
import { databaseConfigured, getDbClient, inMemoryStoresAllowed } from './client';

export interface DatabaseReadiness {
  status: 'ok' | 'skipped' | 'fail';
  detail?: string;
  latencyMs?: number;
  serverVersion?: string;
}

/** One `SELECT 1` + `current_setting('server_version')` through the app pool. */
export async function checkDatabaseReadiness(): Promise<DatabaseReadiness> {
  if (!databaseConfigured()) {
    /*
     * TASK-HANASO-29 (Subagent B M2): in production a missing DATABASE_URL is a
     * REAL failure — the ready endpoint must never call a DATABASE-less
     * production process "ok" (deploy gates and probes rely on this signal).
     * Dev/test keeps the honest 'skipped' so local workflows stay green.
     */
    if (!inMemoryStoresAllowed()) {
      return {
        status: 'fail',
        detail: 'no DATABASE_URL configured in production (in-memory DEV-ONLY repositories are forbidden)',
      };
    }
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
