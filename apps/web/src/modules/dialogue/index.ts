/**
 * HANASO — dialogue module public API, CLIENT-SAFE (KB ADR-001 L1: cross-module imports
 * via public entries only; node builtins live behind `@/modules/dialogue/server`).
 * TASK-DLG-POC-01.
 */
export type { AudioAssetRef, CharacterRef, Dialogue, DialogueLine, DialogueToken, PlaybackSpeed } from './types';
export { CONTENT_EMOTION_TAGS, CONTENT_FRAMES, lineText } from './content/schema';
export { AudioError, AbortedError, DecodeError, MissingFileError, NetworkError, UnknownAudioError } from './errors';
export type {
  AudioBackend,
  AudioHandle,
  ErrorEvent,
  LineEndEvent,
  LineEndReason,
  LineStartEvent,
  PlaybackEngineOptions,
  PlaybackEventName,
  PlaybackEvents,
  PlaybackStatus,
  StateChangeEvent,
} from './player/playback-engine';
export { defaultReadingEstimateMs, PlaybackEngine } from './player/playback-engine';
