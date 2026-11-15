// @vitest-environment jsdom
/**
 * TASK-HANASO-28 — unit tests for the upgraded surfaces:
 *  1. lessonAchievementsOf — the richer HONEST chips (reading words,
 *     exercise-type fingerprint) with the max-3 + no-mastery discipline;
 *  2. the seal stage contract — bigger frame, NO sound toggle on the stage
 *     (it moved to the message row), ink-ring layer during ceremony only;
 *  3. the journey current-row + section switcher labels exist in fa bundle.
 */
import { describe, expect, it } from 'vitest';
import { lessonAchievementsOf } from '@/components/curriculum/station-runner';
import { AizenSeal } from '@/components/curriculum/aizen-seal';
import { render } from '@testing-library/react';
import { fa } from '@/messages/fa';

const ex = (id: string, type: string) => ({ id, type });

describe('TASK-28 lessonAchievementsOf — richer honest chips', () => {
  it('A1: a teaching station with reading examples counts REAL readable words', () => {
    const station = {
      type: 'lesson',
      blocks: [
        { kind: 'kana-card' },
        { kind: 'kana-card' },
        { kind: 'kana-card' },
        {
          kind: 'example-set',
          examples: [
            { role: 'anchor' },
            { role: 'reading' },
            { role: 'reading' },
            { role: 'faded' },
          ],
        },
        { kind: 'exercise', exerciseIds: ['e1', 'e2'] },
        { kind: 'writing-practice' },
      ],
    };
    const chips = lessonAchievementsOf(station, {
      e1: ex('e1', 'kana-recognition'),
      e2: ex('e2', 'kana-recall'),
    });
    expect(chips).toContain('حالا ۲ واژهٔ واقعیِ ژاپنی تازه خواندنی شد');
    expect(chips).toContain('با ۳ شکل جدید آشنا شدی');
    /* max-3 discipline: the writing chip is honestly cut here — reading words
     * and new shapes rank higher; writing alone (no cards) still shows it. */
    expect(chips.length).toBe(3);
    const writingOnly = lessonAchievementsOf(
      { type: 'lesson', blocks: [{ kind: 'writing-practice' }, { kind: 'exercise', exerciseIds: ['w'] }] },
      { w: ex('w', 'kana-recognition') },
    );
    expect(writingOnly).toContain('نوشتن دستی را تمرین کردی');
  });

  it('A2: a practice station gets the exercise-type fingerprint, not one generic chip', () => {
    const station = {
      type: 'practice',
      blocks: [
        { kind: 'exercise', exerciseIds: ['a', 'b', 'c', 'd', 'e', 'f'] },
      ],
    };
    const chips = lessonAchievementsOf(station, {
      a: ex('a', 'kana-recognition'),
      b: ex('b', 'kana-listening'),
      c: ex('c', 'kana-recall'),
      d: ex('d', 'kana-decode'),
      e: ex('e', 'rule-listening'),
      f: ex('f', 'meaning-select'),
    });
    expect(chips).toContain('صدای کاناها را به شکل‌هایشان گره زدی');
    expect(chips).toContain('واژه‌های واقعی را رمزگشایی کردی');
    expect(chips.join(' ')).not.toContain('مسلط');
  });

  it('A3: unknown exercise types keep the generic rounds chip', () => {
    const station = {
      type: 'lesson',
      blocks: [{ kind: 'exercise', exerciseIds: ['x'] }],
    };
    const chips = lessonAchievementsOf(station, { x: ex('x', 'meaning-select') });
    expect(chips).toEqual(['۱ دور تمرین یادگیری را کامل کردی']);
  });

  it('A4: no clientExercises map → generic chip still works (pure function contract)', () => {
    const station = {
      type: 'lesson',
      blocks: [
        { kind: 'kana-card' },
        { kind: 'exercise', exerciseIds: ['y'] },
      ],
    };
    const chips = lessonAchievementsOf(station);
    expect(chips).toContain('با ۱ شکل جدید آشنا شدی');
    expect(chips).toContain('۱ دور تمرین یادگیری را کامل کردی');
  });

  it('A5: milestone objective keeps its real-world line first', () => {
    const station = {
      type: 'milestone',
      objectiveCode: 'kana-realworld-reading',
      blocks: [{ kind: 'exercise', exerciseIds: ['m'] }],
    };
    const chips = lessonAchievementsOf(station, { m: ex('m', 'kana-decode') });
    expect(chips[0]).toBe('واژه‌های واقعیِ ژاپنی را با دانش خودت خواندی');
  });
});

describe('TASK-28 AizenSeal — the upgraded ceremony', () => {
  it('S7: the ceremony renders the ink-ring expand layer; the settled seal does not', () => {
    const { container, rerender } = render(<AizenSeal animate label="مهر" />);
    expect(container.querySelector('[data-aizen-seal-ink-ring]')).not.toBeNull();
    rerender(<AizenSeal animate={false} label="مهر" />);
    expect(container.querySelector('[data-aizen-seal-ink-ring]')).toBeNull();
  });
});

describe('TASK-28 journey labels — fa bundle keys', () => {
  it('L1: current-row + switcher + milestone chips exist (fa strings)', () => {
    expect(fa.curriculum.rowCurrentChip).toBe('ایستگاه فعلی');
    expect(fa.curriculum.sectionSwitcherLabel).toBe('انتخاب بخش فصل');
    expect(fa.curriculum.sectionActiveChip).toBe('فعلی');
    expect(fa.curriculum.rowMilestoneChip).toBe('ایستگاه واقعی');
    expect(fa.curriculum.rowMinutesShort(8)).toContain('۸');
  });
});
