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
import { resetAudioCacheForTests } from '@/modules/audio/client-cache';
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
    // serve ANY /writing-data/<char>.json from the real shipped files
    const wd = u.match(/\/writing-data\/([^/?]+)\.json$/);
    if (wd) {
      try {
        const body = readFileSync(
          join(webRoot, 'public', 'writing-data', decodeURIComponent(wd[1]!) + '.json'),
          'utf8',
        );
        return new Response(body, { status: 200 });
      } catch {
        return new Response('{}', { status: 404 });
      }
    }
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

/**
 * Addendum-5 §2 — wait for an accepted stroke's MORPH to settle: the user's
 * own ink is corrected IN PLACE into the exact standard `d` (never erased
 * and re-drawn from the start). In jsdom rAF fires on ~16ms timers, so the
 * ~560ms morph settles well within the waitFor window.
 */
async function waitForMorphSettled(container: HTMLElement, index: number, standardD: string) {
  await waitFor(
    () => {
      const p = container.querySelector(`path[data-std-stroke="${index}"]`);
      expect(p, `standard stroke ${index} present`).not.toBeNull();
      expect(p!.getAttribute('d'), `stroke ${index} settles to the exact standard d`).toBe(standardD);
      expect(p!.getAttribute('data-morphing'), `stroke ${index} finished morphing`).toBeNull();
    },
    { timeout: 4000, interval: 60 },
  );
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

/** Addendum-2 §3: う is the owner's exact example — it must read «او», not "u". */
const KANA_U: KanaItem = {
  kanaId: 'hira-u',
  glyph: 'う',
  romaji: 'u',
  hostWord: { word: 'うえ', meaningFa: 'بالا / رو' },
} as unknown as KanaItem;

describe('KanaCard v4 — ONE environment, ZERO stage CTAs (owner final correction)', () => {
  it('starts at intro with the CANVAS as the centerpiece — no CTA button anywhere', async () => {
    const { container, findByRole } = render(
      <KanaCard
        wordAudioUrls={null}
        kana={KANA_A}
        showRomaji
        audioUrls={{ opus: '/audio/kana/kn-hira-a.opus', m4a: '/x.m4a' }}
      />,
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

  it('auto-flows intro (numbered teaching) → ready, HOLDS, then guided after ONE confirmation (A3 §5)', async () => {
    // fake timers BEFORE render — the auto timeline starts at mount; switching
    // timers mid-flight would strand the in-flight intro loop.
    vi.useFakeTimers();
    const seen: string[] = [];
    const { container } = render(
      <KanaCard
        wordAudioUrls={null}
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        onProgress={(p) => seen.push(p.stage)}
      />,
    );
    // the intro (glyph inks itself in) runs on its own and lands on the READY
    // beat — the ONE interactive stop of the whole card (owner Addendum-2 §4).
    for (let k = 0; k < 30; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      if (container.querySelector('[data-kana-stage="ready"]')) break;
    }
    expect(container.querySelector('[data-kana-stage="ready"]'), 'intro auto-flowed to ready').toBeTruthy();
    // the ready beat HOLDS — it never auto-advances without the user
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15000);
    });
    expect(container.querySelector('[data-kana-stage="ready"]'), 'ready waits for the user (§4)').toBeTruthy();
    expect(container.querySelector('[data-ready-cta]'), 'the «فهمیدم، شروع کنیم» CTA is there').toBeTruthy();
    // ONE click — everything after it is fully automatic, same environment
    await act(async () => {
      fireEvent.click(container.querySelector('[data-ready-cta]')!);
    });
    for (let k = 0; k < 30; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      if (container.querySelector('[data-kana-stage="guided"]')) break;
    }
    expect(
      container.querySelector('[data-kana-stage="guided"]'),
      'after the single confirmation the flow is fully automatic',
    ).toBeTruthy();
    // v5 (A3 §5): the numbered teaching pass IS the intro — demo/explain are
    // merged into it; after the ONE confirmation practice starts directly
    expect(seen).toEqual(expect.arrayContaining(['intro', 'ready', 'guided']));
    expect(seen[0]).toBe('intro');
    expect(seen).not.toContain('explain');
    // the canvas stayed mounted through every stage (one environment — owner §1)
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
    // the teaching explanations are visible AROUND the canvas while it teaches (A3 §5.4)
    expect(container.textContent).toContain('واژهٔ قابل‌خواندن');
    vi.useRealTimers();
  });

  it('reveals the real word char-by-char in Japanese reading order (staggered)', async () => {
    const { container } = render(
      <KanaCard wordAudioUrls={null} kana={KANA_A} showRomaji audioUrls={null} initialProgress={{ stage: 'ready' }} />,
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
        wordAudioUrls={null}
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
    // guided done → the review beat (configurable ~1.1s, Addendum-2 §2) → free
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
    // Addendum-2 §2: the free completion holds the review beat (~1.1s) BEFORE
    // done + the walk gate — waitFor's default 1s window is too tight.
    await waitFor(
      () => {
        expect(container.querySelector('[data-kana-stage="done"]')).toBeTruthy();
      },
      { timeout: 4000 },
    );
    expect(onWritingDone).toHaveBeenCalledTimes(1);
    expect(onWritingAttempt).toHaveBeenCalledTimes(2); // guided + free
    // the canvas is STILL there at done — same environment, no page switch
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
  });

  it('«تکرار آموزش» replays the numbered animation IN PLACE — stage never resets (A3 §2)', async () => {
    const { container, findByRole } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} wordAudioUrls={null} initialProgress={{ stage: 'ready' }} />,
    );
    const replay = await findByRole('button', { name: /تکرار آموزش/ });
    fireEvent.click(replay);
    // the canvas enters the replay state and the STAGE STAYS (no reset — §2)
    await waitFor(() => {
      expect(container.querySelector('svg[data-replaying="true"]')).toBeTruthy();
    });
    expect(container.querySelector('[data-kana-stage="ready"]'), 'stage must NOT reset').toBeTruthy();
    // the button is disabled while the animation runs (rapid-click guard — §2)
    expect((replay as HTMLButtonElement).disabled).toBe(true);
    // after the teaching pass finishes the canvas returns to its stage state
    await waitFor(
      () => {
        expect(container.querySelector('svg[data-replaying="true"]')).toBeNull();
      },
      { timeout: 20000 },
    );
    expect((replay as HTMLButtonElement).disabled).toBe(false);
    expect(container.querySelector('[data-kana-stage="ready"]')).toBeTruthy();
    // repeated replays keep working — the surface never dies
    for (let n = 0; n < 2; n += 1) {
      fireEvent.click(replay);
      await waitFor(() => {
        expect(container.querySelector('svg[data-replaying="true"]')).toBeTruthy();
      });
      await waitFor(
        () => {
          expect(container.querySelector('svg[data-replaying="true"]')).toBeNull();
        },
        { timeout: 20000 },
      );
    }
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
  }, 30000);

  it('restores the persisted stage (refresh resume — #117 §10) and maps legacy encounter→intro', async () => {
    const { container, rerender } = render(
      <KanaCard wordAudioUrls={null} kana={KANA_A} showRomaji audioUrls={null} initialProgress={{ stage: 'guided' }} />,
    );
    // straight into guided — no intro flash
    expect(container.querySelector('[data-kana-stage="guided"]')).toBeTruthy();
    // legacy snapshots say «encounter» — v4 normalizes to intro
    rerender(
      <KanaCard
        wordAudioUrls={null}
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
    const { container } = render(
      <KanaCard wordAudioUrls={null} kana={KANA_A} showRomaji audioUrls={null} onProgress={onProgress} />,
    );
    // intro auto-flows to the ready beat, then the ONE confirmation (Addendum-2 §4)
    for (let k = 0; k < 30; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      if (container.querySelector('[data-kana-stage="ready"]')) break;
    }
    await act(async () => {
      fireEvent.click(container.querySelector('[data-ready-cta]')!);
    });
    for (let k = 0; k < 30; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      if (onProgress.mock.calls.some((c) => c[0]?.stage === 'guided')) break;
    }
    expect(onProgress).toHaveBeenCalledWith({ stage: 'intro' });
    expect(onProgress).toHaveBeenCalledWith({ stage: 'ready' });
    expect(onProgress).toHaveBeenCalledWith({ stage: 'guided' });
  });

  it('shows precise Persian feedback on a wrong stroke (not a vague «اشتباه»)', async () => {
    const { container } = render(
      <KanaCard wordAudioUrls={null} kana={KANA_A} showRomaji audioUrls={null} initialProgress={{ stage: 'guided' }} />,
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

// ------------------------------------------------- Addendum-2 §1/§2/§3: success sample + review beat + Persian-first

describe('KanaCard v4 — Addendum-2 final correction (§1 success sample · §2 review beat · §3 Persian-first)', () => {
  it('§13+A5§2: EACH accepted stroke MORPHES from the user’s own ink into the PRECISE standard form — per stroke, in place, never re-drawn', async () => {
    const { container } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} wordAudioUrls={null} initialProgress={{ stage: 'guided' }} />,
    );
    const svg = await waitFor(() => getCanvasSvg(container));
    // stroke 1 accepted → the paper keeps THE USER'S OWN LINE right now — a
    // morph is running (data-morphing), NOT the standard d, NOT a fade-out
    drawStroke(svg, A_DATA.medians[0]!);
    const std1 = container.querySelectorAll('path[data-std-stroke]');
    expect(std1.length).toBe(1);
    expect(std1[0]!.getAttribute('data-morphing')).toBe('true');
    expect(std1[0]!.getAttribute('d')).not.toBe(A_DATA.strokes[0]);
    // …and it gently settles into the EXACT standard stroke 1
    await waitForMorphSettled(container, 0, A_DATA.strokes[0]!);
    // stroke 2 accepted → morphs too, while stroke 1 rests UNTOUCHED
    drawStroke(svg, A_DATA.medians[1]!);
    expect(container.querySelectorAll('path[data-std-stroke]').length).toBe(2);
    expect(container.querySelector('path[data-std-stroke="0"]')!.getAttribute('d')).toBe(A_DATA.strokes[0]);
    expect(container.querySelector('path[data-std-stroke="1"]')!.getAttribute('data-morphing')).toBe('true');
    await waitForMorphSettled(container, 1, A_DATA.strokes[1]!);
    // completing the attempt adds the final stroke — same in-place morph (the
    // settle itself is not awaited here: the ~1.1s review beat then clears the
    // paper for the free attempt, which races the settle on slow jsdom runners)
    drawStroke(svg, A_DATA.medians[2]!);
    expect(container.querySelectorAll('path[data-std-stroke]').length).toBe(3);
    expect(container.querySelector('path[data-std-stroke="2"]')!.getAttribute('data-morphing')).toBe('true');
  }, 30000);

  it('§13 (resilience): a REJECTED stroke never wipes the accepted standard strokes', async () => {
    const { container } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} wordAudioUrls={null} initialProgress={{ stage: 'guided' }} />,
    );
    const svg = await waitFor(() => getCanvasSvg(container));
    drawStroke(svg, A_DATA.medians[0]!); // accepted → morphs into standard stroke 0
    await waitForMorphSettled(container, 0, A_DATA.strokes[0]!);
    // a bad stroke on stroke 2 (an accidental tap) → rejected with feedback
    fireEvent.pointerDown(svg, { pointerId: 1, pointerType: 'mouse', clientX: 150, clientY: 155 });
    fireEvent.pointerUp(svg, { pointerId: 1, pointerType: 'mouse', clientX: 152, clientY: 156 });
    await waitFor(() => {
      expect(container.querySelector('[data-writing-feedback]')?.textContent).toContain('ناقص');
    });
    // the accepted standard stroke SURVIVED the mistake (§13: «ضربه‌های درست حفظ شوند»)
    expect(container.querySelectorAll('path[data-std-stroke]').length).toBe(1);
    expect(container.querySelector('path[data-std-stroke="0"]')!.getAttribute('d')).toBe(A_DATA.strokes[0]);
  }, 20000);

  it('§13 (transition): guided → free clears the paper SOFTLY (accepted ink cross-fades, no flash)', async () => {
    const { container } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} wordAudioUrls={null} initialProgress={{ stage: 'guided' }} />,
    );
    const svg = await waitFor(() => getCanvasSvg(container));
    drawStroke(svg, A_DATA.medians[0]!);
    drawStroke(svg, A_DATA.medians[1]!);
    drawStroke(svg, A_DATA.medians[2]!);
    // review beat → free (from memory): the standard strokes fade out softly
    await waitFor(
      () => {
        expect(container.querySelector('[data-kana-stage="free"]')).toBeTruthy();
      },
      { timeout: 4000 },
    );
    // the soft-clear paths appear post-commit (passive effect) and fade out —
    // poll for them within their CLEAR_FADE window instead of asserting blind
    await waitFor(
      () => {
        expect(container.querySelectorAll('path[data-ink-clearing]').length).toBe(A_DATA.strokes.length);
      },
      { timeout: 2000, interval: 40 },
    );
    expect(container.querySelectorAll('path[data-std-stroke]').length).toBe(0);
    // the same canvas element is still there (§3: no unmount, no flash)
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
  });

  it('§13 (guard): a PENDING stroke never shows its standard form before acceptance', async () => {
    const { container } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} wordAudioUrls={null} initialProgress={{ stage: 'free' }} />,
    );
    const svg = await waitFor(() => getCanvasSvg(container));
    drawStroke(svg, A_DATA.medians[0]!);
    drawStroke(svg, A_DATA.medians[1]!);
    // strokes 0 and 1 are accepted (their standard forms rest) — but stroke 2
    // must NOT be on the paper before it is drawn and validated
    expect(container.querySelector('path[data-std-stroke="2"]')).toBeNull();
    expect(container.querySelectorAll('path[data-std-stroke]').length).toBe(2);
  });

  it('§2: the review beat is the configured pause — the walk gate fires AFTER it, not instantly', async () => {
    vi.useFakeTimers();
    const onWritingDone = vi.fn();
    const { container } = render(
      <KanaCard
        wordAudioUrls={null}
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        initialProgress={{ stage: 'free' }}
        onWritingDone={onWritingDone}
      />,
    );
    // let the async data fetch resolve (microtasks — no waitFor under fake timers)
    for (let k = 0; k < 20 && !container.querySelector('svg[role="img"]'); k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
    }
    const svg = getCanvasSvg(container);
    drawStroke(svg, A_DATA.medians[0]!);
    drawStroke(svg, A_DATA.medians[1]!);
    drawStroke(svg, A_DATA.medians[2]!);
    // the review beat (EXPERIENCE.kanaReviewPauseMs = 1100) holds the gate
    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });
    expect(onWritingDone).not.toHaveBeenCalled();
    expect(container.querySelector('[data-kana-stage="free"]')).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(onWritingDone).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-kana-stage="done"]')).toBeTruthy();
    vi.useRealTimers();
  });

  it('§8: the reading shows Persian BIG + Latin small, side by side — «او» | u (A3 §8)', async () => {
    const { container } = render(<KanaCard kana={KANA_U} showRomaji audioUrls={null} wordAudioUrls={null} />);
    const section = container.querySelector('[data-kana-stage]');
    expect(section).not.toBeNull();
    // the aria label speaks Persian — «او» leads, never the Latin 'u'
    expect(section!.getAttribute('aria-label')).toContain('او');
    expect(section!.getAttribute('aria-label')).not.toMatch(/^[a-z]/);
    // the reading card: the BIG element is the Persian pronunciation…
    const card = container.querySelector('[data-reading-card]');
    expect(card).not.toBeNull();
    const persian = card!.querySelector('span.text-h3');
    expect(persian?.textContent).toContain('او');
    // …and the Latin complement sits RIGHT BESIDE it, small (never leading)
    const latin = card!.querySelector('span.font-mono');
    expect(latin?.textContent).toBe('u');
    expect(latin!.className).not.toContain('text-h3');
    // the reading format «فارسی | لاتین» is visible as a pair
    expect(card!.textContent).toContain('|');
    // the collapsed attribution no longer carries a romaji line (A3 §12)
    const details = container.querySelector('details');
    expect(details?.textContent).not.toContain('romaji:');
  });

  it('§11: NO «پیش‌نویس / بازبینی انسانی» badge — a draft mnemonic is never shown as final content', async () => {
    const { container } = render(<KanaCard kana={KANA_A} showRomaji audioUrls={null} wordAudioUrls={null} />);
    await waitFor(() => {
      expect(container.querySelector('svg[role="img"]')).not.toBeNull();
    });
    // the ugly review badge is gone from the learner UI entirely
    expect(container.textContent).not.toContain('پیش‌نویس');
    expect(container.textContent).not.toContain('بازبینی انسانی');
    // the (still-draft) mnemonic STORY is not presented as final content
    const teaching = container.textContent ?? '';
    expect(teaching).not.toContain('A لاتین با یک قلاب'); // hira-a draft story
  });

  it('§12: attribution is ONE short license line — no engine/tech names in the teaching space', async () => {
    const { container } = render(<KanaCard kana={KANA_A} showRomaji audioUrls={null} wordAudioUrls={null} />);
    await waitFor(() => {
      expect(container.querySelector('svg[role="img"]')).not.toBeNull();
    });
    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    const text = details!.textContent ?? '';
    // the two REQUIRED credits stay (license obligations — never removed)
    expect(text).toContain('KanjiVG');
    expect(text).toContain('CC BY-SA 3.0');
    expect(text).toContain('VOICEVOX:ぞん子');
    expect(details!.querySelector('a[href="/writing-data/licenses/README-KanjiVG.md"]')).not.toBeNull();
    // the privacy sentence and the technical romaji line moved out (A3 §12)
    expect(text).not.toContain('مسیر قلم شما هرگز');
    expect(text).not.toContain('romaji:');
  });
});

