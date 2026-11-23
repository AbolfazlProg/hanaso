// @vitest-environment jsdom
/**
 * HANASO — KANJI-WRITE-FIX walk regression (2026-11-23 — owner order:
 * «هر کانجی اسلاید مخصوص خودش را دارد، بدون دکمهٔ رد شدن، با نمایش خودکار و
 * شکل نهایی سالم» — all three fixes AT THE ENGINE/WALK LEVEL, over the REAL
 * chapter content and the REAL StationRunner).
 *
 * Pins the owner's three complaints:
 * ۱  one slide PER KANJI — the transport splits wp-kanji-jin-kuni into
 *    wp-kanji-jin-kuni@人 and wp-kanji-jin-kuni@国 (each its own slide, staged)
 * ۲  NO «ادامه» skip — the forward button is never offered on a kanji
 *    writing slide; completing the free-writing stage advances the walk
 *    automatically (the same #117 §8 gate as the kana cards)
 * ۳  the intro teaching pass AUTO-PLAYS on entry (the kanji starts writing
 *    itself the moment the slide appears) and rests on the finished glyph.
 *
 * Drives the REAL KanjiVG stroke data of 人 (2 strokes) and 国 (8 strokes) —
 * the exact files production serves.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as React from 'react';

import { StationRunner } from '@/components/curriculum/station-runner';
import { getChapter } from '@/modules/curriculum/content';
import { toClientStation, toClientExercise } from '@/modules/curriculum';
import { fa } from '@/messages/fa';
import type { Chapter } from '@/modules/curriculum/types';
import type { KanjiCardData } from '@/components/curriculum/kanji-card';
import { KANJI_ITEMS_BY_ID } from '@/modules/curriculum/kanji';

const webRoot = join(__dirname, '..', '..', '..');
const INDEX = readFileSync(join(webRoot, 'public', 'writing-data', 'index.json'), 'utf8');
const JIN = readFileSync(join(webRoot, 'public', 'writing-data', '人.json'), 'utf8');
const KUNI = readFileSync(join(webRoot, 'public', 'writing-data', '国.json'), 'utf8');
const JIN_DATA = JSON.parse(JIN) as { medians: number[][][] };
const KUNI_DATA = JSON.parse(KUNI) as { medians: number[][][] };

const chapter = getChapter('first-meeting-01') as Chapter;
const station = chapter.stations.find((s) => s.slug === 'stn-fm01-23-kanji')!;

/* the split walk (§۱ — the engine expands the deck into per-kanji slides) */
const clientStation = toClientStation(station);
const writingSlides = clientStation.blocks.filter((b) => b.kind === 'writing-practice');

const clientExercises = Object.fromEntries(
  Object.values(chapter.exercises)
    .filter((ex) => ex.assessmentRole === 'practice')
    .map((ex) => [ex.id, toClientExercise(ex)]),
);

/* the kanji card data — the same resolution the station page performs */
const kanjiDataByKanjiId: Record<string, KanjiCardData | undefined> = {};
for (const block of station.blocks) {
  if (block.kind !== 'kanji-card') continue;
  const ref = KANJI_ITEMS_BY_ID.get(block.kanjiId);
  if (!ref) continue;
  kanjiDataByKanjiId[block.kanjiId] = {
    kanjiId: block.kanjiId,
    literal: ref.literal,
    meaningFa: ref.meaningFa,
    strokeCount: ref.strokeCount,
    anchors: block.anchorWordIds.flatMap((wid) => {
      const w = chapter.words.find((x) => x.id === wid);
      if (!w) return [];
      return [
        {
          wordId: w.id,
          term: w.term,
          termFurigana: w.termFurigana,
          readingKana: w.readingKana,
          meaningFa: w.meaningFa,
          audio: null,
        },
      ];
    }),
  };
}

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), forward: vi.fn() }),
}));

/* jsdom canvas geometry — the same mapping the walk-regression suites use */
const RECT = { left: 0, top: 0, width: 512, height: 512, x: 0, y: 0, right: 512, bottom: 512, toJSON: () => ({}) };
const cx = (x: number) => x / 2;
const cy = (y: number) => y / 2;
let rectSpy: ReturnType<typeof vi.spyOn>;

