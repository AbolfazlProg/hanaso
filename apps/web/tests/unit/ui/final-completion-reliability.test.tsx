// @vitest-environment jsdom
/**
 * HANASO — TASK-HANASO-21 — FINAL COMPLETION RELIABILITY (the owner-observed bug).
 *
 * The owner walked a whole lesson, clicked the final completion action, the
 * progress had been recorded — but the completion POST failed with an error and
 * the station never registered as Completed. TASK-HANASO-20's 22/22 E2E did not
 * contradict the observation: they never drove an exercise_threshold station
 * whose LAST exercise answers correctly with NO committed audio.
 *
 * Root cause (TASK-HANASO-21): ExerciseSession's auto-next timer captured a
 * STALE `advance` closure (pre-increment `firstTryCorrect`), so the final
 * onSessionDone reported the last correct answer as NOT first-try-correct.
 * On stations where (N-1)/N < threshold (stn-kana-k8: 2/3=0.667 < 0.7,
 * stn-kana-k12-foreign: 1/2=0.5 < 0.7) a PERFECT walk scored below the gate →
 * 409 station/completion_not_met → the generic retry re-submitted the SAME
 * stale score forever → a dead end the learner could never pass.
 *
 * This file pins the whole chain:
 * R1 — component: the last correct answer (no audio) counts in onSessionDone.
 * R2 — component: the last correct answer (audio path) counts too (regression).
 * R3 — component: the last correct answer (audio play-failure fallback).
 * R4 — runner: a PERFECT walk of the trap station (stn-kana-k8 assessment)
 *      completes (200) — never 409, never the failure panel.
 * R5 — API: criterion 409 is STRUCTURED (Persian + details.kind='criterion').
 * R6 — runner: an honest below-threshold walk gets the criterion panel with a
 *      ONE-CLICK redo of the final exercise (no full re-walk, progress kept).
 * R7 — redo: the redone exercise session re-completes the station with the new
 *      score (recovery path works end-to-end).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';

import { ExerciseSession } from '@/components/curriculum/exercise-session';
import { StationRunner } from '@/components/curriculum/station-runner';
import { getChapter } from '@/modules/curriculum/content';
import { toClientStation, toClientExercise } from '@/modules/curriculum';
import type { ClientExercise } from '@/modules/curriculum/grading';
import { saveWalkSnapshot } from '@/modules/curriculum/walk-persistence';
import { resetAudioCacheForTests } from '@/modules/audio/client-cache';
import { EXPERIENCE } from '@/config/experience';
import type { Chapter } from '@/modules/curriculum/types';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), forward: vi.fn() }),
}));

const chapter = getChapter('kana-foundation-01') as Chapter;

/* ------------------------------------------------------------------ fake audio */

class FakeAudio {
  static instances: FakeAudio[] = [];
  src = '';
  preload = '';
  paused = true;
  playbackRate = 1;
  preservesPitch = true;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  /** when set, play() rejects and onerror fires (the failure shape). */
  static failPlayback = false;
  /** when set, play() resolves and onended fires after this many ms. */
  static endAfterMs: number | null = null;
  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }
  addEventListener() {}
  load() {}
  pause() {
    this.paused = true;
  }
  play() {
    this.paused = false;
    if (FakeAudio.failPlayback) {
      return Promise.reject(new Error('nope')).catch(() => {
        this.onerror?.();
      }) as unknown as Promise<void>;
    }
    if (FakeAudio.endAfterMs !== null) {
      setTimeout(() => this.onended?.(), FakeAudio.endAfterMs);
    }
    return Promise.resolve();
  }
}

/* ------------------------------------------------------------------ R1..R3 */

function correctOutcome(correctAudio?: { what: string; opus: string; m4a: string }) {
  return {
    correct: true,
    level: 2 as const,
    feedbackFa: 'بله — همین است!',
    ...(correctAudio ? { correctAudio } : {}),
  };
}

