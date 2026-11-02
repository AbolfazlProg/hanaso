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
}
