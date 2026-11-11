'use client';
/**
 * HANASO — SectionJourney (TASK-HANASO-16).
 *
 * The ONE-section-at-a-time learning-journey panel:
 *
 *   Chapter → Section (units[] island/story group — DD-123, grouping only)
 *          → Rows (stations in walk order) → Lessons (station content).
 *
 * UX contract (owner's direction, HANASO-16 §۲):
 *   · exactly ONE section is visible at a time — inside its own panel;
 *   · the section's rows scroll NATURALLY with the page (≤12 rows — no tiny
 *     inner scrollbox);
 *   · moving between sections happens ONLY with the explicit «بخش قبلی /
 *     بخش بعدی» buttons (destination = the section's own title), never by
 *     one long scroll through the whole chapter;
 *   · future sections are VIEWABLE with honest locked rows (DD-114: the goal
 *     stays visible — locked ≠ hidden), but nothing is enterable early
 *     (station prereqs keep gating the actual walk);
 *   · NO total counters anywhere («بخش ۲ از ۴» / «درس ۳ از ۲۵» are forbidden —
 *     progressive reveal: the course's total size is never exposed).
 *
 * Data: server-resolved derived sections (resolveSections — pure), refreshed
 * live on focus via /api/curriculum/journey (same as the old map). Order and
 * states come from data only; this component never reorders anything.
 *
 * Aizen signatures (DD-084): indigo structural frames, seigaiha wave band on
 * the section plaque, state = shape + marker (never color alone), no emoji.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CircleCheck, Compass, Diamond, Lock, Play, Repeat2 } from 'lucide-react';
import { fa } from '@/messages/fa';

/* ------------------------------------------------------------------ DTOs */

export type SectionRowAction = 'start' | 'continue' | 'review' | 'locked';
export type SectionStatusDto = 'completed' | 'in_progress' | 'locked';

export interface SectionRowDto {
  slug: string;
  type: string;
  titleFa: string;
  objectiveFa: string;
  core: boolean;
  estMinutes: number;
  availability: string;
  action: SectionRowAction;
  href: string;
}

export interface SectionDto {
  slug: string;
  titleFa: string;
  goalFa?: string;
  status: SectionStatusDto;
  rows: SectionRowDto[];
  coreCompleted: number;
  coreTotal: number;
  isFocus: boolean;
}

export interface SectionJourneyProps {
  chapterSlug: string;
  /** Deep-linked section (?s=) — server-validated; undefined = default. */
  initialSectionSlug?: string;
  initial: {
    sections: SectionDto[];
    activeIndex: number;
  };
}

/* ------------------------------------------------------------------ helpers */

/** Seigaiha wave band (DD-084) — subtle SVG texture for the section plaque. */
const SEIGAIHA_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='28' viewBox='0 0 56 28'%3E%3Cg fill='none' stroke='%23FAF7EF' stroke-opacity='0.12' stroke-width='1.1'%3E%3Cpath d='M0 28 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0'/%3E%3Cpath d='M-14 14 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0'/%3E%3Cpath d='M-28 0 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0'/%3E%3C/g%3E%3C/svg%3E\")";

/** Row state marker: shape + icon (never color alone — island §۸ honest states). */
function RowMarker({ action }: { action: SectionRowAction }) {
  const box = 'grid size-7 shrink-0 place-items-center rounded-full border-2';
  switch (action) {
    case 'review':
      return (
        <span className={`${box} border-ink bg-ink text-paper`} aria-hidden>
          <CircleCheck className="size-4" />
        </span>
      );
    case 'continue':
      return (
        <span
          className={`${box} border-ink bg-paper text-ink shadow-[0_0_0_3px_var(--color-surface-warm)]`}
          aria-hidden
        >
          <Play className="size-3.5 fill-current" />
        </span>
      );
    case 'start':
      return (
        <span className={`${box} border-ink bg-paper text-ink`} aria-hidden>
          <Compass className="size-4" />
        </span>
      );
    default:
      return (
        <span className={`${box} border-dashed border-ink-faint bg-paper text-ink-faint`} aria-hidden>
          <Lock className="size-3.5" />
        </span>
      );
  }
}

