/**
 * HANASO — Word / kana independent-audio registry (TASK-LEARNING-06 / WP-1 — DD-119, Issue #103;
 * AUDIO-UNIT 2026-11-23 — the structural registry).
 *
 * INTEGRATION BOUNDARY — HONEST STATUS: the ASSET GENERATION pipeline (VOICEVOX
 * pre-generation for every word + every kana glyph) runs on an ISOLATED OFFLINE
 * RUNNER (never on the VPS/production — owner constraint 2026-11-21). This module
 * implements the CONTRACT side:
 *
 *  - Stable content-id → file mapping (public/audio/words/<id>.{opus,m4a}) read
 *    from `public/audio/words/manifest.json` — same pattern as the per-line
 *    dialogue registry (RealAudioAssets). Keyed by CONTENT ID, never card index.
 *  - AUDIO-UNIT §۱ — every entry carries the STRUCTURAL metadata (exact spoken
 *    text, target id, unit type, pedagogical role, voice, production source,
 *    file paths, validation state). A registry row whose file does not say the
 *    text it claims fails the EQA-13 gate.
 *  - Absent manifest/file → returns null and the UI honestly shows NO audio
 *    control (never fakes a word asset, and NEVER substitutes the dialogue-line
 *    audio — the AUDIO-UNIT owner rule 2026-11-23: «اگر صوت مستقل واژه وجود
 *    ندارد، آن را با صوت مکالمه جایگزین نکن؛ نبود صوت را صادقانه مشخص کن»).
 *
 * DD-119 owner decision encoded here: every word gets INDEPENDENT audio (not a
 * cut of the line file); mapping is stable by content id; VOICEVOX pre-generated
 * build-time only; runtime TTS forbidden.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { AudioUnitKind, ExerciseAudioBinding, TeachingAudioAssets, VocabItem } from '@/modules/curriculum/types';

export type { TeachingAudioAssets } from '@/modules/curriculum/types';

/** The word-audio manifest shape (legacy flat entries are tolerated — none are shipped). */
export type WordAudioAssets = TeachingAudioAssets;

let cache: TeachingAudioAssets | null | undefined;

/**
 * Load the word-audio manifest (null when the registry does not exist yet —
 * the honest state until the audio generation task ships assets).
 */
export function loadWordAudioAssets(): TeachingAudioAssets | null {
  if (cache !== undefined) return cache;
  const candidates = [
    path.join(process.cwd(), 'public', 'audio', 'words', 'manifest.json'),
    path.join(process.cwd(), 'apps', 'web', 'public', 'audio', 'words', 'manifest.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      cache = JSON.parse(readFileSync(p, 'utf8')) as TeachingAudioAssets;
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

/** The 16-hex content hash of a spoken text under a voice — the DD-119 content↔file contract. */
export function audioContentHash(text: string, speaker = 90): string {
  return createHash('sha256').update(`${text}|voicevox:${speaker}`).digest('hex').slice(0, 16);
}

/** Deterministic content-id of a standalone WORD-FORM asset (its own file, its own manifest row). */
export function wordFormAudioId(text: string, speaker = 90): string {
  return `waf-${audioContentHash(text, speaker)}`;
}

/** Deterministic content-id of a standalone SENTENCE asset (grammar-in-sentence form). */
export function sentenceAudioId(text: string, speaker = 90): string {
  return `se-${audioContentHash(text, speaker)}`;
}

/**
 * Resolve one word's independent-audio URL pair (opus + m4a fallback).
 * Returns null when no committed asset exists — callers show NO control
 * honestly (AUDIO-UNIT: never the line audio as a substitute, never a fake file).
 */
export function wordAudioUrls(wordAudioId: string): { opus: string; m4a: string } | null {
  const assets = loadWordAudioAssets();
  if (!assets || !assets.entries[wordAudioId]) return null;
  return {
    opus: `/audio/words/${wordAudioId}.opus`,
    m4a: `/audio/words/${wordAudioId}.m4a`,
  };
}

/** Resolve ANY committed teaching-audio asset by content id (word / word-form / sentence). */
export function teachingAudioUrls(contentId: string): { opus: string; m4a: string } | null {
  return wordAudioUrls(contentId);
}

/**
 * The manifest content-id an exercise audio binding resolves to
 * (word → the word's own `wordAudio` id; word-form / sentence → the deterministic
 * text-stem id; line/context → null — they are not words-registry assets).
 */
export function contentIdOfBinding(
  binding: ExerciseAudioBinding,
  wordsById: ReadonlyMap<string, VocabItem>,
): string | null {
  switch (binding.unit) {
    case 'word': {
      const word = wordsById.get(binding.wordId);
      return word?.wordAudio ?? null;
    }
    case 'word-form':
      return wordFormAudioId(binding.text);
    case 'sentence':
      return sentenceAudioId(binding.text);
    case 'context':
      return null;
    case 'line':
      return null;
  }
}

/** One manifest entry (or null) — the EQA-13 gate reads the structural metadata from here. */
export function wordAudioEntry(contentId: string): TeachingAudioAssets['entries'][string] | null {
  const assets = loadWordAudioAssets();
  return assets?.entries[contentId] ?? null;
}

/** Whether ANY word audio is committed yet (drives the honest UI note). */
export function wordAudioAvailable(): boolean {
  const assets = loadWordAudioAssets();
  return assets !== null && Object.keys(assets.entries).length > 0;
}

/** The unit kinds this registry can carry (manifest rows validate against this). */
export const WORDS_REGISTRY_UNIT_KINDS: readonly AudioUnitKind[] = ['word', 'word-form', 'sentence'];
