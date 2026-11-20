// @vitest-environment jsdom
/**
 * PART1-FIXES — targeted regression tests for the six Chapter-01 fix groups
 * (branch fix/chapter01-part1, evaluation-report P0 remediation).
 *
 * FIX-1  station-API 500s (h11/h12/p3/m1): atomic attempt counter, bounded
 *        transient retry, structured 503 contract, no pass-without-registration.
 * FIX-2  くに Persian transliteration «کونی» → «کوونی» (vulgar collision).
 * FIX-3  h7 さ/せ stroke claims (was «یک ضربه»; KanjiVG data = 3 strokes each).
 * FIX-4  h7 teaches ん BEFORE its first exercise (card is block #0).
 * FIX-5  answer leak: a decode question's Persian reading never crosses
 *        pre-answer; the reading card attaches to the grade outcome at reveal.
 * FIX-6  wrap-up word counts = DISTINCT first-time words, cumulative chain honest.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { POST as stationPost } from '@/app/api/curriculum/station/route';
import { getChapter } from '@/modules/curriculum/content';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import { resetStoresForTests, getStationProgressStore } from '@/lib/poc/stores';
import { LEARNER_COOKIE_NAME } from '@/lib/learner/server';
import { signSessionTokenSync } from '@/lib/learner/session-node';
import { plantPrereqChain } from '../helpers/walk-chain';
import { gradeExerciseAnswer, toClientExercise } from '@/modules/curriculum/grading';
import { ExerciseSession } from '@/components/curriculum/exercise-session';
import type { Exercise, Station } from '@/modules/curriculum/types';

vi.mock('@/modules/audio/client-cache', () => ({
  getCachedAudio: vi.fn(() => null),
  preloadAudio: vi.fn(async () => null),
  reportPlaybackError: vi.fn(),
}));

const chapter = getChapter('kana-foundation-01')!;
const QA_UUID = '44444444-5555-6666-7777-888888888888';
const QA_COOKIE = `${LEARNER_COOKIE_NAME}=${signSessionTokenSync(QA_UUID)}`;
const BASE = 'http://localhost/api';

function post(body: unknown): Request {
  return new Request(BASE + '/curriculum/station', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: QA_COOKIE },
    body: JSON.stringify(body),
  });
}

const stationBySlug = (slug: string): Station => chapter.stations.find((s) => s.slug === slug)!;

/* ------------------------------------------------------------------ FIX-2 */

describe('PART1 FIX-2 — くに is never transliterated «کونی»', () => {
  it('the h8 example-set card and the practice decode carry «کوونی»', () => {
    const h8 = stationBySlug('stn-kana-h8');
    const kuni = h8.blocks.flatMap((b) => (b.kind === 'example-set' ? b.examples : [])).find((e) => e.ja === 'くに');
    expect(kuni, 'h8 reading example くに').toBeDefined();
    expect(kuni!.reading).toBe('کوونی');

    const dec = chapter.exercises['ex-kana-p2-dec-kuni'];
    expect(dec?.promptJaReading).toBe('کوونی');
    const correct = dec?.options?.find((o) => o.id === dec.correctOptionId);
    expect(correct?.label).toBe('«کوونی»');
    expect(dec?.feedback?.f3ExplainFa).toContain('کوونی');
  });

  it('chapter-wide: the string «کونی» appears NOWHERE in content data', () => {
    const offenders: string[] = [];
    const scan = (v: unknown, where: string): void => {
      if (typeof v === 'string') {
        if (v.includes('کونی')) offenders.push(where);
      } else if (Array.isArray(v)) {
        v.forEach((x, i) => scan(x, `${where}[${i}]`));
      } else if (v && typeof v === 'object') {
        for (const [k, x] of Object.entries(v)) scan(x, `${where}.${k}`);
      }
    };
    scan(chapter.stations, 'stations');
    scan(chapter.exercises, 'exercises');
    scan(KANA_ITEMS, 'kana-items');
    expect(offenders).toEqual([]);
  });
});

/* ------------------------------------------------------------------ FIX-3 */

