import Link from 'next/link';
import { Compass, Home } from 'lucide-react';

import { SiteNav } from '@/components/site-nav';
import { fa } from '@/messages/fa';

/**
 * TASK-HANASO-20 (BUG-010) — a Persian, brand-consistent 404 for the Persian
 * RTL product. The audit (LIVE_WEBSITE_AUDIT §2) found the default English
 * Next.js page («404 / This page could not be found.») on every invalid route.
 * This page renders for ALL unmatched app routes; the message is honest (no
 * blame), the recovery path is one click Home, and the direction matches the
 * product (RTL Persian, AIZEN visual direction).
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav active="learn" />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 pb-28 pt-8 text-center md:pb-12 md:pt-10">
        <Compass aria-hidden className="size-10 text-indigo" />
        <h1 className="text-h1 font-black text-indigo">{fa.notFound.title}</h1>
        <p className="max-w-xl text-body leading-[var(--leading-fa)] text-ink-soft">{fa.notFound.body}</p>
        <Link
          href="/"
          className="flex h-12 items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
        >
          <Home aria-hidden className="size-4" />
          {fa.notFound.backHome}
        </Link>
        <Link
          href="/learn"
          className="flex w-fit items-center gap-1 text-small text-ai underline underline-offset-4"
        >
          <Compass aria-hidden className="size-4" />
          {fa.notFound.goLearn}
        </Link>
      </main>
    </div>
  );
}
