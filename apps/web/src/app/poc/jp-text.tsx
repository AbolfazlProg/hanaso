/**
 * HANASO — Japanese line rendering for the PoC pages (TASK-DLG-POC-01 / T5).
 *
 * Implements the Spike M0-08 pattern for mixed RTL/LTR typography:
 * - every JP line lives inside its own LTR island (`dir="ltr"` + `<bdi>` + `lang="ja"`)
 * - `line-height ≥ 2` so furigana (`<rt>`) never collides with neighbouring lines
 * - `rt { user-select: none }` so copying a line copies the surface text only
 * - furigana only where reading ≠ surface (kanji tokens)
 *
 * Pure presentational (no hooks) — usable from both server and client components.
 */
import Link from 'next/link';
import type { DialogueToken } from '@/modules/dialogue';

export function JpLine({
  tokens,
  className = '',
  getHref,
}: {
  tokens: DialogueToken[];
  className?: string;
  /** Optional: make a token clickable (e.g. chunk → lesson card, T6 bidirectional wiring). */
  getHref?: (token: DialogueToken) => string | null;
}) {
  return (
    <bdi lang="ja" dir="ltr" className={`poc-ja-line ${className}`}>
      {tokens.map((t, i) => {
        const href = getHref?.(t) ?? null;
        const inner =
          t.reading !== t.surface ? (
            <ruby>
              {t.surface}
              <rt>{t.reading}</rt>
            </ruby>
          ) : (
            <span>{t.surface}</span>
          );
        return href ? (
          <Link
            key={`${t.surface}-${i}`}
            href={href}
            className="poc-token-link text-ai"
            onClick={(e) => e.stopPropagation()}
          >
            {inner}
          </Link>
        ) : (
          <span key={`${t.surface}-${i}`}>{inner}</span>
        );
      })}
    </bdi>
  );
}

/** Scoped styles for the PoC scene (kept local to the PoC — not a design-system change). */
export const POC_SCENE_CSS = `
.poc-ja-line {
  direction: ltr;
  unicode-bidi: isolate;
  text-align: left;
  line-height: 2.1; /* furigana headroom (Spike M0-08: ≥2) */
  font-family: var(--font-ja-ui); /* TASK-LEARNING-02 (Reviewer-B S2): was var(--font-ja) — undefined token → system fallback */
}
.poc-ja-line rt {
  user-select: none;
  font-size: var(--furigana-size);
  color: var(--color-ink-soft);
  font-family: var(--font-ja-ui);
}
.poc-token-link {
  text-decoration: underline dotted;
  text-underline-offset: 0.3em;
  cursor: pointer;
}
/* TASK-LEARNING-07 / Issue #98 — fixed stage + transport: the transcript is its own
   inner scroll region so the page never grows and the scene controls stay put.
   38vh mobile → 48vh from 48rem up; overscroll containment prevents scroll chaining
   to the page (the active line is scrolled into view programmatically — see the scene). */
.poc-scene-transcript {
  max-height: 38vh;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}
@media (min-width: 48rem) {
  .poc-scene-transcript {
    max-height: 48vh;
  }
}
`;
