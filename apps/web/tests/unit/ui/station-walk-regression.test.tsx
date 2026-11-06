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
 * the い card starts at encounter.
 */
import { describe, expect, it, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, act, waitFor } from '@testing-library/react';
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
  it('the い card starts at encounter after the あ card completes (no state leak)', { timeout: 30000 }, async () => {
    const { container, findByRole } = renderStation();

    // --- あ card: encounter → demo
    const cta = await findByRole('button', { name: /بگذار یاد بگیرمش/ });
    vi.useFakeTimers();
    fireEvent.click(cta);
    for (let k = 0; k < 6; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      if (container.querySelector('[data-kana-stage="explain"]')) break;
    }
    expect(container.querySelector('[data-kana-stage="explain"]')).toBeTruthy();
    expect(container.querySelector('[data-kana-stage="explain"]')).toBeTruthy();
    vi.useRealTimers();
    const practiceCta = await findByRole('button', { name: /بریم تمرین/ });
    fireEvent.click(practiceCta);

    // --- guided: draw all three strokes of あ
    let svg = await waitFor(() => {
      const s = container.querySelector('svg[role="img"]');
      expect(s).not.toBeNull();
      return s as Element;
    });
    drawStroke(svg, A_DATA.medians[0]!);
    drawStroke(svg, A_DATA.medians[1]!);
    drawStroke(svg, A_DATA.medians[2]!);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1700));
    });
    expect(container.querySelector('[data-kana-stage="free"]')).toBeTruthy();

    // --- free: write あ from memory
    svg = await waitFor(() => {
      const s = container.querySelector('svg[role="img"]');
      expect(s).not.toBeNull();
      return s as Element;
    });
    drawStroke(svg, A_DATA.medians[0]!);
    drawStroke(svg, A_DATA.medians[1]!);
    drawStroke(svg, A_DATA.medians[2]!);

    // --- the walk advanced to the NEXT block; the next kana card (い) must
    //     be a FRESH instance at encounter — NOT the completed state of あ
    await waitFor(() => {
      const next = container.querySelector('[data-kana-stage]');
      expect(next).not.toBeNull();
    });
    const nextStage = container.querySelector('[data-kana-stage]')?.getAttribute('data-kana-stage');
    expect(nextStage, 'the next card starts at encounter — never the leaked done state').toBe('encounter');
    // and its glyph is い (the walk advanced exactly one block)
    expect(container.textContent).toContain('い');
    // no «نوشتن い یاد گرفته شد» without teaching
    expect(container.textContent).not.toContain('نوشتن い یاد گرفته شد');

    // the persisted stage for the NEXT card is encounter (not 'done')
    const snapshotKey = Object.keys(window.localStorage).find((k) => k.includes('walk'))!;
    const snapshot = JSON.parse(window.localStorage.getItem(snapshotKey)!) as {
      kanaCardStages: Record<string, string>;
    };
    const stages = Object.values(snapshot.kanaCardStages);
    expect(stages).not.toContain('done'); // あ's own persist stopped at 'free'
    expect(stages).toContain('encounter'); // い's fresh persist
  });
});
