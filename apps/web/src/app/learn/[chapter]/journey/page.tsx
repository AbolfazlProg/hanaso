import { notFound } from 'next/navigation';
import {
  loadChapterBundle,
  chapterAccessStatus,
  resolveLearnerJourney,
  listPublishedChapterCatalog,
} from '@/modules/curriculum/server';
import { previewUnlockAll, unlockAllMode } from '@/lib/preview';
import { resolveLearnerId } from '@/lib/learner/server';
import { JourneyHome } from '@/components/curriculum/journey-home';
import { ChapterLockedNotice } from '@/components/curriculum/chapter-locked-notice';
import { SiteNav, resolveReviewDueCount, resolveAccountDoor } from '@/components/site-nav';
import { resolveStudyAccess } from '@/lib/auth/study-gate';
import { RecoveryNudge } from '@/components/auth/recovery-nudge';
import { GuestStudyNotice } from '@/components/auth/guest-study-notice';

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
  const reviewDueCount = await resolveReviewDueCount();
  const accountDoor = await resolveAccountDoor();
  /* The study gate (owner 2026-11-25): the chapter MAP stays open for guests
   * (this is the lesson list), with the rule said out loud. */
  const studyAccess = await resolveStudyAccess();

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
      <>
        <SiteNav
          accountHref={accountDoor.href}
          accountLabel={accountDoor.label}
          active="learn"
          reviewDueCount={reviewDueCount}
        />
        <ChapterLockedNotice
          chapterTitleFa={chapter.titleFa}
          prerequisiteSlug={access.prerequisiteSlug}
          prerequisiteTitleFa={access.prerequisiteTitleFa}
        />
      </>
    );
  }

  // TEMPORARY SITE-WIDE UNLOCK / OWNER LOCK CONTROL: UNLOCK_ALL_MODE opens every
  // section/station lock for everyone; otherwise the preview-cookie 'open' mode
  // bypasses locks and 'enforce' renders the REAL availability honestly.
  const unlockAll = unlockAllMode() || (await previewUnlockAll());
  const home = await resolveLearnerJourney(learnerId, slug, { preview: unlockAll });
  const nextStationTitle =
    home.nextStationSlug !== null
      ? (chapter.stations.find((st) => st.slug === home.nextStationSlug)?.titleFa ?? null)
      : null;
  /* Owner order 2026-11-21 — the published-chapter catalog renders on the
   * chapter map too (the learning home and the chapter pages share one
   * surface; drafts never list, the prereq gates stay intact). */
  const catalog = await listPublishedChapterCatalog(learnerId);

  return (
    <>
      {/* TASK-HANASO-17 §۴: the chapter MAP is a top-level page — the site nav
       * renders here (desktop bar + mobile bottom tabs). The station pages
       * stay immersive (nav never renders inside a lesson). */}
      <SiteNav active="learn" reviewDueCount={reviewDueCount} />
      <div className="mx-auto mt-3 flex w-full max-w-3xl flex-col gap-3 px-4">
        {studyAccess.mode === 'guest' ? <GuestStudyNotice /> : <RecoveryNudge />}
      </div>
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
        catalog={catalog}
      />
    </>
  );
}
