/* shadcn Toast (sonner) — HANASO port (TASK-M0-09).
 * RTL-audit:
 *  - dir="rtl" صریح روی Toaster (پشتیبانی sonner) ✓
 *  - position پیش‌فرض bottom-... منطقی؛ در v1 پایین صفحه ✓
 *  - استایل: کاغذ/مرکب از tokens (bg-paper/border-ink-faint/text-ink) ✓
 *  - حالت‌ها: default/success/error + focus-visible دکمهٔ عمل ✓
 *  - توکن رنگ toast در KB 9.4 (bg=ink، متن=paper) — richColors خاموش؛
 *    variantهای وضعیت با توکن‌های success/error استایل می‌شوند.
 */
'use client';

import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      dir="rtl"
      theme="light"
      position="bottom-center"
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            'group rounded-md border border-ink-faint/55 bg-paper text-ink shadow-raised text-small leading-fa font-[family-name:var(--font-fa)]',
          title: 'text-ink font-semibold',
          description: 'text-ink-soft',
          actionButton: 'bg-ai text-paper rounded-sm min-h-9',
          cancelButton: 'bg-surface-sunken text-ink rounded-sm min-h-9',
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
