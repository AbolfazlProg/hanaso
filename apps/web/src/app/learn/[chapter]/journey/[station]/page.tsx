import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { loadChapterBundle, chapterAccessStatus } from '@/modules/curriculum/server';
import { resolveLearnerId } from '@/lib/learner/server';
import { toClientExercise, toClientStation } from '@/modules/curriculum';
import { resolveSpeaker } from '@/modules/character';
import { wordAudioUrls, kanaAudioUrls } from '@/modules/audio/server';
import { StationRunner } from '@/components/curriculum/station-runner';
import { ChapterLockedNotice } from '@/components/curriculum/chapter-locked-notice';
import { fa } from '@/messages/fa';
import type { ClientExercise } from '@/modules/curriculum/grading';
import { MixedFaJaText } from '@/components/curriculum/mixed-fa-ja-text';

/**
 * /learn/[chapter]/journey/[station] — TASK-LEARNING-01 page 4+5: the STATION
 * (lesson engine) page. One renderer for EVERY station type — the content drives
 * what renders (blocks in authored order); this page never special-cases types.
 * Answer keys are stripped server-side (SKL-013); grading round-trips the API.
 *
 * Issue #94 (Wave 3): deep links respect the chapter soft lock — a locked chapter
 * renders the SAME notice as the journey page (chapterAccessStatus, DD-117/120).
 */
/** Progress-aware (chapter access store) — dynamic render. */
export const dynamic = 'force-dynamic';

export default async function StationPage({ params }: { params: Promise<{ chapter: string; station: string }> }) {
  const { chapter: chapterSlug, station: stationSlug } = await params;
  let bundle;
  try {
    bundle = loadChapterBundle(chapterSlug);
  } catch {
    notFound();
  }
  const chapter = bundle!.chapter;

  // #94: the station walk is gated exactly like the journey map.
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

  const station = chapter.stations.find((s) => s.slug === stationSlug);
  if (!station) notFound();

  // client-safe exercise payloads (no answers/feedback)
  const clientExercises: Record<string, ClientExercise> = {};
  for (const block of station.blocks) {
    if (block.kind !== 'exercise') continue;
    for (const id of block.exerciseIds) {
      const ex = chapter.exercises[id];
      if (ex) clientExercises[id] = toClientExercise(ex);
    }
  }

  // dialogue transport for the runner (lines + speaker names + audio map)
  const dialogue = bundle!.bundle.dialogue;
  const speakers: Record<string, string> = {};
  for (const id of dialogue.characterIds) speakers[id] = resolveSpeaker(id).manifest.nameFa;
  const audioByLine: Record<string, string> = {};
  const audioFallbackByLine: Record<string, string> = {};
  for (const entry of bundle!.bundle.audio.entries) {
    audioByLine[entry.lineId] = entry.files.opus;
    audioFallbackByLine[entry.lineId] = entry.files.m4a;
  }
  // Issue #103 (TASK-LEARNING-07): vocab cards prefer the word's INDEPENDENT audio
  // (wordAudio registry — DD-119) when a committed asset exists; resolution is
  // server-side (node:fs) and only the resolved URL pair crosses the RSC boundary.
  // Null = honest fallback to the source-line audio in the runner.
  const wordAudioByWord: Record<string, { opus: string; m4a: string } | null> = {};
  for (const w of chapter.words) {
    wordAudioByWord[w.id] = w.wordAudio ? wordAudioUrls(w.wordAudio) : null;
  }
  // TASK-LEARNING-08 (WP-2/WP-3 — owner feedback A): per-glyph kana audio resolved
  // server-side from the PRE-GENERATED registry (public/audio/kana — DD-081).
  // Null = no committed asset yet; the card degrades honestly.
  const kanaAudioByKanaId: Record<string, { opus: string; m4a: string } | null> = {};
  for (const block of station.blocks) {
    if (block.kind === 'kana-card') kanaAudioByKanaId[block.kanaId] = kanaAudioUrls(`kn-${block.kanaId}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6">
      <header className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink-faint bg-paper/95 px-4 py-3 backdrop-blur">
        <Link
          href={`/learn/${chapterSlug}/journey`}
          className="flex h-11 items-center gap-1 rounded-md border border-ink-faint px-3 text-small font-bold text-ink transition-colors hover:bg-surface-warm"
        >
          <ArrowRight aria-hidden className="size-4" />
          {fa.curriculum.backToJourney}
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-body font-black text-indigo">
            <MixedFaJaText text={station.titleFa} />
          </h1>
          <p className="truncate text-caption text-ink-soft">{chapter.titleFa}</p>
        </div>
        {!station.core && (
          <p className="rounded-full border border-ai px-3 py-1 text-caption text-ai">
            {fa.curriculum.stationOptional}
          </p>
        )}
      </header>
      <div className="my-auto flex flex-col gap-6 py-8">
        <div className="flex flex-col gap-1">
          <p className="text-lead text-ink-soft">
            <MixedFaJaText text={station.objectiveFa} />
          </p>
        </div>

        <StationRunner
          chapterSlug={chapterSlug}
          station={toClientStation(station)}
          chapter={{ words: chapter.words, expressions: chapter.expressions }}
          clientExercises={clientExercises}
          dialogue={{
            lines: dialogue.lines.map((l) => ({
              id: l.id,
              tokens: l.tokens.map((t) => ({ surface: t.surface })),
              fa: l.fa,
              speaker: l.speaker,
            })),
            speakers,
          }}
          audioByLine={audioByLine}
          audioFallbackByLine={audioFallbackByLine}
          audioAvailable={bundle!.bundle.audio.available}
          wordAudioByWord={wordAudioByWord}
          kanaAudioByKanaId={kanaAudioByKanaId}
        />
      </div>
    </main>
  );
}
