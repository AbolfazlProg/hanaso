import { resolveLearnerId } from '@/lib/learner/server';
import { hasPreviewAccess, previewUnlockAll, previewLocksMode, type PreviewLocksMode } from '@/lib/preview';
import {
  resolveLearnerJourney,
  listChapterSummaries,
  listDraftChapterSummaries,
  loadChapterBundle,
  chapterAccessStatus,
} from '@/modules/curriculum/server';
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
  // OWNER LOCK CONTROL: 'open' bypasses every lock at view level; 'enforce'
  // applies the real prereqs/station locks to the pv- learner (real-path test).
  const unlockAll = previewActive ? await previewUnlockAll() : false;
  const locksMode: PreviewLocksMode = previewActive ? await previewLocksMode() : 'open';
  const home = await resolveLearnerJourney(learnerId, undefined, { preview: unlockAll });
  // PREVIEW MODE: the owner's full index — every published chapter + every draft
  // (this block renders ONLY with a valid preview cookie; normal users never see
  // it, even when the env key is set).
  const previewIndex = previewActive
    ? [
        ...listChapterSummaries().map((c) => ({ ...c, draft: false })),
        ...listDraftChapterSummaries().map((c) => ({ ...c, draft: true })),
      ]
    : [];
  // Per-chapter lock status for the owner panel. Drafts are owner-reviewable in
  // BOTH modes (unpublished content is not part of the real learner path);
  // published chapters honour the current mode through chapterAccessStatus.
  const chapterStatus = new Map<string, { locked: boolean; prerequisiteTitleFa: string | null }>();
  if (previewActive) {
    for (const c of previewIndex) {
      if (c.draft) continue;
      try {
        const access = await chapterAccessStatus(loadChapterBundle(c.slug).chapter, learnerId);
        chapterStatus.set(c.slug, access);
      } catch {
        // unreadable chapter — render as open rather than break the home page
      }
    }
  }

  const nextStationTitle =
    home.nextStationSlug !== null
      ? (home.chapter.stations.find((st) => st.slug === home.nextStationSlug)?.titleFa ?? null)
      : null;

  const panelBtn = (href: string, label: string, active: boolean) =>
    active ? (
      <span
        key={label}
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          background: '#1d4ed8',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {label}
      </span>
    ) : (
      <a
        key={label}
        href={href}
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid #cbd5e1',
          background: '#fff',
          color: '#1d4ed8',
          fontSize: 13,
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        {label}
      </a>
    );

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
          <span style={{ opacity: 0.75 }}>
            {locksMode === 'enforce'
              ? 'قفل‌ها فعال‌اند — مسیر واقعی زبان‌آموز در فضای پیش‌نمایش آزمایش می‌شود.'
              : 'همهٔ درس‌ها بازند؛ پیشرفت در فضای جداگانه ذخیره می‌شود.'}
          </span>
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
          {/* OWNER LOCK CONTROL — the visible two-state switch */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#334155' }}>
              وضعیت قفل‌ها:{' '}
              <strong style={{ color: locksMode === 'enforce' ? '#b91c1c' : '#166534' }}>
                {locksMode === 'enforce' ? 'فعال (قفل‌ها و پیش‌نیازهای عادی)' : 'باز (همهٔ درس‌ها بدون قفل)'}
              </strong>
            </span>
            {panelBtn('/preview/locks?mode=open', 'بازکردن همهٔ درس‌ها', locksMode === 'open')}
            {panelBtn('/preview/locks?mode=enforce', 'فعال‌کردن قفل‌ها', locksMode === 'enforce')}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {previewIndex.map((c) => {
              const access = chapterStatus.get(c.slug);
              const locked = locksMode === 'enforce' && (access?.locked ?? false);
              return (
                <li key={c.slug}>
                  <a href={`/learn/${c.slug}/journey`} style={{ color: '#1d4ed8', textDecoration: 'underline' }}>
                    {c.titleFa}
                  </a>{' '}
                  <span style={{ color: locked ? '#b91c1c' : c.draft ? '#b45309' : '#64748b', fontSize: 12 }}>
                    ({c.draft ? `پیش‌نویس${locksMode === 'enforce' ? ' · قفل‌های داخلی فعال' : ''}` : 'منتشرشده'} ·{' '}
                    {c.levelCode}
                    {locked ? ` · قفل — پیش‌نیاز: ${access?.prerequisiteTitleFa ?? 'فصل قبل'}` : ''})
                  </span>
                </li>
              );
            })}
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
