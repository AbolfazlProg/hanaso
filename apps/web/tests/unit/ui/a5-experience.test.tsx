// @vitest-environment jsdom
/**
 * HANASO — TASK-LEARNING-08 Addendum-5 experience tests.
 *
 * §1 — «شروع تمرین نوشتن» behavior: the page soft-scrolls the writing canvas
 *      fully into view and the practice view FOCUSES (the intro-only cards
 *      collapse into folds — never deleted; the intro/ready stages keep the
 *      full view).
 * §3 — audio presence in kana questions: a LISTENING question auto-plays its
 *      sound at question start + a replay control; a RECALL question offers
 *      the prompt's own sound (no answer leak); a RECOGNITION question never
 *      offers sound before answering (the kana sound IS the answer); after
 *      any answered attempt the correct pronunciation is hearable.
 * §6 — the example card: the word is the hero, the Persian reading is big and
 *      separated from the meaning, and authored pronunciation guides render.
 */
import { describe, expect, it, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as React from 'react';

import { KanaCard } from '@/components/curriculum/kana-card';
import { ExerciseSession } from '@/components/curriculum/exercise-session';
import { StationRunner } from '@/components/curriculum/station-runner';
import { getChapter } from '@/modules/curriculum/content';
import { toClientStation } from '@/modules/curriculum';
import { toClientExercise } from '@/modules/curriculum/grading';
import type { ClientExercise } from '@/modules/curriculum/grading';
import type { Chapter, KanaItem, Station } from '@/modules/curriculum/types';
import { getCachedAudio } from '@/modules/audio/client-cache';

// §3 — the shared LRU cache is mocked (jsdom has no real media playback); the
// autoplay effect's preload call + the control markup are what the contract
// needs here (real playback behavior is covered by the live verification).
vi.mock('@/modules/audio/client-cache', () => ({
  preloadAudio: vi.fn(() => Promise.resolve(null)),
  getCachedAudio: vi.fn(() => null),
  reportPlaybackError: vi.fn(),
  resetAudioCacheForTests: vi.fn(),
}));

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), forward: vi.fn() }),
}));

const webRoot = join(__dirname, '..', '..', '..');
const INDEX = readFileSync(join(webRoot, 'public', 'writing-data', 'index.json'), 'utf8');
const A_CHAR = readFileSync(join(webRoot, 'public', 'writing-data', 'あ.json'), 'utf8');

const RECT = { left: 0, top: 0, width: 512, height: 512, x: 0, y: 0, right: 512, bottom: 512, toJSON: () => ({}) };

let rectSpy: ReturnType<typeof vi.spyOn>;
let scrollToSpy: ReturnType<typeof vi.spyOn>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeAll(() => {
  rectSpy = vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue(RECT as DOMRect);
});

afterAll(() => {
  rectSpy.mockRestore();
});

beforeEach(() => {
  scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  fetchMock = vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes('index.json')) return new Response(INDEX, { status: 200 });
    // the browser URL-encodes the glyph — handle both forms
    if (u.includes('%E3%81%82') || u.endsWith('/あ.json')) return new Response(A_CHAR, { status: 200 });
    return new Response('{}', { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  scrollToSpy.mockRestore();
  vi.useRealTimers();
});

const KANA_A: KanaItem = {
  kanaId: 'hira-a',
  glyph: 'あ',
  romaji: 'a',
  hostWord: { word: 'あい', meaningFa: 'عشق' },
} as unknown as KanaItem;

/* ------------------------------------------------------------------ §1 */

describe('Addendum-5 §1 — «شروع تمرین نوشتن» behavior', () => {
  it('clicking the CTA: stage→guided + the page SOFT-SCROLLS the canvas into view (no route)', async () => {
    const { container } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} wordAudioUrls={null} initialProgress={{ stage: 'ready' }} />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-ready-cta]')).not.toBeNull();
    });
    fireEvent.click(container.querySelector('[data-ready-cta]')!);
    // the mode changes to Guided Writing in the SAME card (no route change)
    await waitFor(() => {
      expect(container.querySelector('[data-kana-stage]')?.getAttribute('data-kana-stage')).toBe('guided');
    });
    // …and the canvas is scrolled fully into view (smooth, header-aware)
    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalled();
      const call = scrollToSpy.mock.calls[0]![0] as { behavior?: string };
      expect(call?.behavior).toBe('smooth');
    });
  });

  it('the practice view FOCUSES: intro-only cards collapse into folds (never deleted)', async () => {
    const { container } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} wordAudioUrls={null} initialProgress={{ stage: 'ready' }} />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-ready-cta]')).not.toBeNull();
    });
    // ready = the FULL view: no folds, the reading card open
    expect(container.querySelector('[data-intro-fold]')).toBeNull();
    expect(container.querySelector('[data-reading-card]')).not.toBeNull();
    fireEvent.click(container.querySelector('[data-ready-cta]')!);
    await waitFor(() => {
      expect(container.querySelector('[data-kana-stage]')?.getAttribute('data-kana-stage')).toBe('guided');
    });
    // guided = the FOCUSED view (TASK-LEARNING-09: ONE consolidated info fold
    // — «تلفظ، یادسپار و جفت مشابه»): the reading/mnemonic/pair cards live
    // INSIDE the fold — the data is still there (nothing deleted), one tap
    // reopens it
    expect(container.querySelector('[data-intro-fold="info"]')).not.toBeNull();
    expect(container.querySelector('[data-intro-fold="info"]')!.querySelector('[data-reading-card]')).not.toBeNull();
    expect(container.querySelector('[data-intro-fold="info"]')!.querySelector('[data-mnemonic-card]')).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ §3 */

