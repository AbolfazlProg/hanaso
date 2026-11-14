import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toast';
import { LearnerIdBootstrap } from '@/lib/learner/bootstrap';
import { notoSerifJP, vazirmatn, zenkaku } from '@/styles/fonts';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'هاناسو — HANASO',
  description: 'وب‌سایت آموزش زبان ژاپنی برای فارسی‌زبانان — مکالمه‌محور و مبتنی بر FSRS (در حال ساخت)',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${zenkaku.variable} ${notoSerifJP.variable}`}>
      <body>
        {/* DirectionProvider dir="rtl" — الزامی برای رفتار درست Radix در RTL (spike M0-06) */}
        <Providers>
          {/* TASK-LEARNING-08 (WP-5/#109): stable per-browser learner id — every
              RSC render / API call after the first visit keys progress to it. */}
          <LearnerIdBootstrap />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
