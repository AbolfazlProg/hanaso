/**
 * HANASO — handwriting char-data loader (TASK-LEARNING-07 / DD-105).
 *
 * Client-side loader for the static per-character stroke assets produced by
 * `scripts/copy-writing-data.mjs` (public/writing-data). Availability is
 * answered from the shipped index.json — a character that was never copied is
 * `data_missing`, never fabricated.
 */

import type { WritingAvailability, WritingCharData } from './types';

export const WRITING_DATA_BASE = '/writing-data';

/** index.json shape (see scripts/copy-writing-data.mjs). */
interface WritingDataIndex {
  generatedAt: string;
  chars: Record<string, { strokes: number }>;
}

let indexCache: Promise<WritingDataIndex> | null = null;
const charCache = new Map<string, Promise<WritingCharData>>();

function loadIndex(): Promise<WritingDataIndex> {
  indexCache ??= fetch(`${WRITING_DATA_BASE}/index.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`writing-data index unavailable (${r.status})`);
      return r.json() as Promise<WritingDataIndex>;
    })
    .catch((err: unknown) => {
      indexCache = null; // retryable
      throw err;
    });
  return indexCache;
}

/**
 * Honest availability for a character (kana or kanji — the registry is data-driven).
 * `data_missing` chars render an explanatory state, never a fake exercise.
 */
export async function writingAvailability(character: string): Promise<WritingAvailability> {
  try {
    const index = await loadIndex();
    const entry = index.chars[character];
    return entry ? { status: 'available', strokes: entry.strokes } : { status: 'data_missing' };
  } catch {
    return { status: 'data_missing' };
  }
}

/** Load stroke data for a character; throws when the asset was never shipped. */
export function loadWritingCharData(character: string): Promise<WritingCharData> {
  let cached = charCache.get(character);
  if (!cached) {
    cached = fetch(`${WRITING_DATA_BASE}/${encodeURIComponent(character)}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`stroke data for "${character}" not shipped (${r.status})`);
        return r.json() as Promise<WritingCharData>;
      })
      .catch((err: unknown) => {
        charCache.delete(character); // retryable
        throw err;
      });
    charCache.set(character, cached);
  }
  return cached;
}
