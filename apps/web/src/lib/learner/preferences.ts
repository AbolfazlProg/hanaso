/**
 * HANASO — learner display preferences (UX-AUDIT #144/#143, device-local).
 *
 * The minimal honest settings layer: the name the exercises address you by
 * and the two display defaults a beginner actually needs (subtitle default —
 * the audited «پیش‌فرض خاموش» complaint; audio speed default). Everything is
 * device-local localStorage — no fake account system (identity = the signed
 * cookie; #109's auth task owns the server-side profile).
 *
 * PURE client helpers (no React) — consumed by the settings form AND the
 * exercise session (the name chip prefill) AND the dialogue player (the
 * subtitle/speed defaults as initial state).
 */

export const LEARNER_NAME_KEY = 'hanaso.learnerName.v1';
export const SUBTITLE_DEFAULT_KEY = 'hanaso.pref.subtitle.v1';
export const AUDIO_SPEED_DEFAULT_KEY = 'hanaso.pref.audioSpeed.v1';

export type AudioSpeedDefault = 'normal' | 'slow';

export function readLearnerName(): string {
  try {
    return window.localStorage.getItem(LEARNER_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function writeLearnerName(name: string): void {
  try {
    const trimmed = name.trim();
    if (trimmed) window.localStorage.setItem(LEARNER_NAME_KEY, trimmed);
    else window.localStorage.removeItem(LEARNER_NAME_KEY);
  } catch {
    /* storage unavailable — the name just stays session-local */
  }
}

/** The subtitle default (true = Persian subtitles ON at the start of a dialogue). */
export function readSubtitleDefault(): boolean {
  try {
    return window.localStorage.getItem(SUBTITLE_DEFAULT_KEY) === 'on';
  } catch {
    return false;
  }
}

export function writeSubtitleDefault(on: boolean): void {
  try {
    window.localStorage.setItem(SUBTITLE_DEFAULT_KEY, on ? 'on' : 'off');
  } catch {
    /* storage unavailable */
  }
}

/** The audio speed default (normal | slow) — 1 vs 0.8 playback rate seed. */
export function readAudioSpeedDefault(): AudioSpeedDefault {
  try {
    return window.localStorage.getItem(AUDIO_SPEED_DEFAULT_KEY) === 'slow' ? 'slow' : 'normal';
  } catch {
    return 'normal';
  }
}

export function writeAudioSpeedDefault(v: AudioSpeedDefault): void {
  try {
    window.localStorage.setItem(AUDIO_SPEED_DEFAULT_KEY, v);
  } catch {
    /* storage unavailable */
  }
}
