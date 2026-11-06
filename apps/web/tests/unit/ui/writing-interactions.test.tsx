// @vitest-environment jsdom
/**
 * HANASO — WritingCanvas + KanaCard v3 INTERACTION tests (TASK-LEARNING-08
 * phase 2 / #117 §10).
 *
 * The owner's repeatability contract: «اجرای متوالی نمایش، توقف، تکرار و
 * تغییر مرحله نباید رابط را از کار بیندازد» — repeated demo replays, rapid
 * stage switches, mouse/touch/pen drawing, correct/wrong flows and resume
 * must all keep the surface alive. These tests drive the REAL components in
 * jsdom with pointer events mapped into char space, the REAL あ KanjiVG data,
 * and the REAL judging engine (no mocks of the logic under test).
 */
import { describe, expect, it, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, act, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as React from 'react';

import { WritingCanvas } from '@/components/writing/writing-canvas';
import { KanaCard } from '@/components/curriculum/kana-card';
import type { KanaItem } from '@/modules/curriculum/types';

const webRoot = join(__dirname, '..', '..', '..');
const INDEX = readFileSync(join(webRoot, 'public', 'writing-data', 'index.json'), 'utf8');
const A_CHAR = readFileSync(join(webRoot, 'public', 'writing-data', 'あ.json'), 'utf8');

/** Real あ medians in char space (used to draw faithfully). */
const A_DATA = JSON.parse(A_CHAR) as { strokes: string[]; medians: number[][][] };

// ---------------------------------------------------------------- test DOM setup

const RECT = { left: 0, top: 0, width: 512, height: 512, x: 0, y: 0, right: 512, bottom: 512, toJSON: () => ({}) };
/** char-space (1024) → client coords for the mocked 512px box. */
const cx = (x: number) => x / 2;
const cy = (y: number) => y / 2;

let rectSpy: ReturnType<typeof vi.spyOn>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeAll(() => {
  rectSpy = vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue(RECT as DOMRect);
});

afterAll(() => {
  rectSpy.mockRestore();
});

beforeEach(() => {
  fetchMock = vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes('index.json')) return new Response(INDEX, { status: 200 });
    if (u.includes('%E3%81%82') || u.endsWith('/あ.json')) return new Response(A_CHAR, { status: 200 });
    return new Response('{}', { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Draw one stroke along a median with the given pointer type. */
function drawStroke(
  svg: Element,
  median: number[][],
  pointerType = 'mouse',
  opts: { scale?: number } = {},
) {
  const { scale = 1 } = opts;
  const pts = median.map(([x, y]) => ({ x: 512 + ((x ?? 0) - 512) * scale, y: 512 + ((y ?? 0) - 512) * scale }));
  fireEvent.pointerDown(svg, { pointerId: 1, pointerType, clientX: cx(pts[0]!.x), clientY: cy(pts[0]!.y) });
  for (const p of pts.slice(1)) {
    fireEvent.pointerMove(svg, { pointerId: 1, pointerType, clientX: cx(p.x), clientY: cy(p.y) });
  }
  fireEvent.pointerUp(svg, { pointerId: 1, pointerType, clientX: cx(pts[pts.length - 1]!.x), clientY: cy(pts[pts.length - 1]!.y) });
}

function getCanvasSvg(container: HTMLElement): SVGSVGElement {
  const svg = container.querySelector('svg[role="img"]');
  expect(svg, 'canvas svg rendered').not.toBeNull();
  return svg as SVGSVGElement;
}

// ---------------------------------------------------------------- canvas: judging

describe('WritingCanvas — pointer input + judging (real engine, real data)', () => {
  it('accepts a faithful stroke drawn with a MOUSE and advances to stroke 2', async () => {
    const onJudgement = vi.fn();
    const { container } = render(<WritingCanvas character="あ" mode="guided" onJudgement={onJudgement} />);
    const svg = await waitFor(() => {
      const s = getCanvasSvg(container);
      expect(s.querySelectorAll('path').length).toBeGreaterThan(0);
      return s;
    });
    drawStroke(svg, A_DATA.medians[0]!, 'mouse');
    expect(onJudgement).toHaveBeenCalledTimes(1);
    const [judgement, state] = onJudgement.mock.calls[0]!;
    expect(['accepted', 'accepted_with_hint']).toContain(judgement.judge);
    expect(state.expectedIndex).toBe(1);
    expect(state.completed).toEqual([0]);
  });

  it('judges the SAME way for touch and pen (one pointer-events path)', async () => {
    for (const pointerType of ['touch', 'pen'] as const) {
      const onJudgement = vi.fn();
      const { container } = render(<WritingCanvas character="あ" mode="guided" onJudgement={onJudgement} />);
      const svg = await waitFor(() => getCanvasSvg(container));
      drawStroke(svg, A_DATA.medians[0]!, pointerType);
      expect(onJudgement, `${pointerType} produced a judgement`).toHaveBeenCalledTimes(1);
      expect(onJudgement.mock.calls[0]![0].judge).not.toBe('rejected');
      cleanup();
    }
  });

  it('rejects an accidental tap with the incomplete reason + Persian feedback', async () => {
    const onJudgement = vi.fn();
    const { container } = render(<WritingCanvas character="あ" mode="guided" onJudgement={onJudgement} />);
    const svg = await waitFor(() => getCanvasSvg(container));
    fireEvent.pointerDown(svg, { pointerId: 1, pointerType: 'mouse', clientX: 150, clientY: 155 });
    fireEvent.pointerUp(svg, { pointerId: 1, pointerType: 'mouse', clientX: 152, clientY: 156 });
    expect(onJudgement).toHaveBeenCalledTimes(1);
    const [judgement] = onJudgement.mock.calls[0]!;
    expect(judgement.judge).toBe('rejected');
    expect(judgement.reason).toBe('incomplete_short');
    expect(judgement.feedbackFa).toContain('ناقص');
  });

  it('rejects a REVERSED stroke with the direction reason', async () => {
    const onJudgement = vi.fn();
    const { container } = render(<WritingCanvas character="あ" mode="guided" onJudgement={onJudgement} />);
    const svg = await waitFor(() => getCanvasSvg(container));
    drawStroke(svg, [...A_DATA.medians[0]!].reverse());
    const [judgement] = onJudgement.mock.calls[0]!;
    expect(judgement.judge).toBe('rejected');
    expect(judgement.reason).toBe('direction');
  });

  it('completes the whole あ attempt and fires onAttemptComplete (guided, all 3 strokes)', async () => {
    const onAttemptComplete = vi.fn();
    const { container } = render(
      <WritingCanvas character="あ" mode="guided" onAttemptComplete={onAttemptComplete} />,
    );
    const svg = await waitFor(() => getCanvasSvg(container));
    drawStroke(svg, A_DATA.medians[0]!);
    drawStroke(svg, A_DATA.medians[1]!);
    drawStroke(svg, A_DATA.medians[2]!);
    expect(onAttemptComplete).toHaveBeenCalledTimes(1);
    const [state] = onAttemptComplete.mock.calls[0]!;
    expect(state.completed).toEqual([0, 1, 2]);
    expect(state.firstTry).toBe(3);
  });

  it('never accepts input after the attempt completed (no ghost strokes)', async () => {
    const onJudgement = vi.fn();
    const { container } = render(
      <WritingCanvas character="あ" mode="guided" onJudgement={onJudgement} />,
    );
    const svg = await waitFor(() => getCanvasSvg(container));
    drawStroke(svg, A_DATA.medians[0]!);
    drawStroke(svg, A_DATA.medians[1]!);
    drawStroke(svg, A_DATA.medians[2]!);
    expect(onJudgement).toHaveBeenCalledTimes(3);
    // the attempt is done — extra drawing is ignored
    drawStroke(svg, A_DATA.medians[0]!);
    expect(onJudgement).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------- canvas: repeatability

describe('WritingCanvas — repeatability (rapid interactions never kill the surface)', () => {
  it('survives rapid mode switches mid-draw', async () => {
    const { container, rerender } = render(<WritingCanvas character="あ" mode="guided" />);
    const svg = await waitFor(() => getCanvasSvg(container));
    // start drawing stroke 1, then switch modes rapidly without finishing
    fireEvent.pointerDown(svg, { pointerId: 1, pointerType: 'mouse', clientX: cx(291), clientY: cy(310) });
    for (const mode of ['demo', 'guided', 'free', 'demo', 'free'] as const) {
      rerender(<WritingCanvas character="あ" mode={mode} />);
    }
    expect(getCanvasSvg(container)).toBeTruthy(); // surface still alive
  });

  it('restarts the demo repeatedly without breaking (3 rapid restarts)', async () => {
    vi.useFakeTimers();
    const onDemoStrokeStart = vi.fn();
    const { container, rerender } = render(
      <WritingCanvas character="あ" mode="demo" restartSignal={0} onDemoStrokeStart={onDemoStrokeStart} />,
    );
    // wait for data + first stroke start (async fetch chain + 350ms intro beat)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(onDemoStrokeStart).toHaveBeenCalledWith(0);
    // rapid restarts — each must cancel the previous loop cleanly
    for (let n = 1; n <= 3; n += 1) {
      rerender(<WritingCanvas character="あ" mode="demo" restartSignal={n} onDemoStrokeStart={onDemoStrokeStart} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12000);
    });
    // the final demo run completed all three strokes exactly once (last run)
    expect(onDemoStrokeStart).toHaveBeenLastCalledWith(2);
    expect(getCanvasSvg(container)).toBeTruthy();
  });

  it('a hint flash shows the dashed guide in FREE mode, then clears', async () => {
    const { container, rerender } = render(
      <WritingCanvas character="あ" mode="free" hintSignal={0} />,
    );
    const svg = await waitFor(() => getCanvasSvg(container));
    expect(svg.querySelector('path[stroke-dasharray="0.055 0.045"]')).toBeNull();
    rerender(<WritingCanvas character="あ" mode="free" hintSignal={1} />);
    expect(svg.querySelector('path[stroke-dasharray="0.055 0.045"]')).not.toBeNull();
    await act(async () => {
      vi.useRealTimers();
      await new Promise((r) => setTimeout(r, 1500));
    });
    expect(svg.querySelector('path[stroke-dasharray="0.055 0.045"]')).toBeNull();
  });
});

// ---------------------------------------------------------------- KanaCard v3: the staged walk

const KANA_A: KanaItem = {
  kanaId: 'hira-a',
  glyph: 'あ',
  romaji: 'a',
  // minimal hostWord to render the explain stage
  hostWord: { word: 'あい', meaningFa: 'عشق' },
} as unknown as KanaItem;

describe('KanaCard v3 — the staged experience end-to-end', () => {
  it('starts at encounter with the glyph ALONE, its sound button and the CTA', async () => {
    const { container, findByRole } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={{ opus: '/audio/kana/kn-hira-a.opus', m4a: '/x.m4a' }} />,
    );
    expect(await findByRole('button', { name: /بگذار یاد بگیرمش/ })).toBeTruthy();
    expect(container.querySelector('[data-kana-stage="encounter"]')).toBeTruthy();
    // no canvas yet — stage 1 is glyph + sound, nothing else
    expect(container.querySelector('svg[role="img"]')).toBeNull();
    // audio affordance exists and the rate label no longer says 0.8×
    expect(container.textContent).not.toContain('۰٫۸');
  });

  it('walks the full path: encounter → demo → explain → guided → free → done + onWritingDone', async () => {
    const onWritingDone = vi.fn();
    const onProgress = vi.fn();
    const onWritingAttempt = vi.fn();
    const { container, findByRole } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={{ opus: '/audio/kana/kn-hira-a.opus', m4a: '/x.m4a' }}
        onWritingDone={onWritingDone}
        onProgress={onProgress}
        onWritingAttempt={onWritingAttempt}
      />,
    );
    const cta = await findByRole('button', { name: /بگذار یاد بگیرمش/ });
    // fake timers ONLY for the demo sequence (RTL waits need real timers)
    vi.useFakeTimers();
    fireEvent.click(cta);
    expect(container.querySelector('[data-kana-stage="demo"]')).toBeTruthy();
    // demo runs through the three strokes (fake timers)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    // demo completed → explain stage with the gradual-reveal content
    expect(container.querySelector('[data-kana-stage="explain"]')).toBeTruthy();
    expect(container.textContent).toContain('واژهٔ قابل‌خواندن');

    // back to real timers for the interactive part of the walk
    vi.useRealTimers();
    const practiceCta = await findByRole('button', { name: /بریم تمرین/ });
    fireEvent.click(practiceCta);
    expect(container.querySelector('[data-kana-stage="guided"]')).toBeTruthy();

    // draw all three strokes faithfully (real timers for pointer flow)
    const svg = await waitFor(() => {
      const s = container.querySelector('svg[role="img"]');
      expect(s).not.toBeNull();
      return s as Element;
    });
    drawStroke(svg, A_DATA.medians[0]!);
    drawStroke(svg, A_DATA.medians[1]!);
    drawStroke(svg, A_DATA.medians[2]!);
    // guided done → auto-advance to free after ~1.5s
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1700));
    });
    expect(container.querySelector('[data-kana-stage="free"]')).toBeTruthy();

    // free writing: fresh canvas (remounted by key) — draw again
    const svg2 = await waitFor(() => {
      const s = container.querySelector('svg[role="img"]');
      expect(s).not.toBeNull();
      return s as Element;
    });
    drawStroke(svg2, A_DATA.medians[0]!);
    drawStroke(svg2, A_DATA.medians[1]!);
    drawStroke(svg2, A_DATA.medians[2]!);
    await waitFor(() => {
      expect(container.querySelector('[data-kana-stage="done"]')).toBeTruthy();
    });
    expect(onWritingDone).toHaveBeenCalledTimes(1);
    expect(onWritingAttempt).toHaveBeenCalledTimes(2); // guided + free
  });

  it('restores the persisted stage (refresh resume — #117 §10)', async () => {
    const { container } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        initialProgress={{ stage: 'guided' }}
      />,
    );
    // straight into guided — no encounter flash
    expect(container.querySelector('[data-kana-stage="guided"]')).toBeTruthy();
    expect(container.querySelector('[data-kana-stage="encounter"]')).toBeNull();
  });

  it('reports every stage transition through onProgress', async () => {
    const onProgress = vi.fn();
    const { findByRole } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} onProgress={onProgress} />,
    );
    const cta = await findByRole('button', { name: /بگذار یاد بگیرمش/ });
    fireEvent.click(cta);
    await waitFor(() => {
      expect(onProgress).toHaveBeenCalledWith({ stage: 'demo' });
    });
  });

  it('shows precise Persian feedback on a wrong stroke (not a vague «اشتباه»)', async () => {
    const { container, findByRole } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} initialProgress={{ stage: 'guided' }} />,
    );
    const svg = await waitFor(() => {
      const s = container.querySelector('svg[role="img"]');
      expect(s).not.toBeNull();
      return s as Element;
    });
    // an accidental tap → incomplete feedback in Persian
    fireEvent.pointerDown(svg, { pointerId: 1, pointerType: 'mouse', clientX: 150, clientY: 155 });
    fireEvent.pointerUp(svg, { pointerId: 1, pointerType: 'mouse', clientX: 152, clientY: 156 });
    await waitFor(() => {
      const feedback = container.querySelector('[data-writing-feedback]');
      expect(feedback?.textContent).toContain('ناقص');
    });
  });
});

