// @vitest-environment jsdom
/**
 * HANASO — the rule-card listening column (TASK-HANASO-20 — BUG-008).
 *
 * The audit (LIVE_WEBSITE_AUDIT + RESEARCH_ALIGNMENT deviation #ج): the Yōon
 * reference card's «شنیدن» column was TEXT-ONLY (buttons=0 in the DOM) although
 * the rule is inherently perceptual. These tests pin the fix:
 *  - content: every declared listenWord resolves to a COMMITTED hostword asset
 *    (a dead-button binding is a content bug) and stays index-aligned with the
 *    structureTable rows;
 *  - UI: chips render ONLY for resolved assets; null/pending rows hide
 *    honestly; the honest note renders when authored.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';

import { StationRunner } from '@/components/curriculum/station-runner';
import { getChapter } from '@/modules/curriculum/content';
import type { Station } from '@/modules/curriculum/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), forward: vi.fn() }),
}));

const chapter = getChapter('kana-foundation-01')!;

/* the audio cache is stubbed: one fake element per URL (play resolves) */
vi.mock('@/modules/audio/client-cache', () => {
  const els: Record<string, { play(): Promise<void>; pause(): void }> = {};
  return {
    getCachedAudio: vi.fn((url: string) => {
      els[url] ??= { play: vi.fn(() => Promise.resolve()), pause: vi.fn() };
      return els[url] as unknown as HTMLAudioElement;
    }),
    preloadAudio: vi.fn(async () => null),
    reportPlaybackError: vi.fn(),
  };
});

function cardStation(cardId: string): Station {
  const src = chapter.stations.find((s) => s.slug === 'stn-kana-h6')!;
  const cardBlock = src.blocks.find((b) => b.id === cardId)!;
  const station: Station = {
    ...src,
    slug: 'stn-fixture-listen',
    prerequisites: [],
    blocks: [cardBlock, { kind: 'wrap-up', id: 'blk-fixture-l-wrapup', titleFa: 'جمع‌بندی', itemsFa: ['x'] }],
  };
  return station;
}

function renderRunner(station: Station, audioByWord: Record<string, { opus: string; m4a: string } | null>) {
  // the runner is driven through its props like the station page does
  return render(
    React.createElement(StationRunner as never, {
      chapterSlug: 'kana-foundation-01',
      station,
      chapter: { words: [], expressions: [] },
      clientExercises: [],
      dialogue: { lines: [], titleFa: '', sceneFa: '' },
      audioByLine: {},
      audioAvailable: false,
      exampleAudioByWord: audioByWord,
    } as never),
  );
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ data: { state: null } }), { status: 200 })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('BUG-008 — the rule-card listening column has real audio', () => {
  it('content: every declared listenWord resolves to a committed hostword asset (no dead bindings)', async () => {
    const { hostWordAudioUrls } = await import('@/modules/audio/server');
    const { loadKanaAudioAssets } = await import('@/modules/audio/kana-audio');
    void loadKanaAudioAssets;
    const offenders: string[] = [];
    for (const st of chapter.stations) {
      for (const b of st.blocks) {
        if (b.kind !== 'rule-card' || !b.listenWords) continue;
        if (b.listenWords.length > (b.structureTable?.rows.length ?? 0)) {
          offenders.push(`${st.slug}/${b.id}: listenWords longer than structureTable rows`);
        }
        b.listenWords.forEach((w, i) => {
          if (w === null) return; // honest pending row — allowed
          if (!hostWordAudioUrls(w)) offenders.push(`${st.slug}/${b.id} row ${i}: «${w}» has no committed asset`);
        });
      }
    }
    expect(offenders).toEqual([]);
  });

  it('UI: chips render only for resolved assets; pending rows hide; the note shows', async () => {
    const audioByWord: Record<string, { opus: string; m4a: string } | null> = {
      いしゃ: { opus: '/audio/hostwords/isha.opus', m4a: '/audio/hostwords/isha.m4a' },
      きょう: { opus: '/audio/hostwords/kyou.opus', m4a: '/audio/hostwords/kyou.m4a' },
      // row 0 (きゃ/きや) has no listenWord → hidden by content
    };
    renderRunner(cardStation('blk-stn-kana-h6-rule-yoon'), audioByWord);
    await waitFor(() => {
      expect(document.querySelector('[data-rule-card-listen]')).toBeDefined();
    });
    // exactly the two resolved chips; no dead button for the pending row
    expect(document.querySelector('[data-rule-card-listen-chip="いしゃ"]')).toBeDefined();
    expect(document.querySelector('[data-rule-card-listen-chip="きょう"]')).toBeDefined();
    expect(document.querySelectorAll('[data-rule-card-listen-chip]').length).toBe(2);
    // the honest note renders
    expect(screen.getByText(/صوتِ فرم‌های جدا/)).toBeDefined();
  });

  it('UI: clicking a resolved chip requests THAT word\'s asset (correct file — never another)', async () => {
    const { getCachedAudio } = await import('@/modules/audio/client-cache');
    const audioByWord: Record<string, { opus: string; m4a: string } | null> = {
      いしゃ: { opus: '/audio/hostwords/isha.opus', m4a: '/audio/hostwords/isha.m4a' },
      きょう: { opus: '/audio/hostwords/kyou.opus', m4a: '/audio/hostwords/kyou.m4a' },
    };
    renderRunner(cardStation('blk-stn-kana-h6-rule-yoon'), audioByWord);
    await waitFor(() => {
      expect(document.querySelector('[data-rule-card-listen-chip="いしゃ"]')).toBeDefined();
    });
    fireEvent.click(document.querySelector('[data-rule-card-listen-chip="いしゃ"]')!);
    expect(getCachedAudio).toHaveBeenCalledWith('/audio/hostwords/isha.opus');
  });
});
