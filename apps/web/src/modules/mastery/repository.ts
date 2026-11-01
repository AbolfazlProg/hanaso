/**
 * HANASO — Mastery attempt repository (TASK-DLG-POC-01).
 *
 * // DEV-ONLY — in-memory implementation for the PoC.
 * The real persistence (Postgres `app.dialogue_mastery_attempts`, KB dialogue-content-schema §۳)
 * lands with the Vertical Slice behind THIS interface — route handlers never touch the
 * implementation directly.
 */
import { randomUUID } from 'node:crypto';
import type { AttemptInput, DialogueMasteryAttempt } from './types';

export interface AttemptRepository {
  create(input: AttemptInput, outcome: DialogueMasteryAttempt['outcome']): DialogueMasteryAttempt;
  list(dialogueId?: string): DialogueMasteryAttempt[];
}

export class InMemoryAttemptRepository implements AttemptRepository {
  // DEV-ONLY — PoC storage; replaced by Postgres in the Vertical Slice (same interface).
  private readonly attempts: DialogueMasteryAttempt[] = [];

  create(input: AttemptInput, outcome: DialogueMasteryAttempt['outcome']): DialogueMasteryAttempt {
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

  list(dialogueId?: string): DialogueMasteryAttempt[] {
    return dialogueId ? this.attempts.filter((a) => a.dialogueId === dialogueId) : [...this.attempts];
  }
}
