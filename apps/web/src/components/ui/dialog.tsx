/* shadcn Dialog — HANASO port (TASK-M0-09).
 * RTL-audit:
 *  - فاصله‌ها: logical (end-4…)؛ وسط‌چین با inset-x-0+mx-auto (در RTL هم درست) ✓
 *  - آیکن جهت‌دار: X خنثی ✓
 *  - DirectionProvider: overlay/content جهت-مستقل (spike M0-06 — Popover/Dialog سالم) ✓
 *  - حالت‌ها: open/closed با توکن dur-fast؛ فوکوس مرئی focus-visible ✓
 *  - scrim = توکن --color-scrim؛ z-index = --z-modal ✓
 */
'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';
import { fa } from '@/messages/fa';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-modal bg-scrim',
        'data-[state=open]:animate-[hanaso-fade-in_var(--dur-fast)_var(--ease-out)]',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-x-0 top-1/2 z-modal mx-auto -translate-y-1/2',
          'w-full max-w-lg rounded-lg border border-ink-faint/55 bg-paper shadow-raised',
          'p-6 focus:outline-none',
          'data-[state=open]:animate-[hanaso-fade-in_var(--dur-fast)_var(--ease-out)]',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className={cn(
            'absolute end-4 top-4 rounded-sm text-ink-soft',
            'min-h-11 min-w-11 grid place-items-center',
            'transition-colors hover:text-ink',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai',
          )}
          aria-label={fa.common.close}
        >
          <X aria-hidden className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 text-start', className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-start', className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title className={cn('text-h3 leading-normal font-semibold text-ink', className)} {...props} />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('text-small text-ink-soft leading-fa', className)} {...props} />;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