const listeningEx: ClientExercise = {
  id: 'ex-a5-lis-1',
  type: 'kana-listening',
  targetSkill: 'vocab',
  promptFa: 'به صدای پخش‌شده گوش کن — کدام کانا این صدا را دارد؟',
  options: [
    { id: 'a', label: 'あ' },
    { id: 'b', label: 'お' },
    { id: 'c', label: 'い' },
  ],
  promptAudio: { opus: '/audio/kana/kn-hira-a.opus', m4a: '/audio/kana/kn-hira-a.m4a' },
};

const recallEx: ClientExercise = {
  id: 'ex-a5-rcl-1',
  type: 'kana-recall',
  targetSkill: 'vocab',
  promptFa: 'کانای «آ» کدام است؟',
  options: [
    { id: 'a', label: 'あ' },
    { id: 'b', label: 'お' },
  ],
  promptAudio: { opus: '/audio/kana/kn-hira-a.opus', m4a: '/audio/kana/kn-hira-a.m4a' },
};

const recognitionEx: ClientExercise = {
  id: 'ex-a5-rec-1',
  type: 'kana-recognition',
  targetSkill: 'vocab',
  promptFa: 'این کانا چه صدایی دارد؟',
  promptJa: 'あ',
  options: [
    { id: 'a', label: '«آ»' },
    { id: 'b', label: '«اُ»' },
  ],
  // NOTE: no promptAudio — the kana sound IS the answer (leak guard)
};

describe('Addendum-5 §3 — audio presence in kana questions', () => {
  it('a LISTENING question renders the replay control and AUTO-PLAYS its sound at question start', async () => {
    const { preloadAudio } = await import('@/modules/audio/client-cache');
    const { container } = render(
      <ExerciseSession
        chapterSlug="kana-foundation-01"
        stationSlug="stn-x"
        exercises={[listeningEx]}
        audioByLine={{}}
        audioAvailable
      />,
    );
    // the replay control is visible with the auto-play note
    expect(container.querySelector('[data-listen-question]')).not.toBeNull();
    expect(container.querySelector('[data-question-audio="replay"]')).not.toBeNull();
    expect(container.textContent).toContain('به‌صورت خودکار پخش می‌شود');
    // the autoplay effect warms the shared cache with the question's sound
    await waitFor(() => {
      expect(preloadAudio).toHaveBeenCalledWith('/audio/kana/kn-hira-a.opus');
    });
  });

  it('a RECALL question offers the PROMPT sound before answering (no answer leak)', () => {
    const { container } = render(
      <ExerciseSession
        chapterSlug="kana-foundation-01"
        stationSlug="stn-x"
        exercises={[recallEx]}
        audioByLine={{}}
        audioAvailable
      />,
    );
    expect(container.querySelector('[data-recall-sound]')).not.toBeNull();
    expect(container.querySelector('[data-question-audio="prompt"]')).not.toBeNull();
  });

  it('a RECOGNITION question NEVER offers sound before answering (the kana sound IS the answer)', () => {
    const { container } = render(
      <ExerciseSession
        chapterSlug="kana-foundation-01"
        stationSlug="stn-x"
        exercises={[recognitionEx]}
        audioByLine={{}}
        audioAvailable
      />,
    );
    expect(container.querySelector('[data-question-audio]')).toBeNull();
    expect(container.querySelector('[data-listen-question]')).toBeNull();
    expect(container.querySelector('[data-recall-sound]')).toBeNull();
  });

  it('after answering, the correct pronunciation is hearable (server-attached correctAudio)', async () => {
    fetchMock.mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/api/curriculum/station') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            data: {
              outcome: {
                correct: true,
                level: 0,
                feedbackFa: 'درست!',
                correctAudio: { what: 'あ', opus: '/audio/kana/kn-hira-a.opus', m4a: '/audio/kana/kn-hira-a.m4a' },
              },
            },
          }),
          { status: 200 },
        );
      }
      if (u.includes('index.json')) return new Response(INDEX, { status: 200 });
      return new Response('{}', { status: 200 });
    });
    const { container } = render(
      <ExerciseSession
        chapterSlug="kana-foundation-01"
        stationSlug="stn-x"
        exercises={[recognitionEx]}
        audioByLine={{}}
        audioAvailable
      />,
    );
    // TL-10 §3/§5: the healthy path needs a LIVE element in the cache (the
    // file-wide mock returns null = "unavailable" → the honest note replaces
    // the label). Give this question a working element so the ORIGINAL a5
    // contract keeps its meaning: the control + its label, plus the new
    // TL-10 auto-play (no extra click to hear the correct pronunciation).
    const fakeEl = {
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      onended: null,
      onerror: null,
      currentTime: 0,
      playbackRate: 1,
      preservesPitch: true,
      src: '',
    } as unknown as HTMLAudioElement;
    const getCached = vi.mocked(getCachedAudio);
    getCached.mockImplementation(
      (url: string) => (url === '/audio/kana/kn-hira-a.opus' ? fakeEl : null) as HTMLAudioElement | null,
    );
    try {
      // answer the question
      fireEvent.click(container.querySelector('button[role="radio"]')!);
      fireEvent.click(container.querySelector('button:not([role="radio"])')!);
      await waitFor(() => {
        expect(container.querySelector('[data-question-audio="correct"]')).not.toBeNull();
        expect(container.textContent).toContain('شنیدن تلفظ درست');
      });
      // TL-10: the sound AUTO-PLAYED with the outcome — hearing the correct
      // pronunciation took NO extra click
      expect(fakeEl.play).toHaveBeenCalledTimes(1);
    } finally {
      getCached.mockImplementation(() => null);
    }
  });
});

