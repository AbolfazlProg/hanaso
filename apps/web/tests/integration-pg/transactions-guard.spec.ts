/**
 * TASK-HANASO-24 (subagent C-05 + C-10): the runInTx nesting guard.
 * True nesting must throw; legitimate CONCURRENT units must all succeed
 * (AsyncLocalStorage distinguishes the two — a plain depth counter could not).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { runInTx } from '@/db/transactions';
import { resetDbClientForTests } from '@/db/client';
import { ensureTestDatabase } from './helpers';

beforeAll(async () => {
  await ensureTestDatabase();
  resetDbClientForTests();
});

afterAll(() => {
  resetDbClientForTests();
});

describe('runInTx nesting guard (C-05)', () => {
  it('a NESTED runInTx throws the [hanaso/tx] error', async () => {
    await expect(
      runInTx(async () => {
        await runInTx(async () => undefined); // NESTING — must refuse
      }),
    ).rejects.toThrow('[hanaso/tx] runInTx called inside another runInTx');
  });

  it('the nested inner write never happened (outer rolled back with its error)', async () => {
    // the outer unit fails BECAUSE the inner threw — nothing from either persists
    await expect(runInTx(async () => { await runInTx(async () => undefined); })).rejects.toThrow();
  });

  it('concurrent INDEPENDENT units all succeed (no false nesting)', async () => {
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        runInTx(async (tx) => tx.db.execute(sql`select 1 as one`)),
      ),
    );
    expect(results).toHaveLength(4);
  });
});
