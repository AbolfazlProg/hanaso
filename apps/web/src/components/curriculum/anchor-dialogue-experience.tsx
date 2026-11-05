'use client';
/**
 * HANASO — AnchorDialogueExperience (TASK-LEARNING-01/02) — stage A island.
 *
 * Wraps the proven PoC player (DialogueScene — playback engine + character
 * placeholders + error paths) with the ANCHOR station's didactic shell:
 * prediction question (exactly one, L2 — COMPOSITION §۳-۲) → full play →
 * free per-line replay → «مسیر را شروع کن» CTA → completion POST (viewed).
 *
 * TASK-LEARNING-02 (Check-2 Reviewer-C S1): the prediction is graded via
 * /api/curriculum/station `grade-block` — the correct option + reveal text are
 * NOT in the client payload (SKL-013), unlike station blocks.
 */
import { useState } from 'react';
import { ArrowLeft, CircleCheck, MessageCircleQuestion, Volume2 } from 'lucide-react';
import { fa } from '@/messages/fa';
import type { CharacterRef, Dialogue } from '@/modules/dialogue';
import type { Station } from '@/modules/curriculum/types';
import { DialogueScene } from '@/app/poc/dialogue/dialogue-scene';

/** The stripped prediction the page ships (answer key lives server-side — SKL-013). */
type StrippedPrediction = {
  questionFa: string;
  options: { id: string; label: string }[];
};
type PredictionBlock = Extract<Station['blocks'][number], { kind: 'dialogue-player' }> & {
  prediction?: StrippedPrediction;
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
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [revealFa, setRevealFa] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [posting, setPosting] = useState(false);

  /** Server-side grading (SKL-013) — the key never ships with the page. */
  const pick = async (optionId: string) => {
    if (picked !== null || !playerBlock) return;
    setPicked(optionId);
    try {
      const res = await fetch('/api/curriculum/station', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'grade-block',
          chapterSlug,
          stationSlug: station.slug,
          blockId: playerBlock.id,
          answer: { kind: 'option', optionId },
        }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { outcome: { correct: boolean; feedbackFa: string } } };
      const outcome = json.data?.outcome;
      if (outcome) {
        setCorrect(outcome.correct);
        setRevealFa(outcome.feedbackFa || fa.curriculum.predictionDefaultReveal);
      } else {
        setCorrect(null);
        setRevealFa(fa.curriculum.gradingUnavailable);
      }
    } catch {
      setCorrect(null);
      setRevealFa(fa.curriculum.gradingUnavailable);
    }
  };

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
          <p className="flex items-center gap-2 text-body font-bold">
            <MessageCircleQuestion aria-hidden className="size-5 shrink-0" />
            {prediction.questionFa}
          </p>
          <div role="radiogroup" className="mt-3 flex flex-col gap-2">
            {prediction.options.map((opt) => {
              const show = picked !== null && correct !== null;
              const isCorrect = correct === true && picked === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={picked === opt.id}
                  disabled={picked !== null}
                  onClick={() => void pick(opt.id)}
                  className={[
                    'min-h-11 rounded-md border px-4 py-3 text-start text-body transition-colors',
                    show && isCorrect
                      ? 'border-success bg-card font-bold'
                      : picked === opt.id && correct === false
                        ? 'border-error bg-card'
                        : 'border-ink-faint bg-card hover:border-ai',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {picked !== null && revealFa !== null && (
            <p role="status" aria-live="polite" className="mt-3 rounded-md bg-card p-3 text-body">
              {revealFa}
            </p>
          )}
        </section>
      )}

      {/* the proven multi-speaker player (parameterized slug — analytics stay honest).
          TASK-LEARNING-07 / Issue #101: `embedded` hides every PoC navigation surface
          (nav, /poc/lesson links, finish CTA) — this station owns completion. */}
      <DialogueScene bundle={bundle} dialogueSlug={chapterSlug} embedded />

      {/* TASK-LEARNING-02: real-TTS provenance + VOICEVOX character credit (terms) */}
      {bundle.audio.audioSource === 'voicevox' && bundle.audio.voiceCredits?.length ? (
        <p className="flex items-center gap-1.5 text-caption text-ink-faint">
          <Volume2 aria-hidden className="size-3.5 shrink-0" />
          صداها با موتور VOICEVOX از پیش تولید شده‌اند — {bundle.audio.voiceCredits.join('・')}
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
