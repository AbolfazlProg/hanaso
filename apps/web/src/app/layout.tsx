import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'هاناسو — HANASO',
  description: 'وب‌سایت آموزش زبان ژاپنی برای فارسی‌زبانان — مکالمه‌محور و مبتنی بر FSRS (در حال ساخت)',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
