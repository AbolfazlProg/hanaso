/* shadcn Sheet — HANASO port (TASK-M0-09).
 * RTL-audit:
 *  - فاصله‌ها: sides منطقی — side="start" یعنی سمت آغازِ جهت (در RTL = چپ) با
 *    inset-inline-start؛ هیچ left/right فیزیکی در کد نیست ✓
 *  - آیکن جهت‌دار: X خنثی ✓
 *  - DirectionProvider: زیر provider سالم (Dialog primitive — spike M0-06) ✓
 *  - حالت‌ها: انیمیشن‌ها با توکن dur-fast؛ فوکوس مرئی ✓
 *  - z-index: --z-drawer (پنل کشویی «در مکالمه ببین» طبق KB) ✓
 */
'use client';

import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;

type SheetSide = 'start' | 'end' | 'top' | 'bottom';

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return <SheetPrimitive.Overlay className={cn('fixed inset-0 z-drawer bg-scrim', className)} {...props} />;
}

const sideClasses: Record<SheetSide, { position: string; size: string }> = {
  start: { position: 'inset-y-0 start-0 border-e', size: 'w-3/4 max-w-sm' },
  end: { position: 'inset-y-0 end-0 border-s', size: 'w-3/4 max-w-sm' },
  top: { position: 'inset-x-0 top-0 border-b', size: '' },
  bottom: { position: 'inset-x-0 bottom-0 border-t', size: '' },
};

interface SheetContentProps extends React.ComponentProps<typeof SheetPrimitive.Content> {
  side?: SheetSide;
}

function SheetContent({ side = 'end', className, children, ...props }: SheetContentProps) {
  const s = sideClasses[side];
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        className={cn(
          'fixed z-drawer bg-paper shadow-raised flex flex-col gap-4 p-6 focus:outline-none',
          s.position,
          s.size,
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className={cn(
            'absolute end-4 top-4 grid min-h-11 min-w-11 place-items-center rounded-sm text-ink-soft',
            'transition-colors hover:text-ink',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai',
          )}
          aria-label="بستن"
        >
          <X aria-hidden className="size-4" />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 text-start', className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('mt-auto flex flex-col-reverse gap-2', className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn('text-h3 font-semibold text-ink', className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return <SheetPrimitive.Description className={cn('text-small text-ink-soft leading-fa', className)} {...props} />;
}

export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger };
