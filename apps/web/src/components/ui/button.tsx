/* shadcn Button — HANASO port (TASK-M0-09).
 * RTL-audit (KB frontend-architecture §5-2):
 *  - فاصله‌ها: همه logical (px-6 → معادل منطقی؛ gap/sizes جهت-نامعلوم) ✓
 *  - آیکن جهت‌دار: ندارد (spinner Loader2 جهت-خنثی) ✓
 *  - DirectionProvider: این کامپوننت overlay ندارد ✓
 *  - حالت‌ها: default/hover/focus-visible/active/disabled + loading ✓
 *  - توکن‌ها: فقط از tokens.css (bg-ai/border-ink-faint/…) — بدون hex خام ✓
 */
'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-md',
    'font-medium text-body transition-[background-color,border-color,box-shadow,color]',
    'min-h-11 px-6 py-2 cursor-pointer',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai',
    'active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-45',
    '[&[aria-disabled="true"]]:pointer-events-none [&[aria-disabled="true"]]:opacity-45',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-ai text-paper hover:bg-ai-deep',
        secondary: 'border border-ink-faint bg-transparent text-ink hover:border-ink hover:bg-surface-sunken',
        ghost: 'bg-transparent text-ai hover:bg-ai/8',
        destructive: 'bg-error text-paper hover:opacity-90',
        outline: 'border border-ink-faint bg-paper text-ink hover:bg-surface-sunken',
      },
      size: {
        default: 'min-h-11 px-6 py-2',
        main: 'min-h-12 px-8 text-lead' /* اکشن اصلی لمسی ۴۸px */,
        sm: 'min-h-11 px-3 text-small',
        icon: 'min-w-11 min-h-11 rounded-full px-0' /* دکمهٔ آیکونی — کف لمسی */,
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** حالت loading — اسپینر + غیرفعال‌سازی؛ زیر prefers-reduced-motion نمی‌چرخد (AC-907). */
  loading?: boolean;
}

function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), 'relative', loading && 'pointer-events-none', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoaderCircle
          aria-hidden
          className="absolute inset-0 m-auto size-4 motion-safe:animate-[spin_var(--dur-spin)_linear_infinite]"
        />
      ) : null}
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>{children}</span>
    </button>
  );
}

export { Button, buttonVariants };