/* ------------------------------------------------------------------ §6 */

describe('Addendum-5 §6 — example card readability + pronunciation guides', () => {
  /** Render the REAL stn-kana-h1 example-set block (walk snapshot seeded to it). */
  function renderExampleBlock() {
    const chapter = getChapter('kana-foundation-01') as Chapter;
    const station = chapter.stations.find((s) => s.slug === 'stn-kana-h1') as Station;
    const clientExercises: Record<string, ClientExercise> = {};
    for (const block of station.blocks) {
      if (block.kind !== 'exercise') continue;
      for (const id of block.exerciseIds) {
        const ex = (chapter.exercises as Record<string, never>)[id];
        if (ex) clientExercises[id] = toClientExercise(ex);
      }
    }
    // seed the walk snapshot straight to the example-set block (its index is
    // found dynamically — the Addendum-5 listening blocks shifted the order)
    const exampleStep = station.blocks.findIndex((b) => b.kind === 'example-set');
    expect(exampleStep, 'h1 has an example-set block').toBeGreaterThan(0);
    window.localStorage.setItem(
      'hanaso.walk.v1.11111111-1111-4111-8111-111111111111.kana-foundation-01.stn-kana-h1',
      JSON.stringify({
        v: 1,
        chapterSlug: 'kana-foundation-01',
        stationSlug: 'stn-kana-h1',
        stepIndex: exampleStep,
        blockResults: {},
        exerciseProgress: {},
        kanaCardStages: {},
        sessionScore: null,
        updatedAt: Date.now(),
      }),
    );
    window.localStorage.setItem('hanaso.learnerId.v1', '11111111-1111-4111-8111-111111111111');
    return render(
      <StationRunner
        chapterSlug="kana-foundation-01"
        station={toClientStation(station)}
        chapter={{ words: chapter.words, expressions: chapter.expressions }}
        clientExercises={clientExercises}
        dialogue={{ lines: [], speakers: {} }}
        audioByLine={{}}
        audioAvailable={false}
        exampleAudioByWord={{
          え: { opus: '/audio/hostwords/e.opus', m4a: '/audio/hostwords/e.m4a' },
          うえ: { opus: '/audio/hostwords/ue.opus', m4a: '/audio/hostwords/ue.m4a' },
        }}
      />,
    );
  }

  it('the word is the hero, the reading is big+separated, and authored pron guides render', async () => {
    const { container } = renderExampleBlock();
    const card = await waitFor(() => {
      const c = container.querySelector('[data-example-card]');
      expect(c, 'example card rendered').not.toBeNull();
      return c as HTMLElement;
    });
    // hero Japanese word (clamp-sized JaBlock) + the play control beside it
    expect(card.querySelector('.ja-block')!.className).toContain('text-[clamp(1.75rem,7vw,2.35rem)]');
    expect(card.querySelector('[data-example-audio]')).not.toBeNull();
    // the Persian reading: BIG (text-h3) + bold + separated from the meaning
    const reading = card.querySelector('p.text-h3.font-bold');
    expect(reading, 'big bold Persian reading').not.toBeNull();
    expect(reading!.className).toContain('border-b');
    // at least one card carries an authored pronunciation guide (うえ: the u point)
    await waitFor(() => {
      expect(container.querySelector('[data-pron-guide]')).not.toBeNull();
      expect(container.textContent).toContain('چطور تلفظ کنیم؟');
    });
  });
});
