/**
 * HANASO — Unit progress repository (TASK-SLICE-01 → Postgres in TASK-M0-10 / Issue #40→#11).
 *
 * The interface is ASYNC since M0-10: the Postgres implementation writes
 * `app.lesson_progress` (KB §۴: composite PK (user_id, lesson_id), dialogue_id anchor
 * for dialogue-keyed lookups) behind the same contract — route handlers never touch
 * the implementation directly.
 */
import { randomUUID } from 'node:crypto';
import type { UnitProgress } from './types';

export interface ProgressRepository {
  get(userId: string, dialogueId: string): Promise<UnitProgress | null>;
  upsert(progress: UnitProgress): Promise<UnitProgress>;
  list(dialogueId?: string): Promise<UnitProgress[]>;
}

export class InMemoryProgressRepository implements ProgressRepository {
  // DEV-ONLY — no-DATABASE_URL storage; the Postgres implementation lives in src/db/repositories.
  private readonly byKey = new Map<string, UnitProgress>();

  private key(userId: string, dialogueId: string): string {
    return `${userId}::${dialogueId}`;
  }

  async get(userId: string, dialogueId: string): Promise<UnitProgress | null> {
    return this.byKey.get(this.key(userId, dialogueId)) ?? null;
  }

  async upsert(progress: UnitProgress): Promise<UnitProgress> {
    this.byKey.set(this.key(progress.userId, progress.dialogueId), { ...progress });
    return progress;
  }

  async list(dialogueId?: string): Promise<UnitProgress[]> {
    const all = [...this.byKey.values()];
    return dialogueId ? all.filter((p) => p.dialogueId === dialogueId) : all;
  }
}

/** DEV-ONLY — placeholder id generator kept for symmetry with the attempts repo. */
export function newProgressRowId(): string {
  return randomUUID();
}
