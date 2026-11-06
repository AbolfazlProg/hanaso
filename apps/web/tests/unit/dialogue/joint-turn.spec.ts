/**
 * TASK-LEARNING-07 (Wave 2) — joint-turn composite audio (05B §6 / DR-01d).
 *
 * Proves the joint-turn wiring WITHOUT touching the pure PlaybackEngine:
 * - the composite handle ends only after BOTH assets ended;
 * - every transport verb (pause/resume/stop/seek/rate) hits BOTH handles;
 * - a co-asset failure at ANY stage (load / start / mid-play) degrades to
 *   primary-only playback and never surfaces an error the user must recover from;
 * - a PRIMARY failure propagates its typed error exactly like the unwrapped backend;
 * - JointTurnBackend prefetches both sides of upcoming lines;
 * - the whole thing drives the real engine end-to-end (chain timing unchanged).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MissingFileError, NetworkError, PlaybackEngine } from '@/modules/dialogue';
import type { AudioAssetRef, Dialogue } from '@/modules/dialogue';
import { JointTurnBackend, createJointHandle } from '@/modules/audio';
import { FakeAudioBackend, FakeAudioHandle, mkRef } from '../../helpers/fake-audio';

/** coRefFor over a ref map: `${lineId}-co` → co ref, else null (mirrors the scene wiring). */
function coLookup(refs: Map<string, AudioAssetRef>) {
  return (ref: AudioAssetRef): AudioAssetRef | null => refs.get(`${ref.lineId}-co`) ?? null;
}

describe('JointAudioHandle (createJointHandle)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires onEnded only after BOTH assets ended (co longer than primary)', async () => {
    const primary = new FakeAudioHandle(mkRef('l1'), 1000);
    const co = new FakeAudioHandle(mkRef('l1-co'), 1600);
    const joint = createJointHandle(primary, co);
    const endedAt: number[] = [];
    joint.onEnded(() => endedAt.push(Date.now()));

    const t0 = Date.now(); // frozen until the fake clock advances (epoch-based)
    await joint.play();
    vi.advanceTimersByTime(1000); // primary finished — co still playing
    expect(endedAt).toHaveLength(0);
    vi.advanceTimersByTime(600); // co finished at 1600 — NOW the line is over
    expect(endedAt).toEqual([t0 + 1600]);
  });

  it('fires onEnded only after BOTH assets ended (primary longer than co)', async () => {
    const primary = new FakeAudioHandle(mkRef('l1'), 1600);
    const co = new FakeAudioHandle(mkRef('l1-co'), 1000);
    const joint = createJointHandle(primary, co);
    const endedAt: number[] = [];
    joint.onEnded(() => endedAt.push(Date.now()));

    const t0 = Date.now();
    await joint.play();
    vi.advanceTimersByTime(1000); // co finished — primary still playing
    expect(endedAt).toHaveLength(0);
    vi.advanceTimersByTime(600);
    expect(endedAt).toEqual([t0 + 1600]);
  });

  it('pause/resume/rate/seek/stop hit BOTH handles', async () => {
    const primary = new FakeAudioHandle(mkRef('l1'), 1000);
    const co = new FakeAudioHandle(mkRef('l1-co'), 1600);
    const joint = createJointHandle(primary, co);

    await joint.play();
    vi.advanceTimersByTime(300);

    joint.pause();
    expect(primary.pauseCalls).toBe(1);
    expect(co.pauseCalls).toBe(1);

    joint.resume();
    expect(primary.resumeCalls).toBe(1);
    expect(co.resumeCalls).toBe(1);

    joint.setPlaybackRate(0.75);
    expect(primary.rates).toContain(0.75);
    expect(co.rates).toContain(0.75);

    joint.seekToStart();
    expect(primary.seekCalls).toBe(1);
    expect(co.seekCalls).toBe(1);

    joint.stop();
    expect(primary.stopCalls).toBe(1);
    expect(co.stopCalls).toBe(1);
  });

  it('a co error MID-PLAY is dropped silently — the primary continues alone', async () => {
    const primary = new FakeAudioHandle(mkRef('l1'), 1000);
    const co = new FakeAudioHandle(mkRef('l1-co'), 1600);
    const joint = createJointHandle(primary, co);
    const errors: unknown[] = [];
    const endedAt: number[] = [];
    joint.onError((err) => errors.push(err));
    joint.onEnded(() => endedAt.push(Date.now()));

    const t0 = Date.now();
    await joint.play();
    vi.advanceTimersByTime(300);
    co.emitError(new NetworkError('co decode failed', { lineId: 'l1-co' }));

    expect(errors).toHaveLength(0); // co-only failures NEVER surface (no error state)
    expect(co.stopCalls).toBe(1); // the broken co asset is halted
    vi.advanceTimersByTime(700); // primary ends at 1000 → the line is over
    expect(endedAt).toEqual([t0 + 1000]);
  });

  it('a PRIMARY error surfaces through onError (typed engine error path)', async () => {
    const primary = new FakeAudioHandle(mkRef('l1'), 1000);
    const co = new FakeAudioHandle(mkRef('l1-co'), 1600);
    const joint = createJointHandle(primary, co);
    const errors: unknown[] = [];
    joint.onError((err) => errors.push(err));

    await joint.play();
    vi.advanceTimersByTime(300);
    const err = new NetworkError('primary element error', { lineId: 'l1' });
    primary.emitError(err);

    expect(errors).toEqual([err]);
  });

  it('a co asset whose play() rejects degrades to primary-only (no rejection)', async () => {
    const primary = new FakeAudioHandle(mkRef('l1'), 1000);
    const failingCo = new FakeAudioHandle(mkRef('l1-co'), 1600, /* failPlay */ true);
    const joint = createJointHandle(primary, failingCo);
    const endedAt: number[] = [];
    joint.onEnded(() => endedAt.push(Date.now()));

    const t0 = Date.now();
    await expect(joint.play()).resolves.toBeUndefined();
    vi.advanceTimersByTime(1000);
    expect(endedAt).toEqual([t0 + 1000]); // primary alone defines the line length
  });

  it('co === null (no co asset) degenerates to the primary handle', async () => {
    const primary = new FakeAudioHandle(mkRef('l1'), 1000);
    const joint = createJointHandle(primary, null);
    const endedAt: number[] = [];
    joint.onEnded(() => endedAt.push(Date.now()));

    const t0 = Date.now();
    await joint.play();
    vi.advanceTimersByTime(1000);
    expect(endedAt).toEqual([t0 + 1000]);
    expect(joint.durationMs).toBe(1000);
  });

  it('durationMs is the LONGER of the two assets', () => {
    const primary = new FakeAudioHandle(mkRef('l1'), 1000);
    const co = new FakeAudioHandle(mkRef('l1-co'), 1600);
    expect(createJointHandle(primary, co).durationMs).toBe(1600);
  });
});

