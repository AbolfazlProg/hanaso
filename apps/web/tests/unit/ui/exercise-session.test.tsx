/**
 * HANASO — ExerciseSession markup tests (TASK-LEARNING-07 Wave 3 — Issue #106).
 *
 * Static-markup assertions (react-dom/server — same pattern as dialogue-scene):
 * - F2 elimination: the select row (OptionRow) greys eliminated options —
 *   aria-disabled + native disabled + line-through + the Persian note — while
 *   surviving options stay interactive (the client never re-sends eliminated ids).
 * - F4 return-to-teaching: the «بازگشت به آموزش» button renders the fa.ts label
 *   with a 44px target and an aria-hidden lucide icon (no glyph emoji).
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ExerciseSession, OptionRow, ReturnToTeachingButton } from '@/components/curriculum/exercise-session';
import type { ClientExercise } from '@/modules/curriculum/grading';

const ex: ClientExercise = {
  id: 'ex-wave3-1',
  type: 'meaning-select',
  targetSkill: 'vocab',
  promptFa: 'معنی واژهٔ こんにちは چیست؟',
  options: [
    { id: 'opt-a', label: 'سلام' },
    { id: 'opt-b', label: 'خداحافظ' },
    { id: 'opt-c', label: 'ممنون' },
  ],
};

const count = (markup: string, needle: string): number => markup.split(needle).length - 1;

describe('ExerciseSession — initial render', () => {
  it('renders every option as a radio with none eliminated or disabled', () => {
    const m = renderToStaticMarkup(
      <ExerciseSession
        chapterSlug="kana-foundation-01"
        stationSlug="stn-x"
        exercises={[ex]}
        audioByLine={{}}
        audioAvailable={false}
      />,
    );
    const radios = m.split('<button').filter((s) => s.includes('role="radio"'));
    expect(radios).toHaveLength(3);
    // no radio is off before any grading round-trip (the disabled «بررسی پاسخ»
    // action button is NOT a radio — scope the assertion to the option row)
    expect(radios.filter((s) => s.includes('disabled'))).toEqual([]);
    expect(m).not.toContain('aria-disabled');
    // no elimination note before any grading round-trip
    expect(m).not.toContain('یک گزینهٔ نادرست حذف شد');
  });

  it('never leaks the F4 button before the ladder is exhausted', () => {
    const m = renderToStaticMarkup(
      <ExerciseSession
        chapterSlug="kana-foundation-01"
        stationSlug="stn-x"
        exercises={[ex]}
        audioByLine={{}}
        audioAvailable={false}
        onReturnToBlock={() => {}}
      />,
    );
    expect(m).not.toContain('بازگشت به آموزش');
  });
});

describe('OptionRow — F2 elimination rendering (Issue #106)', () => {
  it('an eliminated option is visually AND logically off, with the Persian note', () => {
    const m = renderToStaticMarkup(
      <OptionRow options={ex.options!} selected={null} eliminated={['opt-b']} locked={false} onSelect={() => {}} />,
    );
    expect(m).toContain('aria-disabled="true"'); // explicit state for AT
    expect(count(m, 'disabled=""')).toBe(1); // native — not clickable
    expect(m).toContain('line-through'); // greyed visual weight
    expect(m).toContain('یک گزینهٔ نادرست حذف شد'); // the honest note
    expect(m).toContain('bg-surface-sunken'); // Aizen token for dead options
  });

  it('surviving options stay fully interactive', () => {
    const m = renderToStaticMarkup(
      <OptionRow options={ex.options!} selected={null} eliminated={['opt-b']} locked={false} onSelect={() => {}} />,
    );
    expect(count(m, 'role="radio"')).toBe(3);
    expect(count(m, 'disabled=""')).toBe(1); // exactly the eliminated one
    expect(m).toContain('>سلام<'); // a surviving option renders its label
  });

  it('accumulated eliminations all render (2nd + 3rd attempt union)', () => {
    const m = renderToStaticMarkup(
      <OptionRow
        options={ex.options!}
        selected={null}
        eliminated={['opt-b', 'opt-c']}
        locked={false}
        onSelect={() => {}}
      />,
    );
    expect(count(m, 'aria-disabled="true"')).toBe(2);
    expect(count(m, 'disabled=""')).toBe(2);
  });

  it('a locked row (correct answer) disables everything WITHOUT elimination styling', () => {
    const m = renderToStaticMarkup(
      <OptionRow options={ex.options!} selected={'opt-a'} eliminated={[]} locked onSelect={() => {}} />,
    );
    expect(count(m, 'disabled=""')).toBe(3);
    expect(m).not.toContain('aria-disabled'); // lock ≠ elimination semantics
    expect(m).not.toContain('line-through');
    expect(m).not.toContain('یک گزینهٔ نادرست حذف شد');
  });
});

describe('ReturnToTeachingButton — F4 (Issue #106)', () => {
  it('renders the fa.ts label with a 44px target and an aria-hidden icon', () => {
    const m = renderToStaticMarkup(<ReturnToTeachingButton blockId="blk-teach-rule" onReturn={() => {}} />);
    expect(m).toContain('بازگشت به آموزش');
    expect(m).toContain('h-11'); // 44px touch target
    expect(m).toContain('type="button"');
    expect(m).toContain('aria-hidden="true"'); // lucide icon, not in the accessible name
    // no glyph emoji — the repo-wide product-UI rule
    expect(m).not.toMatch(/[⏸⏮⏭↺▶✓✗✨]/);
  });
});

describe('OptionRow — KANJI-TYPO 2026-11-24: ONE glyph scale for kana AND kanji options', () => {
  /* The owner's live audit of the kanji-station exit quiz
   * («گوش بده — این واژه با کدام کانجی تمام می‌شود؟»): the kanji options
   * 人/国 rendered at 16px thin while the kana option ひと rendered at 28px
   * bold — the kanji were unreadable next to it. A short pure-CJK label is a
   * SHAPE the learner discriminates → ONE big bold glyph scale for the whole
   * row, plain (no ruby: a lone kanji's reading could leak the answer). */
  it('kanji options sit at the SAME big bold glyph scale as kana options', () => {
    const kanjiEx = {
      ...ex,
      options: [
        { id: 'opt-a', label: '人' },
        { id: 'opt-b', label: '国' },
        { id: 'opt-c', label: 'ひと' },
      ],
    } satisfies ClientExercise;
    const m = renderToStaticMarkup(
      <OptionRow options={kanjiEx.options} selected={null} eliminated={[]} locked={false} onSelect={() => {}} />,
    );
    // every option renders through the ja-block glyph stack at h2 bold
    const glyphTiles = m.split('ja-block').length - 1;
    expect(glyphTiles).toBe(3);
    expect(count(m, 'text-h2')).toBe(3);
    expect(count(m, 'font-bold')).toBeGreaterThanOrEqual(3);
    // the kanji labels ride the glyph tiles as PLAIN text — never ruby
    // (an rt over 人 would leak the ひと option's answer)
    expect(m).not.toContain('<rt');
    expect(m).toContain('>人<');
    expect(m).toContain('>国<');
    expect(m).toContain('>ひと<');
    // no SmartJaText island inside a glyph option (the plain-span path is for
    // longer words/sentences — not for short CJK shapes)
    expect(m).not.toContain('data-smart-ja');
  });

  it('longer kanji-bearing labels keep the SmartJaText ruby law (uniform radio look)', () => {
    const wordEx = {
      ...ex,
      options: [
        { id: 'opt-a', label: 'わたしは学生です' },
        { id: 'opt-b', label: 'おはようございます' },
      ],
    } satisfies ClientExercise;
    const m = renderToStaticMarkup(
      <OptionRow options={wordEx.options} selected={null} eliminated={[]} locked={false} onSelect={() => {}} />,
    );
    expect(m).toContain('data-smart-ja'); // the ruby law path (LearnerJaProvider defaults outside a provider)
    expect(m).not.toContain('text-h2'); // words are NOT big glyph tiles
  });
});
