// @vitest-environment jsdom
/**
 * HANASO — Focused-line teaching view contract (ENGINE-REFORM 2026-11-22 §۳ —
 * owner order «نمایش بخش منتخب مکالمه»).
 *
 * The wiring-level regression proof of the WHOLE-dialogue bug fix:
 *  - a grammar lesson's dialogue-player (lineTeaching, focus subset) renders
 *    ONLY the lesson's own dialogue lines — each with the speaker identity,
 *    reading, translation and its own audio control — and NEVER the whole
 *    conversation (no multi-speaker player, no other turns' translations);
 *  - the ANCHOR lesson (full focus coverage) keeps the whole-conversation
 *    player — the conversation experience is untouched.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import { StationRunner } from '@/components/curriculum/station-runner';
import { getChapter } from '@/modules/curriculum/content';
import { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
import { toClientStation, toClientExercise } from '@/modules/curriculum';
import type { Chapter } from '@/modules/curriculum/types';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn(), forward: vi.fn(), replace: vi.fn() }),
}));

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const chapter = getChapter('first-meeting-01') as Chapter;
const bundle = loadDialogueBundle('first-meeting-01');
/* the chapter-wide item labels (the station page's standard transport). */
const dialogueItemLabels: Record<string, string> = {};
for (const w of chapter.words) dialogueItemLabels[w.id] = `${w.term} — ${w.meaningFa}`;
for (const x of chapter.expressions) dialogueItemLabels[x.id] = `${x.ja} — ${x.functionFa}`;
for (const g of chapter.grammar) dialogueItemLabels[g.id] = `${g.pattern} — ${g.titleFa}`;

function renderStation(slug: string) {
  const station = chapter.stations.find((s) => s.slug === slug)!;
  const clientExercises: Record<string, ReturnType<typeof toClientExercise>> = {};
  for (const block of station.blocks) {
    if (block.kind !== 'exercise') continue;
    for (const id of block.exerciseIds) {
      const ex = chapter.exercises[id];
      if (ex) clientExercises[id] = toClientExercise(ex);
    }
  }
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify({ data: { state: { status: 'in_progress', currentBlock: null } } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return render(
    <StationRunner
      chapterSlug="first-meeting-01"
      station={toClientStation(station)}
      chapter={{ words: chapter.words, expressions: chapter.expressions }}
      clientExercises={clientExercises}
      dialogueItemLabels={dialogueItemLabels}
      dialogue={{
        lines: bundle.dialogue.lines.map((l) => ({
          id: l.id,
          tokens: l.tokens.map((t) => ({ surface: t.surface })),
          fa: l.fa,
          speaker: l.speaker,
        })),
        speakers: {},
      }}
      dialogueScene={{
        dialogueSlug: 'first-meeting-01',
        dialogue: bundle.dialogue,
        characters: bundle.characters,
        audio: bundle.audio,
      }}
      audioByLine={{}}
      audioAvailable={false}
    />,
  );
}

describe('the focused-line teaching view — the grammar lesson shows ONLY its own dialogue lines', () => {
  it(
    'stn-fm01-03 (focus L3+L6, lineTeaching) renders the focused view with exactly those two lines',
    { timeout: 30000 },
    async () => {
      renderStation('stn-fm01-03-grammar-desu');
      await waitFor(() => {
        expect(document.querySelectorAll('[data-dialogue-focus-view]').length).toBeGreaterThan(0);
      });
      // exactly the TWO focused line cards (line 3 + line 6), no others
      const cards = document.querySelectorAll('[data-dialogue-focus-line]');
      expect(cards.length).toBe(2);
      // the focused lines' translations render (the teaching material)
      expect(
        screen.getAllByText('از آشنایی‌تان خوشبختم؛ یامادا هستم. ژاپنی‌ام. یوروشیکو اونِگای‌شیماس.').length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText('بله، من چینی‌ام.').length).toBeGreaterThan(0);
      // the speakers' preserved identity renders
      expect(screen.getAllByText(/یامادا/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/سورا/).length).toBeGreaterThan(0);
    },
  );

  it(
    'the other dialogue lines NEVER render in the focused view (no whole conversation, no full player)',
    { timeout: 30000 },
    async () => {
      renderStation('stn-fm01-03-grammar-desu');
      await waitFor(() => {
        expect(document.querySelectorAll('[data-dialogue-focus-view]').length).toBeGreaterThan(0);
      });
      // NOT the whole-conversation player: the transcript control is gone
      expect(document.querySelector('[aria-label="خطوط مکالمه"]')).toBeNull();
      // and other turns' translations are NOT on the screen
      expect(screen.queryByText('سلام آقای یامادا.')).toBeNull();
      expect(screen.queryByText('خانم کیم هم چینی است؟')).toBeNull();
      expect(screen.queryByText('از کره آمده‌ام. یوروشیکو اونِگای‌شیماس.')).toBeNull();
    },
  );

  it(
    'the ANCHOR lesson keeps the whole-conversation player (the conversation experience — regression guard)',
    { timeout: 30000 },
    async () => {
      renderStation('stn-fm01-01-anchor');
      await waitFor(() => {
        expect(document.querySelector('[aria-label="خطوط مکالمه"]')).not.toBeNull();
      });
      // the focused-line view must NOT render for the anchor
      expect(document.querySelector('[data-dialogue-focus-view]')).toBeNull();
    },
  );
});

describe('DialogueFocusLines — static markup sanity (the teaching card contract)', () => {
  it('renders each line with reading + translation and never other lines', async () => {
    const { DialogueFocusLines } = await import('@/components/curriculum/dialogue-focus-lines');
    const { resolveDialogueFocus } = await import('@/modules/curriculum/dialogue-focus');
    const view = resolveDialogueFocus(
      { dialogueSlug: 'first-meeting-01', dialogue: bundle.dialogue, characters: bundle.characters },
      ['s-first-meeting-01-l3', 's-first-meeting-01-l6'],
      true,
    );
    expect(view.mode).toBe('focus');
    const m = renderToStaticMarkup(
      <DialogueFocusLines lines={view.lines} audioByLine={{}} audioAvailable={false} itemLabels={dialogueItemLabels} />,
    );
    // the section title + both lines + their romaji readings
    expect(m).toContain('خط\u200cهای آموزشی همین درس');
    for (const line of view.lines) {
      expect(m).toContain(line.fa);
      expect(m).toContain(line.reading);
    }
    // a NON-focus line's translation must not appear
    expect(m).not.toContain('سلام آقای یامادا.');
  });
});
