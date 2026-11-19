/**
 * HANASO — FSRS review store (owner-pass 2026-11-19 — mission «تکمیل APIهای بخش یادگیری»).
 *
 * The REAL implementation of the `FsrsReviewPort` contract (./integration.ts) that
 * shipped honestly throwing until today. Scheduling math stays in the pinned
 * wrapper (../index.ts — ts-fsrs v6 'FSRS-6', enable_fuzz off); THIS module owns
 * only persistence + identity + idempotency:
 *
 *  - `app.fsrs_cards` — ONE row per (user, item): ts-fsrs Card jsonb + lifted
 *    `due`/`card_state` columns for the queue scan. Enrollment is station-
 *    completion-driven (DD-095 §۲) with ON CONFLICT DO NOTHING — re-completing
 *    a station NEVER resets a card's schedule (mission rule: no duplicate writes).
 *  - `app.fsrs_revlogs` — append-only review log; `client_review_id` is UNIQUE
 *    across the table, so a retried submit (flaky network, double tap) resolves
 *    to `duplicate` instead of applying the grade twice.
 *  - Concurrent submits for the SAME user serialize on a transaction-scoped
 *    advisory lock (same pattern as submitMasteryWithFold) — the read-modify-
 *    write of the card row can never interleave.
 *
 * Store switching follows the lib/poc/stores.ts contract: DATABASE_URL set →
 * Postgres; otherwise the honest in-memory DEV/TEST fallback (identical
 * semantics, production is fail-closed through assertStoreBackend).
 */
import { and, eq, lte, sql } from 'drizzle-orm';
import type { Card } from 'ts-fsrs';

import { getDbClient } from '@/db/client';
import { runInTx, usingDbTransactions } from '@/db/transactions';
import { fsrsCards, fsrsRevlogs } from '../../../db/schema';
import { createEmptyCard } from './index';
import type { FsrsRating } from './integration';

/** A queued review candidate — exactly the contract's FsrsReviewCandidate + identity. */
export interface FsrsQueueItem {
  itemId: string;
  kind: string;
  wave: 1 | 2;
  dueAt: string; // ISO — absolute UTC (display groups by 4am Asia/Tehran day boundary upstream)
  contextLineId?: string;
}

/** Enrollment entry — derived from the chapter inventory (listChapterCards). */
export interface FsrsEnrollEntry {
  itemId: string;
  kind: string;
  wave: 1 | 2;
  enrollStationSlug: string;
  contextLineId?: string;
}

export type FsrsSubmitOutcome = 'applied' | 'duplicate' | 'unknown_item';

export interface FsrsSubmitResult {
  itemId: string;
  clientReviewId: string;
  outcome: FsrsSubmitOutcome;
  /** Post-review schedule (present when applied) — the client renders the next due. */
  dueAfter?: string;
  stateAfter?: number;
}

/** The persistence surface of the review engine (registered in lib/poc/stores.ts). */
export interface FsrsReviewStore {
  /** Cards due at-or-before `now`, oldest due first, bounded (limit ≤ 50). */
  listDue(userId: string, now: Date, limit: number): Promise<FsrsQueueItem[]>;
  /** Count of currently-due cards (for «پنل من» — no card payload crosses). */
  countDue(userId: string, now: Date): Promise<number>;
  /** Station-completion enrollment — idempotent (existing cards untouched). */
  enroll(userId: string, entries: FsrsEnrollEntry[], now: Date): Promise<{ enrolled: string[]; already: string[] }>;
  /** One graded retrieval, idempotent on clientReviewId. Unknown item → honest refusal. */
  submit(
    userId: string,
    input: { itemId: string; rating: FsrsRating; clientReviewId: string },
    now: Date,
  ): Promise<FsrsSubmitResult>;
}

const GRADE_BY_RATING: Record<FsrsRating, 1 | 2 | 3 | 4> = { again: 1, hard: 2, good: 3, easy: 4 };

/* ------------------------------------------------------------ in-memory (DEV/TEST) */

interface MemCard {
  kind: string;
  wave: 1 | 2;
  enrollStationSlug: string;
  contextLineId?: string;
  card: Card;
  lastReviewAt?: Date;
}

export class InMemoryFsrsReviewStore implements FsrsReviewStore {
  // DEV/TEST ONLY — production is fail-closed to Postgres (assertStoreBackend).
  private readonly cards = new Map<string, MemCard>();
  private readonly seenReviewIds = new Set<string>();

