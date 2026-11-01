/* shadcn Button — HANASO port (TASK-M0-09 · Aizen restyle TASK-DSGN-01/DD-084).
 * RTL-audit (KB frontend-architecture §5-2):
 *  - فاصله‌ها: همه logical (px-6 → معادل منطقی؛ gap/sizes جهت-نامعلوم) ✓
 *  - آیکن جهت‌دار: ندارد (spinner Loader2 جهت-خنثی) ✓
 *  - DirectionProvider: این کامپوننت overlay ندارد ✓
 *  - حالت‌ها: default/hover/focus-visible/active/disabled + loading ✓
 *  - توکن‌ها: فقط از tokens.css (bg-indigo/shadow-offset-cta/…) — بدون hex خام ✓
 * Aizen (DD-084): وزن ۸۰۰ · شعاع ۳px چاپ ستونی · سایهٔ آفستِ سخت
 * (`4px 4px 0 indigo`) با میکرو-جابه‌جایی hover/active (لترپرس) — بدون
 * انیمیشن سنگین؛ همهٔ گذارها تابع prefers-reduced-motion (توکن‌های dur).
 */
'use client';

import type { VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import * as React from 'react';

import { buttonVariants } from './button-variants';
import { cn } from '@/lib/utils';

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
