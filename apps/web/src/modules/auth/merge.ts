/**
 * HANASO — guest→account progress migration (M1 · AUTH-ACCOUNTS — mission §۳).
 *
 * «مهاجرت کاربران و اطلاعات موجود»: the pre-account product keyed every
 * progress row to the per-browser guest cookie uuid (`hanaso_lid`). When that
 * browser's owner signs up (or logs in), those rows must follow them into the
 * account — exactly once, never into someone else's account, never lost.
 *
 * Safety rails (all inside ONE transaction):
 *  - the guest id must be a UUID-shaped signed-cookie value (never 'guest');
 *  - it must not be an existing ACCOUNT id (paranoia — uuidv7 user ids are
 *    uuid-shaped too; a users row match means someone's cookie was already
 *    tampered/merged — refuse, keep rows untouched);
 *  - the learner_merges ledger makes each guest id mergeable exactly ONCE
 *    (re-login on the same browser is a no-op — no double-merge, no
 *    collision explosions);
 *  - for keyed tables (station_progress, chapter_progress, lesson_progress,
 *    learning_object_states, fsrs_cards) guest rows that would collide with an
 *    account row are DELETED (the account's own newer row wins — merge happens
 *    at signup where the account is empty, so this is the pathological-only
 *    path); dialogue_mastery_attempts collides on (dialogue, attempt_no) —
 *    same rule; practice_sessions/fsrs_revlogs/learning_events are append-only
 *    (no user-scoped key) — plain re-point.
 */
import { eq, sql } from 'drizzle-orm';
import { getDbClient } from '@/db/client';
import { learnerMerges, users } from '../../../db/schema';
import { runInTx } from '@/db/transactions';
import { isLearnerId } from '@/lib/learner/identity';

/** The outcome the routes surface to the UI (honest counts, no fake success). */
export interface MergeOutcome {
  readonly merged: boolean;
  readonly reason?: 'guest_scope' | 'not_an_identity' | 'already_merged' | 'is_account' | 'no_rows';
}

/** All user-scoped app tables, in one place — the migration contract. */
const USER_SCOPED_TABLES = {
  keyed: [
    // [table, key_column] — composite (user_id, key) uniqueness
    ['app.station_progress', 'station_id'],
    ['app.chapter_progress', 'unit_id'],
    ['app.lesson_progress', 'lesson_id'],
    ['app.learning_object_states', 'object_id'],
    ['app.fsrs_cards', 'item_id'],
  ] as const,
  attemptKeyed: ['app.dialogue_mastery_attempts', 'dialogue_id'] as const,
  plain: ['app.practice_sessions', 'app.fsrs_revlogs', 'app.learning_events'] as const,
};

export async function mergeGuestProgress(guestLearnerId: string, toUserId: string): Promise<MergeOutcome> {
  if (!isLearnerId(guestLearnerId)) return { merged: false, reason: 'not_an_identity' };
  const { db } = getDbClient();
  // Already merged once → no-op (the ledger row is the proof).
  const merged = await db
    .select({ from: learnerMerges.fromLearnerId })
    .from(learnerMerges)
    .where(eq(learnerMerges.fromLearnerId, guestLearnerId))
    .limit(1);
  if (merged[0]) return { merged: false, reason: 'already_merged' };
  // The guest id must not be a live account id (tamper paranoia — never move
  // an account's rows onto another account).
  const asUser = await db.select({ id: users.id }).from(users).where(eq(users.id, guestLearnerId)).limit(1);
  if (asUser[0]) return { merged: false, reason: 'is_account' };

  const hasRows = await hasAnyRows(guestLearnerId);
  if (!hasRows) {
    // Still ledger the id so a later browser reuse cannot resurrect it.
    await db.insert(learnerMerges).values({ fromLearnerId: guestLearnerId, toUserId }).onConflictDoNothing();
    return { merged: false, reason: 'no_rows' };
  }

  await runInTx(async (tx) => {
    const d = tx.db;
    for (const [table, key] of USER_SCOPED_TABLES.keyed) {
      // colliding guest rows are dropped (the account row wins), the rest re-point
      await d.execute(
        sql.raw(
          `DELETE FROM ${table} g WHERE g.user_id = '${sqlEscaped(guestLearnerId)}' AND EXISTS (
             SELECT 1 FROM ${table} u WHERE u.user_id = '${sqlEscaped(toUserId)}' AND u.${key} = g.${key})`,
        ),
      );
      await d.execute(
        sql.raw(
          `UPDATE ${table} SET user_id = '${sqlEscaped(toUserId)}' WHERE user_id = '${sqlEscaped(guestLearnerId)}'`,
        ),
      );
    }
    // attempts: unique (user_id, dialogue_id, attempt_no)
    await d.execute(
      sql.raw(
        `DELETE FROM ${USER_SCOPED_TABLES.attemptKeyed[0]} g WHERE g.user_id = '${sqlEscaped(guestLearnerId)}' AND EXISTS (
           SELECT 1 FROM ${USER_SCOPED_TABLES.attemptKeyed[0]} u
           WHERE u.user_id = '${sqlEscaped(toUserId)}' AND u.${USER_SCOPED_TABLES.attemptKeyed[1]} = g.${USER_SCOPED_TABLES.attemptKeyed[1]}
             AND u.attempt_no = g.attempt_no)`,
      ),
    );
    await d.execute(
      sql.raw(
        `UPDATE ${USER_SCOPED_TABLES.attemptKeyed[0]} SET user_id = '${sqlEscaped(toUserId)}' WHERE user_id = '${sqlEscaped(guestLearnerId)}'`,
      ),
    );
    for (const table of USER_SCOPED_TABLES.plain) {
      await d.execute(
        sql.raw(
          `UPDATE ${table} SET user_id = '${sqlEscaped(toUserId)}' WHERE user_id = '${sqlEscaped(guestLearnerId)}'`,
        ),
      );
    }
    await d.insert(learnerMerges).values({ fromLearnerId: guestLearnerId, toUserId }).onConflictDoNothing();
  });
  return { merged: true };
}

/** Would this guest id merge anything? (used by the signup confirmation copy). */
export async function hasAnyRows(learnerId: string): Promise<boolean> {
  const { db } = getDbClient();
  const result = await db.execute(
    sql`select
      (select count(*) from app.station_progress where user_id = ${learnerId}) +
      (select count(*) from app.chapter_progress where user_id = ${learnerId}) +
      (select count(*) from app.lesson_progress where user_id = ${learnerId}) +
      (select count(*) from app.dialogue_mastery_attempts where user_id = ${learnerId}) +
      (select count(*) from app.practice_sessions where user_id = ${learnerId}) +
      (select count(*) from app.learning_object_states where user_id = ${learnerId}) +
      (select count(*) from app.fsrs_cards where user_id = ${learnerId}) +
      (select count(*) from app.fsrs_revlogs where user_id = ${learnerId}) as total`,
  );
  const row = (result.rows?.[0] ?? {}) as { total?: number | string };
  const total = Number(row.total ?? 0);
  return Number.isFinite(total) && total > 0;
}

/** uuid chars only — both ids came from validated UUID regex anyway. Belt+suspenders. */
function sqlEscaped(id: string): string {
  const clean = id.replace(/[^0-9a-fA-F-]/g, '');
  if (!/^[0-9a-fA-F-]{36}$/.test(clean)) throw new Error('merge id failed sanitization');
  return clean;
}
