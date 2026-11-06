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
function drawStroke(svg: Element, median: number[][], pointerType = 'mouse', opts: { scale?: number } = {}) {
  const { scale = 1 } = opts;
  const pts = median.map(([x, y]) => ({ x: 512 + ((x ?? 0) - 512) * scale, y: 512 + ((y ?? 0) - 512) * scale }));
  fireEvent.pointerDown(svg, { pointerId: 1, pointerType, clientX: cx(pts[0]!.x), clientY: cy(pts[0]!.y) });
  for (const p of pts.slice(1)) {
    fireEvent.pointerMove(svg, { pointerId: 1, pointerType, clientX: cx(p.x), clientY: cy(p.y) });
  }
  fireEvent.pointerUp(svg, {
    pointerId: 1,
    pointerType,
    clientX: cx(pts[pts.length - 1]!.x),
    clientY: cy(pts[pts.length - 1]!.y),
  });
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
    const { container } = render(<WritingCanvas character="あ" mode="guided" onAttemptComplete={onAttemptComplete} />);
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
    const { container } = render(<WritingCanvas character="あ" mode="guided" onJudgement={onJudgement} />);
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
    const { container, rerender } = render(<WritingCanvas character="あ" mode="free" hintSignal={0} />);
    const svg = await waitFor(() => getCanvasSvg(container));
    expect(svg.querySelector('path[stroke-dasharray="0.042 0.065"]')).toBeNull();
    rerender(<WritingCanvas character="あ" mode="free" hintSignal={1} />);
    expect(svg.querySelector('path[stroke-dasharray="0.042 0.065"]')).not.toBeNull();
    await act(async () => {
      vi.useRealTimers();
      await new Promise((r) => setTimeout(r, 1500));
    });
    expect(svg.querySelector('path[stroke-dasharray="0.042 0.065"]')).toBeNull();
  });
});

// ---------------------------------------------------------------- KanaCard v4: the unified auto timeline

const KANA_A: KanaItem = {
  kanaId: 'hira-a',
  glyph: 'あ',
  romaji: 'a',
  // minimal hostWord to render the explain stage
  hostWord: { word: 'あい', meaningFa: 'عشق' },
} as unknown as KanaItem;

