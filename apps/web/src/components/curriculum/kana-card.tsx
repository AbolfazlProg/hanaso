'use client';
/**
 * HANASO — KanaCard v2 (TASK-LEARNING-08 / WP-2 — owner feedback A + C).
 *
 * The v1 card showed the glyph + romaji + a story and moved on — the owner's
 * verdict: «آموزش کاراکترها بسیار ضعیف است». The v2 card is a REAL teaching
 * moment per DD-121 (sound-first → glyph → mnemonic → romaji) plus the mission
 * §2 cycle made CONTINUOUS, not scattered windows:
 *
 *   Observe/Understand — the writing section auto-plays the stroke order
 *                        (Hanzi Writer guided animation) the moment the card opens.
 *   Trace/Guided/Free  — the SAME inline panel switches to «روی الگو» / «از حافظه»
 *                        with per-stroke feedback (the drawing engine joins the
 *                        main teaching flow — owner feedback C).
 *   Recognition/Apply  — the station's exercise blocks right after the cards +
 *                        the reading moment (example-set) — authored order.
 *
 * Sound-first (DD-121): the character's standard Japanese audio auto-plays once
 * on mount (best-effort — browsers may refuse before any gesture; the replay
 * button is always there). Audio is PRE-GENERATED (VOICEVOX) and resolved
 * server-side; no committed asset → the affordance hides honestly (never a
 * wrong or shared file — mission §5).
 *
 * Honesty: mnemonics stay labelled draft/pending-review (OQ-051) and a shape
 * PATTERN is labelled as such (never a fake «story»).
 */
import { useEffect, useRef, useState } from 'react';
import { Ear, Hand, Volume2 } from 'lucide-react';
import { fa } from '@/messages/fa';
import { KANA_TEACHING_BY_ID } from '@/modules/curriculum/content/kana-teaching';
import type { KanaItem } from '@/modules/curriculum/types';
import { JaBlock } from '@/components/patterns/ja-block';
import { MixedFaJaText } from '@/components/curriculum/mixed-fa-ja-text';
import { LineAudioButton } from '@/components/curriculum/line-audio-button';
import { WritingPractice } from '@/components/writing/writing-practice';

export interface KanaCardProps {
  kana: KanaItem;
  /** Romaji fading policy (unit-level block data). */
  showRomaji: boolean;
  /** Optional confusable note authored on the block (kept for back-compat). */
  confusableNoteFa?: string;
  /** Server-resolved audio pair for THIS glyph (null = no committed asset). */
  audioUrls: { opus: string; m4a: string } | null;
  /** Writing-practice record callback (structured summary only — DD-111). */
  onWritingAttempt?: (summary: {
    character: string;
    mode: 'guided' | 'trace' | 'free';
    verdict: string;
    strokesTotal: number;
    strokesFirstTry: number;
    totalMistakes: number;
    hintsShown: number;
    completed: boolean;
    durationMs: number;
  }) => void;
}

