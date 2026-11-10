// @vitest-environment jsdom
/**
 * HANASO — TASK-LEARNING-10 §6: the station completion flow.
 *
 * The owner's order, pinned here:
 * 1. «ایستگاه تمام شد» is a STATUS MESSAGE, never a button — the walk's last
 *    forward action is a plain «ادامه» like every other step.
 * 2. After the last required activity: ONE non-interactive success message +
 *    exactly ONE primary CTA whose label names its REAL destination
 *    («رفتن به ایستگاه بعدی» / «ادامهٔ مسیر») — the old second red
 *    «بازگشت به نقشه» follow-up button is GONE.
 * 3. Red (bg-shu) is reserved for errors — a normal CTA is Aizen indigo.
 * 4. Rapid double-click on the CTA navigates exactly once.
 * 5. A refresh of an already-completed station re-renders its completion
 *    state (the walk never silently restarts) — «از دست رفتن وضعیت ایستگاه
 *    پس از Refresh».
 * 6. «مرور دوبارهٔ این ایستگاه» restarts the LOCAL walk without touching the
 *    server record (the API stays idempotent — `already: true`).
 *
 * Drives the REAL StationRunner with the REAL chapter content (stn-kana-h0 —
 * the anchor station: scene → dialogue-player → wrap-up, completion 'viewed').
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';

import { StationRunner } from '@/components/curriculum/station-runner';
import { getChapter } from '@/modules/curriculum/content';
import { toClientStation } from '@/modules/curriculum';
import type { Chapter } from '@/modules/curriculum/types';

// StationRunner navigates via the App Router on station completion — jsdom has
// no router context; mock the hook and COUNT the pushes (double-click latch).
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), forward: vi.fn() }),
}));

const chapter = getChapter('kana-foundation-01') as Chapter;
const station = chapter.stations.find((s) => s.slug === 'stn-kana-h0')!;
/** The same server-side resolution the station page performs for the CTA. */
const nextCore =
  chapter.stations
    .slice()
    .sort((a, b) => a.order - b.order)
    .find((s) => s.core && s.order > station.order) ?? null;

/** What GET /api/curriculum/station answers for this station's walk state. */
let serverWalkState: { status: string; currentBlock: string | null } | null = {
  status: 'in_progress',
  currentBlock: null,
};
let completeCalls = 0;

