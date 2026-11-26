'use client';
/**
 * HANASO — RealWorldBoard + WordWall (LESSON-UX P2 #200 — the reading-sheet
 * rebuild of the m-stations).
 *
 * The owner's brief for the reading sheet (برگهٔ خواندن):
 *   «ایستگاه برگه‌خواندن کلاً ضعیف است و اصلاً کاربر نمی‌فهمد چی به چی است.
 *    اصلاً این ایستگاه هدفش فقط این است که بتوانی بخوانی. تازه باید وویس هم
 *    داشته باشند چیزهایی که نوشته‌اند.»
 *
 * The board is now a decode-then-verify loop:
 *  - EVERY written surface carries its OWN committed audio (items, panel
 *    leads, signboard sides — the AUDIO-UNIT per-word contract, never a
 *    dialogue cut; a missing asset hides its control honestly);
 *  - every item is TAPPABLE: the tap reveals the Persian reading (+ the
 *    meaning when the board is bare/decode-mode) — the learner reads first,
 *    verifies second;
 *  - glossed boards (the bilingual tourist menu) keep the meaning visible
 *    from the start and reveal the reading on tap.
 *
 * The WordWall closes the station: every decoded word becomes a card the
 * learner OWNS — shape + Persian reading + meaning + its own audio.
 */
import { useState } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

import { fa } from '@/messages/fa';
import { JaBlock } from '@/components/patterns/ja-block';
import { SmartJaText } from '@/components/patterns/smart-ja-text';
import { ExampleAudioButton } from './example-audio-button';
import type { ClientTeachingBlock } from '@/modules/curriculum/client-transport';
import { useAudioToggle } from '@/modules/audio/toggle-playback';
import { Volume2 } from 'lucide-react';

type AudioUrls = { opus: string; m4a: string } | null;
type AudioByWord = Record<string, AudioUrls>;

export type RealWorldBoardBlock = Extract<ClientTeachingBlock, { kind: 'realworld-board' }>;
export type WordWallBlock = Extract<ClientTeachingBlock, { kind: 'word-wall' }>;

/* ------------------------------------------------------------------ the board */

/** The small round play control of a signboard side (price, セール…) — a
 * compact variant of the word control: same honest-absence contract. */
function SideAudioButton({ urls, label }: { urls: AudioUrls; label: string }) {
  const sound = useAudioToggle(urls, label);
  if (!urls) return null;
  return (
    <button
      type="button"
      onClick={sound.toggle}
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 border-ai bg-card text-ai transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
      aria-label={label}
      data-board-side-audio
      data-audio-mode={sound.mode}
    >
      <Volume2 aria-hidden className="size-4" />
    </button>
  );
}

