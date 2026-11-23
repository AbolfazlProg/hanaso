/**
 * HANASO — audio module SERVER entry (node-only public API; TASK-DLG-POC-01).
 * Line-audio manifest building, voices.yaml loading, generator sidecar reading.
 */
export type {
  AudioSidecar,
  BuildManifestInput,
  DialogueAudioManifest,
  LineAudioManifestEntry,
  VoiceConfig,
} from './audio-manifest';
export {
  buildAudioManifest,
  loadAudioSidecar,
  loadVoices,
  manifestForDialogue,
  placeholderUrls,
} from './audio-manifest';
// TASK-LEARNING-07 Wave 2 (Issue #103): the word-audio registry (DD-119) resolves
// server-side only (node:fs) — RSC pages import it through this public entry.
// AUDIO-UNIT 2026-11-23: the registry now carries the full structural metadata
// (text/target/unit/role/voice/source/path/validation) and resolves every
// teaching-audio content id (word / word-form / sentence).
export {
  wordAudioAvailable,
  wordAudioUrls,
  teachingAudioUrls,
  contentIdOfBinding,
  wordFormAudioId,
  sentenceAudioId,
  audioContentHash,
} from './word-audio';
export type { WordAudioAssets, TeachingAudioAssets } from './word-audio';
export type { TeachingAudioEntry, AudioUnitKind } from '@/modules/curriculum/types';
// TASK-LEARNING-08 (WP-3): the kana-audio registry (DD-081/DD-121) — same rule.
export { kanaAudioUrls } from './kana-audio';
export type { KanaAudioAssets } from './kana-audio';
// TASK-LEARNING-08 Addendum-3 §9: the host-word audio registry (readable
// sample words inside the kana card) — server-side resolution, same contract.
export { hostWordAudioUrls, loadHostWordAudioAssets } from './hostword-audio';
export type { HostWordAudioAssets } from './hostword-audio';
