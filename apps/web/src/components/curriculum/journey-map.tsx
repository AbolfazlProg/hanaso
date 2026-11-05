'use client';
/**
 * HANASO — JourneyMap (TASK-LEARNING-01 · redesigned TASK-LEARNING-07 / #107).
 *
 * The chapter's station graph as a LONG VERTICAL SCROLLABLE TRAIL — old-map
 * texture (warm sand + subtle grain), a dotted indigo path winding through the
 * station waypoints, island (unit) plaques as landmarks, and station states
 * distinguished by SHAPE + MARKER, never color alone:
 *   · completed/skipped → filled circle + check
 *   · current (in_progress / needs_retry / next-up) → double ring + pulse
 *   · available → open ring
 *   · locked → dashed square
 *   · optional → diamond badge on the marker
 * The map is an HONEST representation (island §۸): every node = a real station,
 * state = the real stored walk state (fetched live), progress = core fraction —
 * no XP, no locks-and-keys metaphor (DD-003/DD-015).
 *
 * Auto-scroll (mission §5): on FIRST entry only, the trail scrolls — short,
 * smooth, predictable — to the learner's continue point (next station). It
 * never fights manual scrolling: if the user has already scrolled, it stays
 * put, and a floating «بازگشت به نقطهٔ ادامه» button re-centers on demand.
 * `prefers-reduced-motion` gets an instant jump instead of animation.
 *
 * Aizen signatures (DD-084): indigo structural frames, seigaiha wave motif on
 * island plaques, vermilion reserved for the gate, no emoji (#108).
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpenText,
  CircleCheck,
  Ear,
  FlaskConical,
  Hammer,
  Lock,
  MapPin,
  MessageCircle,
  Navigation,
  Repeat2,
  Scale,
  Sparkles,
  Star,
  Ticket,
} from 'lucide-react';
import { fa } from '@/messages/fa';

export interface JourneyNodeDto {
  slug: string;
  type: string;
  titleFa: string;
  objectiveFa: string;
  core: boolean;
  estMinutes: number;
  availability: 'locked' | 'available' | 'in_progress' | 'completed' | 'needs_retry' | 'skipped';
  blockedBy: string[];
  href: string;
}

/** TASK-LEARNING-06 (T-79): a story-unit / kana-island group of the two-level map. */
export interface JourneyUnitDto {
  slug: string;
  titleFa: string;
  summaryFa?: string;
  stationSlugs: string[];
}

export interface JourneyMapProps {
  chapterSlug: string;
  initial: {
    nodes: JourneyNodeDto[];
    coreCompleted: number;
    coreTotal: number;
    chapterStatus: string | null;
    nextStationSlug: string | null;
    /** Present only for chapters declaring units[] — the two-level map. */
    units?: JourneyUnitDto[];
  };
}

/* ------------------------------------------------------------------ helpers */

type Availability = JourneyNodeDto['availability'];

const isDone = (a: Availability) => a === 'completed' || a === 'skipped';
const isCurrent = (a: Availability) => a === 'in_progress' || a === 'needs_retry';