describe('PART1 FIX-3 — h7 states the TRUE stroke facts for さ/せ (KanjiVG data)', () => {
  const writingData = (glyph: string): number => {
    const p = join(process.cwd(), 'public/writing-data', `${glyph}.json`);
    return (JSON.parse(readFileSync(p, 'utf-8')) as { strokes: unknown[] }).strokes.length;
  };

  it('the vendored KanjiVG-derived writing data says さ=3 and せ=3 strokes', () => {
    expect(writingData('さ')).toBe(3);
    expect(writingData('せ')).toBe(3);
    // ん really is ONE pen stroke — the station's other «ضربه» claim stays true.
    expect(writingData('ん')).toBe(1);
  });

  it('the h7 prereq slide teaches «مورا» for reading and «۳ ضربهٔ قلم» for writing', () => {
    const h7 = stationBySlug('stn-kana-h7');
    const prereq = h7.blocks.find((b) => b.id === 'blk-stn-kana-h7-prereq') as
      { titleFa: string; items: { glyph: string; noteFa: string }[] } | undefined;
    expect(prereq).toBeDefined();
    expect(prereq!.titleFa).toContain('مورا');
    expect(prereq!.titleFa).not.toBe('پیش از شروع: هر کانا، یک ضربه');
    const sa = prereq!.items.find((i) => i.glyph === 'さ')!;
    const se = prereq!.items.find((i) => i.glyph === 'せ')!;
    expect(sa.noteFa).toContain('۳ ضربهٔ قلم');
    expect(se.noteFa).toContain('۳ ضربهٔ قلم');
    expect(sa.noteFa).not.toBe('یک ضربه.');
    expect(se.noteFa).not.toBe('یک ضربه.');
  });
});

/* ------------------------------------------------------------------ FIX-4 */

describe('PART1 FIX-4 — h7 teaches ん before ANY exercise (teach-first)', () => {
  it('the FIRST h7 block is the ん kana-card; writing + quizzes come after', () => {
    const h7 = stationBySlug('stn-kana-h7');
    const kinds = h7.blocks.map((b) => b.kind);
    expect(h7.blocks[0]!.kind).toBe('kana-card');
    expect((h7.blocks[0] as { kanaId: string }).kanaId).toBe('hira-n');
    const cardAt = kinds.indexOf('kana-card');
    const firstExerciseAt = kinds.indexOf('exercise');
    const writingAt = kinds.indexOf('writing-practice');
    expect(cardAt).toBeLessThan(writingAt);
    expect(cardAt).toBeLessThan(firstExerciseAt);
  });
});

/* ------------------------------------------------------------------ FIX-5 */

