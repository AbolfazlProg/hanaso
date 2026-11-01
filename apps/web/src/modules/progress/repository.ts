/**
 * HANASO — Unit progress repository (TASK-SLICE-01 / Issue #40).
 *
 * // DEV-ONLY — in-memory implementation for the slice (same pattern as the mastery
 * attempts repo). The Postgres implementation writes app.lesson_progress behind THIS
 * interface once DATABASE_URL lands (M0-10/M1) — route handlers never touch the
 * implementation directly.
 */
import { randomUUID } from 'node:crypto';
import type { UnitProgress } from './types';

export interface ProgressRepository {
  get(userId: string, dialogueId: string): UnitProgress | null;
  upsert(progress: UnitProgress): UnitProgress;
  list(dialogueId?: string): UnitProgress[];
}

export class InMemoryProgressRepository implements ProgressRepository {
  // DEV-ONLY — slice storage; replaced by Postgres (app.lesson_progress) behind the same interface.
  private readonly byKey = new Map<string, UnitProgress>();

  private key(userId: string, dialogueId: string): string {
    return `${userId}::${dialogueId}`;
  }

  get(userId: string, dialogueId: string): UnitProgress | null {
    return this.byKey.get(this.key(userId, dialogueId)) ?? null;
  }

  upsert(progress: UnitProgress): UnitProgress {
    this.byKey.set(this.key(progress.userId, progress.dialogueId), { ...progress });
    return progress;
  }

  list(dialogueId?: string): UnitProgress[] {
    const all = [...this.byKey.values()];
    return dialogueId ? all.filter((p) => p.dialogueId === dialogueId) : all;
  }
}

/** DEV-ONLY — placeholder id generator kept for symmetry with the attempts repo. */
export function newProgressRowId(): string {
  return randomUUID();
}
