/**
 * HANASO — Dialogue playback engine (TASK-DLG-POC-01) — the heart of the PoC.
 *
 * Pure TypeScript, no DOM: all audio goes through the injectable `AudioBackend`
 * (browser impl: modules/audio; tests: fakes). Drives the conversation chain:
 *
 *   line n ends ──► gap_after_ms (cancellable) ──► line n+1 starts (prefetched)
 *
 * Rules implemented (KB audio-multi-speaker-architecture §۶ + AC-953..957):
 * - Next line starts only after the FULL gap has elapsed (T1).
 * - Speed changes apply only at line boundaries (two rates: 0.75 / 1).
 * - replayLine() = seek-to-start of the current line WITHOUT restarting the conversation (T4).
 * - A failing asset emits a typed AudioError and halts the chain until the user picks a
 *   recovery: retry / skip / continue-without-audio (AC-957).
 * - Lines with no AudioAssetRef (or recovered as silent) advance on a reading-time estimate.
 */
import { AudioError, UnknownAudioError } from '../errors';
import type { AudioAssetRef, Dialogue, DialogueLine, PlaybackSpeed } from '../types';

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'error' | 'ended';
export type LineEndReason = 'natural' | 'skipped' | 'silent' | 'error';

/** A loaded, playable audio for one line. Backends return these from `load()`. */
export interface AudioHandle {
  /** Start (or restart) playback at the current position. Rejects with AudioError on failure. */
  play(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  /** Seek back to 0 within the SAME handle — no re-fetch, no conversation restart (T4). */
  seekToStart(): void;
  setPlaybackRate(rate: PlaybackSpeed): void;
  onEnded(cb: () => void): () => void;
  onError(cb: (err: AudioError) => void): () => void;
  readonly durationMs?: number;
}

/** Injectable audio source (DI per ADR-018 §۲-۴ pattern — engine never touches the DOM). */
export interface AudioBackend {
  load(ref: AudioAssetRef): Promise<AudioHandle>;
  /** Warm the cache for upcoming lines (two-line prefetch, AC-955). */
  prefetch(refs: AudioAssetRef[]): void;
}

export interface LineStartEvent {
  line: DialogueLine;
  index: number;
  atMs: number;
  silent: boolean;
}
export interface LineEndEvent {
  line: DialogueLine;
  index: number;
  atMs: number;
  reason: LineEndReason;
}
export interface StateChangeEvent {
  status: PlaybackStatus;
  lineIndex: number | null;
}
export interface ErrorEvent {
  error: AudioError;
  line: DialogueLine;
}

export type PlaybackEvents = {
  lineStart: LineStartEvent;
  lineEnd: LineEndEvent;
  stateChange: StateChangeEvent;
  error: ErrorEvent;
};
export type PlaybackEventName = keyof PlaybackEvents;

export interface PlaybackEngineOptions {
  dialogue: Dialogue;
  backend: AudioBackend;
  /** Returns the audio ref for a line, or null when the line has no audio (silent line). */
  getAudioRef?: (line: DialogueLine) => AudioAssetRef | null;
  /** Monotonic clock for event timestamps (tests inject a controllable one). */
  clock?: () => number;
  /** Reading-estimate used for silent lines (ms). */
  readingEstimateMs?: (line: DialogueLine) => number;
}

type Timer = ReturnType<typeof setTimeout>;
type Handler<K extends PlaybackEventName> = (ev: PlaybackEvents[K]) => void;

/** Reading time for a silent (no-audio) line — rough, honest fallback so the chain never stalls. */
export function defaultReadingEstimateMs(line: DialogueLine): number {
  return Math.min(4000, Math.max(1000, line.tokens.length * 380 + 700));
}

export class PlaybackEngine {
  private readonly dialogue: Dialogue;
  private readonly backend: AudioBackend;
  private readonly getAudioRef: (line: DialogueLine) => AudioAssetRef | null;
  private readonly now: () => number;
  private readonly readingEstimateMs: (line: DialogueLine) => number;

  private status: PlaybackStatus = 'idle';
  private index = -1;
  private handle: AudioHandle | null = null;
  private detachHandle: (() => void)[] = [];

  private gapTimer: Timer | null = null;
  private gapFiresAtMs: number | null = null;
  private gapRemainingMs: number | null = null; // gap remainder frozen while paused
  private silentTimer: Timer | null = null;
  private silentFiresAtMs: number | null = null;
  private silentRemainingMs: number | null = null; // silent-line remainder frozen while paused

