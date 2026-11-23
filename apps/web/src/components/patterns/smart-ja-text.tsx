'use client';
/**
 * HANASO — SmartJaText (SMART-RUBY 2026-11-23 §۲) — the learner-aware furigana
 * renderer. THE product-wide law for every Japanese text the learner reads:
 *
 *   - kanji (or its reading) NOT yet taught to THIS learner → furigana SHOWS;
 *   - kanji AND the exhibited reading both taught → furigana HIDDEN by
 *     default, and the kanji becomes TAP-TO-INSPECT (reading, meaning,
 *     strokes, the learner's own taught state);
 *   - standalone kanji runs (quiz shapes, single glyphs) → plain text with
 *     the same tap-to-inspect affordance (ruby over a lone kanji would guess
 *     the reading — and could leak quiz answers).
 *
 * The decision comes from the per-learner view (LearnerJaProvider —
 * /api/curriculum/learner-ja, completed stations only: presence in content,
 * dialogue or the registry is NEVER teaching). The engine decides — content
 * never hand-configures furigana per word (mission §۲).
 *
 * Two input modes (same island contract as FuriganaText: every call is ONE
 * LTR `lang="ja"` isolate with the `.fg` class — spike M0-08 §۲):
 *   - `text` — the engine annotates the string (exercises, examples, boards);
 *   - `tokens` — authored surface/reading pairs (dialogue tokens, the vocab
 *     word card: its own reading IS the ruby).
 *
 * `inspect={false}` renders WITHOUT the tap affordance — used inside
 * interactive buttons (exercise options) where a nested control would break
 * the answer interaction; the show/hide LAW itself still applies everywhere.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { fa } from '@/messages/fa';
import { segmentForDisplay } from '@/lib/bidi-runs';
import { useLearnerJa } from '@/components/patterns/learner-ja-provider';
import {
  annotateJa,
  isKanjiChar,
  kanjiInspect,
  rubyState,
  type KanjiInspect,
  type LearnerJaView,
  type ReadingModel,
} from '@/modules/curriculum/knowledge/reading-model';

export interface SmartJaTextProps {
  /** Raw Japanese string — the engine annotates it (auto mode). */
  text?: string;
  /** Authored surface/reading tokens (dialogue lines, the vocab word card). */
  tokens?: ReadonlyArray<{ surface: string; reading?: string }>;
  /** Render the tap-to-inspect affordance (default true; false inside buttons). */
  inspect?: boolean;
  /** Optional highlight predicate (tokens mode — the dialogue focus emphasis). */
  highlightSurfaces?: string[];
  lang?: string;
  variant?: 'ui' | 'serif';
  className?: string;
}

type RenderPart =
  | { kind: 'plain'; surface: string }
  | { kind: 'ruby'; base: string; rt: string }
  | { kind: 'kanji'; surface: string; literal: string };

const JA_ANY_RE = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uff66-\uff9f]/;

export function SmartJaText({
  text,
  tokens,
  inspect = true,
  highlightSurfaces,
  lang = 'ja',
  variant = 'ui',
  className,
}: SmartJaTextProps): React.JSX.Element {
  const { model, view } = useLearnerJa();
  const parts = useMemo<RenderPart[]>(() => resolveParts(text, tokens, model), [text, tokens, model]);
  const hl = highlightSurfaces;

  /* Non-Japanese input (a Persian option label, a Latin romaji run): a plain
   * passthrough — the .fg LTR island exists ONLY for Japanese text (putting
   * Persian inside it would flip its direction and its font). */
  const effective = parts
    .map((p) => (p.kind === 'plain' ? p.surface : p.kind === 'ruby' ? p.base : p.surface))
    .join('');
  if (!JA_ANY_RE.test(effective)) {
    return <span className={className}>{effective}</span>;
  }

  return (
    <span lang={lang} className={cn('fg', variant === 'serif' && 'serif', className)} data-smart-ja>
      {parts.map((part, i) => {
        if (part.kind === 'plain') {
          const isHl = hl?.some((h) => h.length > 0 && part.surface.endsWith(h));
          return isHl ? (
            <span key={i} className="rounded-sm bg-indigo-wash px-0.5 font-bold text-shu">
              {part.surface}
            </span>
          ) : (
            <span key={i}>{part.surface}</span>
          );
        }
        if (part.kind === 'kanji') {
          return (
            <KanjiTap
              key={i}
              literal={part.literal}
              surface={part.surface}
              model={model}
              view={view}
              inspect={inspect}
            />
          );
        }
        return <RubyGroup key={i} base={part.base} rt={part.rt} model={model} view={view} inspect={inspect} />;
      })}
    </span>
  );
}

/** Segment an input into render parts: ruby groups for kanji-bearing word
 *  matches (auto mode) / authored reading tokens, inspect-able kanji runs,
 *  plain kana and other runs. Pure — the same functions on server and client. */
