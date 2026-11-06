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
export { wordAudioAvailable, wordAudioUrls } from './word-audio';
export type { WordAudioAssets } from './word-audio';
// TASK-LEARNING-08 (WP-3): the kana-audio registry (DD-081/DD-121) — same rule.
export { kanaAudioUrls } from './kana-audio';
export type { KanaAudioAssets } from './kana-audio';
