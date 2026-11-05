import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadChapterBundle, LEVELS_BY_CODE, chapterAccessStatus } from '@/modules/curriculum/server';
import { getStationProgressStore, getChapterProgressStore } from '@/lib/poc/stores';
import { POC_DEFAULT_USER_ID } from '@/lib/poc/principal';
import { resolveJourney, nextStation } from '@/modules/curriculum';
import { JourneyMap } from '@/components/curriculum/journey-map';
import { fa } from '@/messages/fa';

/**
 * /learn/[chapter]/journey — TASK-LEARNING-01 page 3: the ISLAND MAP.
 * Server-resolved journey (order from data) + the live island (focus refresh).
 */
export const dynamic = 'force-dynamic';

export default async function JourneyPage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter: slug } = await params;
  let bundle;
  try {
    bundle = loadChapterBundle(slug);
  } catch {
    notFound();
  }
  const chapter = bundle!.chapter;
  const level = LEVELS_BY_CODE[chapter.levelCode]!;

  const stationStates = await getStationProgressStore().listForUnit(
    POC_DEFAULT_USER_ID,
    chapter.stations.map((s) => s.slug),
  );
  const chapterState = await getChapterProgressStore().get(POC_DEFAULT_USER_ID, chapter.slug);
  const journey = resolveJourney(chapter, level, stationStates, chapterState);
  const next = nextStation(journey);
  // TASK-LEARNING-06: chapter-level soft lock (e.g. Ch02 needs the kana gate G1).
  const access = await chapterAccessStatus(chapter, POC_DEFAULT_USER_ID);

  if (access.locked) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-12">
        <header className="flex flex-col gap-2">
          <p className="text-caption text-ink-soft">{chapter.titleFa}</p>
          <h1 className="text-h1 font-black text-indigo">{fa.curriculum.chapterLockedTitle}</h1>
        </header>
        <section className="rounded-md border border-ink-faint bg-card p-6">
          <p className="text-body leading-[var(--leading-fa)] text-ink">{fa.curriculum.chapterLockedBody}</p>
          {access.prerequisiteSlug ? (
            <Link
              href={`/learn/${access.prerequisiteSlug}`}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-ai px-4 py-2 text-body font-bold text-ai"
            >
              {fa.curriculum.goPrerequisite} — {access.prerequisiteTitleFa}
            </Link>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-caption text-ink-soft">{chapter.titleFa}</p>
        <h1 className="text-h1 font-black text-indigo">{fa.curriculum.journeyTitle}</h1>
        <p className="text-lead text-ink-soft">{fa.curriculum.journeyLead}</p>
      </header>

      <JourneyMap
        chapterSlug={chapter.slug}
        initial={{
          nodes: journey.nodes.map((n) => ({
            slug: n.station.slug,
            type: n.station.type,
            titleFa: n.station.titleFa,
            objectiveFa: n.station.objectiveFa,
            core: n.station.core,
            estMinutes: n.station.estMinutes,
            availability: n.availability,
            blockedBy: n.blockedBy,
            href: `/learn/${chapter.slug}/journey/${n.station.slug}`,
          })),
          coreCompleted: journey.coreCompleted,
          coreTotal: journey.coreTotal,
          chapterStatus: chapterState?.status ?? null,
          nextStationSlug: next?.slug ?? null,
          units: journey.unitGroups?.map((g) => ({
            slug: g.unit.slug,
            titleFa: g.unit.titleFa,
            summaryFa: g.unit.summaryFa,
            stationSlugs: g.unit.stationSlugs,
          })),
        }}
      />
    </main>
  );
}
