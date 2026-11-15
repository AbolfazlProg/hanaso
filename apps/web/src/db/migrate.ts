/**
 * HANASO — migration runner (TASK-M0-10 DB-layer / Issue #11).
 *
 * Applies the committed drizzle SQL migrations (`db/migrations/*.sql` + journal) using
 * drizzle-orm's runtime migrator — the library twin of `drizzle-kit migrate`, same file
 * format and the same `drizzle.__drizzle_migrations` bookkeeping table, so the two are
 * interchangeable (KB database-architecture §۱: «فایل SQL در ریپو، اعمال در استقرار»).
 *
 * ALWAYS from a DIRECT connection (never through PgBouncer — KB §۱/§۸-۴): the caller
 * passes the URL; the CLI resolves DIRECT_DATABASE_URL → DATABASE_URL fallback.
 */
import path from 'node:path';
import { existsSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/**
 * Resolve the migrations folder across dev / standalone / container layouts:
 * - dev (cwd = apps/web):            <cwd>/db/migrations
 * - standalone run from root or /app: <cwd>/apps/web/db/migrations
 * - explicit override:                HANASO_MIGRATIONS_DIR
 */
export function resolveMigrationsDir(explicit?: string): string {
  if (explicit) return path.resolve(explicit);
  const fromEnv = process.env.HANASO_MIGRATIONS_DIR;
  if (fromEnv) return path.resolve(fromEnv);
  const candidates = [
    path.join(process.cwd(), 'db', 'migrations'),
    path.join(process.cwd(), 'apps', 'web', 'db', 'migrations'),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(`migrations folder not found (tried: ${candidates.join(', ')})`);
}

export interface MigrationResult {
  migrationsFolder: string;
  applied: true;
}

/** Run all pending migrations on a dedicated short-lived direct connection. */
export async function runMigrations(options: { url: string; migrationsFolder?: string }): Promise<MigrationResult> {
  const migrationsFolder = resolveMigrationsDir(options.migrationsFolder);
  const pool = new Pool({
    connectionString: options.url,
    max: 1,
    connectionTimeoutMillis: 10_000,
    application_name: 'hanaso-migrate',
  });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder });
    return { migrationsFolder, applied: true };
  } finally {
    await pool.end();
  }
}
