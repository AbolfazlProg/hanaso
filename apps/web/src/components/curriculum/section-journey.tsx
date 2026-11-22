'use client';
/**
 * HANASO — SectionJourney (TASK-HANASO-16 · icons + locked feedback: TASK-HANASO-22).
 *
 * The ONE-section-at-a-time learning-journey panel:
 *
 *   Chapter → Section (units[] group — DD-123, grouping only)
 *          → Rows (stations in walk order) → Lessons (station content).
 *
 * UX contract (owner's direction, HANASO-16 §۲):
 *   · exactly ONE section is visible at a time — inside its own panel;
 *   · the section's rows scroll NATURALLY with the page (no tiny inner scrollbox);
 *   · moving between sections happens ONLY with the explicit «بخش قبلی /
 *     بخش بعدی» buttons (destination = the section's own title);
 *   · future sections are VIEWABLE with honest locked rows (DD-114: the goal
 *     stays visible — locked ≠ hidden), but nothing is enterable early
 *     (station prereqs keep gating the actual walk);
 *   · NO total counters anywhere («بخش ۲ از ۴» / «درس ۳ از ۲۵» are forbidden —
 *     progressive reveal: the course's total size is never exposed).
 *
 * TASK-HANASO-22 (mission §PHASE 10 — the duplicate-lock fix):
 *   · the RIGHT icon is the row's CONTENT IDENTITY (kana / vocab / grammar /
 *     listening / practice / review / milestone / …) — visible and recognizable
 *     even when the row is locked (locked ≠ faceless);
 *   · the LEFT marker carries the ACCESS state (lock / start / continue / done);
 *   · a locked row is a real BUTTON: a click answers with a short shake +
 *     vermilion flash on the access marker + a Persian notice naming the first
 *     unmet prerequisite — never a dead, silent row.
 *
 * Aizen signatures (DD-084): indigo structural frames, seigaiha wave band on
 * the section plaque, state = shape + marker (never color alone), no emoji.
 */
import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Blocks,
  BookOpen,
  CircleCheck,
  Compass,
  Headphones,
  Layers,
  Lock,
  MessageCircle,
  Play,
  Puzzle,
  Repeat2,
  Shapes,
  ShieldCheck,
  Target,
  MapPin,
} from 'lucide-react';
import { fa } from '@/messages/fa';
import { MixedFaJaText } from '@/components/curriculum/mixed-fa-ja-text';
import { KanaMarkIcon } from '@/components/curriculum/kana-mark-icon';

/* ------------------------------------------------------------------ DTOs */

export type SectionRowAction = 'start' | 'continue' | 'review' | 'locked';
export type SectionStatusDto = 'completed' | 'in_progress' | 'locked';

/** The row's content identity — computed server-side from the station data. */
export type StationContentKind =
  | 'anchor'
  | 'kana'
  | 'milestone'
  | 'vocab'
  | 'grammar'
  | 'structure'
  | 'expression'
  | 'listen'
  | 'practice'
  | 'integrate'
  | 'mastery'
  | 'review'
  | 'deepdive';

export interface SectionRowDto {
  slug: string;
  type: string;
  /** Content identity for the right-side icon (TASK-HANASO-22). */
  contentKind: StationContentKind;
  titleFa: string;
  objectiveFa: string;
  core: boolean;
  estMinutes: number;
  availability: string;
  action: SectionRowAction;
  href: string;
  /** Persian titles of the unmet prerequisites (first = the recovery target). */
  blockedByTitlesFa?: string[];
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
  /**
   * TASK-HANASO-28 (Subagent C fix): the slug of the learner's NEXT actionable
   * core station (server's nextStation). The current-row marker matches THIS
   * slug exactly — never a `section.isFocus && action` heuristic (an optional
   * available station in the focus section used to win the «ایستگاه فعلی»
   * chip, the aria-current and the auto-scroll target). Null = the chapter's
   * core path is done → no row is «current».
   */
  nextStationSlug?: string | null;
  initial: {
    sections: SectionDto[];
    activeIndex: number;
  };
}

/* ------------------------------------------------------------------ identity icons */

/**
 * HANASO-IR owner fix (item 5): kana rows carry the OWNED KanaMarkIcon (the
 * hand-drawn あ brush mark) — the stock lucide `Languages` bubbles read as the
 * Google Translate logo and were rejected. The map widens to a plain
 * component type so the custom mark sits beside the lucide set unchanged.
 */
const CONTENT_KIND_ICON: Record<
  StationContentKind,
  ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
