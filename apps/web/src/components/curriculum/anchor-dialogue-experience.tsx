'use client';
/**
 * HANASO — AnchorDialogueExperience (TASK-LEARNING-01) — stage A island.
 *
 * Wraps the proven PoC player (DialogueScene — playback engine + character
 * placeholders + error paths) with the ANCHOR station's didactic shell:
 * prediction question (exactly one, L2 — COMPOSITION §۳-۲) → full play →
 * free per-line replay → «مسیر را شروع کن» CTA → completion POST (viewed).
 */
import { useState } from 'react';
import { ArrowLeft, CircleCheck } from 'lucide-react';
import { fa } from '@/messages/fa';
import type { CharacterRef, Dialogue } from '@/modules/dialogue';
import type { Station } from '@/modules/curriculum/types';
import { DialogueScene } from '@/app/poc/dialogue/dialogue-scene';

type PredictionBlock = Extract<Station['blocks'][number], { kind: 'dialogue-player' }> & {
  prediction?: {
    questionFa: string;
    options: { id: string; label: string }[];
    correctOptionId: string;
    revealFa: string;
  };
};

export interface AnchorDialogueExperienceProps {
  chapterSlug: string;
  station: Station;
  bundle: {
    dialogue: Dialogue;
    characters: CharacterRef[];
    audio: {
      available: boolean;
      note?: string;
      audioSource?: 'voicevox' | 'placeholder';
      voiceCredits?: string[];
      entries: {
        lineId: string;
        voiceId: string;
        hash: string;
        files: { opus: string; m4a: string };
        bytes: number;
        durationMs?: number;
      }[];
    };
  };
}

export function AnchorDialogueExperience({ chapterSlug, station, bundle }: AnchorDialogueExperienceProps) {
  const playerBlock = station.blocks.find((b): b is PredictionBlock => b.kind === 'dialogue-player');
  const prediction = playerBlock?.prediction;
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [posting, setPosting] = useState(false);

  const complete = async () => {
    setPosting(true);
    try {
      await fetch('/api/curriculum/station', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'complete', chapterSlug, stationSlug: station.slug, score: null }),
      });
      setDone(true);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {prediction && (
        <section className="rounded-md border-2 border-ai bg-indigo-wash/40 p-5">
          <p className="text-body font-bold">🔮 {prediction.questionFa}</p>
          <div role="radiogroup" className="mt-3 flex flex-col gap-2">
            {prediction.options.map((opt) => {
              const isCorrect = opt.id === prediction.correctOptionId;
              const show = picked !== null;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={picked === opt.id}
                  disabled={picked !== null}
                  onClick={() => setPicked(opt.id)}
                  className={[
                    'min-h-11 rounded-md border px-4 py-3 text-start text-body transition-colors',
                    show && isCorrect
                      ? 'border-success bg-card font-bold'
                      : picked === opt.id
                        ? 'border-error bg-card'
                        : 'border-ink-faint bg-card hover:border-ai',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <p role="status" aria-live="polite" className="mt-3 rounded-md bg-card p-3 text-body">
              {prediction.revealFa}
            </p>
          )}
        </section>
      )}

      {/* the proven multi-speaker player (parameterized slug — analytics stay honest) */}
      <DialogueScene bundle={bundle} dialogueSlug={chapterSlug} />

      {/* TASK-LEARNING-02: real-TTS provenance + VOICEVOX character credit (terms) */}
      {bundle.audio.audioSource === 'voicevox' && bundle.audio.voiceCredits?.length ? (
        <p className="text-caption text-ink-faint">
          🗣 صداها با موتور VOICEVOX از پیش تولید شده‌اند — {bundle.audio.voiceCredits.join('・')}
        </p>
      ) : null}

      {!done ? (
        <button
          type="button"
          onClick={complete}
          disabled={posting}
          className="flex h-14 items-center justify-center gap-3 rounded-md bg-shu px-6 text-lead font-black text-paper transition-colors hover:bg-shu-deep disabled:opacity-45"
        >
          {posting ? fa.common.loading : fa.curriculum.startChapter}
          <ArrowLeft aria-hidden className="size-5" />
        </button>
      ) : (
        <div role="status" className="flex flex-col gap-3 rounded-md border border-success bg-card p-5">
          <p className="flex items-center gap-2 text-body font-bold text-success">
            <CircleCheck aria-hidden className="size-5" />
            {fa.curriculum.stationDone}
          </p>
          <a
            href={`/learn/${chapterSlug}/journey`}
            className="flex h-11 w-fit items-center gap-2 rounded-md bg-indigo px-5 text-body font-bold text-paper transition-colors hover:bg-indigo-deep"
          >
            {fa.curriculum.journeyTitle}
            <ArrowLeft aria-hidden className="size-4" />
          </a>
        </div>
      )}
    </div>
  );
}
