/**
 * HANASO — TASK-HANASO-21 — the AIZEN completion seal (Aizen no inkan).
 * TASK-HANASO-22 — presentation upgrade (owner direction: keep the identity,
 * raise the ceremony): a larger stage, a slowly ROTATING INK RING around the
 * impression, a subtle SHIMMER sweep over the carved face, and the licensed
 * stamp sound (fired by the host, never inside the art).
 *
 * A hand-carved vermilion hanko (落款) that stamps the moment a lesson is
 * REALLY completed — the server-confirmed completion moment only:
 *  - `animate` is true ONLY for a FRESH completion response (200, not
 *    `already`). A revisit/refresh of a completed station renders the seal
 *    SETTLED (no re-stamp — the completion is a fact, not a re-run); a replay
 *    end never stamps (nothing was re-registered).
 *  - The seal is Aizen's own: 藍染 carved in relief-negative (paper-colored
 *    glyphs on the shu disc) inside a carved ring, vertical tategaki, a
 *    natural −8° tilt and ink-skip chips at the edge — the vocabulary of a
 *    real rakkan impression, not a badge, not an emoji, not a plain circle.
 *  - Motion follows the design-system contract: the ceremonial stamp sequence
 *    (enter → descend → press → squash → ink halo spread → settle) is built
 *    from --dur-ceremonial semantics in globals.css; under
 *    prefers-reduced-motion the whole sequence collapses to the simple fade
 *    the token file promises («seal → simple fade») — and the rotating ring +
 *    shimmer stop dead (they are pure flourish, never information).
 *  - Color: tokens only (--color-shu / --color-shu-deep / --color-paper) —
 *    shu is the design system's dedicated seal accent (DD-084).
 */
import * as React from 'react';

export interface AizenSealProps {
  /** Play the ceremonial stamp sequence (fresh completion only). */
  animate: boolean;
  /** Accessible name (Persian) — the seal is art, but screen readers get the fact. */
  label: string;
  /** Sizing hook — the wrapper class (Tailwind utilities, no raw px in here). */
  className?: string;
}

/**
 * The seal art. Pure SVG, deterministic paths (no runtime randomness — the
 * same impression every time, like a real carved stamp), filter-based grain
 * as progressive enhancement (browsers without the filter still get a clean
 * seal — never a broken one).
 */
export function AizenSeal({ animate, label, className }: AizenSealProps) {
  return (
    <span
      data-aizen-seal
      data-animate={animate ? 'true' : undefined}
      className={['relative inline-flex items-center justify-center', className].filter(Boolean).join(' ')}
    >
      {/* the ink halo — bleeds into the paper fibers at the moment of impact */}
      <span
        aria-hidden
        data-aizen-seal-halo
        className={animate ? 'aizen-seal-halo' : 'aizen-seal-halo aizen-seal-halo-idle'}
      />
      {/*
       * TASK-HANASO-22 — the rotating ink ring: a carved-dash orbit that
       * slowly turns around the impression, the way a wet seal's outer ring
       * reads on paper. It runs only while the ceremony plays (and settles
       * into a static ring afterwards); reduced-motion keeps it still.
       */}
      <span aria-hidden data-aizen-seal-ring className={animate ? 'aizen-seal-ring' : 'aizen-seal-ring aizen-seal-ring-settled'}>
        <svg viewBox="0 0 160 160" className="h-full w-full">
          <circle
            cx="80"
            cy="80"
            r="76"
            fill="none"
            stroke="var(--color-shu)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="1 7.5"
            opacity="0.75"
          />
          <circle
            cx="80"
            cy="80"
            r="71.5"
            fill="none"
            stroke="var(--color-shu)"
            strokeWidth="1"
            strokeDasharray="14 210"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      </span>
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-label={label}
        className={animate ? 'aizen-seal-art aizen-seal-stamp' : 'aizen-seal-art'}
      >
        <defs>
          {/* carved-stone grain: subtle paper-fiber noise over the impression */}
          <filter id="aizen-seal-grain" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.98  0 0 0 0 0.97  0 0 0 0 0.94  0 0 0 0.35 0" />
          </filter>
          {/*
           * TASK-HANASO-22 — the shimmer sweep: a light-warm gradient bar that
           * crosses the carved face once after the stamp settles (a paper
           * sheen, not a sparkle). Masked to the seal circle via CSS.
           */}
          <linearGradient id="aizen-seal-shimmer" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-paper)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--color-paper)" stopOpacity="0.34" />
            <stop offset="1" stopColor="var(--color-paper)" stopOpacity="0" />
          </linearGradient>
          <clipPath id="aizen-seal-clip">
            <circle cx="60" cy="60" r="55" />
          </clipPath>
        </defs>
        {/* the vermilion field — shu, the seal color of the design system */}
        <circle cx="60" cy="60" r="55" fill="var(--color-shu)" />
        <circle cx="60" cy="60" r="55" fill="var(--color-shu-deep)" opacity="0.22" />
        {/* the carved ring (relief-negative: paper shows where stone was cut) */}
        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--color-paper)" strokeWidth="2.6" />
        <circle cx="60" cy="60" r="46.5" fill="none" stroke="var(--color-paper)" strokeWidth="1" opacity="0.55" />
        {/* 藍染 — Aizen's name, vertical tategaki, carved in the stone */}
        <text
          x="60"
          y="45"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--color-paper)"
          style={{ font: '900 33px var(--font-ja-serif, serif)' }}
        >
          藍
        </text>
        <text
          x="60"
          y="80"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--color-paper)"
          style={{ font: '900 33px var(--font-ja-serif, serif)' }}
        >
          染
        </text>
        {/* ink-skip chips — where the stone's edge kissed the paper unevenly */}
        <circle cx="14" cy="38" r="2.4" fill="var(--color-paper)" opacity="0.9" />
        <circle cx="106" cy="52" r="1.8" fill="var(--color-paper)" opacity="0.85" />
        <circle cx="30" cy="100" r="1.6" fill="var(--color-paper)" opacity="0.8" />
        <circle cx="88" cy="12" r="1.5" fill="var(--color-paper)" opacity="0.75" />
        <circle cx="52" cy="108" r="1.3" fill="var(--color-paper)" opacity="0.7" />
        {/* grain over the whole impression (progressive enhancement) */}
        <circle cx="60" cy="60" r="55" filter="url(#aizen-seal-grain)" opacity="0.5" />
        {/* the shimmer sweep (one pass, after the press — animate only) */}
        {animate ? (
          <rect
            x="-70"
            y="-20"
            width="70"
            height="160"
            fill="url(#aizen-seal-shimmer)"
            clipPath="url(#aizen-seal-clip)"
            className="aizen-seal-shimmer"
          />
        ) : null}
      </svg>
    </span>
  );
}
