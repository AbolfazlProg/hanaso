import { notFound } from 'next/navigation';
import { loadChapterBundle, chapterAccessStatus, resolveLearnerJourney } from '@/modules/curriculum/server';
import { resolveLearnerId } from '@/lib/learner/server';
import { JourneyHome } from '@/components/curriculum/journey-home';
import { ChapterLockedNotice } from '@/components/curriculum/chapter-locked-notice';

/**
 * /learn/[chapter]/journey — TASK-HANASO-16: the one-section-at-a-time journey
 * of ONE chapter. This is the deep-linked target of the station runner's
 * «ادامهٔ مسیر» CTA and of the archive review links. The old long vertical
 * island trail was replaced by the section panel on purpose (owner direction):
 * one section visible at a time, prev/next buttons between sections, honest
 * locked rows for what is not yet reachable — the walk order and every
 * availability still come 100% from the data-driven resolver.
 *
 * Deep links: `?s=<sectionSlug>` opens a specific section (server-validated —
 * an unknown slug falls back to the learner's active section). A locked
 * chapter renders the same honest notice as every other chapter route (#94).
 */
export const dynamic = 'force-dynamic';

export default async function JourneyPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapter: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { chapter: slug } = await params;
  const { s } = await searchParams;

  let bundle;
  try {
    bundle = loadChapterBundle(slug);
  } catch {
    notFound();
  }
  const chapter = bundle!.chapter;

  const learnerId = await resolveLearnerId();

  // #94: the chapter soft lock gates this route exactly like the station page.
  const access = await chapterAccessStatus(chapter, learnerId);
  if (access.locked) {
    return (
      <ChapterLockedNotice
        chapterTitleFa={chapter.titleFa}
        prerequisiteSlug={access.prerequisiteSlug}
        prerequisiteTitleFa={access.prerequisiteTitleFa}
      />
    );
  }

  const home = await resolveLearnerJourney(learnerId, slug);
  const nextStationTitle =
    home.nextStationSlug !== null
      ? (chapter.stations.find((st) => st.slug === home.nextStationSlug)?.titleFa ?? null)
      : null;

  return (
    <JourneyHome
      chapterSlug={home.chapter.slug}
      chapterTitleFa={home.chapter.titleFa}
      chapterCanDoFa={home.chapter.canDoFa}
      chapterEstMinutes={home.chapter.estMinutes}
      levelCode={home.chapter.levelCode}
      isReview={home.isReview}
      chapterUnderstood={home.chapterState?.status === 'understood'}
      coreCompleted={home.coreCompleted}
      coreTotal={home.coreTotal}
      corePathComplete={home.corePathComplete}
      nextStationSlug={home.nextStationSlug}
      nextStationTitleFa={nextStationTitle}
      sections={home.sections}
      activeSectionIndex={home.activeSectionIndex}
      initialSectionSlug={s}
      reveal={{ archive: home.reveal.archive, teaser: home.isReview ? null : home.reveal.teaser }}
    />
  );
}