  /** Bumped on every transport interruption (stop/jump) so in-flight load() callbacks can detect staleness. */
  private generation = 0;

  private pendingSpeed: PlaybackSpeed = 1;
  private effectiveSpeed: PlaybackSpeed = 1;

  private failingIndex: number | null = null;
  private wasPlayingBeforeError = true;

  private readonly handlers: { [K in PlaybackEventName]: Handler<K>[] } = {
    lineStart: [],
    lineEnd: [],
    stateChange: [],
    error: [],
  };

  constructor(opts: PlaybackEngineOptions) {
    this.dialogue = opts.dialogue;
    this.backend = opts.backend;
    this.getAudioRef = opts.getAudioRef ?? (() => null);
    this.now = opts.clock ?? (() => Date.now());
    this.readingEstimateMs = opts.readingEstimateMs ?? defaultReadingEstimateMs;
  }

  // ---------------------------------------------------------------- events

  on<K extends PlaybackEventName>(event: K, handler: Handler<K>): () => void {
    this.handlers[event].push(handler);
    return () => {
      const arr = this.handlers[event] as Handler<K>[];
      const i = arr.indexOf(handler);
      if (i >= 0) arr.splice(i, 1);
    };
  }

  private emit<K extends PlaybackEventName>(event: K, ev: PlaybackEvents[K]): void {
    for (const h of [...this.handlers[event]]) (h as Handler<K>)(ev);
  }

  // ---------------------------------------------------------------- state

  getStatus(): PlaybackStatus {
    return this.status;
  }
  getCurrentIndex(): number {
    return this.index;
  }
  getCurrentLine(): DialogueLine | null {
    return this.index >= 0 ? (this.dialogue.lines[this.index] ?? null) : null;
  }
  getSpeed(): PlaybackSpeed {
    return this.pendingSpeed;
  }

  // ---------------------------------------------------------------- transport

  /** Start from the beginning, resume a pause, or retry after an error. */
  play(): void {
    switch (this.status) {
      case 'playing':
        return;
      case 'paused':
        this.resumeInternal();
        return;
      case 'error':
        this.retryError();
        return;
      case 'ended':
        this.startLine(0); // replay the whole conversation from the top
        return;
      case 'idle':
        // S1 fix (visual review #2): a seeked-to line (T6 «در مکالمه ببین») must play
        // from THAT line, not from line 1 — jumpTo() has already set this.index.
        this.startLine(this.index >= 0 ? this.index : 0);
        return;
    }
  }

  pause(): void {
    if (this.status !== 'playing') return;
    this.generation += 1; // cancel any in-flight load (it must not start after a pause)
    if (this.handle) this.handle.pause();
    if (this.gapTimer !== null) {
      clearTimeout(this.gapTimer);
      this.gapTimer = null;
      // Freeze the REMAINING gap, not the wall-clock deadline — a pause can last any
      // amount of real time and the conversation timeline must stay suspended (AC-956).
      const firesAt = this.gapFiresAtMs;
      this.gapRemainingMs = firesAt !== null ? Math.max(0, firesAt - this.now()) : 0;
      this.gapFiresAtMs = null;
    }
    if (this.silentTimer !== null) {
      clearTimeout(this.silentTimer);
      this.silentTimer = null;
      const silentAt = this.silentFiresAtMs;
      this.silentRemainingMs = silentAt !== null ? Math.max(0, silentAt - this.now()) : 0;
      this.silentFiresAtMs = null;
    }
    this.setStatus('paused');
  }

  /** Resume from the same (line, offset) — AC-956. Gap remainder is preserved. */
  resume(): void {
    if (this.status !== 'paused') return;
    this.resumeInternal();
  }

  private resumeInternal(): void {
    if (this.gapRemainingMs !== null) {
      const remaining = this.gapRemainingMs;
      this.gapRemainingMs = null;
      this.scheduleAdvance(remaining);
      this.setStatus('playing');
      return;
    }
    if (this.silentRemainingMs !== null) {
      const remaining = this.silentRemainingMs;
      this.silentRemainingMs = null;
      this.scheduleSilentEnd(remaining);
      this.setStatus('playing');
      return;
    }
    if (this.handle) {
      this.handle.resume();
      this.setStatus('playing');
      return;
    }
    // paused before anything loaded (e.g. paused right after a user jump) — start current line
    this.startLine(this.index >= 0 ? this.index : 0);
  }

