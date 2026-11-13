/**
 * HANASO — Practice Postgres repositories (TASK-HANASO-22).
 *
 * Persists independent-practice evidence in `app.practice_sessions` (append-only
 * log) and `app.learning_object_states` (per-user Learning Object practice
 * states) behind the same interfaces as the in-memory DEV twins. Same rules as
 * every HANASO store: user-scoped by the learner identity, no FK to content
 * tables (object ids are the stable content ids themselves), and NO FSRS
 * scheduling side-effects — this is evidence only.
 */
import { and, desc, eq } from 'drizzle-orm';
import type { LearningObjectRecord, StoredPracticeSession } from '@/modules/practice/session';
import type {
  InFlightSession,
  LearningObjectRepository,
  PracticeSessionRepository,
} from '@/modules/practice/repository';
import { learningObjectStates, practiceSessions } from '../../../db/schema';
import type { DbClient } from '../client';

/* ------------------------------------------------------------------ practice_sessions */

type SessionRow = {
  id: string;
  userId: string;
  skill: string;
  kind: string;
  scopeKey: string;
  itemResults: unknown;
  startedAt: Date;
  completedAt: Date | null;
};

function sessionRowToDomain(row: SessionRow): StoredPracticeSession {
  return {
    id: row.id,
    userId: row.userId,
    skill: row.skill as StoredPracticeSession['skill'],
    kind: row.kind as StoredPracticeSession['kind'],
    scopeKey: row.scopeKey,
    itemResults: (row.itemResults ?? []) as StoredPracticeSession['itemResults'],
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
  };
}

/**
 * Postgres implementation. In-flight sessions are NOT kept in the DB (they are
 * ephemeral server state with a 24h TTL) — the process-local map serves them;
 * only COMPLETED sessions persist (append-only, crash-safe, replayable).
 */
export class PgPracticeSessionRepository implements PracticeSessionRepository {
  private readonly inFlight = new Map<string, InFlightSession>();

  constructor(private readonly client: DbClient) {}

  async create(session: InFlightSession): Promise<void> {
    this.inFlight.set(session.id, session);
  }

  async get(sessionId: string): Promise<InFlightSession | null> {
    return this.inFlight.get(sessionId) ?? null;
  }

  /**
   * TASK-HANASO-24: IDEMPOTENT append. ON CONFLICT DO NOTHING — a concurrent
   * duplicate complete (both callers raced past the in-flight check) resolves
   * as 'already' instead of a raw 23505/500; the caller then skips the fold.
   */
  async recordCompleted(session: StoredPracticeSession): Promise<'recorded' | 'already'> {
    this.inFlight.delete(session.id);
    const rows = await this.client.db
      .insert(practiceSessions)
      .values({
        id: session.id,
        userId: session.userId,
        skill: session.skill,
        kind: session.kind,
        scopeKey: session.scopeKey,
        itemResults: session.itemResults,
        startedAt: new Date(session.startedAt),
        completedAt: session.completedAt ? new Date(session.completedAt) : new Date(),
      })
      .onConflictDoNothing({ target: practiceSessions.id })
      .returning({ id: practiceSessions.id });
    return rows.length > 0 ? 'recorded' : 'already';
  }

  async listForUser(userId: string, limit = 20): Promise<StoredPracticeSession[]> {
    const rows = await this.client.db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.userId, userId))
      .orderBy(desc(practiceSessions.startedAt))
      .limit(limit);
    return rows.map(sessionRowToDomain);
  }

  async sweepExpired(nowMs: number): Promise<number> {
    const ttl = 24 * 60 * 60 * 1000;
    let dropped = 0;
    for (const [id, s] of this.inFlight) {
      if (nowMs - s.startedAtMs > ttl) {
        this.inFlight.delete(id);
        dropped += 1;
      }
    }
    return dropped;
  }
}

/* ------------------------------------------------------------------ learning_object_states */

type LoRow = {
  userId: string;
  objectId: string;
  skill: string;
  state: string;
  dimensionStats: unknown;
  updatedAt: Date;
};

function loRowToDomain(row: LoRow): LearningObjectRecord {
  return {
    userId: row.userId,
    objectId: row.objectId,
    skill: row.skill as LearningObjectRecord['skill'],
    state: row.state as LearningObjectRecord['state'],
    dimensionStats: (row.dimensionStats ?? {}) as LearningObjectRecord['dimensionStats'],
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PgLearningObjectRepository implements LearningObjectRepository {
  constructor(private readonly client: DbClient) {}

  async get(userId: string, objectId: string): Promise<LearningObjectRecord | null> {
    const [row] = await this.client.db
      .select()
      .from(learningObjectStates)
      .where(and(eq(learningObjectStates.userId, userId), eq(learningObjectStates.objectId, objectId)))
      .limit(1);
    return row ? loRowToDomain(row) : null;
  }

  async upsert(record: LearningObjectRecord): Promise<LearningObjectRecord> {
    const now = new Date();
    const [row] = await this.client.db
      .insert(learningObjectStates)
      .values({
        userId: record.userId,
        objectId: record.objectId,
        skill: record.skill,
        state: record.state,
        dimensionStats: record.dimensionStats,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [learningObjectStates.userId, learningObjectStates.objectId],
        set: {
          state: record.state,
          dimensionStats: record.dimensionStats,
          updatedAt: now,
        },
      })
      .returning();
    return loRowToDomain(row!);
  }

  async listForUser(userId: string, skill?: LearningObjectRecord['skill']): Promise<LearningObjectRecord[]> {
    const where = skill
      ? and(eq(learningObjectStates.userId, userId), eq(learningObjectStates.skill, skill))
      : eq(learningObjectStates.userId, userId);
    const rows = await this.client.db.select().from(learningObjectStates).where(where);
    return rows.map(loRowToDomain);
  }
}
