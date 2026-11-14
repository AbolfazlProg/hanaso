// @vitest-environment jsdom
/**
 * HANASO — StationRunner walk regression tests (TASK-LEARNING-08 phase 2 / #117).
 *
 * THE BUG THIS FILE PINS (found in live production verification): BlockView
 * rendered <KanaCard> WITHOUT a key — consecutive kana-card blocks reuse the
 * SAME React instance (same type, same position), so the moment a card
 * completed and the walk advanced (onKanaWritingDone → setStep), the NEXT
 * card inherited the previous card's internal stage state ('done') and its
 * persist-effect wrote 'done' under the NEW block id — the い card rendered
 * «نوشتن い یاد گرفته شد» without ever being taught.
 *
 * The fix: key={block.id} on KanaCard/ExerciseSession — each block is a fresh
 * instance. This test drives the REAL StationRunner (real chapter content,
 * real engine, real staged flow) through the あ card end-to-end and asserts
 * the い card starts fresh at intro.
 */
import { describe, expect, it, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as React from 'react';

import { StationRunner } from '@/components/curriculum/station-runner';
import { getChapter } from '@/modules/curriculum/content';
import { toClientStation } from '@/modules/curriculum';
import { toClientExercise } from '@/modules/curriculum/grading';
import type { ClientExercise } from '@/modules/curriculum/grading';
import type { Chapter } from '@/modules/curriculum/types';

// StationRunner navigates via the App Router on station completion — jsdom has
// no router context; mock the hook (we stop the walk before that point).
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), forward: vi.fn() }),
}));

const webRoot = join(__dirname, '..', '..', '..');
const INDEX = readFileSync(join(webRoot, 'public', 'writing-data', 'index.json'), 'utf8');
const A_CHAR = readFileSync(join(webRoot, 'public', 'writing-data', 'あ.json'), 'utf8');
const I_CHAR = readFileSync(join(webRoot, 'public', 'writing-data', 'い.json'), 'utf8');
const A_DATA = JSON.parse(A_CHAR) as { medians: number[][][] };

const RECT = { left: 0, top: 0, width: 512, height: 512, x: 0, y: 0, right: 512, bottom: 512, toJSON: () => ({}) };
const cx = (x: number) => x / 2;
const cy = (y: number) => y / 2;

let rectSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  rectSpy = vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue(RECT as DOMRect);
});

afterAll(() => {
  rectSpy.mockRestore();
});

