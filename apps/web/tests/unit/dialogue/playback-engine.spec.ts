/**
 * TASK-DLG-POC-01 — T1 (chain + gaps, no overlap), T4 (replay/speed), pause/resume.
 * Engine-level with a fake AudioBackend and vitest fake timers: the whole conversation
 * runs on a deterministic clock, so gap fidelity and dispatch delay are measured exactly.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackEngine } from '@/modules/dialogue';
import { loadDialogue } from '@/modules/dialogue/server';
import { FakeAudioBackend, mkRef } from '../../helpers/fake-audio';

const DURATION_MS = FakeAudioBackend.DEFAULT_DURATION_MS; // 1000ms per line

function gapOf(lineIndex: number): number {
  return dialogue.lines[lineIndex]?.gapAfterMs ?? dialogue.turnGapDefaultMs;
}

const dialogue = loadDialogue('cafe-morning-01');

function setup() {
  const backend = new FakeAudioBackend();
  const refs = new Map(dialogue.lines.map((l) => [l.id, mkRef(l.id)]));
  const engine = new PlaybackEngine({
    dialogue,
    backend,
    getAudioRef: (line) => refs.get(line.id) ?? null,
  });
  const starts: { index: number; atMs: number; silent: boolean }[] = [];
  const ends: { index: number; atMs: number; reason: string }[] = [];
  const states: { status: string; lineIndex: number | null }[] = [];
  engine.on('lineStart', (ev) => starts.push({ index: ev.index, atMs: ev.atMs, silent: ev.silent }));
  engine.on('lineEnd', (ev) => ends.push({ index: ev.index, atMs: ev.atMs, reason: ev.reason }));
  engine.on('stateChange', (ev) => states.push({ status: ev.status, lineIndex: ev.lineIndex }));
  return { engine, backend, starts, ends, states };
}

describe('PlaybackEngine — T1: multi-speaker chain with exact gaps', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays the full dialogue (≥8 lines, 3 voices) and ends', async () => {
    const { engine, starts, ends } = setup();
    expect(dialogue.lines.length).toBeGreaterThanOrEqual(8);
    expect(new Set(dialogue.lines.map((l) => l.speaker)).size).toBe(3);

    engine.play();
    let total = 0;
    for (let i = 0; i < dialogue.lines.length; i++) total += DURATION_MS + gapOf(i);
    await vi.advanceTimersByTimeAsync(total + 100);

    expect(starts.map((s) => s.index)).toEqual(dialogue.lines.map((_, i) => i));
    expect(ends.every((e) => e.reason === 'natural')).toBe(true);
    expect(engine.getStatus()).toBe('ended');
  });

  it('starts each next line only AFTER the full gap — zero engine dispatch delay, no overlap', async () => {
    const { engine, starts, ends } = setup();
    engine.play();
    let total = 0;
    for (let i = 0; i < dialogue.lines.length; i++) total += DURATION_MS + gapOf(i);
    await vi.advanceTimersByTimeAsync(total + 100);

    for (let i = 0; i < dialogue.lines.length; i++) {
      // full line audible: lineEnd exactly durationMs after lineStart
      expect(ends[i]!.atMs - starts[i]!.atMs).toBe(DURATION_MS);
      if (i < dialogue.lines.length - 1) {
        const gap = gapOf(i);
        // next line starts exactly after the gap (AC-954: ±50ms; engine: 0)
        expect(starts[i + 1]!.atMs - ends[i]!.atMs).toBe(gap);
        // dispatch delay = actual start − scheduled start (gap end)
        const dispatchDelayMs = starts[i + 1]!.atMs - (ends[i]!.atMs + gap);
        expect(dispatchDelayMs).toBe(0);
        // no audio overlap: next start never before previous end
        expect(starts[i + 1]!.atMs).toBeGreaterThanOrEqual(ends[i]!.atMs);
      }
    }
  });

  it('prefetches the next TWO lines while a line plays (AC-955)', async () => {
    const { engine, backend } = setup();
    engine.play();
    await vi.advanceTimersByTimeAsync(0); // line 0 started, prefetch issued
    const last = backend.prefetchCalls.at(-1)!;
    expect(last.map((r) => r.lineId)).toEqual([dialogue.lines[1]!.id, dialogue.lines[2]!.id]);
  });

  it('real-timer overshoot of a 50ms gap stays well under the 100ms T1 budget', async () => {
    vi.useRealTimers();
    const samples = 12;
    const gapMs = 50;
    let overshootSum = 0;
    let overshootMax = 0;
    for (let i = 0; i < samples; i++) {
      const t0 = performance.now();
      await new Promise<void>((resolve) => setTimeout(resolve, gapMs));
      const overshoot = performance.now() - t0 - gapMs;
      overshootSum += overshoot;
      overshootMax = Math.max(overshootMax, overshoot);
    }
    const mean = overshootSum / samples;
    console.log(
      `[T1 real-timer probe] gap=${gapMs}ms mean overshoot=${mean.toFixed(2)}ms max=${overshootMax.toFixed(2)}ms over ${samples} samples`,
    );
    expect(overshootMax).toBeLessThan(100);
  });
});

describe('PlaybackEngine — pause/resume (AC-956)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('pauses mid-line and resumes from the same (line, offset)', async () => {
    const { engine, backend, starts, ends } = setup();
    engine.play();
    await vi.advanceTimersByTimeAsync(0); // line 0 playing
    const handle = backend.handleFor(dialogue.lines[0]!.id)!;

    await vi.advanceTimersByTimeAsync(400); // 400ms into line 0
    engine.pause();
    expect(handle.pauseCalls).toBe(1);
    expect(engine.getStatus()).toBe('paused');

    const startsBefore = starts.length;
    const endsBefore = ends.length;
    await vi.advanceTimersByTimeAsync(10_000); // frozen while paused
    expect(starts.length).toBe(startsBefore);
    expect(ends.length).toBe(endsBefore);

    engine.resume();
    expect(handle.resumeCalls).toBe(1);
    expect(engine.getStatus()).toBe('playing');
    await vi.advanceTimersByTimeAsync(DURATION_MS - 400); // remaining 600ms of line 0
    expect(ends.at(-1)?.index).toBe(0);
    expect(ends.at(-1)?.reason).toBe('natural');

    await vi.advanceTimersByTimeAsync(gapOf(0)); // gap → line 1
    expect(starts.at(-1)?.index).toBe(1);
    expect(engine.getCurrentIndex()).toBe(1);
  });

  it('resumes from the middle of a gap with the remainder preserved', async () => {
    const { engine, starts } = setup();
    engine.play();
    await vi.advanceTimersByTimeAsync(DURATION_MS + 200); // line 0 ended, 200ms into its 500ms gap
    engine.pause();
    await vi.advanceTimersByTimeAsync(5000); // nothing fires while paused
    expect(starts.length).toBe(1);

    engine.resume();
    await vi.advanceTimersByTimeAsync(gapOf(0) - 200 - 1); // 299ms — still in the remaining gap
    expect(starts.length).toBe(1);
    await vi.advanceTimersByTimeAsync(1); // remainder elapses → line 1 starts
    expect(starts.at(-1)?.index).toBe(1);
  });
});

describe('PlaybackEngine — T4: replay & speed at boundaries', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('replayLine() seeks the SAME handle to 0 — no re-load, no conversation restart', async () => {
    const { engine, backend, starts } = setup();
    engine.play();
    await vi.advanceTimersByTimeAsync(0); // line 0
    const handle = backend.handleFor(dialogue.lines[0]!.id)!;

    await vi.advanceTimersByTimeAsync(300);
    engine.replayLine();

    expect(handle.seekCalls).toBe(1); // seek=0 on the SAME handle (T4)
    expect(backend.loadCountFor(dialogue.lines[0]!.id)).toBe(1); // never re-fetched
    expect(handle.playCalls).toBe(2);
    expect(starts.filter((s) => s.index === 0).length).toBe(2); // lineStart re-emitted (subtitle re-highlight)
    expect(starts.some((s) => s.index === 1)).toBe(false); // conversation did NOT restart at another line

    // after the replayed line ends, the chain continues normally
    await vi.advanceTimersByTimeAsync(DURATION_MS + gapOf(0));
    expect(starts.at(-1)?.index).toBe(1);
    expect(engine.getCurrentIndex()).toBe(1);
  });

  it('setSpeed() applies only at the NEXT line boundary (0.75×)', async () => {
    const { engine, backend } = setup();
    engine.play();
    await vi.advanceTimersByTimeAsync(0); // line 0 playing at 1×
    const h0 = backend.handleFor(dialogue.lines[0]!.id)!;

    engine.setSpeed(0.75);
    expect(h0.rates).toEqual([1]); // current line keeps its rate

    await vi.advanceTimersByTimeAsync(DURATION_MS + gapOf(0)); // line 0 ends → gap → line 1
    const h1 = backend.handleFor(dialogue.lines[1]!.id)!;
    expect(h1.rates).toEqual([0.75]); // applied at the boundary

    // 0.75× stretches the audible duration of line 1 to 1000/0.75 ≈ 1333ms
    await vi.advanceTimersByTimeAsync(Math.floor(DURATION_MS / 0.75));
    expect(engine.getCurrentIndex()).toBe(1); // still line 1 (would be 2 at 1×)
    await vi.advanceTimersByTimeAsync(1); // fractional remainder elapses
    expect(engine.getCurrentIndex()).toBe(1); // boundary not crossed yet
    await vi.advanceTimersByTimeAsync(gapOf(1));
    expect(engine.getCurrentIndex()).toBe(2);
  });

  it('seekToLine() jumps and continues the chain from there (T6 target)', async () => {
    const { engine, starts } = setup();
    engine.play();
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.seekToLine(dialogue.lines[4]!.id)).toBe(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.getCurrentIndex()).toBe(4);
    expect(starts.at(-1)?.index).toBe(4);
    expect(engine.seekToLine('s-does-not-exist')).toBe(false);
  });
});
