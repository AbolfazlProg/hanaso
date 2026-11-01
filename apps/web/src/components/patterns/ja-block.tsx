/**
 * JaBlock — جزیرهٔ LTR برای متن ژاپنی بدون روبی (KB components.css).
 * متن سادهٔ ژاپنی هم از همان مسیر جزیره استفاده می‌کند — یک مسیر رندر، یک قاعده
 * (spike M0-08 §۶-۳-۴). برای متن روبی‌دار از FuriganaText استفاده کنید.
 */
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface JaBlockProps {
  children: ReactNode;
  lang?: string; // پیش‌فرض 'ja' (WCAG 3.1.2)
  variant?: 'ui' | 'serif' | 'ud';
  className?: string;
}

export function JaBlock({ children, lang = 'ja', variant = 'ui', className }: JaBlockProps) {
  return (
    <span lang={lang} dir="ltr" className={cn('ja-block', variant !== 'ui' && variant, className)}>
      {children}
    </span>
  );
}