export function KanaCard({ kana, showRomaji, confusableNoteFa, audioUrls, onWritingAttempt }: KanaCardProps) {
  const teaching = KANA_TEACHING_BY_ID[kana.kanaId];
  const [writingOpen, setWritingOpen] = useState(true);
  const autoPlayedRef = useRef(false);

  // sound-first: attempt ONE auto-play on mount (browsers may refuse without a
  // gesture — the replay button stays the honest manual path).
  useEffect(() => {
    if (autoPlayedRef.current || !audioUrls) return;
    autoPlayedRef.current = true;
    const el = new Audio(audioUrls.opus);
    el.playbackRate = 0.8; // DD-121: first exposure at 0.8×
    el.addEventListener('error', () => {
      // dual-format fallback (ADR-009) — Safari without Opus
      el.src = audioUrls.m4a;
      void el.play().catch(() => undefined);
    });
    void el.play().catch(() => undefined);
    return () => {
      el.pause();
    };
  }, [audioUrls]);

  const mn = teaching?.mnemonic;
  const pairItems = (mn?.pairGlyphs ?? []).map((g) => ({
    glyph: g,
    item: g === kana.glyph ? kana : undefined,
  }));

  return (
    <section className="flex flex-col gap-4 rounded-md border border-ink-faint bg-card p-5" aria-label={kana.romaji}>
      {/* ---- sound-first + glyph + romaji (DD-121) ---- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <JaBlock className="font-jp text-[clamp(3.5rem,12vw,6rem)] font-bold leading-none text-ink">
            {kana.glyph}
          </JaBlock>
          {audioUrls && (
            <div className="flex flex-col items-center gap-1 pt-2">
              <LineAudioButton
                lineId={`kana-${kana.kanaId}`}
                audioUrl={audioUrls.opus}
                audioUrlFallback={audioUrls.m4a}
                audioAvailable
                label={fa.curriculum.kanaSoundLabel(kana.glyph)}
                rate={0.8}
              />
              <span className="text-micro text-ink-faint">{fa.curriculum.kanaSoundReplay}</span>
            </div>
          )}
        </div>
        <div className="min-w-[9rem] flex-1 space-y-2 text-left" dir="rtl">
          {showRomaji ? (
            <p className="font-mono text-h3 font-bold text-indigo" dir="ltr">
              {kana.romaji}
            </p>
          ) : (
            <p className="text-small text-ink-faint">{fa.curriculum.kanaRomajiHidden}</p>
          )}
          {teaching ? (
            <p className="text-body font-bold text-ink">
              <Volume2 aria-hidden className="me-1 inline size-4 text-ai" />
              {teaching.pronunciationFa}
            </p>
          ) : null}
          {teaching?.pronunciationNoteFa ? (
            <p className="text-small leading-[var(--leading-fa)] text-ink-soft">{teaching.pronunciationNoteFa}</p>
          ) : null}
          {kana.hostWord ? (
            <p className="text-small text-ink">
              <span className="text-ink-faint">{fa.curriculum.kanaHostWordPrefix}: </span>
              <JaBlock className="font-jp font-bold">{kana.hostWord.word}</JaBlock>
              <span className="mx-1 text-ink-faint">—</span>
              {kana.hostWord.meaningFa}
            </p>
          ) : null}
        </div>
      </div>

      {/* ---- mnemonic (honest label; pattern vs story) ---- */}
      {mn && (
        <div className="rounded-md bg-surface-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-small font-bold text-ink">{mn.coreImageFa}</span>
            <span className="rounded-full bg-ink-faint/30 px-2 py-0.5 text-micro text-ink-faint">
              {mn.honestLabelFa}
            </span>
            <span className="rounded-full border border-amber-600/50 px-2 py-0.5 text-micro text-amber-700">
              {fa.curriculum.kanaMnemonicDraft}
            </span>
          </div>
          <p className="mt-2 text-body leading-[var(--leading-fa)] text-ink">
            <MixedFaJaText text={mn.storyFa} />
          </p>
        </div>
      )}

      {/* ---- confusable pair: see them SIDE BY SIDE + the concrete cue ---- */}
      {mn?.pairGlyphs && mn.pairGlyphs.length > 0 && (
        <div className="rounded-md border border-shu/40 bg-surface-warm p-4">
          <p className="text-small font-bold text-ink">{fa.curriculum.kanaPairCompareTitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <span className="flex flex-col items-center gap-1">
              <JaBlock className="grid size-14 place-items-center rounded-md border-2 border-ai bg-card font-jp text-h2 font-bold text-ink">
                {kana.glyph}
              </JaBlock>
              <span className="font-mono text-caption text-ai" dir="ltr">
                {kana.romaji}
              </span>
            </span>
            {pairItems.map(({ glyph }) => (
              <span key={glyph} className="flex flex-col items-center gap-1">
                <JaBlock className="grid size-14 place-items-center rounded-md border-2 border-ink-faint bg-card font-jp text-h2 font-bold text-ink-soft">
                  {glyph}
                </JaBlock>
                <span className="text-caption text-ink-faint">{fa.curriculum.kanaPairOther}</span>
              </span>
            ))}
          </div>
          {mn.pairHintFa ? (
            <p className="mt-3 text-small leading-[var(--leading-fa)] text-ink">
              <MixedFaJaText text={mn.pairHintFa} />
            </p>
          ) : null}
        </div>
      )}
      {!mn?.pairGlyphs && confusableNoteFa ? <p className="text-small text-ink-faint">{confusableNoteFa}</p> : null}

      {/* ---- writing: Observe → Trace → Free recall, INSIDE the teaching card ---- */}
      <div className="rounded-md border border-ai/40 bg-indigo-wash/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-small font-bold text-ink">
            <Hand aria-hidden className="size-4 text-ai" />
            {fa.curriculum.kanaWritingTitle(kana.glyph)}
          </p>
          <button
            type="button"
            onClick={() => setWritingOpen((o) => !o)}
            aria-expanded={writingOpen}
            className="min-h-9 rounded-md border border-ai px-3 text-caption font-bold text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
          >
            {writingOpen ? fa.curriculum.kanaWritingHide : fa.curriculum.kanaWritingShow}
          </button>
        </div>
        {teaching?.strokeHintFa ? (
          <p className="mt-1 text-small text-ink-soft">
            <MixedFaJaText text={teaching.strokeHintFa} />
          </p>
        ) : null}
        {writingOpen ? (
          <div className="mt-3">
            <WritingPractice character={kana.glyph} variant="card" initialMode="guided" onAttempt={onWritingAttempt} />
          </div>
        ) : (
          <p className="mt-2 text-caption text-ink-faint">{fa.curriculum.kanaWritingCollapsedNote}</p>
        )}
      </div>

      {!audioUrls && (
        <p className="flex items-center gap-1 text-caption text-ink-faint">
          <Ear aria-hidden className="size-3" />
          {fa.curriculum.kanaAudioPending}
        </p>
      )}
    </section>
  );
}
