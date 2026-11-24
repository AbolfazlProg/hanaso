/**
 * HANASO — the shared AUTH SHELL (M2 · AUTH-PASSWORD — the professional
 * redesign the owner asked for: «ظاهرش حرفه‌ای نیست، بررسی کن»).
 *
 * The Aizen art direction applied to the identity surface, exactly like the
 * rest of the app (no new design language, the existing one executed
 * properly):
 *  - desktop: a two-column composition — the structural indigo band
 *    (band-indigo: the seigaiha motif + the vermilion band edge, the site's
 *    signature) beside a framed form card (frame-ink + raised shadow);
 *  - mobile: the band collapses to a compact header strip, the card fills
 *    the rest — one thumb-friendly column;
 *  - RTL-first: in the RTL grid the band sits on the START (right) side,
 *    the form on the left — the reading order matches the visual weight.
 *
 * Server-safe (no state) — every page shell reuses it.
 */
import type { ReactNode } from 'react';
import { fa } from '@/messages/fa';

export interface AuthShellProps {
  /** The page H1 (also the card's context). */
  title: string;
  /** The one-line lead under the H1. */
  lead: string;
  /** The interactive card body (the form). */
  children: ReactNode;
  /** A compact back-link row above the card (optional). */
  backLink?: ReactNode;
}

/** The brand mark: the vermilion dot + هاناسو, on indigo or on paper. */
export function AuthBrand({ onIndigo = true }: { onIndigo?: boolean }) {
  return (
    <span
      className={['flex items-center gap-2 text-body font-black', onIndigo ? 'text-paper' : 'text-indigo'].join(' ')}
    >
      <span aria-hidden className="inline-block size-2.5 rounded-full bg-shu" />
      {fa.auth.brandTitle}
    </span>
  );
}

export function AuthShell({ title, lead, children, backLink }: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-paper md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-stretch">
      {/* ---- the structural indigo band (desktop: full-height start column;
       * mobile: a compact identity strip) ---- */}
      <aside className="band-indigo relative flex flex-col justify-between gap-6 p-6 md:p-10">
        <div className="flex items-center justify-between gap-4">
          <AuthBrand />
          <span
            aria-hidden
            className="select-none font-ja-serif text-[2.75rem] font-bold leading-none text-paper/25 md:text-[3.5rem]"
          >
            藍染
          </span>
        </div>
        <div className="max-w-sm pb-8 md:pb-2">
          <p className="text-lead font-black leading-relaxed text-paper md:text-h3">{fa.auth.brandTagline}</p>
          <p className="mt-3 text-small leading-relaxed text-indigo-mist">{fa.auth.brandPanelLine1}</p>
          <p className="mt-2 text-small leading-relaxed text-indigo-mist">{fa.auth.brandPanelLine2}</p>
        </div>
      </aside>

      {/* ---- the form column ---- */}
      <div className="flex flex-col gap-5 px-4 pb-16 pt-8 md:mx-auto md:w-full md:max-w-lg md:justify-center md:px-10 md:py-14">
        {backLink}
        <header className="flex flex-col gap-2">
          <h1 className="text-h1 font-black tracking-fa-display text-indigo">{title}</h1>
          <p className="text-body leading-relaxed text-ink-soft">{lead}</p>
        </header>
        <section className="frame-ink rounded-md bg-card p-5 shadow-raised sm:p-7" aria-label={title}>
          {children}
        </section>
      </div>
    </main>
  );
}
