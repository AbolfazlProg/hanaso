import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import { loadChapterBundle, chapterAccessStatus } from '@/modules/curriculum/server';
import { listChapterCards } from '@/modules/fsrs/integration';

const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);
import { resolveLearnerId } from '@/lib/learner/server';
import { fa } from '@/messages/fa';
import { JaBlock } from '@/components/patterns/ja-block';
import { ChapterLockedNotice } from '@/components/curriculum/chapter-locked-notice';

/**
 * /learn/[chapter]/complete — TASK-LEARNING-01 page 7: chapter completion.
 * Qualitative mastery verdict (AC-947 — no raw %), the 「理解」 seal, and what's next.
 *
 * TASK-HANASO-16: chapter soft-lock parity — a locked chapter's completion
 * page is not reachable by direct URL (#94).
 */
export const dynamic = 'force-dynamic';

export default async function ChapterCompletePage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter: slug } = await params;
  let bundle;
  try {
    bundle = loadChapterBundle(slug);
  } catch {
    notFound();
  }
  const chapter = bundle!.chapter;

  const learnerId = await resolveLearnerId();
  const access = await chapterAccessStatus(chapter, learnerId);
  if (access.locked) {
    return (
      <ChapterLockedNotice
        chapterTitleFa={chapter.titleFa}
        prerequisiteSlug={access.prerequisiteSlug}
        prerequisiteTitleFa={access.prerequisiteTitleFa}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center gap-8 px-4 py-16 text-center">
      <span
        aria-hidden
        className="grid size-28 place-items-center rounded-full border-4 border-success text-hero-ja font-black text-success"
      >
        <JaBlock>理解</JaBlock>
      </span>
      <div className="flex flex-col gap-3">
        <h1 className="text-h1 font-black text-indigo">{fa.curriculum.chapterCompleteTitle}</h1>
        <p className="text-lead text-ink-soft">{chapter.titleFa}</p>
        <p className="flex items-center justify-center gap-2 text-body font-bold text-success">
          <CircleCheck aria-hidden className="size-5" />
          {fa.curriculum.gatePassedTitle}
        </p>
      </div>

      <section className="w-full rounded-md border border-ink-faint bg-card p-6 text-start">
        <h2 className="text-h3 font-bold">{fa.curriculum.canDoTitle}</h2>
        <ul className="mt-3 flex flex-col gap-2 text-body">
          {chapter.canDoFa.split('،').map((part, i) => (
            <li key={i} className="flex items-start gap-2">
              <CircleCheck aria-hidden className="mt-1 size-4 shrink-0 text-success" />
              <span>{part.trim()}</span>
            </li>
          ))}
        </ul>
        {/* TASK-HANASO-17 — the card count is computed from the chapter's REAL
            FSRS inventory (listChapterCards), never a hardcoded number. */}
        <p className="mt-4 text-caption text-ink-soft">
          کارت‌های مرور این فصل ({faNum(listChapterCards(chapter).length)} کارت) در صف FSRS ثبت شدند — صف مرور با موتور
          M2 فعال می‌شود.
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/learn"
          className="flex h-12 items-center gap-2 rounded-md border border-ai px-6 text-body font-bold text-ai transition-colors hover:bg-indigo-wash"
        >
          {fa.curriculum.backToChapters}
        </Link>
        {/* TASK-HANASO-17 §7 — the ONE primary CTA of the chapter-completion
            moment: back to the map (the next chapter auto-becomes active there
            — the learner chooses what opens next, nothing auto-advances). */}
        <Link
          href={`/learn/${chapter.slug}/journey`}
          className="flex h-12 items-center gap-2 rounded-md bg-indigo px-6 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
        >
          {fa.curriculum.backToJourney}
          <ArrowLeft aria-hidden className="size-4" />
        </Link>
      </div>
    </main>
  );
}
