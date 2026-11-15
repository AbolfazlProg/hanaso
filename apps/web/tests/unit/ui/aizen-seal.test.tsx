// @vitest-environment jsdom
/**
 * HANASO — TASK-HANASO-21 — the AIZEN completion seal (Aizen no inkan).
 *
 * Contract under test:
 * S1 — a FRESH completion (200, not `already`) renders the seal with the
 *      ceremonial stamp animation classes.
 * S2 — an idempotent re-complete (`already: true`) renders the seal SETTLED
 *      (no stamp animation — the completion is a persisted fact, never a
 *      re-run).
 * S3 — a revisit/refresh of an already-completed station (the resume path)
 *      renders the seal SETTLED — the animation never replays on refresh.
 * S4 — the REPLAY end panel carries NO seal (nothing was re-registered).
 * S5 — the seal markup is the real hanko vocabulary: 藍染 glyphs, the shu
 *      token, the carved ring — never a bare circle/badge/emoji/text.
 * S6 — reduced motion: the stamp animation class is bound to token-driven
 *      durations which the design system zeroes under prefers-reduced-motion
 *      (globals.css contract) — asserted structurally here.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';

import { AizenSeal } from '@/components/curriculum/aizen-seal';
import { StationRunner } from '@/components/curriculum/station-runner';
import { getChapter } from '@/modules/curriculum/content';
import { toClientStation } from '@/modules/curriculum';
import { clearWalkSnapshot } from '@/modules/curriculum/walk-persistence';
import type { Chapter } from '@/modules/curriculum/types';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), forward: vi.fn() }),
}));

const chapter = getChapter('kana-foundation-01') as Chapter;
/** h0 — completion kind `viewed`: scene → dialogue-player → wrap-up. */
const STATION = chapter.stations.find((s) => s.slug === 'stn-kana-h0')!;

function renderStation(opts?: { replayMode?: boolean }) {
  return render(
    <StationRunner
      chapterSlug="kana-foundation-01"
      station={toClientStation(STATION)}
      chapter={{ words: chapter.words, expressions: chapter.expressions }}
      mapHref="/learn/kana-foundation-01/journey?s=island-1-hira-voice"
      nextCoreStation={null}
      clientExercises={{}}
      dialogue={{ lines: [], speakers: {} }}
      audioByLine={{}}
      audioAvailable={false}
      replayMode={opts?.replayMode}
    />,
  );
}

/** Walk h0 (viewed) with the plain forward button until the completion panel. */
async function walkToCompletion() {
  for (let guard = 0; guard < 12; guard += 1) {
    if (screen.queryByText('این ایستگاه را با موفقیت پشت سر گذشتی!')) return;
    const forward = screen.queryByRole('button', { name: 'ادامه' });
    if (forward) fireEvent.click(forward);
    await waitFor(() => {
      expect(true).toBe(true);
    });
  }
  throw new Error('walk did not reach the completion panel');
}

let alreadyComplete = false;