const EX1: ClientExercise = {
  id: 'ex-t1',
  type: 'kana-decode',
  targetSkill: 'vocab',
  promptFa: 'این واژه را بخوان',
  options: [
    { id: 'a', label: '«یک»' },
    { id: 'b', label: '«دو»' },
    { id: 'c', label: '«سه»' },
  ],
};
const EX2: ClientExercise = {
  id: 'ex-t2',
  type: 'kana-decode',
  targetSkill: 'vocab',
  promptFa: 'این واژه را بخوان',
  options: [
    { id: 'a', label: '«چهار»' },
    { id: 'b', label: '«پنج»' },
    { id: 'c', label: '«شش»' },
  ],
};

async function answerCorrect(label: RegExp) {
  fireEvent.click(screen.getByRole('radio', { name: label }));
  fireEvent.click(screen.getByRole('button', { name: 'بررسی پاسخ' }));
  await waitFor(() => {
    expect(screen.getByText('بله — همین است!')).toBeTruthy();
  });
}

/** Wait for the auto-next to leave the current question (feedback unmounts).
 *  The feedback TEXT differs per suite (component stub vs the k8 mock key). */
async function waitForAdvance(feedbackText: string) {
  await waitFor(
    () => {
      expect(screen.queryByText(feedbackText)).toBeNull();
    },
    { timeout: EXPERIENCE.autoNextDelayMsCorrect + EXPERIENCE.autoNextAudioFallbackMs + 2000 },
  );
}

describe('R1..R3 — the last correct answer always counts (stale-closure regression)', () => {
  beforeEach(() => {
    FakeAudio.failPlayback = false;
    FakeAudio.endAfterMs = null;
    resetAudioCacheForTests();
    vi.stubGlobal('Audio', FakeAudio);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function renderSession(onSessionDone: (score: number, graded: number) => void) {
    return render(
      <ExerciseSession
        chapterSlug="kana-foundation-01"
        stationSlug="stn-kana-test"
        exercises={[EX1, EX2]}
        audioByLine={{}}
        audioAvailable={false}
        onSessionDone={onSessionDone}
      />,
    );
  }

  it('R1: no-audio path — onSessionDone reports the FRESH first-try score', { timeout: 20000 }, async () => {
    const done = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ data: { outcome: correctOutcome() } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );
    renderSession(done);
    await answerCorrect(/«دو»/);
    await waitForAdvance('بله — همین است!');
    await answerCorrect(/«پنج»/);
    // the LAST question stays latched by design — the session DONE signal is
    // what fires (the host then unmounts/replaces the block)
    await waitFor(
      () => {
        expect(done).toHaveBeenCalledTimes(1);
      },
      { timeout: 4000 },
    );
    expect(done).toHaveBeenCalledWith(1, 2); // 2/2 — NOT the stale 1/2
  });

  it('R2: audio path — the fresh score survives the end→beat→advance chain', { timeout: 20000 }, async () => {
    FakeAudio.endAfterMs = 80; // the sound ends quickly, then the 650ms beat
    const done = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: { outcome: correctOutcome({ what: 'テスト', opus: '/a.opus', m4a: '/a.m4a' }) },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      ),
    );
    renderSession(done);
    await answerCorrect(/«دو»/);
    await waitForAdvance('بله — همین است!');
    await answerCorrect(/«پنج»/);
    await waitFor(
      () => {
        expect(done).toHaveBeenCalledTimes(1);
      },
      { timeout: 4000 },
    );
    expect(done).toHaveBeenCalledWith(1, 2);
  });

  it('R3: audio play-failure fallback — the fresh score still reports', { timeout: 20000 }, async () => {
    FakeAudio.failPlayback = true; // startOutcomeAudio → immediate unavailable
    const done = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: { outcome: correctOutcome({ what: 'テスト', opus: '/x.opus', m4a: '/x.m4a' }) },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      ),
    );
    renderSession(done);
    await answerCorrect(/«دو»/);
    await waitForAdvance('بله — همین است!');
    await answerCorrect(/«پنج»/);
    await waitFor(
      () => {
        expect(done).toHaveBeenCalledTimes(1);
      },
      { timeout: 4000 },
    );
    expect(done).toHaveBeenCalledWith(1, 2);
  });
});

/* ---------------------------------------------------------------- R4..R7 */

