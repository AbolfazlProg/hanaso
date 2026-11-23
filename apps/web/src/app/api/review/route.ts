/**
 * HANASO — POST /api/review (owner-pass 2026-11-19 — mission «API مرور»).
 *
 * The idempotent FSRS review submission — the contract row in
 * docs/architecture/API-AND-EVENTS.md (`GET /api/review/queue` · `POST /api/review`,
 * private, `clientReviewId` uuidv7, OTD-001).
 *
 * Contract:
 *  - private: valid `hanaso_lid` session cookie; guest → 401
 *  - body: { reviews: [{ itemId: string, rating: 'again'|'hard'|'good'|'easy', clientReviewId: uuid }] } — batch ≤ 25
 *  - per-item outcome (batch semantics — a bad item never poisons the batch):
 *      applied      → the grade applied, card rescheduled, revlog row written
 *      duplicate    → SAME clientReviewId already applied (retried submit) — NEVER re-applied
 *      unknown_item → the card is not enrolled for this user (honest refusal, not a fake success)
 *  - every applied/duplicate/unknown_item decision is ALSO a server-side
 *    `review_logged` analytics event (critical event = server-side only, ADR-016)
 *  - HTTP: 200 with per-item statuses · 400 shape/limit violations · 401 guest · 500 store outage
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { jsonEnvelope, readJson, requireLearner, validationFailed } from '@/lib/api/guard';
import { getFsrsReviewStore } from '@/lib/poc/stores';
import { recordLearningEvent } from '@/modules/curriculum/events';
import { fail } from '@/modules/shared';

export const dynamic = 'force-dynamic';

const reviewInputSchema = z.object({
  reviews: z
    .array(
      z.object({
        itemId: z.string().min(1).max(120),
        rating: z.enum(['again', 'hard', 'good', 'easy']),
        /** Client-generated uuidv7 — the idempotency key (one review = one id, retried submits replay safely). */
        clientReviewId: z.string().uuid(),
      }),
    )
    .min(1)
    .max(25, 'بستهٔ مرور حداکثر ۲۵ آیتم است.'),
});

interface SubmitRow {
  itemId: string;
  clientReviewId: string;
  outcome: 'applied' | 'duplicate' | 'unknown_item';
  dueAfter?: string;
  stateAfter?: number;
}

export async function POST(req: Request): Promise<NextResponse> {
  const guard = await requireLearner(req);
  if (!guard.ok) return guard.response;

  const body = await readJson(req);
  if (!body.ok) return body.response;

  const parsed = reviewInputSchema.safeParse(body.body);
  if (!parsed.success) return validationFailed('review', parsed.error.flatten());

  const store = getFsrsReviewStore();
  const results: SubmitRow[] = [];
  try {
    for (const item of parsed.data.reviews) {
      const result = await store.submit(guard.userId, item, new Date());
      results.push(result);
      // Critical review outcomes are server-side-only events (ADR-016) —
      // recorded at the trust boundary with the caller's identity.
      recordLearningEvent(
        'review_logged',
        {
          item_id: item.itemId,
          rating: item.rating,
          outcome: result.outcome,
          due_after: result.dueAfter,
        },
        guard.userId,
      );
    }
  } catch (err) {
    console.error('[hanaso/review] submit failed', err);
    return jsonEnvelope(fail({ code: 'review/submit_failed', message: 'ثبت مرور ناموفق بود — بعداً تلاش کنید.' }), 500);
  }

  return jsonEnvelope(
    {
      ok: true,
      data: {
        submitted: results.length,
        applied: results.filter((r) => r.outcome === 'applied').length,
        duplicate: results.filter((r) => r.outcome === 'duplicate').length,
        unknown_item: results.filter((r) => r.outcome === 'unknown_item').length,
        results,
      },
    },
    200,
  );
}