> = {
  anchor: Compass,
  kana: KanaMarkIcon,
  milestone: Award,
  vocab: BookOpen,
  grammar: Shapes,
  structure: Blocks,
  expression: MessageCircle,
  listen: Headphones,
  practice: Target,
  integrate: Puzzle,
  mastery: ShieldCheck,
  review: Repeat2,
  deepdive: Layers,
};

const CONTENT_KIND_LABEL_FA: Record<StationContentKind, string> = {
  anchor: 'درس آغازین',
  kana: 'درس کانا',
  milestone: 'ایستگاه واقعی',
  vocab: 'درس واژه',
  grammar: 'درس گرامر',
  structure: 'درس ساختار',
  expression: 'درس تعبیر',
  listen: 'درس شنیداری',
  practice: 'تمرین',
  integrate: 'کاربرد',
  mastery: 'دروازهٔ فصل',
  review: 'مرور',
  deepdive: 'عمیق‌تر (اختیاری)',
};

/** The right-side identity tile — recognizable even when locked.
 *  The label rides as the accessible name (not color/shape alone — §10.2). */
function ContentTypeTile({ kind, locked }: { kind: StationContentKind; locked: boolean }) {
  const Icon = CONTENT_KIND_ICON[kind] ?? Target;
  const label = CONTENT_KIND_LABEL_FA[kind];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={
        locked
          ? 'grid size-9 place-items-center rounded-md border-2 border-dashed border-ink-faint/70 text-ink-faint opacity-75'
          : 'grid size-9 place-items-center rounded-md border-2 border-ink-faint bg-card text-ink-soft'
      }
    >
      <Icon aria-hidden className="size-4" />
    </span>
  );
}

/* ------------------------------------------------------------------ helpers */

/** Seigaiha wave band (DD-084) — subtle SVG texture for the section plaque. */

/** Row state marker: shape + icon (never color alone — island §۸ honest states).
 * ENGINE-NEXTGEN W-C: continue is a FILLED indigo marker (start stays outline
 * paper/ink) — the in-progress vs available-but-untouched distinction is now
 * carried by FILL + icon + halo, not icon glyph alone. */
function RowMarker({ action, flash }: { action: SectionRowAction; flash: boolean }) {
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
          className={`${box} border-indigo bg-indigo text-paper shadow-[0_0_0_3px_var(--color-indigo-wash)]`}
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
      /* the LOCK lives HERE (access state) — and flashes vermilion on click. */
      return (
        <span
          className={`${box} border-dashed border-ink-faint text-ink-faint${flash ? ' locked-flash' : ''}`}
          aria-hidden
        >
          <Lock className="size-3.5" />
        </span>
      );
  }
}

/* ------------------------------------------------------------------ component */