// ---------------------------------------------------------------- KanaCard v3: audio coordination

describe('KanaCard v3 — audio coordination (#117 §5: one element, 1.0×, no overlap)', () => {
  class FakeAudio {
    static instances: FakeAudio[] = [];
    src: string;
    playbackRate = 1;
    paused = true;
    constructor(src: string) {
      this.src = src;
      FakeAudio.instances.push(this);
    }
    addEventListener() {}
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }

  beforeEach(() => {
    FakeAudio.instances = [];
    vi.stubGlobal('Audio', FakeAudio);
  });

  it('plays exactly once per defined moment and never twice for the same moment', async () => {
    const { findByRole, rerender } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={{ opus: '/a.opus', m4a: '/a.m4a' }} />,
    );
    await findByRole('button', { name: /بگذار یاد بگیرمش/ });
    // encounter moment fired once
    expect(FakeAudio.instances.filter((a) => !a.paused)).toHaveLength(1);
    // re-render does NOT replay the encounter moment (the latch)
    rerender(
      <KanaCard kana={KANA_A} showRomaji audioUrls={{ opus: '/a.opus', m4a: '/a.m4a' }} />,
    );
    expect(FakeAudio.instances).toHaveLength(1);
  });

  it('plays at exactly 1.0× playback rate (never 0.8×)', async () => {
    render(<KanaCard kana={KANA_A} showRomaji audioUrls={{ opus: '/a.opus', m4a: '/a.m4a' }} />);
    await waitFor(() => {
      expect(FakeAudio.instances.length).toBeGreaterThanOrEqual(1);
    });
    expect(FakeAudio.instances.every((a) => a.playbackRate === 1)).toBe(true);
  });

  it('stops the previous element before playing again (no overlap)', async () => {
    const { findByRole } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={{ opus: '/a.opus', m4a: '/a.m4a' }} />,
    );
    const replay = await findByRole('button', { name: /پخش صدای あ/ });
    fireEvent.click(replay);
    const instances = FakeAudio.instances;
    expect(instances.length).toBeGreaterThanOrEqual(2);
    // the first element was paused before the second started
    expect(instances[0]!.paused).toBe(true);
    expect(instances[instances.length - 1]!.paused).toBe(false);
  });
});