  stop(): void {
    this.generation += 1; // cancel any in-flight load
    this.clearTimers();
    this.detachCurrentHandle();
    if (this.handle) this.handle.stop();
    this.handle = null;
    this.index = -1;
    this.failingIndex = null;
    this.setStatus('idle');
  }

  /** Jump to the next line (user action — bypasses the remaining gap). */
  next(): void {
    this.jumpTo(Math.min(this.dialogue.lines.length - 1, this.index + 1));
  }

  /** Jump to the previous line. */
  prev(): void {
    this.jumpTo(Math.max(0, this.index - 1));
  }

  /** Seek to a line by id. If the conversation was playing, the target line starts immediately. */
  seekToLine(lineId: string): boolean {
    const i = this.dialogue.lines.findIndex((l) => l.id === lineId);
    if (i < 0) return false;
    this.jumpTo(i);
    return true;
  }

  private jumpTo(target: number): void {
    const line = this.getCurrentLine();
    const wasActive = this.status === 'playing' || this.status === 'error';
    if (this.status === 'error') this.failingIndex = null;
    this.generation += 1; // invalidate in-flight loads
    this.clearTimers();
    this.detachCurrentHandle();
    if (this.handle) {
      this.handle.stop();
      this.handle = null;
    }
    if (line && wasActive) {
      this.emit('lineEnd', { line, index: this.index, atMs: this.now(), reason: 'skipped' });
    }
    this.index = target;
    if (wasActive || this.status === 'ended') {
      this.startLine(target);
    } else {
      this.emit('stateChange', { status: this.status, lineIndex: this.index });
    }
  }

  /**
   * Replay the current line from its start WITHOUT restarting the conversation (T4).
   * The line's position in the dialogue is preserved; after it ends, the chain continues normally.
   */
  replayLine(): void {
    const target = this.index >= 0 ? this.index : 0;
    if (this.handle && this.index === target) {
      this.clearTimers();
      this.handle.seekToStart();
      this.setStatus('playing');
      const line = this.dialogue.lines[target];
      if (line) {
        this.emit('lineStart', { line, index: target, atMs: this.now(), silent: false });
        void this.handle.play().catch((err: unknown) => this.enterErrorState(err, target));
      }
      return;
    }
    this.startLine(target);
  }

  /**
   * Set the playback rate. Applies at the NEXT line boundary (KB audio-ms §۶) —
   * the currently playing line keeps its rate until it ends.
   */
  setSpeed(speed: PlaybackSpeed): void {
    this.pendingSpeed = speed;
  }

  // ---------------------------------------------------------------- error recovery (AC-957)

  /** Retry the failing line's audio. */
  retryError(): void {
    if (this.status !== 'error') return;
    const target = this.failingIndex ?? this.index;
    this.failingIndex = null;
    this.startLine(target);
  }

  /** Skip the failing line and continue the chain after the normal gap. */
  skipError(): void {
    if (this.status !== 'error') return;
    const target = this.failingIndex ?? this.index;
    this.failingIndex = null;
    const line = this.dialogue.lines[target];
    if (line) {
      this.emit('lineEnd', { line, index: target, atMs: this.now(), reason: 'skipped' });
    }
    this.setStatus(this.wasPlayingBeforeError ? 'playing' : 'paused');
    if (line && this.wasPlayingBeforeError) this.advanceAfterLine(line, target);
  }

  /** Continue the chain with THIS line silent (no audio), then resume audio for later lines. */
  continueWithoutAudio(): void {
    if (this.status !== 'error') return;
    const target = this.failingIndex ?? this.index;
    this.failingIndex = null;
    this.startLine(target, { silent: true });
  }

  // ---------------------------------------------------------------- internals

  private setStatus(status: PlaybackStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.emit('stateChange', { status, lineIndex: this.index >= 0 ? this.index : null });
  }

  private clearTimers(): void {
    if (this.gapTimer !== null) {
      clearTimeout(this.gapTimer);
      this.gapTimer = null;
    }
    this.gapFiresAtMs = null;
    this.gapRemainingMs = null;
    if (this.silentTimer !== null) {
      clearTimeout(this.silentTimer);
      this.silentTimer = null;
    }
    this.silentFiresAtMs = null;
    this.silentRemainingMs = null;
  }

  private detachCurrentHandle(): void {
    for (const off of this.detachHandle) off();
    this.detachHandle = [];
  }

  private gapAfter(index: number): number {
    const line = this.dialogue.lines[index];
    return line?.gapAfterMs ?? this.dialogue.turnGapDefaultMs;
  }

