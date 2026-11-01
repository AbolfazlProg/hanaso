/* shadcn Tabs — HANASO port (TASK-M0-09).
 * RTL-audit:
 *  - فاصله‌ها: logical ✓ (شاخص فعال با start-0 — در RTL سمت راست می‌نشیند)
 *  - آیکن جهت‌دار: ندارد ✓
 *  - DirectionProvider: Tabs جهت-مستقل (spike M0-06) ✓
 *  - حالت‌ها: active-tab/inactive/hover/focus-visible/disabled ✓
 */
'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex items-center gap-1 rounded-md bg-surface-sunken p-1 text-ink-soft', className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex min-h-9 items-center justify-center rounded-sm px-3 text-small font-medium whitespace-nowrap',
        'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai',
        'hover:text-ink',
        'data-[state=active]:bg-paper data-[state=active]:text-ink data-[state=active]:shadow-card',
        'disabled:pointer-events-none disabled:opacity-45',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('mt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai', className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