export function RealWorldBoard({ block, audioByWord }: { block: RealWorldBoardBlock; audioByWord: AudioByWord }) {
  /** Revealed item keys — `p{panel}-i{item}`; the tap is the verify step. */
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <section className="flex flex-col gap-4 rounded-md border-2 border-ai bg-card p-5" data-realworld-board>
      <header className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-caption font-bold text-ai">
          <Sparkles aria-hidden className="size-4" />
          {fa.curriculum.boardCaptionLabel}
        </p>
        <h3 className="text-h3 font-bold text-ink">{block.titleFa}</h3>
        {block.captionFa ? (
          <p className="text-small leading-[var(--leading-fa)] text-ink-soft">{block.captionFa}</p>
        ) : null}
      </header>
      {/* LESSON-UX P2 #200 — the interaction contract, stated up front: read
          first, then tap to verify (bare boards) / listen + tap (glossed). */}
      <p className="text-caption text-ink-faint">
        {block.showGloss ? fa.curriculum.boardGlossAudioHint : fa.curriculum.boardDecodeVerifyHint}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {block.panels.map((panel, pi) => (
          <div key={pi} className="rounded-md border border-ink-faint bg-surface-warm p-4">
            <p className="text-caption font-black text-indigo">{panel.titleFa}</p>
            {panel.leadJa ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-ink-faint pb-2">
                <JaBlock className="text-lead font-bold">{panel.leadJa}</JaBlock>
                <ExampleAudioButton word={panel.leadJa} urls={audioByWord[panel.leadJa] ?? null} />
              </div>
            ) : null}
            <ul className="mt-3 flex flex-col gap-2" data-board-items>
              {panel.items.map((item, ii) => {
                const key = `p${pi}-i${ii}`;
                const open = revealed.has(key);
                return (
                  <li
                    key={key}
                    className="flex flex-col gap-1 border-b border-dashed border-ink-faint pb-2 last:border-none last:pb-0"
                    data-board-item={item.ja}
                    data-board-item-revealed={open ? 'true' : undefined}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* the word itself is the reveal control — decode first,
                          verify second (the reading is never visible before
                          the learner has had the chance to read it). */}
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        aria-expanded={open}
                        className="ja-block cursor-pointer rounded-md px-1 text-body font-bold text-ink transition-colors hover:bg-indigo-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ai"
                        dir="ltr"
                        lang="ja"
                        data-board-word
                      >
                        <SmartJaText text={item.ja} />
                      </button>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {/* glossed boards (the bilingual menu): the word's own
                            sound is hearable from the start — the tourist-menu
                            reality; bare boards keep it inside the reveal. */}
                        {block.showGloss ? (
                          <ExampleAudioButton word={item.ja} urls={audioByWord[item.ja] ?? null} />
                        ) : null}
                        {item.sideJa ? (
                          <>
                            <SideAudioButton
                              urls={audioByWord[item.sideJa] ?? null}
                              label={fa.curriculum.boardSideAudioLabel(item.sideJa)}
                            />
                            {/* real learner-read JP (prices, 〜あります) — the
                                JP font stack, raised above the furigana floor
                                (ENGINE-NEXTGEN W-B class contract). */}
                            <span className="ja-block shrink-0 text-small text-ink-faint" dir="ltr" lang="ja">
                              {item.sideJa}
                            </span>
                          </>
                        ) : null}
                      </span>
                    </div>
                    {open ? (
                      /* the reveal: Persian reading (the ONE standard) — bold;
                         the meaning joins it when the board is bare. */
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-sunken/50 px-2 py-1.5">
                        <p className="text-h3 font-bold text-ink" dir="rtl">
                          {item.readingFa}
                          {!block.showGloss && item.glossFa ? (
                            <span className="ms-2 text-small font-normal text-ink-soft">{item.glossFa}</span>
                          ) : null}
                        </p>
                        <ExampleAudioButton word={item.ja} urls={audioByWord[item.ja] ?? null} />
                      </div>
                    ) : (
                      <p className="text-caption text-ink-faint" dir="rtl">
                        {block.showGloss ? fa.curriculum.boardWordReveal : null}
                      </p>
                    )}
                    {block.showGloss && item.glossFa ? (
                      <p className="text-caption text-ink-soft">{item.glossFa}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ the wall */

export function WordWall({ block, audioByWord }: { block: WordWallBlock; audioByWord: AudioByWord }) {
  return (
    <section className="flex flex-col gap-4 rounded-md border-2 border-shu/50 bg-card p-5" data-word-wall>
      <header className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-caption font-bold text-shu-deep">
          <BookOpen aria-hidden className="size-4" />
          {fa.curriculum.wallChipLabel}
        </p>
        <h3 className="text-h3 font-bold text-ink">{block.titleFa}</h3>
        <p className="text-small leading-[var(--leading-fa)] text-ink-soft">{block.bodyFa}</p>
        {block.hintFa ? <p className="text-caption text-ink-faint">{block.hintFa}</p> : null}
      </header>
      <ul className="grid gap-3 sm:grid-cols-2" data-wall-words>
        {block.words.map((w) => (
          <li
            key={w.ja}
            className="flex flex-col gap-2 rounded-md border border-ink-faint bg-surface-warm p-4"
            data-wall-word={w.ja}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <JaBlock className="text-word-hero font-bold leading-snug text-ink">{w.ja}</JaBlock>
              <ExampleAudioButton word={w.ja} urls={audioByWord[w.ja] ?? null} />
            </div>
            <p className="border-b border-ink-faint/60 pb-1.5 text-h3 font-bold text-ink" dir="rtl">
              {w.readingFa}
            </p>
            <p className="text-body leading-[var(--leading-fa)] text-ink-soft">{w.meaningFa}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
