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
