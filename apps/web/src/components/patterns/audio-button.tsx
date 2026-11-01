/**
 * AudioSentenceButton — دکمهٔ صوت جمله (KB components.css `btn--audio`).
 * آیکونی با نام دسترس‌پذیر (الزام KB §دکمهٔ صوت)؛ کف لمسی ۴۴px؛
 * حالت‌ها: idle/hover/focus-visible/active/playing(loading)/disabled.
 * پخش واقعی صوت به ماژول audio وصل می‌شود (onClick) — این کامپوننت فقط ظاهر
 * و دسترس‌پذیری را تضمین می‌کند (الگوی ماژول‌آگنوستیک).
 * RTL: آیکن‌های پخش (Play/Pause) طبق قرارداد جهانی کنترل رسانه آینه نمی‌شوند.
 */
'use client';

import { LoaderCircle, Pause, Play } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface AudioSentenceButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** متن دسترس‌پذیر — الزامی (مثلاً fa.audio.playSentence + شمارهٔ جمله). */
  'aria-label': string;
  state?: 'idle' | 'loading' | 'playing';
}

export function AudioSentenceButton({ className, state = 'idle', children, ...props }: AudioSentenceButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'grid size-11 place-items-center rounded-full',
        'bg-surface-sunken text-ink',
        'transition-colors hover:bg-surface-muted hover:text-ai',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai',
        'active:translate-y-px',
        'disabled:pointer-events-none disabled:opacity-45',
        className,
      )}
      aria-busy={state === 'loading' || undefined}
      {...props}
    >
      {state === 'loading' ? (
        <LoaderCircle aria-hidden className="size-5 motion-safe:animate-spin" />
      ) : state === 'playing' ? (
        <Pause aria-hidden className="size-5" />
      ) : (
        <Play aria-hidden className="size-5" />
      )}
      {children}
    </button>
  );
}
