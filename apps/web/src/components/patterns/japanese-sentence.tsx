/**
 * JapaneseSentence — کارت جملهٔ ژاپنی (KB components.css `card--sentence` + `reveal`).
 * ترکیب: زمینهٔ torinoko + JaBlock/FuriganaText با text-ja + ترجمهٔ فارسی
 * پشت details/summary (بازیابی فعال — پیش‌فرض مخفی).
 * رشته‌های UI از messages/fa.ts (ADR-013)؛ محتوای ژاپنی «داده» است.
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { fa } from '@/messages/fa';
import { FuriganaText, type FuriganaToken } from './furigana-text';

export interface JapaneseSentenceProps {
  /** توکن‌های جملهٔ ژاپنی (روبی‌دار) — از محتوا می‌آید. */
  tokens: FuriganaToken[];
  /** ترجمهٔ فارسی — با details/summary پنهان می‌شود. */
  translation?: string;
  /** متن دکمهٔ نمایش ترجمه (fa.sentence.revealTranslation از فراخواننده). */
  revealLabel?: string;
  /** اکشن کنار جمله (مثلاً AudioSentenceButton). */
  action?: ReactNode;
  variant?: 'ui' | 'serif';
  className?: string;
}

export function JapaneseSentence({
  tokens,
  translation,
  revealLabel = fa.sentence.revealTranslation,
  action,
  variant = 'ui',
  className,
}: JapaneseSentenceProps) {
  return (
    <div className={cn('rounded-md border border-ink-faint/55 bg-surface-warm p-4', className)}>
      <div className="fg-block flex items-start gap-3">
        <div className="min-w-0 flex-1 text-ja leading-[2]">
          <FuriganaText tokens={tokens} variant={variant} />
        </div>
        {action ? <div className="shrink-0 pt-1">{action}</div> : null}
      </div>
      {translation ? (
        <details className="mt-3">
          <summary
            className={cn(
              'inline-flex min-h-11 cursor-pointer items-center gap-1 text-small text-ai',
              'list-none [&::-webkit-details-marker]:hidden',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai',
            )}
          >
            {revealLabel}
          </summary>
          <p className="text-body leading-fa text-ink">{translation}</p>
        </details>
      ) : null}
    </div>
  );
}
