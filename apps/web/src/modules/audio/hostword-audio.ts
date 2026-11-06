/**
 * HANASO — host-word audio registry (TASK-LEARNING-08 Addendum-3 §9).
 *
 * The readable sample words shown inside the kana card get INDEPENDENT,
 * pre-generated audio (one file per word — never the character's sound
 * reused for its word, mission §5). Same contract as the kana registry:
 *  - manifest at `public/audio/hostwords/manifest.json`, keyed by the WORD
 *    itself (content id — stable, never card index);
 *  - files at `public/audio/hostwords/<urlencoded-word>.{opus,m4a}`;
 *  - absent manifest/entry → null → the UI hides the play control honestly
 *    (never a fake or mislinked sound).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface HostWordAudioAssets {
  generatedBy: string;
  format: 'voicevox-opus-m4a';
  /** word text (content id) → asset record. */
  entries: Record<string, { bytes: number; bytesM4a?: number; durationMs?: number; hash: string }>;
}

let cache: HostWordAudioAssets | null | undefined;

export function loadHostWordAudioAssets(): HostWordAudioAssets | null {
  if (cache !== undefined) return cache;
  const candidates = [
    path.join(process.cwd(), 'public', 'audio', 'hostwords', 'manifest.json'),
    path.join(process.cwd(), 'apps', 'web', 'public', 'audio', 'hostwords', 'manifest.json'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      cache = JSON.parse(readFileSync(p, 'utf8')) as HostWordAudioAssets;
      return cache;
    }
  }
  cache = null;
  return null;
}

/** Test hook — drop the manifest cache. */
export function resetHostWordAudioCacheForTests(): void {
  cache = undefined;
}

/**
 * Resolve one host word's audio URL pair. Null when no committed asset exists
 * — the caller hides the affordance honestly.
 */
export function hostWordAudioUrls(word: string): { opus: string; m4a: string } | null {
  const assets = loadHostWordAudioAssets();
  if (!assets || !assets.entries[word]) return null;
  const id = encodeURIComponent(word);
  return {
    opus: `/audio/hostwords/${id}.opus`,
    m4a: `/audio/hostwords/${id}.m4a`,
  };
}