export function SectionJourney({ chapterSlug, initialSectionSlug, nextStationSlug, initial }: SectionJourneyProps) {
  const [sections, setSections] = useState<SectionDto[]>(initial.sections);
  /* Subagent C fix — the LIVE next-station slug (initial: the server prop;
   * updated by the tab-focus refresh so the «ایستگاه فعلی» marker follows
   * the real frontier, exactly one row, even after cross-tab progress). */
  const [liveNextStationSlug, setNextStationSlug] = useState<string | null | undefined>(nextStationSlug);
  const [activeIndex, setActiveIndex] = useState(() => {
    if (initialSectionSlug) {
      const idx = initial.sections.findIndex((s) => s.slug === initialSectionSlug);
      if (idx >= 0) return idx;
    }
    return initial.activeIndex;
  });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstRender = useRef(true);

  /* TASK-HANASO-22 — the locked-row click feedback state: which row shakes,
   * and the honest Persian notice (with the first unmet prerequisite).
   *
   * HANASO-KANA-UI-REMEDIATION-03 (UI-02 / AUD-007): the notice must be READ.
   *  - it scrolls the row's notice into view when the click happened near the
   *    fold (mobile measured: the reason used to render up to ~99px BELOW the
   *    viewport — the learner only saw the shake);
   *  - it PERSISTS (no short auto-dismiss): the row keeps its explanation
   *    until another row is clicked or the learner navigates away — matching
   *    the journey backlog's «state درون‌خطی ماندگار تا تعامل بعدی».
   * The 3.6s auto-dismiss timer is therefore removed. */
  const [lockedFeedback, setLockedFeedback] = useState<{ slug: string; message: string } | null>(null);
  const lockedReasonRef = useRef<HTMLParagraphElement | null>(null);

  const onLockedClick = useCallback((row: SectionRowDto) => {
    const first = row.blockedByTitlesFa?.[0];
    const message = first
      ? `این درس هنوز باز نشده — برای باز کردنش، ابتدا «${first}» را کامل کن.`
      : 'این درس هنوز باز نشده — درس‌های پیش از آن را کامل کن.';
    setLockedFeedback({ slug: row.slug, message });
  }, []);

  /* once the notice renders: bring it into view (calm = instant jump).
   * Only when it actually sits below the fold or off-screen — never fights
   * a learner who already sees the row (same rule as the TASK-28 auto-scroll). */
  useEffect(() => {
    if (!lockedFeedback) return;
    const el = lockedReasonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const offscreen = rect.top < 0 || rect.bottom > window.innerHeight;
    if (!offscreen) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
  }, [lockedFeedback]);

  /* live refresh on tab focus (walk state changed in another tab) */
  const nextStationSlugRef = useRef(nextStationSlug);
  nextStationSlugRef.current = nextStationSlug;
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch(`/api/curriculum/journey?chapter=${chapterSlug}`);
        const json = (await res.json()) as {
          data?: {
            nextStationSlug?: string | null;
            sections?: (Omit<SectionDto, 'rows'> & {
              rows: Omit<SectionRowDto, 'contentKind' | 'blockedByTitlesFa'>[];
            })[];
          };
        };
        if (json.data?.sections && json.data.sections.length > 0) {
          /* the refresh payload predates the new fields — merge onto the
           * initial DTOs (content identity is static content data). */
          setSections((prev) =>
            prev.map((section) => {
              const fresh = json.data!.sections!.find((s) => s.slug === section.slug);
              if (!fresh) return section;
              return {
                ...section,
                status: fresh.status,
                coreCompleted: fresh.coreCompleted,
                coreTotal: fresh.coreTotal,
                isFocus: fresh.isFocus,
                rows: section.rows.map((row) => {
                  const freshRow = fresh.rows.find((r) => r.slug === row.slug);
                  return freshRow ? { ...row, availability: freshRow.availability, action: freshRow.action } : row;
                }),
              };
            }),
          );
          /* Subagent C fix: the current-row marker follows the LIVE next
           * station too (walk state may have changed in the other tab). */
          if (json.data.nextStationSlug !== undefined && json.data.nextStationSlug !== nextStationSlugRef.current) {
            setNextStationSlug(json.data.nextStationSlug);
          }
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
        const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        panelRef.current?.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
      }
      firstRender.current = false;
    },
    [sections],
  );

  // mark the initial (first-render) switch as non-animated
  useEffect(() => {
    firstRender.current = false;
  }, []);

  /*
   * TASK-HANASO-28 — auto-scroll to the CURRENT lesson, once per mount:
   * returning from a station used to land at the page top with the frontier
   * row 600–1900px below the fold. Rules (mission §5):
   *  - runs ONCE (latch) so it never fights the user's own scrolling;
   *  - NOT on tab-focus refreshes (visibilitychange path stays put);
   *  - block:'center' so the row and its neighbours are both visible;
   *  - reduced-motion → instant jump (matchMedia, the kana-card pattern);
   *  - only when the current row is actually below the fold (don't hijack a
   *    user who already sees it, e.g. near the top of a fresh chapter).
   */
  const autoScrolledRef = useRef(false);
  const currentRowRef = useRef<HTMLLIElement | null>(null);
  useEffect(() => {
    if (autoScrolledRef.current) return;
    autoScrolledRef.current = true;
    const li = currentRowRef.current;
    if (!li) return;
    const rect = li.getBoundingClientRect();
    const belowFold = rect.top > window.innerHeight * 0.75 || rect.bottom < 0;
    if (!belowFold) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    li.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
  }, []);

  const section = sections[activeIndex] ?? sections[0];
  if (!section) return null;

  const prev = activeIndex > 0 ? sections[activeIndex - 1] : null;
  const next = activeIndex + 1 < sections.length ? sections[activeIndex + 1] : null;

  /*
   * TASK-HANASO-28 — compact section switcher (segmented control): the two
   * chapter sections sit ABOVE the panel so switching is one tap instead of a
   * hunt for the bottom nav (which stays for its named destinations). Labels
   * are section TITLES ONLY — the owner's no-counters rule is preserved. The
   * active segment reflects the live section; a locked section stays
   * pressable but shows the lock glyph (it answers via gotoSection → the
   * honest locked status inside the panel, never a fake entry).
   */
  const multiSection = sections.length > 1;

  return (
    <div>
      {multiSection ? (
        <div
          role="tablist"
          aria-label={fa.curriculum.sectionSwitcherLabel}
          className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {sections.map((sec, i) => {
            const active = i === activeIndex;
            return (
              <button
                key={sec.slug}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => gotoSection(i)}
                className={[
                  'flex min-h-12 items-center gap-2 rounded-md border-2 px-3 py-2 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai',
                  active
                    ? 'border-indigo bg-indigo text-paper shadow-[var(--shadow-cta)]'
                    : 'border-ink-faint/60 bg-card text-ink hover:border-ai hover:bg-indigo-wash',
                ].join(' ')}
              >
                <span className="min-w-0 truncate text-small font-bold">
                  <MixedFaJaText text={sec.titleFa} />
                </span>
                {sec.status === 'locked' ? <Lock aria-hidden className="size-3.5 shrink-0 opacity-70" /> : null}
                {active ? (
                  <span className="ms-auto rounded-full bg-paper/15 px-2 py-0.5 text-caption">
                    {fa.curriculum.sectionActiveChip}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      <section
        ref={panelRef}
        aria-label={section.titleFa}
        className="relative overflow-hidden rounded-md border-2 border-indigo bg-card shadow-[var(--shadow-card)]"
      >
        {/* ---- section header (HANASO-IR owner redesign, 2026-11-19): the old
            dark indigo plaque + seigaiha texture behind the title/goal/status
            hurt readability (the owner's «پس‌زمینه بنفش نامناسب» audit). The
            header is now QUIET TYPOGRAPHY on the panel's own flat surface —
            strong ink title, readable goal, honest status — separated from the
            rows by one hairline. NO background boxes, NO decorative frames
            behind the texts (the owner's explicit rule). ---- */}
        <header className="border-b border-ink-faint/40 p-5 sm:p-6">
          {/* JOURNEY-FIX 2026-11-23 §۱: the section title (unit name) embeds a
              Japanese run — through the shared mixed-direction renderer, same as rows. */}
          <h2 className="text-h2 font-black text-ink">
            <MixedFaJaText text={section.titleFa} />
          </h2>
          {section.goalFa ? (
            <p className="mt-3 max-w-prose text-body leading-[var(--leading-fa)] text-ink-soft">
              <span className="font-bold text-ink">{fa.curriculum.sectionGoalLabel}: </span>
              <MixedFaJaText text={section.goalFa} />
            </p>
          ) : null}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption text-ink-soft">
            {section.status === 'completed' ? (
              <span className="flex items-center gap-1.5 text-success">
                <CircleCheck aria-hidden className="size-4" />
                {fa.curriculum.sectionStatusCompleted}
              </span>
            ) : section.status === 'locked' ? (
              /* ENGINE-NEXTGEN W-C: ink-faint (3.6:1) is the token reserved for
                 NON-TEXT hairlines — status TEXT moves to ink-soft (AA 6.4:1). */
              <span className="flex items-center gap-1.5 text-ink-soft">
                <Lock aria-hidden className="size-4 text-ink-faint" />
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
            const shaking = lockedFeedback?.slug === row.slug;
            /*
             * TASK-HANASO-28 — the CURRENT lesson is finally VISIBLE: an
             * indigo start-edge bar + a quiet «ایستگاه فعلی» chip + aria-current
             * on the interactive element (the isFocus flag existed server-side
             * but was never rendered). This answers «کجا هستم؟» at a glance.
             * Subagent C fix: the row is current ONLY when its slug IS the
             * server-computed next station — the old `section.isFocus &&
             * action` heuristic also tagged optional available rows (e.g.
             * stn-kana-opt-r-h9 beside the frontier) and mis-targeted the
             * one-shot auto-scroll ref when several rows matched.
             */
            const isCurrent = liveNextStationSlug != null && row.slug === liveNextStationSlug;
            const rowRef = isCurrent && !autoScrolledRef.current ? currentRowRef : undefined;
            const body = (
              <>
                {/* PRODUCTION-REMEDIATION §3.1 (RTL fix): in dir=rtl the FIRST DOM
                 * child renders on the visual RIGHT. The station-type tile goes
                 * FIRST (visual right = the identity side), the access marker
                 * (lock/start/continue/done) goes LAST (visual left) — matching
                 * the owner-approved semantics: left = lock state, right = type. */}
                <span className="flex shrink-0 items-center gap-2 text-caption text-ink-soft">
                  <span className="sm:hidden" aria-hidden>
                    {fa.curriculum.rowMinutesShort(row.estMinutes)}
                  </span>
                  <span className="hidden sm:inline">{fa.curriculum.rowMinutes(row.estMinutes)}</span>
                  {/* TASK-HANASO-22: this tile is the CONTENT IDENTITY (never a
                    second lock — the duplicate-lock fix). Locked stays recognizable. */}
                  <ContentTypeTile kind={row.contentKind} locked={locked} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body font-bold text-ink">
                    <MixedFaJaText text={row.titleFa} />
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo/40 bg-indigo-wash px-2 py-0.5 text-caption font-bold text-indigo">
                        <MapPin aria-hidden className="size-3" />
                        {fa.curriculum.rowCurrentChip}
                      </span>
                    ) : null}
                    {row.contentKind === 'milestone' ? (
                      /* TASK-28 R7 — real-world milestone stations get a vermilion
                       * chip next to the title: «این یکی، دنیای واقعی است». */
                      <span className="inline-flex items-center gap-1 rounded-full border border-shu/50 bg-surface-warm px-2 py-0.5 text-caption font-bold text-shu">
                        <Award aria-hidden className="size-3" />
                        {fa.curriculum.rowMilestoneChip}
                      </span>
                    ) : null}
                    {!row.core ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-ink-faint bg-surface-warm px-2 py-0.5 text-caption text-ink-soft">
                        {fa.curriculum.rowOptional}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-small leading-[var(--leading-fa)] text-ink-soft">
                    <MixedFaJaText text={row.objectiveFa} />
                  </p>
                </div>
                <RowMarker action={row.action} flash={shaking} />
              </>
            );

            return (
              <li
                key={row.slug}
                ref={rowRef}
                data-testid={isCurrent ? 'journey-current-row' : undefined}
                className={
                  [
                    'relative',
                    shaking ? 'locked-shake' : '',
                    isCurrent
                      ? 'bg-indigo-wash/60 before:absolute before:inset-y-0 before:start-0 before:w-1 before:bg-indigo'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              >
                {locked ? (
                  /* honest locked row: visible goal, a CLICK THAT ANSWERS (shake +
                   vermilion flash + the reason), but never an entry (island §۸). */
                  <button
                    type="button"
                    onClick={() => onLockedClick(row)}
                    aria-label={`${row.titleFa} — ${fa.curriculum.rowLocked}`}
                    className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-surface-warm/60 focus-visible:bg-surface-warm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ai sm:gap-4 sm:p-5"
                  >
                    {body}
                  </button>
                ) : (
                  <Link
                    href={row.href}
                    aria-current={isCurrent ? 'true' : undefined}
                    /* ENGINE-NEXTGEN W-C (WCAG 1.3.1): the row's ACCESS STATE joins
                     * the accessible name (the markers are aria-hidden decorative
                     * shapes) — screen readers now hear «مرور/ادامه/شروع» like
                     * sighted learners see it; locked rows already carried «قفل». */
                    aria-label={`${row.titleFa} — ${
                      row.action === 'review'
                        ? fa.curriculum.rowReview
                        : row.action === 'continue'
                          ? fa.curriculum.rowContinue
                          : row.action === 'start'
                            ? fa.curriculum.rowStart
                            : fa.curriculum.rowLocked
                    }`}
                    className="group flex items-center gap-3 p-4 transition-colors hover:bg-indigo-wash focus-visible:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ai sm:gap-4 sm:p-5"
                  >
                    {body}
                  </Link>
                )}
                {lockedFeedback?.slug === row.slug ? (
                  <p
                    ref={lockedReasonRef}
                    role="status"
                    aria-live="polite"
                    data-locked-reason
                    /* UI-03/UI-04: shu-deep passes AA (5.8:1) on surface-warm where
                     * the flash color shu itself measured 4.37:1. */
                    className="feedback-in border-t border-ink-faint/40 bg-surface-warm px-4 py-2.5 text-small font-bold leading-[var(--leading-fa)] text-shu-deep sm:px-5"
                  >
                    {lockedFeedback.message}
                  </p>
                ) : null}
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
                <span className="block truncate text-body font-bold text-ink">
                  <MixedFaJaText text={prev.titleFa} />
                </span>
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
              className="flex min-h-14 items-center justify-end gap-3 rounded-md border-2 border-indigo bg-indigo px-4 py-3 text-end text-paper transition-[background-color,translate] hover:bg-indigo-deep active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
            >
              <span className="min-w-0">
                <span className="block text-caption text-indigo-mist">
                  {fa.curriculum.sectionNext}
                  {next.status === 'locked' ? ` — ${fa.curriculum.sectionStatusLocked}` : ''}
                </span>
                <span className="block truncate text-body font-bold">
                  <MixedFaJaText text={next.titleFa} />
                </span>
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
    </div>
  );
}
