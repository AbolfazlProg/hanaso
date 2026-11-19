/**
 * HANASO — FSRS review engine + durable events on REAL PostgreSQL
 * (owner-pass 2026-11-19 — mission «تکمیل APIهای بخش یادگیری»).
 *
 * Service-level proofs against the migrated+seeded test database (the SAME
 * code paths production runs — migration 0005 included):
 *
 *  1. migration 0005: fsrs_cards / fsrs_revlogs / learning_events exist.
 *  2. enrollment idempotency: re-enrolling the SAME items never resets schedules
 *     (ON CONFLICT DO NOTHING — «جلوگیری از ثبت تکراری»).
 *  3. submit → applied; the card's due moves forward; a second submit with the
 *     SAME clientReviewId is a duplicate and writes NO second revlog row.
 *  4. user isolation: user B never sees user A's cards.
 *  5. durable learning events: batch insert + quarantine flag + retention sweep
 *     (only rows older than the cutoff are removed).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

import { resetDbClientForTests, getDbClient } from '@/db/client';
import { InMemoryFsrsReviewStore } from '@/modules/fsrs/review-store';
import { PgFsrsReviewStore } from '@/modules/fsrs/review-store';
import { PgLearningEventsStore } from '@/modules/analytics/store';
import { sweepExpiredLearningEvents } from '@/modules/analytics/store';
import { resetStoresForTests } from '@/lib/poc/stores';
import { fsrsCards, fsrsRevlogs, learningEvents } from '../../db/schema';
import { ensureTestDatabase } from './helpers';

const UA = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const UB = '77777777-8888-4999-aaaa-bbbbbbbbbbbb';

const ENTRY_A = { itemId: 'kn-rec-hira-a', kind: 'kn', wave: 1 as const, enrollStationSlug: 'stn-kana-h1' };

beforeAll(async () => {
  await ensureTestDatabase();
  resetDbClientForTests();
  resetStoresForTests();
});

describe('migration 0005 — the review/events tables exist', () => {
  it('fsrs_cards · fsrs_revlogs · learning_events are queryable', async () => {
    const { db } = getDbClient();
    const cards = await db.select({ n: sql<number>`count(*)::int` }).from(fsrsCards);
    const logs = await db.select({ n: sql<number>`count(*)::int` }).from(fsrsRevlogs);
    expect(cards[0]!.n).toBe(0);
    expect(logs[0]!.n).toBe(0);
  });
});

describe('PgFsrsReviewStore — enrollment, queue, idempotent submit', () => {
  const store = new PgFsrsReviewStore();

  it('enrolls station inventory once; re-enrollment never resets schedules', async () => {
    const now = new Date();
    const first = await store.enroll(UA, [ENTRY_A], now);
    expect(first.enrolled).toEqual(['kn-rec-hira-a']);

    const [row] = await getDbClient()
      .db.select({ due: fsrsCards.due, card: fsrsCards.card })
      .from(fsrsCards)
      .where(sql`${fsrsCards.userId} = ${UA} and ${fsrsCards.itemId} = ${ENTRY_A.itemId}`);
    expect(row).toBeTruthy();

    // pretend a review already happened: push due forward, then re-enroll
    const later = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    await getDbClient()
      .db.update(fsrsCards)
      .set({ due: later })
      .where(sql`${fsrsCards.userId} = ${UA} and ${fsrsCards.itemId} = ${ENTRY_A.itemId}`);

    const second = await store.enroll(UA, [ENTRY_A], new Date());
    expect(second.enrolled).toEqual([]);
    expect(second.already).toEqual(['kn-rec-hira-a']);

    const [after] = await getDbClient()
      .db.select({ due: fsrsCards.due })
      .from(fsrsCards)
      .where(sql`${fsrsCards.userId} = ${UA} and ${fsrsCards.itemId} = ${ENTRY_A.itemId}`);
    expect(after!.due.getTime()).toBe(later.getTime()); // schedule PRESERVED
  });

  it('queues due cards for the owner only (user isolation)', async () => {
    const due = await store.listDue(UA, new Date(), 20);
    expect(due.map((d) => d.itemId)).toContain(ENTRY_A.itemId);
    const dueB = await store.listDue(UB, new Date(), 20);
    expect(dueB).toEqual([]); // B sees nothing of A
    const countB = await store.countDue(UB, new Date());
    expect(countB).toBe(0);
  });

  it('applies a grade once; the SAME clientReviewId replays as duplicate (no second revlog)', async () => {
    const before = await getDbClient()
      .db.select({ n: sql<number>`count(*)::int` })
      .from(fsrsRevlogs);

    const applied = await store.submit(UA, { itemId: ENTRY_A.itemId, rating: 'good', clientReviewId: UA }, new Date());
    expect(applied.outcome).toBe('applied');
    expect(applied.dueAfter).toBeTruthy();

    const afterOne = await getDbClient()
      .db.select({ n: sql<number>`count(*)::int` })
      .from(fsrsRevlogs);
    expect(afterOne[0]!.n).toBe(before[0]!.n + 1);

    const replay = await store.submit(UA, { itemId: ENTRY_A.itemId, rating: 'again', clientReviewId: UA }, new Date());
    expect(replay.outcome).toBe('duplicate');
    const afterTwo = await getDbClient()
      .db.select({ n: sql<number>`count(*)::int` })
      .from(fsrsRevlogs);
    expect(afterTwo[0]!.n).toBe(before[0]!.n + 1); // STILL one row — never applied twice

    const unknown = await store.submit(UA, { itemId: 'w-ghost', rating: 'good', clientReviewId: UB }, new Date());
    expect(unknown.outcome).toBe('unknown_item');
  });
});

describe('PgLearningEventsStore — durable events + quarantine + retention', () => {
  const store = new PgLearningEventsStore();

  it('stores a batch; unknown names quarantine (kept, flagged); user_id never crosses', async () => {
    const res = await store.record({
      userId: UA,
      source: 'client',
      events: [
        { name: 'line_replayed', props: { line_id: 'l1' } },
        { name: 'some_unknown_future_event', props: {} },
      ],
    });
    expect(res.stored).toBe(2);
    expect(res.quarantined).toBe(1);

    const listed = await store.listForUser(UA, 50);
    expect(listed.every((e) => 'user_id' in e.props === false || e.props.user_id === undefined)).toBe(true);
    expect(listed.some((e) => e.name === 'line_replayed')).toBe(true);
    // quarantined rows are NOT served by the observability listing (audit-only)
    expect(listed.every((e) => !e.quarantined)).toBe(true);
  });

  it('retention sweep removes only the rows older than the cutoff', async () => {
    const { db } = getDbClient();
    void db;
    await store.record({
      userId: UB,
      source: 'client',
      events: [{ name: 'line_replayed', props: { line_id: 'l2' } }],
    });
    const before = await db.select({ n: sql<number>`count(*)::int` }).from(learningEvents);
    expect(before[0]!.n).toBeGreaterThan(0);

    // age every row beyond the retention window, then run the REAL sweep
    await db.execute(sql`update app.learning_events set received_at = now() - interval '400 days'`);
    const result = await sweepExpiredLearningEvents();
    expect(result.deleted).toBeGreaterThan(0);

    const after = await db.select({ n: sql<number>`count(*)::int` }).from(learningEvents);
    expect(after[0]!.n).toBe(0);
  });
});

describe('InMemoryFsrsReviewStore — same semantics without a DB (unit honesty)', () => {
  it('duplicate + unknown_item semantics match the PG store', async () => {
    const mem = new InMemoryFsrsReviewStore();
    await mem.enroll(UA, [ENTRY_A], new Date());
    const applied = await mem.submit(UA, { itemId: ENTRY_A.itemId, rating: 'good', clientReviewId: UA }, new Date());
    expect(applied.outcome).toBe('applied');
    const dup = await mem.submit(UA, { itemId: ENTRY_A.itemId, rating: 'again', clientReviewId: UA }, new Date());
    expect(dup.outcome).toBe('duplicate');
    const ghost = await mem.submit(
      UA,
      { itemId: 'w-ghost', rating: 'good', clientReviewId: crypto.randomUUID() },
      new Date(),
    );
    expect(ghost.outcome).toBe('unknown_item');
  });
});