  private key(userId: string, itemId: string): string {
    return `${userId}\u0000${itemId}`;
  }

  async listDue(userId: string, now: Date, limit: number): Promise<FsrsQueueItem[]> {
    const items: (FsrsQueueItem & { dueMs: number })[] = [];
    for (const [key, row] of this.cards) {
      if (!key.startsWith(`${userId}\u0000`)) continue;
      if (row.card.due.getTime() > now.getTime()) continue;
      items.push({
        itemId: key.slice(userId.length + 1),
        kind: row.kind,
        wave: row.wave,
        dueAt: row.card.due.toISOString(),
        contextLineId: row.contextLineId,
        dueMs: row.card.due.getTime(),
      });
    }
    items.sort((a, b) => a.dueMs - b.dueMs);
    return items.slice(0, Math.min(limit, 50)).map((item) => {
      const { dueMs, ...rest } = item;
      void dueMs;
      return rest;
    });
  }

  async countDue(userId: string, now: Date): Promise<number> {
    let n = 0;
    for (const [key, row] of this.cards) {
      if (key.startsWith(`${userId}\u0000`) && row.card.due.getTime() <= now.getTime()) n += 1;
    }
    return n;
  }

  async enroll(
    userId: string,
    entries: FsrsEnrollEntry[],
    now: Date,
  ): Promise<{ enrolled: string[]; already: string[] }> {
    const enrolled: string[] = [];
    const already: string[] = [];
    for (const e of entries) {
      const key = this.key(userId, e.itemId);
      if (this.cards.has(key)) {
        already.push(e.itemId);
        continue;
      }
      this.cards.set(key, {
        kind: e.kind,
        wave: e.wave,
        enrollStationSlug: e.enrollStationSlug,
        contextLineId: e.contextLineId,
        card: createEmptyCard(now),
      });
      enrolled.push(e.itemId);
    }
    return { enrolled, already };
  }

  async submit(
    userId: string,
    input: { itemId: string; rating: FsrsRating; clientReviewId: string },
    now: Date,
  ): Promise<FsrsSubmitResult> {
    if (this.seenReviewIds.has(input.clientReviewId)) {
      return { itemId: input.itemId, clientReviewId: input.clientReviewId, outcome: 'duplicate' };
    }
    const row = this.cards.get(this.key(userId, input.itemId));
    if (!row) return { itemId: input.itemId, clientReviewId: input.clientReviewId, outcome: 'unknown_item' };
    // Same math as production: the wrapper's engine().next(card, now, grade).
    const { review } = await import('./index');
    const result = review(
      { itemId: input.itemId, contextLineId: row.contextLineId ?? '', card: row.card },
      input.rating,
      now,
    );
    row.card = result.item.card;
    row.lastReviewAt = now;
    this.seenReviewIds.add(input.clientReviewId);
    return {
      itemId: input.itemId,
      clientReviewId: input.clientReviewId,
      outcome: 'applied',
      dueAfter: row.card.due.toISOString(),
      stateAfter: Number(result.item.card.state),
    };
  }

  /** Test helper — reset the fallback between unit cases. */
  reset(): void {
    this.cards.clear();
    this.seenReviewIds.clear();
  }
}

/* ------------------------------------------------------------ Postgres */

/** Hash the (user,item) lock namespace — bigint advisory key, tx-scoped. */
function advisoryKey(userId: string): string {
  return `126100:${userId}`;
}

export class PgFsrsReviewStore implements FsrsReviewStore {
  async listDue(userId: string, now: Date, limit: number): Promise<FsrsQueueItem[]> {
    const { db } = getDbClient();
    const rows = await db
      .select({
        itemId: fsrsCards.itemId,
        kind: fsrsCards.kind,
        wave: fsrsCards.wave,
        due: fsrsCards.due,
        contextLineId: fsrsCards.contextLineId,
      })
      .from(fsrsCards)
      .where(and(eq(fsrsCards.userId, userId), lte(fsrsCards.due, now)))
      .orderBy(fsrsCards.due)
      .limit(Math.min(Math.max(limit, 1), 50));
    return rows.map((r) => ({
      itemId: r.itemId,
      kind: r.kind,
      wave: r.wave === 2 ? 2 : 1,
      dueAt: r.due.toISOString(),
      contextLineId: r.contextLineId ?? undefined,
    }));
  }

