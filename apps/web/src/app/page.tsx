import Link from 'next/link';
import { ArrowLeft, BookOpenText, CircleCheck, Compass, Repeat2 } from 'lucide-react';
import { resolveLearnerId } from '@/lib/learner/server';
import { resolveHome } from '@/modules/home/server';
import { SiteNav } from '@/components/site-nav';
import { fa } from '@/messages/fa';
import { buildInfo } from '@/lib/build-info';

/**
 * / — the LEARNER HOME (TASK-HANASO-17).
 *
 * «داشبورد یک تصمیم است، نه ویترین» (KB dashboard-blueprint §۱ / PG-01):
 * one glance answers «امروز چه کار کنم؟» and ONE click enters the real
 * lesson — no intermediate pages, no repeated chapter intro, no fake numbers.
 *
 * Everything on this page is resolved from REAL progress on the server (RSC,
 * force-dynamic — PG-01: «RSC با دادهٔ اولیه؛ بدون اسپینر سمت کلاینت»):
 *   greeting (short, name-less — no valid name data exists yet)
 *   → the ONE primary CTA (six learner states — modules/home/home-view.ts)
 *   → the «درس بعدی» secondary card (only when it differs from the primary)
 *   → the honest review line (FSRS engine not integrated — never a fake count)
 *   → the compact path strip (no future totals — progressive reveal)
 *   → honest one-line stats.
 *
 * The old M0 infrastructure landing (bilingual sample + version card) is
 * replaced on purpose; the version/health line survives as a tiny footer.
 */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const learnerId = await resolveLearnerId();
  const { view, dateLine } = await resolveHome(learnerId);
  const info = buildInfo();

  const primaryLabel =
    view.primary.state === 'resume'
      ? fa.home.primaryResume
      : view.primary.state === 'resume_expired'
        ? fa.home.primaryRestart
        : view.primary.state === 'gate'
          ? fa.home.primaryGate
          : view.primary.state === 'next'
            ? fa.home.primaryNext
            : view.primary.state === 'review_course'
              ? fa.home.primaryReviewCourse
              : fa.home.primaryStart;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav active="home" />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-28 pt-8 md:pb-12 md:pt-10">
        {/* ---- greeting: one short line + neutral day-line (PG-01; no name —
         * no valid name data exists; no motivational slogans) ---- */}
        <header className="flex flex-col gap-1">
          <h1 className="text-h1 font-black text-indigo">{fa.home.greeting}</h1>
          <p className="text-body text-ink-soft">
            {dateLine} · {fa.home.lead}
          </p>
        </header>

        {/* ---- THE primary card — the single main CTA of the whole page ---- */}
        <article className="relative overflow-hidden rounded-md border-2 border-indigo bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-5 -end-5 grid size-20 place-items-center rounded-full bg-indigo text-indigo-mist"
          >
            <Compass aria-hidden className="size-8" />
          </span>
          <p className="text-caption font-bold uppercase tracking-[0.14em] text-ink-faint">{fa.home.primaryTitle}</p>
          <h2 className="mt-2 text-h2 font-black text-ink">
            {view.primary.stationTitleFa ?? view.primary.chapterTitleFa}
          </h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-soft">
            {view.primary.chapterTitleFa ? <span>{view.primary.chapterTitleFa}</span> : null}
            {view.primary.estMinutes ? <span>{fa.home.minutesLine(view.primary.estMinutes)}</span> : null}
          </p>
          {view.primary.state === 'resume_expired' ? (
            <p className="mt-3 rounded-md border border-ai/40 bg-indigo-wash/60 px-4 py-2 text-small leading-[var(--leading-fa)] text-ink">
              {fa.home.primaryResumeExpiredNote}
            </p>
          ) : null}
          <Link
            href={view.primary.href}
            className="mt-5 flex min-h-14 w-fit items-center justify-center gap-3 rounded-md bg-indigo px-8 text-lead font-black text-paper shadow-[var(--shadow-offset-cta)] transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            {primaryLabel}
            <ArrowLeft aria-hidden className="size-5" />
          </Link>
        </article>

        {/* ---- secondary «درس بعدی» — only a DIFFERENT startable lesson ---- */}
        {view.nextLesson ? (
          <article className="rounded-md border-2 border-ink-faint bg-card p-5 sm:p-6">
            <h2 className="text-h3 font-bold text-ink">{fa.home.nextLessonTitle}</h2>
            <p className="mt-1 text-small leading-[var(--leading-fa)] text-ink-soft">{fa.home.nextLessonBody}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-body font-bold text-ink">
                {view.nextLesson.titleFa}
                <span className="ms-3 text-caption font-normal text-ink-soft">
                  {fa.home.minutesLine(view.nextLesson.estMinutes)}
                </span>
              </p>
              <Link
                href={view.nextLesson.href}
                className="flex h-12 items-center gap-2 rounded-md border-2 border-ink bg-paper px-5 text-body font-bold text-ink transition-colors hover:bg-surface-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
              >
                {fa.home.nextLessonCta}
                <ArrowLeft aria-hidden className="size-4" />
              </Link>
            </div>
          </article>
        ) : null}

        {/* ---- review: HONEST states only (mission §3.2 — no fake counts).
         * Engine not integrated + enrolled cards exist → one quiet line;
         * brand-new learner → nothing (the primary CTA is the whole page). ---- */}
        {view.review.kind === 'queue_pending' ? (
          <p className="flex items-start gap-2.5 rounded-md border border-ink-faint bg-surface-warm px-4 py-3 text-small leading-[var(--leading-fa)] text-ink-soft">
            <Repeat2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-faint" />
            {fa.home.reviewQueuePending}
          </p>
        ) : view.review.kind === 'due' ? (
          <article className="flex flex-wrap items-center justify-between gap-3 rounded-md border-2 border-ink-faint bg-card p-5">
            <p className="text-body font-bold text-ink">{fa.home.reviewDue(view.review.count)}</p>
            <Link
              href="/review"
              className="flex h-12 items-center gap-2 rounded-md bg-ink px-5 text-body font-bold text-paper transition-colors hover:bg-indigo focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
            >
              {fa.home.reviewCta}
              <ArrowLeft aria-hidden className="size-4" />
            </Link>
          </article>
        ) : view.review.kind === 'empty' ? (
          <p className="rounded-md border border-success/50 bg-card px-4 py-3 text-small text-ink-soft">
            {fa.home.reviewEmpty}
          </p>
        ) : null}

        {/* ---- the compact path strip — map stays one quiet link away ---- */}
        <section className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-md border-2 border-dashed border-ink-faint bg-surface-warm px-5 py-4">
          <div className="min-w-0">
            <p className="text-body font-bold text-ink">{fa.home.pathCurrentChapter(view.path.chapterTitleFa)}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-caption text-ink-soft">
              <CircleCheck aria-hidden className="size-3.5 text-success" />
              {fa.home.pathCoreDone(view.path.coreCompleted)}
            </p>
          </div>
          <Link
            href={view.path.href}
            className="flex h-12 shrink-0 items-center gap-2 rounded-md border-2 border-indigo bg-card px-5 text-body font-bold text-indigo transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            <BookOpenText aria-hidden className="size-4" />
            {fa.home.pathLink}
            <ArrowLeft aria-hidden className="size-4" />
          </Link>
        </section>

        {/* ---- honest one-line stats (only when there is real progress) ---- */}
        {view.stats ? (
          <p className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-caption text-ink-faint">
            <span>{fa.home.statsStations(view.stats.stationsCompleted)}</span>
            {view.stats.chaptersUnderstood > 0 ? (
              <span>{fa.home.statsChapters(view.stats.chaptersUnderstood)}</span>
            ) : null}
          </p>
        ) : null}
      </main>

      {/* ---- tiny ops footer (the old landing's version card, compressed) ---- */}
      <footer className="border-t border-ink-faint px-4 pb-24 pt-4 md:pb-6">
        <p className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-faint">
          <span>
            {fa.home.footerHealth}: <code>{info.version}</code>
          </span>
          <a className="text-ai underline underline-offset-4" href="/api/health">
            /api/health
          </a>
        </p>
      </footer>
    </div>
  );
}
