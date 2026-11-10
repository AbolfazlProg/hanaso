/**
 * HANASO — TASK-LEARNING-08 Addendum-2 §7: no redundant «ادامه» after a correct
 * answer.
 *
 * The owner saw BOTH the red «ادامه» button AND the automatic advance after a
 * correct answer — a duplicated control. The fix: a correct answer shows the
 * short auto-next hint and advances on its own; the manual button survives
 * ONLY on the wrong-answer path once the feedback ladder is exhausted (the
 * learner's own choice there). Wrong answers keep retry + clue as before.
 */
// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';

import { ExerciseSession } from '@/components/curriculum/exercise-session';
import { EXPERIENCE } from '@/config/experience';
import type { ClientExercise } from '@/modules/curriculum/grading';

const exA: ClientExercise = {
  id: 'ex-a2-1',
  type: 'kana-recognition',
  targetSkill: 'vocab',
  promptFa: 'این کانا چه صدایی دارد؟',
  promptJa: 'あ',
  options: [
    { id: 'a', label: '«آ»' },
    { id: 'b', label: '«اُ»' },
    { id: 'c', label: '«ای»' },
  ],
};
const exB: ClientExercise = {
  id: 'ex-a2-2',
  type: 'kana-recognition',
  targetSkill: 'vocab',
  promptFa: 'این کانا چه صدایی دارد؟',
  promptJa: 'い',
  options: [
    { id: 'a', label: '«ای»' },
    { id: 'b', label: '«آ»' },
    { id: 'c', label: '«او»' },
  ],
};

let gradeOutcome: { correct: boolean; level: 0 | 1 | 2 | 3; feedbackFa: string } | null = null;

beforeEach(() => {
  gradeOutcome = { correct: true, level: 2, feedbackFa: 'بله — همین است!' };
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify({ data: { outcome: gradeOutcome } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function renderSession() {
  return render(
    <ExerciseSession
      chapterSlug="kana-foundation-01"
      stationSlug="stn-kana-h1"
      exercises={[exA, exB]}
      audioByLine={{}}
      audioAvailable={false}
    />,
  );
}

async function selectAndCheck(label: string) {
  fireEvent.click(screen.getByRole('radio', { name: new RegExp(label) }));
  fireEvent.click(screen.getByRole('button', { name: 'بررسی پاسخ' }));
  await waitFor(() => {
    expect(screen.getByText('بله — همین است!')).toBeTruthy();
  });
}

describe('ExerciseSession — Addendum-2 §7 (correct answer: no manual «ادامه», the flow owns it)', () => {
  it('a CORRECT answer shows the auto-next hint and NO «ادامه» button', async () => {
    renderSession();
    await selectAndCheck('«آ»');
    // the auto-next hint is visible…
    expect(screen.getByText(/به سؤال بعد می‌رویم/)).toBeTruthy();
    // …and the manual continue button is GONE (owner §7)
    expect(screen.queryByRole('button', { name: 'ادامه' })).toBeNull();
  });

  it('the system advances on its own after the configured delay — no click needed', async () => {
    renderSession();
    await selectAndCheck('«آ»');
    // still question 1 during the review beat — then い arrives BY ITSELF
    await waitFor(
      () => {
        // question 2 (い): its «او» distractor option is on screen
        expect(screen.getByRole('radio', { name: /«او»/ })).toBeTruthy();
      },
      { timeout: EXPERIENCE.autoNextDelayMsCorrect + 2500 },
    );
    // and the manual button never existed at any point on the correct path
    expect(screen.queryByRole('button', { name: 'ادامه' })).toBeNull();
  }, 10000);

  it('on the WRONG-answer path the retry button stays (Addendum-2 §7 keeps the ladder)', async () => {
    gradeOutcome = { correct: false, level: 1, feedbackFa: 'دقیق نشد' };
    renderSession();
    fireEvent.click(screen.getByRole('radio', { name: /«اُ»/ }));
    fireEvent.click(screen.getByRole('button', { name: 'بررسی پاسخ' }));
    await waitFor(() => {
      expect(screen.getByText('دقیق نشد')).toBeTruthy();
    });
    // retry stays the learner's choice — never auto-advanced on a wrong answer
    expect(screen.getByRole('button', { name: 'دوباره تلاش کن' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'ادامه' })).toBeNull();
  });
});
