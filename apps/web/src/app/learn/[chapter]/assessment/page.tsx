import { notFound } from 'next/navigation';
import { loadChapterBundle } from '@/modules/curriculum/server';
import { toClientExercise } from '@/modules/curriculum';
import { MasteryGate } from '@/components/curriculum/mastery-gate';
import { fa } from '@/messages/fa';
import type { ClientExercise } from '@/modules/curriculum/grading';

/**
 * /learn/[chapter]/assessment — TASK-LEARNING-01 page 6: the mastery gate (stage D).
 * Bank payloads stripped of answers; grading is a server round-trip.
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
        remediationHrefs={{}}
      />
    </main>
  );
}
