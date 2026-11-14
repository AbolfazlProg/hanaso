'use client';
/**
 * HANASO — learn chapter error boundary (TASK-LEARNING-02 — Reviewer-B S0).
 *
 * A learner must never land on Next.js's default ENGLISH error page inside an
 * all-Persian product (e.g. when the DB is briefly unreachable). This boundary
 * wraps /learn/[chapter]/* and renders a Persian recovery card instead.
 */
import { RotateCcw, Coffee } from 'lucide-react';

export default function LearnChapterError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <span aria-hidden className="grid size-20 place-items-center rounded-full border-4 border-ink-faint bg-card">
        <Coffee className="size-9 text-indigo" />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-h2 font-black text-indigo">این صفحه فعلاً بالا نیامد</h1>
        <p className="text-lead text-ink-soft">
          ارتباط با سرور یادگیری برقرار نشد. معمولاً چند لحظه بعد درست می‌شود — دوباره تلاش کن.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="flex min-h-11 items-center gap-2 rounded-md border-2 border-ink bg-shu px-6 py-3 text-body font-black text-paper shadow-[var(--shadow-offset-cta)] transition-[box-shadow,translate] hover:shadow-[var(--shadow-offset-cta-hover)] hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-[var(--shadow-offset-cta-active)]"
      >
        <RotateCcw aria-hidden className="size-5" />
        تلاش دوباره
      </button>
      <a href="/learn" className="text-body text-ai underline underline-offset-4">
        بازگشت به فهرست فصل‌ها
      </a>
    </main>
  );
}
