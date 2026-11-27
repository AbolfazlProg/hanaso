// @vitest-environment jsdom
/**
 * Owner order 2026-11-21 (amended 2026-11-23 §۴ — JOURNEY-FIX) — the regression
 * contract of the inline conversation:
 *
 *  1) «فصل دوم قابل پیدا کردن و انتخاب» — the PUBLISHED-chapter catalog:
 *     every published chapter listed in course order with its honest state;
 *     a locked chapter shows its prerequisite as the REASON (never bypassed).
 *  2) «مکالمه درون درس» — the inline anchor dialogue: the first lesson of a
 *     chapter opens with the conversation itself on screen (the grouped
 *     [scene → dialogue-player] section) — NO button, NO separate dialogue
 *     page hop; advancing continues the SAME lesson.
 *     SUBTITLE POLICY (2026-11-23 order «زیرنویس از اولین پخش مکالمه»): the
 *     anchor's FIRST listen starts with the Persian subtitle OFF and PINNED
 *     off — even a stored «روشن» device default cannot pre-load the text onto
 *     the first listening («شکاف دانستن»); the TEACHING replays keep the ON
 *     default; the mid-playback toggle remains available in both.
 *  3) «دیالوگ فعال به کف باکس نچسبد» — the transcript comfort band: the pure
 *     scroll math pins the active line at the TOP-THIRD of the transcript
 *     viewport (near the character stage), never at the bottom edge.
 */
