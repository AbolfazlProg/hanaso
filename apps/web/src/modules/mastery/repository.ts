/**
 * HANASO — Mastery attempt repository (TASK-DLG-POC-01 → Postgres in TASK-M0-10 / Issue #11).
 *
 * The interface is ASYNC since M0-10: the Postgres implementation writes
 * `app.dialogue_mastery_attempts` (KB dialogue-content-schema §۳) behind the same
 * contract — route handlers never touch the implementation directly.
 */
import { randomUUID } from 'node:crypto';
import type { AttemptInput, DialogueMasteryAttempt } from './types';

export interface AttemptRepository {
  create(input: AttemptInput, outcome: DialogueMasteryAttempt['outcome']): Promise<DialogueMasteryAttempt>;
  list(dialogueId?: string): Promise<DialogueMasteryAttempt[]>;
  /**
   * TASK-HANASO-24 (audit BUG-030): caller-scoped listing — the ONLY shape the
   * /api/attempts GET is allowed to serve. Returns the CALLER's attempts only;
   * cross-user reads are impossible by construction.
   */
  listForUser(userId: string, dialogueId?: string): Promise<DialogueMasteryAttempt[]>;
  /** Single-row lookup by stored attempt id — the D→understood gate uses this instead
   * of list()+find (PR #74 review r1: a list is LIMIT-bounded and the wrong shape). */
  find(attemptId: string): Promise<DialogueMasteryAttempt | null>;
}

export class InMemoryAttemptRepository implements AttemptRepository {
  // DEV-ONLY — no-DATABASE_URL storage; the Postgres implementation lives in src/db/repositories.
  private readonly attempts: DialogueMasteryAttempt[] = [];

  async create(input: AttemptInput, outcome: DialogueMasteryAttempt['outcome']): Promise<DialogueMasteryAttempt> {
    const attemptNo = this.attempts.filter((a) => a.dialogueId === input.dialogueId).length + 1;
    const attempt: DialogueMasteryAttempt = {
      id: randomUUID(),
      dialogueId: input.dialogueId,
      userId: input.userId,
      attemptNo,
      scores: input.scores,
      weakPoints: input.weakPoints,
      outcome,
      createdAt: new Date().toISOString(),
    };
    this.attempts.push(attempt);
    return attempt;
  }

  async list(dialogueId?: string): Promise<DialogueMasteryAttempt[]> {
    return dialogueId ? this.attempts.filter((a) => a.dialogueId === dialogueId) : [...this.attempts];
  }

  async listForUser(userId: string, dialogueId?: string): Promise<DialogueMasteryAttempt[]> {
    return this.attempts.filter((a) => a.userId === userId && (!dialogueId || a.dialogueId === dialogueId));
  }

  async find(attemptId: string): Promise<DialogueMasteryAttempt | null> {
    return this.attempts.find((a) => a.id === attemptId) ?? null;
  }
}
