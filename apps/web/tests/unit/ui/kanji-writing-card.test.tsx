// @vitest-environment jsdom
/**
 * HANASO — KanjiWritingCard tests (SMART-RUBY 2026-11-23 §۴ — mission «اصلاح
 * بخش نوشتاری کانجی»).
 *
 * The kanji writing experience must BE the kana writing experience: the SAME
 * shared WritingCanvas/engine (no second writing system), the same staged
 * timeline (intro teaching pass → the ONE confirm → guided trace → free from
 * memory → next kanji), driven here with the REAL KanjiVG stroke data of
 * 人 (2 strokes) and 国 (8 strokes) — the exact files production serves.
 *
 * The regression this pins: the kanji deck auto-flows per character with NO
 * state leak between kanji (the 国 card starts its own intro after 人
 * completes), the per-stroke narration + progress dots render, and the
 * anchor words (the carriers, with their readings) render beside the canvas.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as React from 'react';

import { KanjiWritingCard } from '@/components/curriculum/kanji-writing-card';
import type { KanjiWritingEntry } from '@/components/curriculum/kanji-writing-card';

const webRoot = join(__dirname, '..', '..', '..');
const INDEX = readFileSync(join(webRoot, 'public', 'writing-data', 'index.json'), 'utf8');
const JIN = readFileSync(join(webRoot, 'public', 'writing-data', '人.json'), 'utf8');
const KUNI = readFileSync(join(webRoot, 'public', 'writing-data', '国.json'), 'utf8');
const JIN_DATA = JSON.parse(JIN) as { medians: number[][][] };
const KUNI_DATA = JSON.parse(KUNI) as { medians: number[][][] };

/* the real FM01 anchor facts (K3 carriers — taught before the station) */
const ENTRIES: KanjiWritingEntry[] = [
  {
    literal: '人',
    meaningFa: 'انسان، شخص',
    strokeCount: 2,
    kanjiId: 'kj-4eba',
    anchors: [
      {
        wordId: 'voc-nihonjin',
        term: '日本人',
        readingKana: 'にほんじん',
        meaningFa: 'ژاپنی (اهل ژاپن)',
        audio: null,
      },
      {
        wordId: 'voc-iranjin',
        term: 'イラン人',
        readingKana: 'イランじん',
        meaningFa: 'ایرانی',
        audio: null,
      },
    ],
  },
  {
    literal: '国',
    meaningFa: 'کشور',
    strokeCount: 8,
    kanjiId: 'kj-56fd',
    anchors: [
      {
        wordId: 'voc-chuugokujin',
        term: '中国人',
        readingKana: 'ちゅうごくじん',
        meaningFa: 'چینی',
        audio: null,
      },
    ],
  },
];

/* jsdom canvas geometry — the same mapping the walk-regression suite uses */
const RECT = { left: 0, top: 0, width: 512, height: 512, x: 0, y: 0, right: 512, bottom: 512, toJSON: () => ({}) };
const cx = (x: number) => x / 2;
const cy = (y: number) => y / 2;
let rectSpy: ReturnType<typeof vi.spyOn>;

const fetchMock = vi.fn(async (url: string | URL | Request) => {
  const u = String(url);
  if (u.includes('index.json')) return new Response(INDEX, { status: 200 });
  if (u.includes('%E4%BA%BA') || u.endsWith('/人.json')) return new Response(JIN, { status: 200 });
  if (u.includes('%E5%9B%BD') || u.endsWith('/国.json')) return new Response(KUNI, { status: 200 });
  if (u.includes('/api/curriculum/learner-ja')) return new Response('{}', { status: 200 });
  return new Response('{}', { status: 200 });
});

beforeAll(() => {
  rectSpy = vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue(RECT as DOMRect);
});

afterAll(() => {
  rectSpy.mockRestore();
});

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function drawAll(svg: Element, medians: number[][][]) {
  for (const median of medians) {
    const pts = median.map(([x = 0, y = 0]) => ({ x, y }));
    fireEvent.pointerDown(svg, { pointerId: 1, pointerType: 'mouse', clientX: cx(pts[0]!.x), clientY: cy(pts[0]!.y) });
    for (const p of pts.slice(1)) {
      fireEvent.pointerMove(svg, { pointerId: 1, pointerType: 'mouse', clientX: cx(p.x), clientY: cy(p.y) });
    }
    fireEvent.pointerUp(svg, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: cx(pts[pts.length - 1]!.x),
      clientY: cy(pts[pts.length - 1]!.y),
    });
  }
}