import { cleanup } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import { DialogueScene, comfortScrollTarget, COMFORT_ANCHOR_RATIO } from '@/app/poc/dialogue/dialogue-scene';
import { InlineDialoguePlayer } from '@/components/curriculum/inline-dialogue-player';
import { StationRunner } from '@/components/curriculum/station-runner';
import { JourneyHome } from '@/components/curriculum/journey-home';
import { getChapter } from '@/modules/curriculum/content';
import { listPublishedChapterCatalog } from '@/modules/curriculum/server';
import { getChapterProgressStore } from '@/lib/poc/stores';
import { POC_DEFAULT_USER_ID } from '@/lib/poc/principal';
import { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
import { toClientStation, toClientExercise } from '@/modules/curriculum';
import { fa } from '@/messages/fa';
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

/* ------------------------------------------------------------------ 3 — the comfort band math */

describe('comfortScrollTarget — the active line NEVER glued to the transcript bottom', () => {
  // a 300px-tall transcript viewport sitting 100px down the page
  const container = (over: Partial<{ scrollTop: number; scrollHeight: number; clientHeight: number }>) => ({
    top: 100,
    height: 300,
    scrollTop: 0,
    scrollHeight: 3000,
    clientHeight: 300,
    ...over,
  });

  it('early lines at the natural top are NOT scrolled (no jitter at the start)', () => {
    // line 1 sits at the viewport's own top (100) — the comfort band starts at
    // 100 + 300*0.34 = 202; the line is ABOVE the band → the move clamps to 0.
    expect(comfortScrollTarget(container({}), { top: 100 })).toBeNull();
  });

  it('a mid-dialogue line is pinned at the TOP-THIRD of the viewport, not the bottom edge', () => {
    // the active line's top would render at 400 — the OLD bottom-edge math kept
    // it at the bottom (≈392); the comfort band scrolls it up to ~34% height.
    const target = comfortScrollTarget(container({}), { top: 400 });
    expect(target).not.toBeNull();
    expect(target).toBe(400 - (100 + 300 * COMFORT_ANCHOR_RATIO)); // = 198
    // the resulting visual position: line top lands at 34% of the viewport
    // height from the container's top edge (202), NOT at its bottom edge.
    const lineTopAfter = 400 - target!;
    expect(lineTopAfter).toBeCloseTo(100 + 300 * COMFORT_ANCHOR_RATIO, 1);
    expect(lineTopAfter).toBeLessThan(100 + 300 * 0.5); // upper half — near the stage
  });

  it('the last lines clamp to the maximal scroll (the content end), never past it', () => {
    const c = container({ scrollTop: 2600, scrollHeight: 3000, clientHeight: 300 });
    const target = comfortScrollTarget(c, { top: 100 + 300 * COMFORT_ANCHOR_RATIO + 60 });
    expect(target).not.toBeNull();
    expect(target).toBeLessThanOrEqual(3000 - 300); // ≤ maxScroll
  });

  it('a line already inside the comfort band is not re-scrolled (no fighting)', () => {
    expect(comfortScrollTarget(container({}), { top: 100 + 300 * COMFORT_ANCHOR_RATIO + 2 })).toBeNull();
  });
});

/* ------------------------------------------------------------- 2 — the subtitle contract */

const fixture = loadDialogueBundle('first-meeting-01');

describe('DialogueScene — subtitle defaults (2026-11-23 order: first listen OFF+PINNED, teaching ON)', () => {
  it('the TEACHING stage (subtitleDefaultOn) starts with the Persian subtitle visible', () => {
    const m = renderToStaticMarkup(
      <DialogueScene bundle={fixture} dialogueSlug="first-meeting-01" embedded subtitleDefaultOn />,
    );
    // line 1's Persian gloss renders in the initial state (subtitles ON)
    expect(m).toContain(fixture.dialogue.lines[0]!.fa);
    expect(m).toContain('زیرنویس فارسی: روشن');
  });

  it('the default player stays comprehension-first (subtitle OFF until toggled)', () => {
    const m = renderToStaticMarkup(<DialogueScene bundle={fixture} dialogueSlug="first-meeting-01" />);
    expect(m).toContain('زیرنویس فارسی: خاموش');
  });

  it('the FIRST LISTEN (subtitlePinned) stays text-free even against a stored «روشن» device default', () => {
    // JOURNEY-FIX 2026-11-23 §۴: a stored ON default must NOT pre-load the
    // subtitle onto the anchor's first full-conversation listen. The gloss
    // SPAN stays absent (the play-button aria-labels carry no translation).
    window.localStorage.setItem('hanaso.prefs.subtitleFa', 'on');
    const m = renderToStaticMarkup(
      <DialogueScene bundle={fixture} dialogueSlug="first-meeting-01" embedded subtitlePinned />,
    );
    expect(m).toContain('زیرنویس فارسی: خاموش');
    expect(m).not.toContain(`<span class="text-body text-ink-soft">${fixture.dialogue.lines[0]!.fa}</span>`);
    expect(m).not.toContain(`— ${fixture.dialogue.lines[0]!.fa}`);
  });

  it('the stored «خاموش» setting cannot leave the teaching stage unsubtitled — the ON default wins', () => {
    // the device-default seeding effect reads readSubtitleDefault() — with
    // subtitleDefaultOn the initial state is already ON and the seeding is
    // skipped: a stored OFF simply never applies.
    window.localStorage.setItem('hanaso.prefs.subtitleFa', 'off');
    const m = renderToStaticMarkup(
      <DialogueScene bundle={fixture} dialogueSlug="first-meeting-01" embedded subtitleDefaultOn />,
    );
    expect(m).toContain('زیرنویس فارسی: روشن');
  });
});

/* --------------------------------------------------- 2 — the inline player markup */

describe('InlineDialoguePlayer — the dialogue section renders INLINE (no page hop)', () => {
  const station = getChapter('first-meeting-01')!.stations.find((s) => s.slug === 'stn-fm01-01-anchor')!;

  it('shows the scene intro + section title + prediction + the player — and NO link to a separate dialogue page', () => {
    const strippedBlock = toClientStation(station).blocks.find((b) => b.kind === 'dialogue-player')! as never;
    const m = renderToStaticMarkup(
      <InlineDialoguePlayer
        chapterSlug="first-meeting-01"
        stationSlug="stn-fm01-01-anchor"
        scene={{ titleFa: 'کافه، بعدازظهر', bodyFa: 'میکی دوستش سورا را برای اولین بار به کافه می‌آورد.' }}
        block={strippedBlock}
        bundle={{
          dialogueSlug: 'first-meeting-01',
          dialogue: fixture.dialogue,
          characters: fixture.characters,
          audio: fixture.audio,
        }}
      />,
    );
    // the scene intro + the section identity
    expect(m).toContain('کافه، بعدازظهر');
    expect(m).toContain(fa.curriculum.dialogueSectionTitle);
    expect(m).toContain(fa.curriculum.dialogueInlineNote);
    // the multi-speaker player itself is inline
    expect(m).toContain('poc-scene-transcript');
    expect(m).toContain('aria-label="خطوط مکالمه"');
    // the TEACHING default (firstListen=false) keeps the subtitle ON
    expect(m).toContain('زیرنویس فارسی: روشن');
    // NO navigation to a separate dialogue page — the legacy hop is gone
    expect(m).not.toContain('/dialogue');
    expect(m).not.toContain(fa.curriculum.dialogueGoToListen);
    // LESSON-UX PART1: NO in-player finish CTA (the walk’s «ادامه» is the one
    // forward action) and NO engine/voice-production meta text for the learner
    expect(m).not.toContain('پایان مشاهده');
    expect(m).not.toContain('VOICEVOX');
    expect(m).not.toContain('موتور');
  });

  it('the ANCHOR first listen (firstListen) starts text-free — the subtitle is OFF and the Persian glosses hidden', () => {
    // JOURNEY-FIX 2026-11-23 §۴: the anchor station's inline dialogue is the
    // chapter's FIRST full-conversation listen — pure listening.
    const strippedBlock = toClientStation(station).blocks.find((b) => b.kind === 'dialogue-player')! as never;
    const m = renderToStaticMarkup(
      <InlineDialoguePlayer
        chapterSlug="first-meeting-01"
        stationSlug="stn-fm01-01-anchor"
        scene={{ titleFa: 'کافه، بعدازظهر', bodyFa: 'میکی دوستش سورا را برای اولین بار به کافهٔ یامادا می‌آورد.' }}
        block={strippedBlock}
        bundle={{
          dialogueSlug: 'first-meeting-01',
          dialogue: fixture.dialogue,
          characters: fixture.characters,
          audio: fixture.audio,
        }}
        firstListen
      />,
    );
    expect(m).toContain('زیرنویس فارسی: خاموش');
    expect(m).not.toContain(`<span class="text-body text-ink-soft">${fixture.dialogue.lines[0]!.fa}</span>`);
    expect(m).not.toContain(`— ${fixture.dialogue.lines[0]!.fa}`);
  });
});

/* ------------------------------------------- 2 — the walk: the grouped first section */

describe('StationRunner — the anchor station walks the dialogue INLINE', () => {
  const chapter = getChapter('first-meeting-01') as Chapter;
  const station = chapter.stations.find((s) => s.slug === 'stn-fm01-01-anchor')!;
  // the comprehension-check block's gist exercises (the simple dialogue-comprehension
  // questions that follow the dialogue — the subtitle-free check stage)
  const checkBlock = station.blocks.find((b) => b.kind === 'exercise') as { exerciseIds: string[] };
  const clientExercises: Record<string, ReturnType<typeof toClientExercise>> = {};
  for (const id of checkBlock.exerciseIds) {
    const ex = chapter.exercises[id];
    if (ex) clientExercises[id] = toClientExercise(ex);
  }

  beforeEach(() => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: { state: { status: 'in_progress', currentBlock: null } } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  function renderAnchor() {
    return render(
      <StationRunner
        chapterSlug="first-meeting-01"
        station={toClientStation(station)}
        chapter={{ words: chapter.words, expressions: chapter.expressions }}
        mapHref="/learn/first-meeting-01/journey?s=unit-02-1-saijo-no-aisatsu"
        clientExercises={clientExercises}
        dialogue={{ lines: [], speakers: {} }}
        dialogueScene={{
          dialogueSlug: 'first-meeting-01',
          dialogue: fixture.dialogue,
          characters: fixture.characters,
          audio: fixture.audio,
        }}
        audioByLine={{}}
        audioAvailable={false}
        /* B2-REBUILD §E1: the first-listen treatment (subtitle OFF + pinned)
         * is now a SERVER-COMPUTED prop — true ONLY for the chapter's FIRST
         * anchor (stn-fm01-01-anchor here); the unit-2 reconnect anchor is a
         * teaching replay → subtitle ON. The page passes exactly this value
         * for station 01, so the walk below pins the real wiring. */
        dialogueFirstListen
      />,
    );
  }

  it(
    'lesson start: the conversation is ON SCREEN as the first real section — no dialogue-opening button',
    { timeout: 30000 },
    async () => {
      renderAnchor();
      // the player + its transcript render immediately (the grouped [scene → dialogue] step)
      await waitFor(() => {
        expect(screen.getByLabelText('خطوط مکالمه')).toBeTruthy();
      });
      // the legacy hop block (a link + its copy) is GONE
      expect(screen.queryByText(fa.curriculum.dialogueGoToListen)).toBeNull();
      // the character stage is present — the visual anchor of the section
      expect(document.querySelectorAll('[data-hnsp-scene-order]').length).toBeGreaterThan(0);
      // JOURNEY-FIX 2026-11-23 §۴: the anchor's FIRST listen starts text-free —
      // the Persian subtitle is OFF (the toggle remains available mid-playback)
      expect(screen.getByRole('button', { name: /زیرنویس فارسی: خاموش/ })).toBeTruthy();
    },
  );

  it(
    'after the dialogue section the walk continues in the SAME lesson — the embedded dialogue block is skipped',
    { timeout: 30000 },
    async () => {
      renderAnchor();
      await waitFor(() => {
        expect(screen.getByLabelText('خطوط مکالمه')).toBeTruthy();
      });
      const forward = screen.queryByRole('button', { name: /^ادامه$/ });
      expect(forward).toBeTruthy();
      fireEvent.click(forward!);
      // lands on the comprehension-check block (the gist exercise session) —
      // step 2, NOT the now-embedded dialogue block (old step 1)
      await waitFor(() => {
        expect(screen.queryByLabelText('خطوط مکالمه')).toBeNull();
      });
      // the check stage: the transcript (subtitles) are GONE — the simple
      // dialogue-comprehension questions ARE the stage (the first gist prompt)
      expect(screen.queryByText(fa.curriculum.dialogueGoToListen)).toBeNull();
      await waitFor(() => {
        expect(screen.getByText('کل مکالمه را دیدی — این داستان کجا می‌گذرد؟')).toBeTruthy();
      });
    },
  );

  it(
    'LESSON-UX PART1: «مرحلهٔ قبل» from the block AFTER the pair returns to the grouped scene step — the conversation is NOT rendered twice',
    { timeout: 30000 },
    async () => {
      // owner report «اولین درس فصل اول مکالمه را دو بار نشان می‌دهد»: the old
      // plain step-1 back-navigation parked the walk on the EMBEDDED dialogue
      // block, re-rendering a second standalone player right under the first
      // listen. Back-navigation is pair-aware now — from the gist check the
      // learner returns to the ONE grouped section (scene + player).
      renderAnchor();
      await waitFor(() => {
        expect(screen.getByLabelText('خطوط مکالمه')).toBeTruthy();
      });
      fireEvent.click(screen.getByRole('button', { name: /^ادامه$/ }));
      await waitFor(() => {
        expect(screen.queryByLabelText('خطوط مکالمه')).toBeNull();
      });
      fireEvent.click(screen.getByRole('button', { name: fa.curriculum.prevBlock }));
      await waitFor(() => {
        expect(screen.getByLabelText('خطوط مکالمه')).toBeTruthy();
      });
      // exactly ONE transcript on the page — never two players stacked
      expect(screen.queryAllByLabelText('خطوط مکالمه')).toHaveLength(1);
      // and the scene intro of the grouped pair is back (the pair head, not a
      // bare duplicated player)
      await waitFor(() => {
        expect(screen.getByText('کافه، بعدازظهر')).toBeTruthy();
      });
    },
  );

  it(
    'LESSON-UX PART1: the progress rail counts the PARKABLE sections — the embedded dialogue half gets no segment of its own',
    { timeout: 30000 },
    async () => {
      // stn-fm01-01-anchor authors [scene, dialogue-player, exercise]: the
      // learner walks TWO sections, and the counter says ۱ / ۲ → ۲ / ۲ — never
      // a phantom «۲ / ۳» step for the embedded conversation.
      renderAnchor();
      await waitFor(() => {
        expect(screen.getByLabelText('خطوط مکالمه')).toBeTruthy();
      });
      expect(document.body.textContent).toContain('۱ / ۲');
      fireEvent.click(screen.getByRole('button', { name: /^ادامه$/ }));
      await waitFor(() => {
        expect(screen.queryByLabelText('خطوط مکالمه')).toBeNull();
      });
      expect(document.body.textContent).toContain('۲ / ۲');
    },
  );

  it('LESSON-UX PART1: the in-player finish CTA is GONE from the product walk — «ادامه» is the one forward action', async () => {
    // owner order 2026-11-26 «دکمه‌ای که زیرش دکمهٔ ادامه هست بی‌فایده است»:
    // the player itself renders NO «پایان مشاهده» CTA (and no watch-gate
    // caption) — only the walk’s own «ادامه» below the section.
    renderAnchor();
    await waitFor(() => {
      expect(screen.getByLabelText('خطوط مکالمه')).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: 'پایان مشاهده' })).toBeNull();
    expect(screen.queryByText('برای فعال‌شدن این دکمه، مکالمه را تا خط آخر ببین.')).toBeNull();
    expect(screen.queryByRole('button', { name: /^ادامه$/ })).toBeTruthy();
  });

  it(
    'B2 §E1: the unit-2 RECONNECT anchor is a teaching replay — WITHOUT the first-listen prop the subtitle stays ON',
    { timeout: 30000 },
    async () => {
      /* B2-REBUILD §E1 (2026-11-27): the «شکاف دانستن» pinned-off subtitle
       * belongs to the chapter's FIRST anchor ONLY. The old heuristic
       * (`station.type === 'anchor'`) wrongly caught stn-fm01-10-reconnect —
       * the unit-2 teaching replay whose gist checks need the subtitle ON.
       * The prop is absent here exactly as the page computes it for station
       * 10 (isChapterFirstAnchor=false): the runner's safe default must be
       * the REPLAY treatment, never the pinned-off first listen. */
      const reconnect = chapter.stations.find((s) => s.slug === 'stn-fm01-10-reconnect')!;
      const reconnectCheck = reconnect.blocks.find((b) => b.kind === 'exercise') as { exerciseIds: string[] };
      const reconnectExercises: Record<string, ReturnType<typeof toClientExercise>> = {};
      for (const id of reconnectCheck.exerciseIds) {
        const ex = chapter.exercises[id];
        if (ex) reconnectExercises[id] = toClientExercise(ex);
      }
      render(
        <StationRunner
          chapterSlug="first-meeting-01"
          station={toClientStation(reconnect)}
          chapter={{ words: chapter.words, expressions: chapter.expressions }}
          mapHref="/learn/first-meeting-01/journey"
          clientExercises={reconnectExercises}
          dialogue={{ lines: [], speakers: {} }}
          dialogueScene={{
            dialogueSlug: 'first-meeting-01',
            dialogue: fixture.dialogue,
            characters: fixture.characters,
            audio: fixture.audio,
          }}
          audioByLine={{}}
          audioAvailable={false}
        />,
      );
      await waitFor(() => {
        expect(screen.getByLabelText('خطوط مکالمه')).toBeTruthy();
      });
      // the teaching-replay contract: the Persian subtitle is ON from the start
      expect(screen.getByRole('button', { name: /زیرنویس فارسی: روشن/ })).toBeTruthy();
      expect(screen.queryByRole('button', { name: /زیرنویس فارسی: خاموش/ })).toBeNull();
    },
  );
});

/* ---------------------------------------------------------- 1 — the chapter catalog */

describe('listPublishedChapterCatalog — every published chapter, honest states', () => {
  it('lists the chapters in COURSE ORDER with statuses and lock reasons for a fresh learner', async () => {
    const rows = await listPublishedChapterCatalog(POC_DEFAULT_USER_ID);
    expect(rows.map((r) => r.slug)).toEqual(['kana-foundation-01', 'kana-expansion-01', 'first-meeting-01']);
    // chapter 2 (first-meeting-01) IS listed — and honestly LOCKED with the reason
    const fm = rows.find((r) => r.slug === 'first-meeting-01')!;
    expect(fm.locked).toBe(true);
    expect(fm.prerequisiteTitleFa).toBe(getChapter('kana-foundation-01')!.titleFa);
    expect(fm.status).toBe('not_started');
    // the first chapter is open; the expansion chapter carries the kana prereq too
    expect(rows.find((r) => r.slug === 'kana-foundation-01')!.locked).toBe(false);
    expect(rows.find((r) => r.slug === 'kana-expansion-01')!.prerequisiteTitleFa).toBe(
      getChapter('kana-foundation-01')!.titleFa,
    );
  });

  it('unlocking: passing the kana gate flips chapter 2 to selectable (locked=false, reason cleared)', async () => {
    const store = getChapterProgressStore();
    await store.upsert(POC_DEFAULT_USER_ID, 'kana-foundation-01', {
      status: 'understood',
      bestWeighted: 0.95,
      bestMeasures: null,
      remediationCount: 0,
    });
    const rows = await listPublishedChapterCatalog(POC_DEFAULT_USER_ID);
    const fm = rows.find((r) => r.slug === 'first-meeting-01')!;
    expect(fm.locked).toBe(false);
    expect(fm.prerequisiteTitleFa).toBeNull();
    // and the understood prerequisite shows its own honest state
    expect(rows.find((r) => r.slug === 'kana-foundation-01')!.status).toBe('understood');
  });
});

describe('JourneyHome — the catalog section (chapter 2 selectable, lock reason visible)', () => {
  const base = {
    chapterSlug: 'kana-foundation-01',
    chapterTitleFa: 'فصل ۰۱ — کانا',
    chapterCanDoFa: 'کانا را می‌خواند',
    chapterEstMinutes: 300,
    levelCode: 'L1',
    isReview: false,
    chapterUnderstood: false,
    coreCompleted: 2,
    coreTotal: 36,
    corePathComplete: false,
    nextStationSlug: 'stn-kana-h1',
    nextStationTitleFa: 'ردیف あ',
    sections: [] as never[],
    activeSectionIndex: 0,
    reveal: { archive: [], teaser: null },
  };

  it('renders every row: the active chapter anchored, others selectable links, locked ones show the reason', () => {
    const m = renderToStaticMarkup(
      <JourneyHome
        {...base}
        catalog={[
          {
            slug: 'kana-foundation-01',
            titleFa: 'فصل ۰۱ — کانا',
            levelCode: 'L1',
            status: 'in_progress',
            locked: false,
            prerequisiteTitleFa: null,
          },
          {
            slug: 'kana-expansion-01',
            titleFa: 'فصل ۰۱+ — بسطِ نوشتار',
            levelCode: 'L1',
            status: 'not_started',
            locked: true,
            prerequisiteTitleFa: 'فصل ۰۱ — کانا',
          },
          {
            slug: 'first-meeting-01',
            titleFa: 'فصل ۰۲ — اولین مکالمه',
            levelCode: 'L2',
            status: 'not_started',
            locked: true,
            prerequisiteTitleFa: 'فصل ۰۱ — کانا',
          },
        ]}
      />,
    );
    // the section itself
    expect(m).toContain(fa.curriculum.chapterCatalogTitle);
    expect(m).toContain(fa.curriculum.chapterCatalogHint);
    // chapter 2 is LISTED and SELECTABLE (a real link — the lock notice is the destination)
    expect(m).toContain('href="/learn/first-meeting-01/journey"');
    expect(m).toContain('فصل ۰۲ — اولین مکالمه');
    // the lock reason is VISIBLE on the row
    expect(m).toContain(fa.curriculum.chapterCatalogLockedReason('فصل ۰۱ — کانا'));
    // the active chapter row is the anchor (not a self-link)
    expect(m).toContain(fa.curriculum.chapterCatalogActiveChip);
    // the locked chip renders
    expect(m).toContain(fa.curriculum.chapterCatalogLockedChip);
  });

  it('an unlocked chapter 2 renders the ready chip (selectable, no reason line)', () => {
    const m = renderToStaticMarkup(
      <JourneyHome
        {...base}
        catalog={[
          {
            slug: 'kana-foundation-01',
            titleFa: 'فصل ۰۱ — کانا',
            levelCode: 'L1',
            status: 'understood',
            locked: false,
            prerequisiteTitleFa: null,
          },
          {
            slug: 'first-meeting-01',
            titleFa: 'فصل ۰۲ — اولین مکالمه',
            levelCode: 'L2',
            status: 'not_started',
            locked: false,
            prerequisiteTitleFa: null,
          },
        ]}
      />,
    );
    expect(m).toContain(fa.curriculum.chapterCatalogReadyChip);
    expect(m).not.toContain(fa.curriculum.chapterCatalogLockedReason('فصل ۰۱ — کانا'));
  });
});
