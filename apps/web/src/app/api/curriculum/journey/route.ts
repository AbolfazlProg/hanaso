import { NextResponse } from 'next/server';
import { fail, ok } from '@/modules/shared';
import { getStationProgressStore, getChapterProgressStore } from '@/lib/poc/stores';
import { POC_DEFAULT_USER_ID } from '@/lib/poc/principal';
import { loadChapterBundle, LEVELS_BY_CODE, chapterAccessStatus } from '@/modules/curriculum/server';
import { resolveJourney, nextStation, type JourneyNode } from '@/modules/curriculum';

/**
 * GET /api/curriculum/journey?chapter= — the live island journey (client island
 * refresh for the map + «ادامه از همین‌جا» CTA). Node order comes from the
 * resolver (data-driven) — this route never reshapes it.
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

  const stationStore = getStationProgressStore();
  const chapterStore = getChapterProgressStore();
  const states = await stationStore.listForUnit(
    POC_DEFAULT_USER_ID,
    chapter.stations.map((s) => s.slug),
  );
  const chapterState = await chapterStore.get(POC_DEFAULT_USER_ID, chapter.slug);

  const journey = resolveJourney(chapter, level, states, chapterState);
  const next = nextStation(journey);
  const access = await chapterAccessStatus(chapter, POC_DEFAULT_USER_ID);

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
