'use client';
/**
 * HANASO — MixedFaJaText (ENGINE-NEXTGEN W-A — the shared mixed-direction text).
 *
 * Persian UI text that embeds Japanese fragments, Latin romaji, or numbers
 * (station titles like «الگوی هویت: AはBです», feedback lines like
 * «ترتیب: موضوع+も → هویت → です») scrambles under the bidi algorithm unless
 * every run is isolated — and arrows between Persian words point BACKWARDS
 * (the → glyph is not bidi-mirrored by browsers).
 *
 * This component is now the product-wide renderer over the shared run engine
 * (`src/lib/bidi-runs.ts`): every LTR run (Japanese / Latin / number) is a
 * `<bdi dir="ltr">` island (lang="ja" + the ja-block font stack for Japanese),
 * and arrows in RTL prose are direction-corrected to point at the NEXT-read
 * item while arrows inside LTR runs stay verbatim. One engine, every surface:
 * titles, sentences, feedback, hints, table cells, options — no per-component
 * CSS, no content rewrites required for direction fixes.
 */
import type { ReactNode } from 'react';
import { segmentForDisplay } from '@/lib/bidi-runs';

export function MixedFaJaText({ text, className }: { text: string; className?: string }): ReactNode {
  const parts = segmentForDisplay(text);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.dir === 'ltr' ? (
          <bdi key={i} dir="ltr" lang={part.lang ?? undefined} className={part.lang === 'ja' ? 'ja-block' : undefined}>
            {part.text}
          </bdi>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}
