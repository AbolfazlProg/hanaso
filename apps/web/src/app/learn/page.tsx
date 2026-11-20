import { resolveLearnerId } from '@/lib/learner/server';
import { hasPreviewAccess } from '@/lib/preview';
import { resolveLearnerJourney, listChapterSummaries, listDraftChapterSummaries } from '@/modules/curriculum/server';
import { JourneyHome } from '@/components/curriculum/journey-home';
import { SiteNav } from '@/components/site-nav';

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
 *
 * TASK-HANASO-17 §۴: top-level page → the site nav renders (the lesson pages
 * stay immersive).
 */
export const dynamic = 'force-dynamic';

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const learnerId = await resolveLearnerId();
  const previewActive = await hasPreviewAccess();
  const home = await resolveLearnerJourney(learnerId, undefined, { preview: previewActive });
  // PREVIEW MODE: the owner's full index — every published chapter + every draft,
  // all unlocked (this block renders ONLY with a valid preview cookie; normal
  // users never see it, even when the env key is set).
  const previewIndex = previewActive
    ? [
        ...listChapterSummaries().map((c) => ({ ...c, draft: false })),
        ...listDraftChapterSummaries().map((c) => ({ ...c, draft: true })),
      ]
    : [];

  const nextStationTitle =
    home.nextStationSlug !== null
      ? (home.chapter.stations.find((st) => st.slug === home.nextStationSlug)?.titleFa ?? null)
      : null;

  return (
    <>
      <SiteNav active="learn" />
      {previewActive && (
        <div
          style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '10px 16px',
            fontSize: 13,
            borderRadius: 10,
            margin: '8px auto 0',
            maxWidth: 720,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <strong>حالت پیش‌نمایش مالک فعال است</strong>
          <span style={{ opacity: 0.75 }}>پیشرفت در فضای جداگانه ذخیره می‌شود — قفل‌ها فقط برای شما بازند.</span>
          <a href="/preview/exit" style={{ color: '#93c5fd', textDecoration: 'underline', marginLeft: 'auto' }}>
            خروج از پیش‌نمایش
          </a>
        </div>
      )}
      {previewIndex.length > 0 && (
        <div
          style={{
            maxWidth: 720,
            margin: '12px auto',
            padding: '12px 16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            fontSize: 14,
          }}
        >
          <strong style={{ display: 'block', marginBottom: 8 }}>فهرست کامل برای بررسی (فقط مالک)</strong>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {previewIndex.map((c) => (
              <li key={c.slug}>
                <a href={`/learn/${c.slug}/journey`} style={{ color: '#1d4ed8', textDecoration: 'underline' }}>
                  {c.titleFa}
                </a>{' '}
                <span style={{ color: c.draft ? '#b45309' : '#64748b', fontSize: 12 }}>
                  ({c.draft ? 'پیش‌نویس' : 'منتشرشده'} · {c.levelCode})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
    </>
  );
}