describe('PART1 FIX-5 — the decode answer reading never leaks, teaches at reveal', () => {
  it('SERVER: a revealed kana-decode outcome carries correctReading with the authored reading', async () => {
    resetStoresForTests();
    // p2 carries the くに decode; complete its prerequisites honestly first.
    // UX-AUDIT #137: the entry gate holds — plant the chain the walk earned.
    await plantPrereqChain(QA_UUID, 'stn-kana-p2');
    const p2 = stationBySlug('stn-kana-p2');
    const store = getStationProgressStore();
    const dec = chapter.exercises['ex-kana-p2-dec-kuni'] as Exercise;
    const wrong = dec.options!.find((o) => o.id !== dec.correctOptionId)!.id;
    for (let i = 0; i < 3; i += 1) {
      const res = await stationPost(
        post({
          action: 'grade',
          chapterSlug: 'kana-foundation-01',
          stationSlug: p2.slug,
          exerciseId: 'ex-kana-p2-dec-kuni',
          attemptNo: 1,
          answer: { kind: 'option', optionId: wrong },
        }),
      );
      // attempt 1..2 may hit the F-ladder; the point is the FINAL reveal below.
      expect(res.status).toBe(200);
      await store.incrementAttempts(QA_UUID, p2.slug);
    }
    const res = await stationPost(
      post({
        action: 'grade',
        chapterSlug: 'kana-foundation-01',
        stationSlug: p2.slug,
        exerciseId: 'ex-kana-p2-dec-kuni',
        attemptNo: 3,
        answer: { kind: 'option', optionId: wrong },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data?: {
        outcome?: { correct: boolean; level: number; reveal?: boolean; correctReading?: { glyph: string; fa: string } };
      };
    };
    const outcome = body.data?.outcome;
    expect(outcome).toBeDefined();
    expect(outcome!.correct).toBe(false);
    expect(outcome!.level).toBeGreaterThanOrEqual(3);
    // the reveal card carries the word + the (fixed) Persian reading — the
    // teaching moment survives the leak removal.
    expect(outcome!.correctReading?.glyph).toBe('くに');
    expect(outcome!.correctReading?.fa).toBe('کوونی');
  });

  it('CLIENT: a decode question does NOT render its reading pre-answer (post-answer it does)', async () => {
    const dec = chapter.exercises['ex-kana-p2-dec-kuni'] as Exercise;
    const clientEx = { ...toClientExercise(dec), promptJaReading: 'کوونی' } as ReturnType<typeof toClientExercise>;
    // BEFORE the answer: the reading must be absent even if a boundary bug ever
    // re-attaches it (the render gate is post-answer only).
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              outcome: {
                ...gradeExerciseAnswer(dec, { kind: 'option', optionId: 'b' }, 3),
                correctReading: { glyph: 'くに', fa: 'کوونی', latin: '' },
              },
            },
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    cleanup();
    render(
      <ExerciseSession
        chapterSlug="kana-foundation-01"
        stationSlug="stn-kana-p2"
        exercises={[clientEx]}
        audioByLine={{}}
        audioAvailable={false}
      />,
    );
    expect(screen.queryByText('کوونی')).toBeNull();
    // answer WRONG (گونی — option b) → the panel shows the reading card post-answer.
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /گونی/ }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بررسی پاسخ' }));
    });
    await waitFor(() => {
      expect(document.querySelector('[data-feedback-panel]')).not.toBeNull();
    });
    // post-answer the reading is back — the reading line AND/OR the answer card.
    expect(screen.getAllByText('کوونی').length).toBeGreaterThanOrEqual(1);
    cleanup();
    vi.unstubAllGlobals();
  });
});

/* ------------------------------------------------------------------ FIX-6 */

