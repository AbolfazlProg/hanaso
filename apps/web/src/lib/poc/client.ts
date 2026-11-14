/**
 * HANASO — slice client helpers (TASK-SLICE-01 / Issue #40).
 * Tiny fetch wrappers shared by the client islands (dialogue/lesson/practice/
 * assessment/learn). MUST stay free of server imports (no stores/repositories)
 * so it never leaks node code into the browser bundle.
 */
import type { ProgressEvent, UnitProgress } from '@/modules/progress';

/** Best-effort ADR-016 analytics ping (object_verb name + props). */
export function logEvent(name: string, props: Record<string, unknown>): void {
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, props }),
  }).catch(() => {
    /* analytics is best-effort in the slice */
  });
}

export interface ProgressPostResult {
  ok: boolean;
  /** error code on failure (e.g. 'progress/invalid_transition') */
  code?: string;
  message?: string;
  progress?: UnitProgress;
}

/** POST one A→D cycle event; resolves (never throws) with the envelope outcome. */
export async function postProgressEvent(dialogueId: string, event: ProgressEvent): Promise<ProgressPostResult> {
  try {
    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dialogueId, event }),
    });
    const body = (await res.json()) as {
      ok: boolean;
      data?: { progress: UnitProgress };
      error?: { code: string; message: string };
    };
    if (!res.ok || !body.ok) {
      return { ok: false, code: body.error?.code, message: body.error?.message };
    }
    return { ok: true, progress: body.data?.progress };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/** GET the unit record (null → the unit has not been started yet). */
export async function fetchProgress(dialogueId: string): Promise<UnitProgress | null> {
  const res = await fetch(`/api/progress?dialogueId=${encodeURIComponent(dialogueId)}`, {
    cache: 'no-store',
  });
  const body = (await res.json()) as { ok: boolean; data?: { progress: UnitProgress | null } };
  if (!res.ok || !body.ok) return null;
  return body.data?.progress ?? null;
}
