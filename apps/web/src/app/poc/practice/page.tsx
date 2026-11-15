import { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
import { resolveSpeaker } from '@/modules/character';
import { generateExercises } from '@/modules/practice';
import { PracticeRunner } from './practice-runner';
import { guardPocPage } from '@/lib/poc/page-guard';

/**
 * /poc/practice — TASK-SLICE-01 stage C: the deterministic exercise set generated
 * from the SAME cafe dialogue (speaker-identify / order-reconstruct / listen-no-text /
 * fill-token — FEAT-096..099), run interactively in the client island.
 */
export default function PracticePage() {
  guardPocPage(); // TASK-HANASO-24: dev/test-only legacy page — 404 in production

  const bundle = loadDialogueBundle('cafe-morning-01');
  const { dialogue, characters, audio } = bundle;

  const exercises = generateExercises(dialogue, characters);
  const audioByLine: Record<string, string> = {};
  for (const entry of audio.entries) audioByLine[entry.lineId] = entry.files.opus;
  const speakerNames: Record<string, string> = {};
  for (const id of dialogue.characterIds) speakerNames[id] = resolveSpeaker(id).manifest.nameFa;
  const teachesByLine: Record<string, string[]> = {};
  for (const line of dialogue.lines) teachesByLine[line.id] = line.teaches ?? [];

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-caption text-ink-soft">TASK-SLICE-01 · تمرین مکالمه‌محور (مرحلهٔ C)</p>
        <h1 className="text-h2 font-bold">تمرین با خودِ مکالمهٔ کافه</h1>
        <p className="text-small text-ink-soft">
          {exercises.length} تمرین در ۴ نوع — همهٔ گزینه‌ها و جمله‌ها از همین مکالمه استخراج شده‌اند (بدون دادهٔ
          بیرونی).
        </p>
      </header>

      <PracticeRunner
        dialogueId={dialogue.id}
        exercises={exercises}
        audioByLine={audioByLine}
        audioAvailable={audio.available}
        audioNote={audio.note}
        speakerNames={speakerNames}
        teachesByLine={teachesByLine}
      />

      <footer className="mt-auto border-t border-ink-faint pt-4 text-caption text-ink-soft">
        <p>
          پایان مرحلهٔ C در نسخهٔ کامل، آیتم‌ها را وارد صف FSRS می‌کند (با فیلد جملهٔ منبع — G4)؛ در این Slice نتیجهٔ
          تمرین به نقاط ضعف و پیش‌نمایش مرحلهٔ D ختم می‌شود.
        </p>
      </footer>
    </main>
  );
}