/* ------------------------------------------------------------------ component */

export function SectionJourney({ chapterSlug, initialSectionSlug, initial }: SectionJourneyProps) {
  const [sections, setSections] = useState<SectionDto[]>(initial.sections);
  const [activeIndex, setActiveIndex] = useState(() => {
    if (initialSectionSlug) {
      const idx = initial.sections.findIndex((s) => s.slug === initialSectionSlug);
      if (idx >= 0) return idx;
    }
    return initial.activeIndex;
  });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstRender = useRef(true);

  /* live refresh on tab focus (walk state changed in another tab) */
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch(`/api/curriculum/journey?chapter=${chapterSlug}`);
        const json = (await res.json()) as { data?: { sections?: SectionDto[] } };
        if (json.data?.sections && json.data.sections.length > 0) {
          setSections(json.data.sections);
        }
      } catch {
        /* offline — keep the server-rendered state */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [chapterSlug]);

  /* section switches never fight the page: panel returns to view cleanly */
  const gotoSection = useCallback(
    (index: number) => {
      setActiveIndex(index);
      const slug = sections[index]?.slug;
      if (slug) {
        const url = new URL(window.location.href);
        url.searchParams.set('s', slug);
        window.history.replaceState(null, '', url.toString());
      }
      if (!firstRender.current) {
        panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
      firstRender.current = false;
    },
    [sections],
  );

  // mark the initial (first-render) switch as non-animated
  useEffect(() => {
    firstRender.current = false;
  }, []);

  const section = sections[activeIndex] ?? sections[0];
  if (!section) return null;

  const prev = activeIndex > 0 ? sections[activeIndex - 1] : null;
  const next = activeIndex + 1 < sections.length ? sections[activeIndex + 1] : null;

  return (
    <section
      ref={panelRef}
      aria-label={section.titleFa}
      className="relative overflow-hidden rounded-md border-2 border-indigo bg-card shadow-[var(--shadow-card)]"
    >
      {/* ---- section plaque: seigaiha band + title + goal + honest status ---- */}
      <header className="relative bg-indigo p-5 text-paper sm:p-6">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ backgroundImage: SEIGAIHA_URL, backgroundSize: '56px 28px' }}
        />
        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="rounded-full border border-indigo-mist/60 px-3 py-0.5 text-caption text-indigo-mist">
            {fa.curriculum.sectionBadge}
          </span>
          <h2 className="text-h2 font-black">{section.titleFa}</h2>
        </div>
        {section.goalFa ? (
          <p className="relative mt-3 max-w-prose text-small leading-[var(--leading-fa)] text-indigo-mist">
            <span className="font-bold text-paper">{fa.curriculum.sectionGoalLabel}: </span>
            {section.goalFa}
          </p>
        ) : null}
        <p className="relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-indigo-mist">
          {section.status === 'completed' ? (
            <span className="flex items-center gap-1.5">
              <CircleCheck aria-hidden className="size-4" />
              {fa.curriculum.sectionStatusCompleted}
            </span>
          ) : section.status === 'locked' ? (
            <span className="flex items-center gap-1.5">
              <Lock aria-hidden className="size-4" />
              {fa.curriculum.sectionStatusLocked}
            </span>
          ) : (
            <span>{fa.curriculum.sectionStatusInProgress}</span>
          )}
          {section.coreCompleted > 0 ? <span>{fa.curriculum.sectionRowsDone(section.coreCompleted)}</span> : null}
        </p>
      </header>

      {/* ---- rows: stations of THIS section only, walk order, page scroll ---- */}
      <ol className="divide-y divide-ink-faint/40">
        {section.rows.map((row) => {
          const locked = row.action === 'locked';
          const body = (
            <>
              <RowMarker action={row.action} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body font-bold text-ink">
                  {row.titleFa}
                  {!row.core ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-ink-faint bg-surface-warm px-2 py-0.5 text-caption text-ink-soft">
                      <Diamond aria-hidden className="size-2.5 fill-current" />
                      {fa.curriculum.rowOptional}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-small leading-[var(--leading-fa)] text-ink-soft">{row.objectiveFa}</p>
              </div>
              <span className="flex shrink-0 items-center gap-2 text-caption text-ink-faint">
                <span className="hidden sm:inline">{fa.curriculum.rowMinutes(row.estMinutes)}</span>
                {locked ? (
                  <span className="grid size-9 place-items-center rounded-md border-2 border-dashed border-ink-faint text-ink-faint">
                    <Lock aria-hidden className="size-4" />
                  </span>
                ) : (
                  <span
                    className={
                      row.action === 'continue'
                        ? 'grid size-9 place-items-center rounded-md bg-indigo text-paper'
                        : row.action === 'review'
                          ? 'grid size-9 place-items-center rounded-md border-2 border-ink bg-card text-ink'
                          : 'grid size-9 place-items-center rounded-md border-2 border-ink bg-paper text-ink'
                    }
                  >
                    {row.action === 'continue' ? (
                      <ArrowLeft aria-hidden className="size-4" />
                    ) : row.action === 'review' ? (
                      <Repeat2 aria-hidden className="size-4" />
                    ) : (
                      <Play aria-hidden className="size-4 fill-current" />
                    )}
                  </span>
                )}
              </span>
            </>
          );

          return (
            <li key={row.slug}>
              {locked ? (
                /* honest locked row: visible goal, no entry (island §۸ / DD-114) */
                <div
                  aria-disabled
                  className="flex items-center gap-3 p-4 opacity-70 sm:gap-4 sm:p-5"
                  title={fa.curriculum.rowLocked}
                >
                  {body}
                </div>
              ) : (
                <Link
                  href={row.href}
                  className="group flex items-center gap-3 p-4 transition-colors hover:bg-indigo-wash focus-visible:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ai sm:gap-4 sm:p-5"
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {/* ---- section navigation: explicit buttons with named destinations ---- */}
      <nav
        aria-label={fa.curriculum.sectionBadge}
        className="grid grid-cols-1 gap-3 border-t-2 border-indigo bg-surface-warm p-4 sm:grid-cols-2 sm:p-5"
      >
        {prev ? (
          <button
            type="button"
            onClick={() => gotoSection(activeIndex - 1)}
            className="flex min-h-14 items-center gap-3 rounded-md border-2 border-ink bg-card px-4 py-3 text-start transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            <ArrowRight aria-hidden className="size-5 shrink-0 text-ink-soft" />
            <span className="min-w-0">
              <span className="block text-caption text-ink-soft">{fa.curriculum.sectionPrev}</span>
              <span className="block truncate text-body font-bold text-ink">{prev.titleFa}</span>
            </span>
          </button>
        ) : (
          <p className="flex min-h-14 items-center gap-2 rounded-md border-2 border-dashed border-ink-faint/50 px-4 py-3 text-caption text-ink-faint">
            <ArrowRight aria-hidden className="size-4" />
            {fa.curriculum.sectionFirstHint}
          </p>
        )}

        {next ? (
          <button
            type="button"
            onClick={() => gotoSection(activeIndex + 1)}
            className="flex min-h-14 items-center justify-end gap-3 rounded-md border-2 border-indigo bg-indigo px-4 py-3 text-end text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            <span className="min-w-0">
              <span className="block text-caption text-indigo-mist">
                {fa.curriculum.sectionNext}
                {next.status === 'locked' ? ` — ${fa.curriculum.sectionStatusLocked}` : ''}
              </span>
              <span className="block truncate text-body font-bold">{next.titleFa}</span>
              {next.status === 'locked' ? (
                <span className="block text-caption text-indigo-mist">{fa.curriculum.sectionNextLockedHint}</span>
              ) : null}
            </span>
            <ArrowLeft aria-hidden className="size-5 shrink-0" />
          </button>
        ) : (
          <p className="flex min-h-14 items-center justify-end gap-2 rounded-md border-2 border-dashed border-ink-faint/50 px-4 py-3 text-caption text-ink-faint sm:col-start-2">
            {fa.curriculum.sectionLastHint}
            <ArrowLeft aria-hidden className="size-4" />
          </p>
        )}
      </nav>
    </section>
  );
}
