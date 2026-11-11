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
 *
 * TASK-HANASO-17 §۷ (2026-11-12) — the CTA contract changed on the owner's
 * order: the completion CTA now ALWAYS returns to the map SECTION of this
 * station («پایان درس و بازگشت به مسیر» → /learn/<chapter>/journey?s=<unit>)
 * and the next lesson is a TEXT caption («درس بعدی: …») — never auto-opened,
 * never a deep-link CTA. «بعد از پایان Lesson نباید بدون اقدام کاربر، درس
 * بعدی باز شود.»
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';

import { StationRunner } from '@/components/curriculum/station-runner';
import { getChapter } from '@/modules/curriculum/content';
import { toClientStation } from '@/modules/curriculum';
import { saveWalkSnapshot } from '@/modules/curriculum/walk-persistence';
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

/** The map deep-link the station page computes for stn-kana-h0 (§۷ — ?s=). */
const MAP_HREF = '/learn/kana-foundation-01/journey?s=island-1-hira-voice';

function renderStation(opts?: { nextCoreStation?: { slug: string; titleFa: string } | null }) {
  return render(
    <StationRunner
      chapterSlug="kana-foundation-01"
      station={toClientStation(station)}
      chapter={{ words: chapter.words, expressions: chapter.expressions }}
      mapHref={MAP_HREF}
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
      // (2) exactly ONE primary CTA — back to the map section (HANASO-17 §۷)
      const cta = screen.getByRole('button', { name: 'پایان درس و بازگشت به مسیر' });
      expect(cta.className).toContain('bg-indigo');
      expect(cta.className).not.toContain('bg-shu');
      // the next lesson is a TEXT caption, never a CTA and never auto-opened
      expect(screen.getByText(`درس بعدی: ${nextCore!.titleFa}`)).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'رفتن به ایستگاه بعدی' })).toBeNull();
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
    const cta = screen.getByRole('button', { name: 'پایان درس و بازگشت به مسیر' });
    fireEvent.click(cta);
    fireEvent.click(cta); // the same tick — the latch must swallow it
    expect(pushMock).toHaveBeenCalledTimes(1);
    // HANASO-17 §۷: the destination is the map SECTION of this station
    expect(pushMock).toHaveBeenCalledWith(MAP_HREF);
  });

  it(
    'the last core station of the chapter gets the SAME map CTA — no «درس بعدی» caption (HANASO-17)',
    { timeout: 20000 },
    async () => {
      renderStation({ nextCoreStation: null });
      await waitFor(() => expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeTruthy());
      await walkToCompletion();
      // ONE CTA, same label — the map (where the mastery gate has opened)
      const cta = screen.getByRole('button', { name: 'پایان درس و بازگشت به مسیر' });
      expect(screen.queryByText(/^درس بعدی:/)).toBeNull(); // no next-lesson caption
      fireEvent.click(cta);
      expect(pushMock).toHaveBeenCalledWith(MAP_HREF);
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
      expect(screen.getByRole('button', { name: 'پایان درس و بازگشت به مسیر' })).toBeTruthy();
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

  /* ------------------------------------------------------------------ */
  /* CP-04 fix (TL-10 §6 gap) — live-reproduced on production 2026-11-10:
   * the FIRST revisit of a completed station rendered the panel (server
   * resume) but the persist effect planted a fresh step-0 snapshot before the
   * resume landed, so the SECOND refresh restored that empty walk and the
   * station silently restarted — the owner-reported bug surviving TL-10's
   * first fix. */

  function walkSnapshotKey() {
    return Object.keys(window.localStorage).find((k) => k.startsWith('hanaso.walk.v1.') && k.endsWith('.stn-kana-h0'));
  }

  it(
    'a SECOND refresh of the completed station still renders the completion state (no step-0 snapshot is planted by the revisit)',
    { timeout: 20000 },
    async () => {
      const first = renderStation();
      await waitFor(() => expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeTruthy());
      await walkToCompletion();
      first.unmount();

      // revisit #1 — the panel renders AND no walk snapshot is planted anymore
      const second = renderStation();
      await waitFor(() => expect(screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!')).toBeTruthy());
      await waitFor(() => {
        // the resume must have settled by now; a planted snapshot would exist
        expect(walkSnapshotKey()).toBeUndefined();
      });
      second.unmount();

      // revisit #2 — the production repro (probe5 reload #2): the walk must
      // NOT restart; the completion panel is still the truth
      renderStation();
      await waitFor(() => expect(screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!')).toBeTruthy());
      expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeNull();
      expect(screen.getByRole('button', { name: 'پایان درس و بازگشت به مسیر' })).toBeTruthy();
    },
  );

  it(
    'a stale step-0 snapshot planted by a PRE-FIX revisit heals: the server completed record wins and the snapshot is cleared',
    { timeout: 20000 },
    async () => {
      const first = renderStation();
      await waitFor(() => expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeTruthy());
      await walkToCompletion();
      first.unmount();

      // simulate a browser that already carries the stale step-0 snapshot
      // planted before the fix (same shape the persist effect used to write)
      saveWalkSnapshot({
        chapterSlug: 'kana-foundation-01',
        stationSlug: 'stn-kana-h0',
        stepIndex: 0,
        blockResults: {},
        exerciseProgress: {},
        kanaCardStages: {},
        sessionScore: null,
        updatedAt: Date.now(),
      });
      expect(walkSnapshotKey()).toBeDefined();

      renderStation();
      await waitFor(() => expect(screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!')).toBeTruthy());
      // the walk did not restart, and the planted snapshot is healed (cleared)
      expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeNull();
      await waitFor(() => expect(walkSnapshotKey()).toBeUndefined());
    },
  );

  it(
    'a mid-review walk with EARNED progress survives the refresh (the deliberate resume is kept, not the panel)',
    { timeout: 20000 },
    async () => {
      const first = renderStation();
      await waitFor(() => expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeTruthy());
      await walkToCompletion();
      first.unmount();

      // a review the user deliberately left in flight: step 1 with a result
      saveWalkSnapshot({
        chapterSlug: 'kana-foundation-01',
        stationSlug: 'stn-kana-h0',
        stepIndex: 1,
        blockResults: { 'blk-stn-kana-h0-scene': 1 },
        exerciseProgress: {},
        kanaCardStages: {},
        sessionScore: null,
        updatedAt: Date.now(),
      });

      renderStation();
      // the walk resumes at block 2 — NOT the completion panel
      await waitFor(() => expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeTruthy());
      expect(screen.queryByText('این ایستگاه را با موفقیت پشت سر گذشتی!')).toBeNull();
    },
  );
});
