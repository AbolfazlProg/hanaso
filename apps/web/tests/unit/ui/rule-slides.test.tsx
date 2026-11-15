// @vitest-environment jsdom
/**
 * HANASO — TASK-LEARNING-14 slide-by-slide rule slides (UI).
 *
 * Renders the REAL StationRunner with a synthetic station that carries the
 * three new block kinds (rule-prereq / rule-contrast / rule-step) and asserts:
 * - the slides render (items, pair panels, beat dots, highlights, badges);
 * - the unscored micro-question grades through /api/curriculum/station
 *   (grade-block) and shows the reveal in BOTH outcomes (pretesting);
 * - «ادامه» (free next) stays available on the new slide kinds — a
 *   micro-question never gates the walk;
 * - the play-both control only appears when BOTH words have committed audio.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { StationRunner } from '@/components/curriculum/station-runner';
import { toClientStation } from '@/modules/curriculum/client-transport';
import type { Station } from '@/modules/curriculum/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), forward: vi.fn() }),
}));

const syntheticStation: Station = {
  slug: 'stn-fixture-slides',
  type: 'kana',
  titleFa: 'ایستگاه آزمایشی اسلایدها',
  objectiveFa: 'اسلایدهای قاعده',
  core: true,
  order: 1,
  prerequisites: [],
  lineRefs: [],
  objectiveCode: 'kana-hira-foundation',
  estMinutes: 10,
  estLoad: 'light',
  completion: { kind: 'exercise_threshold', threshold: 0.7 },
  mastery: { threshold: 0.7 },
  introducesGlyphs: ['や'],
  blocks: [
    {
      kind: 'rule-prereq',
      id: 'blk-fixture-prereq',
      titleFa: 'پیش‌نیاز: این را یادت باشد',
      items: [
        { glyph: 'あ', readingFa: 'اَ', noteFa: 'مصوت «ا».' },
        { glyph: 'や', readingFa: 'یا', noteFa: 'اولین نگاه — فقط ببین.', firstLook: true },
      ],
    },
    {
      kind: 'rule-contrast',
      id: 'blk-fixture-contrast',
      titleFa: 'جفت کمینه‌ای',
      a: { ja: 'いえ', readingFa: 'ایه', fa: 'خانه', highlight: [], beats: 2 },
      b: { ja: 'いいえ', readingFa: 'اییه', fa: 'نه', highlight: ['いい'], beats: 3 },
      ask: {
        questionFa: 'کدام سه ضربه بود؟',
        options: [
          { id: 'a', label: 'いえ' },
          { id: 'b', label: 'いいえ' },
        ],
        correctOptionId: 'b',
        revealFa: 'واژهٔ دوم سه ضربه داشت.',
      },
    },
    {
      kind: 'rule-step',
      id: 'blk-fixture-step',
      role: 'notice',
      bodyFa: 'این واژه را ببین — بخش کشیده برجسته است.',
      word: { ja: 'おおきい', readingFa: 'اووکیی', fa: 'بزرگ', highlight: ['おお'], beats: 4 },
      ask: {
        questionFa: 'حدس بزن: مصوت اول کوتاه است یا کشیده؟',
        options: [
          { id: 'a', label: 'کوتاه' },
          { id: 'b', label: 'کشیده' },
        ],
        correctOptionId: 'b',
        revealFa: 'کشیده — お+お دو ضربه است.',
      },
    },
    {
      kind: 'rule-contrast',
      id: 'blk-fixture-contrast-visual',
      a: { ja: 'え', readingFa: 'اِ', fa: 'نقاشی', highlight: [], beats: 1 },
      b: { ja: 'ええ', readingFa: 'اِی', fa: 'بله', highlight: ['ええ'], beats: 2 },
      // NO ask and NO audio for this pair — visual-only contrast
    },
    {
      kind: 'wrap-up',
      id: 'blk-fixture-wrapup',
      titleFa: 'جمع‌بندی',
      itemsFa: ['قاعده را دیدی.'],
    },
  ],
  fsrsItems: [],
};

const gradeBlockCalls: Array<Record<string, unknown>> = [];

beforeEach(() => {
  gradeBlockCalls.length = 0;
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.startsWith('/api/curriculum/station?')) {
      return new Response(JSON.stringify({ data: { state: null } }), { status: 200 });
    }
    if (u === '/api/curriculum/station' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      if (body.action === 'grade-block') {
        gradeBlockCalls.push(body);
        return new Response(
          JSON.stringify({
            data: { outcome: { correct: false, level: 0, feedbackFa: 'واژهٔ دوم سه ضربه داشت.' } },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    }
    return new Response('{}', { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderRunner(exampleAudioByWord?: Record<string, { opus: string; m4a: string } | null>) {
  return render(
    <StationRunner
      chapterSlug="kana-foundation-01"
      station={toClientStation(syntheticStation)}
      chapter={{ words: [], expressions: [] }}
      nextCoreStation={{ slug: 'stn-next', titleFa: 'بعدی' }}
      clientExercises={{}}
      dialogue={{ lines: [], speakers: {} }}
      audioByLine={{}}
      audioAvailable={false}
      {...(exampleAudioByWord ? { exampleAudioByWord } : {})}
    />,
  );
}

/** Click the walk's forward «ادامه» exactly once. */
async function stepForward() {
  const forward = [...document.querySelectorAll('button')].find((b) => b.textContent === 'ادامه');
  expect(forward, 'forward button while on a free-next slide').toBeDefined();
  await act(async () => {
    fireEvent.click(forward!);
  });
}

