import { NextResponse } from 'next/server';
import { fail, ok } from '@/modules/shared';
import { ProgressTransitionError, applyProgressEvent } from '@/modules/progress';
import { progressInputSchema } from '@/modules/progress';
import { getAttemptStore, getProgressStore } from '@/lib/poc/stores';
import { POC_DEFAULT_USER_ID } from '@/lib/poc/principal';

/**
 * GET/POST /api/progress — the A→D unit cycle (TASK-SLICE-01 / Issue #40
 * → Postgres persistence in TASK-M0-10).
 *
 * GET  ?dialogueId=… (&userId=…) → the unit record (or null — null means "stage A, not started").
 * POST { dialogueId, userId?, event } → machine-validated transition. `mastery_passed`
 *      additionally verifies the referenced attempt EXISTS and its outcome is 'passed'
 *      (the D→understood gate, DD-048) before the machine flips the status.
 *
 * // DEV-ONLY — no auth in the slice: userId defaults to 'poc-user' until better-auth
 * // lands (M1); storage is in-memory without DATABASE_URL, app.lesson_progress with it.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dialogueId = url.searchParams.get('dialogueId');
  if (!dialogueId) {
    return NextResponse.json(fail({ code: 'progress/missing_dialogue_id', message: 'dialogueId is required' }), {
      status: 400,
    });
  }
  const userId = url.searchParams.get('userId') ?? POC_DEFAULT_USER_ID;
  const progress = await getProgressStore().get(userId, dialogueId);
  return NextResponse.json(ok({ userId, dialogueId, progress }), {
    headers: { 'cache-control': 'no-store' },
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail({ code: 'progress/invalid_json', message: 'body must be JSON' }), {
      status: 400,
    });
  }

  const parsed = progressInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(fail({ code: 'progress/validation_failed', message: parsed.error.message }), {
      status: 400,
    });
  }

  const { dialogueId, event } = parsed.data;
  const userId = parsed.data.userId ?? POC_DEFAULT_USER_ID;
  const store = getProgressStore();
  const current = await store.get(userId, dialogueId);

  // D→understood gate: the referenced attempt must exist, belong to this dialogue/user
  // scope, and carry outcome='passed' (verified server-side, never trusted from the client).
  let attemptOutcome: 'passed' | 'remediate' | 'incomplete' | undefined;
  if (event.type === 'mastery_passed') {
    const attempt = (await getAttemptStore().list(dialogueId)).find(
      (a) => a.id === event.attemptId && (a.userId ?? POC_DEFAULT_USER_ID) === userId,
    );
    if (!attempt) {
      return NextResponse.json(
        fail({
          code: 'progress/attempt_not_found',
          message: `no mastery attempt ${event.attemptId} for dialogue ${dialogueId}`,
        }),
        { status: 404 },
      );
    }
    attemptOutcome = attempt.outcome;
  }

  try {
    const next = applyProgressEvent(current, dialogueId, userId, event, { attemptOutcome });
    const saved = next === current ? current : await store.upsert(next);
    return NextResponse.json(ok({ progress: saved, event }), { status: 201 });
  } catch (err) {
    if (err instanceof ProgressTransitionError) {
      return NextResponse.json(fail({ code: err.code, message: err.message, details: err.details }), { status: 400 });
    }
    throw err;
  }
}
