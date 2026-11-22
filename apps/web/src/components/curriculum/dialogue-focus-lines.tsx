'use client';
/**
 * HANASO — DialogueFocusLines (ENGINE-REFORM 2026-11-22 §۳ — owner order
 * «نمایش بخش منتخب مکالمه»).
 *
 * The TEACHING view of a dialogue-player block with `lineTeaching: true`:
 * ONLY the block's specific focus lines render — each as a complete,
 * self-contained teaching card:
 *   - the SPEAKER's preserved identity: name (Fa + Ja), speaker color, and the
 *     character's image (the same SvgPlaceholderRenderer face the full player
 *     uses — ADR-018 §۲-۴, never a new asset);
 *   - the line's Japanese (its own tokens);
 *   - the line's romaji (reading);
 *   - the line's Persian translation;
 *   - the line's own audio control (the same LineAudioButton contract);
 *   - the teaching items the line carries (dialogue YAML `teaches` — surfaced
 *     as the «چه چیزی این خط به تو می‌آموزد» chips: the words/expressions this
 *     very line is the home of).
 *
 * The OTHER dialogue lines are NOT rendered — the component receives ONLY the
 * resolver's extracted lines (modules/curriculum/dialogue-focus), so a full
 * conversation can never leak back in. Shared for every chapter: any future
 * chapter authors [dialogue-player, lineTeaching: true, focusLineRefs: subset]
 * and gets this view from the standard structure — no per-lesson code.
 */
import { useEffect, useRef } from 'react';
import { MessagesSquare, Quote } from 'lucide-react';
import { fa } from '@/messages/fa';
import { JaBlock } from '@/components/patterns/ja-block';
import { LineAudioButton } from '@/components/curriculum/line-audio-button';
import { SvgPlaceholderRenderer, listCharacters } from '@/modules/character';
import type { CharacterAssetManifest } from '@/modules/character';
import type { DialogueFocusLineView } from '@/modules/curriculum/dialogue-focus';

export interface DialogueFocusLinesProps {
  /** The resolver's extracted lines (ONLY these render — see dialogue-focus.ts). */
  lines: DialogueFocusLineView[];
  /** Per-line audio URL maps (the station page's existing transport). */
  audioByLine: Record<string, string>;
  audioFallbackByLine?: Record<string, string>;
  audioAvailable: boolean;
  /** Chapter word/expression labels for the `teaches` chips (id → Persian label). */
  itemLabels?: Record<string, string>;
  /** Token surfaces to emphasize inside the line (optional teaching focus). */
  highlightSurfaces?: string[];
}

/** The character's placeholder face (the SAME renderer the dialogue player uses). */
function SpeakerFace({ speakerId, colorToken, name }: { speakerId: string; colorToken: string; name: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const manifest: CharacterAssetManifest | undefined = listCharacters().find((m) => m.id === speakerId);
    if (!manifest) return;
    const renderer = new SvgPlaceholderRenderer();
    let disposed = false;
    void renderer.mount(el, manifest).then(() => {
      if (disposed) renderer.destroy();
    });
    return () => {
      disposed = true;
      renderer.destroy();
    };
  }, [speakerId]);
  return (
    <figure
      className="flex w-20 shrink-0 flex-col items-center gap-1 rounded-md p-1"
      style={{ boxShadow: `inset 0 0 0 2px var(--color-${colorToken})` }}
      aria-label={name}
    >
      <div ref={ref} className="w-16" aria-hidden="true" />
    </figure>
  );
}

/** One focused dialogue line — the complete teaching card. */
function FocusLineCard({
  line,
  audioByLine,
  audioFallbackByLine,
  audioAvailable,
  itemLabels,
  highlightSurfaces,
  index,
}: DialogueFocusLinesProps & { line: DialogueFocusLineView; index: number }) {
  const speakerLabel = `${line.speaker.nameFa} (${line.speaker.nameJa})`;
  return (
    <article
      className="flex flex-col gap-3 rounded-md border border-ink-faint bg-card p-4"
      data-dialogue-focus-line={line.id}
    >
      {/* the speaker's preserved identity: image + name in the speaker color */}
      <header className="flex items-center gap-3">
        <SpeakerFace speakerId={line.speaker.id} colorToken={line.speaker.colorToken} name={speakerLabel} />
        <div className="flex min-w-0 flex-col">
          <p className="text-small font-bold" style={{ color: `var(--color-${line.speaker.colorToken})` }}>
            {line.speaker.nameFa}{' '}
            <span lang="ja" dir="ltr" className="text-small">
              {/* ENGINE-NEXTGEN W-B: katakana speaker name — raised from the
                 12px caption floor; a NAME the learner is learning to read. */}
              ({line.speaker.nameJa})
            </span>
          </p>
          {line.coSpeaker ? (
            <p className="text-caption text-ink-soft">
              + {line.coSpeaker.nameFa}{' '}
              <span lang="ja" dir="ltr">
                ({line.coSpeaker.nameJa})
              </span>
            </p>
          ) : (
            <p className="text-caption text-ink-faint">
              {fa.curriculum.dialogueFocusTurn} {index + 1}
            </p>
          )}
        </div>
      </header>

      {/* the line itself — ONLY this line's Japanese, with its own audio */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-warm p-3">
        <JaBlock className="text-lead font-bold leading-snug text-ink">
          {line.tokens.map((t, i) => {
            const hl = highlightSurfaces?.some((h) => h.length > 0 && t.surface.endsWith(h));
            return (
              <span key={i} className={hl ? 'rounded-sm bg-indigo-wash px-0.5 font-bold text-shu' : undefined}>
                {t.surface}
              </span>
            );
          })}
        </JaBlock>
        <LineAudioButton
          lineId={line.id}
          audioUrl={audioByLine[line.id] ?? ''}
          audioUrlFallback={audioFallbackByLine?.[line.id]}
          audioAvailable={audioAvailable}
        />
      </div>

      {/* reading (romaji) — the sound text of exactly this line */}
      <p className="text-small text-ink-soft" dir="ltr" lang="ja">
        {line.reading}
      </p>

      {/* the translation of exactly this line */}
      <p className="text-body leading-[var(--leading-fa)] text-ink">{line.fa}</p>

      {/* what THIS line teaches (its dialogue-YAML `teaches` items) */}
      {line.teaches.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-caption text-ink-faint">
          <Quote aria-hidden className="size-3.5 shrink-0" />
          {fa.curriculum.dialogueFocusTeaches}:
          {line.teaches.map((id) => (
            <span key={id} dir="auto" className="rounded-full border border-ink-faint px-2 py-0.5">
              {itemLabels?.[id] ?? id}
            </span>
          ))}
        </p>
      )}
    </article>
  );
}

export function DialogueFocusLines(props: DialogueFocusLinesProps) {
  return (
    <section
      className="flex flex-col gap-4 rounded-md border-2 border-ai bg-card p-5"
      aria-label={fa.curriculum.dialogueFocusSectionTitle}
      data-dialogue-focus-view
    >
      <header className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-caption font-bold text-ai">
          <MessagesSquare aria-hidden className="size-4" />
          {fa.curriculum.dialogueFocusSectionTitle}
        </p>
        <p className="text-small leading-[var(--leading-fa)] text-ink-soft">{fa.curriculum.dialogueFocusSectionNote}</p>
      </header>
      <div className="flex flex-col gap-4">
        {props.lines.map((line, i) => (
          <FocusLineCard key={line.id} {...props} line={line} index={i} />
        ))}
      </div>
    </section>
  );
}
