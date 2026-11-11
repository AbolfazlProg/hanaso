import { NextResponse } from 'next/server';
import { fail, ok } from '@/modules/shared';
import { getStationProgressStore, getChapterProgressStore } from '@/lib/poc/stores';
import { resolveLearnerIdFromRequest } from '@/lib/learner/server';
import { loadChapterBundle, LEVELS_BY_CODE, chapterAccessStatus } from '@/modules/curriculum/server';
import {
  resolveJourney,
  nextStation,
  resolveSections,
  type JourneyNode,
  type SectionRowAction,
} from '@/modules/curriculum';

/**
 * GET /api/curriculum/journey?chapter= — the live journey (client island
 * refresh for the section panel + «ادامه از همین‌جا» CTA). Node order comes
 * from the resolver (data-driven) — this route never reshapes it.
 *
 * TASK-HANASO-16: the response now carries the derived SECTIONS view (one
 * ChapterUnit per section, rows with row-action CTAs) so the one-section
 * panel refreshes live exactly like the old map did.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const chapterSlug = url.searchParams.get('chapter');
  if (!chapterSlug) {
    return NextResponse.json(fail({ code: 'journey/missing_chapter', message: 'chapter required' }), { status: 400 });
  }
  let bundle;
  try {
    bundle = loadChapterBundle(chapterSlug);
  } catch (err) {
    return NextResponse.json(fail({ code: 'journey/unknown_chapter', message: (err as Error).message }), {
      status: 404,
    });
  }
  const chapter = bundle.chapter;
  const level = LEVELS_BY_CODE[chapter.levelCode]!;
  const userId = resolveLearnerIdFromRequest(req);

  const stationStore = getStationProgressStore();
  const chapterStore = getChapterProgressStore();
  const states = await stationStore.listForUnit(
    userId,
    chapter.stations.map((s) => s.slug),
  );
  const chapterState = await chapterStore.get(userId, chapter.slug);

  const journey = resolveJourney(chapter, level, states, chapterState);
  const next = nextStation(journey);
  const access = await chapterAccessStatus(chapter, userId);
  const { sections, activeIndex } = resolveSections(journey);

  const nodes: (JourneyNode & { href: string })[] = journey.nodes.map((n) => ({
    ...n,
    href: `/learn/${chapter.slug}/journey/${n.station.slug}`,
  }));

  return NextResponse.json(
    ok({
      chapter: { slug: chapter.slug, titleFa: chapter.titleFa },
      coreCompleted: journey.coreCompleted,
      coreTotal: journey.coreTotal,
      chapterState: journey.chapterState,
      nextStationSlug: next?.slug ?? null,
      // TASK-LEARNING-06: chapter-level soft lock (kana gate G1 unlocks Ch02) +
      // the two-level map grouping (T-79 units[] — islands / story units).
      chapterLocked: access.locked,
      prerequisite: access.prerequisiteSlug
        ? { slug: access.prerequisiteSlug, titleFa: access.prerequisiteTitleFa }
        : null,
      units: journey.unitGroups?.map((g) => ({
        slug: g.unit.slug,
        titleFa: g.unit.titleFa,
        summaryFa: g.unit.summaryFa,
        stationSlugs: g.unit.stationSlugs,
        coreCompleted: g.coreCompleted,
        coreTotal: g.coreTotal,
      })),
      // TASK-HANASO-16 — the one-section-at-a-time panel view (derived).
      sections: sections.map((s) => ({
        slug: s.slug,
        titleFa: s.titleFa,
        goalFa: s.goalFa,
        status: s.status,
        coreCompleted: s.coreCompleted,
        coreTotal: s.coreTotal,
        isFocus: s.isFocus,
        rows: s.rows.map((r) => ({
          slug: r.node.station.slug,
          type: r.node.station.type,
          titleFa: r.node.station.titleFa,
          objectiveFa: r.node.station.objectiveFa,
          core: r.node.station.core,
          estMinutes: r.node.station.estMinutes,
          availability: r.node.availability,
          action: r.action as SectionRowAction,
          href: `/learn/${chapter.slug}/journey/${r.node.station.slug}`,
        })),
      })),
      activeSectionIndex: activeIndex,
      nodes: nodes.map((n) => ({
        slug: n.station.slug,
        type: n.station.type,
        titleFa: n.station.titleFa,
        objectiveFa: n.station.objectiveFa,
        core: n.station.core,
        estMinutes: n.station.estMinutes,
        availability: n.availability,
        blockedBy: n.blockedBy,
        href: n.href,
      })),
    }),
    { headers: { 'cache-control': 'no-store' } },
  );
}