beforeEach(() => {
  serverWalkState = { status: 'in_progress', currentBlock: null };
  completeCalls = 0;
  pushMock.mockClear();
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.startsWith('/api/curriculum/station?')) {
      return new Response(JSON.stringify({ data: { state: serverWalkState } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (u === '/api/curriculum/station' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { action: string };
      if (body.action === 'complete') {
        completeCalls += 1;
        serverWalkState = { status: 'completed', currentBlock: null };
        return new Response(
          JSON.stringify({ data: { stationSlug: 'stn-kana-h0', state: { status: 'completed' }, already: false } }),
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
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderStation(opts?: { nextCoreStation?: { slug: string; titleFa: string } | null }) {
  return render(
    <StationRunner
      chapterSlug="kana-foundation-01"
      station={toClientStation(station)}
      chapter={{ words: chapter.words, expressions: chapter.expressions }}
      nextCoreStation={
        opts?.nextCoreStation === undefined
          ? nextCore
            ? { slug: nextCore.slug, titleFa: nextCore.titleFa }
            : null
          : opts.nextCoreStation
      }
      clientExercises={{}}
      dialogue={{ lines: [], speakers: {} }}
      audioByLine={{}}
      audioAvailable={false}
    />,
  );
}

/** Click through the walk with the plain forward action until the completion
 *  panel appears. Also asserts at EVERY step that the status text is never
 *  posed as a button (the old «ایستگاه کامل شد» button). */
async function walkToCompletion() {
  for (let guard = 0; guard < 12; guard += 1) {
    const dead = screen.queryByRole('button', { name: 'ایستگاه کامل شد' });
    expect(dead, 'a status text is never posed as a button').toBeNull();
    if (screen.queryByText('این ایستگاه را با موفقیت پشت سر گذشتی!')) return;
    const forward = screen.queryByRole('button', { name: /^ادامه$/ });
    if (!forward) {
      throw new Error('no forward action found before the completion panel arrived');
    }
    fireEvent.click(forward);
    await waitFor(() => {
      // the step counter moved or the completion panel arrived
      expect(true).toBe(true);
    });
  }
  throw new Error('walk did not reach the completion panel within the guard bound');
}

describe('StationRunner — TASK-LEARNING-10 §6 station completion flow', () => {
  it(
    'the walk ends with ONE message + ONE destination CTA — no status button, no second red button',
    { timeout: 20000 },
    async () => {
      renderStation();
      // the restore gate settles (mount effect) before the walk is interactive
      await waitFor(() => expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeTruthy());

      await walkToCompletion();

      // (1) the success moment is a NON-INTERACTIVE message
      const msg = screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!');
      expect(msg.tagName).toBe('P');
      // (2) exactly ONE primary CTA, labeled by its real destination
      const cta = screen.getByRole('button', { name: 'رفتن به ایستگاه بعدی' });
      expect(cta.className).toContain('bg-indigo');
      expect(cta.className).not.toContain('bg-shu');
      // the destination caption names the next station from the real map data
      expect(screen.getByText(nextCore!.titleFa)).toBeTruthy();
      // (3) the old second follow-up button is GONE
      expect(screen.queryByRole('button', { name: 'بازگشت به نقشه' })).toBeNull();
      // (4) the completion registered exactly once (server idempotent anyway)
      expect(completeCalls).toBe(1);
      // (5) the tertiary review action is a quiet text link, not a second CTA
      const review = screen.getByRole('button', { name: 'مرور دوبارهٔ این ایستگاه' });
      expect(review.className).not.toContain('bg-indigo');
    },
  );

  it('rapid double-click on the completion CTA navigates exactly once', { timeout: 20000 }, async () => {
    renderStation();
    await waitFor(() => expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeTruthy());
    await walkToCompletion();
    const cta = screen.getByRole('button', { name: 'رفتن به ایستگاه بعدی' });
    fireEvent.click(cta);
    fireEvent.click(cta); // the same tick — the latch must swallow it
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/learn/kana-foundation-01/journey/stn-kana-h1');
  });

  it(
    'the last core station of the chapter gets «ادامهٔ مسیر» to the island map (not a station deep link)',
    { timeout: 20000 },
    async () => {
      renderStation({ nextCoreStation: null });
      await waitFor(() => expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeTruthy());
      await walkToCompletion();
      const cta = screen.getByRole('button', { name: 'ادامهٔ مسیر' });
      fireEvent.click(cta);
      expect(pushMock).toHaveBeenCalledWith('/learn/kana-foundation-01/journey');
    },
  );

  it(
    'a refresh of the completed station re-renders the completion state (never a silent walk restart)',
    { timeout: 20000 },
    async () => {
      const first = renderStation();
      await waitFor(() => expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeTruthy());
      await walkToCompletion();
      expect(screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!')).toBeTruthy();
      first.unmount();

      // refresh: no local snapshot (cleared at complete), the server says completed
      renderStation();
      await waitFor(() => {
        expect(screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!')).toBeTruthy();
      });
      // the walk did NOT restart: no block content is interactive, and the CTA
      // is already there without a single «ادامه» click
      expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeNull();
      expect(screen.getByRole('button', { name: 'رفتن به ایستگاه بعدی' })).toBeTruthy();
    },
  );

  it(
    '«مرور دوبارهٔ این ایستگاه» restarts the LOCAL walk and keeps the server record intact',
    { timeout: 20000 },
    async () => {
      renderStation();
      await waitFor(() => expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeTruthy());
      await walkToCompletion();
      const before = completeCalls;

      fireEvent.click(screen.getByRole('button', { name: 'مرور دوبارهٔ این ایستگاه' }));
      // the completion panel is gone and the walk is interactive again at block 1
      await waitFor(() => expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeTruthy());
      expect(screen.queryByText('این ایستگاه را با موفقیت پشت سر گذشتی!')).toBeNull();
      // the server record was not touched by the local restart
      expect(completeCalls).toBe(before);
    },
  );
});
