// @vitest-environment jsdom
/**
 * HANASO — TASK-LEARNING-13: progress integrity regressions (audit A-1..A-8).
 *
 * Every case here reproduces a LIVE-REPRODUCED bug from the TL-13 progress
 * audit (ops/checkpoints/TASK-LEARNING-13/PROGRESS_BUG_AUDIT.md):
 *
 * A-1  a refresh of a COMPLETED station re-renders the completion panel BUT
 *      the walk rail/counter used to show «۱ / n» (step stuck at 0) — it must
 *      tell the truth: «n / n» with the full rail filled.
 * A-2  rapid same-tick clicks on «بررسی پاسخ» fired MULTIPLE grade POSTs
 *      (live: attemptCount 12→16, firstTryCorrect +4 for ONE answer) — the
 *      synchronous gradingRef gate must collapse them to exactly one.
 * A-3  a failed/aborted `complete` POST was SILENT (unhandled rejection, dead
 *      UI) — an honest failure notice + one-click retry must appear.
 * A-6  a mid-question refresh reset `attemptNo` to 1 — a wrong-then-reload
 *      answer could still count as first-try. The attempt number now rides
 *      in the walk snapshot and is restored.
 * A-7  the question counter used Latin digits («1 / 3») — SKL-003 §۴: Persian.
 * A-8  a snapshot carrying ONLY in-flight exercise progress showed no
 *      «ادامه از جایی که بودی» notice — real resumed work must announce it.
 *
 * Drives the REAL StationRunner with the REAL chapter content (stn-kana-h4 —
 * the vowel-length rule station whose FIRST block is an exercise set).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import * as React from 'react';

import { StationRunner } from '@/components/curriculum/station-runner';
import { getChapter } from '@/modules/curriculum/content';
import { toClientStation, toClientExercise } from '@/modules/curriculum';
import { saveWalkSnapshot } from '@/modules/curriculum/walk-persistence';
import type { Chapter } from '@/modules/curriculum/types';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), forward: vi.fn() }),
}));

const chapter = getChapter('kana-foundation-01') as Chapter;
const station = chapter.stations.find((s) => s.slug === 'stn-kana-h4')!;
const nextCore = chapter.stations
  .slice()
  .sort((a, b) => a.order - b.order)
  .find((s) => s.core && s.order > station.order)!;

/** Server walk state for the GET resume; the complete action mutates it. */
let serverWalkState: { status: string; currentBlock: string | null } | null = null;
let completeCalls = 0;
/** When true the complete action answers 500 (A-3 failure path). */
let completeFails = false;
/** Grade call counter (A-2 double-submit). */
let gradeCalls = 0;

