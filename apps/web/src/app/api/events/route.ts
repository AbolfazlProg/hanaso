/**
 * HANASO — /api/events (owner-pass 2026-11-19 — the durable analytics layer).
 *
 * UPGRADED per the API-AND-EVENTS.md contract (`POST /api/events` batch ≤ 25):
 *  - POST now accepts BOTH shapes: the legacy single event `{name, props}` and
 *    the batch `{events: [{name, props, occurredAt?}]}` (≤25) — old clients
 *    keep working (additive-first versioning).
 *  - Events land in the DURABLE app.learning_events table (the monitoring
 *    mandate: learner behavior survives restarts and feeds the future admin
 *    panel) AND, for single-event posts, the legacy in-memory ring (unchanged
 *    PoC observability path).
 *  - ADR-016 quarantine: a name outside the frozen registry (event-names.ts)
 *    is KEPT with quarantined=true — visible and auditable, never silently
 *    dropped — and the batch responds 202 with per-shape counts.
 *  - GET stays caller-scoped (identity check + user_id stripped) and now reads
 *    the DURABLE rows (the restart-proof observability path).
 *  - bounded writes (TASK-HANASO-24 keeps holding): name regex + props ≤16
 *    keys/4KB per event; batch ≤25 — the same bounds the DB schema documents.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { jsonEnvelope, readJson, requireLearner, validationFailed } from '@/lib/api/guard';
import { getEventStore, getLearningEventsStore } from '@/lib/poc/stores';
import { ok, fail } from '@/modules/shared';

export const dynamic = 'force-dynamic';

/** The per-event schema (same bounds as lib/poc/event-store.ts — TASK-HANASO-24). */
const eventSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/, 'event name must be object_action snake_case'),
  props: z
    .record(z.string().max(64), z.unknown())
    .refine(
      (p: Record<string, unknown>) => Object.keys(p).length <= 16 && JSON.stringify(p).length <= 4096,
      'props too large (max 16 keys / 4KB serialized)',
    )
    .default({}),
  /** Optional client clock (ISO) — behavioral timelines survive offline batching. */
  occurredAt: z.string().datetime({ offset: true }).optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(25, 'بستهٔ رویداد حداکثر ۲۵ آیتم است.'),
});

const singleSchema = eventSchema;

export async function POST(req: Request): Promise<NextResponse> {
  const guard = await requireLearner(req);
  if (!guard.ok) return guard.response;

  const body = await readJson(req);
  if (!body.ok) return body.response;

  // Two accepted shapes — batch (contract) first, then the legacy single event.
  const asBatch = batchSchema.safeParse(body.body);
  if (asBatch.success) {
    try {
      const result = await getLearningEventsStore().record({
        userId: guard.userId,
        source: 'client',
        events: asBatch.data.events.map((e) => ({
          name: e.name,
          props: e.props,
          occurredAt: e.occurredAt ? new Date(e.occurredAt) : undefined,
        })),
      });
      // 202 Accepted per the contract: unknown names quarantine (kept + flagged).
      return jsonEnvelope(
        {
          ok: true,
          data: {
            received: result.stored,
            accepted: result.stored,
            quarantined: result.quarantined,
          },
        },
        202,
      );
    } catch (err) {
      console.error('[hanaso/analytics] batch record failed', err);
      return jsonEnvelope(
        fail({ code: 'events/persist_failed', message: 'ثبت رویدادها ناموفق بود — بعداً تلاش کنید.' }),
        500,
      );
    }
  }

  const asSingle = singleSchema.safeParse(body.body);
  if (!asSingle.success) return validationFailed('events', asSingle.error.flatten());

  // Legacy single-event path — durable record + the unchanged in-memory ring.
  try {
    await getLearningEventsStore().record({
      userId: guard.userId,
      source: 'client',
      events: [{ name: asSingle.data.name, props: asSingle.data.props }],
    });
    const event = getEventStore().record(asSingle.data.name, { ...asSingle.data.props, user_id: guard.userId });
    return jsonEnvelope(ok({ recorded: true, at: event.at, total: getEventStore().count() }), 201);
  } catch (err) {
    console.error('[hanaso/analytics] record failed', err);
    return jsonEnvelope(
      fail({ code: 'events/persist_failed', message: 'ثبت رویداد ناموفق بود — بعداً تلاش کنید.' }),
      500,
    );
  }
}

export async function GET(req: Request): Promise<NextResponse> {
  /*
   * Caller-scoped observability (the TASK-HANASO-24 IDOR fix, now durable):
   * a valid session sees ONLY its own recent events, user_id stripped.
   */
  const guard = await requireLearner(req);
  if (!guard.ok) return guard.response;
  try {
    const events = await getLearningEventsStore().listForUser(guard.userId, 50);
    return jsonEnvelope(ok({ total: events.length, events }), 200);
  } catch (err) {
    console.error('[hanaso/analytics] list failed', err);
    return jsonEnvelope(fail({ code: 'events/list_failed', message: 'خواندن رویدادها ناموفق بود.' }), 500);
  }
}
