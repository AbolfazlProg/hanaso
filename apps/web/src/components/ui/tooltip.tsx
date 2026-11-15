/* shadcn Tooltip — HANASO port (TASK-M0-09).
 * RTL-audit:
 *  - فاصله‌ها: جهت-نامعلوم (padding داخلی) ✓
 *  - آیکن جهت‌دار: ندارد ✓
 *  - DirectionProvider: Tooltip جهت-مستقل (spike M0-06 §جدول) ✓
 *  - حالت‌ها: idle/instant-open/delayed/disabled (توسط Radix) ✓
 *  - KB 9.9: hover + focus + Esc — Radix پوشش می‌دهد؛ z-index = --z-toast ✓
 *  - max-width محدود تا در موبایل ۳۹۰px سرریز نشود (اصلاح P3 KB) ✓
 */
'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-toast max-w-[min(260px,78vw)] rounded-sm bg-ink px-3 py-2',
          'text-small text-paper leading-fa',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai',
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
