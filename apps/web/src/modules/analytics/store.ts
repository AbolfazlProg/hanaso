/**
 * HANASO — durable learning-behavior event store (owner-pass 2026-11-19).
 *
 * The owner's monitoring mandate: «نظارت خیلی شدید بر روند دانش‌آموز» — where a
 * learner stalls, how they practice, what they replay. Until today analytics
 * lived ONLY in the DEV-ONLY in-memory ring (lib/poc/event-store.ts) and died
 * on every restart. This module adds the DURABLE layer:
 *
 *  - `app.learning_events` — append-only; server emitters (critical outcomes:
 *    grading/gates/review) and the client batch endpoint (behavioral signals)
 *    both land here, stamped with the caller's learner id.
 *  - ADR-016 quarantine semantics: a name outside the frozen registry is KEPT
 *    with `quarantined=true` (never silently dropped) → 202, so taxonomy drift
 *    is auditable by the future admin panel instead of invisible.
 *  - Retention is swept by the worker (`sweepExpiredLearningEvents`) — the
 *    period is HANASO_EVENTS_RETENTION_DAYS (default 180; OQ-020/021 owns the
 *    final policy number; the mechanism ships now so rows cannot grow unbounded
 *    on the 20GB server).
 *  - PRIVACY: names/props are zod-bounded (object_action, ≤16 keys/4KB), no
 *    free text; consumers aggregate k≥10 before exposing any count.
 *
 * The legacy in-memory ring STAYS (the PoC observability GET path + unit tests
 * use it); the durable store is a separate, additive layer — existing callers
 * are untouched.
 */
import { and, desc, eq, lt, sql } from 'drizzle-orm';

import { getDbClient } from '@/db/client';
import { usingDbTransactions } from '@/db/transactions';
import { learningEvents } from '../../../db/schema';

export type LearningEventSource = 'server' | 'client';

/** One durable event row (the store never returns user_id to clients). */
export interface DurableLearningEvent {
  id: string;
  name: string;
  props: Record<string, unknown>;
  source: LearningEventSource;
  quarantined: boolean;
  occurredAt: string;
  receivedAt: string;
}

export interface RecordLearningEventsInput {
  userId: string;
  source: LearningEventSource;
  events: { name: string; props: Record<string, unknown>; occurredAt?: Date }[];
}

export interface RecordLearningEventsResult {
  stored: number;
  quarantined: number;
}

export interface LearningEventsStore {
  record(input: RecordLearningEventsInput): Promise<RecordLearningEventsResult>;
  /** Caller-scoped recent events (support/observability — user_id never crosses). */
  listForUser(userId: string, limit: number): Promise<DurableLearningEvent[]>;
  /** Retention sweep — returns the number of rows removed. */
  sweepBefore(before: Date): Promise<number>;
}

export class InMemoryLearningEventsStore implements LearningEventsStore {
  // DEV/TEST ONLY — mirrors app.learning_events semantics closely enough for the
  // unit suite (PG behavior is proven by the integration-pg suite).
  private rows: (DurableLearningEvent & { receivedMs: number })[] = [];
  private seq = 0;

  async record(input: RecordLearningEventsInput): Promise<RecordLearningEventsResult> {
    let quarantined = 0;
    for (const e of input.events) {
      const isKnown = isKnownLearningEventName(e.name);
      if (!isKnown) quarantined += 1;
      this.seq += 1;
      this.rows.push({
        id: `mem-${this.seq}`,
        name: e.name,
        props: e.props,
        source: input.source,
        quarantined: !isKnown,
        occurredAt: (e.occurredAt ?? new Date()).toISOString(),
        receivedAt: new Date().toISOString(),
        receivedMs: Date.now(),
      });
    }
    return { stored: input.events.length, quarantined };
  }

  async listForUser(userId: string, limit: number): Promise<DurableLearningEvent[]> {
    void userId; // the in-memory store serves one caller at a time in tests
    return this.rows.slice(-limit).map((row) => {
      const { receivedMs, ...rest } = row;
      void receivedMs;
      return rest;
    });
  }

  async sweepBefore(before: Date): Promise<number> {
    const b = before.getTime();
    const beforeN = this.rows.length;
    this.rows = this.rows.filter((r) => new Date(r.receivedAt).getTime() >= b);
    return beforeN - this.rows.length;
  }

