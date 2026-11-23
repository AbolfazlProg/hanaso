// @vitest-environment jsdom
/**
 * HANASO — KanjiWritingCard tests (SMART-RUBY 2026-11-23 §۴ — mission «اصلاح
 * بخش نوشتاری کانجی»).
 *
 * The kanji writing experience must BE the kana writing experience: the SAME
 * shared WritingCanvas/engine (no second writing system), the same staged
 * timeline (intro teaching pass → the ONE confirm → guided trace → free from
 * memory → next kanji), driven here with the REAL KanjiVG stroke data of
 * 人 (2 strokes) and 国 (8 strokes) — the exact files production serves.
 *
 * The regression this pins: the kanji deck auto-flows per character with NO
 * state leak between kanji (the 国 card starts its own intro after 人
 * completes), the per-stroke narration + progress dots render, and the
 * anchor words (the carriers, with their readings) render beside the canvas.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as React from 'react';

import { KanjiWritingCard } from '@/components/curriculum/kanji-writing-card';
import type { KanjiWritingEntry } from '@/components/curriculum/kanji-writing-card';
import { fa } from '@/messages/fa';

const faCurriculumPickChar = fa.curriculum.writingPickChar;

const webRoot = join(__dirname, '..', '..', '..');
const INDEX = readFileSync(join(webRoot, 'public', 'writing-data', 'index.json'), 'utf8');
const JIN = readFileSync(join(webRoot, 'public', 'writing-data', '人.json'), 'utf8');
const KUNI = readFileSync(join(webRoot, 'public', 'writing-data', '国.json'), 'utf8');
const JIN_DATA = JSON.parse(JIN) as { medians: number[][][] };
const KUNI_DATA = JSON.parse(KUNI) as { medians: number[][][] };

/* the real FM01 anchor facts (K3 carriers — taught before the station) */
const ENTRIES: KanjiWritingEntry[] = [
  {
    literal: '人',
    meaningFa: 'انسان، شخص',
    strokeCount: 2,
    kanjiId: 'kj-4eba',
    anchors: [
      {
        wordId: 'voc-nihonjin',
        term: '日本人',
        readingKana: 'にほんじん',
        meaningFa: 'ژاپنی (اهل ژاپن)',
        audio: null,
      },
      {
        wordId: 'voc-iranjin',
        term: 'イラン人',
        readingKana: 'イランじん',
        meaningFa: 'ایرانی',
        audio: null,
      },
    ],
  },
  {
    literal: '国',
    meaningFa: 'کشور',
    strokeCount: 8,
    kanjiId: 'kj-56fd',
    anchors: [
      {
        wordId: 'voc-chuugokujin',
        term: '中国人',
        readingKana: 'ちゅうごくじん',
        meaningFa: 'چینی',
        audio: null,
      },
    ],
  },
];

/* jsdom canvas geometry — the same mapping the walk-regression suite uses */
const RECT = { left: 0, top: 0, width: 512, height: 512, x: 0, y: 0, right: 512, bottom: 512, toJSON: () => ({}) };
const cx = (x: number) => x / 2;
const cy = (y: number) => y / 2;
let rectSpy: ReturnType<typeof vi.spyOn>;

const fetchMock = vi.fn(async (url: string | URL | Request) => {
  const u = String(url);
  if (u.includes('index.json')) return new Response(INDEX, { status: 200 });
  if (u.includes('%E4%BA%BA') || u.endsWith('/人.json')) return new Response(JIN, { status: 200 });
  if (u.includes('%E5%9B%BD') || u.endsWith('/国.json')) return new Response(KUNI, { status: 200 });
  if (u.includes('/api/curriculum/learner-ja')) return new Response('{}', { status: 200 });
  return new Response('{}', { status: 200 });
});

beforeAll(() => {
  rectSpy = vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue(RECT as DOMRect);
});

afterAll(() => {
  rectSpy.mockRestore();
});

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function drawAll(svg: Element, medians: number[][][]) {
  for (const median of medians) {
    const pts = median.map(([x = 0, y = 0]) => ({ x, y }));
    fireEvent.pointerDown(svg, { pointerId: 1, pointerType: 'mouse', clientX: cx(pts[0]!.x), clientY: cy(pts[0]!.y) });
    for (const p of pts.slice(1)) {
      fireEvent.pointerMove(svg, { pointerId: 1, pointerType: 'mouse', clientX: cx(p.x), clientY: cy(p.y) });
    }
    fireEvent.pointerUp(svg, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: cx(pts[pts.length - 1]!.x),
      clientY: cy(pts[pts.length - 1]!.y),
    });
  }
}

