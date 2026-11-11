/**
 * HANASO — JourneyHome (TASK-HANASO-16) — server component.
 *
 * The shared learning-journey layout of `/learn` (auto-selected ACTIVE chapter)
 * and `/learn/[chapter]/journey` (explicit chapter — the continue target after
 * a station, or an ARCHIVE review). Renders exactly ONE chapter, never a
 * chapter list:
 *
 *   chapter header (goal + honest progress, no future counts)
 *   → ONE primary CTA (deep-linked «شروع/ادامهٔ یادگیری» into the next station,
 *     or «دروازهٔ فهم» when the core path is done)
 *   → the one-section-at-a-time panel (client SectionJourney)
 *   → the late teaser (only ≥75% through the active chapter — curiosity, no lists)
 *   → the understood-chapter archive (compact, collapsible, reviewable).
 *
 * Progressive reveal (owner's direction): future chapters are NEVER listed and
 * the course's total size is never exposed anywhere on this page.
 */
import Link from 'next/link';
import { ArrowLeft, BookOpenText, CircleCheck, Clock3, Compass, LibraryBig, Sparkles } from 'lucide-react';
import { SectionJourney, type SectionDto } from './section-journey';
import { fa } from '@/messages/fa';
import type { SectionView } from '@/modules/curriculum/journey';
import type { ArchiveChapterCard, RevealTeaser } from '@/modules/curriculum/reveal';

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
  } = props;

  // flatten the pure SectionView (with Station objects) into the client DTO
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
      titleFa: r.node.station.titleFa,
      objectiveFa: r.node.station.objectiveFa,
      core: r.node.station.core,
      estMinutes: r.node.station.estMinutes,
      availability: r.node.availability,
      action: r.action,
      href: `/learn/${chapterSlug}/journey/${r.node.station.slug}`,
    })),
  }));

  const progressPct = coreTotal > 0 ? Math.round((coreCompleted / coreTotal) * 100) : 0;
  const continueHref = nextStationSlug
    ? `/learn/${chapterSlug}/journey/${nextStationSlug}`
    : corePathComplete
      ? `/learn/${chapterSlug}/assessment`
      : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10 sm:py-12">
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
              {nextStationTitleFa ? <span className="text-body font-bold text-indigo-mist">— {nextStationTitleFa}</span> : null}
              <ArrowLeft aria-hidden className="size-5" />
            </>
          )}
        </Link>
      ) : null}

      {/* ---- the ONE active section panel (rows of THIS section only) ---- */}
      <SectionJourney
        chapterSlug={chapterSlug}
        initialSectionSlug={initialSectionSlug}
        initial={{ sections: sectionDtos, activeIndex: activeSectionIndex }}
      />

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
          <p className="mt-1 max-w-prose text-small leading-[var(--leading-fa)] text-ink-soft">{reveal.teaser.topicFa}</p>
          <p className="mt-3 text-caption text-ink-faint">{fa.curriculum.teaserHint}</p>
        </aside>
      ) : null}

      {/* ---- archive of understood chapters: compact, collapsible, reviewable ---- */}
      <details className="rounded-md border-2 border-ink-faint bg-card p-1">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-body font-bold text-ink marker:hidden">
          <LibraryBig aria-hidden className="size-5 text-ink-soft" />
          {fa.curriculum.archiveTitle}
          <span className="ms-auto text-caption text-ink-faint">{fa.curriculum.archiveSummary}</span>
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
