// @vitest-environment jsdom
/**
 * HANASO — TASK-LEARNING-10 §3/§4/§5: the quiz feedback + sound flow.
 *
 * The owner's rules, pinned here:
 * - After a CORRECT answer the correct pronunciation AUTO-PLAYS once — hearing
 *   it never requires an extra click; the compact replay control stays.
 * - The feedback is an integrated answer card: status + the character + its
 *   Persian|Latin reading («کی | ki») + the teaching copy.
 * - The next question waits for the sound to END + a short beat — the auto-next
 *   never races the audio anymore.
 * - Manual and auto playback never overlap; a replay re-arms the wait (a
 *   replaying learner is never advanced mid-listen); re-renders never
 *   re-trigger a play.
 * - A failed or stalled sound never locks the question: an honest short note
 *   shows, the flow continues (immediate failure → standard delay; stall →
 *   bounded by autoNextAudioFallbackMs and advances right there).
 * - On a WRONG answer the sound plays only when the reveal itself appears (F3)
 *   — never before (no leak), never repeatedly, and the question never
 *   auto-advances (retry stays the learner's choice).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, act, within } from '@testing-library/react';
import * as React from 'react';

import { ExerciseSession } from '@/components/curriculum/exercise-session';
import { EXPERIENCE } from '@/config/experience';
import type { ClientExercise } from '@/modules/curriculum/grading';

/* ---- the shared audio cache is mocked: one controllable fake element per URL */
const audioHoist = vi.hoisted(() => {
  interface FakeEl {
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
    onerror: (() => void) | null;
    currentTime: number;
    playbackRate: number;
    preservesPitch: boolean;
    src: string;
  }
  const els: Record<string, FakeEl> = {};
  const make = (opts?: { playImpl?: () => Promise<void> }): FakeEl => {
    const el: FakeEl = {
      play: vi.fn(() => (opts?.playImpl ? opts.playImpl() : Promise.resolve())) as FakeEl['play'],
      pause: vi.fn(),
      onended: null,
      onerror: null,
      currentTime: 0,
      playbackRate: 1,
      preservesPitch: true,
      src: '',
    };
    return el;
  };
  return { els, make };
});
vi.mock('@/modules/audio/client-cache', () => ({
  getCachedAudio: vi.fn((url: string) => audioHoist.els[url] ?? null),
  preloadAudio: vi.fn(async () => null),
  reportPlaybackError: vi.fn(),
}));

const exA: ClientExercise = {
  id: 'ex-a-1',
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
  id: 'ex-b-1',
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

const CORRECT_AUDIO = { what: 'あ', opus: '/audio/kana/kn-hira-a.opus', m4a: '/audio/kana/kn-hira-a.m4a' };
const CORRECT_READING = { glyph: 'あ', fa: 'آ', latin: 'a' };

type Outcome = {
  correct: boolean;
  level: 0 | 1 | 2 | 3;
  feedbackFa: string;
  reveal?: string;
  correctAudio?: typeof CORRECT_AUDIO;
  correctReading?: typeof CORRECT_READING;
};
let gradeOutcome: Outcome | null = null;

beforeEach(() => {
  gradeOutcome = {
    correct: true,
    level: 2,
    feedbackFa: 'درست!',
    correctAudio: CORRECT_AUDIO,
    correctReading: CORRECT_READING,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ data: { outcome: gradeOutcome } }), { status: 200 })),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  for (const k of Object.keys(audioHoist.els)) delete audioHoist.els[k];
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
  const radio = screen.getByRole('radio', { name: new RegExp(label) });
  const btn = screen.getByRole('button', { name: 'بررسی پاسخ' }) as HTMLButtonElement;
  // two SEPARATE acts: the check button only enables after the radio click
  // commits (a disabled button swallows the click inside a single act)
  await act(async () => {
    fireEvent.click(radio);
  });
  await act(async () => {
    fireEvent.click(btn);
  });
  // flush the async grade round-trip: microtasks AND a macrotask tick (the
  // mocked Response.json() chain) — real and fake timers alike
  for (let i = 0; i < 25 && !document.querySelector('[data-feedback-panel]'); i += 1) {
    await act(async () => {
      if (vi.isFakeTimers()) {
        await vi.advanceTimersByTimeAsync(0);
      } else {
        await new Promise((r) => setTimeout(r, 0));
      }
      await Promise.resolve();
    });
  }
  expect(document.querySelector('[data-feedback-panel]'), 'the feedback panel arrived').toBeTruthy();
}

