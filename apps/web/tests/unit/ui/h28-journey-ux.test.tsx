// @vitest-environment jsdom
/**
 * TASK-HANASO-28 — unit tests for the upgraded surfaces:
 *  1. lessonAchievementsOf — the richer HONEST chips (reading words,
 *     exercise-type fingerprint) with the max-3 + no-mastery discipline;
 *  2. the seal stage contract — bigger frame, NO sound toggle on the stage
 *     (it moved to the message row), ink-ring layer during ceremony only;
 *  3. the journey current-row + section switcher labels exist in fa bundle;
 *  4. SUBAGENT C FIXES (regression pins):
 *     C1 — the «ایستگاه فعلی» marker matches the server's nextStationSlug
 *          EXACTLY (one row), never the old isFocus&&action heuristic (an
 *          optional available station beside the frontier must NOT win the
 *          chip / aria-current / the auto-scroll target);
 *     C2 — re-selecting an option after a WRONG grade clears the stale
 *          verdict (no premature red on the fresh choice) and advances the
 *          attempt ladder exactly like the retry button.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import * as React from 'react';
import { lessonAchievementsOf } from '@/components/curriculum/station-runner';
import { AizenSeal } from '@/components/curriculum/aizen-seal';
import { SectionJourney, type SectionDto } from '@/components/curriculum/section-journey';
import { ExerciseSession } from '@/components/curriculum/exercise-session';
import { fa } from '@/messages/fa';
import type { ClientExercise } from '@/modules/curriculum/grading';

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
          examples: [{ role: 'anchor' }, { role: 'reading' }, { role: 'reading' }, { role: 'faded' }],
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
      blocks: [{ kind: 'exercise', exerciseIds: ['a', 'b', 'c', 'd', 'e', 'f'] }],
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
      blocks: [{ kind: 'kana-card' }, { kind: 'exercise', exerciseIds: ['y'] }],
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

/* ------------------------------------------------------------------ helpers */
/** A minimal one-section DTO whose rows reproduce the Subagent C scenario:
 *  the frontier core station (nextStation) AND an optional available station
 *  (prerequisites: [] — e.g. stn-kana-opt-drill) sit in the SAME focus
 *  section. The old heuristic tagged BOTH. */
const row = (slug: string, action: SectionDto['rows'][number]['action']): SectionDto['rows'][number] => ({
  slug,
  type: 'practice',
  contentKind: action === 'review' ? 'review' : 'practice',
  titleFa: `ایستگاه ${slug}`,
  objectiveFa: 'هدف',
  core: slug !== 'stn-optional',
  estMinutes: 8,
  availability: action === 'locked' ? 'locked' : action === 'review' ? 'completed' : 'available',
  action,
  href: `/learn/x/journey/${slug}`,
});
const makeSection = (isFocus: boolean): SectionDto => ({
  slug: 'section-a',
  titleFa: 'بخش آزمایشی',
  status: 'in_progress',
  isFocus,
  coreCompleted: 2,
  coreTotal: 3,
  rows: [
    row('stn-done', 'review'),
    row('stn-frontier', 'start'), // the server's next station
    row('stn-optional', 'start'), // optional + available — NOT current
    row('stn-future', 'locked'),
  ],
});

