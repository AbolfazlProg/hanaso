/**
 * HANASO — JourneyHome (TASK-HANASO-16) — server component.
 *
 * The shared learning-journey layout of `/learn` (auto-selected ACTIVE chapter)
 * and `/learn/[chapter]/journey` (explicit chapter — the continue target after
 * a station, or an ARCHIVE review). Renders exactly ONE chapter panel, plus
 * (owner order 2026-11-21) the PUBLISHED-chapter catalog — every published
 * chapter visible and selectable with an honest lock state:
 *
 *   chapter header (goal + honest progress, no future counts)
 *   → ONE primary CTA (deep-linked «شروع/ادامهٔ یادگیری» into the next station,
 *     or «دروازهٔ فهم» when the core path is done)
 *   → the one-section-at-a-time panel (client SectionJourney)
 *   → the PUBLISHED-chapter catalog (each chapter selectable; a locked one shows
 *     its prerequisite as the reason — Issue #94 «قفل ≠ مخفی»; drafts never list)
 *   → the late teaser (only ≥75% through the active chapter — curiosity, no lists)
 *   → the understood-chapter archive (compact, collapsible, reviewable).
 *
 * Progressive reveal's «future chapters are never listed» policy is SUPERSEDED
 * by the owner's 2026-11-21 directive («فصل دوم باید در مسیر معمول یادگیری و
 * فهرست فصل‌ها قابل مشاهده و انتخاب باشد») — the catalog lists the published
 * chapters with their states; the gates themselves are unchanged.
 */
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpenText,
  CircleCheck,
  Clock3,
  Compass,
  LibraryBig,
  Lock,
  Map as MapIcon,
  Sparkles,
} from 'lucide-react';
import { SectionJourney, type SectionDto, type StationContentKind } from './section-journey';
import type { Station } from '@/modules/curriculum/types';

/**
 * TASK-HANASO-22 — the row's CONTENT IDENTITY (mission §10.1): computed from the
 * station data (never guessable from the locked state). The milestone kind is the
 * objectiveCode marker shared by the two real-world stations; every other kind is
 * the station's own type.
 */
function contentKindOf(station: Station): StationContentKind {
  if (station.objectiveCode === 'kana-realworld-reading') return 'milestone';
  switch (station.type) {
    case 'anchor':
    case 'kana':
    case 'vocab':
    case 'grammar':
    case 'structure':
    case 'expression':
    case 'listen':
    case 'practice':
    case 'integrate':
    case 'mastery':
    case 'review':
    case 'deepdive':
      return station.type;
    default:
      return 'practice';
  }
}
import { fa } from '@/messages/fa';
import type { SectionView } from '@/modules/curriculum/journey';
import type { ArchiveChapterCard, RevealTeaser } from '@/modules/curriculum/reveal';
import type { ChapterCatalogRow } from '@/modules/curriculum/server';

export interface JourneyHomeProps {
  chapterSlug: string;
  chapterTitleFa: string;
  chapterCanDoFa: string;
  chapterEstMinutes: number;
  levelCode: string;
  /** review mode = an understood (archived) chapter opened again */
  isReview: boolean;
  chapterUnderstood: boolean;
  coreCompleted: number;
  coreTotal: number;
  corePathComplete: boolean;
  nextStationSlug: string | null;
  nextStationTitleFa: string | null;
  sections: SectionView[];
  activeSectionIndex: number;
  initialSectionSlug?: string;
  reveal: { archive: ArchiveChapterCard[]; teaser: RevealTeaser | null };
  /**
   * Owner order 2026-11-21 — the published-chapter catalog (every published
   * chapter selectable with its honest state). Absent → the section is not
   * rendered (older hosts/tests).
   */
  catalog?: ChapterCatalogRow[];
}

