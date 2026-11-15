/**
 * HANASO — Kana independent-audio registry (TASK-LEARNING-08 / WP-3 — DD-081/DD-121).
 *
 * Same contract as the word-audio registry (DD-119 pattern):
 *  - Stable content-id → file mapping (public/audio/kana/<ref>.{opus,m4a}) read
 *    from `public/audio/kana/manifest.json`; files are PRE-GENERATED with
 *    VOICEVOX (the DD-081 pipeline) — live runtime TTS stays forbidden.
 *  - Absent manifest/file → null; the kana card hides the sound affordance
 *    honestly (owner feedback A needs the SOUND, never a fake or mislinked one).
 *  - One file per character — the manifest is keyed by content id, so a file can
 *    never silently serve two characters (mission §5: wrong-file reuse forbidden).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** The kana-audio manifest shape (mirrors the dialogues/words registries). */
export interface KanaAudioAssets {
  generatedBy: string;
  format: 'voicevox-opus-m4a';
  /** audioRef (content id) → asset record. */
  entries: Record<string, { bytes: number; bytesM4a?: number; durationMs?: number; hash: string }>;
}

let cache: KanaAudioAssets | null | undefined;

/**
 * Load the kana-audio manifest (null when the registry does not exist yet —
 * the honest state until assets land; the UI degrades, never fakes).
 */
export function loadKanaAudioAssets(): KanaAudioAssets | null {
  if (cache !== undefined) return cache;
  const candidates = [
    path.join(process.cwd(), 'public', 'audio', 'kana', 'manifest.json'),
    path.join(process.cwd(), 'apps', 'web', 'public', 'audio', 'kana', 'manifest.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      cache = JSON.parse(readFileSync(p, 'utf8')) as KanaAudioAssets;
      return cache;
    }
  }
  cache = null;
  return null;
}

/** Test hook — drop the manifest cache. */
export function resetKanaAudioCacheForTests(): void {
  cache = undefined;
}

/**
 * Resolve one kana's audio URL pair (opus + m4a fallback). Null when no
 * committed asset exists — callers hide the play affordance honestly.
 */
export function kanaAudioUrls(audioRef: string): { opus: string; m4a: string } | null {
  const assets = loadKanaAudioAssets();
  if (!assets || !assets.entries[audioRef]) return null;
  return {
    opus: `/audio/kana/${audioRef}.opus`,
    m4a: `/audio/kana/${audioRef}.m4a`,
  };
}
