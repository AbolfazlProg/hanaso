import { NextResponse } from 'next/server';
import { pocEventSchema } from '@/lib/poc/event-store';
import { getEventStore } from '@/lib/poc/stores';
import { fail, ok } from '@/modules/shared';
import { GUEST_LEARNER_ID, resolveLearnerIdFromRequest } from '@/lib/learner/server';

/**
 * POST /api/events — analytics sink for the PoC (TASK-DLG-POC-01 «ثبت نتیجهٔ تعامل»).
 * Structure mirrors ADR-016 events.yaml entries: { name: object_action, props }.
 * GET returns the last events + count (PoC observability only).
 *
 * TASK-HANASO-24 (RC-5 — audit T1-B-07):
 *  - POST requires a valid session identity (guest → 401): the pre-24 endpoint
 *    was an unauthenticated unbounded write into the shared ring (anonymous
 *    spam / row-growth vector). Server-side emitters (recordLearningEvent) are
 *    unaffected — they never cross HTTP.
 *  - GET no longer discloses `user_id` per event (it listed every learner's
 *    identity); the observability payload keeps name/props/at only.
 */
export const dynamic = 'force-dynamic';

function noIdentity(): NextResponse {
  return NextResponse.json(
    fail({
      code: 'learner/no_identity',
      message: 'شناسهٔ زبان‌آموز یافت نشد — کوکی «hanaso_lid» باید توسط مرورگر پذیرفته شود.',
    }),
    { status: 401, headers: { 'cache-control': 'no-store' } },
  );
}

export async function POST(req: Request) {
  const userId = resolveLearnerIdFromRequest(req);
  if (userId === GUEST_LEARNER_ID) return noIdentity();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail({ code: 'events/invalid_json', message: 'body must be JSON' }), {
      status: 400,
    });
  }

  const parsed = pocEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(fail({ code: 'events/validation_failed', message: parsed.error.message }), {
      status: 400,
    });
  }

  /*
   * TASK-HANASO-24 (B-05): client-posted events are stamped with the CALLER's
   * identity (same contract as the server-side emitter) so the caller-scoped
   * GET can list them — and ONLY them.
   */
  const event = getEventStore().record(parsed.data.name, { ...parsed.data.props, user_id: userId });
  return NextResponse.json(ok({ recorded: true, at: event.at, total: getEventStore().count() }), {
    status: 201,
  });
}

export async function GET(req: Request) {
  /*
   * TASK-HANASO-24 (subagent B-05): the observability listing now REQUIRES a
   * valid session identity AND is caller-scoped — pre-24 any anonymous visitor
   * read the shared ring (other learners' activity streams). Server-side
   * emitters stamp `user_id` into props (modules/curriculum/events.ts); the
   * listing returns ONLY the caller's own events, with user_id stripped.
   */
  const userId = resolveLearnerIdFromRequest(req);
  if (userId === GUEST_LEARNER_ID) return noIdentity();
  const store = getEventStore();
  const events = store
    .list(50)
    .filter((e) => (e.props as Record<string, unknown>).user_id === userId)
    .map((e) => {
      const { user_id: _userId, ...props } = e.props as Record<string, unknown>;
      void _userId;
      return { name: e.name, at: e.at, props };
    });
  return NextResponse.json(ok({ total: events.length, events }), {
    headers: { 'cache-control': 'no-store' },
  });
}