  /** Begin a line: emit lineStart, play audio (or run silent), prefetch next two lines. */
  private startLine(index: number, opts?: { silent?: boolean }): void {
    const line = this.dialogue.lines[index];
    if (!line) return;

    this.generation += 1;
    const generation = this.generation;
    this.clearTimers();
    this.detachCurrentHandle();
    if (this.handle) {
      this.handle.stop();
      this.handle = null;
    }
    this.index = index;
    this.effectiveSpeed = this.pendingSpeed;
    // Optimistically mark playing: a load() resolving later must NOT be killed by the
    // "engine went idle" staleness guard, and the UI sees the transition immediately.
    this.setStatus('playing');

    const ref = this.getAudioRef(line);
    const silent = opts?.silent === true || ref === null;
    if (silent) {
      this.emit('lineStart', { line, index, atMs: this.now(), silent: true });
      this.scheduleSilentEnd(this.readingEstimateMs(line));
      this.prefetchFrom(index);
      return;
    }

    this.backend
      .load(ref)
      .then((handle) => {
        // engine may have moved on (stop/seek) while loading
        if (generation !== this.generation) {
          handle.stop();
          return;
        }
        this.handle = handle;
        handle.setPlaybackRate(this.effectiveSpeed);
        this.detachHandle = [
          handle.onEnded(() => {
            if (this.handle === handle) this.finishLine('natural');
          }),
          handle.onError((err) => {
            if (this.handle === handle) this.enterErrorState(err, index);
          }),
        ];
        handle
          .play()
          .then(() => {
            if (this.handle !== handle || generation !== this.generation) return;
            this.emit('lineStart', { line, index, atMs: this.now(), silent: false });
            this.prefetchFrom(index);
          })
          .catch((err: unknown) => {
            if (this.handle === handle && generation === this.generation) this.enterErrorState(err, index);
          });
      })
      .catch((err: unknown) => {
        if (generation === this.generation) this.enterErrorState(err, index);
      });
  }

  private prefetchFrom(index: number): void {
    const refs: AudioAssetRef[] = [];
    for (const i of [index + 1, index + 2]) {
      const line = this.dialogue.lines[i];
      if (!line) break;
      const ref = this.getAudioRef(line);
      if (ref) refs.push(ref);
    }
    if (refs.length > 0) this.backend.prefetch(refs);
  }

  /** A line finished (natural end, silent end). Schedule the gap, then advance. */
  private finishLine(reason: LineEndReason): void {
    const line = this.dialogue.lines[this.index];
    if (!line) return;
    this.detachCurrentHandle();
    this.handle = null;
    this.emit('lineEnd', { line, index: this.index, atMs: this.now(), reason });
    this.advanceAfterLine(line, this.index);
  }

  private advanceAfterLine(line: DialogueLine, index: number): void {
    if (index >= this.dialogue.lines.length - 1) {
      this.setStatus('ended');
      return;
    }
    const gap = line.gapAfterMs ?? this.dialogue.turnGapDefaultMs;
    this.scheduleAdvance(gap);
  }

  /** Schedule the start of line index+1 after `delayMs` (the full gap must elapse — T1). */
  private scheduleAdvance(delayMs: number): void {
    this.gapFiresAtMs = this.now() + delayMs;
    this.gapTimer = setTimeout(() => {
      this.gapTimer = null;
      this.gapFiresAtMs = null;
      this.startLine(this.index + 1);
    }, delayMs);
  }

  private scheduleSilentEnd(delayMs: number): void {
    this.silentFiresAtMs = this.now() + delayMs;
    this.silentTimer = setTimeout(() => {
      this.silentTimer = null;
      this.silentFiresAtMs = null;
      this.finishLine('silent');
    }, delayMs);
  }

  private enterErrorState(err: unknown, index: number): void {
    const line = this.dialogue.lines[index];
    if (!line) return;
    const error = err instanceof AudioError ? err : wrapUnknownAudioError(err, line.id);
    this.wasPlayingBeforeError = this.status === 'playing' || this.status === 'error';
    this.detachCurrentHandle();
    this.handle = null;
    this.clearTimers();
    this.failingIndex = index;
    this.setStatus('error');
    this.emit('error', { error, line });
  }
}

function wrapUnknownAudioError(err: unknown, lineId: string): AudioError {
  const message = err instanceof Error ? err.message : String(err);
  return new UnknownAudioError(message, { lineId });
}
