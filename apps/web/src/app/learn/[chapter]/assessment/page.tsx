import { notFound } from 'next/navigation';
import { loadChapterBundle, chapterAccessStatus } from '@/modules/curriculum/server';
import { toClientExercise } from '@/modules/curriculum';
import { MasteryGate } from '@/components/curriculum/mastery-gate';
import { ChapterLockedNotice } from '@/components/curriculum/chapter-locked-notice';
import { resolveLearnerId } from '@/lib/learner/server';
import { fa } from '@/messages/fa';
import type { ClientExercise } from '@/modules/curriculum/grading';

/**
 * /learn/[chapter]/assessment — TASK-LEARNING-01 page 6: the mastery gate (stage D).
 * Bank payloads stripped of answers; grading is a server round-trip.
 *
 * TASK-HANASO-16: the chapter soft lock gates this route too — a locked
 * chapter's gate is not reachable by direct URL (#94 parity with every other
 * chapter route).
 */
export default async function AssessmentPage({ params }: { params: Promise<{ chapter: string }> }) {
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

  const gate = Object.values(chapter.exercises)
    .filter((e) => e.assessmentRole.startsWith('mastery_'))
    .map(toClientExercise);
  const audioByLine: Record<string, string> = {};
  for (const entry of bundle!.bundle.audio.entries) audioByLine[entry.lineId] = entry.files.opus;

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-caption text-ink-soft">{chapter.titleFa}</p>
        <h1 className="text-h2 font-black text-shu">{fa.curriculum.gateTitle}</h1>
      </header>
      <MasteryGate
        chapterSlug={chapter.slug}
        exercises={gate as ClientExercise[]}
        audioByLine={audioByLine}
        audioAvailable={bundle!.bundle.audio.available}
        stationTitles={Object.fromEntries(chapter.stations.map((s) => [s.slug, s.titleFa]))}
      />
    </main>
  );
}
