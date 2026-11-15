/**
 * HANASO — Word / kana independent-audio registry (TASK-LEARNING-06 / WP-1 — DD-119, Issue #103).
 *
 * INTEGRATION BOUNDARY — HONEST STATUS: the ASSET GENERATION pipeline (VOICEVOX
 * pre-generation for every word + every kana glyph) is a separate out-of-scope
 * task. This module implements the CONTRACT side:
 *
 *  - Stable content-id → file mapping (public/audio/words/<id>.{opus,m4a}) read
 *    from `public/audio/words/manifest.json` — same pattern as the per-line
 *    dialogue registry (RealAudioAssets). Keyed by CONTENT ID, never card index.
 *  - Absent manifest/file → returns null and the UI honestly falls back to the
 *    source-line audio (never fakes a word asset).
 *
 * DD-119 owner decision encoded here: every word gets INDEPENDENT audio (not a
 * cut of the line file); mapping is stable by content id; VOICEVOX pre-generated
 * build-time only; runtime TTS forbidden.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** The word-audio manifest shape (mirrors the dialogues manifest pattern). */
export interface WordAudioAssets {
  generatedBy: string;
  format: 'voicevox-opus-m4a';
  /** wordAudio content-id → asset record. */
  entries: Record<string, { bytes: number; bytesM4a?: number; durationMs?: number; hash: string }>;
}

let cache: WordAudioAssets | null | undefined;

/**
 * Load the word-audio manifest (null when the registry does not exist yet —
 * the honest state until the audio generation task ships assets).
 */
export function loadWordAudioAssets(): WordAudioAssets | null {
  if (cache !== undefined) return cache;
  const candidates = [
    path.join(process.cwd(), 'public', 'audio', 'words', 'manifest.json'),
    path.join(process.cwd(), 'apps', 'web', 'public', 'audio', 'words', 'manifest.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      cache = JSON.parse(readFileSync(p, 'utf8')) as WordAudioAssets;
      return cache;
    }
  }
  cache = null;
  return null;
}

/** Test hook — drop the manifest cache. */
export function resetWordAudioCacheForTests(): void {
  cache = undefined;
}

/**
 * Resolve one word's independent-audio URL pair (opus + m4a fallback).
 * Returns null when no committed asset exists — callers fall back to the source
 * line audio honestly (DD-119 rollout state, never a fake file).
 */
export function wordAudioUrls(wordAudioId: string): { opus: string; m4a: string } | null {
  const assets = loadWordAudioAssets();
  if (!assets || !assets.entries[wordAudioId]) return null;
  return {
    opus: `/audio/words/${wordAudioId}.opus`,
    m4a: `/audio/words/${wordAudioId}.m4a`,
  };
}

/** Whether ANY word audio is committed yet (drives the honest UI note). */
export function wordAudioAvailable(): boolean {
  const assets = loadWordAudioAssets();
  return assets !== null && Object.keys(assets.entries).length > 0;
}