describe('JointTurnBackend (load + prefetch composition)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('loads BOTH refs but returns ONE handle; joint plays them simultaneously', async () => {
    const inner = new FakeAudioBackend();
    inner.durations.set('l1', 1000);
    inner.durations.set('l1-co', 1600);
    const refs = new Map<string, AudioAssetRef>([
      ['l1', mkRef('l1')],
      ['l1-co', mkRef('l1-co')],
    ]);
    const backend = new JointTurnBackend({ backend: inner, coRefFor: coLookup(refs) });

    const handle = await backend.load(refs.get('l1')!);
    expect(inner.loadCalls.map((r) => r.lineId)).toEqual(['l1', 'l1-co']); // primary first
    expect(inner.handleFor('l1')!.playCalls).toBe(0); // nothing plays before .play()
    expect(inner.handleFor('l1-co')!.playCalls).toBe(0);

    const endedAt: number[] = [];
    handle.onEnded(() => endedAt.push(Date.now()));
    const t0 = Date.now();
    await handle.play();
    expect(inner.handleFor('l1')!.playCalls).toBe(1);
    expect(inner.handleFor('l1-co')!.playCalls).toBe(1); // SIMULTANEOUS start
    vi.advanceTimersByTime(1600);
    expect(endedAt).toEqual([t0 + 1600]);
  });

  it('co asset missing (404) → honest degradation to primary-only', async () => {
    const inner = new FakeAudioBackend();
    inner.failLoadLineIds.add('l1-co'); // HEAD probe fails → MissingFileError
    inner.durations.set('l1', 1000);
    const refs = new Map<string, AudioAssetRef>([
      ['l1', mkRef('l1')],
      ['l1-co', mkRef('l1-co')],
    ]);
    const backend = new JointTurnBackend({ backend: inner, coRefFor: coLookup(refs) });

    const handle = await backend.load(refs.get('l1')!); // does NOT reject
    expect(inner.loadCalls.map((r) => r.lineId)).toEqual(['l1', 'l1-co']);
    const endedAt: number[] = [];
    handle.onEnded(() => endedAt.push(Date.now()));
    const t0 = Date.now();
    await handle.play();
    vi.advanceTimersByTime(1000);
    expect(endedAt).toEqual([t0 + 1000]); // ended after the PRIMARY duration alone
  });

  it('PRIMARY asset missing → the typed error propagates (engine error state)', async () => {
    const inner = new FakeAudioBackend();
    inner.failLoadLineIds.add('l1');
    const backend = new JointTurnBackend({ backend: inner, coRefFor: () => null });
    await expect(backend.load(mkRef('l1'))).rejects.toBeInstanceOf(MissingFileError);
  });

  it('lines without a co entry load exactly as before (no second call)', async () => {
    const inner = new FakeAudioBackend();
    const refs = new Map<string, AudioAssetRef>([['l1', mkRef('l1')]]); // no l1-co
    const backend = new JointTurnBackend({ backend: inner, coRefFor: coLookup(refs) });
    const handle = await backend.load(refs.get('l1')!);
    expect(inner.loadCalls.map((r) => r.lineId)).toEqual(['l1']);
    expect(handle).toBe(inner.handleFor('l1')); // the RAW inner handle, unwrapped
  });

  it('prefetch warms BOTH the primary and the co asset of upcoming lines', () => {
    const inner = new FakeAudioBackend();
    const refs = new Map<string, AudioAssetRef>([
      ['l1', mkRef('l1')],
      ['l1-co', mkRef('l1-co')],
    ]);
    const backend = new JointTurnBackend({ backend: inner, coRefFor: coLookup(refs) });
    backend.prefetch([refs.get('l1')!]);
    expect(inner.prefetchCalls.at(-1)!.map((r) => r.lineId)).toEqual(['l1', 'l1-co']);
  });
});

