/**
 * HANASO — joint-turn composite audio (TASK-LEARNING-07 Wave 2 · 05B §6 · DR-01d — Issues #98/#100 group).
 *
 * A joint dialogue line (primary `speaker` + `co_speaker`, e.g. the shared
 * よろしく おねがいします goodbye in first-meeting-01 l13) has TWO audio assets:
 * the primary `${lineId}` and the co-speaker's `${lineId}-co`. Both must play
 * SIMULTANEOUSLY while the pure PlaybackEngine keeps loading exactly ONE handle
 * per line — so the composition happens at the backend edge, never inside the
 * engine (the engine stays untouched and pure):
 *
 *   JointTurnBackend.load(primaryRef)
 *     ├─ inner.load(primaryRef)      → primary handle (typed errors PROPAGATE → engine error state)
 *     ├─ inner.load(`${lineId}-co`)  → co handle (any failure is SWALLOWED → primary-only playback)
 *     └─ createJointHandle(primary, co) → ONE AudioHandle driving both elements
 *
 * Joint handle semantics (proven in tests/unit/dialogue/joint-turn.spec.ts):
 * - play/pause/resume/stop/seekToStart/setPlaybackRate hit BOTH handles;
 * - onEnded fires only after BOTH ended (the longer asset defines the line length);
 * - onError forwards ONLY primary errors (the engine keeps its typed-error
 *   recovery path); a co-asset failure at ANY stage (load, play, mid-play) is
 *   dropped silently and playback continues with the primary alone — honest
 *   degradation, never a fake asset and never an unrecoverable error state.
 *
 * Pure TypeScript, no DOM — unit-testable with the fake handles from tests/helpers.
 */
import type { AudioAssetRef, AudioBackend, AudioError, AudioHandle, PlaybackSpeed } from '@/modules/dialogue';

/**
 * Create ONE handle that drives a primary and an optional co-speaker handle.
 * `co === null` (asset not generated / failed to load) degenerates to the primary.
 */
export function createJointHandle(primary: AudioHandle, co: AudioHandle | null): AudioHandle {
  return new JointAudioHandle(primary, co);
}

class JointAudioHandle implements AudioHandle {
  private primary: AudioHandle;
  private co: AudioHandle | null;
  private primaryEnded = false;
  /** True once the co side ended OR was dropped (trivially true when co === null). */
  private coEnded: boolean;
  private readonly endedCbs: (() => void)[] = [];
  private readonly errorCbs: ((err: AudioError) => void)[] = [];
  private readonly offs: (() => void)[] = [];

  constructor(primary: AudioHandle, co: AudioHandle | null) {
    this.primary = primary;
    this.co = co;
    this.coEnded = co === null;
    this.offs.push(
      primary.onEnded(() => {
        this.primaryEnded = true;
        this.maybeEnded();
      }),
      // ONLY primary errors surface: the engine enters its typed-error recovery.
      primary.onError((err) => {
        for (const cb of [...this.errorCbs]) cb(err);
      }),
    );
    if (co) {
      this.offs.push(
        co.onEnded(() => {
          this.coEnded = true;
          this.maybeEnded();
        }),
        // A co-only failure is dropped silently — continue with the primary alone.
        co.onError(() => {
          this.dropCo();
        }),
      );
    }
  }

  async play(): Promise<void> {
    this.resetEndedFlags();
    let coFailed = false;
    const coPlay = this.co
      ? this.co.play().catch(() => {
          coFailed = true; // co asset failed to START — degrade to primary-only
        })
      : Promise.resolve();
    try {
      await this.primary.play(); // typed errors propagate (engine error state)
    } catch (err) {
      this.dropCo(); // never leave the co side running alone after a primary failure
      throw err;
    }
    await coPlay;
    if (coFailed) this.dropCo();
  }

  pause(): void {
    this.primary.pause();
    this.co?.pause();
  }

  resume(): void {
    this.primary.resume();
    this.co?.resume();
  }

  stop(): void {
    this.primary.stop();
    this.co?.stop();
    this.resetEndedFlags();
  }

