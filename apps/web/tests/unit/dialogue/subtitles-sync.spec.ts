/**
 * TASK-DLG-POC-01 — T3 at engine level: subtitle sync.
 * The UI derives the highlighted line purely from lineStart/lineEnd events; the test
 * mirrors that derivation and asserts the active line always matches the audio:
 * exactly one active line while audio plays, deactivation at audio end, switch to the
 * next line exactly when its audio starts (≤100ms budget → 0ms on the fake clock).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackEngine } from '@/modules/dialogue';
import { loadDialogue } from '@/modules/dialogue/server';
import { FakeAudioBackend, mkRef } from '../../helpers/fake-audio';

const DURATION_MS = FakeAudioBackend.DEFAULT_DURATION_MS;
const dialogue = loadDialogue('cafe-morning-01');

describe('subtitle sync — active line follows the audio (T3)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('onLineStart activates, onLineEnd deactivates — exactly one active line, in order', async () => {
    const backend = new FakeAudioBackend();
    const refs = new Map(dialogue.lines.map((l) => [l.id, mkRef(l.id)]));
    const engine = new PlaybackEngine({
      dialogue,
      backend,
      getAudioRef: (line) => refs.get(line.id) ?? null,
    });

    // exactly how the /poc/dialogue island derives its highlight state
    let activeLineId: string | null = null;
    const history: { atMs: number; active: string | null }[] = [];
    const starts: { id: string; index: number; atMs: number }[] = [];
    const ends: { id: string; index: number; atMs: number }[] = [];
    engine.on('lineStart', (ev) => {
      activeLineId = ev.line.id;
      starts.push({ id: ev.line.id, index: ev.index, atMs: ev.atMs });
      history.push({ atMs: ev.atMs, active: activeLineId });
    });
    engine.on('lineEnd', (ev) => {
      if (activeLineId === ev.line.id) activeLineId = null; // deactivate ONLY the ended line
      ends.push({ id: ev.line.id, index: ev.index, atMs: ev.atMs });
      history.push({ atMs: ev.atMs, active: activeLineId });
    });

    engine.play();
    let total = 0;
    for (let i = 0; i < dialogue.lines.length; i++) {
      total += DURATION_MS + (dialogue.lines[i]?.gapAfterMs ?? dialogue.turnGapDefaultMs);
    }
    await vi.advanceTimersByTimeAsync(total + 100);

    // every line started and ended exactly once, in dialogue order
    expect(starts.map((s) => s.index)).toEqual(dialogue.lines.map((_, i) => i));
    expect(ends.map((e) => e.index)).toEqual(dialogue.lines.map((_, i) => i));

    // events strictly alternate start→end per line
    const orderedIds = history
      .map((h) => h.active)
      .filter((a): a is string => a !== null)
      .map((id) => dialogue.lines.findIndex((l) => l.id === id));
    expect(orderedIds).toEqual(dialogue.lines.map((_, i) => i));

    // the highlight switches exactly when the next audio starts: lineStart(n) − lineEnd(n−1) = gap
    for (let i = 0; i + 1 < starts.length; i++) {
      const gap = dialogue.lines[i]?.gapAfterMs ?? dialogue.turnGapDefaultMs;
      expect(starts[i + 1]!.atMs - ends[i]!.atMs).toBe(gap); // ≤100ms budget (T3) — engine: 0
    }

    // while a line plays, the active line is that line (no pre-emptive switch, no leftovers)
    for (const s of starts) {
      const during = history.find((h) => h.atMs === s.atMs);
      expect(during?.active).toBe(s.id);
    }
    expect(activeLineId).toBeNull(); // conversation ended → nothing highlighted
  });

  it('deactivates immediately on skip (user jump) and highlights the target line', async () => {
    const backend = new FakeAudioBackend();
    const refs = new Map(dialogue.lines.map((l) => [l.id, mkRef(l.id)]));
    const engine = new PlaybackEngine({
      dialogue,
      backend,
      getAudioRef: (line) => refs.get(line.id) ?? null,
    });
    let activeLineId: string | null = null;
    engine.on('lineStart', (ev) => {
      activeLineId = ev.line.id;
    });
    engine.on('lineEnd', (ev) => {
      if (activeLineId === ev.line.id) activeLineId = null;
    });

    engine.play();
    await vi.advanceTimersByTimeAsync(0);
    expect(activeLineId).toBe(dialogue.lines[0]!.id);

    engine.next(); // user skips mid-line
    await vi.advanceTimersByTimeAsync(0);
    expect(activeLineId).toBe(dialogue.lines[1]!.id); // target line highlighted right away
  });
});
