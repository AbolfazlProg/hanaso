import { loadDialogue } from '@/modules/dialogue/server';
import { listChapters } from '@/modules/curriculum/content';
import { chapterAccessStatus } from '@/modules/curriculum/server';
import { getChapterProgressStore } from '@/lib/poc/stores';
import { POC_DEFAULT_USER_ID } from '@/lib/poc/principal';
import { LearnCard } from './learn-card';
import { fa } from '@/messages/fa';

/**
 * /learn — the learning entry point (TASK-SLICE-01 → TASK-LEARNING-06).
 *
 * The chapter path: Ch01 kana foundation (L1) → the conversation chapter (L2) →
 * … A chapter declaring a prerequisite shows its soft-lock state honestly
 * (locked ≠ hidden: the goal stays visible — DD-114 honest representation).
 */
/** Progress-aware (station/chapter stores) — dynamic render. */
export const dynamic = 'force-dynamic';

export default async function LearnPage() {
  const dialogue = loadDialogue('cafe-morning-01');
  const chapters = listChapters();
  const chapterStore = getChapterProgressStore();
  const cards = await Promise.all(
    chapters.map(async (chapter) => ({
      chapter,
      access: await chapterAccessStatus(chapter, POC_DEFAULT_USER_ID),
      state: await chapterStore.get(POC_DEFAULT_USER_ID, chapter.slug),
    })),
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-14">
      <header className="flex flex-col gap-2">
        <p className="text-caption text-ink-soft">هاناسو · مسیر یادگیری</p>
        <h1 className="text-h1 font-black text-indigo">{fa.curriculum.learnIndexTitle}</h1>
        <p className="text-lead text-ink-soft">{fa.curriculum.learnIndexLead}</p>
      </header>

      {cards.map(({ chapter, access, state }, index) => (
        <article
          key={chapter.slug}
          className="relative overflow-hidden rounded-md border-2 border-indigo bg-card p-6 shadow-[var(--shadow-card)]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -top-4 -end-4 grid size-24 place-items-center rounded-full bg-indigo text-2xl font-black text-indigo-mist"
          >
            {new Intl.NumberFormat('fa-IR').format(index + 1)}
          </span>
          <p className="text-caption text-ink-soft">
            {fa.curriculum.chapterBadge} · {fa.curriculum.levelLabel} {chapter.levelCode}
            {state?.status === 'understood' ? ' · مکالمهٔ فهمیده‌شده ✓' : ''}
          </p>
          <h2 className="mt-1 text-h2 font-black text-indigo">{chapter.titleFa}</h2>
          <p className="mt-2 text-body text-ink-soft">{chapter.summaryFa}</p>
          <p className="mt-3 text-small text-ink-soft">
            ~{new Intl.NumberFormat('fa-IR').format(chapter.estMinutes)} {fa.curriculum.minutes} ·{' '}
            {new Intl.NumberFormat('fa-IR').format(chapter.stations.filter((s) => s.core).length)}{' '}
            {fa.curriculum.stations} · {chapter.estLoad === 'medium' ? 'بار متوسط' : 'بار سبک'}
          </p>
          {access.locked && access.prerequisiteTitleFa ? (
            <p className="mt-4 rounded-md border border-amber-600/40 bg-amber-50 px-4 py-3 text-small text-amber-800">
              {fa.curriculum.chapterLockedBody} ({access.prerequisiteTitleFa})
            </p>
          ) : null}
          <a
            href={`/learn/${chapter.slug}`}
            className="mt-5 flex h-12 w-fit items-center gap-2 rounded-md bg-shu px-6 text-body font-bold text-paper transition-colors hover:bg-shu-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            {state && state.status !== 'started' ? fa.curriculum.continueChapter : fa.curriculum.startChapter}
          </a>
        </article>
      ))}

      <section className="flex flex-col gap-3 border-t border-ink-faint pt-6">
        <p className="text-caption text-ink-soft">{fa.curriculum.poUnitLabel}</p>
        <LearnCard dialogueId={dialogue.id} titleFa="کافه — صبح" sceneFa={dialogue.scene} jlpt="Pre-N5" />
      </section>

      <footer className="mt-auto border-t border-ink-faint pt-4 text-caption text-ink-soft">
        <p>
          هر فصل با مکالمه شروع می‌شود، در ایستگاه‌های جزیره‌ای یاد می‌گیری و فهمش فقط با قبولی در دروازهٔ فهم
          (understood) ثبت می‌شود — «تمام کرد» با «فهمیدم» فرق دارد.
        </p>
      </footer>
    </main>
  );
}
