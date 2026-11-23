// @vitest-environment jsdom
/**
 * HANASO — SmartJaText UI tests (SMART-RUBY 2026-11-23 §۲/§۵).
 *
 * The mission's two-learner acceptance at the RENDER level: the SAME markup
 * renders differently for a learner who has NOT completed the kanji station
 * (furigana rides every kanji-bearing word) vs one who HAS (the ruby hides
 * over the taught kanji+reading and the kanji becomes tap-to-inspect —
 * the popover carries the reading, the meaning, the strokes and the learner's
 * own taught state). The learner views are injected through the provider's
 * sessionStorage cache path (the same channel the real fetch fills).
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';

import { SmartJaText, SmartMixedFaJaText } from '@/components/patterns/smart-ja-text';
import { LearnerJaProvider } from '@/components/patterns/learner-ja-provider';
import {
  buildLearnerJaView,
  buildReadingModel,
  rubyTransportModel,
} from '@/modules/curriculum/knowledge/reading-model';
import { buildKnowledgeRegistry } from '@/modules/curriculum/knowledge/registry';
import { CHAPTERS } from '@/modules/curriculum/content';

const MODEL = buildReadingModel(CHAPTERS);
const REGISTRY = buildKnowledgeRegistry(CHAPTERS);
const TITLES = new Map<string, string>();
for (const ch of CHAPTERS) for (const st of ch.stations) TITLES.set(st.slug, st.titleFa);

/** A learner who completed the anchor vocab stations but NOT the kanji station. */
const VIEW_BEFORE = buildLearnerJaView({
  chapters: CHAPTERS,
  taughtAt: REGISTRY.taughtAt,
  completedStationSlugs: new Set(['stn-fm01-02-vocab', 'stn-fm01-11-vocab2']),
  stationTitleBySlug: TITLES,
  model: MODEL,
});
/** A learner who ALSO completed the dedicated kanji station (stn-fm01-23-kanji). */
const VIEW_AFTER = buildLearnerJaView({
  chapters: CHAPTERS,
  taughtAt: REGISTRY.taughtAt,
  completedStationSlugs: new Set(['stn-fm01-02-vocab', 'stn-fm01-11-vocab2', 'stn-fm01-23-kanji']),
  stationTitleBySlug: TITLES,
  model: MODEL,
});

const fetchMock = vi.fn();

function mount(view: typeof VIEW_BEFORE, node: React.ReactNode) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ ok: true, data: view }),
  } as unknown as Response);
  return render(<LearnerJaProvider model={rubyTransportModel(MODEL)}>{node}</LearnerJaProvider>);
}

beforeEach(() => {
  cleanup();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  sessionStorage.clear();
});

describe('SmartJaText — the two-learner furigana law', () => {
  it('BEFORE the kanji station: every kanji-bearing word shows its reading', async () => {
    mount(VIEW_BEFORE, <SmartJaText tokens={[{ surface: '中国人', reading: 'ちゅうごくじん' }]} />);
    // the provider's fetch resolves → the ruby renders over the untaught kanji
    await waitFor(() => {
      expect(document.querySelector('rt')?.textContent).toBe('ちゅうごくじん');
    });
    expect(document.querySelector('[data-ruby-hidden]')).toBeNull();
  });

  it('AFTER the kanji station: the taught kanji+reading hide the ruby (tap reveals)', async () => {
    mount(VIEW_AFTER, <SmartJaText tokens={[{ surface: 'イラン人', reading: 'イランじん' }]} />);
    await waitFor(() => {
      // 人 taught + じん taught → the ruby is GONE, the base stays inspectable
      expect(document.querySelector('[data-ruby-hidden]')?.textContent).toBe('イラン人');
    });
    expect(document.querySelector('rt')).toBeNull();
  });

  it('an UNtaught kanji inside a taught-word context still shows the ruby (中国人: 中 untaught)', async () => {
    mount(VIEW_AFTER, <SmartJaText tokens={[{ surface: '中国人', reading: 'ちゅうごくじん' }]} />);
    await waitFor(() => {
      expect(document.querySelector('rt')?.textContent).toBe('ちゅうごくじん');
    });
  });

  it('kana-only text renders plain (no ruby island, no kanji affordance)', async () => {
    mount(VIEW_AFTER, <SmartJaText text="かんこくじんです。" />);
    await waitFor(() => {
      expect(document.querySelector('[data-smart-ja]')?.textContent).toBe('かんこくじんです。');
    });
    expect(document.querySelector('rt')).toBeNull();
    expect(document.querySelector('[data-kanji-inspect]')).toBeNull();
  });

  it('a standalone kanji renders plain and tap-opens the inspect popover', async () => {
    mount(VIEW_AFTER, <SmartJaText text="国" />);
    const trigger = await waitFor(() => {
      const t = document.querySelector('[data-kanji-inspect="国"]');
      expect(t).toBeTruthy();
      return t as HTMLElement;
    });
    expect(document.querySelector('rt')).toBeNull(); // never guesses a reading
    fireEvent.click(trigger);
    const popover = await waitFor(() => {
      const p = document.querySelector('[data-kanji-popover="国"]');
      expect(p).toBeTruthy();
      return p as HTMLElement;
    });
    // readings (the rendaku pair from the taught carriers), the meaning, the
    // stroke count, and the taught provenance
    expect(popover.textContent).toContain('こく');
    expect(popover.textContent).toContain('ごく');
    expect(popover.textContent).toContain('کشور');
    expect(popover.textContent).toContain('۸ ضربه');
    expect(popover.textContent).toContain('کانجی‌های 人 و 国');
  });

  it('tap-to-inspect on a hidden ruby group shows the reading it hides (learner affordance)', async () => {
    mount(VIEW_AFTER, <SmartJaText tokens={[{ surface: 'イラン人', reading: 'イランじん' }]} />);
    await waitFor(() => {
      expect(document.querySelector('[data-ruby-hidden]')).toBeTruthy();
    });
    fireEvent.click(document.querySelector('[data-kanji-inspect]') as HTMLElement);
    await waitFor(() => {
      expect(document.querySelector('[data-kanji-popover]')?.textContent).toContain('じん');
    });
  });

  it('inspect={false} (inside answer buttons): the LAW holds, no tap affordance', async () => {
    mount(VIEW_AFTER, <SmartJaText tokens={[{ surface: 'イラン人', reading: 'イランじん' }]} inspect={false} />);
    await waitFor(() => {
      expect(document.querySelector('[data-ruby-hidden]')?.textContent).toBe('イラン人');
    });
    expect(document.querySelector('[data-kanji-inspect]')).toBeNull();
  });

  it('SmartMixedFaJaText — feedback prose: every Japanese run rides the law', async () => {
    mount(VIEW_BEFORE, <SmartMixedFaJaText text={'在 ちゅうごくじん (چینی) کانجی 人 با خوانش «じん» می‌آید.'} />);
    await waitFor(() => {
      // the standalone 人 fragment inside Persian prose is tap-inspectable
      expect(document.querySelector('[data-kanji-inspect="人"]')).toBeTruthy();
    });
    expect(screen.getByText(/چینی/)).toBeTruthy();
  });
});