beforeEach(() => {
  const fetchMock = vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes('index.json')) return new Response(INDEX, { status: 200 });
    if (u.includes('%E3%81%82') || u.endsWith('/あ.json')) return new Response(A_CHAR, { status: 200 });
    if (u.includes('%E3%81%84') || u.endsWith('/い.json')) return new Response(I_CHAR, { status: 200 });
    return new Response('{}', { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function drawStroke(svg: Element, median: number[][]) {
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

/** Render the REAL stn-kana-h1 station (あ/い/う row) with real chapter content. */
function renderStation() {
  const chapter = getChapter('kana-foundation-01') as Chapter;
  const station = chapter.stations.find((s) => s.slug === 'stn-kana-h1')!;
  // the page resolves exerciseIds → chapter.exercises → toClientExercise
  const clientExercises: Record<string, ClientExercise> = {};
  for (const block of station.blocks) {
    if (block.kind !== 'exercise') continue;
    for (const id of block.exerciseIds) {
      const ex = (chapter.exercises as Record<string, never>)[id];
      if (ex) clientExercises[block.id] = toClientExercise(ex);
    }
  }
  return render(
    <StationRunner
      chapterSlug="kana-foundation-01"
      station={toClientStation(station)}
      chapter={{ words: chapter.words, expressions: chapter.expressions }}
      clientExercises={clientExercises}
      dialogue={{
        // stn-kana-h1 has no dialogue-dependent blocks before the kana cards —
        // an empty dialogue is honest for this walk
        lines: [],
        speakers: {},
      }}
      audioByLine={{}}
      audioAvailable={false}
    />,
  );
}

describe('StationRunner — consecutive kana cards are FRESH instances (walk regression #117)', () => {
  it('the い card starts fresh at intro after the あ card completes (no state leak)', { timeout: 30000 }, async () => {
    // fake timers BEFORE render — the v4 auto timeline starts the moment the
    // card mounts (owner final correction); switching timers mid-flight would
    // strand the in-flight intro loop.
    vi.useFakeTimers();
    const { container } = renderStation();

    // --- あ card: the intro auto-flows to the READY beat (Addendum-2 §4 — the
    //     ONE interactive stop), then the confirmation runs the teaching
    //     demo → explain → guided automatically.
    for (let k = 0; k < 16; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      if (container.querySelector('[data-kana-stage="ready"]')) break;
    }
    expect(container.querySelector('[data-kana-stage="ready"]'), 'intro auto-flowed to the ready beat').toBeTruthy();
    await act(async () => {
      fireEvent.click(container.querySelector('[data-ready-cta]')!);
    });
    for (let k = 0; k < 16; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      if (container.querySelector('[data-kana-stage="guided"]')) break;
    }
    expect(
      container.querySelector('[data-kana-stage="guided"]'),
      'after the single confirmation the flow is automatic',
    ).toBeTruthy();

    // --- guided: draw all three strokes of あ (synchronous pointer events)
    let svg = container.querySelector('svg[role="img"]');
    expect(svg, 'canvas present in guided').not.toBeNull();
    drawStroke(svg!, A_DATA.medians[0]!);
    drawStroke(svg!, A_DATA.medians[1]!);
    drawStroke(svg!, A_DATA.medians[2]!);
    // guided done → beat(1500) → free
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(container.querySelector('[data-kana-stage="free"]')).toBeTruthy();

    // --- free: write あ from memory in the same canvas (remounted by key)
    svg = container.querySelector('svg[role="img"]');
    expect(svg, 'canvas present in free').not.toBeNull();
    drawStroke(svg!, A_DATA.medians[0]!);
    drawStroke(svg!, A_DATA.medians[1]!);
    drawStroke(svg!, A_DATA.medians[2]!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    // --- the walk advanced to the NEXT block; the next kana card (い) must
    //     be a FRESH instance at intro — NOT the completed state of あ
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    const nextStage = container.querySelector('[data-kana-stage]')?.getAttribute('data-kana-stage');
    // Addendum-2 §4: a fresh card auto-flows intro → ready on its own — BOTH
    // are fresh states; the regression this guards against is the leaked
    // 'done'/'free' state of the PREVIOUS card.
    expect(
      ['intro', 'ready'].includes(nextStage ?? ''),
      'the next card starts fresh (intro/ready) — never the leaked done state',
    ).toBe(true);
    // and its glyph is い — in v4 the glyph lives INSIDE the canvas (aria-label)
    expect(container.querySelector('svg[aria-label*="い"]'), 'the い canvas is active').not.toBeNull();
    // no «نوشتن い یاد گرفته شد» without teaching
    expect(container.textContent).not.toContain('نوشتن い یاد گرفته شد');

    // the persisted stage for the NEXT card is encounter (not 'done')
    const snapshotKey = Object.keys(window.localStorage).find((k) => k.includes('walk'))!;
    const snapshot = JSON.parse(window.localStorage.getItem(snapshotKey)!) as {
      kanaCardStages: Record<string, string>;
    };
    const stages = Object.values(snapshot.kanaCardStages);
    expect(stages).not.toContain('done'); // あ's own persist stopped at 'free'
    // い's fresh persist (intro, or already auto-flowed to the ready beat)
    expect(
      stages.some((s) => s === 'intro' || s === 'ready'),
      'い persisted a FRESH stage — never done',
    ).toBe(true);
  });
});