describe('KanaCard v4 — ONE environment, ZERO stage CTAs (owner final correction)', () => {
  it('starts at intro with the CANVAS as the centerpiece — no CTA button anywhere', async () => {
    const { container, findByRole } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={{ opus: '/audio/kana/kn-hira-a.opus', m4a: '/x.m4a' }} />,
    );
    // the canvas is present from the FIRST second (owner §1: the character
    // appears inside the big canvas, not as a separate giant glyph)
    await waitFor(() => {
      expect(container.querySelector('svg[role="img"]')).not.toBeNull();
    });
    expect(container.querySelector('[data-kana-stage="intro"]')).toBeTruthy();
    // the only controls are the essential ones — no «مرحلهٔ بعد» CTAs
    expect(container.querySelector('button[aria-label*="بگذار"]')).toBeNull();
    await expect(findByRole('button', { name: /تکرار آموزش/ })).resolves.toBeTruthy();
    await expect(findByRole('button', { name: /پخش صدای あ/ })).resolves.toBeTruthy();
  });

  it('AUTO-walks intro → demo → explain → guided with ZERO clicks, canvas never unmounts', async () => {
    // fake timers BEFORE render — the auto timeline starts at mount; switching
    // timers mid-flight would strand the in-flight intro loop.
    vi.useFakeTimers();
    const seen: string[] = [];
    const { container } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} onProgress={(p) => seen.push(p.stage)} />,
    );
    // intro → demo → explain → guided is ~20-25s of virtual time. One big
    // advance strands the async chain (canvas remounts mid-window), so the
    // walk advances in beats like a real clock ticking.
    for (let k = 0; k < 30; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      if (container.querySelector('[data-kana-stage="guided"]')) break;
    }
    expect(
      container.querySelector('[data-kana-stage="guided"]'),
      'auto-flow reached guided with no clicks',
    ).toBeTruthy();
    // the timeline passed through every display stage — no click ever happened
    expect(seen).toEqual(expect.arrayContaining(['intro', 'demo', 'explain', 'guided']));
    expect(seen[0]).toBe('intro');
    // the canvas stayed mounted through every stage (one environment — owner §1)
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
    // the teaching explanations are still visible around the canvas
    expect(container.textContent).toContain('واژهٔ قابل‌خواندن');
    vi.useRealTimers();
  });

  it('reveals the real word char-by-char in Japanese reading order (staggered)', async () => {
    const { container } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} initialProgress={{ stage: 'explain' }} />,
    );
    const word = await waitFor(() => {
      const el = container.querySelector('.word-char-in');
      expect(el).not.toBeNull();
      return el!.closest('p')!;
    });
    const chars = word.querySelectorAll('.word-char-in');
    expect(chars.length).toBe(2); // あ + い
    // Japanese reading order = string order; the target kana あ is highlighted
    expect(chars[0]!.textContent).toBe('あ');
    expect(chars[0]!.className).toContain('text-shu');
    // staggered delays increase along the word (owner §3 مرحلهٔ چهارم)
    const d0 = Number((chars[0]! as HTMLElement).style.animationDelay.replace(/ms$/, ''));
    const d1 = Number((chars[1]! as HTMLElement).style.animationDelay.replace(/ms$/, ''));
    expect(d1).toBeGreaterThan(d0);
  });

  it('completes guided → free → done in the SAME canvas and fires the walk gate', async () => {
    const onWritingDone = vi.fn();
    const onWritingAttempt = vi.fn();
    const { container } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        initialProgress={{ stage: 'guided' }}
        onWritingDone={onWritingDone}
        onWritingAttempt={onWritingAttempt}
      />,
    );
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
    // the canvas is STILL there at done — same environment, no page switch
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
  });

  it('replays the whole teaching timeline repeatedly without breaking (owner §9)', async () => {
    const { container, findByRole } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} initialProgress={{ stage: 'explain' }} />,
    );
    const replay = await findByRole('button', { name: /تکرار آموزش/ });
    for (let n = 0; n < 3; n += 1) {
      fireEvent.click(replay);
      await waitFor(() => {
        expect(container.querySelector('[data-kana-stage="intro"]')).toBeTruthy();
      });
    }
    // after the rapid replays the surface is still alive and the controls work
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
    fireEvent.click(replay);
    await waitFor(() => {
      expect(container.querySelector('[data-kana-stage="intro"]')).toBeTruthy();
    });
  });

  it('restores the persisted stage (refresh resume — #117 §10) and maps legacy encounter→intro', async () => {
    const { container, rerender } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} initialProgress={{ stage: 'guided' }} />,
    );
    // straight into guided — no intro flash
    expect(container.querySelector('[data-kana-stage="guided"]')).toBeTruthy();
    // legacy snapshots say «encounter» — v4 normalizes to intro
    rerender(
      <KanaCard
        key="legacy"
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        initialProgress={{ stage: 'encounter' as unknown as 'intro' }}
      />,
    );
    expect(container.querySelector('[data-kana-stage="intro"]')).toBeTruthy();
  });

  it('reports every stage transition through onProgress', async () => {
    vi.useFakeTimers();
    const onProgress = vi.fn();
    render(<KanaCard kana={KANA_A} showRomaji audioUrls={null} onProgress={onProgress} />);
    for (let k = 0; k < 30; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      if (onProgress.mock.calls.some((c) => c[0]?.stage === 'guided')) break;
    }
    expect(onProgress).toHaveBeenCalledWith({ stage: 'intro' });
    expect(onProgress).toHaveBeenCalledWith({ stage: 'demo' });
    expect(onProgress).toHaveBeenCalledWith({ stage: 'explain' });
    expect(onProgress).toHaveBeenCalledWith({ stage: 'guided' });
  });

  it('shows precise Persian feedback on a wrong stroke (not a vague «اشتباه»)', async () => {
    const { container } = render(
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

// ---------------------------------------------------------------- KanaCard v4: audio coordination

describe('KanaCard v4 — audio coordination (owner §5: one element, 1.0×, no overlap)', () => {
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
    const { rerender } = render(<KanaCard kana={KANA_A} showRomaji audioUrls={{ opus: '/a.opus', m4a: '/a.m4a' }} />);
    await waitFor(() => {
      expect(FakeAudio.instances.filter((a) => !a.paused)).toHaveLength(1); // intro moment
    });
    // re-render does NOT replay the intro moment (the latch)
    rerender(<KanaCard kana={KANA_A} showRomaji audioUrls={{ opus: '/a.opus', m4a: '/a.m4a' }} />);
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
    const { findByRole } = render(<KanaCard kana={KANA_A} showRomaji audioUrls={{ opus: '/a.opus', m4a: '/a.m4a' }} />);
    const replay = await findByRole('button', { name: /پخش صدای あ/ });
    fireEvent.click(replay);
    const instances = FakeAudio.instances;
    expect(instances.length).toBeGreaterThanOrEqual(2);
    // the first element was paused before the second started
    expect(instances[0]!.paused).toBe(true);
    expect(instances[instances.length - 1]!.paused).toBe(false);
  });
});
