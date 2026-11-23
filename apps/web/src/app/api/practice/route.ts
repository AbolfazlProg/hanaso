/**
 * HANASO — /api/practice (TASK-HANASO-27 redesign) — status only.
 *
 * TASK-HANASO-22 shipped generate/answer/complete here — a SECOND grading and
 * completion engine parallel to the lesson engine (/api/curriculum/station).
 * TASK-HANASO-27 integrates practice into the learning journey: practice now
 * runs inside real stations (stn-kana-p1..p4) graded by the ONE lesson
 * `grade` action (F1→F2 hint→F3 ladder, hint endpoint, idempotent complete).
 *
 * What remains here:
 *  - GET status: honest counts for the hub (practice-station progress from
 *    the WALK store, append-only session history, weak objects, review
 *    eligibility) — no fake review dates, no scheduling (single-scheduler
 *    rule; the FSRS port stays the honest throwing stub).
 *
 * What was removed: the generate/answer/complete POST surface and its 2-step
 * parallel answer ladder. practice_sessions / learning_object_states remain
 * append-only EVIDENCE (the FSRS seam) and keep their readers — nothing is
 * migrated or dropped.
 */
import { NextResponse } from 'next/server';
import { fail, ok } from '@/modules/shared';
import { GUEST_LEARNER_ID, resolveLearnerIdFromRequest } from '@/lib/learner/server';
import { getLearningObjectStore, getPracticeSessionStore, getStationProgressStore } from '@/lib/poc/stores';
import { loadChapterBundle } from '@/modules/curriculum/server';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import { isWeakObject } from '@/modules/practice/evidence';
import { glyphsIntroducedByStation } from '@/modules/practice/kana/items';
import { PRACTICE_POLICY } from '@/modules/practice/kana/policy';

export const dynamic = 'force-dynamic';

/** Completed kana-walk stations for this learner (the prerequisite truth). */
async function completedKanaStations(userId: string): Promise<Set<string>> {
  const chapter = loadChapterBundle('kana-foundation-01').chapter;
  const states = await getStationProgressStore().listForUnit(
    userId,
    chapter.stations.map((s) => s.slug),
  );
  return new Set(states.filter((s) => s.status === 'completed').map((s) => s.stationSlug));
}

export async function GET(req: Request) {
  const userId = await resolveLearnerIdFromRequest(req);
  if (userId === GUEST_LEARNER_ID) {
    return NextResponse.json(fail({ code: 'learner/no_identity', message: 'شناسهٔ زبان‌آموز یافت نشد.' }), {
      status: 401,
      headers: { 'cache-control': 'no-store' },
    });
  }
  const completed = await completedKanaStations(userId);
  const records = await getLearningObjectStore().listForUser(userId, 'kana');
  const eligible = records.filter((r) => r.state === 'eligible_for_review');
  const weak = records.filter(isWeakObject).slice(0, PRACTICE_POLICY.weakMaxSuggestions);
  const sessions = await getPracticeSessionStore().listForUser(userId, 5);

  /** The TASK-27 integrated practice stations (real journey stations). */
  const chapter = loadChapterBundle('kana-foundation-01').chapter;
  const practiceStations = chapter.stations
    .filter((s) => s.type === 'practice' && s.slug.startsWith('stn-kana-p'))
    .map((s) => ({
      stationSlug: s.slug,
      titleFa: s.titleFa,
      href: `/learn/kana-foundation-01/journey/${s.slug}`,
      completed: completed.has(s.slug),
    }));
  /** Focused targets: every completed kana station that introduced glyphs. */
  const focusTargets = chapter.stations
    .filter((s) => completed.has(s.slug) && glyphsIntroducedByStation(s.slug).length > 0)
    .map((s) => ({ stationSlug: s.slug, titleFa: s.titleFa, glyphCount: glyphsIntroducedByStation(s.slug).length }));

  return NextResponse.json(
    ok({
      completedStations: completed.size,
      practiceStations,
      focusTargets,
      eligibleForReview: eligible.length,
      totalKanaObjects: KANA_ITEMS.length,
      weakObjects: weak.map((r) => ({ objectId: r.objectId, labelFa: weakLabelFa(r.objectId) })),
      recentSessions: sessions.map((s) => ({
        id: s.id,
        kind: s.kind,
        scopeKey: s.scopeKey,
        items: s.itemResults.length,
        firstTryCorrect: s.itemResults.filter((r) => r.firstTryCorrect).length,
        completedAt: s.completedAt,
      })),
      reviewEngineNoteFa: 'کارت‌های واجد مرور ثبت می‌شوند؛ صف مرور با موتور زمان‌بندی فعال می‌شود (هنوز فعال نیست).',
    }),
    { headers: { 'cache-control': 'no-store' } },
  );
}

/** Honest Persian label for a weak object (glyph or word). */
function weakLabelFa(objectId: string): string {
  if (objectId.startsWith('word-')) return objectId.slice(5);
  const kanaId = objectId.replace(/^kn-(rec-|recall-)?/, '');
  const item = KANA_ITEMS.find((k) => k.kanaId === kanaId || k.fsrsCardId === objectId);
  return item ? `${item.glyph} (${item.romaji})` : objectId;
}
