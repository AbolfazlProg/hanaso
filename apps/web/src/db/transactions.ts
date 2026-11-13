/**
 * HANASO — Transaction helpers (TASK-HANASO-24 / CP-04 — audit BUG-036).
 *
 * The pre-24 codebase had ZERO transactions repo-wide: multi-step writes
 * (practice completion = 1 insert + N upserts; station completion = 2 upserts;
 * mastery gate = attempt insert + chapter fold) could fail midway and leave
 * contradictory state (session logged without evidence, station completed
 * without the chapter aggregate flipping, attempt recorded without the fold).
 *
 * `runInTx` runs a unit of work on ONE Postgres transaction with tx-bound
 * repository instances (construct the Pg repositories with the passed
 * DbClient). PgBouncer transaction pooling is compatible (each tx pins one
 * server connection; drizzle uses unnamed prepared statements — see
 * db/client.ts notes).
 *
 * The in-memory DEV mode has no transaction concept — callers branch on
 * `usingDbTransactions()` and run the same sequence sequentially (single
 * JS thread: no interleaving inside the process).
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { getDbClient, databaseConfigured, type DbClient } from './client';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

/**
 * TASK-HANASO-24 (subagent C-05): nesting guard. runInTx inside another
 * runInTx would open a SECOND pool connection (not a savepoint) — under load
 * that self-starves the pool. AsyncLocalStorage distinguishes true nesting
 * (same async chain) from legitimate concurrent units.
 */
const insideTx = new AsyncLocalStorage<boolean>();

/** True when writes go to Postgres and MUST be wrapped in transactions. */
export function usingDbTransactions(): boolean {
  return databaseConfigured();
}

/**
 * Wrap `fn` in a single Postgres transaction. `fn` receives a DbClient whose
 * `db` is the transaction handle — repositories constructed from it join the
 * transaction. Anything thrown inside rolls the whole unit back.
 */
export async function runInTx<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
  if (insideTx.getStore()) {
    throw new Error('[hanaso/tx] runInTx called inside another runInTx — nest the work in ONE unit instead (a second connection would self-starve the pool).');
  }
  const outer = getDbClient();
  return insideTx.run(true, () => outer.db.transaction(async (tx) => fn(asTxClient(tx, outer.pool))));
}

/** Adapt a drizzle transaction handle to the DbClient shape (one contained cast). */
export function asTxClient(tx: unknown, pool: Pool): DbClient {
  // PgTransaction and NodePgDatabase share the query-builder surface the
  // repositories use; the type system just models them separately. The cast
  // lives HERE once so no repository ever needs to know about it.
  return { db: tx as NodePgDatabase, pool };
}