function resolveParts(
  text: string | undefined,
  tokens: ReadonlyArray<{ surface: string; reading?: string }> | undefined,
  model: ReadingModel,
): RenderPart[] {
  if (tokens && tokens.length > 0) {
    const parts: RenderPart[] = [];
    for (const tok of tokens) {
      const carriesKanji = tok.surface.split('').some(isKanjiChar);
      if (carriesKanji && tok.reading && tok.reading !== tok.surface) {
        parts.push({ kind: 'ruby', base: tok.surface, rt: tok.reading });
      } else {
        // a kanji-bearing token with no reading: inspect-able kanji chars stay
        // tappable inside the plain run (split kana/kanji runs)
        appendPlainOrKanji(parts, tok.surface, model);
      }
    }
    return parts;
  }
  const src = text ?? '';
  const parts: RenderPart[] = [];
  for (const seg of annotateJa(src, model)) {
    if (seg.kind === 'word' && seg.reading && seg.reading !== seg.surface) {
      parts.push({ kind: 'ruby', base: seg.surface, rt: seg.reading });
    } else if (seg.kind === 'kanji') {
      parts.push({ kind: 'kanji', surface: seg.surface, literal: seg.surface[0]! });
    } else {
      appendPlainOrKanji(parts, seg.surface, model);
    }
  }
  return parts;
}

function appendPlainOrKanji(parts: RenderPart[], surface: string, model: ReadingModel) {
  if (!surface) return;
  if (!surface.split('').some(isKanjiChar) || !model.kanjiByLiteral.has(surface[0]!)) {
    parts.push({ kind: 'plain', surface });
    return;
  }
  // split into plain / kanji-char runs so each kanji char is tappable alone
  let plain = '';
  for (const ch of surface) {
    if (isKanjiChar(ch) && model.kanjiByLiteral.has(ch)) {
      if (plain) {
        parts.push({ kind: 'plain', surface: plain });
        plain = '';
      }
      parts.push({ kind: 'kanji', surface: ch, literal: ch });
    } else {
      plain += ch;
    }
  }
  if (plain) parts.push({ kind: 'plain', surface: plain });
}

/* ------------------------------------------------------------- ruby group */

/** One ruby group: the LAW decides whether the reading rides above the base. */
function RubyGroup({
  base,
  rt,
  model,
  view,
  inspect,
}: {
  base: string;
  rt: string;
  model: ReadingModel;
  view: LearnerJaView;
  inspect: boolean;
}) {
  const state = rubyState(base, rt, model, view);
  const hidden = state === 'taught';
  if (!inspect) {
    return hidden ? (
      <span data-ruby-hidden>{base}</span>
    ) : (
      <ruby>
        {base}
        <rp aria-hidden>（</rp>
        <rt>{rt}</rt>
        <rp aria-hidden>）</rp>
      </ruby>
    );
  }
  return (
    <KanjiInspectTrigger
      literals={base.split('').filter(isKanjiChar)}
      model={model}
      view={view}
      className={
        hidden ? 'cursor-pointer rounded-sm hover:bg-indigo-wash' : 'cursor-pointer rounded-sm hover:bg-indigo-wash/60'
      }
    >
      {hidden ? (
        <span data-ruby-hidden>{base}</span>
      ) : (
        <ruby>
          {base}
          <rp aria-hidden>（</rp>
          <rt>{rt}</rt>
          <rp aria-hidden>）</rp>
        </ruby>
      )}
    </KanjiInspectTrigger>
  );
}

/* --------------------------------------------------------- kanji + popover */

/** A standalone kanji (or run) — plain text + the tap-to-inspect affordance. */
function KanjiTap({
  literal,
  surface,
  model,
  view,
  inspect,
}: {
  literal: string;
  surface: string;
  model: ReadingModel;
  view: LearnerJaView;
  inspect: boolean;
}) {
  if (!inspect) return <span data-kanji-run>{surface}</span>;
  return (
    <KanjiInspectTrigger literals={[literal]} model={model} view={view} className="cursor-pointer">
      <span data-kanji-run>{surface}</span>
    </KanjiInspectTrigger>
  );
}

