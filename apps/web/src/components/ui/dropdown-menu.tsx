/* shadcn DropdownMenu — HANASO port (TASK-M0-09).
 * RTL-audit (spike M0-06 — مهم‌ترین یافته):
 *  - فاصله‌ها: ms-auto برای نشانگر زیرمنو (نه ml-auto فیزیکی) ✓
 *  - آیکن جهت‌دار: زیرمنو در RTL با ChevronLeft نشان داده می‌شود (آینهٔ Right) ✓
 *  - DirectionProvider: الزامی — بدون آن wrapper ها dir="ltr" می‌گیرند و
 *    ArrowRight زیرمنو را باز می‌کند (اندازه‌گیری‌شده) ✓
 *  - موبایل 390px: flyout زیرمنو ممنوع (88px بیرون صفحه) — الگوی drill-in؛
 *    در این پورت SubMenuTrigger هست اما در چیدمان موبایل استفاده نمی‌شود ✓
 *  - حالت‌ها: highlight/selected/disabled/focus-visible ✓
 */
'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronLeft } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-modal min-w-48 overflow-hidden rounded-md border border-ink-faint/55 bg-paper p-1 shadow-raised',
          'data-[state=open]:animate-[hanaso-fade-in_var(--dur-fast)_var(--ease-out)]',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'relative flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-small text-ink',
        'outline-none transition-colors',
        'focus:bg-surface-sunken focus:outline-none',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
        inset && 'ps-8',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(
        'relative flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-sm py-2 pe-2 ps-8 text-small text-ink',
        'outline-none transition-colors focus:bg-surface-sunken focus:outline-none',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute start-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check aria-hidden className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(
        'relative flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-sm py-2 pe-2 ps-8 text-small text-ink',
        'outline-none transition-colors focus:bg-surface-sunken focus:outline-none',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-45',
        className,
      )}
      {...props}
    >
      <span className="absolute start-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <span className="size-2 rounded-full bg-ai" aria-hidden />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn('px-2 py-2 text-small font-semibold text-ink-soft', inset && 'ps-8', className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-surface-muted', className)} {...props} />;
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('ms-auto text-caption tracking-widest text-ink-faint', className)} {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn(
        'flex min-h-11 cursor-pointer select-none items-center rounded-sm px-2 py-2 text-small text-ink',
        'outline-none focus:bg-surface-sunken data-[state=open]:bg-surface-sunken',
        inset && 'ps-8',
        className,
      )}
      {...props}
    >
      {children}
      {/* آینهٔ RTL: نشانگر بازشدن زیرمنو در چیدمان راست‌به‌چپ رو به چپ است */}
      <ChevronLeft aria-hidden className="ms-auto size-4 text-ink-soft" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      className={cn(
        'z-modal min-w-40 overflow-hidden rounded-md border border-ink-faint/55 bg-paper p-1 shadow-raised',
        className,
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
