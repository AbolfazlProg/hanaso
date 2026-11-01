import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toast';
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
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
