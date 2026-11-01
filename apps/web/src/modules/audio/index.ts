/**
 * HANASO — audio module public API, CLIENT-SAFE (TASK-DLG-POC-01 / ADR-009).
 * Browser playback lives here; the node-side manifest/voices loader is behind
 * `@/modules/audio/server`.
 */
export { BrowserAudioBackend } from './browser-audio-backend';
