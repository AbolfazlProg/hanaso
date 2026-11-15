/* shadcn Command (cmdk) — HANASO port (TASK-M0-09).
 * RTL-audit:
 *  - فاصله‌ها: logical (ps/pe) ✓
 *  - آیکن جهت‌دار: Search خنثی ✓
 *  - DirectionProvider: جستجو/فهرست جهت-مستقل؛ ورودی متن فارسی RTL ✓
 *  - حالت‌ها: selected (data-selected)/disabled/empty ✓
 *  - یادداشت موبایل: در 390px به‌صورت Dialog تمام‌صفحه استفاده شود نه پاپ‌آور ✓
 */
'use client';

import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      className={cn('flex h-full w-full flex-col overflow-hidden rounded-md bg-paper text-ink', className)}
      {...props}
    />
  );
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex items-center gap-2 border-b border-ink-faint/55 px-3">
      <Search aria-hidden className="size-4 shrink-0 text-ink-soft" />
      <CommandPrimitive.Input
        className={cn(
          'flex min-h-11 w-full bg-transparent py-3 text-body text-ink outline-none',
          'placeholder:text-ink-soft disabled:opacity-45',
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List className={cn('max-h-64 overflow-y-auto overflow-x-hidden p-1', className)} {...props} />
  );
}

function CommandEmpty({ ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty className="py-6 text-center text-small text-ink-soft" {...props} />;
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      className={cn(
        'overflow-hidden p-1 text-ink [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2',
        '[&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-ink-faint',
        className,
      )}
      {...props}
    />
  );
}

function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return <CommandPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-surface-muted', className)} {...props} />;
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      className={cn(
        'relative flex min-h-11 cursor-pointer select-none items-center gap-2 rounded-sm px-2 text-small text-ink',
        'outline-none data-[selected=true]:bg-surface-sunken data-[selected=true]:outline-none',
        'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-45',
        className,
      )}
      {...props}
    />
  );
}

export { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator };
