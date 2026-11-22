import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock3, Map, Sparkles } from 'lucide-react';
import { loadChapterBundle, chapterAccessStatus } from '@/modules/curriculum/server';
import { resolveLearnerId } from '@/lib/learner/server';
import { fa } from '@/messages/fa';
import { ChapterLockedNotice } from '@/components/curriculum/chapter-locked-notice';
import { MixedFaJaText } from '@/components/curriculum/mixed-fa-ja-text';

/**
 * /learn/[chapter] — TASK-LEARNING-01 page 1: chapter intro.
 *
 * The can-do goal card BEFORE the anchor dialogue (COMPOSITION §۳-۲ «کشف‌پذیری» —
 * the goals are announced, the vocabulary never). RSC + cache — content is static.
 *
 * TASK-HANASO-16: secondary route now (the journey home /learn is the entry);
 * reachable from the section panel's «معرفی فصل» link. The chapter soft lock
 * gates this route like every other chapter URL (#94 parity).
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
  const speakers = Object.fromEntries(dialogue.characters.map((c) => [c.id, c.nameFa]));

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-3">
        <p className="text-caption text-ink-soft">
          {fa.curriculum.chapterBadge} ۱ · {fa.curriculum.levelLabel} {chapter.levelCode}
        </p>
        <h1 className="text-h1 font-black text-indigo">
          {/* JOURNEY-FIX 2026-11-23 §۱: mixed-direction title — shared renderer. */}
          <MixedFaJaText text={chapter.titleFa} />
        </h1>
        <p className="text-lead text-ink-soft">
          <MixedFaJaText text={chapter.summaryFa} />
        </p>
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
        <p className="mt-3 text-lead leading-[var(--leading-fa)]">
          <MixedFaJaText text={chapter.canDoFa} />
        </p>
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

      {/* CTA into stage A
       * JOURNEY-FIX 2026-11-23 §۳ (conversation = the lesson's first section):
       * the intro's primary CTA used to hop to the SEPARATE /dialogue page — a
       * parallel anchor experience outside the walk. It now enters the ANCHOR
       * STATION of the journey (the lesson page whose first real section IS the
       * conversation, inline) — resolved from the chapter's own station data
       * (anchor type, else the first core station in walk order), never a
       * per-chapter hardcode. The /dialogue route stays as a deep link. */}
      {(() => {
        const anchorSlug =
          chapter.stations.find((s) => s.type === 'anchor')?.slug ??
            [...chapter.stations]
              .sort((a, b) => a.order - b.order)
              .find((s) => s.core)?.slug;
        const href = anchorSlug ? `/learn/${chapter.slug}/journey/${anchorSlug}` : `/learn/${chapter.slug}/journey`;
        return (
          <Link
            href={href}
            className="flex h-14 items-center justify-center gap-3 rounded-md bg-indigo px-6 text-lead font-black text-paper transition-colors hover:bg-indigo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            {fa.curriculum.startChapter}
            <ArrowLeft aria-hidden className="size-5" />
          </Link>
        );
      })()}

      <p className="flex items-center gap-2 text-caption text-ink-faint">
        <Map aria-hidden className="size-4" />
        بعد از مکالمه، مسیر یادگیری فصل — بخش به بخش، قدم به قدم — پیش روی‌ات باز می‌شود.
      </p>
    </main>
  );
}
