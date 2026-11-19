/**
 * HANASO — GET /api/review/queue (owner-pass 2026-11-19 — mission «API مرور»).
 *
 * The FSRS daily review queue — the contract row in docs/architecture/API-AND-EVENTS.md
 * (`GET /api/review/queue` · `POST /api/review`, private, OTD-001) — went LIVE
 * with the real app.fsrs_cards persistence (modules/fsrs/review-store.ts).
 *
 * Contract:
 *  - private: valid `hanaso_lid` session cookie; guest → 401 learner/no_identity
 *  - `?limit=` 1..50 (default 20) — due cards, oldest due first
 *  - response data: { engine:'FSRS-6', status:'integrated', dueCount, due:[{itemId, kind, wave, dueAt, contextLineId?}] }
 *    (`dueCount` = the FULL due count, `due` = the bounded page — the «پنل من»
 *    badge and the future review UI both read from this one call)
 *  - empty queue is an HONEST empty state (no synthetic cards, no fake data)
 *  - day-boundary display grouping (4am Asia/Tehran) is a CLIENT rendering rule;
 *    the API returns absolute ISO timestamps
 */
import { NextResponse } from 'next/server';

import { jsonEnvelope, requireLearner } from '@/lib/api/guard';
import { getFsrsReviewStore } from '@/lib/poc/stores';
import { fail } from '@/modules/shared';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  const guard = requireLearner(req);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get('limit');
  let limit = 20;
  if (limitRaw !== null) {
    const n = Number(limitRaw);
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      return jsonEnvelope(
        fail({
          code: 'review/invalid_limit',
          message: 'limit باید عددی صحیح بین ۱ تا ۵۰ باشد.',
          details: { limit: limitRaw },
        }),
        400,
      );
    }
    limit = n;
  }

  try {
    const store = getFsrsReviewStore();
    const now = new Date();
    const [due, dueCount] = await Promise.all([
      store.listDue(guard.userId, now, limit),
      store.countDue(guard.userId, now),
    ]);
    return jsonEnvelope(
      {
        ok: true,
        data: {
          engine: 'FSRS-6',
          status: 'integrated',
          dueCount,
          due,
        },
      },
      200,
    );
  } catch (err) {
    console.error('[hanaso/review] queue read failed', err);
    return jsonEnvelope(
      fail({ code: 'review/queue_failed', message: 'خواندن صف مرور ناموفق بود — بعداً تلاش کنید.' }),
      500,
    );
  }
}
