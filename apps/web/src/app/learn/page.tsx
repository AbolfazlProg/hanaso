import { resolveLearnerId } from '@/lib/learner/server';
import { resolveLearnerJourney } from '@/modules/curriculum/server';
import { JourneyHome } from '@/components/curriculum/journey-home';

/**
 * /learn — the LEARNING JOURNEY home (TASK-HANASO-16).
 *
 * One chapter at a time, extracted FROM PROGRESS (never a frontend constant,
 * never a chapter list): a brand-new learner lands on the first chapter; a
 * learner mid-chapter lands exactly there; a learner who passed a gate lands
 * on the next chapter automatically. Refresh keeps the same place (server
 * resolves the same state). The chapter's content shows ONE SECTION at a time
 * (the SectionJourney panel); future chapters are never listed — only a late
 * teaser (≥75% through) and the understood-chapter archive appear below.
 *
 * TASK-LEARNING-07 / Issue #101 still holds: no links into /poc/* from product
 * pages. The old full chapter list (learnIndex*) was removed on purpose —
 * progressive reveal is the owner's direction (HANASO-16 §۳).
 */
export const dynamic = 'force-dynamic';

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const learnerId = await resolveLearnerId();
  const home = await resolveLearnerJourney(learnerId);

  const nextStationTitle =
    home.nextStationSlug !== null
      ? (home.chapter.stations.find((st) => st.slug === home.nextStationSlug)?.titleFa ?? null)
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
