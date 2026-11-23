'use client';
/**
 * HANASO — SmartJpLine (SMART-RUBY 2026-11-23 §۲) — the learner-aware dialogue
 * line renderer.
 *
 * The JpLine contract (every JP line is ONE LTR `lang="ja"` isolate, ruby only
 * where reading ≠ surface, `rt` non-selectable) with the furigana LAW on top:
 * a kanji token's reading shows until the kanji AND that reading are taught
 * to THIS learner — then the ruby hides and the kanji becomes tap-to-inspect.
 * Subtitle/transcript surfaces of the embedded dialogue player render through
 * this; the PoC pages keep their plain JpLine (reference playground).
 */
import Link from 'next/link';
import type { DialogueToken } from '@/modules/dialogue';
import { isKanjiChar } from '@/modules/curriculum/knowledge/reading-model';
import { SmartJaText } from '@/components/patterns/smart-ja-text';

export function SmartJpLine({
  tokens,
  className = '',
  active = false,
  getHref,
}: {
  tokens: DialogueToken[];
  className?: string;
  /** The active (currently playing) line renders bold — transcript emphasis. */
  active?: boolean;
  /** PoC-mode token links (the lesson chunk links). The product's embedded
   *  scenes pass none (#101) — that is where the learner-aware law renders. */
  getHref?: (token: DialogueToken) => string | null;
}): React.JSX.Element {
  return (
    <bdi lang="ja" dir="ltr" className={`poc-ja-line ${className} ${active ? 'font-bold' : ''}`}>
      {tokens.map((t, i) => {
        const href = getHref?.(t) ?? null;
        const carriesKanji = t.reading !== undefined && t.surface.split('').some(isKanjiChar);
        if (!carriesKanji || !t.reading || t.reading === t.surface) {
          const inner = <span>{t.surface}</span>;
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
        }
        if (href) {
          /* PoC linked token: the legacy static ruby (a Link cannot host the
           * tap-to-inspect control — nested interactive elements). */
          return (
            <Link
              key={`${t.surface}-${i}`}
              href={href}
              className="poc-token-link text-ai"
              onClick={(e) => e.stopPropagation()}
            >
              <ruby>
                {t.surface}
                <rt>{t.reading}</rt>
              </ruby>
            </Link>
          );
        }
        return <SmartJaText key={`${t.surface}-${i}`} tokens={[{ surface: t.surface, reading: t.reading }]} />;
      })}
    </bdi>
  );
}