const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
  const u = String(url);
  if (u.startsWith('/api/curriculum/station?')) {
    return new Response(JSON.stringify({ data: { state: null } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (u === '/api/curriculum/station' && init?.method === 'POST') {
    return new Response(JSON.stringify({ data: {} }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (u.includes('index.json')) return new Response(INDEX, { status: 200 });
  if (u.includes('%E4%BA%BA') || u.endsWith('/人.json')) return new Response(JIN, { status: 200 });
  if (u.includes('%E5%9B%BD') || u.endsWith('/国.json')) return new Response(KUNI, { status: 200 });
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
  window.localStorage.clear();
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

function renderWalkAt(blockId: string) {
  return render(
    <StationRunner
      chapterSlug={chapter.slug}
      station={clientStation}
      chapter={{ words: chapter.words, expressions: chapter.expressions }}
      clientExercises={clientExercises}
      dialogue={{ lines: [], speakers: {} }}
      audioByLine={{}}
      audioAvailable={false}
      kanjiDataByKanjiId={kanjiDataByKanjiId}
      initialBlockId={blockId}
    />,
  );
}

/** Advance fake time until the predicate holds (bounded). */
async function untilTrue(pred: () => boolean, rounds = 24, stepMs = 5000): Promise<boolean> {
  for (let k = 0; k < rounds; k += 1) {
    if (pred()) return true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(stepMs);
    });
  }
  return pred();
}

describe('KANJI-WRITE-FIX — the real kanji-station walk (engine level)', () => {
  it('§۱ the engine splits the deck: TWO writing slides, one kanji each, deterministic ids', () => {
    expect(writingSlides.map((b) => b.id)).toEqual(['wp-kanji-jin-kuni@人', 'wp-kanji-jin-kuni@国']);
    expect(writingSlides.map((b) => (b as { characters: string[] }).characters)).toEqual([['人'], ['国']]);
  });

  it(
    '§۲+§۳ no «ادامه» on a kanji writing slide; intro auto-plays; writing advances the walk to the NEXT kanji slide',
    { timeout: 60000 },
    async () => {
      vi.useFakeTimers();
      const { container } = renderWalkAt('wp-kanji-jin-kuni@人');

      // the walk opened AT the 人 writing slide (the deep link)
      expect(container.querySelector('[data-kanji-writing-block]')).toBeTruthy();
      expect(container.querySelector('[data-kj-active="人"]')).toBeTruthy();

      // §۲ — the forward button is NEVER offered on this slide (the gate)
      expect(container.querySelector('[data-kanji-writing-block]')!.textContent).not.toContain(
        fa.curriculum.continueBlock,
      );
      const forward = [...container.querySelectorAll('button')].find(
        (b) => b.textContent?.trim() === fa.curriculum.continueBlock,
      );
      expect(forward, 'the «ادامه» skip button must not exist on a kanji writing slide').toBeUndefined();

      // §۳ — the intro teaching pass AUTO-PLAYS on entry (no click yet):
      // the stroke narration panel appears while the pass runs, then the
      // finished glyph rests (the ready beat).
      const narrated = await untilTrue(() => Boolean(container.querySelector('[data-stroke-info]')));
      expect(narrated, 'the intro pass narrates its strokes (it is actually running)').toBe(true);
      const reachedReady = await untilTrue(() => Boolean(container.querySelector('[data-kj-stage="ready"]')));
      expect(reachedReady, 'intro auto-flowed to ready (the demo played itself)').toBe(true);

      // the ONE confirm CTA starts guided practice (the owner's «شروع نوشتن» flow)
      const cta = container.querySelector('[data-ready-cta]');
      expect(cta).toBeTruthy();
      await act(async () => {
        fireEvent.click(cta!);
      });
      await untilTrue(() => Boolean(container.querySelector('[data-kj-stage="guided"]')));
      expect(container.querySelector('[data-kj-stage="guided"]')).toBeTruthy();

      // guided: trace 人's two strokes (real KanjiVG medians) → free
      let svg = container.querySelector('svg[role="img"]');
      expect(svg, 'canvas present in guided').not.toBeNull();
      drawAll(svg!, JIN_DATA.medians);
      await untilTrue(() => Boolean(container.querySelector('[data-kj-stage="free"]')));
      expect(container.querySelector('[data-kj-stage="free"]'), 'guided → free beat').toBeTruthy();

      // free: write 人 from memory → done → the WALK advances to 国's OWN slide
      svg = container.querySelector('svg[role="img"]');
      drawAll(svg!, JIN_DATA.medians);
      const reachedKuni = await untilTrue(() => Boolean(container.querySelector('[data-kj-active="国"]')), 24, 5000);
      expect(reachedKuni, 'completing the free write advanced the walk to the 国 slide').toBe(true);

      // the 国 slide is its OWN slide: fresh intro (no state leak from 人's done)
      const kuniStage = container.querySelector('[data-kj-stage]')?.getAttribute('data-kj-stage');
      expect(['intro', 'ready']).toContain(kuniStage!);
      expect(container.querySelector('[data-kj-stage="done"]'), 'no stage leak from 人 into 国').toBeNull();

      // §۲ holds on the 国 slide too — the skip button stays gone
      const forward2 = [...container.querySelectorAll('button')].find(
        (b) => b.textContent?.trim() === fa.curriculum.continueBlock,
      );
      expect(forward2, 'the «ادامه» skip button must not exist on the 国 slide either').toBeUndefined();
    },
  );

  it(
    '§۲ the LAST writing slide completes the station path honestly (writing 国 advances toward the exercises)',
    { timeout: 90000 },
    async () => {
      vi.useFakeTimers();
      const { container } = renderWalkAt('wp-kanji-jin-kuni@国');
      expect(container.querySelector('[data-kj-active="国"]')).toBeTruthy();

      // intro auto-plays → ready → CTA → guided → free → done
      await untilTrue(() => Boolean(container.querySelector('[data-kj-stage="ready"]')));
      const cta = container.querySelector('[data-ready-cta]');
      await act(async () => {
        fireEvent.click(cta!);
      });
      await untilTrue(() => Boolean(container.querySelector('[data-kj-stage="guided"]')));
      let svg = container.querySelector('svg[role="img"]');
      drawAll(svg!, KUNI_DATA.medians);
      await untilTrue(() => Boolean(container.querySelector('[data-kj-stage="free"]')));
      svg = container.querySelector('svg[role="img"]');
      drawAll(svg!, KUNI_DATA.medians);
      await untilTrue(() => Boolean(container.querySelector('[data-kanji-writing-done]')), 24, 5000);

      // the walk left the writing slide (the next block — the reading exercise —
      // renders; the writing block is gone)
      await untilTrue(() => !container.querySelector('[data-kanji-writing-block]'), 24, 5000);
      expect(container.querySelector('[data-kanji-writing-block]'), 'the walk moved past the 国 slide').toBeNull();
    },
  );
});