describe('KanaCard v5 — audio coordination (A3 §9 normal⇄slow + §10 one cached element)', () => {
  class FakeAudio {
    static instances: FakeAudio[] = [];
    src: string;
    playbackRate = 1;
    preservesPitch = false;
    paused = true;
    currentTime = 0;
    preload = '';
    onerror: (() => void) | null = null;
    constructor(src: string) {
      this.src = src;
      FakeAudio.instances.push(this);
    }
    addEventListener() {}
    load() {}
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
    resetAudioCacheForTests(); // the element cache is module-level — start clean
    vi.stubGlobal('Audio', FakeAudio);
  });

  it('§10: ONE element per asset — repeated plays NEVER re-download (no new Audio)', async () => {
    const { rerender } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={{ opus: '/a.opus', m4a: '/a.m4a' }} wordAudioUrls={null} />,
    );
    await waitFor(() => {
      expect(FakeAudio.instances.filter((a) => !a.paused)).toHaveLength(1); // intro moment
    });
    // re-render does NOT replay the intro moment (the latch) nor rebuild the element
    rerender(<KanaCard kana={KANA_A} showRomaji audioUrls={{ opus: '/a.opus', m4a: '/a.m4a' }} wordAudioUrls={null} />);
    expect(FakeAudio.instances).toHaveLength(1);
  });

  it('§9: the speed control cycles عادی 1.0× → آهسته 0.7× → عادی … with pitch preserved', async () => {
    const { findByRole, container } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={{ opus: '/a.opus', m4a: '/a.m4a' }} wordAudioUrls={null} />,
    );
    const btn = (await findByRole('button', { name: /پخش صدای あ/ })) as HTMLButtonElement;
    // first click: normal 1.0× (owner §9: اولین کلیک = سرعت عادی)
    fireEvent.click(btn);
    const el = FakeAudio.instances[0]!;
    expect(el.playbackRate).toBe(1);
    expect(el.paused).toBe(false);
    expect(el.preservesPitch).toBe(true);
    expect(btn.querySelector('span')!.textContent).toBe('عادی');
    // second click: slow 0.7× — pitch PRESERVED (never a deep/unnatural voice)
    fireEvent.click(btn);
    expect(FakeAudio.instances).toHaveLength(1); // same cached element (§10)
    expect(el.playbackRate).toBe(0.7);
    expect(el.preservesPitch).toBe(true);
    expect(btn.querySelector('span')!.textContent).toBe('آهسته');
    expect(btn.getAttribute('data-audio-mode')).toBe('slow');
    // third click: back to normal — the cycle continues
    fireEvent.click(btn);
    expect(el.playbackRate).toBe(1);
    expect(btn.getAttribute('data-audio-mode')).toBe('normal');
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
  });

  it('§9: the HOST WORD has its own audio control (independent asset, same cycle)', async () => {
    const { container, findByRole } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        wordAudioUrls={{ opus: '/audio/hostwords/%E3%81%82%E3%81%84.opus', m4a: '/w.m4a' }}
      />,
    );
    const wordBtn = (await findByRole('button', { name: /پخش صدای واژهٔ/ })) as HTMLButtonElement;
    expect(wordBtn.getAttribute('data-audio-mode')).toBe('normal');
    fireEvent.click(wordBtn);
    const el = FakeAudio.instances.find((a) => a.src.includes('hostwords'));
    expect(el, 'the word plays its OWN file — never the character audio').toBeTruthy();
    expect(el!.playbackRate).toBe(1);
    fireEvent.click(wordBtn);
    expect(el!.playbackRate).toBe(0.7);
    // the word card is real: word + romaji + meaning (§8 + §9)
    const wordCard = container.querySelector('[data-word-card]');
    expect(wordCard?.textContent).toContain('あい');
    expect(wordCard?.textContent).toContain('ai');
  });

  it('§9 (honest absence): no word audio → no word play control, no fake sound', async () => {
    const { container } = render(<KanaCard kana={KANA_A} showRomaji audioUrls={null} wordAudioUrls={null} />);
    await waitFor(() => {
      expect(container.querySelector('[data-word-card]')).not.toBeNull();
    });
    expect(container.querySelector('[data-word-audio]')).toBeNull();
  });
});