  seekToStart(): void {
    this.primary.seekToStart();
    this.co?.seekToStart();
    this.resetEndedFlags();
  }

  setPlaybackRate(rate: PlaybackSpeed): void {
    this.primary.setPlaybackRate(rate);
    this.co?.setPlaybackRate(rate);
  }

  onEnded(cb: () => void): () => void {
    this.endedCbs.push(cb);
    return () => {
      spliceOnce(this.endedCbs, cb);
    };
  }

  onError(cb: (err: AudioError) => void): () => void {
    this.errorCbs.push(cb);
    return () => {
      spliceOnce(this.errorCbs, cb);
    };
  }

  get durationMs(): number | undefined {
    const vals = [this.primary.durationMs, this.co?.durationMs].filter(
      (v): v is number => typeof v === 'number',
    );
    return vals.length > 0 ? Math.max(...vals) : undefined;
  }

  /** Co side failed at runtime — halt it and continue on the primary alone. */
  private dropCo(): void {
    const failing = this.co;
    this.co = null;
    this.coEnded = true;
    if (failing) {
      try {
        failing.stop(); // best-effort halt of the broken asset
      } catch {
        /* the co asset already failed — nothing to preserve */
      }
    }
    this.maybeEnded(); // primary may already have ended while co was failing
  }

  /** The line ends when BOTH sides are done (co dropped/absent counts as done). */
  private maybeEnded(): void {
    if (this.primaryEnded && this.coEnded) {
      for (const cb of [...this.endedCbs]) cb();
    }
  }

  private resetEndedFlags(): void {
    this.primaryEnded = false;
    this.coEnded = this.co === null;
  }
}

function spliceOnce<T>(arr: T[], item: T): void {
  const i = arr.indexOf(item);
  if (i >= 0) arr.splice(i, 1);
}

/** Options for the joint-turn backend wrapper. */
export interface JointTurnBackendOptions {
  /** The wrapped backend (e.g. BrowserAudioBackend). */
  backend: AudioBackend;
  /**
   * Resolve the co-speaker's AudioAssetRef for a primary line ref — return null
   * for plain single-speaker lines (no joint composition). Typically a lookup of
   * the manifest entry keyed `${lineId}-co`.
   */
  coRefFor: (ref: AudioAssetRef) => AudioAssetRef | null;
}

/**
 * Wraps an AudioBackend with joint-turn support (TASK-LEARNING-07):
 *
 * - `load(primaryRef)` also loads the co-speaker asset when `coRefFor` resolves
 *   one, and returns a composite handle playing both simultaneously;
 * - `prefetch(refs)` warms BOTH sides of the upcoming lines;
 * - a missing/failed co asset degrades to primary-only playback (honest — the
 *   honest placeholder note stays truthful); a failed PRIMARY asset propagates
 *   its typed error untouched, exactly as the unwrapped backend would.
 */
export class JointTurnBackend implements AudioBackend {
  private readonly backend: AudioBackend;
  private readonly coRefFor: (ref: AudioAssetRef) => AudioAssetRef | null;

  constructor(opts: JointTurnBackendOptions) {
    this.backend = opts.backend;
    this.coRefFor = opts.coRefFor;
  }

  load(ref: AudioAssetRef): Promise<AudioHandle> {
    return this.loadJoint(ref);
  }

  prefetch(refs: AudioAssetRef[]): void {
    const expanded: AudioAssetRef[] = [];
    for (const ref of refs) {
      expanded.push(ref);
      const coRef = this.coRefFor(ref);
      if (coRef) expanded.push(coRef);
    }
    if (expanded.length > 0) this.backend.prefetch(expanded);
  }

  private async loadJoint(ref: AudioAssetRef): Promise<AudioHandle> {
    const coRef = this.coRefFor(ref);
    const primary = await this.backend.load(ref); // primary failure → typed error propagates
    if (!coRef) return primary;
    let co: AudioHandle | null = null;
    try {
      co = await this.backend.load(coRef);
    } catch {
      co = null; // honest degradation: play the primary asset alone
    }
    return createJointHandle(primary, co);
  }
}