/** The tappable span that owns a kanji popover (keyboard + touch + mouse). */
function KanjiInspectTrigger({
  literals,
  model,
  view,
  className,
  children,
}: {
  literals: string[];
  model: ReadingModel;
  view: LearnerJaView;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLSpanElement | null>(null);
  const literal = literals[0]!;
  const inspect = useMemo(() => kanjiInspect(literal, model, view), [literal, model, view]);

  return (
    <span className="relative inline-block">
      <span
        ref={btnRef}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={fa.curriculum.smartRubyTapHint(literal)}
        data-kanji-inspect={literal}
        className={cn('outline-offset-2 focus-visible:outline-2 focus-visible:outline-ai', className)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setOpen((o) => !o);
          }
        }}
      >
        {children}
      </span>
      {open ? (
        <KanjiPopover
          anchorRef={btnRef}
          inspect={inspect}
          multi={literals.length > 1 ? literals : undefined}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </span>
  );
}

/** The popover itself: viewport-clamped fixed panel under the kanji. */
function KanjiPopover({
  anchorRef,
  inspect,
  multi,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLSpanElement | null>;
  inspect: KanjiInspect;
  multi?: string[];
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    /* two-pass placement: the panel renders hidden, gets MEASURED, then takes
     * the position that fits — below the kanji, flipping above it when the
     * viewport bottom is too close (mobile), always clamped inside the viewport. */
    const pw = panel ? panel.offsetWidth : 256;
    const ph = panel ? panel.offsetHeight : 240;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - 8 - pw));
    const below = r.bottom + 6;
    const top = below + ph > window.innerHeight - 8 ? Math.max(8, r.top - ph - 6) : Math.max(8, below);
    setPos({ top, left: Math.max(8, left) });
  }, [anchorRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (
        panelRef.current &&
        e.target instanceof Node &&
        !panelRef.current.contains(e.target) &&
        !anchorRef.current?.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [onClose, anchorRef]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={fa.curriculum.smartRubyTapHint(inspect.literal)}
      dir="rtl"
      data-kanji-popover={inspect.literal}
      className="fixed z-50 w-64 max-w-[85vw] max-h-[70vh] overflow-y-auto rounded-md border border-ink-faint bg-card p-4 shadow-lg"
      style={pos ? { top: pos.top, left: pos.left } : { visibility: 'hidden' }}
    >
      <div className="flex items-start justify-between gap-3">
        <span lang="ja" dir="ltr" className="text-hero-ja font-bold leading-none text-ink">
          {inspect.literal}
        </span>
        {inspect.strokeCount != null ? (
          <span className="rounded-full border border-ink-faint bg-surface-warm px-2 py-0.5 text-caption text-ink">
            {fa.curriculum.smartRubyStrokes(inspect.strokeCount)}
          </span>
        ) : null}
      </div>

      {inspect.readings.length > 0 ? (
        <p className="mt-2 text-small leading-[var(--leading-fa)] text-ink">
          <b>{fa.curriculum.smartRubyReadingsTitle}: </b>
          <span lang="ja" dir="ltr" className="font-bold">
            {inspect.readings.join('・')}
          </span>
        </p>
      ) : null}
      {inspect.on.length > 0 ? (
        <p className="mt-1 text-small leading-[var(--leading-fa)] text-ink-soft">
          {fa.curriculum.smartRubyOnTitle}:{' '}
          <span lang="ja" dir="ltr">
            {inspect.on.join('・')}
          </span>
        </p>
      ) : null}
      {inspect.kun.length > 0 ? (
        <p className="mt-1 text-small leading-[var(--leading-fa)] text-ink-soft">
          {fa.curriculum.smartRubyKunTitle}:{' '}
          <span lang="ja" dir="ltr">
            {inspect.kun.join('・')}
          </span>
        </p>
      ) : null}
      {inspect.meaningFa ? (
        <p className="mt-1 text-small leading-[var(--leading-fa)] text-ink">
          <b>{fa.curriculum.smartRubyMeaningTitle}: </b>
          {inspect.meaningFa}
        </p>
      ) : null}

      <p
        className={
          'mt-2 rounded-sm px-2 py-1 text-caption leading-[var(--leading-fa)] ' +
          (inspect.taught ? 'bg-success/15 text-ink' : 'bg-surface-warm text-ink-soft')
        }
      >
        {inspect.taught
          ? inspect.taughtStationTitleFa
            ? fa.curriculum.smartRubyStatusTaught(inspect.taughtStationTitleFa)
            : 'آموزش دیده‌ای'
          : fa.curriculum.smartRubyStatusUntaught}
        {!inspect.inReference ? ` ${fa.curriculum.smartRubyNotInReference}` : ''}
      </p>
      {multi && multi.length > 1 ? (
        <p className="mt-1 text-caption text-ink-faint">
          {multi.map((m) => (
            <span key={m} lang="ja" dir="ltr" className="me-1">
              {m}
            </span>
          ))}
        </p>
      ) : null}
      <button type="button" onClick={onClose} className="mt-2 text-caption text-ai underline underline-offset-4">
        {fa.curriculum.smartRubyClose}
      </button>
    </div>
  );
}

/* -------------------------------------------------- mixed Persian + smart */

/**
 * SmartMixedFaJaText — Persian prose with embedded Japanese runs (feedback,
 * hints, rationales, notes) where EVERY Japanese run renders through the
 * SmartJaText law — the mission's «Hintها و Feedback» surface. Same run
 * engine as MixedFaJaText (lib/bidi-runs) — only the JA islands changed.
 */
export function SmartMixedFaJaText({
  text,
  className,
  inspect = true,
}: {
  text: string;
  className?: string;
  inspect?: boolean;
}) {
  const parts = segmentForDisplay(text);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.dir === 'ltr' ? (
          <bdi key={i} dir="ltr" lang={part.lang ?? undefined}>
            {part.lang === 'ja' ? <SmartJaText text={part.text} inspect={inspect} className="ja-block" /> : part.text}
          </bdi>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}
