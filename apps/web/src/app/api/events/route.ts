import { NextResponse } from 'next/server';
import { pocEventSchema } from '@/lib/poc/event-store';
import { getEventStore } from '@/lib/poc/stores';
import { fail, ok } from '@/modules/shared';

/**
 * POST /api/events — analytics sink for the PoC (TASK-DLG-POC-01 «ثبت نتیجهٔ تعامل»).
 * Structure mirrors ADR-016 events.yaml entries: { name: object_action, props }.
 * GET returns the last events + count (PoC observability only).
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
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

  const event = getEventStore().record(parsed.data.name, parsed.data.props);
  return NextResponse.json(ok({ recorded: true, at: event.at, total: getEventStore().count() }), {
    status: 201,
  });
}

export async function GET() {
  const store = getEventStore();
  return NextResponse.json(ok({ total: store.count(), events: store.list(50) }), {
    headers: { 'cache-control': 'no-store' },
  });
}
