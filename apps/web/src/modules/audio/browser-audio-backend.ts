/**
 * HANASO — browser AudioBackend (TASK-DLG-POC-01) — implements the dialogue engine's
 * injectable AudioBackend on top of HTMLAudioElement.
 *
 * - Dual-source (ADR-009/TR-025): <source src=opus> first, <source src=m4a> fallback —
 *   the browser picks the first playable one. (PoC placeholder: both slots are WAV.)
 * - Two-line prefetch: `new Audio()` + `load()` warms the HTTP cache (AC-955).
 * - Availability probe via HEAD fetch → typed MissingFileError with full asset identity
 *   (lineId/voiceId/hash) so errors are traceable.
 * - Typed errors: MissingFileError / DecodeError / NetworkError / AbortedError.
 * - iOS Safari: playback starts from the user-gesture call chain (engine.play() is
 *   invoked from click handlers) — no extra unlock needed for this PoC.
 *
 * Client-side only.
 */
import { AbortedError, DecodeError, MissingFileError, NetworkError } from '@/modules/dialogue';
import type { AudioBackend, AudioHandle, PlaybackSpeed } from '@/modules/dialogue';
import type { AudioAssetRef } from '@/modules/dialogue';

const MIME: Record<string, string> = {
  opus: 'audio/ogg; codecs=opus',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
};

function mimeFor(url: string): string {
  if (url.endsWith('.wav')) return MIME.wav!;
  if (url.endsWith('.m4a')) return MIME.m4a!;
  return MIME.opus!;
}

/** Map a DOMException/MediaError from the media element into a typed AudioError. */
function mapElementError(
  err: unknown,
  ref: AudioAssetRef,
): NetworkError | DecodeError | MissingFileError | AbortedError {
  const ctx = { lineId: ref.lineId, voiceId: ref.voiceId, hash: ref.hash };
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotSupportedError':
        return new MissingFileError(`audio source not playable/missing for line ${ref.lineId}`, ctx);
      case 'AbortError':
        return new AbortedError(`audio load aborted for line ${ref.lineId}`, ctx);
      case 'NetworkError':
        return new NetworkError(`network error while fetching line ${ref.lineId}`, ctx);
      default:
        return new DecodeError(`decode failed for line ${ref.lineId}: ${err.message}`, ctx);
    }
  }
  return new DecodeError(`playback failed for line ${ref.lineId}: ${String(err)}`, ctx);
}

class HtmlAudioHandle implements AudioHandle {
  constructor(
    private readonly el: HTMLAudioElement,
    private readonly ref: AudioAssetRef,
  ) {}

  async play(): Promise<void> {
    try {
      await this.el.play();
    } catch (err) {
      throw mapElementError(err, this.ref);
    }
  }

  pause(): void {
    this.el.pause();
  }

  resume(): void {
    void this.el.play().catch(() => {
      /* surfaced through the element 'error' event / next play() */
    });
  }

  stop(): void {
    this.el.pause();
    try {
      this.el.currentTime = 0;
    } catch {
      /* not loaded yet */
    }
  }

  seekToStart(): void {
    try {
      this.el.currentTime = 0;
    } catch {
      /* not loaded yet */
    }
  }

  setPlaybackRate(rate: PlaybackSpeed): void {
    this.el.playbackRate = rate;
  }

  onEnded(cb: () => void): () => void {
    this.el.addEventListener('ended', cb);
    return () => this.el.removeEventListener('ended', cb);
  }

  onError(cb: (err: NetworkError | DecodeError | MissingFileError | AbortedError) => void): () => void {
    const handler = () => cb(mapElementError(this.el.error ?? new Error('media error'), this.ref));
    this.el.addEventListener('error', handler);
    return () => this.el.removeEventListener('error', handler);
  }

  get durationMs(): number | undefined {
    return Number.isFinite(this.el.duration) ? Math.round(this.el.duration * 1000) : undefined;
  }
}

export class BrowserAudioBackend implements AudioBackend {
  /** lineId → prepared element (prefetch cache). */
  private readonly cache = new Map<string, HTMLAudioElement>();
  private readonly inFlight = new Map<string, Promise<HTMLAudioElement>>();

  async load(ref: AudioAssetRef): Promise<AudioHandle> {
    const el = await this.prepare(ref);
    return new HtmlAudioHandle(el, ref);
  }

  prefetch(refs: AudioAssetRef[]): void {
    for (const ref of refs) {
      if (this.cache.has(ref.lineId) || this.inFlight.has(ref.lineId)) continue;
      void this.prepare(ref).catch(() => {
        /* failures surface at load() time with typed errors */
      });
    }
  }

  /** Number of lines warmed in the cache (T8 observability). */
  get cacheSize(): number {
    return this.cache.size;
  }

  private async prepare(ref: AudioAssetRef): Promise<HTMLAudioElement> {
    const cached = this.cache.get(ref.lineId);
    if (cached) return cached;
    const pending = this.inFlight.get(ref.lineId);
    if (pending) return pending;

    const task = (async () => {
      // Availability probe — gives typed, traceable errors before touching the element.
      const primaryOk = await this.probe(ref.files.opus);
      const chosen = primaryOk
        ? ref.files.opus
        : await this.probe(ref.files.m4a).then((ok) => (ok ? ref.files.m4a : null));
      if (chosen === null) {
        throw new MissingFileError(
          `no playable audio file for line ${ref.lineId} (voice ${ref.voiceId}, hash ${ref.hash}) — expected ${ref.files.opus}`,
          { lineId: ref.lineId, voiceId: ref.voiceId, hash: ref.hash },
        );
      }
      const el = new Audio();
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      // Dual <source> (ADR-009): browser picks the first playable entry.
      const s1 = document.createElement('source');
      s1.src = ref.files.opus;
      s1.type = mimeFor(ref.files.opus);
      const s2 = document.createElement('source');
      s2.src = ref.files.m4a;
      s2.type = mimeFor(ref.files.m4a);
      el.append(s1, s2);
      el.load();
      this.cache.set(ref.lineId, el);
      return el;
    })();

    this.inFlight.set(ref.lineId, task);
    try {
      return await task;
    } finally {
      this.inFlight.delete(ref.lineId);
    }
  }

  private async probe(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      throw new NetworkError(`HEAD probe failed for ${url} (network/offline)`);
    }
  }
}
