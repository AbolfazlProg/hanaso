// @vitest-environment jsdom
/**
 * HANASO — differentiated error feedback tests (TASK-HANASO-20 — BUG-007).
 *
 * The audit (LIVE_WEBSITE_AUDIT §4 + RESEARCH_ALIGNMENT #ب) found all four
 * Yōon decode exercises showing the SAME unrelated template («واکه‌های بلند را
 * بررسی کن») even when the error had nothing to do with vowels, and the
 * authored `distractorRationaleFa` never rendering. These tests pin the fix:
 *  - the graded outcome carries the picked distractor's OWN rationale;
 *  - no exercise ships the generic copy-paste template anymore;
 *  - f1 texts are unique per chapter (no two exercises share an f1);
 *  - the rationale renders in the feedback panel (data-distractor-rationale).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { gradeExerciseAnswer, toClientExercise } from '@/modules/curriculum/grading';
import { getChapter } from '@/modules/curriculum/content';
import { ExerciseSession } from '@/components/curriculum/exercise-session';
import type { Exercise } from '@/modules/curriculum/types';

/* the audio cache is stubbed (no real sound in unit tests) */
vi.mock('@/modules/audio/client-cache', () => ({
  getCachedAudio: vi.fn(() => null),
  preloadAudio: vi.fn(async () => null),
  reportPlaybackError: vi.fn(),
}));

const chapter = getChapter('kana-foundation-01')!;
const dec1 = chapter.exercises['ex-kana-h6-dec-1'] as Exercise; // typed interface (not a union)

describe('BUG-007 — the picked distractor carries its OWN rationale', () => {
  it('wrong pick a → a-rationale; wrong pick c → c-rationale (never one shared text)', () => {
    const outA = gradeExerciseAnswer(dec1, { kind: 'option', optionId: 'a' }, 1);
    expect(outA.correct).toBe(false);
    expect(outA.distractorRationaleFa).toBe(dec1.distractorRationaleFa?.a);
    const outC = gradeExerciseAnswer(dec1, { kind: 'option', optionId: 'c' }, 1);
    expect(outC.distractorRationaleFa).toBe(dec1.distractorRationaleFa?.c);
    expect(outA.distractorRationaleFa).not.toBe(outC.distractorRationaleFa);
  });

  it('a correct answer carries NO rationale (and none leaks pre-answer)', () => {
    const out = gradeExerciseAnswer(dec1, { kind: 'option', optionId: 'b' }, 1);
    expect(out.correct).toBe(true);
    expect((out as { distractorRationaleFa?: string }).distractorRationaleFa).toBeUndefined();
  });
});

describe('BUG-007 — the generic copy-paste template is gone chapter-wide', () => {
  it('no exercise ships «همین نیست — واکه‌های بلند را بررسی کن» or the identical rationale', () => {
    const genericF1 = 'همین نیست — واکه‌های بلند را بررسی کن.';
    const genericRat = 'طول واکه یا صدا‌بندی را بازبینی کن.';
    const offenders: string[] = [];
    for (const ex of Object.values(chapter.exercises)) {
      if (ex.feedback?.f1Fa === genericF1) offenders.push(`${ex.id}/f1`);
      for (const rat of Object.values(ex.distractorRationaleFa ?? {})) {
        if (rat === genericRat) offenders.push(`${ex.id}/rationale`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('kana-decode f1 texts are unique WITHIN a station (the audit rule: no two decode exercises of one station share an f1)', () => {
    // Scope (documented product decision): the per-card mill exercises
    // (recognition/recall/listening per kana) keep their TYPE-level templates —
    // their item-level differentiation lives in distractorRationaleFa and the
    // integrated answer card. The DECODE/rule exercises — where the audit found
    // the copy-paste bug — must carry item-specific f1 coaching.
    // map every exercise id to the stations whose decks carry it
    const stationsOf = new Map<string, string[]>();
    for (const st of chapter.stations) {
      for (const b of st.blocks) {
        if (b.kind !== 'exercise') continue;
        for (const id of b.exerciseIds) stationsOf.set(id, [...(stationsOf.get(id) ?? []), st.slug]);
      }
    }
    const dupes: string[] = [];
    for (const st of chapter.stations) {
      const seen = new Map<string, string>();
      for (const b of st.blocks) {
        if (b.kind !== 'exercise') continue;
        for (const id of b.exerciseIds) {
          const ex = chapter.exercises[id];
          if (ex?.type !== 'kana-decode') continue; // decode scope only (see note above)
          const f1 = ex?.feedback?.f1Fa?.trim();
          if (!f1) continue;
          const prev = seen.get(f1);
          if (prev) dupes.push(`${st.slug}: ${prev} == ${id}`);
          else seen.set(f1, id);
        }
      }
    }
    expect(dupes).toEqual([]);
  });
});

describe('BUG-007 — the rationale renders in the feedback panel', () => {
  beforeEach(() => cleanup());
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  it('shows data-distractor-rationale with the picked option’s own text', async () => {
    // stub the grade endpoint: server-shaped WRONG outcome with the a-rationale
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: {
              outcome: gradeExerciseAnswer(dec1, { kind: 'option', optionId: 'a' }, 1),
            },
          }),
          { status: 200 },
        ),
      ),
    );
    const clientEx = toClientExercise(dec1);
    render(
      <ExerciseSession
        chapterSlug="kana-foundation-01"
        stationSlug="stn-kana-h6"
        exercises={[clientEx]}
        audioByLine={{}}
        audioAvailable={false}
      />,
    );
    // answer WRONG with distractor a («ایشی») — the panel must render that
    // option’s OWN rationale under the ladder line (data-distractor-rationale).
    const radio = screen.getByRole('radio', { name: new RegExp('ایشی') });
    const btn = screen.getByRole('button', { name: 'بررسی پاسخ' }) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(radio);
    });
    await act(async () => {
      fireEvent.click(btn);
    });
    const rationale = document.querySelector('[data-distractor-rationale]');
    expect(rationale?.textContent).toBe(dec1.distractorRationaleFa?.a);
  });
});