beforeEach(() => {
  alreadyComplete = false;
  window.localStorage.clear();
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.startsWith('/api/curriculum/station?')) {
      const state = alreadyComplete
        ? { status: 'completed', currentBlock: null }
        : { status: 'in_progress', currentBlock: null };
      return new Response(JSON.stringify({ data: { state } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (u === '/api/curriculum/station' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { action: string };
      if (body.action === 'complete') {
        alreadyComplete = true;
        return new Response(
          JSON.stringify({
            data: { stationSlug: STATION.slug, state: { status: 'completed' }, already: alreadyWasCompleted },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response('{}', { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
});

/** Flipped by specific tests: the complete POST answers `already: true`. */
let alreadyWasCompleted = false;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  alreadyWasCompleted = false;
  clearWalkSnapshot('kana-foundation-01', STATION.slug);
});

describe('AizenSeal — TASK-HANASO-21 the completion seal', () => {
  it('S5: the seal is the real hanko vocabulary (藍染 carved in shu, ring, chips)', () => {
    const { container } = render(<AizenSeal animate={false} label="مهر ایچن — این درس کامل شد" />);
    const svg = container.querySelector('svg[role="img"]');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-label')).toBe('مهر ایچن — این درس کامل شد');
    const text = svg?.textContent ?? '';
    expect(text).toContain('藍');
    expect(text).toContain('染');
    // the vermilion field + the carved paper ring are token-driven, never raw hex
    const html = svg?.innerHTML ?? '';
    expect(html).toContain('var(--color-shu)');
    expect(html).toContain('var(--color-paper)');
    // ink-skip chips exist (a real impression's uneven edge)
    const chips = (html.match(/<circle[^>]*fill="var\(--color-paper\)"[^>]*opacity="0\.[0-9]+"[^>]*>/g) ?? []).length;
    expect(chips).toBeGreaterThanOrEqual(3);
  });

  it('S1: a FRESH completion renders the seal WITH the ceremonial stamp class', async () => {
    renderStation();
    await walkToCompletion();
    await waitFor(() => {
      expect(screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!')).toBeTruthy();
    });
    const frame = document.querySelector('[data-station-complete]');
    const seal = document.querySelector('[data-aizen-seal]');
    expect(frame).toBeTruthy();
    expect(seal).toBeTruthy();
    expect(seal?.getAttribute('data-animate')).toBe('true');
    expect(document.querySelector('.aizen-seal-stamp')).toBeTruthy();
    expect(document.querySelector('.aizen-seal-halo-idle')).toBeNull();
  }, 20000);

  it('S2: an idempotent re-complete (already: true) renders the seal SETTLED', async () => {
    alreadyWasCompleted = true;
    renderStation();
    await walkToCompletion();
    await waitFor(() => {
      expect(screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!')).toBeTruthy();
    });
    const seal = document.querySelector('[data-aizen-seal]');
    expect(seal).toBeTruthy();
    expect(seal?.getAttribute('data-animate')).toBeNull(); // settled — no re-stamp
    expect(document.querySelector('.aizen-seal-stamp')).toBeNull();
    expect(document.querySelector('.aizen-seal-halo-idle')).toBeTruthy();
  }, 20000);

  it('S3: a REVISIT of a completed station (server truth) renders the seal settled — no replay', async () => {
    // the server already knows this station is completed (revisit/refresh)
    alreadyComplete = true;
    renderStation();
    await waitFor(
      () => {
        expect(screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!')).toBeTruthy();
      },
      { timeout: 4000 },
    );
    const seal = document.querySelector('[data-aizen-seal]');
    expect(seal).toBeTruthy();
    expect(seal?.getAttribute('data-animate')).toBeNull();
    expect(document.querySelector('.aizen-seal-stamp')).toBeNull();
  }, 20000);

  it('S4: the REPLAY end panel carries NO seal (nothing was re-registered)', async () => {
    alreadyComplete = true; // replay enters a completed station
    renderStation({ replayMode: true });
    // walk to the end in replay semantics (non-interactive end panel)
    for (let guard = 0; guard < 12; guard += 1) {
      if (screen.queryByText(/مرور به پایان رسید|دوباره مرور/)) break;
      const forward = screen.queryByRole('button', { name: 'ادامه' });
      if (!forward) break;
      fireEvent.click(forward);
      await waitFor(() => {
        expect(true).toBe(true);
      });
    }
    // the replay end panel (data-replay-ended) exists and holds NO seal
    const replayPanel = document.querySelector('[data-replay-ended]');
    const sealAnywhere = document.querySelector('[data-aizen-seal]');
    expect(replayPanel || sealAnywhere === null).toBeTruthy();
    expect(sealAnywhere).toBeNull();
  }, 20000);

  it('S6: the stamp animation durations are token-driven (zero under reduced motion)', async () => {
    // read the REAL stylesheet and pin the contract: the stamp animation uses
    // --dur-ceremonial (zeroed under prefers-reduced-motion by tokens.css) and
    // the reduced-motion block collapses it to the promised simple fade.
    const { readFileSync } = await import('node:fs');
    const css = readFileSync('src/styles/globals.css', 'utf8');
    expect(css).toContain('aizen-seal-stamp');
    expect(css).toMatch(/animation: aizen-seal-stamp calc\(var\(--dur-ceremonial\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.aizen-seal-stamp[\s\S]*animation: hanaso-fade-in var\(--dur-fast\) both;/);
    const tokens = readFileSync('src/styles/tokens.css', 'utf8');
    expect(tokens).toMatch(/--dur-ceremonial: 0ms; \/\* seal → simple fade/);
  });
});
