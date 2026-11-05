import Link from 'next/link';
import { fa } from '@/messages/fa';

/**
 * HANASO — Chapter soft-lock notice (TASK-LEARNING-07 Wave 3 — Issue #94 residual).
 *
 * The SAME honest locked-state markup the journey page renders (locked ≠ hidden —
 * DD-114), shared by the deep links that walk a chapter (station pages + the anchor
 * dialogue page) so a directly-entered URL can no longer bypass the chapter gate.
 * Server-computed via chapterAccessStatus (modules/curriculum/server).
 */
export function ChapterLockedNotice({
  chapterTitleFa,
  prerequisiteSlug,
  prerequisiteTitleFa,
}: {
  chapterTitleFa: string;
  prerequisiteSlug: string | null;
  prerequisiteTitleFa: string | null;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <p className="text-caption text-ink-soft">{chapterTitleFa}</p>
        <h1 className="text-h1 font-black text-indigo">{fa.curriculum.chapterLockedTitle}</h1>
      </header>
      <section className="rounded-md border border-ink-faint bg-card p-6">
        <p className="text-body leading-[var(--leading-fa)] text-ink">{fa.curriculum.chapterLockedBody}</p>
        {prerequisiteSlug ? (
          <Link
            href={`/learn/${prerequisiteSlug}`}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-ai px-4 py-2 text-body font-bold text-ai"
          >
            {fa.curriculum.goPrerequisite} — {prerequisiteTitleFa}
          </Link>
        ) : null}
      </section>
    </main>
  );
}
