/**
 * HANASO — WordPronunciation (ENGINE-NEXTGEN W-D).
 *
 * The ONE shared surface for a word's DUAL pronunciation: the kana reading +
 * the standard romaji (LTR, Japanese context) and the Persian transliteration
 * guide (RTL) — both derived by the locked word-level standard
 * (content/translit-standard.ts, the same mora walk), carried by the central
 * knowledge registry, and rendered through THIS component.
 *
 * Contract (mission W-D): no surface may inline its own
 * `{readingKana} · {romaji}` habit or hand-author a transliteration — the
 * per-word drift class the audit found. If `translitFa` is absent (an
 * uncovered glyph), the guide is honestly omitted, never guessed.
 */
import { fa } from '@/messages/fa';

export interface WordPronunciationProps {
  /** The kana reading (kanji terms carry it under the furigana). */
  readingKana: string;
  /** The standard romaji (double-vowel style). */
  romaji: string;
  /** The derived Persian transliteration — absent = uncovered (honest omit). */
  translitFa?: string;
  className?: string;
}

export function WordPronunciation({ readingKana, romaji, translitFa, className }: WordPronunciationProps) {
  return (
    <div className={className}>
      {/* JOURNEY-FIX 2026-11-23 §۶: the dual pronunciation grew to text-body —
       * next to a word-hero term the 14px caption read as fine print; the
       * romaji/kana pairing is core reading data for a beginner, not metadata. */}
      <p className="text-body text-ink-soft" dir="ltr" lang="ja">
        {readingKana} · {romaji}
      </p>
      {translitFa ? (
        <p className="mt-0.5 text-body text-ink-soft">
          <span className="text-ink-faint">{fa.curriculum.wordTranslitLabel}: </span>
          <span className="font-bold" dir="rtl">
            {translitFa}
          </span>
        </p>
      ) : null}
    </div>
  );
}