  async countDue(userId: string, now: Date): Promise<number> {
    const { db } = getDbClient();
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(fsrsCards)
      .where(and(eq(fsrsCards.userId, userId), lte(fsrsCards.due, now)));
    return row?.n ?? 0;
  }

  async enroll(
    userId: string,
    entries: FsrsEnrollEntry[],
    now: Date,
  ): Promise<{ enrolled: string[]; already: string[] }> {
    if (entries.length === 0) return { enrolled: [], already: [] };
    const fresh = createEmptyCard(now);
    return runInTx(async (tx) => {
      const rows = entries.map((e) => ({
        userId,
        itemId: e.itemId,
        kind: e.kind,
        wave: e.wave,
        enrolledStation: e.enrollStationSlug,
        contextLineId: e.contextLineId ?? null,
        card: fresh,
        due: fresh.due,
        cardState: Number(fresh.state),
        enrolledAt: now,
      }));
      // ON CONFLICT DO NOTHING — re-completing a station never resets schedules.
      const inserted = await tx.db
        .insert(fsrsCards)
        .values(rows)
        .onConflictDoNothing()
        .returning({ itemId: fsrsCards.itemId });
      const insertedSet = new Set(inserted.map((r) => r.itemId));
      return {
        enrolled: entries.filter((e) => insertedSet.has(e.itemId)).map((e) => e.itemId),
        already: entries.filter((e) => !insertedSet.has(e.itemId)).map((e) => e.itemId),
      };
    });
  }

  async submit(
    userId: string,
    input: { itemId: string; rating: FsrsRating; clientReviewId: string },
    now: Date,
  ): Promise<FsrsSubmitResult> {
    const { review } = await import('./index');
    const grade = GRADE_BY_RATING[input.rating];
    return runInTx(async (tx) => {
      // Serialize the read-modify-write per user (same contract as the mastery attempt counter).
      await tx.db.execute(sql`select pg_advisory_xact_lock(hashtext(${advisoryKey(userId)}))`);

      // Idempotency FIRST — a retried submit (same clientReviewId) is a duplicate,
      // never a second application of the grade (unique index backs this).
      const [prior] = await tx.db
        .select({ id: fsrsRevlogs.id, dueAfter: fsrsRevlogs.dueAfter, cardAfter: fsrsRevlogs.cardAfter })
        .from(fsrsRevlogs)
        .where(eq(fsrsRevlogs.clientReviewId, input.clientReviewId))
        .limit(1);
      if (prior) {
        return {
          itemId: input.itemId,
          clientReviewId: input.clientReviewId,
          outcome: 'duplicate' as const,
          dueAfter: prior.dueAfter.toISOString(),
          stateAfter: Number((prior.cardAfter as Card).state ?? 2),
        };
      }

      const [cardRow] = await tx.db
        .select({ card: fsrsCards.card, contextLineId: fsrsCards.contextLineId })
        .from(fsrsCards)
        .where(and(eq(fsrsCards.userId, userId), eq(fsrsCards.itemId, input.itemId)))
        .limit(1);
      if (!cardRow) {
        return { itemId: input.itemId, clientReviewId: input.clientReviewId, outcome: 'unknown_item' as const };
      }

      const result = review(
        { itemId: input.itemId, contextLineId: cardRow.contextLineId ?? '', card: cardRow.card },
        input.rating,
        now,
      );
      const after = result.item.card;

      await tx.db.insert(fsrsRevlogs).values({
        userId,
        itemId: input.itemId,
        clientReviewId: input.clientReviewId,
        rating: input.rating,
        grade,
        cardBefore: cardRow.card,
        cardAfter: after,
        dueAfter: after.due,
        reviewedAt: now,
      });

      await tx.db
        .update(fsrsCards)
        .set({
          card: after,
          due: after.due,
          cardState: Number(after.state),
          lastReviewAt: now,
          updatedAt: now,
        })
        .where(and(eq(fsrsCards.userId, userId), eq(fsrsCards.itemId, input.itemId)));

      return {
        itemId: input.itemId,
        clientReviewId: input.clientReviewId,
        outcome: 'applied' as const,
        dueAfter: after.due.toISOString(),
        stateAfter: Number(after.state),
      };
    });
  }
}

/** The active store (registered in lib/poc/stores.ts — DATABASE_URL switch). */
export function createFsrsReviewStore(): FsrsReviewStore {
  return usingDbTransactions() ? new PgFsrsReviewStore() : new InMemoryFsrsReviewStore();
}