describe('TASK-28 Subagent C fix C1 — current-row = exact nextStationSlug match', () => {
  afterEach(() => cleanup());

  it('C1a: only the frontier row gets the chip + aria-current; the optional available row does not', () => {
    const { container } = render(
      <SectionJourney
        chapterSlug="x"
        nextStationSlug="stn-frontier"
        initial={{ sections: [makeSection(true)], activeIndex: 0 }}
      />,
    );
    // exactly ONE current row (chip + testid + aria-current all agree)
    expect(container.querySelectorAll('[data-testid="journey-current-row"]')).toHaveLength(1);
    expect(container.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
    expect(container.textContent).toContain('ایستگاه فعلی');
    // and it is the frontier row, not the optional one
    const currentLi = container.querySelector('[data-testid="journey-current-row"]')!;
    expect(currentLi.textContent).toContain('stn-frontier');
    expect(currentLi.textContent).not.toContain('stn-optional');
  });

  it('C1b: the old heuristic would have tagged the optional row too — slug match does not (focus section, no slug prop)', () => {
    // no nextStationSlug (chapter done) → NO row is current, even though the
    // section is the focus section with start/continue rows present.
    const { container } = render(
      <SectionJourney chapterSlug="x" initial={{ sections: [makeSection(true)], activeIndex: 0 }} />,
    );
    expect(container.querySelectorAll('[data-testid="journey-current-row"]')).toHaveLength(0);
    expect(container.querySelectorAll('[aria-current="true"]')).toHaveLength(0);
  });

  it('C1c: the marker follows the LIVE slug after a tab-focus refresh', async () => {
    /* realistic walk: the frontier was completed in another tab → the next
     * core station (stn-future) unlocked. Station SETS are authored content
     * (the merge updates existing rows only) — only availability changes. */
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: {
                nextStationSlug: 'stn-future',
                sections: [
                  {
                    slug: 'section-a',
                    titleFa: 'بخش آزمایشی',
                    status: 'in_progress',
                    coreCompleted: 3,
                    coreTotal: 4,
                    isFocus: true,
                    rows: [
                      { slug: 'stn-done', availability: 'completed', action: 'review' },
                      { slug: 'stn-frontier', availability: 'completed', action: 'review' },
                      { slug: 'stn-optional', availability: 'available', action: 'start' },
                      { slug: 'stn-future', availability: 'available', action: 'start' },
                    ],
                  },
                ],
              },
            }),
            { status: 200 },
          ),
      ),
    );
    const { container } = render(
      <SectionJourney
        chapterSlug="x"
        nextStationSlug="stn-frontier"
        initial={{ sections: [makeSection(true)], activeIndex: 0 }}
      />,
    );
    expect(container.querySelector('[data-testid="journey-current-row"]')?.textContent).toContain('stn-frontier');
    // tab-focus refresh → the marker moves to the live frontier
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise((r) => setTimeout(r, 0));
      await Promise.resolve();
    });
    const current = container.querySelector('[data-testid="journey-current-row"]');
    expect(current?.textContent).toContain('stn-future');
    // still exactly ONE current row — the optional available one never wins
    expect(container.querySelectorAll('[data-testid="journey-current-row"]')).toHaveLength(1);
    expect(current?.textContent).not.toContain('stn-optional');
    vi.unstubAllGlobals();
  });
});

describe('TASK-28 Subagent C fix C2 — re-select after a wrong grade', () => {
  const exWrong: ClientExercise = {
    id: 'ex-c2',
    type: 'kana-recognition',
    targetSkill: 'vocab',
    promptFa: 'این کانا چه صدایی دارد؟',
    promptJa: 'あ',
    options: [
      { id: 'a', label: '«آ»' },
      { id: 'b', label: '«اُ»' },
      { id: 'c', label: '«ای»' },
    ],
  };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: {
                outcome: {
                  correct: false,
                  level: 2,
                  feedbackFa: 'نه — این «آ» است.',
                },
              },
            }),
            { status: 200 },
          ),
      ),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  async function gradeWrong(label: string) {
    const radio = screen.getByRole('radio', { name: new RegExp(label) });
    const btn = screen.getByRole('button', { name: 'بررسی پاسخ' }) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(radio);
    });
    await act(async () => {
      fireEvent.click(btn);
    });
    for (let i = 0; i < 25 && !document.querySelector('[data-feedback-panel]'); i += 1) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
        await Promise.resolve();
      });
    }
    expect(document.querySelector('[data-feedback-panel]')).toBeTruthy();
  }

  it('C2a: picking a new option clears the stale red verdict (no premature «incorrect» on the fresh choice)', async () => {
    render(
      <ExerciseSession
        chapterSlug="kana-foundation-01"
        stationSlug="stn-kana-h1"
        exercises={[exWrong]}
        audioByLine={{}}
        audioAvailable={false}
      />,
    );
    await gradeWrong('«اُ»'); // wrong answer graded
    // the wrong option shows the verdict red (post-grade state)
    expect(document.querySelector('[data-feedback-panel]')!.className).toContain('border-error');
    // re-select a DIFFERENT option without pressing «تلاش دوباره»
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: '«آ»' }));
    });
    // the stale feedback panel is GONE — the new choice renders with the
    // neutral selected style (indigo), not the old red verdict
    expect(document.querySelector('[data-feedback-panel]')).toBeNull();
    const selected = document.querySelector('[aria-checked="true"]');
    expect(selected).toBeTruthy();
    expect(selected!.className).not.toContain('border-error');
    expect(selected!.className).not.toContain('text-error');
  });

  it('C2b: the re-select advances the attempt ladder exactly like the retry button (attempt 1 → 2)', async () => {
    render(
      <ExerciseSession
        chapterSlug="kana-foundation-01"
        stationSlug="stn-kana-h1"
        exercises={[exWrong]}
        audioByLine={{}}
        audioAvailable={false}
      />,
    );
    await gradeWrong('«اُ»');
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: '«آ»' }));
    });
    // the graded re-submit now carries attemptNo=2 (the fetch body proves it)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بررسی پاسخ' }));
    });
    for (let i = 0; i < 25 && screen.queryByRole('button', { name: 'بررسی پاسخ' }); i += 1) {
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
        await Promise.resolve();
      });
    }
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls as unknown as [string, { body: string }][];
    const bodies = calls.map(([, init]) => JSON.parse(init.body));
    expect(bodies.some((b) => b.attemptNo === 2 && b.answer.optionId === 'a')).toBe(true);
  });
});