describe('JointTurnBackend × PlaybackEngine (end-to-end chain)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Minimal 2-line dialogue: plain l1 + JOINT l2 (chr-b primary, chr-a co-speaker). */
  const dialogue: Dialogue = {
    id: 'dlg-joint-test',
    scene: 'test scene',
    characterIds: ['chr-a', 'chr-b'],
    turnGapDefaultMs: 100,
    lines: [
      { id: 'l1', speaker: 'chr-a', tokens: [{ surface: 'あ', reading: 'あ' }], fa: 'خط ۱', gapAfterMs: 100 },
      {
        id: 'l2',
        speaker: 'chr-b',
        coSpeaker: 'chr-a',
        tokens: [{ surface: 'い', reading: 'い' }],
        fa: 'خط ۲ (با هم)',
      },
    ],
  };

  it('a joint line plays both assets and the chain advances after the LONGER one', async () => {
    const inner = new FakeAudioBackend();
    inner.durations.set('l1', 1000);
    inner.durations.set('l2', 1000);
    inner.durations.set('l2-co', 1600); // the co-speaker is slower — defines the line length
    const refs = new Map<string, AudioAssetRef>(
      dialogue.lines.flatMap((l) => {
        const primary = mkRef(l.id);
        return l.coSpeaker
          ? [[l.id, primary] as const, [`${l.id}-co`, mkRef(`${l.id}-co`)] as const]
          : ([[l.id, primary]] as const);
      }),
    );
    const engine = new PlaybackEngine({
      dialogue,
      backend: new JointTurnBackend({ backend: inner, coRefFor: coLookup(refs) }),
      getAudioRef: (line) => refs.get(line.id) ?? null,
    });
    const starts: { index: number; atMs: number }[] = [];
    const ends: { index: number; atMs: number }[] = [];
    engine.on('lineStart', (ev) => starts.push({ index: ev.index, atMs: ev.atMs }));
    engine.on('lineEnd', (ev) => ends.push({ index: ev.index, atMs: ev.atMs }));

    const t0 = Date.now(); // the fake clock's epoch (engine timestamps are Date-based)
    engine.play();
    // l1: 1000 + gap 100 → the JOINT l2 starts at 1100; it runs the LONGER asset
    // (1600) so the chain advances only at 1100 + 1600 = 2700.
    await vi.advanceTimersByTimeAsync(1100);
    expect(starts.map((s) => s.index)).toEqual([0, 1]);
    expect(starts[1]!.atMs - t0).toBe(1100);
    expect(inner.handleFor('l2')!.playCalls).toBe(1);
    expect(inner.handleFor('l2-co')!.playCalls).toBe(1); // simultaneous start
    expect(ends).toHaveLength(1); // only l1 finished — the joint line is still going

    await vi.advanceTimersByTimeAsync(1600);
    expect(ends.map((e) => e.index)).toEqual([0, 1]);
    expect(ends[1]!.atMs - t0).toBe(2700);
    expect(engine.getStatus()).toBe('ended');
  });
});
