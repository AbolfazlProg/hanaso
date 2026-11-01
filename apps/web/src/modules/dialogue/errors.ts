/**
 * HANASO — typed audio errors for the dialogue playback chain (TASK-DLG-POC-01).
 * The engine surfaces these via `onError`; the browser backend (modules/audio) creates
 * them from HTMLAudioElement/MediaError/fetch failures. Codes follow the shared
 * `module/cause` envelope convention (KB backend-architecture).
 */

export type AudioErrorCode =
  'audio/missing-file' | 'audio/decode' | 'audio/network' | 'audio/aborted' | 'audio/unsupported' | 'audio/unknown';

/** Base class — always carries enough context to trace the failing asset (ADR-009 identity). */
export abstract class AudioError extends Error {
  readonly code: AudioErrorCode;
  /** Line whose audio failed (undefined if not line-scoped). */
  readonly lineId?: string;
  readonly voiceId?: string;
  readonly hash?: string;

  protected constructor(
    code: AudioErrorCode,
    message: string,
    ctx?: { lineId?: string; voiceId?: string; hash?: string },
  ) {
    super(message);
    this.name = 'AudioError';
    this.code = code;
    this.lineId = ctx?.lineId;
    this.voiceId = ctx?.voiceId;
    this.hash = ctx?.hash;
  }
}

/** The asset file is not present at its manifest URL (404 / not generated yet). */
export class MissingFileError extends AudioError {
  constructor(message: string, ctx?: { lineId?: string; voiceId?: string; hash?: string }) {
    super('audio/missing-file', message, ctx);
    this.name = 'MissingFileError';
  }
}

/** The browser fetched bytes but could not decode them (corrupt/unsupported codec). */
export class DecodeError extends AudioError {
  constructor(message: string, ctx?: { lineId?: string; voiceId?: string; hash?: string }) {
    super('audio/decode', message, ctx);
    this.name = 'DecodeError';
  }
}

/** Transport-level failure (offline, DNS, aborted fetch, HTTP 5xx). */
export class NetworkError extends AudioError {
  constructor(message: string, ctx?: { lineId?: string; voiceId?: string; hash?: string }) {
    super('audio/network', message, ctx);
    this.name = 'NetworkError';
  }
}

/** Playback was aborted (e.g. element torn down mid-load) — usually retriable. */
export class AbortedError extends AudioError {
  constructor(message: string, ctx?: { lineId?: string; voiceId?: string; hash?: string }) {
    super('audio/aborted', message, ctx);
    this.name = 'AbortedError';
  }
}

/** Defensive wrapper for non-typed failures (backends should always throw typed errors). */
export class UnknownAudioError extends AudioError {
  constructor(message: string, ctx?: { lineId?: string; voiceId?: string; hash?: string }) {
    super('audio/unknown', message, ctx);
    this.name = 'UnknownAudioError';
  }
}
