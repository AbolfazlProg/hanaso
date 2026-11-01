/* shadcn Accordion — HANASO port (TASK-M0-09).
 * RTL-audit:
 *  - فاصله‌ها: logical (end-4 برای chevron؛ flex-row جهت‌آگاه) ✓
 *  - آیکن جهت‌دار: ChevronDown خنثی — چرخش 180° وضعیت را نشان می‌دهد ✓
 *  - DirectionProvider: نیاز ندارد (بدون پاپ‌آور) ✓
 *  - حالت‌ها: open/closed/hover/focus-visible/disabled ✓
 */
'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const Accordion = AccordionPrimitive.Root;

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn('border-b border-ink-faint/55', className)} {...props} />;
}

function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'flex flex-1 items-center justify-between gap-4 py-4 text-start text-body font-medium',
          'min-h-11 transition-colors hover:text-ai',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai',
          'disabled:pointer-events-none disabled:opacity-45',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-ink-soft transition-transform duration-200 motion-reduce:transition-none"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className={cn('overflow-hidden text-small text-ink-soft leading-fa', className)}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
