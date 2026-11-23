'use client';
/**
 * HANASO — KanjiCard (AUDIO-UNIT/KANJI 2026-11-23 §۲ — the dedicated kanji
 * teaching card, K1+K2 of the kanji-interaction-blueprint).
 *
 * The REAL rendering of the kanji-card block of a kanji station — the shape and
 * meaning (big glyph + Persian meaning + stroke count), the ANCHOR WORDS this
 * kanji rides inside (term with furigana + reading + meaning + the word's OWN
 * standalone audio — the AUDIO-UNIT DD-119 asset, never the dialogue line), and
 * the authored Persian teaching note (shape story, components, discrimination
 * against similar kanji).
 *
 * D-0006 (readings ride inside anchor words): the card NEVER renders the on/kun
 * reference lists — the reading is visible where it lives, inside each anchor
 * word's furigana, and audible in each anchor's own pronunciation. The raw
 * on/kun data stays in the N5 reference (lookup layer) — displayed nowhere at
 * this level (the framework rule: «On/Kun خام = فقط دادهٔ مرجع»).
 */
import { BookOpenText, Layers } from 'lucide-react';
import { JaBlock } from '@/components/patterns/ja-block';
import { SmartJaText, SmartMixedFaJaText } from '@/components/patterns/smart-ja-text';
import { FuriganaText } from '@/components/patterns/furigana-text';
import { LineAudioButton } from '@/components/curriculum/line-audio-button';
import { fa } from '@/messages/fa';

/* TL-13 (A-7): Persian digits (SKL-003 §۴) — the same Intl helper the walk UI uses. */
const faNum = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

export interface KanjiCardAnchorWord {
  wordId: string;
  term: string;
  termFurigana?: string;
  readingKana: string;
  meaningFa: string;
  /** The word's OWN standalone audio (AUDIO-UNIT DD-119) — null = honest absence. */
  audio: { opus: string; m4a: string } | null;
}

export interface KanjiCardData {
  kanjiId: string;
  literal: string;
  meaningFa: string;
  strokeCount: number;
  anchors: KanjiCardAnchorWord[];
}

export function KanjiCard({ kanji, noteFa }: { kanji: KanjiCardData; noteFa?: string }) {
  return (
    <section className="rounded-md border border-ink-faint bg-card p-5" data-kanji-card={kanji.kanjiId}>
      {/* K1 — shape & meaning: the glyph IS the subject (word-hero role, LTR
          island), the Persian meaning leads (meaning-first — the beginner
          reads Persian before Japanese). */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-h2 font-black leading-tight text-ink">{kanji.meaningFa}</p>
          {/* SMART-RUBY §۲ — the kanji itself is tap-to-inspect: readings the
              learner has met, the meaning, the stroke count, and the learner's
              own taught state (never a guess — the per-learner view). */}
          <SmartJaText
            lang="ja"
            className="mt-1 block text-[length:var(--text-word-hero)] font-bold leading-[1.15] text-ink"
            tokens={[{ surface: kanji.literal }]}
          />
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-ink-faint bg-surface-warm px-3 py-1.5 text-caption font-bold text-ink">
          <Layers aria-hidden className="size-3.5" />
          {faNum(kanji.strokeCount)} ضربه
        </span>
      </div>

      {/* K3/K4 — the anchor words this kanji rides inside (D-0006: the
          reading lives HERE, in the word — with the word's own standalone
          audio, never the dialogue line). */}
      <div className="mt-4 rounded-md bg-surface-warm p-4">
        <p className="text-caption text-ink-soft">واژه‌هایی که یاد گرفتی و این کانجی درشان نشسته:</p>
        <ul className="mt-3 flex flex-col gap-2">
          {kanji.anchors.map((w) => (
            <li key={w.wordId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="min-w-0">
                {/* SMART-RUBY §۲ — the anchor words ride the learner-aware law:
                    the reading shows until the kanji+reading are TAUGHT to this
                    learner (completed stations only — presence here is not
                    teaching), then hides and becomes tap-to-inspect. */}
                <JaBlock className="text-body font-bold">
                  <SmartJaText tokens={[{ surface: w.term, reading: w.readingKana }]} />
                </JaBlock>
                <span className="text-caption text-ink-soft"> — {w.meaningFa}</span>
              </div>
              {w.audio ? (
                <LineAudioButton
                  lineId={w.wordId}
                  audioUrl={w.audio.opus}
                  audioUrlFallback={w.audio.m4a}
                  audioAvailable
                  label={fa.curriculum.wordAudioPlay}
                />
              ) : (
                /* AUDIO-UNIT: honest absence — never a line-audio substitute. */
                <span className="text-caption text-ink-soft">{fa.curriculum.wordAudioPending}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* K2 — the authored teaching note: shape story, components, visual
          discrimination against the confusables (the framework's
          component-feedback rule). */}
      {noteFa && (
        <p className="mt-4 flex items-start gap-2 text-small leading-[var(--leading-fa)] text-ink-soft">
          <BookOpenText aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            <b>{fa.curriculum.kanjiCardNote}: </b>
            <SmartMixedFaJaText text={noteFa} />
          </span>
        </p>
      )}
    </section>
  );
}