describe('ExerciseSession — TL-10 §3 integrated answer card', () => {
  it('a correct recognition answer shows the glyph + «فارسی | لاتین» reading + the compact replay control', async () => {
    audioHoist.els[CORRECT_AUDIO.opus] = audioHoist.make();
    renderSession();
    await selectAndCheck('«آ»');

    // the answer card: glyph + Persian reading + Latin complement — scoped
    // INSIDE the reading row (the radio options carry the same Persian words,
    // so a bare getByText would match several elements)
    const reading = document.querySelector('[data-feedback-reading]');
    expect(reading).toBeTruthy();
    // Persian is the PRIMARY guide — its own bold element in the row
    expect(within(reading as HTMLElement).getByText('آ')).toBeTruthy();
    // the reading row is one unit: «آ | a»
    expect(reading?.textContent).toContain('آ');
    expect(reading?.textContent).toContain('|');
    expect(within(reading as HTMLElement).getByText('a')).toBeTruthy();
    // the compact replay control exists and is NOT the old big labeled button
    const replay = screen.getByRole('button', { name: /پخش تلفظ درست/ });
    expect(replay.className).toContain('rounded-full');
    expect(replay.className).not.toContain('border-ai bg-card');
    // the duplicated «درست!» copy is gone — the status title says it once
    expect(document.querySelectorAll('[data-feedback-panel] p').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('درست!').length).toBe(1);
  });

  it('the wrong-path reveal (F3) plays the sound once, only when the reveal appears — and never auto-advances', async () => {
    const el = audioHoist.make();
    audioHoist.els[CORRECT_AUDIO.opus] = el;
    gradeOutcome = {
      correct: false,
      level: 3,
      feedbackFa: 'کانای あ با خوانش «آ» خوانده می‌شود.',
      reveal: '«آ»',
      correctAudio: CORRECT_AUDIO,
      correctReading: CORRECT_READING,
    };
    renderSession();
    // answer WRONG — the F3 outcome carries the reveal
    await selectAndCheck('«اُ»');
    // the sound played exactly once, matched to the moment the reveal shows
    expect(el.play).toHaveBeenCalledTimes(1);
    // the question stays put: no auto-next was scheduled (no advance hint)
    expect(screen.queryByText(/به سؤال بعد می‌رویم/)).toBeNull();
    // the learner still holds the controls: retry + replay
    expect(screen.getByRole('button', { name: 'دوباره تلاش کن' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /پخش تلفظ درست/ })).toBeTruthy();
  });
});

