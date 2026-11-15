/**
 * HANASO — audio module public API, CLIENT-SAFE (TASK-DLG-POC-01 / ADR-009).
 * Browser playback lives here; the node-side manifest/voices loader is behind
 * `@/modules/audio/server`.
 */
export { BrowserAudioBackend } from './browser-audio-backend';
// TASK-LEARNING-07 Wave 2: joint-turn composition at the backend edge (pure — no DOM).
export { JointTurnBackend, createJointHandle } from './composite-handle';
export type { JointTurnBackendOptions } from './composite-handle';
