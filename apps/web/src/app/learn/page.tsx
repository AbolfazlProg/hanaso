import { resolveLearnerId } from '@/lib/learner/server';
import {
  hasPreviewAccess,
  previewUnlockAll,
  previewLocksMode,
  unlockAllMode,
  type PreviewLocksMode,
} from '@/lib/preview';
import {
  resolveLearnerJourney,
  listChapterSummaries,
  listDraftChapterSummaries,
  loadChapterBundle,
  chapterAccessStatus,
  listPublishedChapterCatalog,
} from '@/modules/curriculum/server';
import { JourneyHome } from '@/components/curriculum/journey-home';
import { SiteNav, resolveReviewDueCount, resolveAccountDoor } from '@/components/site-nav';

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
  const reviewDueCount = await resolveReviewDueCount();
  const accountDoor = await resolveAccountDoor();
  const previewActive = await hasPreviewAccess();
  // TEMPORARY SITE-WIDE UNLOCK (UNLOCK_ALL_MODE=1): owner-only site for now —
  // the full index renders for EVERY visitor and every gate is open, no cookie.
  const unlockEverything = unlockAllMode();
  // OWNER LOCK CONTROL: 'open' bypasses every lock at view level; 'enforce'
  // applies the real prereqs/station locks to the pv- learner (real-path test).
  const unlockAll = unlockEverything || (previewActive ? await previewUnlockAll() : false);
  const locksMode: PreviewLocksMode = previewActive ? await previewLocksMode() : 'open';
  const home = await resolveLearnerJourney(learnerId, undefined, { preview: unlockAll });
  // Full index — every published chapter + every draft. Renders for the owner's
  // preview cookie ONLY.
  // UX-AUDIT #142 (draft/published lifecycle): the temporary site-wide unlock
  // no longer lists the drafts — UNLOCK_ALL opens the PUBLISHED chapters for
  // review; a draft is owner-preview content (its own gate + pv- namespace
  // writes) and returns to the owner's preview cookie flow. The normal
  // (env unset) state renders no index at all — unchanged.
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

  /*
   * Owner order 2026-11-21 («فصل دوم باید در مسیر معمول یادگیری و فهرست فصل‌ها
   * قابل مشاهده و انتخاب باشد»): the PUBLISHED-chapter catalog renders for
   * EVERY learner on the learning home — the chapter list with honest lock
   * states (a locked chapter names its prerequisite; drafts never list — the
   * Draft/Published lifecycle and the prereq gates themselves stay intact).
   */
  const catalog = await listPublishedChapterCatalog(learnerId);
  /* ENGINE-NEXTGEN W-C: the owner preview panel's raw hex colors were the
     last untokenized color set in the app (tokens.css forbids raw hex in
     components) — every color below is now a design token reference. */

  const panelBtn = (href: string, label: string, active: boolean) =>
    active ? (
      <span
        key={label}
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          background: 'var(--color-ai)',
          color: 'var(--color-paper)',
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
          border: '1px solid var(--color-indigo-mist)',
          background: '#fff',
          color: 'var(--color-ai)',
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
      <SiteNav
        accountHref={accountDoor.href}
        accountLabel={accountDoor.label}
        active="learn"
        reviewDueCount={reviewDueCount}
      />
      {unlockEverything && !previewActive && (
        <div
          style={{
            background: 'var(--color-success)',
            color: 'var(--color-paper)',
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
          {/* UX-AUDIT #142: the unlock covers the PUBLISHED path only — the copy
              must say exactly that (the old «شامل فصل‌های پیش‌نویس» was the
              leak that made drafts look like product content). */}
          <strong>حالت بازِ کامل (موقت)</strong>
          <span style={{ opacity: 0.8 }}>
            همهٔ فصل‌های منتشرشده بدون قفل‌اند؛ فصل‌های پیش‌نویس فقط با حالت پیش‌نمایش مالک باز می‌شوند.
          </span>
        </div>
      )}
      {previewActive && (
        <div
          style={{
            background: 'var(--color-indigo-deep)',
            color: 'var(--color-indigo-mist)',
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
          <a
            href="/preview/exit"
            style={{ color: 'var(--color-indigo-mist)', textDecoration: 'underline', marginLeft: 'auto' }}
          >
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
            background: 'var(--color-paper)',
            border: '1px solid var(--color-indigo-mist)',
            borderRadius: 10,
            fontSize: 14,
          }}
        >
          <strong style={{ display: 'block', marginBottom: 8 }}>
            {previewActive ? 'فهرست کامل برای بررسی (فقط مالک)' : 'فهرست کامل درس‌ها (حالت بازِ موقت)'}
          </strong>
          {/* OWNER LOCK CONTROL — the visible two-state switch (preview cookie only);
              while the temporary site-wide unlock is on without a preview cookie,
              everything is simply open, so only a status chip renders. */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            {previewActive ? (
              <>
                <span style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
                  وضعیت قفل‌ها:{' '}
                  <strong style={{ color: locksMode === 'enforce' ? 'var(--color-error)' : 'var(--color-success)' }}>
                    {locksMode === 'enforce' ? 'فعال (قفل‌ها و پیش‌نیازهای عادی)' : 'باز (همهٔ درس‌ها بدون قفل)'}
                  </strong>
                </span>
                {panelBtn('/preview/locks?mode=open', 'بازکردن همهٔ درس‌ها', locksMode === 'open')}
                {panelBtn('/preview/locks?mode=enforce', 'فعال‌کردن قفل‌ها', locksMode === 'enforce')}
              </>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
                وضعیت قفل‌ها:{' '}
                <strong style={{ color: 'var(--color-success)' }}>باز (همهٔ درس‌ها برای همه بازند — موقت)</strong>
              </span>
            )}
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {previewIndex.map((c) => {
              const access = chapterStatus.get(c.slug);
              const locked = locksMode === 'enforce' && (access?.locked ?? false);
              return (
                <li key={c.slug}>
                  <a
                    href={`/learn/${c.slug}/journey`}
                    style={{ color: 'var(--color-ai)', textDecoration: 'underline' }}
                  >
                    {c.titleFa}
                  </a>{' '}
                  <span
                    style={{
                      color: locked ? 'var(--color-error)' : c.draft ? 'var(--color-warning)' : 'var(--color-ink-soft)',
                      fontSize: 12,
                    }}
                  >
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
        catalog={catalog}
      />
    </>
  );
}