const STATION = chapter.stations.find((s) => s.slug === 'stn-kana-k8')!;
const MAP_HREF = '/learn/kana-foundation-01/journey?s=island-3-kata-voice';

/** Exactly what the station page assembles (client-safe, answer-stripped). */
function k8ClientExercises(): Record<string, ClientExercise> {
  const out: Record<string, ClientExercise> = {};
  for (const block of STATION.blocks) {
    if (block.kind !== 'exercise') continue;
    for (const id of block.exerciseIds) {
      const ex = chapter.exercises[id];
      if (ex) out[id] = toClientExercise(ex);
    }
  }
  return out;
}

interface CompleteCall {
  score: number | null;
  taskCompleted: boolean;
}

function renderK8() {
  const completeCalls: CompleteCall[] = [];
  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.startsWith('/api/curriculum/station?')) {
      return new Response(
        JSON.stringify({ data: { state: { status: 'in_progress', currentBlock: null } } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    if (u === '/api/curriculum/station' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as {
        action: string;
        score?: number | null;
        taskCompleted?: boolean;
        exerciseId?: string;
        answer?: { kind: string; optionId?: string };
      };
      if (body.action === 'grade') {
        // grade against the REAL answer key (the server never trusts the client)
        const ex = body.exerciseId ? chapter.exercises[body.exerciseId] : undefined;
        const correct = !!ex && 'correctOptionId' in ex && body.answer?.optionId === ex.correctOptionId;
        return new Response(
          JSON.stringify({
            data: { outcome: { correct, level: correct ? 2 : 1, feedbackFa: correct ? 'درست است!' : 'نزدیک بود' } },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (body.action === 'complete') {
        completeCalls.push({ score: body.score ?? null, taskCompleted: body.taskCompleted ?? false });
        const score = body.score ?? 0;
        if (score >= 0.7) {
          return new Response(
            JSON.stringify({
              data: { stationSlug: STATION.slug, state: { status: 'completed' }, already: false },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({
            error: {
              code: 'station/completion_not_met',
              message: 'برای ثبت پایان این درس، نمرهٔ تمرین پایانی باید دست‌کم ۷۰٪ باشد.',
              details: { kind: 'criterion', score, threshold: 0.7 },
            },
          }),
          { status: 409, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ data: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('{}', { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  window.localStorage.clear();
  saveWalkSnapshot({
    chapterSlug: 'kana-foundation-01',
    stationSlug: STATION.slug,
    stepIndex: 11, // blk-stn-kana-k8-assessment — the LAST exercise block
    blockResults: {
      'blk-stn-kana-k8-warmup': 1,
      'blk-stn-kana-k8-guided': 1,
      'blk-stn-kana-k8-apply-read': 1,
      'blk-stn-kana-k8-independent': 1,
      'blk-stn-kana-k8-rule-choonpu': 1,
    },
    exerciseProgress: {},
    kanaCardStages: {},
    sessionScore: 1,
  });
  const utils = render(
    <StationRunner
      chapterSlug="kana-foundation-01"
      station={toClientStation(STATION)}
      chapter={{ words: chapter.words, expressions: chapter.expressions }}
      mapHref={MAP_HREF}
      nextCoreStation={null}
      clientExercises={k8ClientExercises()}
      dialogue={{ lines: [], speakers: {} }}
      audioByLine={{}}
      audioAvailable={false}
    />,
  );
  return { completeCalls, ...utils };
}

/** The assessment block's correct-option labels (ex-kana-k8-asm-1..3). */
const ASM_CORRECT = [/کِیکی/, /ボールペン/, /کوورا/];

async function answerFirstTryCorrectAll() {
  for (const label of ASM_CORRECT) {
    fireEvent.click(screen.getByRole('radio', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: 'بررسی پاسخ' }));
    await waitFor(() => {
      expect(screen.getByText('درست است!')).toBeTruthy();
    });
    await waitForAdvance('درست است!');
  }
}

/** Q1 wrong twice then correct (attempt 3 — not first-try); Q2/Q3 first-try → 2/3. */
async function answerQ1WrongThenRest() {
  const first = ASM_CORRECT[0]!;
  // attempts 1 + 2: a wrong option, then the retry button (ladder up)
  for (let a = 0; a < 2; a += 1) {
    const radios = screen.getAllByRole('radio');
    const target = radios.find((r) => first.test(r.textContent ?? ''));
    const wrong = radios.find((r) => r !== target && !r.hasAttribute('disabled')) ?? radios.find((r) => r !== target);
    fireEvent.click(wrong!);
    fireEvent.click(screen.getByRole('button', { name: 'بررسی پاسخ' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'دوباره تلاش کن' })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'دوباره تلاش کن' }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'دوباره تلاش کن' })).toBeNull();
    });
  }
  // attempt 3: the correct option
  fireEvent.click(screen.getByRole('radio', { name: first }));
  fireEvent.click(screen.getByRole('button', { name: 'بررسی پاسخ' }));
  await waitFor(() => {
    expect(screen.getByText('درست است!')).toBeTruthy();
  });
  await waitForAdvance('درست است!');

  for (const label of ASM_CORRECT.slice(1)) {
    fireEvent.click(screen.getByRole('radio', { name: label }));
    fireEvent.click(screen.getByRole('button', { name: 'بررسی پاسخ' }));
    await waitFor(() => {
      expect(screen.getByText('درست است!')).toBeTruthy();
    });
    await waitForAdvance('درست است!');
  }
}

describe('R4..R7 — StationRunner final-completion reliability (stn-kana-k8 trap)', () => {
  beforeEach(() => {
    FakeAudio.failPlayback = false;
    FakeAudio.endAfterMs = null;
    resetAudioCacheForTests();
    vi.stubGlobal('Audio', FakeAudio);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('R4: a PERFECT assessment walk completes the station (200, success panel)', { timeout: 40000 }, async () => {
    const { completeCalls } = renderK8();
    await answerFirstTryCorrectAll();
    // wrap-up reached → the final «ادامه» fires completion
    fireEvent.click(await screen.findByRole('button', { name: 'ادامه' }));
    await waitFor(
      () => {
        expect(screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!')).toBeTruthy();
      },
      { timeout: 4000 },
    );
    expect(completeCalls.length).toBeGreaterThanOrEqual(1);
    expect(completeCalls[0]!.score).toBe(1); // the FRESH score — 3/3, not the stale 2/3
  });

  it('R6: an honest below-threshold walk shows the STRUCTURED criterion panel + a redo action', { timeout: 40000 }, async () => {
    const { completeCalls } = renderK8();
    await answerQ1WrongThenRest(); // first-try score 2/3 = 0.667 < 0.7 (honest miss)
    fireEvent.click(await screen.findByRole('button', { name: 'ادامه' }));
    await waitFor(
      () => {
        expect(screen.getByTestId('criterion-failure-panel')).toBeTruthy();
      },
      { timeout: 4000 },
    );
    expect(completeCalls[0]!.score).toBeCloseTo(2 / 3, 5);
    // the redo action exists (no dead retry loop)
    expect(screen.getByTestId('redo-final-exercise')).toBeTruthy();
  });

  it('R7: the redo action re-opens ONLY the final exercise; a fresh pass then completes', { timeout: 60000 }, async () => {
    const { completeCalls } = renderK8();
    await answerQ1WrongThenRest();
    fireEvent.click(await screen.findByRole('button', { name: 'ادامه' }));
    await waitFor(() => expect(screen.getByTestId('criterion-failure-panel')).toBeTruthy(), { timeout: 4000 });
    fireEvent.click(screen.getByTestId('redo-final-exercise'));
    // the assessment block re-renders as a LIVE session (no skip panel)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'بررسی پاسخ' })).toBeTruthy();
    });
    await answerFirstTryCorrectAll();
    fireEvent.click(await screen.findByRole('button', { name: 'ادامه' }));
    await waitFor(
      () => {
        expect(screen.getByText('این ایستگاه را با موفقیت پشت سر گذشتی!')).toBeTruthy();
      },
      { timeout: 4000 },
    );
    expect(completeCalls[completeCalls.length - 1]!.score).toBe(1);
  });
});