describe('ExerciseSession — TL-10 §5 the sound owns the clock', () => {
  it('the sound AUTO-PLAYS once on a correct answer; the next question waits for ended + beat', async () => {
    vi.useFakeTimers();
    const el = audioHoist.make();
    audioHoist.els[CORRECT_AUDIO.opus] = el;
    renderSession();
    // NOTE: no outer act wrapper here — a nested async act around the helper
    // prevents React from committing the grade round-trip under fake timers
    // (traced: fetch fires, play fires, but the DOM never re-renders). The §3
    // style — awaiting the helper directly — is the working pattern.
    await selectAndCheck('«آ»');

    // auto-play fired ONCE, immediately with the outcome — no click needed
    expect(el.play).toHaveBeenCalledTimes(1);

    // the playing state's re-render did NOT re-trigger a play (no double-play
    // on state changes / re-renders)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(el.play).toHaveBeenCalledTimes(1);

    // well past the OLD fixed delay (1500ms) the question is STILL here — the
    // auto-next no longer races the audio
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EXPERIENCE.autoNextDelayMsCorrect + 500);
    });
    expect(el.play).toHaveBeenCalledTimes(1);
    expect(screen.getByText('این کانا چه صدایی دارد؟', { exact: false })).toBeTruthy();
    expect(screen.queryByRole('radio', { name: /«او»/ })).toBeNull(); // question 2 not yet

    // the sound ends → the short beat → the NEXT question arrives by itself
    await act(async () => {
      el.onended?.();
      await vi.advanceTimersByTimeAsync(EXPERIENCE.autoNextAudioBeatMs + 100);
    });
    expect(screen.getByRole('radio', { name: /«او»/ })).toBeTruthy(); // question 2 (い) is live
    // and the leaving question stopped its sound (no bleed into question 2)
    expect(el.pause).toHaveBeenCalled();
  });

  it('a manual replay cancels the pending advance and re-arms the wait (never advanced mid-listen)', async () => {
    vi.useFakeTimers();
    const el = audioHoist.make();
    audioHoist.els[CORRECT_AUDIO.opus] = el;
    renderSession();
    await selectAndCheck('«آ»');
    // the auto-play ends → the beat is armed
    await act(async () => {
      el.onended?.();
      await vi.advanceTimersByTimeAsync(EXPERIENCE.autoNextAudioBeatMs - 200);
    });
    expect(screen.queryByRole('radio', { name: /«او»/ })).toBeNull(); // still question 1 — beat not done

    // the learner replays BEFORE the beat fires
    fireEvent.click(screen.getByRole('button', { name: /پخش تلفظ درست/ }));
    expect(el.play).toHaveBeenCalledTimes(2);
    // the previously-armed beat must be gone: give it plenty of time — no advance
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EXPERIENCE.autoNextAudioBeatMs + 2000);
    });
    expect(screen.queryByRole('radio', { name: /«او»/ })).toBeNull();
    // the replay ends → beat → advance (the re-armed wait works)
    await act(async () => {
      el.onended?.();
      await vi.advanceTimersByTimeAsync(EXPERIENCE.autoNextAudioBeatMs + 100);
    });
    expect(screen.getByRole('radio', { name: /«او»/ })).toBeTruthy();
  });

  it('an immediate play failure shows the honest note and continues on the standard delay — never locked', async () => {
    vi.useFakeTimers();
    const el = audioHoist.make({ playImpl: () => Promise.reject(new Error('no media')) });
    audioHoist.els[CORRECT_AUDIO.opus] = el;
    renderSession();
    await selectAndCheck('«آ»');
    // the failure surfaced quickly
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    expect(screen.getByText('صوت در دسترس نیست')).toBeTruthy();
    // the replay control STAYS available (it never disappears before use)
    expect(screen.getByRole('button', { name: /پخش تلفظ درست/ })).toBeTruthy();
    // the flow continues on its own — the standard after-retry delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EXPERIENCE.autoNextDelayMsCorrectAfterRetry + 300);
    });
    expect(screen.getByRole('radio', { name: /«او»/ })).toBeTruthy(); // question 2 arrived
  });

  it('a stalled sound (no ended, no error) is bounded by the fallback and advances right there', async () => {
    vi.useFakeTimers();
    // play resolves but nothing ever fires — a stall
    const el = audioHoist.make();
    audioHoist.els[CORRECT_AUDIO.opus] = el;
    renderSession();
    await selectAndCheck('«آ»');

    // long past the old fixed delay: still here, still not locked
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EXPERIENCE.autoNextDelayMsCorrect + 1500);
    });
    expect(screen.queryByRole('radio', { name: /«او»/ })).toBeNull();

    // the fallback bound fires — but NOT as a same-commit jump: the note shows
    // FIRST (a note that dies with the advance would never be read), the
    // question holds for the short beat, and only then advances
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    // clock is now autoNextDelayMsCorrect+1500+250 = 3250 ≥ 3200 → the fallback
    // fired; the beat (650ms) keeps the question in place — the note is LIVE
    expect(screen.getByText('صوت در دسترس نیست')).toBeTruthy();
    expect(screen.queryByRole('radio', { name: /«او»/ })).toBeNull();
    // the replay control stays available during the beat
    expect(screen.getByRole('button', { name: /پخش تلفظ درست/ })).toBeTruthy();

    // the short beat elapses → the flow advances right there — never locked
    await act(async () => {
      await vi.advanceTimersByTimeAsync(EXPERIENCE.autoNextAudioBeatMs + 200);
    });
    expect(screen.getByRole('radio', { name: /«او»/ })).toBeTruthy();
  });
});
