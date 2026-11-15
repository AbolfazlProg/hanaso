/**
 * HANASO — Dialogue module types (TASK-DLG-POC-01).
 * Source of truth: KB `dialogue-content-schema.md` §۲ (dialogue/dialogue_lines/characters)
 * + audio asset refs per KB `audio-multi-speaker-architecture.md` §۲ (ADR-009 dual-format).
 * This module is the *engine-side* contract; content validation lives in content/schema.ts.
 */

/** One surface form inside a dialogue line, with its reading (furigana source of truth). */
export interface DialogueToken {
  surface: string;
  reading: string;
  pos?: string;
  katakana?: boolean;
  chunk?: string;
}

/** A single dialogue turn — maps to `content.dialogue_lines` (KB dialogue-content-schema §۲). */
export interface DialogueLine {
  id: string;
  speaker: string; // character id (chr-*)
  /** TASK-LEARNING-07: joint turn co-speaker (05B §6 — both speakers shown in
   * the subtitle; the co-speaker audio asset `${lineId}-co` plays simultaneously). */
  coSpeaker?: string;
  frame?: string; // 'wide' | 'speaker-a' | 'speaker-b' | 'close'
  tokens: DialogueToken[];
  fa: string;
  /** Raw emotion tag from content; mapped to ExpressionTag by the character module (ADR-018 §۲-۲). */
  emotionTag?: string;
  /** Silence after this line, in ms. Falls back to dialogue.turnGapDefaultMs. */
  gapAfterMs?: number;
  /** Per-line voice override (only for special emotional lines) — KB audio-ms §۲. */
  voiceOverride?: string;
  /** Learning items this line teaches (vocab/grammar/chunk ids) — T6 wiring. */
  teaches?: string[];
}

/** Speaker card — resolved from the character registry (ADR-018 manifests) at the API edge. */
export interface CharacterRef {
  id: string;
  nameJa: string;
  nameFa: string;
  /** Token name from tokens.css (DD-067), e.g. 'speaker-1' → var(--color-speaker-1). */
  colorToken: string;
  voiceId: string;
}

/**
 * Ready-to-play audio for one line (build-time VOICEVOX output — never runtime TTS).
 * Dual-source per ADR-009: `files.opus` is primary, `files.m4a` is the fallback.
 *
 * ⚠️ PoC honesty note: the final pipeline emits Opus + AAC/m4a. The PoC placeholder
 * generator (`apps/web/scripts/generate-placeholder-audio.mjs`) emits deterministic WAV
 * and fills BOTH slots with the same .wav URL so the dual-source playback path is still
 * exercised end-to-end. See docs/research/DLG-POC-01-REPORT.md.
 */
export interface AudioAssetRef {
  lineId: string;
  voiceId: string;
  /** sha256 of {text, voiceId} — stable content→asset identity (ADR-009 hash naming). */
  hash: string;
  files: { opus: string; m4a: string };
  bytes: number;
  durationMs?: number;
}

/** A full dialogue (KB dialogue-content-schema §۴). */
export interface Dialogue {
  id: string;
  scene: string;
  characterIds: string[];
  turnGapDefaultMs: number;
  lines: DialogueLine[];
}

/** Playback rates supported in v1 (KB audio-ms §۶: speed changes apply at line boundaries). */
export type PlaybackSpeed = 0.75 | 1;
