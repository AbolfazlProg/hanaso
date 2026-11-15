/**
 * HANASO — Home server composition (TASK-HANASO-17) — node-only.
 *
 * Gathers the REAL progress facts (stores + resolvers — no new state, mission
 * §10: «State معتبر Progress از Backend یا Source of Truth موجود استخراج
 * شود») and feeds them to the PURE home-view resolver. The page renders the
 * result; nothing here computes presentation.
 */
import { listChapters, resolveLearnerJourney } from '@/modules/curriculum/server';
import { courseOrder } from '@/modules/curriculum/reveal';
import { getStationProgressStore } from '@/lib/poc/stores';
import { fsrsPort } from '@/modules/fsrs/integration';
import { parseActivityAt } from '@/modules/curriculum/resume-policy';
import { resolveHomeView, faDateLine, type HomeView, type HomeCourseFacts, type HomeReviewFacts } from './home-view';

/** Terminal walk states (completed / soft-passed / skipped) — island §۹. */
const TERMINAL = new Set(['completed', 'needs_retry', 'skipped']);
/** Live walk states the continue-card may resume. */
const LIVE = new Set(['in_progress', 'needs_retry']);

export interface HomeRender {
  view: HomeView;
  /** Persian day-line for the greeting (Asia/Tehran, fa-IR). */
  dateLine: string;
}

export async function resolveHome(userId: string): Promise<HomeRender> {
  const chapters = courseOrder(listChapters());

  /* ---- the ACTIVE chapter's journey (reveal + resolved walk — same server
   * call the /learn page uses; the chapter is extracted FROM PROGRESS). ---- */
  const journeyHome = await resolveLearnerJourney(userId);
  const nodes = journeyHome.sections
    .flatMap((s) => s.rows.map((r) => r.node))
    .sort((a, b) => a.station.order - b.station.order);

  // walk-order facts from the SAME resolver output the map renders (no drift)
  const orderedNodes = [...nodes].sort((a, b) => a.station.order - b.station.order);
  const liveNodes = orderedNodes.filter((n) => LIVE.has(n.availability));
  const coreLive = liveNodes.filter((n) => n.station.core);
  const chosen = coreLive[0] ?? liveNodes[0] ?? null;
  const nextAvailable = orderedNodes.find((n) => n.station.core && n.availability === 'available') ?? null;

  const stateBySlug = new Map(journeyHome.stationStates.map((s) => [s.stationSlug, s]));

  const journeyFacts = {
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
          // null on legacy rows → resume-policy treats it as unknown (fresh)
          lastActivityAtMs: parseActivityAt(stateBySlug.get(chosen.station.slug)?.lastActivityAt),
        }
      : null,
  };

  /* ---- whole-course facts (archive + honest totals) ---- */
  const stationStore = getStationProgressStore();
  let stationsCompletedTotal = 0;
  for (const chapter of chapters) {
    const states = await stationStore.listForUnit(
      userId,
      chapter.stations.map((s) => s.slug),
    );
    stationsCompletedTotal += states.filter((row) => TERMINAL.has(row.status)).length;
  }

  const understood = journeyHome.reveal.archive;
  const allUnderstood = understood.length === chapters.length && chapters.length > 0;

  const courseFacts: HomeCourseFacts = {
    allUnderstood,
    archive: understood.map((c) => ({ slug: c.slug, titleFa: c.titleFa })),
    stationsCompletedTotal,
    lastChapterTitleFa: chapters.length > 0 ? chapters[chapters.length - 1]!.titleFa : null,
  };

  /* ---- review facts — HONEST: the engine is not integrated yet, so no
   * count exists; the view renders the queue-pending note, never a fake
   * number (mission §3.2 + FSRS_INTEGRATION_CONTRACT). ---- */
  const reviewFacts: HomeReviewFacts = {
    fsrsActive: fsrsPort.status === 'integrated',
    dueCount: 0,
  };

  const nowMs = Date.now();
  return {
    view: resolveHomeView({
      nowMs,
      journey: journeyFacts,
      course: courseFacts,
      review: reviewFacts,
    }),
    dateLine: faDateLine(nowMs),
  };
}
