/* Button variants — server-safe (TASK-DSGN-01).
 * از button.tsx جدا شد تا کامپوننت‌های سروری بتوانند ظاهر دکمه را روی <a>
 * بیاورند (مثل هیروی خانه) بدون فراخوانی تابع سمت کلاینت.
 * RTL-audit (KB frontend-architecture §5-2):
 *  - فاصله‌ها: همه logical (px-6 → معادل منطقی) ✓
 *  - آیکن جهت‌دار: ندارد ✓
 *  - DirectionProvider: overlay ندارد ✓
 *  - حالت‌ها: default/hover/focus-visible/active/disabled ✓
 *  - توکن‌ها: فقط tokens.css (bg-indigo/shadow-offset-cta/…) ✓
 * قواعد و مستندات همان button.tsx است (Aizen · DD-084).
 */
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-md',
    'font-extrabold text-body transition-[background-color,border-color,box-shadow,color,translate]',
    'min-h-11 px-6 py-2 cursor-pointer',
    'focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-shu',
    'disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none',
    '[&[aria-disabled="true"]]:pointer-events-none [&[aria-disabled="true"]]:opacity-45 [&[aria-disabled="true"]]:shadow-none',
  ].join(' '),
  {
    variants: {
      variant: {
        /* نیلی ساختاری — دکمهٔ اصلی (لنگر ترکیب‌بندی Aizen) */
        primary:
          'bg-indigo text-paper shadow-offset-indigo hover:bg-indigo-deep hover:shadow-offset-indigo-hover hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-offset-indigo-active',
        /* شنگرف باوقاحت — CTA پوستری (سایهٔ آفست سختِ نیلی) */
        cta: 'bg-shu text-card shadow-offset-cta hover:bg-shu-deep hover:shadow-offset-cta-hover hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-offset-cta-active',
        /* خطی — قاب نیلی روی کاغذ؛ hover = شستشوی نیلی روشن */
        secondary: 'border-2 border-indigo bg-transparent text-indigo hover:bg-indigo-wash active:translate-y-px',
        ghost: 'bg-transparent font-bold text-ai hover:bg-ai/8',
        destructive: 'bg-error text-paper hover:opacity-90',
        outline: 'border-2 border-indigo bg-card text-ink hover:bg-indigo-wash',
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

export { buttonVariants };