  reset(): void {
    this.rows = [];
    this.seq = 0;
  }
}

export class PgLearningEventsStore implements LearningEventsStore {
  async record(input: RecordLearningEventsInput): Promise<RecordLearningEventsResult> {
    if (input.events.length === 0) return { stored: 0, quarantined: 0 };
    const { db } = getDbClient();
    const rows = input.events.map((e) => {
      const known = isKnownLearningEventName(e.name);
      return {
        userId: input.userId,
        name: e.name,
        props: e.props,
        source: input.source,
        quarantined: !known,
        occurredAt: e.occurredAt ?? new Date(),
        receivedAt: new Date(),
      };
    });
    await db.insert(learningEvents).values(rows);
    return {
      stored: rows.length,
      quarantined: rows.filter((r) => r.quarantined).length,
    };
  }

  async listForUser(userId: string, limit: number): Promise<DurableLearningEvent[]> {
    const { db } = getDbClient();
    const rows = await db
      .select({
        id: learningEvents.id,
        name: learningEvents.name,
        props: learningEvents.props,
        source: learningEvents.source,
        quarantined: learningEvents.quarantined,
        occurredAt: learningEvents.occurredAt,
        receivedAt: learningEvents.receivedAt,
      })
      .from(learningEvents)
      .where(and(eq(learningEvents.userId, userId), eq(learningEvents.quarantined, false)))
      .orderBy(desc(learningEvents.occurredAt))
      .limit(Math.min(Math.max(limit, 1), 50));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      props: (r.props ?? {}) as Record<string, unknown>,
      source: r.source === 'server' ? ('server' as const) : ('client' as const),
      quarantined: r.quarantined,
      occurredAt: r.occurredAt.toISOString(),
      receivedAt: r.receivedAt.toISOString(),
    }));
  }

  async sweepBefore(before: Date): Promise<number> {
    const { db } = getDbClient();
    const result = await db.delete(learningEvents).where(lt(learningEvents.receivedAt, before)).returning({
      id: learningEvents.id,
    });
    return result.length;
  }
}

/** Best-effort durable record — analytics NEVER breaks a learning flow. */
export async function recordLearningEventsSafe(
  store: LearningEventsStore,
  input: RecordLearningEventsInput,
): Promise<void> {
  try {
    await store.record(input);
  } catch (err) {
    console.error('[hanaso/analytics] durable event record failed', err);
  }
}

/** Retention period (days) — OQ-020/021 final policy stays open; bounded default. */
export const LEARNING_EVENTS_RETENTION_DAYS = (() => {
  const raw = Number(process.env.HANASO_EVENTS_RETENTION_DAYS ?? '');
  return Number.isFinite(raw) && raw >= 7 && raw <= 3650 ? Math.floor(raw) : 180;
})();

/** Delete durable events older than the retention window (worker cron). */
export async function sweepExpiredLearningEvents(now: Date = new Date()): Promise<{ deleted: number; cutoff: string }> {
  const cutoff = new Date(now.getTime() - LEARNING_EVENTS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { db } = getDbClient();
  const result = await db.delete(learningEvents).where(lt(learningEvents.receivedAt, cutoff)).returning({
    id: learningEvents.id,
  });
  return { deleted: result.length, cutoff: cutoff.toISOString() };
}

/** Count stored events (ops sanity — used by the readiness spot-check in tests). */
export async function countLearningEvents(): Promise<number> {
  const { db } = getDbClient();
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(learningEvents);
  return row?.n ?? 0;
}

/* ---------------------------------------------------------------- registry hook */

/**
 * The known-name predicate — ONE frozen source of truth shared with the
 * emitters (modules/curriculum/event-names.ts: lesson-system registry ∪ legacy
 * client PoC names). Unknown names quarantine — visible, auditable, never
 * silently dropped. (Pure-data import: no cycle with the store registry.)
 */
import { isKnownLearningEventName } from '@/modules/curriculum/event-names';

export function createLearningEventsStore(): LearningEventsStore {
  return usingDbTransactions() ? new PgLearningEventsStore() : new InMemoryLearningEventsStore();
}