describe('TL-14 — rule slides render', () => {
  it('rule-prereq: items + the first-look badge', async () => {
    renderRunner();
    await waitFor(() => {
      expect(document.querySelector('[data-rule-prereq]')).toBeDefined();
    });
    expect(document.querySelectorAll('[data-prereq-item]').length).toBe(2);
    expect(screen.getByText('اولین نگاه')).toBeDefined();
    expect(screen.getByText('پیش‌نیاز: این را یادت باشد')).toBeDefined();
  });

  it('rule-contrast: both words, beat dots, and the highlighted rule part', async () => {
    renderRunner();
    // step from the prereq slide to the contrast slide (deterministic walk)
    await waitFor(() => {
      expect(document.querySelector('[data-rule-prereq]')).toBeDefined();
    });
    await stepForward();
    await waitFor(() => {
      expect(document.querySelector('[data-rule-contrast]')).toBeDefined();
    });
    expect(document.querySelector('[data-contrast-word="いえ"]')).toBeDefined();
    expect(document.querySelector('[data-contrast-word="いいえ"]')).toBeDefined();
    expect(document.querySelector('[data-beats="2"]')).toBeDefined();
    expect(document.querySelector('[data-beats="3"]')).toBeDefined();
    expect(document.querySelector('[data-rule-highlight]')?.textContent).toBe('いい');
  });

  it('play-both appears only when BOTH pair words have committed audio (DD-081)', async () => {
    renderRunner({
      いえ: { opus: '/audio/x.opus', m4a: '/audio/x.m4a' },
      // いいえ has NO asset → the pair control must NOT render
    });
    await waitFor(() => {
      expect(document.querySelector('[data-rule-prereq]')).toBeDefined();
    });
    await stepForward();
    await waitFor(() => {
      expect(document.querySelector('[data-rule-contrast]')).toBeDefined();
    });
    expect(document.querySelector('[data-play-both]')).toBeNull();
  });

  it('rule-step: role badge, word hero, highlight span', async () => {
    renderRunner();
    // advance to the step slide (block 3): prereq → contrast → step
    await waitFor(() => {
      expect(document.querySelector('[data-rule-prereq]')).toBeDefined();
    });
    await stepForward();
    await stepForward();
    await waitFor(() => {
      expect(document.querySelector('[data-rule-step]')).toBeDefined();
    });
    const step = document.querySelector('[data-rule-step]');
    expect(step).toBeDefined();
    expect(step!.getAttribute('data-step-role')).toBe('notice');
    expect(screen.getByText('نگاه کن')).toBeDefined();
    expect(document.querySelector('[data-rule-highlight]')?.textContent).toBe('おお');
    expect(document.querySelector('[data-beats="4"]')).toBeDefined();
  });

  it('the new slide kinds keep the free «ادامه» button (never a walk gate)', async () => {
    renderRunner();
    await waitFor(() => {
      expect(document.querySelector('[data-rule-prereq]')).toBeDefined();
    });
    const forward = [...document.querySelectorAll('button')].find((b) => b.textContent === 'ادامه');
    expect(forward).toBeDefined();
    expect(forward!.disabled).toBe(false);
  });
});

describe('TL-14 — the unscored micro-question (pretesting)', () => {
  it('grades through grade-block, reveals even on a wrong guess, and keeps ادامه', async () => {
    renderRunner();
    await waitFor(() => {
      expect(document.querySelector('[data-rule-prereq]')).toBeDefined();
    });
    await stepForward(); // → contrast slide (carries the micro-question)
    await waitFor(() => {
      expect(document.querySelector('[data-micro-ask]')).toBeDefined();
    });
    const ask = document.querySelector('[data-micro-ask]')!;
    // the answer key never reached the client (SKL-013)
    expect(ask.innerHTML).not.toContain('correctOptionId');
    expect(ask.innerHTML).not.toContain('revealFa');
    // guess the (wrong) option
    const wrong = [...ask.querySelectorAll('button')].find((b) => b.textContent === 'いえ')!;
    await act(async () => {
      fireEvent.click(wrong);
    });
    await waitFor(() => {
      expect(gradeBlockCalls.length).toBe(1);
    });
    expect(gradeBlockCalls[0]).toMatchObject({
      action: 'grade-block',
      blockId: 'blk-fixture-contrast',
      answer: { kind: 'option', optionId: 'a' },
    });
    // the reveal teaches in the wrong-guess outcome too
    await waitFor(() => {
      expect(screen.getByText('واژهٔ دوم سه ضربه داشت.')).toBeDefined();
    });
    expect(screen.getByText('حدست الان مهم نبود — این را ببین:')).toBeDefined();
    // the walk is NOT gated: ادامه still available
    const forward = [...document.querySelectorAll('button')].find((b) => b.textContent === 'ادامه');
    expect(forward).toBeDefined();
  });
});