export function JourneyHome(props: JourneyHomeProps) {
  const {
    chapterSlug,
    chapterTitleFa,
    chapterCanDoFa,
    chapterEstMinutes,
    levelCode,
    isReview,
    chapterUnderstood,
    coreCompleted,
    coreTotal,
    corePathComplete,
    nextStationSlug,
    nextStationTitleFa,
    sections,
    activeSectionIndex,
    initialSectionSlug,
    reveal,
    catalog,
  } = props;

  // flatten the pure SectionView (with Station objects) into the client DTO
  /* prerequisite titles for the locked-row click notice (first unmet = the
   * recovery target the notice names). */
  const titleBySlug = new Map<string, string>();
  for (const sec of sections) for (const r of sec.rows) titleBySlug.set(r.node.station.slug, r.node.station.titleFa);

  const sectionDtos: SectionDto[] = sections.map((s) => ({
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
      contentKind: contentKindOf(r.node.station),
      blockedByTitlesFa: r.node.blockedBy.map((slug) => titleBySlug.get(slug) ?? slug),
      titleFa: r.node.station.titleFa,
      objectiveFa: r.node.station.objectiveFa,
      core: r.node.station.core,
      estMinutes: r.node.station.estMinutes,
      availability: r.node.availability,
      action: r.action,
      /*
       * TASK-HANASO-17 §۶: a COMPLETED station's row opens the lesson in
       * REPLAY mode — from the top, never the «already completed» wall (the
       * owner's core complaint). All other rows enter the normal walk.
       */
      href:
        r.action === 'review'
          ? `/learn/${chapterSlug}/journey/${r.node.station.slug}?mode=review`
          : `/learn/${chapterSlug}/journey/${r.node.station.slug}`,
    })),
  }));

  const progressPct = coreTotal > 0 ? Math.round((coreCompleted / coreTotal) * 100) : 0;
  const continueHref = nextStationSlug
    ? `/learn/${chapterSlug}/journey/${nextStationSlug}`
    : corePathComplete
      ? `/learn/${chapterSlug}/assessment`
      : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 pb-28 pt-10 sm:pt-12 md:pb-12">
      {/* ---- page header ---- */}
      <header className="flex flex-col gap-2">
        <p className="text-caption text-ink-soft">
          هاناسو · {isReview ? fa.curriculum.reviewModeBadge : fa.curriculum.levelLabel}{' '}
          {isReview ? `· ${levelCode}` : ''}
        </p>
        <h1 className="text-h1 font-black text-indigo">{fa.curriculum.journeyHomeTitle}</h1>
        <p className="text-lead text-ink-soft">{fa.curriculum.journeyHomeLead}</p>
      </header>

      {/* ---- active chapter card: goal + honest progress (no totals of the future) ---- */}
      <article className="relative overflow-hidden rounded-md border-2 border-indigo bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-5 -end-5 grid size-20 place-items-center rounded-full bg-indigo text-indigo-mist"
        >
          <Compass aria-hidden className="size-8" />
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-h2 font-black text-indigo">{chapterTitleFa}</h2>
          {chapterUnderstood ? (
            <span className="flex items-center gap-1 rounded-full border-2 border-ink bg-ink px-2.5 py-0.5 text-caption text-paper">
              <CircleCheck aria-hidden className="size-3.5" />
              {fa.curriculum.chapterUnderstoodBadge}
            </span>
          ) : null}
        </div>
        <p className="mt-3 max-w-prose text-body leading-[var(--leading-fa)] text-ink">{chapterCanDoFa}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-ink-soft">
          <span className="flex items-center gap-1.5">
            <Clock3 aria-hidden className="size-4" />
            {fa.curriculum.rowMinutes(chapterEstMinutes)}
          </span>
          <Link
            href={`/learn/${chapterSlug}`}
            className="flex items-center gap-1.5 rounded-md border border-ink-faint bg-surface-warm px-3 py-1 text-caption font-bold text-ink transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            <BookOpenText aria-hidden className="size-4" />
            {fa.curriculum.chapterIntroLink}
          </Link>
        </div>
        {/* progress: count + relative bar only — never «n از m» of the whole course */}
        <div className="mt-5">
          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={fa.curriculum.chapterProgressLabel}
            className="h-2.5 overflow-hidden rounded-full border border-ink-faint bg-surface-warm"
          >
            <div className="h-full rounded-full bg-indigo transition-[width]" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-2 text-caption text-ink-soft">{fa.curriculum.coreDoneCount(coreCompleted)}</p>
        </div>
      </article>

      {/* ---- THE primary CTA: one click into the real lesson ---- */}
      {continueHref ? (
        <Link
          href={continueHref}
          className="flex min-h-14 flex-wrap items-center justify-center gap-3 rounded-md bg-indigo px-6 text-lead font-black text-paper shadow-[var(--shadow-offset-cta)] transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
        >
          {corePathComplete ? (
            <>
              {fa.curriculum.gateOpenCta}
              <ArrowLeft aria-hidden className="size-5" />
            </>
          ) : (
            <>
              {coreCompleted > 0 ? fa.curriculum.continueLearning : fa.curriculum.startLearning}
              {nextStationTitleFa ? (
                <span className="text-body font-bold text-indigo-mist">— {nextStationTitleFa}</span>
              ) : null}
              <ArrowLeft aria-hidden className="size-5" />
            </>
          )}
        </Link>
      ) : null}

      {/* ---- the ONE active section panel (rows of THIS section only) ---- */}
      <SectionJourney
        chapterSlug={chapterSlug}
        initialSectionSlug={initialSectionSlug}
        nextStationSlug={nextStationSlug}
        initial={{ sections: sectionDtos, activeIndex: activeSectionIndex }}
      />

      {/* ---- THE PUBLISHED-CHAPTER CATALOG (owner order 2026-11-21) ----
       * Every published chapter of the course, selectable, with its honest
       * state. A LOCKED chapter stays listed (Issue #94 «قفل ≠ مخفی»): its row
       * carries the prerequisite as the reason and links to the chapter page,
       * which renders the same soft-lock notice — the gates are never
       * bypassed. Drafts never appear here (owner-preview content only). */}
      {catalog && catalog.length > 0 ? (
        <section
          className="rounded-md border-2 border-ink-faint bg-card p-1"
          aria-label={fa.curriculum.chapterCatalogTitle}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
            <MapIcon aria-hidden className="size-5 text-ink-soft" />
            <h2 className="text-body font-black text-ink">{fa.curriculum.chapterCatalogTitle}</h2>
            <p className="w-full text-caption text-ink-soft">{fa.curriculum.chapterCatalogHint}</p>
          </div>
          <ul className="flex flex-col gap-2 border-t border-ink-faint/50 px-4 py-3">
            {catalog.map((row) => {
              const isActive = row.slug === chapterSlug;
              const chip = row.locked ? (
                <span className="flex items-center gap-1 rounded-full border border-error/60 bg-error/10 px-2.5 py-0.5 text-caption font-bold text-error">
                  <Lock aria-hidden className="size-3.5" />
                  {fa.curriculum.chapterCatalogLockedChip}
                </span>
              ) : isActive ? (
                <span className="rounded-full border-2 border-ink bg-ink px-2.5 py-0.5 text-caption font-bold text-paper">
                  {fa.curriculum.chapterCatalogActiveChip}
                </span>
              ) : row.status === 'understood' ? (
                <span className="flex items-center gap-1 rounded-full border border-success/70 bg-success/10 px-2.5 py-0.5 text-caption font-bold text-success">
                  <CircleCheck aria-hidden className="size-3.5" />
                  {fa.curriculum.chapterCatalogUnderstoodChip}
                </span>
              ) : row.status === 'in_progress' ? (
                <span className="rounded-full border border-ai px-2.5 py-0.5 text-caption font-bold text-ai">
                  {fa.curriculum.chapterCatalogInProgressChip}
                </span>
              ) : (
                <span className="rounded-full border border-ink-faint px-2.5 py-0.5 text-caption text-ink-soft">
                  {fa.curriculum.chapterCatalogReadyChip}
                </span>
              );
              return (
                <li key={row.slug}>
                  {isActive ? (
                    /* the ACTIVE chapter's home is THIS page — its row is the
                     * anchor of the list, not a self-link */
                    <div
                      className="flex min-h-12 flex-wrap items-center gap-2 rounded-md border-2 border-indigo/60 bg-indigo-wash/30 px-4 py-2.5"
                      aria-current="true"
                    >
                      <span className="text-body font-bold text-indigo">{row.titleFa}</span>
                      {chip}
                    </div>
                  ) : (
                    <Link
                      href={`/learn/${row.slug}/journey`}
                      className="flex min-h-12 flex-wrap items-center gap-2 rounded-md border border-ink-faint bg-paper px-4 py-2.5 text-body text-ink transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
                    >
                      <span className="font-bold">{row.titleFa}</span>
                      {chip}
                      <span className="ms-auto text-caption text-ink-soft" aria-hidden>
                        {fa.curriculum.chapterCatalogOpenLabel}
                      </span>
                    </Link>
                  )}
                  {row.locked && row.prerequisiteTitleFa ? (
                    <p className="mt-1 px-4 pb-1 text-caption leading-[var(--leading-fa)] text-ink-soft">
                      {fa.curriculum.chapterCatalogLockedReason(row.prerequisiteTitleFa)}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* ---- late teaser: curiosity hook, not a list (only ≥75% through) ---- */}
      {reveal.teaser ? (
        <aside className="relative overflow-hidden rounded-md border-2 border-dashed border-ink-faint bg-surface-warm p-5">
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-6 -start-4 size-24 rounded-full bg-indigo/5"
          />
          <h2 className="flex items-center gap-2 text-h3 font-bold text-indigo">
            <Sparkles aria-hidden className="size-5" />
            {fa.curriculum.teaserTitle}
          </h2>
          <p className="mt-2 text-body font-bold text-ink">{reveal.teaser.titleFa}</p>
          <p className="mt-1 max-w-prose text-small leading-[var(--leading-fa)] text-ink-soft">
            {reveal.teaser.topicFa}
          </p>
          <p className="mt-3 text-caption text-ink-soft">{fa.curriculum.teaserHint}</p>
        </aside>
      ) : null}

      {/* ---- archive of understood chapters: compact, collapsible, reviewable ---- */}
      <details className="rounded-md border-2 border-ink-faint bg-card p-1">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-body font-bold text-ink marker:hidden">
          <LibraryBig aria-hidden className="size-5 text-ink-soft" />
          {fa.curriculum.archiveTitle}
          <span className="ms-auto text-caption text-ink-soft">{fa.curriculum.archiveSummary}</span>
        </summary>
        <div className="border-t border-ink-faint/50 px-4 py-3">
          {reveal.archive.length === 0 ? (
            <p className="text-small text-ink-soft">{fa.curriculum.archiveEmptyHint}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {reveal.archive.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/learn/${c.slug}/journey`}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-ink-faint bg-paper px-4 py-2.5 text-body text-ink transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
                  >
                    <span className="font-bold">{c.titleFa}</span>
                    <span className="flex items-center gap-1 text-caption text-ink-soft">
                      <CircleCheck aria-hidden className="size-4" />
                      {fa.curriculum.chapterUnderstoodBadge}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </main>
  );
}
