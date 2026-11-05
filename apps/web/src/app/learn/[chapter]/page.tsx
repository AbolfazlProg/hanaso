import { notFound } from 'next/navigation';
import { ArrowLeft, Clock3, Map, Sparkles } from 'lucide-react';
import { loadChapterBundle } from '@/modules/curriculum/server';
import { fa } from '@/messages/fa';

/**
 * /learn/[chapter] — TASK-LEARNING-01 page 1: chapter intro.
 *
 * The can-do goal card BEFORE the anchor dialogue (COMPOSITION §۳-۲ «کشف‌پذیری» —
 * the goals are announced, the vocabulary never). RSC + cache — content is static.
 */
export default async function ChapterIntroPage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter: slug } = await params;
  let bundle;
  try {
    bundle = loadChapterBundle(slug);
  } catch {
    notFound();
  }
  const { chapter, bundle: dialogue } = bundle!;
  const speakers = Object.fromEntries(dialogue.characters.map((c) => [c.id, c.nameFa]));

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-caption text-ink-soft">
          {fa.curriculum.chapterBadge} ۱ · {fa.curriculum.levelLabel} {chapter.levelCode}
        </p>
        <h1 className="text-h1 font-black text-indigo">{chapter.titleFa}</h1>
        <p className="text-lead text-ink-soft">{chapter.summaryFa}</p>
        <p className="flex items-center gap-2 text-small text-ink-soft">
          <Clock3 aria-hidden className="size-4" />~{new Intl.NumberFormat('fa-IR').format(chapter.estMinutes)}{' '}
          {fa.curriculum.minutes} ·{' '}
          {new Intl.NumberFormat('fa-IR').format(chapter.stations.filter((s) => s.core).length)}{' '}
          {fa.curriculum.stations}
        </p>
      </header>

      {/* can-do goal card (before A — announced capability, hidden vocab) */}
      <section className="relative overflow-hidden rounded-md border-2 border-indigo bg-indigo p-6 text-paper">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-6 -start-6 size-32 rounded-full border-[10px] border-indigo-mist/25"
        />
        <h2 className="flex items-center gap-2 text-h3 font-bold">
          <Sparkles aria-hidden className="size-5" />
          {fa.curriculum.canDoTitle}
        </h2>
        <p className="mt-3 text-lead leading-[var(--leading-fa)]">{chapter.canDoFa}</p>
        {/*
         * #94 (Wave 3): the prerequisite note renders ONLY on chapters that declare
         * one — the copy now states the soft lock honestly (no «شروع بدون آن»).
         */}
        {chapter.prerequisiteChapterSlug && (
          <p className="mt-4 text-caption text-indigo-mist">{fa.curriculum.prerequisitesNote}</p>
        )}
      </section>

      {/* scene card */}
      <section className="rounded-md border border-ink-faint bg-card p-5">
        <h2 className="text-h3 font-bold">{fa.curriculum.sceneTitle}</h2>
        <p className="mt-3 text-body leading-[var(--leading-fa)]">{chapter.sceneFa}</p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="شخصیت‌ها">
          {dialogue.characters.map((c) => (
            <li key={c.id} className="rounded-full border border-ink-faint bg-surface-warm px-3 py-1 text-small">
              {speakers[c.id]}
            </li>
          ))}
        </ul>
      </section>

      {/* CTA into stage A */}
      <a
        href={`/learn/${chapter.slug}/dialogue`}
        className="flex h-14 items-center justify-center gap-3 rounded-md bg-shu px-6 text-lead font-black text-paper transition-colors hover:bg-shu-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
      >
        {fa.curriculum.startChapter}
        <ArrowLeft aria-hidden className="size-5" />
      </a>

      <p className="flex items-center gap-2 text-caption text-ink-faint">
        <Map aria-hidden className="size-4" />
        بعد از مکالمه، مسیر جزیره‌ای فصل پیش روی‌ات باز می‌شود.
      </p>
    </main>
  );
}
