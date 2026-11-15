/**
 * HANASO - Transaction helpers (TASK-HANASO-24 / CP-04 - audit BUG-036).
 * See git history for the full docblock; re-created after a sandbox file-cache
 * incident (the mid-file region kept serving a stale version).
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { getDbClient, databaseConfigured, type DbClient } from './client';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

/** C-05: nesting guard (AsyncLocalStorage distinguishes nesting from concurrency). */
const insideTx = new AsyncLocalStorage<boolean>();

/** True when writes go to Postgres and MUST be wrapped in transactions. */
export function usingDbTransactions(): boolean {
  return databaseConfigured();
}

/** One Postgres transaction per unit; tx-bound repositories join it. */
export async function runInTx<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
  if (insideTx.getStore()) {
    throw new Error('[hanaso/tx] runInTx called inside another runInTx - nest the work in ONE unit instead (a second connection would self-starve the pool).');
  }
  const outer = getDbClient();
  return insideTx.run(true, () => outer.db.transaction(async (tx) => fn(asTxClient(tx, outer.pool))));
}

/** Adapt a drizzle transaction handle to the DbClient shape (one contained cast). */
export function asTxClient(tx: unknown, pool: Pool): DbClient {
  return { db: tx as NodePgDatabase, pool };
}
