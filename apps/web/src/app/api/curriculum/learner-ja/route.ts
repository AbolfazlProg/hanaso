import { NextResponse } from 'next/server';
import { fail, ok } from '@/modules/shared';
import { getStationProgressStore } from '@/lib/poc/stores';
import { resolveLearnerIdFromRequest } from '@/lib/learner/server';
import { getLearnerJaView, listCourseStationSlugs } from '@/modules/curriculum/knowledge/learner-ja-server';

/**
 * GET /api/curriculum/learner-ja — the per-learner Smart Ruby state
 * (SMART-RUBY 2026-11-23 §۲).
 *
 * The single client-side truth for the furigana law: which kanji THIS learner
 * has been taught (dedicated kanji station COMPLETED — presence in content,
 * dialogues or the registry is never teaching) and which readings of each
 * kanji they have met inside completed carrier/anchor words. The client
 * provider consumes it once per session; the guest scope honestly receives
 * the all-untaught view (ruby shown — the beginner-safe default).
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = await resolveLearnerIdFromRequest(req);
  if (!userId || !isLearnerScope(userId)) {
    // read-only guest view: no completed stations — every ruby shows
    return NextResponse.json(ok(getLearnerJaView(new Set())));
  }
  try {
    const store = getStationProgressStore();
    const states = await store.listForUnit(userId, listCourseStationSlugs());
    const completed = new Set<string>(states.filter((s) => s.status === 'completed').map((s) => s.stationSlug));
    return NextResponse.json(ok(getLearnerJaView(completed)));
  } catch (err) {
    return NextResponse.json(fail({ code: 'learner-ja/unavailable', message: (err as Error).message }), {
      status: 500,
    });
  }
}

/** The guest scope is a non-uuid reserved string (lib/learner/server contract). */
function isLearnerScope(userId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
}
