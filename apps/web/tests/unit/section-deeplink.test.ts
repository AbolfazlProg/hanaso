/**
 * HANASO — Section deep-link + replay href tests (TASK-HANASO-17 §۶/§۷).
 *
 * - `sectionOfStation` — the pure data lookup behind the «بازگشت به همان
 *   Section» deep-link (?s=) of every lesson exit.
 * - the journey DTOs (server flatten + API) — a completed row's href carries
 *   `?mode=review` (the lesson re-opens FROM THE TOP, never the completed
 *   wall), all other rows link the normal walk.
 */
import { describe, expect, it } from 'vitest';

import { getChapter } from '@/modules/curriculum/content';
import { resolveJourney, resolveSections, sectionOfStation } from '@/modules/curriculum/journey';
import { LEVELS_BY_CODE } from '@/modules/curriculum/content/levels';
import type { Chapter, StationState } from '@/modules/curriculum/types';

const chapter = getChapter('kana-foundation-01') as Chapter;
const level = LEVELS_BY_CODE[chapter.levelCode]!;

function journeyWith(states: StationState[]) {
  return resolveJourney(chapter, level, states, null);
}

describe('sectionOfStation (§۷ — the map deep-link target)', () => {
  it('maps a station to its ChapterUnit slug (data-driven grouping)', () => {
    expect(sectionOfStation(chapter, 'stn-kana-h0')).toBe('section-a-hiragana');
  });

  it('returns null when the chapter declares no units (implicit section → no ?s=)', () => {
    const fake = { ...chapter, units: undefined } as Chapter;
    expect(sectionOfStation(fake, 'stn-kana-h0')).toBeNull();
  });

  it('returns null for an unknown station (honest fallback)', () => {
    expect(sectionOfStation(chapter, 'stn-does-not-exist')).toBeNull();
  });
});

describe('journey sections → replay hrefs (§۶ — completed lessons always reviewable)', () => {
  it('a completed station row gets ?mode=review; fresh rows link the normal walk', () => {
    // h0 completed, h1 in progress, h2+ untouched
    const states: StationState[] = [
      { stationSlug: 'stn-kana-h0', status: 'completed', bestScore: null, attemptCount: 1 },
      {
        stationSlug: 'stn-kana-h1',
        status: 'in_progress',
        bestScore: null,
        attemptCount: 0,
        currentBlock: 'blk-stn-kana-h1-card-hira-a',
      },
    ];
    const journey = journeyWith(states);
    const { sections } = resolveSections(journey);

    const rowOf = (slug: string) => sections.flatMap((s) => s.rows).find((r) => r.node.station.slug === slug)!;

    // completed → replay from the top
    const done = rowOf('stn-kana-h0');
    expect(done.action).toBe('review');
    expect(done.node.availability).toBe('completed');

    // in progress → continue (no replay param)
    const mid = rowOf('stn-kana-h1');
    expect(mid.action).toBe('continue');

    // locked stays locked (never a replay entry — prereqs still gate)
    const locked = sections.flatMap((s) => s.rows).find((r) => r.action === 'locked');
    expect(locked).toBeDefined();
  });
});
