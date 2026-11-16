import { describe, expect, it } from 'vitest';
import { KANA_EXERCISES } from '@/modules/curriculum/content/chapter-kana01.exercises';
import { PRACTICE_EXERCISES_KANA } from '@/modules/curriculum/content/chapter-kana01.practice.exercises';
import type { Exercise } from '@/modules/curriculum/types';

/**
 * HANASO-PRODUCTION-REMEDIATION (production incident §2.1) — visual-confusable
 * option guard.
 *
 * Root cause of the live defect (owner screenshot, stn-kana-h13): the meaning
 * question «کدام واژه یعنی «با هم»؟» offered いっしょ (correct) next to
 * いっしよ — a distractor differing only by the SMALL-kana ょ (U+3087) vs the
 * full-size よ (U+3088). At option font size the two are visually
 * near-identical, so a learner who reads the word correctly could still pick
 * the wrong option and be marked incorrect. The same defect class existed in
 * ex-kana-h6-asm-3 (きょう vs きよう) and ex-kana-h6-asm-4 (いしゃ vs いしや).
 *
 * This guard FAILS when a MEANING question (decode/asm — prompt asks which
 * word MEANS something, with no size/sound-discrimination instruction) has two
 * options whose labels collapse to the same string once every small-kana form
 * is folded to its full-size counterpart.
 *
 * Legitimate discrimination items are EXEMPT by prompt contract:
 *  - cloze items whose prompt explicitly says «به اندازهٔ کانا دقت کن»
 *    (the size difference IS the lesson, glyphs render large);
 *  - listening items whose prompt says «فشرده یا جدا؟» or «باز هم گوش کن»
 *    (the AUDIO distinguishes the pair, not eyesight).
 */

/** small kana → full-size counterpart (folding table) */
const SMALL_TO_FULL: Record<string, string> = {
  っ: 'つ',
  ゃ: 'や',
  ゅ: 'ゆ',
  ょ: 'よ',
  ゎ: 'わ',
  ぁ: 'あ',
  ぃ: 'い',
  ぅ: 'う',
  ぇ: 'え',
  ぉ: 'お',
  ァ: 'ア',
  ィ: 'イ',
  ゥ: 'ウ',
  ェ: 'エ',
  ォ: 'オ',
  ッ: 'ツ',
  ャ: 'ヤ',
  ュ: 'ユ',
  ョ: 'ヨ',
};

function foldKana(s: string): string {
  return [...s].map((ch) => SMALL_TO_FULL[ch] ?? ch).join('');
}

/** prompts that TEACH the size/sound distinction — the confusable pair is the point */
function isDiscriminationPrompt(promptFa: string): boolean {
  return (
    promptFa.includes('به اندازهٔ کانا دقت کن') || // cloze: pick the right SIZE glyph
    promptFa.includes('فشرده یا جدا') || // listening: compressed vs separate mora
    promptFa.includes('باز هم گوش کن') || // listening follow-up (same contract)
    promptFa.includes('ب یا پ؟') || // listening phoneme discrimination
    promptFa.includes('گوش کن') // any listening prompt is audio-first
  );
}

describe('PRODUCTION-REMEDIATION guards — visually confusable options (incident §2.1)', () => {
  it('no MEANING question has two options that look the same when small kana are folded to full size', () => {
    const violations: string[] = [];
    for (const ex of [...KANA_EXERCISES, ...Object.values(PRACTICE_EXERCISES_KANA)] as Exercise[]) {
      if (!ex.options || ex.options.length < 2) continue;
      if (isDiscriminationPrompt(ex.promptFa)) continue;
      const folded = new Map<string, string>(); // folded label → option id
      for (const o of ex.options) {
        const key = foldKana(o.label);
        const prev = folded.get(key);
        if (prev !== undefined && prev !== o.id) {
          violations.push(
            `${ex.id}: options «${prev}» and «${o.id}» become identical after folding small kana «${o.label}»`,
          );
        }
        folded.set(key, o.id);
      }
    }
    expect(violations).toEqual([]);
  });

  it('the three production defect exercises now use visually distinct, real-word distractors', () => {
    const byId = new Map(
      ([...KANA_EXERCISES, ...Object.values(PRACTICE_EXERCISES_KANA)] as Exercise[]).map((e) => [e.id, e]),
    );
    const h6a3 = byId.get('ex-kana-h6-asm-3');
    const h6a4 = byId.get('ex-kana-h6-asm-4');
    const h13a4 = byId.get('ex-kana-h13-asm-4');
    expect(h6a3?.options?.map((o) => o.label)).toEqual(['かいしゃ', 'きょう', 'きょ']);
    expect(h6a4?.options?.map((o) => o.label)).toEqual(['しゃしん', 'いしゃ', 'しゃい']);
    expect(h13a4?.options?.map((o) => o.label)).toEqual(['いしょ', 'いっしょ', 'さっき']);
    // and the intended answers are still the original correct words
    const correct = (e?: Exercise) => e?.options?.find((o) => o.id === e.correctOptionId)?.label;
    expect(correct(h6a3)).toBe('きょう');
    expect(correct(h6a4)).toBe('いしゃ');
    expect(correct(h13a4)).toBe('いっしょ');
  });
});
