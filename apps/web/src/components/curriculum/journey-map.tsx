'use client';
/**
 * HANASO — JourneyMap (TASK-LEARNING-01) — the island path island.
 *
 * Visualises the chapter's station graph as a winding path of islands. The map is
 * an HONEST representation (island §۸): every node = a real station; state = the
 * real stored walk state (fetched live); progress = core-stations fraction —
 * no XP, no locks-and-keys metaphor (DD-003/DD-015). The path layout derives
 * from the DATA node list (any count, any order — a serpentine vertical rail
 * that alternates sides, responsive down to 360px — island §۸ RTL/mobile rule).
 *
 * Aizen signatures (DD-084): indigo structural frames, seigaiha wave hint on the
 * active island, the round 理解 seal on `understood`, vermilion only for the gate.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpenText, CircleCheck, Ear, FlaskConical, Hammer, MessageCircle, Repeat2, Scale, Sparkles, Star, Ticket } from 'lucide-react';
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

export interface JourneyMapProps {
  chapterSlug: string;
  initial: {
    nodes: JourneyNodeDto[];
    coreCompleted: number;
    coreTotal: number;
    chapterStatus: string | null;
    nextStationSlug: string | null;
  };
}

export function JourneyMap({ chapterSlug, initial }: JourneyMapProps) {
  const [state, setState] = useState(initial);

  // live refresh when the tab regains focus (walk state changes in another tab)
  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch(`/api/curriculum/journey?chapter=${chapterSlug}`);
        const json = (await res.json()) as { data?: { nodes: JourneyNodeDto[]; coreCompleted: number; coreTotal: number; chapterState: { status: string } | null; nextStationSlug: string | null } };
        if (json.data) {
          setState({
            nodes: json.data.nodes,
            coreCompleted: json.data.coreCompleted,
            coreTotal: json.data.coreTotal,
            chapterStatus: json.data.chapterState?.status ?? null,
            nextStationSlug: json.data.nextStationSlug,
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

  return (
    <div className="flex flex-col gap-8">
      {/* progress header */}
      <div className="flex flex-col gap-3 rounded-md border border-ink-faint bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body font-bold">{fa.curriculum.coreProgress} (مسیر اصلی)</p>
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

      {(gateReady || understood) && (
        <a
          href={`/learn/${chapterSlug}/assessment`}
          className={[
            'flex items-center justify-between gap-3 rounded-md border-2 p-4',
            understood ? 'border-success bg-card' : 'border-shu bg-card shadow-[var(--shadow-raised)]',
          ].join(' ')}
        >
          <span className="flex items-center gap-3">
            <span aria-hidden className="grid size-10 place-items-center rounded-full border-2 border-shu text-body font-black text-shu">
              理解
            </span>
            <span className="text-body font-bold">
              {understood ? fa.curriculum.understoodBadge : fa.curriculum.goToGate}
            </span>
          </span>
          <ArrowLeft aria-hidden className="size-5 text-shu" />
        </a>
      )}

      {/* the path */}
      <ol className="relative flex flex-col gap-4 ps-6" aria-label={fa.curriculum.journeyTitle}>
        {/* the winding rail (pure decorative — Aizen indigo) */}
        <span
          aria-hidden
          className="absolute inset-y-2 start-2 w-1 rounded-full bg-[repeating-linear-gradient(180deg,var(--color-indigo-mist)_0_10px,transparent_10px_18px)]"
        />
        {state.nodes.map((node) => {
          const optionalDivider = !node.core && !state.nodes.some((n) => !n.core && n.slug !== node.slug && state.nodes.indexOf(n) < state.nodes.indexOf(node));
          return (
            <li key={node.slug} className="relative">
              {optionalDivider && (
                <div className="mb-2 mt-4 flex items-center gap-3" aria-label="شاخه‌های اختیاری">
                  <span className="text-caption font-bold text-ai">شاخه‌های اختیاری — مسیر اصلی را قفل نمی‌کنند</span>
                  <span aria-hidden className="h-px flex-1 bg-ink-faint/60" />
                </div>
              )}
              {/* island node */}
              <div
                className={[
                  'flex items-start gap-4 rounded-md border p-4 transition-colors',
                  node.availability === 'locked'
                    ? 'border-ink-faint/60 bg-surface-muted/60 opacity-70'
                    : node.availability === 'completed' || node.availability === 'skipped'
                      ? 'border-success/60 bg-card'
                      : node.availability === 'available'
                        ? 'border-ai bg-card shadow-[var(--shadow-card)]'
                        : 'border-shu bg-card shadow-[var(--shadow-raised)]',
                ].join(' ')}
              >
                <span
                  aria-hidden
                  className={[
                    'grid size-11 shrink-0 place-items-center rounded-full border',
                    node.availability === 'completed' || node.availability === 'skipped'
                      ? 'border-success bg-success/10 text-success'
                      : node.availability === 'in_progress' || node.availability === 'needs_retry'
                        ? 'border-shu bg-shu/10 text-shu'
                        : node.availability === 'available'
                          ? 'border-ai bg-indigo-wash text-ai'
                          : 'border-ink-faint bg-surface-sunken text-ink-faint',
                  ].join(' ')}
                >
                  <StationIcon type={node.type} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-body font-bold">{node.titleFa}</h3>
                    {!node.core && (
                      <span className="rounded-full border border-ai px-2 py-0.5 text-caption text-ai">
                        {fa.curriculum.stationOptional}
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
                    {node.availability === 'completed' || node.availability === 'skipped' ? (
                      <CircleCheck aria-hidden className="size-5 text-success" />
                    ) : (
                      <ArrowLeft aria-hidden className="size-5" />
                    )}
                  </Link>
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center self-center text-caption text-ink-faint" aria-label={fa.curriculum.stationLocked}>
                    🔒
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* the gate CTA */}
      <div
        className={[
          'flex flex-col gap-3 rounded-md border-2 p-5',
          understood ? 'border-success bg-card' : gateReady ? 'border-shu bg-card shadow-[var(--shadow-raised)]' : 'border-ink-faint bg-surface-muted/50',
        ].join(' ')}
      >
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-12 place-items-center rounded-full border-2 border-shu text-h3 font-black text-shu">
            理解
          </span>
          <div>
            <h3 className="text-h3 font-bold">{understood ? fa.curriculum.understoodBadge : fa.curriculum.journeyFinish}</h3>
            <p className="text-small text-ink-soft">
              {understood
                ? 'مُهر فهم این فصل خورده است.'
                : gateReady
                  ? 'همهٔ ایستگاه‌های اصلی تمام شد — برگرد به مکالمهٔ اول و فهمش را ثابت کن.'
                  : `بعد از تمام‌شدن ایستگاه‌های اصلی (${faNum(state.coreCompleted)}/${faNum(state.coreTotal)}) باز می‌شود.`}
            </p>
          </div>
        </div>
        {(gateReady || understood) && (
          <Link
            href={`/learn/${chapterSlug}/assessment`}
            className="flex h-12 w-fit items-center gap-2 rounded-md bg-shu px-6 text-body font-bold text-paper transition-colors hover:bg-shu-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            {understood ? fa.curriculum.viewResult : fa.curriculum.goToGate}
            <ArrowLeft aria-hidden className="size-4" />
          </Link>
        )}
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
            className="flex h-11 items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
          >
            {fa.curriculum.continueChapter}
            <ArrowLeft aria-hidden className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function availabilityLabel(a: JourneyNodeDto['availability']): string {
  switch (a) {
    case 'locked': return fa.curriculum.stationLocked;
    case 'available': return fa.curriculum.stationAvailable;
    case 'in_progress': return fa.curriculum.stationInProgress;
    case 'completed': return fa.curriculum.stationCompleted;
    case 'needs_retry': return fa.curriculum.stationNeedsRetry;
    case 'skipped': return fa.curriculum.stationCompleted;
  }
}

function StationIcon({ type }: { type: string }) {
  const cls = 'size-5';
  switch (type) {
    case 'anchor': return <Sparkles aria-hidden className={cls} />;
    case 'vocab': return <BookOpenText aria-hidden className={cls} />;
    case 'grammar': return <Scale aria-hidden className={cls} />;
    case 'structure': return <Hammer aria-hidden className={cls} />;
    case 'expression': return <MessageCircle aria-hidden className={cls} />;
    case 'listen': return <Ear aria-hidden className={cls} />;
    case 'practice': return <Repeat2 aria-hidden className={cls} />;
    case 'integrate': return <Ticket aria-hidden className={cls} />;
    case 'mastery': return <Star aria-hidden className={cls} />;
    case 'review': return <Repeat2 aria-hidden className={cls} />;
    case 'deepdive': return <FlaskConical aria-hidden className={cls} />;
    default: return <BookOpenText aria-hidden className={cls} />;
  }
}

/** Persian digits (SKL-003 §۴ — server-side preferred; this island is client-local). */
function faNum(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}
