'use client';
/**
 * HANASO — MixedFaJaText (TASK-LEARNING-01 — SKL-003 §۵ bidi boundaries).
 *
 * Persian UI text that embeds Japanese fragments (station titles like
 * «الگوی هویت: AはBです») scrambles under the bidi algorithm unless each
 * Japanese run is isolated. This component wraps every CJK/kana run in <bdi>
 * (plus dir/lang on the span) so the RTL flow stays intact and the Japanese
 * reads LTR — the same guarantee JaBlock gives whole blocks, for inline runs.
 */
import type { ReactNode } from 'react';

/** CJK ideographs, kana, prolonged sound mark, CJK punctuation. */
const JA_RUN = /([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3005\u3006\u30fc\u3001\u3002\uff0c\uff01\uff1f]+)/g;

export function MixedFaJaText({ text, className }: { text: string; className?: string }): ReactNode {
  const parts = text.split(JA_RUN);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <bdi key={i} dir="ltr" lang="ja" className="ja-block">
            {part}
          </bdi>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}
