/**
 * TASK-DLG-POC-01 — typed audio errors + recovery (AC-957).
 * Missing file / network failure surface as typed AudioError events with full asset
 * identity; the chain HALTS for a user decision (retry / skip / continue-without-audio)
 * and each path resumes the conversation.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkError, PlaybackEngine } from '@/modules/dialogue';
import { loadDialogue } from '@/modules/dialogue/server';
import { FakeAudioBackend, mkRef } from '../../helpers/fake-audio';

const DURATION_MS = FakeAudioBackend.DEFAULT_DURATION_MS;
const dialogue = loadDialogue('cafe-morning-01');

function gapOf(i: number): number {
  return dialogue.lines[i]?.gapAfterMs ?? dialogue.turnGapDefaultMs;
}

function setup() {
  const backend = new FakeAudioBackend();
  const refs = new Map(dialogue.lines.map((l) => [l.id, mkRef(l.id)]));
  const engine = new PlaybackEngine({
    dialogue,
    backend,
    getAudioRef: (line) => refs.get(line.id) ?? null,
  });
  const starts: { index: number; silent: boolean }[] = [];
  const ends: { index: number; reason: string }[] = [];
  const errors: { code: string; lineId?: string; message: string }[] = [];
  const statuses: string[] = [];
  engine.on('lineStart', (ev) => starts.push({ index: ev.index, silent: ev.silent }));
  engine.on('lineEnd', (ev) => ends.push({ index: ev.index, reason: ev.reason }));
  engine.on('error', (ev) => errors.push({ code: ev.error.code, lineId: ev.error.lineId, message: ev.error.message }));
  engine.on('stateChange', (ev) => statuses.push(ev.status));
  return { engine, backend, starts, ends, errors, statuses };
}

describe('audio error paths (typed errors + recovery)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('missing file → typed audio/missing-file with asset identity; retry recovers', async () => {
    const { engine, backend, starts, errors } = setup();
    const l0 = dialogue.lines[0]!.id;
    backend.failLoadLineIds.add(l0);

    engine.play();
    await vi.advanceTimersByTimeAsync(0);

    expect(engine.getStatus()).toBe('error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe('audio/missing-file');
    expect(errors[0]!.lineId).toBe(l0);
    expect(errors[0]!.message).toContain(l0); // traceable (ADR-009 identity)
    expect(starts).toHaveLength(0); // the failing line never started

    // chain is halted, not crashed:
    await vi.advanceTimersByTimeAsync(60_000);
    expect(starts).toHaveLength(0);

    // file appears (or user retries) → same line plays, conversation continues to the end
    backend.failLoadLineIds.delete(l0);
    engine.retryError();
    await vi.advanceTimersByTimeAsync(0);
    expect(starts[0]).toEqual({ index: 0, silent: false });

    let total = 0;
    for (let i = 0; i < dialogue.lines.length; i++) total += DURATION_MS + gapOf(i);
    await vi.advanceTimersByTimeAsync(total + 100);
    expect(engine.getStatus()).toBe('ended');
    expect(starts.length).toBe(dialogue.lines.length);
  });

  it('network failure mid-play → typed audio/network; skip continues after the normal gap', async () => {
    const { engine, backend, starts, ends, errors } = setup();
    engine.play();
    await vi.advanceTimersByTimeAsync(0); // line 0 playing
    await vi.advanceTimersByTimeAsync(DURATION_MS + gapOf(0)); // line 1 playing

    const l1 = dialogue.lines[1]!.id;
    backend
      .handleFor(l1)!
      .emitError(new NetworkError(`fetch failed for ${l1}`, { lineId: l1, voiceId: 'vv-female-01-normal', hash: 'h' }));
    await vi.advanceTimersByTimeAsync(0);

    expect(engine.getStatus()).toBe('error');
    expect(errors.at(-1)!.code).toBe('audio/network');
    expect(errors.at(-1)!.lineId).toBe(l1);

    engine.skipError(); // user: «رد کردن این خط»
    await vi.advanceTimersByTimeAsync(gapOf(1)); // normal gap after the skipped line
    expect(starts.at(-1)!.index).toBe(2); // chain continued
    expect(ends.some((e) => e.index === 1 && e.reason === 'skipped')).toBe(true);

    let total = 0;
    for (let i = 2; i < dialogue.lines.length; i++) total += DURATION_MS + gapOf(i);
    await vi.advanceTimersByTimeAsync(total + 100);
    expect(engine.getStatus()).toBe('ended');
  });

  it('continue-without-audio: the failing line runs silent (reading estimate), audio resumes after', async () => {
    const { engine, backend, starts } = setup();
    const l0 = dialogue.lines[0]!.id;
    backend.failLoadLineIds.add(l0);

    engine.play();
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.getStatus()).toBe('error');

    engine.continueWithoutAudio();
    await vi.advanceTimersByTimeAsync(0);
    expect(starts[0]).toEqual({ index: 0, silent: true }); // silent lineStart

    // silent line ends after the reading estimate, then line 1 plays WITH audio
    await vi.advanceTimersByTimeAsync(4000 + gapOf(0));
    expect(starts[1]).toEqual({ index: 1, silent: false });

    let total = 0;
    for (let i = 1; i < dialogue.lines.length; i++) total += DURATION_MS + gapOf(i);
    await vi.advanceTimersByTimeAsync(total + 100);
    expect(engine.getStatus()).toBe('ended');
  });

  it('a dialogue with NO audio at all still runs to the end (build stays green without gen:audio)', async () => {
    const backend = new FakeAudioBackend();
    const engine = new PlaybackEngine({
      dialogue,
      backend,
      getAudioRef: () => null, // nothing generated
    });
    const starts: { index: number; silent: boolean }[] = [];
    engine.on('lineStart', (ev) => starts.push({ index: ev.index, silent: ev.silent }));
    engine.play();

    let total = 0;
    for (let i = 0; i < dialogue.lines.length; i++) {
      total += 4000 + gapOf(i); // every line uses the max reading estimate
    }
    await vi.advanceTimersByTimeAsync(total + 100);

    expect(engine.getStatus()).toBe('ended');
    expect(starts.every((s) => s.silent)).toBe(true);
    expect(starts.length).toBe(dialogue.lines.length);
    expect(backend.loadCalls).toHaveLength(0);
  });
});
