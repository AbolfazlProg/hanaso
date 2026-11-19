/**
 * HANASO — GET /api/me/learning-summary (owner-pass 2026-11-19).
 *
 * The «پنل من» learning-progress API (mission scope: «اطلاعات پیشرفت آموزشی
 * موردنیاز بخش پنل من»). Until today the dashboard data existed ONLY inside the
 * RSC home composition (resolveHome) — no API could serve it to a future
 * native shell, the admin panel, or a redesigned dashboard. This endpoint
 * exposes the SAME honest facts as ONE envelope:
 *
 *  - journey: the active chapter + continue/next station (identical resolver
 *    the /learn map and home page use — no drift, no recomputation)
 *  - course: stations-completed total + understood-archive count
 *  - review: the LIVE FSRS engine status + the real due count (empty = 0, honest)
 *  - weak: evidence-backed weak objects (practice states, max 5)
 *  - practice: last-30-day sessions + first-try rate (evidence only)
 *  - recentEvents: the learner's last 10 durable behavior events (the stall
 *    timeline the monitoring mandate serves — name + timestamp only here)
 *
 * private (guest → 401); envelope + no-store; aggregates are caller-scoped
 * ONLY (per-learner privacy — cross-learner analytics stay behind the future
 * admin panel, never here).
 */
import { NextResponse } from 'next/server';

import { jsonEnvelope, requireLearner } from '@/lib/api/guard';
import {
  getFsrsReviewStore,
  getStationProgressStore,
  getLearningEventsStore,
  getLearningObjectStore,
  getPracticeSessionStore,
} from '@/lib/poc/stores';
import { isWeakObject } from '@/modules/practice/evidence';
import { courseOrder } from '@/modules/curriculum/reveal';
import { listChapters, resolveLearnerJourney } from '@/modules/curriculum/server';
import { parseActivityAt } from '@/modules/curriculum/resume-policy';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import { fail } from '@/modules/shared';

export const dynamic = 'force-dynamic';

/** Terminal walk states (completed / soft-passed / skipped) — island §۹. */
const TERMINAL = new Set(['completed', 'needs_retry', 'skipped']);
/** Live walk states the continue-card may resume. */
const LIVE = new Set(['in_progress', 'needs_retry']);

export async function GET(req: Request): Promise<NextResponse> {
  const guard = requireLearner(req);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  try {
    /* ---- journey facts (the SAME resolver output the map/home render) ---- */
    const journeyHome = await resolveLearnerJourney(userId);
    const nodes = journeyHome.sections
      .flatMap((s) => s.rows.map((r) => r.node))
      .sort((a, b) => a.station.order - b.station.order);
    const liveNodes = nodes.filter((n) => LIVE.has(n.availability));
    const coreLive = liveNodes.filter((n) => n.station.core);
    const chosen = coreLive[0] ?? liveNodes[0] ?? null;
    const nextAvailable = nodes.find((n) => n.station.core && n.availability === 'available') ?? null;
    const stateBySlug = new Map(journeyHome.stationStates.map((s) => [s.stationSlug, s]));

    /* ---- whole-course facts ---- */
    const chapters = courseOrder(listChapters());
    const stationStore = getStationProgressStore();
    let stationsCompletedTotal = 0;
    for (const chapter of chapters) {
      const states = await stationStore.listForUnit(
        userId,
        chapter.stations.map((s) => s.slug),
      );
      stationsCompletedTotal += states.filter((row) => TERMINAL.has(row.status)).length;
    }

    /* ---- review facts — the LIVE engine (owner-pass 2026-11-19) ---- */
    const reviewStore = getFsrsReviewStore();
    const dueCount = await reviewStore.countDue(userId, new Date());

    /* ---- weak objects (evidence only — max 5, honest labels) ---- */
    const records = await getLearningObjectStore().listForUser(userId, 'kana');
    const weak = records
      .filter(isWeakObject)
      .slice(0, 5)
      .map((r) => {
        const kanaId = r.objectId.replace(/^kn-(rec-|recall-)?/, '');
        const item = KANA_ITEMS.find((k) => k.kanaId === kanaId || k.fsrsCardId === r.objectId);
        return { objectId: r.objectId, labelFa: item ? `${item.glyph} (${item.romaji})` : r.objectId };
      });

    /* ---- practice evidence (last 30 days) ---- */
    const sessions = await getPracticeSessionStore().listForUser(userId, 50);
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = sessions.filter((s) => s.completedAt !== null && new Date(s.completedAt).getTime() >= cutoff);
    const items = recent.flatMap((s) => s.itemResults);
    const firstTryRate = items.length > 0 ? items.filter((r) => r.firstTryCorrect).length / items.length : null;

    /* ---- the learner's own behavioral timeline (stall monitoring) ---- */
    const events = await getLearningEventsStore().listForUser(userId, 10);

    return jsonEnvelope(
      {
        ok: true,
        data: {
          journey: {
            chapterSlug: journeyHome.chapter.slug,
            chapterTitleFa: journeyHome.chapter.titleFa,
            coreCompleted: journeyHome.coreCompleted,
            corePathComplete: journeyHome.corePathComplete,
            nextStation: nextAvailable
              ? {
                  slug: nextAvailable.station.slug,
                  titleFa: nextAvailable.station.titleFa,
                  estMinutes: nextAvailable.station.estMinutes,
                }
              : null,
            inProgress: chosen
              ? {
                  slug: chosen.station.slug,
                  titleFa: chosen.station.titleFa,
                  estMinutes: chosen.station.estMinutes,
                  lastActivityAtMs: parseActivityAt(stateBySlug.get(chosen.station.slug)?.lastActivityAt),
                }
              : null,
          },
          course: {
            stationsCompletedTotal,
            understoodChapters: journeyHome.reveal.archive.length,
          },
          review: {
            engine: 'FSRS-6',
            status: 'integrated',
            dueCount,
          },
          weak,
          practice: {
            sessionsLast30d: recent.length,
            firstTryRate,
          },
          recentEvents: events.map((e) => ({ name: e.name, at: e.occurredAt })),
        },
      },
      200,
    );
  } catch (err) {
    console.error('[hanaso/me] learning-summary failed', err);
    return jsonEnvelope(
      fail({ code: 'me/summary_failed', message: 'خواندن خلاصهٔ پیشرفت ناموفق بود — بعداً تلاش کنید.' }),
      500,
    );
  }
}
