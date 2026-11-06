/**
 * HANASO — host-word / example-word audio registry (TASK-LEARNING-08).
 *
 * The readable sample words shown to the learner get INDEPENDENT, pre-generated
 * audio (one file per word — never the character's sound reused for its word,
 * mission §5). The registry is keyed by the WORD ITSELF, so ONE asset serves
 * every surface that shows the same word:
 *  - the kana card's host word (Addendum-3 §9);
 *  - every example word in the example-set blocks (Addendum-4 §7) — an example
 *    and a host word that are the same word share that word's asset, and a
 *    word with no asset shows NO play control (never a dead or misbound one).
 * Same contract as the kana registry:
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
  entries: Record<string, { bytes: number; bytesM4a?: number; durationMs?: number; hash: string; file?: string }>;
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
 * Resolve one host/example word's audio URL pair. Null when no committed asset
 * exists — the caller hides the affordance honestly. The file stem is the
 * urlencoded word for every word that fits a filesystem component; very long
 * example sentences are committed under a short hash stem, recorded in the
 * manifest entry's `file` field (the resolver never guesses).
 */
export function hostWordAudioUrls(word: string): { opus: string; m4a: string } | null {
  const assets = loadHostWordAudioAssets();
  const entry = assets?.entries[word];
  if (!assets || !entry) return null;
  const stem = entry.file ?? encodeURIComponent(word);
  return {
    opus: `/audio/hostwords/${stem}.opus`,
    m4a: `/audio/hostwords/${stem}.m4a`,
  };
}