/** Persian digits (SKL-003 §۴ — server-side preferred; this island is client-local). */
function faNum(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

/** Old-paper grain: warm sand base + visible fiber/grid gradients + corner
 *  vignette (all Aizen tokens; VLM review pass 1 asked for a READABLE texture). */
const PAPER_TEXTURE =
  'radial-gradient(ellipse 140% 90% at 12% -10%, rgba(23, 48, 73, 0.07), transparent 52%),' +
  'radial-gradient(ellipse 130% 80% at 90% 108%, rgba(194, 64, 28, 0.055), transparent 50%),' +
  'repeating-linear-gradient(93deg, rgba(43, 42, 40, 0.05) 0 2px, transparent 2px 8px),' +
  'repeating-linear-gradient(2deg, rgba(43, 42, 40, 0.032) 0 1px, transparent 1px 6px),' +
  'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 55%, rgba(43, 42, 40, 0.05) 100%),' +
  'var(--color-surface-warm)';

/** Seigaiha wave motif (DD-084 signature) as a subtle SVG overlay for island plaques. */
const SEIGAIHA_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='28' viewBox='0 0 56 28'%3E%3Cg fill='none' stroke='%23FAF7EF' stroke-opacity='0.12' stroke-width='1.1'%3E%3Cpath d='M0 28 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0'/%3E%3Cpath d='M-14 14 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0'/%3E%3Cpath d='M-28 0 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0 a14 14 0 0 1 28 0'/%3E%3C/g%3E%3C/svg%3E\")";

/* ------------------------------------------------------------------ component */

export function JourneyMap({ chapterSlug, initial }: JourneyMapProps) {
  const [state, setState] = useState(initial);
  const [pathD, setPathD] = useState<string | null>(null);
  /** the floating re-center button shows only when the focus waypoint left the viewport */
  const [focusOffscreen, setFocusOffscreen] = useState(false);
  /** transient notice after the one-time auto-scroll (a11y-friendly confirmation) */
  const [scrolledNotice, setScrolledNotice] = useState(false);

  const trailRef = useRef<HTMLOListElement | null>(null);
  const autoScrolledRef = useRef(false);

  // live refresh when the tab regains focus (walk state changes in another tab)
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch(`/api/curriculum/journey?chapter=${chapterSlug}`);
        const json = (await res.json()) as {
          data?: {
            nodes: JourneyNodeDto[];
            coreCompleted: number;
            coreTotal: number;
            chapterState: { status: string } | null;
            nextStationSlug: string | null;
            units?: JourneyUnitDto[];
          };
        };
        if (json.data) {
          setState({
            nodes: json.data.nodes,
            coreCompleted: json.data.coreCompleted,
            coreTotal: json.data.coreTotal,
            chapterStatus: json.data.chapterState?.status ?? null,
            nextStationSlug: json.data.nextStationSlug,
            units: json.data.units,
          });
        }
      } catch {
        /* offline — keep the server-rendered state */
      }
    };
    void refresh();
  }, [chapterSlug]);

  const understood = state.chapterStatus === 'understood';
  const gateReady = state.coreCompleted === state.coreTotal;
  const next = state.nodes.find((n) => n.slug === state.nextStationSlug);

  /** The continue point: the next-up station, else any in-progress station. */
  const focusSlug = useMemo(
    () => state.nextStationSlug ?? state.nodes.find((n) => isCurrent(n.availability))?.slug ?? null,
    [state.nextStationSlug, state.nodes],
  );

  /** Flattened render plan: unit plaques interleaved with station waypoints. */
  const rows = useMemo(() => {
    if (state.units && state.units.length > 0) {
      const out: Array<
        | { kind: 'unit'; key: string; unit: JourneyUnitDto; done: number; total: number }
        | { kind: 'node'; key: string; node: JourneyNodeDto; index: number }
      > = [];
      let nodeIndex = 0;
      for (const unit of state.units) {
        const unitNodes = state.nodes.filter((n) => unit.stationSlugs.includes(n.slug));
        if (unitNodes.length === 0) continue;
        const unitCore = unitNodes.filter((n) => n.core);
        const done = unitCore.filter((n) => isDone(n.availability)).length;
        out.push({ kind: 'unit', key: `unit-${unit.slug}`, unit, done, total: unitCore.length });
        for (const node of unitNodes) out.push({ kind: 'node', key: node.slug, node, index: nodeIndex++ });
      }
      return out;
    }
    return state.nodes.map((node, index) => ({ kind: 'node' as const, key: node.slug, node, index }));
  }, [state.nodes, state.units]);

  /* ------------------------------------------------ dotted trail path (SVG) */
  const drawPath = useCallback(() => {
    const trail = trailRef.current;
    if (!trail) return;
    const waypoints = Array.from(trail.querySelectorAll<HTMLElement>('[data-waypoint]'));
    if (waypoints.length < 2) {
      setPathD(null);
      return;
    }
    const cRect = trail.getBoundingClientRect();
    const pts = waypoints.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 - cRect.left, y: r.top + r.height / 2 - cRect.top };
    });
    // Catmull-Rom → cubic Bézier: a smooth hand-drawn-feeling trail through the stops
    let d = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p0 = pts[i - 1] ?? pts[i]!;
      const p1 = pts[i]!;
      const p2 = pts[i + 1]!;
      const p3 = pts[i + 2] ?? pts[i + 1]!;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    setPathD(d);
  }, []);

  useEffect(() => {
    drawPath();
    const trail = trailRef.current;
    const ro = trail ? new ResizeObserver(() => drawPath()) : null;
    if (trail && ro) ro.observe(trail);
    window.addEventListener('resize', drawPath);
    // late layout shifts (font swap, images) — two cheap delayed redraws
    const t1 = window.setTimeout(drawPath, 600);
    const t2 = window.setTimeout(drawPath, 1800);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', drawPath);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [rows, drawPath]);

  /* ------------------------------------------------ one-time auto-scroll */
  /** Center the continue point in the viewport — page-scroller-direct (scrollIntoView
   *  is unreliable during hydration: it can consult ancestor scrollers and land on
   *  a wrong offset). One correction pass covers a smooth scroll interrupted by
   *  late layout shifts (fonts); reduced-motion users get an instant jump. */
  const centerOnFocus = useCallback((smooth: boolean) => {
    const el = document.querySelector<HTMLElement>(`[data-trail-focus="true"]`);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const top = Math.max(0, rect.top + window.scrollY - window.innerHeight / 2 + rect.height / 2);
    window.scrollTo({ top, behavior: smooth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' });
    return true;
  }, []);

  useEffect(() => {
    if (autoScrolledRef.current) return;
    autoScrolledRef.current = true;
    if (!focusSlug) return;
    // respect an already-scrolling user: only align when the page is still at the top
    if (window.scrollY > 40) return;
    const fired = centerOnFocus(true);
    if (!fired) return;
    setScrolledNotice(true);
    window.setTimeout(() => setScrolledNotice(false), 2600);
    // one correction pass: if the smooth scroll was interrupted by a late layout
    // shift (font swap), finish the job instantly.
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-trail-focus="true"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const want = Math.max(0, rect.top + window.scrollY - window.innerHeight / 2 + rect.height / 2);
      if (Math.abs(window.scrollY - want) > 120) window.scrollTo({ top: want, behavior: 'auto' });
    }, 1100);
  }, [focusSlug, centerOnFocus]);

  /* ------------------------------------ floating re-center when focus offscreen */
  useEffect(() => {
    if (!focusSlug) return;
    const el = document.querySelector<HTMLElement>(`[data-trail-focus="true"]`);
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => setFocusOffscreen(!entries[0]!.isIntersecting),
      { rootMargin: '-18% 0px -18% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [focusSlug, rows]);

  const scrollToFocus = useCallback(() => {
    centerOnFocus(true);
  }, [centerOnFocus]);

  return (
    <div className="flex flex-col gap-6">
      {/* progress header — unchanged contract, restyled to sit on the trail */}
      <div className="flex flex-col gap-3 rounded-md border border-ink-faint bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body font-bold">{fa.curriculum.coreProgress}</p>
          <p className="text-small text-ink-soft" aria-live="polite">
            {faNum(state.coreCompleted)} / {faNum(state.coreTotal)}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={state.coreTotal}
          aria-valuenow={state.coreCompleted}
          aria-label={fa.curriculum.coreProgress}
          className="h-3 overflow-hidden rounded-full bg-surface-sunken"
        >
          <div
            className="h-full rounded-full bg-[repeating-linear-gradient(45deg,var(--color-ai)_0_8px,var(--color-indigo)_8px_16px)] transition-[width] duration-300"
            style={{ width: `${state.coreTotal ? (state.coreCompleted / state.coreTotal) * 100 : 0}%` }}
          />
        </div>
        {understood && (
          <p className="flex items-center gap-2 text-body font-bold text-success">
            <CircleCheck aria-hidden className="size-5" />
            {fa.curriculum.understoodBadge}
          </p>
        )}
      </div>

      {/* the TRAIL — long vertical scrollable path on old paper */}
      <section
        aria-label={fa.curriculum.journeyTitle}
        className="relative overflow-hidden rounded-lg border-2 border-indigo/15 shadow-[var(--shadow-card)]"
        style={{ backgroundImage: PAPER_TEXTURE }}
      >
        {/* inner hairline frame — old-map plate feel */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-2 rounded-md border border-indigo/10"
        />
        {scrolledNotice && (
          <p
            role="status"
            className="absolute inset-x-4 top-3 z-30 mx-auto w-fit rounded-full border border-ai/30 bg-card/95 px-4 py-1.5 text-caption text-ai shadow-[var(--shadow-card)]"
          >
            {fa.curriculum.trailScrolledNotice}
          </p>
        )}

        <ol ref={trailRef} className="relative flex list-none flex-col gap-5 p-5 sm:p-7">
          {/* the dotted winding path (decorative — the SVG sits under the stops) */}
          {pathD && (
            <svg aria-hidden className="pointer-events-none absolute inset-0 z-0 h-full w-full">
              {/* soft ink halo under the dots — makes the trail read as a path from afar */}
              <path
                d={pathD}
                fill="none"
                stroke="var(--color-indigo)"
                strokeOpacity={0.12}
                strokeWidth={11}
                strokeLinecap="round"
                strokeDasharray="0.1 12"
              />
              <path
                d={pathD}
                fill="none"
                stroke="var(--color-indigo)"
                strokeOpacity={0.55}
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray="0.1 12"
              />
            </svg>
          )}

          {rows.map((row) => (
            <Fragment key={row.key}>
              {row.kind === 'unit' ? (
                <UnitPlaque unit={row.unit} done={row.done} total={row.total} />
              ) : (
                <TrailNode node={row.node} index={row.index} isFocus={row.node.slug === focusSlug} />
              )}
            </Fragment>
          ))}

          {/* trail end: the mastery gate as the final destination marker */}
          <li className="relative z-10 pt-2">
            <div
              className={[
                'flex items-center gap-4 rounded-md border-2 p-4',
                understood ? 'border-success bg-card' : gateReady ? 'border-shu bg-card' : 'border-dashed border-ink-faint/70 bg-card/70',
              ].join(' ')}
            >
              <span
                aria-hidden
                data-waypoint=""
                className={[
                  'grid size-12 shrink-0 place-items-center rounded-full border-2 text-h3 font-black',
                  understood
                    ? 'border-success text-success'
                    : gateReady
                      ? 'border-shu text-shu'
                      : 'border-ink-faint text-ink-faint',
                ].join(' ')}
              >
                理解
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-body font-bold">
                  {understood ? fa.curriculum.understoodBadge : fa.curriculum.journeyFinish}
                </h3>
                <p className="text-caption text-ink-soft">
                  {understood
                    ? 'مُهر فهم این فصل خورده است.'
                    : gateReady
                      ? 'همهٔ ایستگاه‌های اصلی تمام شد — برگرد به مکالمهٔ اول و فهمش را ثابت کن.'
                      : `بعد از تمام‌شدن ایستگاه‌های اصلی (${faNum(state.coreCompleted)}/${faNum(state.coreTotal)}) باز می‌شود.`}
                </p>
              </div>
              {(gateReady || understood) && (
                <Link
                  href={`/learn/${chapterSlug}/assessment`}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-md bg-shu px-5 text-body font-bold text-paper transition-colors hover:bg-shu-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
                >
                  {understood ? fa.curriculum.viewResult : fa.curriculum.goToGate}
                  <ArrowLeft aria-hidden className="size-4" />
                </Link>
              )}
            </div>
          </li>
        </ol>

        {/* floating re-center button — appears only when the continue point scrolled away */}
        {focusOffscreen && (
          <button
            type="button"
            onClick={scrollToFocus}
            className="absolute bottom-4 start-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border-2 border-indigo bg-card px-5 py-2.5 text-small font-bold text-indigo shadow-[var(--shadow-raised)] transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            <Navigation aria-hidden className="size-4" />
            {fa.curriculum.trailBackToFocus}
          </button>
        )}
      </section>

      {/* shape legend — states read by shape+marker, not color alone (mission §5) */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-ink-faint bg-card px-4 py-3">
        <span className="text-caption font-bold text-ink-soft">{fa.curriculum.trailLegendTitle}:</span>
        <LegendShape label={fa.curriculum.trailLegendCompleted}>
          <span className="grid size-4 place-items-center rounded-full border-2 border-success bg-success/25" />
        </LegendShape>
        <LegendShape label={fa.curriculum.trailLegendCurrent}>
          <span className="grid size-4 place-items-center rounded-full border-2 border-shu">
            <span className="size-1.5 rounded-full bg-shu" />
          </span>
        </LegendShape>
        <LegendShape label={fa.curriculum.trailLegendAvailable}>
          <span className="size-4 rounded-full border-2 border-ai" />
        </LegendShape>
        <LegendShape label={fa.curriculum.trailLegendLocked}>
          <span className="size-3.5 rounded-[3px] border-2 border-dashed border-ink-faint" />
        </LegendShape>
        <LegendShape label={fa.curriculum.trailLegendOptional}>
          <span className="size-3.5 rotate-45 rounded-[2px] border-2 border-ai bg-indigo-wash" />
        </LegendShape>
      </div>

      {/* next-up CTA */}
      {next && !understood && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ai bg-indigo-wash/50 p-4">
          <p className="text-body">
            <b>{fa.curriculum.nextUp}: </b>
            {next.titleFa}
          </p>
          <Link
            href={next.href}
            className="flex h-11 items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            {fa.curriculum.continueChapter}
            <ArrowLeft aria-hidden className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ sub-parts */

function LegendShape({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-caption text-ink-soft">
      <span aria-hidden className="grid place-items-center">
        {children}
      </span>
      {label}
    </span>
  );
}

/** An island (unit) landmark plaque on the trail — seigaiha band, indigo plate. */
function UnitPlaque({ unit, done, total }: { unit: JourneyUnitDto; done: number; total: number }) {
  return (
    <li className="relative z-10 my-1">
      <div
        className="relative overflow-hidden rounded-md border-2 border-indigo px-4 py-3"
        style={{ backgroundImage: `${SEIGAIHA_URL}, linear-gradient(160deg, var(--color-indigo) 0%, var(--color-indigo-deep) 100%)` }}
      >
        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1">
          <MapPin aria-hidden className="size-4 shrink-0 text-paper/80" />
          <span className="text-small font-black text-paper">{unit.titleFa}</span>
          {unit.summaryFa ? <span className="text-micro text-indigo-mist">{unit.summaryFa}</span> : null}
          <span className="ms-auto rounded-full bg-paper/10 px-2.5 py-0.5 text-micro font-bold text-paper" aria-live="polite">
            {faNum(done)} / {faNum(total)}
          </span>
        </div>
      </div>
    </li>
  );
}

/**
 * One station waypoint on the trail: the MARKER sits on the dotted rail (its
 * own column — the path threads through the markers, never under the cards),
 * the readable card rides beside it. Marker SHAPE carries the state
 * (filled+check · double-ring+pulse · open ring · dashed square · diamond for
 * optional); on ≥sm screens the markers sway off the rail so the path visibly
 * winds (VLM review pass 1: the trail must read as a trail, not a list).
 */
function TrailNode({ node, index, isFocus }: { node: JourneyNodeDto; index: number; isFocus: boolean }) {
  const done = isDone(node.availability);
  const current = isCurrent(node.availability) || isFocus;
  const locked = node.availability === 'locked';
  // gentle serpentine on ≥sm screens: the MARKER sways on the rail, cards stay aligned
  const sway = ['', 'sm:translate-x-4', 'sm:translate-x-8', 'sm:translate-x-4'][index % 4] ?? '';

  return (
    <li
      className="relative z-10"
      data-trail-focus={isFocus ? 'true' : undefined}
      aria-current={isFocus ? 'step' : undefined}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* the rail column — the WAYPOINT marker (shape+marker encode the state, mission §5) */}
        <span aria-hidden className={`relative flex w-12 shrink-0 justify-center sm:w-14 ${sway}`}>
          <span
            data-waypoint=""
            className={[
              'relative grid size-11 place-items-center bg-card sm:size-12',
              // shape families: circle (core) · dashed square (locked) · diamond (optional)
              locked
                ? 'rounded-[6px] border-[3px] border-dashed border-ink-faint bg-surface-sunken text-ink-faint'
                : node.core
                  ? 'rounded-full border-[3px]'
                  : 'rotate-45 rounded-[6px] border-[3px]',
              !locked
                ? done
                  ? 'border-success bg-success/15 text-success'
                  : current
                    ? 'border-shu bg-shu/10 text-shu'
                    : 'border-ai bg-indigo-wash/70 text-ai'
                : '',
            ].join(' ')}
          >
            {/* inner icon un-rotated for optional diamonds */}
            <span className={node.core || locked ? '' : '-rotate-45'}>
              {done ? (
                <CircleCheck aria-hidden className="size-6" />
              ) : locked ? (
                <Lock aria-hidden className="size-5" />
              ) : (
                <StationIcon type={node.type} />
              )}
            </span>
          </span>
          {/* current-stop pulse ring — motion-safe only (prefers-reduced-motion respected) */}
          {current && !done && (
            <span className="absolute top-0 grid size-11 place-items-center sm:size-12">
              <span className="absolute inset-0 animate-[pulse-ring_2.2s_ease-out_infinite] rounded-full border-2 border-shu/50 motion-reduce:animate-none" />
            </span>
          )}
        </span>

        {/* the station card — a calm readable row beside its waypoint */}
        <div
          className={[
            'flex min-w-0 flex-1 items-start gap-3 rounded-md border bg-card p-4 transition-colors',
            locked
              ? 'border-ink-faint/60 bg-surface-muted/70 opacity-80'
              : done
                ? 'border-success/60'
                : current
                  ? 'border-shu shadow-[var(--shadow-raised)]'
                  : 'border-ai shadow-[var(--shadow-card)]',
          ].join(' ')}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-body font-bold">{node.titleFa}</h3>
              {!node.core && (
                <span className="rounded-full border border-ai px-2 py-0.5 text-caption text-ai">
                  {fa.curriculum.stationOptional}
                </span>
              )}
              {isFocus && !done && (
                <span className="rounded-full bg-shu px-2 py-0.5 text-caption font-bold text-paper">
                  {fa.curriculum.trailLegendCurrent}
                </span>
              )}
            </div>
            <p className="text-small text-ink-soft">{node.objectiveFa}</p>
            <p className="text-caption text-ink-faint">
              {availabilityLabel(node.availability)} · {faNum(node.estMinutes)} {fa.curriculum.minutes}
            </p>
          </div>

          {node.availability !== 'locked' ? (
            <Link
              href={node.href}
              className="grid size-11 shrink-0 place-items-center self-center rounded-md border border-ai text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
              aria-label={`${node.titleFa} — ${availabilityLabel(node.availability)}`}
            >
              {done ? (
                <CircleCheck aria-hidden className="size-5 text-success" />
              ) : (
                <ArrowLeft aria-hidden className="size-5" />
              )}
            </Link>
          ) : (
            <span
              className="grid size-11 shrink-0 place-items-center self-center text-ink-faint"
              aria-label={fa.curriculum.stationLocked}
            >
              <Lock aria-hidden className="size-5" />
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function availabilityLabel(a: Availability): string {
  switch (a) {
    case 'locked':
      return fa.curriculum.stationLocked;
    case 'available':
      return fa.curriculum.stationAvailable;
    case 'in_progress':
      return fa.curriculum.stationInProgress;
    case 'completed':
      return fa.curriculum.stationCompleted;
    case 'needs_retry':
      return fa.curriculum.stationNeedsRetry;
    case 'skipped':
      return fa.curriculum.stationCompleted;
  }
}

function StationIcon({ type }: { type: string }) {
  const cls = 'size-5';
  switch (type) {
    case 'anchor':
      return <Sparkles aria-hidden className={cls} />;
    case 'vocab':
      return <BookOpenText aria-hidden className={cls} />;
    case 'grammar':
      return <Scale aria-hidden className={cls} />;
    case 'structure':
      return <Hammer aria-hidden className={cls} />;
    case 'expression':
      return <MessageCircle aria-hidden className={cls} />;
    case 'listen':
      return <Ear aria-hidden className={cls} />;
    case 'practice':
      return <Repeat2 aria-hidden className={cls} />;
    case 'integrate':
      return <Ticket aria-hidden className={cls} />;
    case 'mastery':
      return <Star aria-hidden className={cls} />;
    case 'review':
      return <Repeat2 aria-hidden className={cls} />;
    case 'deepdive':
      return <FlaskConical aria-hidden className={cls} />;
    default:
      return <BookOpenText aria-hidden className={cls} />;
  }
}
