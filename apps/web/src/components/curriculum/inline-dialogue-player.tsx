'use client';
/**
 * HANASO — InlineDialoguePlayer (owner order 2026-11-21 «مکالمه درون درس») — the
 * SHARED LESSON CONTRACT for the anchor dialogue section.
 *
 * The lesson walk renders the anchor dialogue INLINE — as the first real
 * section of the chapter's first lesson — instead of a link to a separate
 * dialogue page:
 *   - the dialogue experience (scene intro → prediction → the proven
 *     multi-speaker player) is visible IMMEDIATELY in the lesson page; there
 *     is NO button or intermediate step that «opens» the conversation;
 *   - the learner watches/plays the dialogue in place, then continues to the
 *     next section of the SAME lesson via the in-player CTA (or the walk's own
 *     forward action) — the dialogue never feels like a separate feature;
 *   - implemented ONCE in this shared component + StationRunner's dialogue-player
 *     block rendering, so the first lesson of every FUTURE chapter inherits the
 *     behavior from its authored [scene, dialogue-player] anchor blocks — no
 *     per-chapter code.
 *
 * Subtitle contract (same owner order): the TEACHING stage starts with the
 * Persian subtitle ON regardless of the learner's stored settings (the
 * comprehension-check stage after the dialogue keeps its no-transcript,
 * gradual-hint exercise flow — unchanged).
 *
 * Prediction grading stays the honest server round-trip (SKL-013): the block
 * arrives pre-stripped (no correctOptionId / revealFa) and grades through
 * /api/curriculum/station `grade-block` — exactly like the old dialogue page.
 */
import { useState } from 'react';
import { MessageCircleQuestion, PlayCircle, Volume2 } from 'lucide-react';
import { fa } from '@/messages/fa';
import { MixedFaJaText } from '@/components/curriculum/mixed-fa-ja-text';
import type { CharacterRef, Dialogue } from '@/modules/dialogue';
import type { ClientTeachingBlock } from '@/modules/curriculum/client-transport';
import { DialogueScene } from '@/app/poc/dialogue/dialogue-scene';

/** The stripped dialogue-player block (answer key lives server-side — SKL-013). */
type DialoguePlayerBlock = Extract<ClientTeachingBlock, { kind: 'dialogue-player' }>;

export interface InlineDialoguePlayerProps {
  chapterSlug: string;
  stationSlug: string;
  /** The scene-setting text of the grouped leading `scene` block (optional). */
  scene?: { titleFa: string; bodyFa: string } | null;
  /** The stripped dialogue-player block (prediction without answers). */
  block: DialoguePlayerBlock;
  /** The full dialogue bundle (serializable RSC transport — server resolved). */
  bundle: {
    dialogueSlug: string;
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
  /**
   * The lesson's own advance: called by the in-player CTA after the viewing.
   */
  onFinished: () => void;
  /**
   * The line the player starts positioned at (a REVISIT block starts at its
   * first focus line; the chapter-opening dialogue starts from the top — null).
   * Never auto-plays: the learner's own «پخش» press is the user-gesture chain.
   */
  startAtLine?: string | null;
}

export function InlineDialoguePlayer({
  chapterSlug,
  stationSlug,
  scene,
  block,
  bundle,
  onFinished,
  startAtLine = null,
}: InlineDialoguePlayerProps) {
  const prediction = block.prediction;
  const [picked, setPicked] = useState<string | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [revealFa, setRevealFa] = useState<string | null>(null);

  /** Server-side grading (SKL-013) — the key never ships with the page. */
  const pick = async (optionId: string) => {
    if (picked !== null) return;
    setPicked(optionId);
    try {
      const res = await fetch('/api/curriculum/station', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'grade-block',
          chapterSlug,
          stationSlug,
          blockId: block.id,
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

  /*
   * The revisit block starts POSITIONED at its first focus line (never
   * auto-playing — the learner's own «پخش» press keeps the user-gesture audio
   * chain). The chapter-opening dialogue (startAtLine=null) plays from the top.
   */
  const startLineId =
    startAtLine != null && bundle.dialogue.lines.some((l) => l.id === startAtLine) ? startAtLine : null;

  return (
    <section className="flex flex-col gap-4" aria-label={fa.curriculum.dialogueSectionTitle}>
      {/* the scene intro of the grouped leading scene block — compact, part of
          the SAME section (context preparation, not an intermediate step) */}
      {scene && (
        <div className="rounded-md border border-ink-faint bg-surface-warm px-4 py-3">
          <p className="text-small font-bold text-ink">{scene.titleFa}</p>
          <p className="mt-1 text-small leading-[var(--leading-fa)] text-ink-soft">
            <MixedFaJaText text={scene.bodyFa} />
          </p>
        </div>
      )}

      {/* section heading — the dialogue IS the lesson's first real section */}
      <h3 className="flex items-center gap-2 text-h3 font-bold text-ai">
        <PlayCircle aria-hidden className="size-5" />
        {fa.curriculum.dialogueSectionTitle}
      </h3>
      <p className="-mt-2 text-caption leading-[var(--leading-fa)] text-ink-soft">{fa.curriculum.dialogueInlineNote}</p>

      {prediction && (
        <div className="rounded-md border-2 border-ai bg-indigo-wash/40 p-4">
          <p className="flex items-center gap-2 text-small font-bold">
            <MessageCircleQuestion aria-hidden className="size-4 shrink-0" />
            {prediction.questionFa}
          </p>
          <div role="radiogroup" className="mt-2 flex flex-col gap-2">
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
                    'min-h-11 rounded-md border px-4 py-2.5 text-start text-small transition-colors',
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
            <p role="status" aria-live="polite" className="mt-2 rounded-md bg-card p-3 text-small">
              {revealFa}
            </p>
          )}
        </div>
      )}

      {/* the proven multi-speaker player, INLINE in the lesson walk:
          TASK-LEARNING-07 / Issue #101 `embedded` — every PoC navigation surface
          hidden; the WALK owns completion (onFinished → the next section).
          Owner order 2026-11-21: the teaching stage's subtitle starts ON
          (subtitleDefaultOn) regardless of the stored settings. */}
      <DialogueScene
        bundle={{
          dialogue: bundle.dialogue,
          characters: bundle.characters,
          audio: bundle.audio,
        }}
        dialogueSlug={bundle.dialogueSlug}
        initialLineId={startLineId}
        autoStart={false}
        embedded
        subtitleDefaultOn
        onFinish={onFinished}
      />

      {/* real-TTS provenance + VOICEVOX character credit (terms) */}
      {bundle.audio.audioSource === 'voicevox' && bundle.audio.voiceCredits?.length ? (
        <p className="flex items-center gap-1.5 text-caption text-ink-soft">
          <Volume2 aria-hidden className="size-3.5 shrink-0" />
          صداها با موتور VOICEVOX از پیش تولید شده‌اند — <MixedFaJaText text={bundle.audio.voiceCredits.join('・')} />
        </p>
      ) : null}
    </section>
  );
}
