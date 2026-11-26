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
 *     next section of the SAME lesson via the WALK's own «ادامه» button
 *     (LESSON-UX PART1 2026-11-26 — the player's redundant «پایان مشاهده»
 *     CTA is gone; one forward action, no double CTA);
 *   - implemented ONCE in this shared component + StationRunner's dialogue-player
 *     block rendering, so the first lesson of every FUTURE chapter inherits the
 *     behavior from its authored [scene, dialogue-player] anchor blocks — no
 *     per-chapter code.
 *
 * Subtitle contract (JOURNEY-FIX 2026-11-23 §۴ — supersedes the 2026-11-21
 * order for the FIRST listen): the anchor's first full-conversation playback
 * is PURE LISTENING — the Persian subtitle starts OFF and PINNED off (the
 * «شکاف دانستن» knowledge-gap experience; the mid-playback toggle stays
 * available). TEACHING replays (the revisit blocks) keep the subtitle ON by
 * default, and the comprehension-check stage after the dialogue keeps its
 * no-transcript, gradual-hint exercise flow — unchanged.
 *
 * Prediction grading stays the honest server round-trip (SKL-013): the block
 * arrives pre-stripped (no correctOptionId / revealFa) and grades through
 * /api/curriculum/station `grade-block` — exactly like the old dialogue page.
 */
import { useState } from 'react';
import { MessageCircleQuestion, PlayCircle } from 'lucide-react';
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
  /**
   * The full dialogue bundle (serializable RSC transport — server resolved).
   */
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
   * JOURNEY-FIX 2026-11-23 §۶: the chapter's standard item-label map
   * (words/expressions/grammar) — resolves the transcript's «teaches» chips
   * to learner-facing labels; the raw registry ids never render.
   */
  itemLabels?: Record<string, string>;
  /**
   * JOURNEY-FIX 2026-11-23 §۴ (subtitle policy — «شکاف دانستن» first listen):
   * TRUE on the chapter's FIRST full-conversation encounter (the anchor
   * station): the Persian subtitle starts OFF and PINNED off (pure listening —
   * the knowledge-gap experience; the mid-playback toggle stays available).
   * FALSE on every TEACHING replay (the revisit blocks): subtitle ON by
   * default, exactly as the 2026-11-21 teaching order. The comprehension-check
   * stage keeps its own no-transcript flow unchanged.
   * Data-driven at the runner from the STATION TYPE — never a chapter hardcode.
   */
  firstListen?: boolean;
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
  firstListen = false,
  itemLabels,
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
          {/* JOURNEY-FIX 2026-11-23 §۱: scene title/body render through the shared
              mixed-direction renderer (a scene title may embed a Japanese run). */}
          <p className="text-small font-bold text-ink">
            <MixedFaJaText text={scene.titleFa} />
          </p>
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
          hidden; the WALK's own «ادامه» advances the lesson (LESSON-UX PART1:
          no in-player finish CTA — one forward action).
          JOURNEY-FIX 2026-11-23 §۴: firstListen (the anchor's first full
          encounter) pins the Persian subtitle OFF — pure listening, the toggle
          remains mid-playback; teaching replays keep the ON default. */}
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
        subtitleDefaultOn={!firstListen}
        subtitlePinned={firstListen}
        itemLabels={itemLabels}
      />
    </section>
  );
}
