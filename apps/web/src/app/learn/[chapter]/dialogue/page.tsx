import { notFound } from 'next/navigation';
import { loadChapterBundle } from '@/modules/curriculum/server';
import { getChapter } from '@/modules/curriculum/content';
import { stripStationAnswerMaterial } from '@/modules/curriculum/client-transport';
import { AnchorDialogueExperience } from '@/components/curriculum/anchor-dialogue-experience';
import { fa } from '@/messages/fa';

/**
 * /learn/[chapter]/dialogue — TASK-LEARNING-01 page 2: the ANCHOR station (stage A).
 * RSC shell + the anchor island (prediction → proven player → completion POST).
 *
 * TASK-LEARNING-02 (Reviewer-C S1): the station crosses the RSC boundary with all
 * answer material stripped (prediction correctOptionId/revealFa) — grading goes
 * through /api/curriculum/station `grade-block` like every other block.
 */
export default async function AnchorDialoguePage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter: slug } = await params;
  let bundle;
  try {
    bundle = loadChapterBundle(slug);
  } catch {
    notFound();
  }
  const chapter = getChapter(slug)!;
  const anchorRaw = chapter.stations.find((s) => s.type === 'anchor');
  if (!anchorRaw) notFound();
  const anchor = stripStationAnswerMaterial(anchorRaw);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-caption text-ink-soft">
          {chapter.titleFa} · {anchor.titleFa}
        </p>
        <h1 className="text-h1 font-black text-indigo">{anchor.titleFa}</h1>
        <p className="text-lead text-ink-soft">{anchor.objectiveFa}</p>
      </header>
      <AnchorDialogueExperience
        chapterSlug={chapter.slug}
        station={anchor}
        bundle={{
          dialogue: bundle!.bundle.dialogue,
          characters: bundle!.bundle.characters,
          audio: bundle!.bundle.audio,
        }}
      />
      <footer className="mt-auto pt-6 text-caption text-ink-faint">{fa.curriculum.prerequisitesNote}</footer>
    </main>
  );
}