describe('KanjiWritingCard — kana-writing parity over the shared engine', () => {
  it('renders the staged environment: picker, identity, reading chips, anchors', async () => {
    const { container } = render(
      <KanjiWritingCard
        blockId="wp-kanji-jin-kuni"
        chapterSlug="first-meeting-01"
        stationSlug="stn-fm01-23-kanji"
        characters={ENTRIES}
      />,
    );
    expect(container.querySelector('[data-kanji-writing-block]')).toBeTruthy();
    expect(container.querySelector('[data-kj-active="人"]')).toBeTruthy();
    // the reading chips: the segments 人 consumes in its anchors (じん)
    expect(container.textContent).toContain('じん');
    // the anchor carriers with their meanings
    expect(container.textContent).toContain('ژاپنی (اهل ژاپن)');
    expect(container.textContent).toContain('ایرانی');
    // stroke count badge
    expect(container.textContent).toContain('۲ ضربه');
    // the per-stroke narration panel rides the intro teaching pass once the
    // KanjiVG data resolves (async load)
    await waitFor(() => {
      expect(container.querySelector('[data-stroke-info]')).toBeTruthy();
    });
  });

  it('auto-flows intro → ready → guided and writes 人 (the full staged timeline)', { timeout: 30000 }, async () => {
    vi.useFakeTimers();
    const { container } = render(
      <KanjiWritingCard
        blockId="wp-kanji-jin-kuni"
        chapterSlug="first-meeting-01"
        stationSlug="stn-fm01-23-kanji"
        characters={ENTRIES}
      />,
    );
    // intro auto-flows to the ready beat
    for (let k = 0; k < 20; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      if (container.querySelector('[data-kj-stage="ready"]')) break;
    }
    expect(container.querySelector('[data-kj-stage="ready"]'), 'intro auto-flowed to ready').toBeTruthy();
    // the ONE confirm CTA starts guided practice
    await act(async () => {
      fireEvent.click(container.querySelector('[data-ready-cta]')!);
    });
    for (let k = 0; k < 16; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      if (container.querySelector('[data-kj-stage="guided"]')) break;
    }
    expect(container.querySelector('[data-kj-stage="guided"]')).toBeTruthy();

    // guided: draw 人's two strokes (real KanjiVG medians) → free
    let svg = container.querySelector('svg[role="img"]');
    expect(svg, 'canvas present in guided').not.toBeNull();
    drawAll(svg!, JIN_DATA.medians);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(container.querySelector('[data-kj-stage="free"]'), 'guided → free beat').toBeTruthy();

    // free: write 人 from memory → done → the NEXT kanji (国) starts its OWN intro
    svg = container.querySelector('svg[role="img"]');
    expect(svg, 'canvas present in free').not.toBeNull();
    drawAll(svg!, JIN_DATA.medians);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(container.querySelector('[data-kj-active="国"]'), 'advanced to 国').toBeTruthy();
    const nextStage = container.querySelector('[data-kj-stage]')?.getAttribute('data-kj-stage');
    expect(['intro', 'ready']).toContain(nextStage!);
    // no state leak: 国 is a FRESH kanji — never 人's done state
    expect(container.querySelector('[data-kj-stage="done"]')).toBeNull();
  });

  it('writing ALL kanji completes the block with the done panel', { timeout: 60000 }, async () => {
    vi.useFakeTimers();
    const { container } = render(
      <KanjiWritingCard
        blockId="wp-kanji-jin-kuni"
        chapterSlug="first-meeting-01"
        stationSlug="stn-fm01-23-kanji"
        characters={ENTRIES}
      />,
    );
    for (const kanji of [JIN_DATA, KUNI_DATA]) {
      // intro → ready
      for (let k = 0; k < 24; k += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
        if (container.querySelector('[data-kj-stage="ready"]')) break;
      }
      expect(container.querySelector('[data-kj-stage="ready"]')).toBeTruthy();
      await act(async () => {
        fireEvent.click(container.querySelector('[data-ready-cta]')!);
      });
      // ready → guided
      for (let k = 0; k < 16; k += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
        if (container.querySelector('[data-kj-stage="guided"]')) break;
      }
      // guided: all strokes
      let svg = container.querySelector('svg[role="img"]');
      drawAll(svg!, kanji.medians);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      // free: all strokes from memory
      svg = container.querySelector('svg[role="img"]');
      drawAll(svg!, kanji.medians);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
    }
    expect(container.querySelector('[data-kanji-writing-done]'), 'the whole kanji deck completed').toBeTruthy();
  });

  it('persists the stage per kanji through the onProgress hook', { timeout: 30000 }, async () => {
    vi.useFakeTimers();
    const progress: Array<[string, string]> = [];
    const { container } = render(
      <KanjiWritingCard
        blockId="wp-kanji-jin-kuni"
        chapterSlug="first-meeting-01"
        stationSlug="stn-fm01-23-kanji"
        characters={ENTRIES}
        onProgress={(literal, stage) => progress.push([literal, stage])}
      />,
    );
    for (let k = 0; k < 20; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      if (container.querySelector('[data-kj-stage="ready"]')) break;
    }
    expect(progress).toContainEqual(['人', 'intro']);
    expect(progress).toContainEqual(['人', 'ready']);
  });
});