describe('PART1 FIX-6 — wrap-up word counts are DISTINCT first-time words', () => {
  /** The same rule the fix applied (host words + reading examples, walk order). */
  function recompute(): Map<string, { isNew: number; cum: number }> {
    const seen = new Set<string>();
    const ordered = [...chapter.stations].sort((a, b) => a.order - b.order);
    const out = new Map<string, { isNew: number; cum: number }>();
    let cum = 0;
    for (const s of ordered) {
      const words: string[] = [];
      for (const b of s.blocks) {
        if (b.kind === 'kana-card') {
          const item = KANA_ITEMS.find((k) => k.kanaId === b.kanaId);
          if (item?.hostWord) words.push(item.hostWord.word);
        }
        if (b.kind === 'example-set') for (const e of b.examples) words.push(e.ja);
      }
      for (const w of words) {
        if (!seen.has(w)) {
          seen.add(w);
          cum += 1;
        }
      }
      out.set(s.slug, { isNew: 0, cum });
    }
    // second pass for per-station NEW counts (first-seen at THIS station)
    seen.clear();
    let running = 0;
    for (const s of ordered) {
      const words: string[] = [];
      for (const b of s.blocks) {
        if (b.kind === 'kana-card') {
          const item = KANA_ITEMS.find((k) => k.kanaId === b.kanaId);
          if (item?.hostWord) words.push(item.hostWord.word);
        }
        if (b.kind === 'example-set') for (const e of b.examples) words.push(e.ja);
      }
      let isNew = 0;
      for (const w of words) {
        if (!seen.has(w)) {
          seen.add(w);
          isNew += 1;
        }
      }
      running += isNew;
      out.set(s.slug, { isNew, cum: running });
    }
    return out;
  }

  const parseCounts = (s: Station): { isNew: number; cum: number } | null => {
    const wrap = s.blocks.find((b) => b.kind === 'wrap-up') as { itemsFa: string[] } | undefined;
    if (!wrap) return null;
    for (const line of wrap.itemsFa) {
      const m = line.match(/(\d+) واژهٔ واقعی تازه خواندنی شد — مجموع (\d+) واژه از جزوهٔ N5/);
      if (m) return { isNew: Number(m[1]), cum: Number(m[2]) };
    }
    return null;
  };

  it('every authored count string equals the recomputed distinct value', () => {
    const truth = recompute();
    const offenders: string[] = [];
    for (const s of chapter.stations) {
      const authored = parseCounts(s);
      if (!authored) continue;
      const t = truth.get(s.slug)!;
      if (authored.isNew !== t.isNew || authored.cum !== t.cum) {
        offenders.push(`${s.slug}: authored ${authored.isNew}/${authored.cum}, distinct truth ${t.isNew}/${t.cum}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the four evaluation-named stations carry the corrected numbers', () => {
    expect(parseCounts(stationBySlug('stn-kana-h8'))).toEqual({ isNew: 8, cum: 32 });
    expect(parseCounts(stationBySlug('stn-kana-h12'))).toEqual({ isNew: 8, cum: 60 });
    expect(parseCounts(stationBySlug('stn-kana-k11'))).toEqual({ isNew: 5, cum: 117 });
    expect(parseCounts(stationBySlug('stn-kana-k12'))).toEqual({ isNew: 1, cum: 118 });
  });

  it('the cumulative chain is honest: k11 counts 5 distinct words (was 9), matching the evaluation ground truth', () => {
    const k11Words = ['デザイナー', 'エンジニア', 'インドネシア', 'ノート', 'カタカナ'];
    const truth = recompute();
    // the k11 distinct set is exactly the evaluation's list
    const seen = new Set<string>();
    const ordered = [...chapter.stations].sort((a, b) => a.order - b.order);
    const k11 = ordered.find((s) => s.slug === 'stn-kana-k11')!;
    const k11Idx = ordered.indexOf(k11);
    for (const s of ordered.slice(0, k11Idx)) {
      for (const b of s.blocks) {
        if (b.kind === 'kana-card') {
          const item = KANA_ITEMS.find((k) => k.kanaId === b.kanaId);
          if (item?.hostWord) seen.add(item.hostWord.word);
        }
        if (b.kind === 'example-set') for (const e of b.examples) seen.add(e.ja);
      }
    }
    const k11New = k11Words.filter((w) => !seen.has(w));
    expect(k11New.sort()).toEqual([...k11Words].sort());
    expect(truth.get('stn-kana-k11')!.isNew).toBe(5);
  });
});

/* ------------------------------------------------------------------ FIX-1 */

describe('PART1 FIX-1 — the station API never raw-500s and never registers silently', () => {
  beforeEach(() => {
    resetStoresForTests();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('a store failure becomes a STRUCTURED 503 with retryable:true (never a raw 500)', async () => {
    const store = getStationProgressStore();
    // UX-AUDIT #137: the entry gate passes — the failure under test is the store write
    await plantPrereqChain(QA_UUID, 'stn-kana-h1');
    const spy = vi.spyOn(store, 'incrementAttempts').mockRejectedValueOnce(new Error('db pool exhausted'));
    const res = await stationPost(
      post({
        action: 'grade',
        chapterSlug: 'kana-foundation-01',
        stationSlug: 'stn-kana-h1',
        exerciseId: 'ex-kana-h1-rec-hira-a',
        attemptNo: 1,
        answer: { kind: 'option', optionId: 'a' },
      }),
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error?: { code?: string; details?: { retryable?: boolean } } };
    expect(body.error?.code).toBe('station/transient_failure');
    expect(body.error?.details?.retryable).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('the completion guard still rejects a station with exercises but ZERO server-graded answers', async () => {
    // h1's prerequisite h0 must be completed for the honest walk order.
    const store = getStationProgressStore();
    await store.upsert(QA_UUID, 'stn-kana-h0', {
      stationSlug: 'stn-kana-h0',
      status: 'in_progress',
      bestScore: null,
      attemptCount: 0,
    });
    const h0res = await stationPost(
      post({ action: 'complete', chapterSlug: 'kana-foundation-01', stationSlug: 'stn-kana-h0', score: null }),
    );
    expect(h0res.status).toBe(200);
    const res = await stationPost(
      post({ action: 'complete', chapterSlug: 'kana-foundation-01', stationSlug: 'stn-kana-h1', score: 1 }),
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('station/no_graded_answers');
  });

  it('CLIENT: a transport outage consumes NO ladder step and offers the re-send; «ادامه» never appears', async () => {
    cleanup();
    const dec = chapter.exercises['ex-kana-p2-dec-kuni'] as Exercise;
    const clientEx = toClientExercise(dec);
    let fail = true;
    const calls: { attemptNo: number }[] = [];
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { action: string; attemptNo?: number };
      if (body.action !== 'grade') return new Response(JSON.stringify({ data: {} }), { status: 200 });
      calls.push({ attemptNo: body.attemptNo ?? 0 });
      if (fail) return new Response(JSON.stringify({ error: { code: 'station/transient_failure' } }), { status: 503 });
      return new Response(JSON.stringify({ data: { outcome: { correct: true, level: 1, feedbackFa: 'درست!' } } }), {
        status: 200,
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <ExerciseSession
        chapterSlug="kana-foundation-01"
        stationSlug="stn-kana-p2"
        exercises={[clientEx]}
        audioByLine={{}}
        audioAvailable={false}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('radio', { name: /کوونی/ }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بررسی پاسخ' }));
    });
    // the outage is retried automatically (3 attempts, 1.5s/3s backoff)…
    await waitFor(
      () => {
        expect(calls.length).toBe(3);
      },
      { timeout: 8000 },
    );
    // …then the honest panel with the RE-SEND button (not a new attempt).
    expect(screen.getByRole('button', { name: 'تلاش دوبارهٔ ارسال' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'ادامه' })).toBeNull();
    // no ladder consumption: every sent attempt rode attemptNo 1.
    expect(calls.every((c) => c.attemptNo === 1)).toBe(true);
    // the server comes back — the SAME answer re-sends at the SAME attemptNo.
    fail = false;
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'تلاش دوبارهٔ ارسال' }));
    });
    await waitFor(() => {
      expect(screen.getByText('درست!')).toBeDefined();
    });
    expect(calls[calls.length - 1]!.attemptNo).toBe(1);
    cleanup();
    vi.unstubAllGlobals();
  });

  it('CLIENT: three SERVER-GRADED misses DO surface the attempt-3 «ادامه» escape', async () => {
    cleanup();
    const dec = chapter.exercises['ex-kana-p2-dec-kuni'] as Exercise;
    const clientEx = toClientExercise(dec);
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { action: string; attemptNo?: number };
      if (body.action !== 'grade') return new Response(JSON.stringify({ data: {} }), { status: 200 });
      const attemptNo = body.attemptNo ?? 1;
      return new Response(
        JSON.stringify({
          data: {
            outcome: gradeExerciseAnswer(dec, { kind: 'option', optionId: 'b' }, attemptNo as 1 | 2 | 3),
          },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <ExerciseSession
        chapterSlug="kana-foundation-01"
        stationSlug="stn-kana-p2"
        exercises={[clientEx]}
        audioByLine={{}}
        audioAvailable={false}
      />,
    );
    // wrong answer (گونی), graded, three times through the ladder
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        const radio = screen.queryByRole('radio', { name: /گونی/ });
        if (radio) fireEvent.click(radio);
      });
      const check = screen.queryByRole('button', { name: 'بررسی پاسخ' });
      if (check) {
        await act(async () => {
          fireEvent.click(check);
        });
      }
      const retry = screen.queryByRole('button', { name: 'تلاش دوباره' });
      if (retry && i < 2) {
        await act(async () => {
          fireEvent.click(retry);
        });
      }
    }
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'ادامه' })).not.toBeNull();
    });
    // the ungraded re-send button must NOT be there — every miss was graded.
    expect(screen.queryByRole('button', { name: 'تلاش دوبارهٔ ارسال' })).toBeNull();
    cleanup();
    vi.unstubAllGlobals();
  });
});