// ------------------------------------------------ Addendum-3 §13: single- AND multi-stroke characters

describe('WritingCanvas — §13 per-stroke replacement across stroke counts (owner: تک‌ضربه‌ای و چندضربه‌ای)', () => {
  const KU = JSON.parse(readFileSync(join(webRoot, 'public', 'writing-data', 'く.json'), 'utf8')) as {
    strokes: string[];
    medians: number[][][];
  };
  const KI = JSON.parse(readFileSync(join(webRoot, 'public', 'writing-data', 'き.json'), 'utf8')) as {
    strokes: string[];
    medians: number[][][];
  };

  it('く (SINGLE stroke): the one accepted stroke morphs into the standard form and completes', async () => {
    expect(KU.strokes).toHaveLength(1);
    const { container } = render(<WritingCanvas character="く" mode="guided" />);
    const svg = await waitFor(() => getCanvasSvg(container));
    drawStroke(svg, KU.medians[0]!);
    await waitFor(() => {
      expect(container.querySelectorAll('path[data-std-stroke]')).toHaveLength(1);
    });
    // Addendum-5 §2 — the user's ink morphs IN PLACE, then rests as the EXACT
    // standard く stroke from the shipped data
    await waitForMorphSettled(container, 0, KU.strokes[0]!);
  }, 20000);

  it('き (FOUR strokes): every stroke morphs into its standard form, in order, as accepted', async () => {
    expect(KI.strokes).toHaveLength(4);
    const onAttemptComplete = vi.fn();
    const { container } = render(<WritingCanvas character="き" mode="guided" onAttemptComplete={onAttemptComplete} />);
    const svg = await waitFor(() => getCanvasSvg(container));
    for (let i = 0; i < KI.medians.length; i += 1) {
      drawStroke(svg, KI.medians[i]!);
      // after stroke i is accepted, standard strokes 0..i rest on the paper —
      // each with the EXACT shipped d of its index
      await waitFor(() => {
        expect(container.querySelectorAll('path[data-std-stroke]')).toHaveLength(i + 1);
      });
      await waitForMorphSettled(container, i, KI.strokes[i]!);
    }
    expect(onAttemptComplete).toHaveBeenCalledTimes(1);
  }, 40000);
});
