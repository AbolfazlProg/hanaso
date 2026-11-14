/**
 * HANASO — Postgres client (TASK-M0-10 DB-layer / Issue #11).
 *
 * Single pooled Drizzle client built from `DATABASE_URL` (KB database-architecture):
 * - driver: node-postgres (`pg`) — same driver pg-boss uses, one dependency.
 * - pooling: in production `DATABASE_URL` points at PgBouncer 1.26 (`pool_mode=transaction`,
 *   `auth_type=scram`, `max_prepared_statements=200` — KB §۸-۴). node-postgres uses the
 *   extended-query protocol with UNNAMED statements by default, which is safe behind
 *   transaction pooling; named statements are protocol-tracked server-side by PgBouncer
 *   1.21+ (KB's "pgbouncer=true" note was the postgres.js spelling — corrected here and
 *   verified against the PgBouncer FAQ "How to use prepared statements with transaction
 *   pooling?" + node-postgres behavior; see docs/OPERATIONS_GUIDE.fa.md §DB).
 * - `DIRECT_DATABASE_URL` (bypasses PgBouncer) is reserved for migrations, pg_dump and
 *   pg_restore (KB §۱: "اعمال با اتصال مستقیم، نه از PgBouncer").
 *
 * DEV-ONLY note: when no DATABASE_URL is set the app keeps running on the in-memory
 * repositories (see lib/poc/stores.ts) — this module is never constructed.
 */
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from '../../db/schema';

/** All schema tables (content + app) — imported for typed drizzle queries. */
export { schema };

export interface DbClient {
  db: NodePgDatabase;
  pool: Pool;
}

let client: DbClient | null = null;

/** Connection options for the app pool — conservative for a shared VPS. */
function poolOptions(): PoolConfig {
  const url = requiredDatabaseUrl();
  return {
    connectionString: url,
    // Small VPS with PgBouncer in front: few real connections are plenty for the PoC.
    max: Number(process.env.DB_POOL_MAX ?? 8),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Hard ceiling for every query (readiness included) — fail fast, never hang.
    query_timeout: 5_000,
    application_name: 'hanaso-web',
  };
}

/** DATABASE_URL or a clear error — the switch itself lives in lib/poc/stores.ts. */
export function requiredDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set — the Postgres layer requires it');
  return url;
}

/** True when the Postgres layer is enabled (used by stores + /api/ready switching). */
export function databaseConfigured(): boolean {
  return typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0;
}

/** Process-wide singleton (one pool per Node process — routes share it, KB §۸-۳). */
export function getDbClient(): DbClient {
  client ??= (() => {
    const pool = new Pool(poolOptions());
    // core query builder only (select/insert/update on explicit tables) — the
    // relational `db.query` API needs a flat table map and is not used.
    const db = drizzle(pool);
    return { db, pool };
  })();
  return client;
}

/** Reset the singleton — TEST-ONLY (each integration test file gets a fresh pool). */
export function resetDbClientForTests(): void {
  if (client) {
    void client.pool.end().catch(() => undefined);
    client = null;
  }
}
