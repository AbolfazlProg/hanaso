/**
 * HANASO — test fakes for the dialogue playback engine (TASK-DLG-POC-01).
 * A deterministic AudioBackend/AudioHandle pair driven by (fake) timers, plus
 * tiny builders for AudioAssetRefs. No DOM, no network.
 */
import {
  MissingFileError,
  NetworkError,
  type AudioBackend,
  type AudioHandle,
  type AudioAssetRef,
  type PlaybackSpeed,
} from '@/modules/dialogue';
import type { AudioError } from '@/modules/dialogue';

let seq = 0;

export function mkRef(lineId: string, voiceId = 'vv-female-01-normal'): AudioAssetRef {
  seq += 1;
  return {
    lineId,
    voiceId,
    hash: `hash-${lineId}-${seq}`,
    files: { opus: `/poc-audio/${lineId}.wav`, m4a: `/poc-audio/${lineId}.wav` },
    bytes: 1024,
  };
}

/**
 * Fake handle: schedules `ended` via setTimeout after `durationMs / rate`.
 * Tracks play/pause/resume/stop/seek/rate calls for T1/T4 assertions.
 * `Date.now()` must be the fake-clock one (vitest fake timers) — consistent with the engine clock.
 */
export class FakeAudioHandle implements AudioHandle {
  playCalls = 0;
  pauseCalls = 0;
  resumeCalls = 0;
  stopCalls = 0;
  seekCalls = 0;
  rates: PlaybackSpeed[] = [];

  private endedCb: (() => void) | null = null;
  private errorCb: ((err: AudioError) => void) | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private playedMs = 0;
  private resumedAt: number | null = null;

  constructor(
    readonly ref: AudioAssetRef,
    totalMs: number,
    private readonly failPlay = false,
  ) {
    this.totalMs = totalMs;
  }
  private readonly totalMs: number;

  play(): Promise<void> {
    this.playCalls += 1;
    if (this.failPlay) {
      return Promise.reject(
        new NetworkError(`fake network failure for line ${this.ref.lineId}`, {
          lineId: this.ref.lineId,
          voiceId: this.ref.voiceId,
          hash: this.ref.hash,
        }),
      );
    }
    this.playedMs = 0;
    this.resumedAt = Date.now();
    this.scheduleEnd(this.remainingMs());
    return Promise.resolve();
  }

  pause(): void {
    this.pauseCalls += 1;
    this.settleElapsed();
    this.clearEnd();
  }

  resume(): void {
    this.resumeCalls += 1;
    this.resumedAt = Date.now();
    this.scheduleEnd(this.remainingMs());
  }

  stop(): void {
    this.stopCalls += 1;
    this.clearEnd();
    this.playedMs = 0;
    this.resumedAt = null;
  }

  seekToStart(): void {
    this.seekCalls += 1;
    this.playedMs = 0;
    if (this.resumedAt !== null) {
      this.resumedAt = Date.now();
      this.scheduleEnd(this.remainingMs());
    } else {
      this.clearEnd();
    }
  }

  setPlaybackRate(rate: PlaybackSpeed): void {
    this.rates.push(rate);
    if (this.resumedAt !== null) {
      // keep the remaining time proportional (the engine only switches at boundaries anyway)
      const rateBefore = this.rates.length > 1 ? this.rates[this.rates.length - 2]! : 1;
      const remainingAtOldRate = this.remainingMs();
      const remainingAtNewRate = (remainingAtOldRate * rateBefore) / rate;
      this.clearEnd();
      this.scheduleEnd(remainingAtNewRate);
    }
  }

  onEnded(cb: () => void): () => void {
    this.endedCb = cb;
    return () => {
      if (this.endedCb === cb) this.endedCb = null;
    };
  }

  onError(cb: (err: AudioError) => void): () => void {
    this.errorCb = cb;
    return () => {
      if (this.errorCb === cb) this.errorCb = null;
    };
  }

  /** Test hook: simulate a mid-play failure (element 'error' event). */
  emitError(err: AudioError): void {
    this.errorCb?.(err);
  }

  get durationMs(): number {
    return this.totalMs;
  }

  private remainingMs(): number {
    const rate = this.rates.at(-1) ?? 1;
    const already = this.resumedAt !== null ? Date.now() - this.resumedAt : 0;
    return Math.max(0, (this.totalMs - (this.playedMs + already)) / rate);
  }

  private settleElapsed(): void {
    if (this.resumedAt !== null) {
      this.playedMs += Date.now() - this.resumedAt;
      this.resumedAt = null;
    }
  }

  private scheduleEnd(delayMs: number): void {
    this.clearEnd();
    this.endTimer = setTimeout(() => {
      this.endTimer = null;
      this.settleElapsed();
      this.endedCb?.();
    }, delayMs);
  }

  private clearEnd(): void {
    if (this.endTimer !== null) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }
  }
}

export class FakeAudioBackend implements AudioBackend {
  loadCalls: AudioAssetRef[] = [];
  prefetchCalls: AudioAssetRef[][] = [];
  private readonly handles = new Map<string, FakeAudioHandle>();

  /** Line ids whose load() rejects with MissingFileError (404-style). */
  readonly failLoadLineIds = new Set<string>();
  /** Line ids whose play() rejects with NetworkError (fetch/transport-style). */
  readonly failPlayLineIds = new Set<string>();
  /** Per-line durations (default DEFAULT_DURATION_MS). */
  readonly durations = new Map<string, number>();

  static readonly DEFAULT_DURATION_MS = 1000;

  load(ref: AudioAssetRef): Promise<AudioHandle> {
    this.loadCalls.push(ref);
    if (this.failLoadLineIds.has(ref.lineId)) {
      return Promise.reject(
        new MissingFileError(`no playable audio file for line ${ref.lineId}`, {
          lineId: ref.lineId,
          voiceId: ref.voiceId,
          hash: ref.hash,
        }),
      );
    }
    const handle = new FakeAudioHandle(
      ref,
      this.durations.get(ref.lineId) ?? FakeAudioBackend.DEFAULT_DURATION_MS,
      this.failPlayLineIds.has(ref.lineId),
    );
    this.handles.set(ref.lineId, handle);
    return Promise.resolve(handle);
  }

  prefetch(refs: AudioAssetRef[]): void {
    this.prefetchCalls.push([...refs]);
  }

  handleFor(lineId: string): FakeAudioHandle | undefined {
    return this.handles.get(lineId);
  }

  loadCountFor(lineId: string): number {
    return this.loadCalls.filter((r) => r.lineId === lineId).length;
  }
}
