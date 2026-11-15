import { NextResponse } from 'next/server';
import { fail, ok } from '@/modules/shared';
import { ProgressTransitionError, applyProgressEvent } from '@/modules/progress';
import { progressInputSchema } from '@/modules/progress';
import { getAttemptStore, getProgressStore } from '@/lib/poc/stores';
import { GUEST_LEARNER_ID, resolveLearnerIdFromRequest } from '@/lib/learner/server';

/**
 * GET/POST /api/progress — the A→D unit cycle (TASK-SLICE-01 / Issue #40
 * → Postgres persistence in TASK-M0-10).
 *
 * GET  ?dialogueId=… → the CALLER's unit record (or null — null means "stage A,
 *      not started"). The caller is the signed `hanaso_lid` session token —
 *      never a query/body-supplied userId.
 * POST { dialogueId, event } → machine-validated transition on the CALLER's
 *      record. `mastery_passed` additionally verifies the referenced attempt
 *      EXISTS, belongs to the CALLER and this dialogue scope, and carries
 *      outcome='passed' (the D→understood gate, DD-048) before the machine
 *      flips the status.
 *
 * TASK-HANASO-24 (RC-1 — audit BUG-011/033, the IDOR pair): pre-24 this route
 * trusted `userId` from the query/body (defaulting to the SHARED poc-user) —
 * a 5-request takeover chain wrote any victim's status and let any third
 * cookie read it. Ownership now resolves ONLY from the server-signed session
 * token; a request without one is guest and gets 401 on this state-changing
 * surface. A client-supplied `userId` (query or body) is IGNORED — it can
 * never select anyone else's store.
 */
export const dynamic = 'force-dynamic';

function noIdentity(): NextResponse {
  return NextResponse.json(
    fail({ code: 'learner/no_identity', message: 'شناسهٔ زبان‌آموز یافت نشد — کوکی «hanaso_lid» باید توسط مرورگر پذیرفته شود.' }),
    { status: 401, headers: { 'cache-control': 'no-store' } },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dialogueId = url.searchParams.get('dialogueId');
  if (!dialogueId) {
    return NextResponse.json(fail({ code: 'progress/missing_dialogue_id', message: 'dialogueId is required' }), {
      status: 400,
    });
  }
  const userId = resolveLearnerIdFromRequest(req);
  if (userId === GUEST_LEARNER_ID) return noIdentity();
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

  const userId = resolveLearnerIdFromRequest(req);
  if (userId === GUEST_LEARNER_ID) return noIdentity();

  const { dialogueId, event } = parsed.data;
  const store = getProgressStore();
  const current = await store.get(userId, dialogueId);

  // D→understood gate: the referenced attempt must exist, belong to this
  // dialogue, and belong to THE CALLER (server-resolved on both sides — the
  // pre-24 chain matched two client-supplied values against each other).
  // Direct find() — never a bounded list scan (PR #74 review r1/S2).
  let attemptOutcome: 'passed' | 'remediate' | 'incomplete' | undefined;
  if (event.type === 'mastery_passed') {
    const attempt = await getAttemptStore().find(event.attemptId);
    if (!attempt || attempt.dialogueId !== dialogueId || attempt.userId !== userId) {
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
