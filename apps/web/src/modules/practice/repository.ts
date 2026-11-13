/**
 * HANASO — Practice repositories (TASK-HANASO-22).
 *
 * Two stores behind interfaces (the product's store-switching pattern):
 *  - PracticeSessionRepository: the append-only session log (server sessions
 *    in-flight + completed records).
 *  - LearningObjectRepository: per-user Learning Object practice states.
 *
 * The DEV-ONLY in-memory twins live here; the Postgres implementations live
 * in src/db/repositories/practice.ts behind the SAME interfaces (selected by
 * lib/poc/stores via DATABASE_URL — routes never see the implementation).
 */
import { randomUUID } from 'node:crypto';
import type { KeyedPracticeItem, LearningObjectRecord, StoredPracticeSession } from './session';

/* ------------------------------------------------------------------ in-flight sessions */

/** A generated session kept server-side until complete (TTL honesty: 24h). */
export interface InFlightSession {
  id: string;
  userId: string;
  skill: 'kana';
  kind: 'focused' | 'mixed';
  scopeKey: string;
  /** Keyed items — NEVER sent to the client unstripped. */
  items: KeyedPracticeItem[];
  /** Per-item attempts so far (id → attempts used, first-try flag). */
  progress: Map<string, { attempts: number; firstTryCorrect: boolean }>;
  startedAtMs: number;
}

export interface PracticeSessionRepository {
  create(session: InFlightSession): Promise<void>;
  get(sessionId: string): Promise<InFlightSession | null>;
  /** Persist a completed session (append-only log). */
  recordCompleted(session: StoredPracticeSession): Promise<void>;
  listForUser(userId: string, limit?: number): Promise<StoredPracticeSession[]>;
  /** Test/maintenance hook: drop sessions older than the TTL. */
  sweepExpired(nowMs: number): Promise<number>;
}

export const IN_FLIGHT_TTL_MS = 24 * 60 * 60 * 1000;

export class InMemoryPracticeSessionRepository implements PracticeSessionRepository {
  private readonly inFlight = new Map<string, InFlightSession>();
  private readonly completed: StoredPracticeSession[] = [];

  async create(session: InFlightSession): Promise<void> {
    this.inFlight.set(session.id, session);
  }

  async get(sessionId: string): Promise<InFlightSession | null> {
    return this.inFlight.get(sessionId) ?? null;
  }

  async recordCompleted(session: StoredPracticeSession): Promise<void> {
    this.inFlight.delete(session.id);
    this.completed.push(session);
  }

  async listForUser(userId: string, limit = 20): Promise<StoredPracticeSession[]> {
    return this.completed
      .filter((s) => s.userId === userId)
      .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
      .slice(0, limit);
  }

  async sweepExpired(nowMs: number): Promise<number> {
    let dropped = 0;
    for (const [id, s] of this.inFlight) {
      if (nowMs - s.startedAtMs > IN_FLIGHT_TTL_MS) {
        this.inFlight.delete(id);
        dropped += 1;
      }
    }
    return dropped;
  }
}

export function newSessionId(): string {
  return randomUUID();
}

/* ------------------------------------------------------------------ learning objects */

export interface LearningObjectRepository {
  get(userId: string, objectId: string): Promise<LearningObjectRecord | null>;
  /** Upsert one record (the caller folds results first — evidence.ts). */
  upsert(record: LearningObjectRecord): Promise<LearningObjectRecord>;
  listForUser(userId: string, skill?: LearningObjectRecord['skill']): Promise<LearningObjectRecord[]>;
}

export class InMemoryLearningObjectRepository implements LearningObjectRepository {
  private readonly byKey = new Map<string, LearningObjectRecord>();

  private key(userId: string, objectId: string): string {
    return `${userId}::${objectId}`;
  }

  async get(userId: string, objectId: string): Promise<LearningObjectRecord | null> {
    return this.byKey.get(this.key(userId, objectId)) ?? null;
  }

  async upsert(record: LearningObjectRecord): Promise<LearningObjectRecord> {
    this.byKey.set(this.key(record.userId, record.objectId), { ...record });
    return record;
  }

  async listForUser(userId: string, skill?: LearningObjectRecord['skill']): Promise<LearningObjectRecord[]> {
    const all = [...this.byKey.values()].filter((r) => r.userId === userId);
    return skill ? all.filter((r) => r.skill === skill) : all;
  }
}
