import { notFound } from 'next/navigation';
import { loadChapterBundle, chapterAccessStatus } from '@/modules/curriculum/server';
import { getChapter } from '@/modules/curriculum/content';
import { resolveLearnerId } from '@/lib/learner/server';
import { stripStationAnswerMaterial } from '@/modules/curriculum/client-transport';
import { AnchorDialogueExperience } from '@/components/curriculum/anchor-dialogue-experience';
import { ChapterLockedNotice } from '@/components/curriculum/chapter-locked-notice';
import { fa } from '@/messages/fa';

/**
 * /learn/[chapter]/dialogue — TASK-LEARNING-01 page 2: the ANCHOR station (stage A).
 * RSC shell + the anchor island (prediction → proven player → completion POST).
 *
 * TASK-LEARNING-02 (Reviewer-C S1): the station crosses the RSC boundary with all
 * answer material stripped (prediction correctOptionId/revealFa) — grading goes
 * through /api/curriculum/station `grade-block` like every other block.
 *
 * Issue #94 (Wave 3): the anchor station is a deep link too — it renders the SAME
 * chapter soft-lock notice as the journey map (chapterAccessStatus, DD-117/120).
 */
/** Progress-aware (chapter access store) — dynamic render. */
export const dynamic = 'force-dynamic';

export default async function AnchorDialoguePage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter: slug } = await params;
  let bundle;
  try {
    bundle = loadChapterBundle(slug);
  } catch {
    notFound();
  }
  const chapter = getChapter(slug)!;

  // #94: entering the chapter (stage A) is gated exactly like the journey map.
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
      {/*
       * #94: the prerequisite note only exists on chapters that actually declare
       * one (locked ≠ hidden — the goal itself needs no gate note on Ch01).
       */}
      {chapter.prerequisiteChapterSlug && (
        <footer className="mt-auto pt-6 text-caption text-ink-faint">{fa.curriculum.prerequisitesNote}</footer>
      )}
    </main>
  );
}