describe('KanjiWritingCard — kana-writing parity over the shared engine', () => {
  it('renders the staged environment: picker, identity, reading chips, anchors', async () => {
    const { container } = render(
      <KanjiWritingCard
        blockId="wp-kanji-jin-kuni"
        chapterSlug="first-meeting-01"
        stationSlug="stn-fm01-23-kanji"
        characters={ENTRIES}
      />,
    );
    expect(container.querySelector('[data-kanji-writing-block]')).toBeTruthy();
    expect(container.querySelector('[data-kj-active="人"]')).toBeTruthy();
    // the reading chips: the segments 人 consumes in its anchors (じん)
    expect(container.textContent).toContain('じん');
    // the anchor carriers with their meanings
    expect(container.textContent).toContain('ژاپنی (اهل ژاپن)');
    expect(container.textContent).toContain('ایرانی');
    // stroke count badge
    expect(container.textContent).toContain('۲ ضربه');
    // the per-stroke narration panel rides the intro teaching pass once the
    // KanjiVG data resolves (async load)
    await waitFor(() => {
      expect(container.querySelector('[data-stroke-info]')).toBeTruthy();
    });
  });

  /* KANJI-WRITE-FIX §۱/§۲ — the transport feeds ONE kanji per slide
   * (`wp-…@人`): the card is the kanji's OWN dedicated slide — no picker, and
   * completing the free write hands the walk its forward movement
   * (onWritingDone — the same #117 §8 gate semantics as the kana card). */
  it(
    'a single-kanji slide: NO picker, and the completed free write fires onWritingDone once',
    { timeout: 30000 },
    async () => {
      vi.useFakeTimers();
      const writingDone = vi.fn();
      const { container } = render(
        <KanjiWritingCard
          blockId="wp-kanji-jin-kuni@人"
          chapterSlug="first-meeting-01"
          stationSlug="stn-fm01-23-kanji"
          characters={[ENTRIES[0]!]}
          onWritingDone={writingDone}
        />,
      );
      // the slide IS the kanji's own — no character picker on a per-kanji slide
      expect(container.textContent).not.toContain(faCurriculumPickChar);

      // intro auto-plays → ready → the ONE confirm CTA
      for (let k = 0; k < 20; k += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
        if (container.querySelector('[data-kj-stage="ready"]')) break;
      }
      expect(container.querySelector('[data-kj-stage="ready"]'), 'intro auto-flowed to ready').toBeTruthy();
      await act(async () => {
        fireEvent.click(container.querySelector('[data-ready-cta]')!);
      });
      for (let k = 0; k < 16; k += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
        if (container.querySelector('[data-kj-stage="guided"]')) break;
      }
      expect(container.querySelector('[data-kj-stage="guided"]')).toBeTruthy();

      // guided → free → done (the walk-level completion of THIS slide's kanji)
      let svg = container.querySelector('svg[role="img"]');
      drawAll(svg!, JIN_DATA.medians);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(container.querySelector('[data-kj-stage="free"]')).toBeTruthy();
      svg = container.querySelector('svg[role="img"]');
      drawAll(svg!, JIN_DATA.medians);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
      expect(container.querySelector('[data-kanji-writing-done]'), 'the slide completed').toBeTruthy();
      expect(writingDone, 'onWritingDone fired exactly once for the deck').toHaveBeenCalledTimes(1);
    },
  );

  it('auto-flows intro → ready → guided and writes 人 (the full staged timeline)', { timeout: 30000 }, async () => {
    vi.useFakeTimers();
    const { container } = render(
      <KanjiWritingCard
        blockId="wp-kanji-jin-kuni"
        chapterSlug="first-meeting-01"
        stationSlug="stn-fm01-23-kanji"
        characters={ENTRIES}
      />,
    );
    // intro auto-flows to the ready beat
    for (let k = 0; k < 20; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      if (container.querySelector('[data-kj-stage="ready"]')) break;
    }
    expect(container.querySelector('[data-kj-stage="ready"]'), 'intro auto-flowed to ready').toBeTruthy();
    // the ONE confirm CTA starts guided practice
    await act(async () => {
      fireEvent.click(container.querySelector('[data-ready-cta]')!);
    });
    for (let k = 0; k < 16; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      if (container.querySelector('[data-kj-stage="guided"]')) break;
    }
    expect(container.querySelector('[data-kj-stage="guided"]')).toBeTruthy();

    // guided: draw 人's two strokes (real KanjiVG medians) → free
    let svg = container.querySelector('svg[role="img"]');
    expect(svg, 'canvas present in guided').not.toBeNull();
    drawAll(svg!, JIN_DATA.medians);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(container.querySelector('[data-kj-stage="free"]'), 'guided → free beat').toBeTruthy();

    // free: write 人 from memory → done → the NEXT kanji (国) starts its OWN intro
    svg = container.querySelector('svg[role="img"]');
    expect(svg, 'canvas present in free').not.toBeNull();
    drawAll(svg!, JIN_DATA.medians);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(container.querySelector('[data-kj-active="国"]'), 'advanced to 国').toBeTruthy();
    const nextStage = container.querySelector('[data-kj-stage]')?.getAttribute('data-kj-stage');
    expect(['intro', 'ready']).toContain(nextStage!);
    // no state leak: 国 is a FRESH kanji — never 人's done state
    expect(container.querySelector('[data-kj-stage="done"]')).toBeNull();
  });

  it('writing ALL kanji completes the block with the done panel', { timeout: 60000 }, async () => {
    vi.useFakeTimers();
    const { container } = render(
      <KanjiWritingCard
        blockId="wp-kanji-jin-kuni"
        chapterSlug="first-meeting-01"
        stationSlug="stn-fm01-23-kanji"
        characters={ENTRIES}
      />,
    );
    for (const kanji of [JIN_DATA, KUNI_DATA]) {
      // intro → ready
      for (let k = 0; k < 24; k += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
        if (container.querySelector('[data-kj-stage="ready"]')) break;
      }
      expect(container.querySelector('[data-kj-stage="ready"]')).toBeTruthy();
      await act(async () => {
        fireEvent.click(container.querySelector('[data-ready-cta]')!);
      });
      // ready → guided
      for (let k = 0; k < 16; k += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
        if (container.querySelector('[data-kj-stage="guided"]')) break;
      }
      // guided: all strokes
      let svg = container.querySelector('svg[role="img"]');
      drawAll(svg!, kanji.medians);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      // free: all strokes from memory
      svg = container.querySelector('svg[role="img"]');
      drawAll(svg!, kanji.medians);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
    }
    expect(container.querySelector('[data-kanji-writing-done]'), 'the whole kanji deck completed').toBeTruthy();
  });

  it('persists the stage per kanji through the onProgress hook', { timeout: 30000 }, async () => {
    vi.useFakeTimers();
    const progress: Array<[string, string]> = [];
    const { container } = render(
      <KanjiWritingCard
        blockId="wp-kanji-jin-kuni"
        chapterSlug="first-meeting-01"
        stationSlug="stn-fm01-23-kanji"
        characters={ENTRIES}
        onProgress={(literal, stage) => progress.push([literal, stage])}
      />,
    );
    for (let k = 0; k < 20; k += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      if (container.querySelector('[data-kj-stage="ready"]')) break;
    }
    expect(progress).toContainEqual(['人', 'intro']);
    expect(progress).toContainEqual(['人', 'ready']);
  });

  /* KANJI-TYPO 2026-11-24 — owner order «دکمهٔ شروع تمرین نوشتن باید بولدتر و
   * واضح‌تر باشد و به جای دکمهٔ ادامه که در بقیهٔ بخش‌ها بود قرار بگیرد»:
   * the ONE confirm CTA is the kana-parity FOOTER CTA — the big bold primary
   * at the very end of the slide (the «ادامه» slot), NOT a small caption
   * button buried in the canvas controls. Pinned: exactly ONE [data-ready-cta]
   * on the card, living inside [data-kj-cta-footer], carrying the kana footer
   * CTA classes (text-lead font-bold bg-ai min-h-12 min-w-[18rem]) — and it
   * exists ONLY in the ready beat (never during intro/guided/free/done). */
  it(
    'the ready CTA is the kana-parity FOOTER CTA — bold, primary, in the «ادامه» slot',
    { timeout: 30000 },
    async () => {
      vi.useFakeTimers();
      const { container } = render(
        <KanjiWritingCard
          blockId="wp-kanji-jin-kuni@人"
          chapterSlug="first-meeting-01"
          stationSlug="stn-fm01-23-kanji"
          characters={[ENTRIES[0]!]}
        />,
      );
      // intro (no CTA yet) → ready (the footer CTA appears)
      for (let k = 0; k < 20; k += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
        if (container.querySelector('[data-kj-stage="ready"]')) break;
      }
      const ctas = container.querySelectorAll('[data-ready-cta]');
      expect(ctas.length, 'exactly ONE confirm CTA on the slide').toBe(1);
      const footer = container.querySelector('[data-kj-cta-footer]');
      expect(footer, 'the CTA lives in the slide footer (the «ادامه» slot)').toBeTruthy();
      expect(footer!.contains(ctas[0]!), 'the ONE CTA is the footer CTA').toBe(true);
      const cls = ctas[0]!.className;
      expect(cls).toContain('bg-ai'); // primary fill (bolder than the old outline button)
      expect(cls).toContain('text-lead'); // 18px label (was text-caption 12px)
      expect(cls).toContain('font-bold');
      expect(cls).toContain('min-h-12'); // 48px target
      expect(cls).toContain('sm:min-w-[18rem]'); // the kana footer width floor
      expect(ctas[0]!.textContent).toContain(fa.curriculum.kanaStageReadyCta);
      // the footer is the LAST element of the card section — nothing sits below it
      const section = container.querySelector('[data-kanji-writing-block]')!;
      const lastElement = section.lastElementChild!;
      expect(lastElement === footer, 'nothing renders below the CTA footer').toBe(true);

      // the CTA exists ONLY in the ready beat: start guided → footer disappears
      await act(async () => {
        fireEvent.click(ctas[0]!);
      });
      for (let k = 0; k < 16; k += 1) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(5000);
        });
        if (container.querySelector('[data-kj-stage="guided"]')) break;
      }
      expect(container.querySelector('[data-kj-cta-footer]'), 'no footer CTA while practicing').toBeNull();
      expect(container.querySelector('[data-ready-cta]'), 'no stray CTA while practicing').toBeNull();
    },
  );

  /* KANJI-SHAKE-FIX 2026-11-24 — owner report: «وقتی داری ضربه‌های کانجی رو
   * مینویسی صفحه مدام تکون میخوره و بالا پایین میشه — مخصوصا ضربهٔ دوم به
   * بعد، البته نه همیشه». Root cause: the per-stroke feedback paragraph
   * MOUNTED/UNMOUNTED with every judgement (the engine returns feedbackFa:
   * null on a clean accept) and its 1-3-line Persian texts changed height
   * stroke-to-stroke → the canvas column reflowed on EVERY stroke → the page
   * jumped up/down mid-write (clean runs showed no box at all, hence «نه
   * همیشه»). The pinned law: while practicing, ONE permanent height-reserved
   * slot ([data-writing-feedback-slot]) carries the feedback — it never
   * mounts/unmounts, the min-height reserve absorbs every text swap, and the
   * idle standing content is zero-spoiler-safe (guided narrates the NEXT
   * stroke's start+direction — the same assist level as the dashed guide;
   * free shows the memory hint, never the position). */
  it(
    'the practice feedback SLOT is permanent + height-reserved (no per-stroke reflow)',
    { timeout: 30000 },
    async () => {
      const { container } = render(
        <KanjiWritingCard
          blockId="wp-kanji-jin-kuni@人"
          chapterSlug="first-meeting-01"
          stationSlug="stn-fm01-23-kanji"
          characters={[ENTRIES[0]!]}
          initialStageByLiteral={{ 人: 'ready' }}
        />,
      );
      // ready: the slot does NOT exist yet (practice-only law)
      await waitFor(() => {
        expect(container.querySelector('[data-ready-cta]')).not.toBeNull();
      });
      expect(container.querySelector('[data-writing-feedback-slot]'), 'no slot before practice').toBeNull();

      // the CTA starts guided practice
      await act(async () => {
        fireEvent.click(container.querySelector('[data-ready-cta]')!);
      });
      await waitFor(() => {
        expect(container.querySelector('[data-kj-stage]')?.getAttribute('data-kj-stage')).toBe('guided');
      });
      const svg = await waitFor(() => {
        const s = container.querySelector('svg[role="img"]');
        expect(s).not.toBeNull();
        return s as Element;
      });

      // ① the slot EXISTS from the first moment of practice, BEFORE any
      //    feedback — idle standing content = the next stroke's narration
      //    (the same assist level as the dashed guide on the canvas)
      const slot = container.querySelector('[data-writing-feedback-slot]')!;
      expect(slot, 'the slot is present from practice start (never a per-stroke box)').toBeTruthy();
      expect(slot.getAttribute('data-feedback-state')).toBe('idle');
      // the height reserve — 3 phone lines / 2 md lines of text-small at the
      // 1.8 FA leading (+ padding): every text swap is absorbed, zero reflow
      expect(slot.className).toContain('min-h-[5.875rem]');
      expect(slot.className).toContain('md:min-h-[4.25rem]');
      expect(slot.textContent).toContain('شروع کن');
      expect(slot.textContent).toContain('بکش');

      // ② a REJECTED stroke renders its feedback INSIDE the SAME node — the
      //    slot never unmounts/remounts across judgements (no reflow)
      fireEvent.pointerDown(svg, { pointerId: 1, pointerType: 'mouse', clientX: 150, clientY: 155 });
      fireEvent.pointerUp(svg, { pointerId: 1, pointerType: 'mouse', clientX: 152, clientY: 156 });
      await waitFor(() => {
        expect(container.querySelector('[data-writing-feedback-slot]')?.getAttribute('data-feedback-state')).toBe(
          'text',
        );
      });
      const slotAfterMiss = container.querySelector('[data-writing-feedback-slot]')!;
      expect(slotAfterMiss === slot, 'the SAME slot node across a judgement (no reflow)').toBe(true);
      expect(slotAfterMiss.querySelector('[data-writing-feedback]')?.textContent).toContain('ناقص');

      // ③ the whole guided write → the free stage's idle standing content is
      //    ZERO-SPOILER (the memory hint, never the stroke's position/direction)
      drawAll(svg, JIN_DATA.medians);
      await waitFor(
        () => {
          expect(container.querySelector('[data-kj-stage]')?.getAttribute('data-kj-stage')).toBe('free');
        },
        { timeout: 6000 },
      );
      const freeSlot = container.querySelector('[data-writing-feedback-slot]')!;
      expect(freeSlot === slot, 'the slot persists across the guided→free transition').toBe(true);
      await waitFor(() => {
        expect(freeSlot.getAttribute('data-feedback-state')).toBe('idle');
      });
      expect(freeSlot.textContent).toContain('لو نمی‌دهد');
      expect(freeSlot.textContent).not.toContain('بکش');
    },
  );

  /* KANJI-SHAKE-FIX — the kana Addendum-5 §1 parity: every practice (re)start
   * anchors the canvas into view. The kanji card was missing the kana card's
   * measured soft-scroll entirely — after the footer CTA (the very end of the
   * slide) the canvas sat above the fold and the learner wrote mid-page where
   * every reflow was maximally visible. Pinned: the CTA click scrolls (smooth,
   * header-aware) — the same contract the a5-experience suite pins for kana. */
  it('practice begins anchored on the canvas — the kana Addendum-5 §1 scroll parity', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    try {
      const { container } = render(
        <KanjiWritingCard
          blockId="wp-kanji-jin-kuni@人"
          chapterSlug="first-meeting-01"
          stationSlug="stn-fm01-23-kanji"
          characters={[ENTRIES[0]!]}
          initialStageByLiteral={{ 人: 'ready' }}
        />,
      );
      await waitFor(() => {
        expect(container.querySelector('[data-ready-cta]')).not.toBeNull();
      });
      await act(async () => {
        fireEvent.click(container.querySelector('[data-ready-cta]')!);
      });
      await waitFor(() => {
        expect(container.querySelector('[data-kj-stage]')?.getAttribute('data-kj-stage')).toBe('guided');
      });
      // …and the canvas is scrolled fully into view (smooth, header-aware)
      await waitFor(() => {
        expect(scrollToSpy).toHaveBeenCalled();
        const call = scrollToSpy.mock.calls[0]![0] as { top?: number; behavior?: string };
        expect(call?.top).toBeGreaterThanOrEqual(0);
        expect(call?.behavior).toBe('smooth');
      });
    } finally {
      scrollToSpy.mockRestore();
    }
  });
});