beforeEach(() => {
  serverWalkState = null;
  completeCalls = 0;
  completeFails = false;
  gradeCalls = 0;
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
      if (body.action === 'grade') gradeCalls += 1;
      if (body.action === 'complete') {
        completeCalls += 1;
        if (completeFails) {
          return new Response(JSON.stringify({ error: { code: 'station/boom' } }), { status: 500 });
        }
        serverWalkState = { status: 'completed', currentBlock: null };
        return new Response(
          JSON.stringify({ data: { stationSlug: station.slug, state: { status: 'completed' }, already: false } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      // grade / enter / progress / writing-practice
      const outcome =
        body.action === 'grade'
          ? { outcome: { correct: true, level: 1, feedbackFa: 'درست!' } }
          : {};
      return new Response(JSON.stringify({ data: outcome }), {
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

/** The stripped client exercise map for THIS station (the station page's own
 *  resolution — without it the exercise block renders nothing). */
const clientExercises = Object.fromEntries(
  Object.values(chapter.exercises)
    .filter((ex) => ex.assessmentRole === 'practice')
    .map((ex) => [ex.id, toClientExercise(ex)]),
);

function renderStation() {
  return render(
    <StationRunner
      chapterSlug={chapter.slug}
      station={toClientStation(station)}
      chapter={{ words: [], expressions: [] }}
      nextCoreStation={{ slug: nextCore.slug, titleFa: nextCore.titleFa }}
      clientExercises={clientExercises}
      dialogue={{ lines: [], speakers: {} }}
      audioByLine={{} }
      audioAvailable={false}
    />,
  );
}

/** Advance until the exercise block (the station's first block) is rendered. */
async function renderAtExercise() {
  const utils = renderStation();
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'بررسی پاسخ' })).toBeDefined();
  });
  return utils;
}

describe('TL-13 A-2 — rapid same-tick clicks submit exactly ONE grade', () => {
  it('collapses four synchronous check() calls into one grade POST', async () => {
    await renderAtExercise();
    const firstOption = screen.getAllByRole('radio')[0]!;
    fireEvent.click(firstOption);
    const check = screen.getByRole('button', { name: 'بررسی پاسخ' });
    // four synchronous activations — React has NOT re-rendered between them
    // (this is the live-reproduced double-submit window).
    fireEvent.click(check);
    fireEvent.click(check);
    fireEvent.click(check);
    fireEvent.click(check);
    await waitFor(() => expect(gradeCalls).toBe(1));
    // …and it stays one after the async grade settles.
    await act(async () => {
      await Promise.resolve();
    });
    expect(gradeCalls).toBe(1);
  });
});

describe('TL-13 A-1 — the rail tells the truth on a completed station', () => {
  it('shows «n / n» (not «۱ / n») after a refresh of a completed station', async () => {
    serverWalkState = { status: 'completed', currentBlock: null };
    renderStation();
    // the completion panel re-renders (TL-10 CP-04 behavior kept)…
    await waitFor(() => {
      expect(screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!'));
    });
    // …and the block counter shows the FULL walk, Persian digits.
    const blockCount = station.blocks.length;
    const faNum = (n: number) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);
    expect(screen.getByText(`${faNum(blockCount)} / ${faNum(blockCount)}`)).toBeDefined();
  });
});

describe('TL-13 A-3 — a failed completion is honest + retryable', () => {
  it('shows the failure notice with a retry, and the retry completes', async () => {
    completeFails = true;
    // walk to the LAST block: seed EARNED results for BOTH exercise blocks (a
    // completed exercise block renders the skip panel — no live grading needed;
    // the second exercise block would otherwise have no forward button at all).
    // The snapshot must exist BEFORE mount — the restore effect runs once.
    const exerciseBlocks = station.blocks.filter((b) => b.kind === 'exercise');
    const blockResults = Object.fromEntries(exerciseBlocks.map((b) => [b.id, 1]));
    saveWalkSnapshot({
      chapterSlug: chapter.slug,
      stationSlug: station.slug,
      stepIndex: 0,
      blockResults,
      exerciseProgress: {},
      sessionScore: 1,
    });
    renderStation();
    // skip-panel → continue → … → last block → final continue fires the (failing) complete
    let guard = 0;
    while (guard++ < 12) {
      if (screen.queryByText('ثبت پایان ایستگاه ناموفق بود')) break;
      const forward = [...screen.queryAllByRole('button')].find(
        (b) => b.textContent === 'ادامه' || b.textContent === 'ایستگاه کامل شد',
      );
      if (!forward) break;
      await act(async () => {
        fireEvent.click(forward);
      });
    }
    await waitFor(() => {
      expect(screen.getByText('ثبت پایان ایستگاه ناموفق بود'));
    });
    expect(screen.getByRole('button', { name: 'تلاش دوباره برای ثبت' }));
    expect(completeCalls).toBeGreaterThanOrEqual(1);
    // the retry succeeds once the server is healthy again.
    completeFails = false;
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تلاش دوباره برای ثبت' }));
    });
    await waitFor(() => {
      expect(screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!'));
    });
  });
});

describe('TL-13 A-6/A-7/A-8 — restored in-flight attempts, Persian digits, resumed notice', () => {
  it('restores attemptNo from the walk snapshot (no first-try inflation)', async () => {
    const exerciseBlock = station.blocks.find((b) => b.kind === 'exercise')!;
    saveWalkSnapshot({
      chapterSlug: chapter.slug,
      stationSlug: station.slug,
      stepIndex: 0,
      blockResults: {},
      exerciseProgress: { [exerciseBlock.id]: { index: 0, firstTryCorrect: 0, attemptNo: 2 } },
      sessionScore: null,
    });
    renderStation();
    // A-8: in-flight exercise progress alone announces the resume.
    await waitFor(() => {
      expect(screen.getByText(/از همان‌جا ادامه دادی/));
    });
    // select an option, submit once — the server sees attempt 2, not 1.
    fireEvent.click(screen.getAllByRole('radio')[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'بررسی پاسخ' }));
    await waitFor(() => expect(gradeCalls).toBe(1));
    const bodies = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls as unknown as Array<
      [string, RequestInit]
    >;
    const gradeBody = bodies
      .map(([, init]) => init?.body as string | undefined)
      .filter((b): b is string => !!b && b.includes('"grade"'))
      .at(-1)!;
    expect(JSON.parse(gradeBody).attemptNo).toBe(2);
  });

  it('renders the question counter in Persian digits (SKL-003 §۴)', async () => {
    await renderAtExercise();
    const counter = screen.getByText('۱ / ۳'); // stn-kana-h4 warmup has 3 items
    expect(counter).toBeDefined();
  });
});
