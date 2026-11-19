/**
 * HANASO — KanaMarkIcon (HANASO-IR owner fix 2026-11-19, item 5).
 *
 * The journey's kana rows used the lucide `Languages` icon — two overlapping
 * speech bubbles that read as the Google Translate logo (the owner's explicit
 * rejection). This is its REPLACEMENT: a dedicated HANASO kana mark — the
 * hiragana あ hand-redrawn as three brush strokes with round caps, echoing the
 * WritingCanvas ink (same 2px stroke language as the lucide set it sits
 * beside, so the identity tile stays visually one family).
 *
 * Drawn from the あ glyph itself (the first character every learner meets in
 * kana-foundation-01) — an OWNED mark, not a stock "languages" glyph.
 */
import type { SVGProps } from 'react';

export function KanaMarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      data-kana-mark
      {...props}
    >
      {/* stroke 1 — the top bar, a soft brush arc (left to right) */}
      <path d="M3.6 7.4 C 8 5.7, 16 5.7, 20.4 7.4" />
      {/* stroke 2 — the long vertical sweep with the bottom tail hook */}
      <path d="M12.7 3.3 C 12.7 9.6, 12 14.6, 8.9 19.3 C 8.1 20.5, 9.2 21.5, 10.7 21.1" />
      {/* stroke 3 — the small loop crossing the sweep (あ's breath mark) */}
      <path d="M7.9 14.6 C 11.3 16.9, 15.4 15.6, 16.1 12.5 C 16.6 10.4, 14.6 9.8, 13.6 11.3" />
    </svg>
  );
}
