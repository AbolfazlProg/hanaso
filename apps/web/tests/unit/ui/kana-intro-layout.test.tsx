// @vitest-environment jsdom
/**
 * HANASO — TASK-LEARNING-08 · Approved Kana Introduction Layout.
 *
 * The owner-approved wireframe contract for the kana-card introduction page:
 *
 * §۱  the five ordered sections — title → hero canvas → the two teaching
 *     boxes → usage examples → footer (data-intro-section order).
 * §۲  the hero canvas is the page's heart: the big canvas renders LARGER
 *     (maxWidth 34rem) inside its prominent box, the canvas anchor and the
 *     stage-action hint slot stay (Addendum-4 §3 / A5 §1 contracts kept).
 * §۳  the two teaching boxes render side by side on desktop (RTL grid):
 *     «روش نوشتن» and «تلفظ و یادسپار».
 * §۴  ALL related examples render inside ONE full-width box — word (with the
 *     taught glyph highlighted), Persian reading, meaning, the word's OWN
 *     audio control, authored pronunciation guides; the host word renders
 *     only when the example set does not already contain it.
 * §۵  the CTA lives in the FOOTER, AFTER every introduction element and the
 *     examples — never under the canvas, never between the teaching boxes;
 *     its label is «شروع تمرین نوشتن» with the marker «پایان معرفی کاراکتر»
 *     and the caption «اول مشاهده و یادگیری، سپس تمرین».
 * §۶  the CTA behavior is UNCHANGED (A5 §1): click → stage guided, same
 *     card, soft header-aware scroll to the canvas; during practice the
 *     intro-only sections collapse into folds (pron + examples — nothing
 *     deleted) while the writing box and the canvas stay open.
 */
import { describe, expect, it, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as React from 'react';

import { KanaCard } from '@/components/curriculum/kana-card';
import type { KanaItem } from '@/modules/curriculum/types';

vi.mock('@/modules/audio/client-cache', () => ({
  preloadAudio: vi.fn(() => Promise.resolve(null)),
  getCachedAudio: vi.fn(() => null),
  reportPlaybackError: vi.fn(),
  resetAudioCacheForTests: vi.fn(),
}));

const webRoot = join(__dirname, '..', '..', '..');
const INDEX = readFileSync(join(webRoot, 'public', 'writing-data', 'index.json'), 'utf8');
const A_CHAR = readFileSync(join(webRoot, 'public', 'writing-data', 'あ.json'), 'utf8');

const RECT = { left: 0, top: 0, width: 512, height: 512, x: 0, y: 0, right: 512, bottom: 512, toJSON: () => ({}) };

let rectSpy: ReturnType<typeof vi.spyOn>;
let scrollToSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  rectSpy = vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue(RECT as DOMRect);
});

afterAll(() => {
  rectSpy.mockRestore();
});

beforeEach(() => {
  scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes('index.json')) return new Response(INDEX, { status: 200 });
      if (u.includes('%E3%81%82') || u.endsWith('/あ.json')) return new Response(A_CHAR, { status: 200 });
      return new Response('{}', { status: 200 });
    }),
  );
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  scrollToSpy.mockRestore();
});

const KANA_A: KanaItem = {
  kanaId: 'hira-a',
  glyph: 'あ',
  romaji: 'a',
  script: 'hira',
  row: 'a-row',
  hostWord: { word: 'あい', meaningFa: 'عشق' },
} as unknown as KanaItem;

const RELATED = [
  {
    id: 'ex-h1-1',
    role: 'reading' as const,
    ja: 'あう',
    reading: 'آو',
    fa: 'ملاقات کردن',
    whyFa: 'با آ و او که یاد گرفتی.',
    pronFa: '«آ» را کشیده و «او» کوتاه بگو.',
  },
  {
    id: 'ex-h1-2',
    role: 'reading' as const,
    ja: 'あおい',
    reading: 'آؤی',
    fa: 'آبی',
    whyFa: 'سه کانایی که همه را می‌شناسی.',
  },
];

const EXAMPLE_AUDIO: Record<string, { opus: string; m4a: string } | null> = {
  あう: { opus: '/audio/words/w-x.opus', m4a: '/audio/words/w-x.m4a' },
  あおい: null,
};

function sectionNames(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-intro-section]')]
    .map((el) => el.getAttribute('data-intro-section'))
    .filter((s): s is string => s !== null);
}

/* ------------------------------------------------------------------ §۱+§۵ */

describe('Approved intro layout — section order and the footer CTA', () => {
  it('renders the five sections in the wireframe order: title → canvas → teaching → examples → footer', async () => {
    const { container } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        wordAudioUrls={null}
        relatedExamples={RELATED}
        exampleAudioByWord={EXAMPLE_AUDIO}
        initialProgress={{ stage: 'ready' }}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-ready-cta]')).not.toBeNull();
    });
    expect(sectionNames(container)).toEqual(['title', 'canvas', 'teaching', 'examples', 'footer']);
  });

  it('the CTA lives INSIDE the footer, after the examples — never under the canvas or between the teaching boxes', async () => {
    const { container } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        wordAudioUrls={null}
        relatedExamples={RELATED}
        exampleAudioByWord={EXAMPLE_AUDIO}
        initialProgress={{ stage: 'ready' }}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-ready-cta]')).not.toBeNull();
    });
    const cta = container.querySelector('[data-ready-cta]')!;
    const footer = container.querySelector('[data-intro-section="footer"]')!;
    const examples = container.querySelector('[data-intro-section="examples"]')!;
    const canvasBox = container.querySelector('[data-intro-section="canvas"]')!;
    expect(footer.contains(cta)).toBe(true);
    // DOM order: examples BEFORE the footer, canvas BEFORE the teaching boxes
    expect(examples.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      canvasBox.compareDocumentPosition(container.querySelector('[data-intro-section="teaching"]')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // …and the action slot under the canvas holds NO button anymore
    expect(container.querySelector('[data-stage-action] button')).toBeNull();
  });

  it('the footer shows the marker, the CTA label «شروع تمرین نوشتن» and the caption', async () => {
    const { container } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        wordAudioUrls={null}
        relatedExamples={RELATED}
        exampleAudioByWord={EXAMPLE_AUDIO}
        initialProgress={{ stage: 'ready' }}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-ready-cta]')).not.toBeNull();
    });
    expect(container.querySelector('[data-intro-footer-marker]')!.textContent).toContain('پایان معرفی کاراکتر');
    expect(container.querySelector('[data-ready-cta]')!.textContent).toContain('شروع تمرین نوشتن');
    expect(container.querySelector('[data-intro-footer-caption]')!.textContent).toContain(
      'اول مشاهده و یادگیری، سپس تمرین',
    );
  });

  it('during the intro stage the footer exists but the CTA waits for ready (the ONE interactive stop)', async () => {
    const { container } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        wordAudioUrls={null}
        relatedExamples={RELATED}
        exampleAudioByWord={EXAMPLE_AUDIO}
        initialProgress={{ stage: 'intro' }}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-kana-stage]')).not.toBeNull();
    });
    expect(container.querySelector('[data-intro-footer-marker]')).not.toBeNull();
    expect(container.querySelector('[data-ready-cta]')).toBeNull();
  });
});

/* ------------------------------------------------------------------ §۱ */

describe('Approved intro layout — the character title', () => {
  it('leads with the BIG glyph, the Persian reading and the script·row label', async () => {
    const { container } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        wordAudioUrls={null}
        relatedExamples={RELATED}
        initialProgress={{ stage: 'ready' }}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-ready-cta]')).not.toBeNull();
    });
    const title = container.querySelector('[data-intro-section="title"]')!;
    expect(title.querySelector('[data-intro-glyph]')!.textContent).toBe('あ');
    expect(title.textContent).toContain('هیراگانا');
    expect(title.textContent).toContain('ردیف آ');
    expect(title.textContent).toContain('a'); // the Latin complement stays (§8)
  });
});

/* ------------------------------------------------------------------ §۲ */

describe('Approved intro layout — the hero canvas box', () => {
  it('the canvas renders LARGER (34rem) inside its prominent box; anchor + hint slot contracts kept', async () => {
    const { container } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} wordAudioUrls={null} initialProgress={{ stage: 'ready' }} />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-ready-cta]')).not.toBeNull();
    });
    const svg = container.querySelector('svg[aria-label^="محل نوشتن"]') as SVGSVGElement;
    expect(svg).not.toBeNull();
    expect(svg.style.maxWidth).toBe('34rem');
    expect(container.querySelector('[data-intro-section="canvas"]')!.contains(svg)).toBe(true);
    expect(container.querySelector('[data-canvas-anchor]')).not.toBeNull();
    expect(container.querySelector('[data-stage-action="ready"]')).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ §۳ */

describe('Approved intro layout — the two teaching boxes', () => {
  it('renders «روش نوشتن» and «تلفظ و یادسپار» side by side in one RTL grid (md:grid-cols-2)', async () => {
    const { container } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} wordAudioUrls={null} initialProgress={{ stage: 'ready' }} />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-ready-cta]')).not.toBeNull();
    });
    const grid = container.querySelector('[data-intro-section="teaching"]')!;
    expect(grid.className).toContain('md:grid-cols-2');
    const how = container.querySelector('[data-teaching-box="how"]')!;
    const pron = container.querySelector('[data-teaching-box="pron"]')!;
    expect(how.textContent).toContain('روش نوشتن');
    expect(pron.textContent).toContain('تلفظ و یادسپار');
    // the ready stage keeps the full stroke-order overview in the HOW box (A4 §2)
    expect(how.querySelector('[data-stage-panel="order"]')).not.toBeNull();
    // the reading card lives in the PRON box
    expect(pron.contains(container.querySelector('[data-reading-card]')!)).toBe(true);
  });
});

/* ------------------------------------------------------------------ §۴ */

describe('Approved intro layout — the usage examples box', () => {
  it('renders ALL related examples in ONE full-width box: word + reading + meaning + own audio + pron guide', async () => {
    const { container } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        wordAudioUrls={null}
        relatedExamples={RELATED}
        exampleAudioByWord={EXAMPLE_AUDIO}
        initialProgress={{ stage: 'ready' }}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-ready-cta]')).not.toBeNull();
    });
    const box = container.querySelector('[data-intro-section="examples"]')!;
    const cards = [...box.querySelectorAll('[data-example-card]')];
    expect(cards.length).toBe(2);
    expect(cards[0]!.getAttribute('data-example-word')).toBe('あう');
    expect(cards[1]!.getAttribute('data-example-word')).toBe('あおい');
    // the word is the hero + THIS glyph highlighted inside it
    expect(cards[0]!.textContent).toContain('あう');
    // Persian reading big/bold, meaning on its own line (A5 §6 kept)
    expect(cards[0]!.textContent).toContain('آو');
    expect(cards[0]!.textContent).toContain('ملاقات کردن');
    // the word's OWN audio: with asset → control; without → none (honest)
    expect(cards[0]!.querySelector('[data-example-audio]')).not.toBeNull();
    expect(cards[1]!.querySelector('[data-example-audio]')).toBeNull();
    // authored pronunciation guide only where it exists
    expect(cards[0]!.querySelector('[data-pron-guide]')).not.toBeNull();
    expect(cards[1]!.querySelector('[data-pron-guide]')).toBeNull();
    // the host word (not among the examples) still renders — nothing deleted
    expect(box.contains(container.querySelector('[data-word-card]')!)).toBe(true);
  });

  it('does NOT duplicate the host word when the example set already contains it', async () => {
    const withHost = [
      ...RELATED,
      { id: 'ex-h1-3', role: 'reading' as const, ja: 'あい', reading: 'آی', fa: 'عشق', whyFa: '' },
    ];
    const { container } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        wordAudioUrls={null}
        relatedExamples={withHost}
        exampleAudioByWord={{}}
        initialProgress={{ stage: 'ready' }}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-ready-cta]')).not.toBeNull();
    });
    const box = container.querySelector('[data-intro-section="examples"]')!;
    expect(box.querySelectorAll('[data-example-card]').length).toBe(3);
    expect(box.querySelectorAll('[data-word-card]').length).toBe(0);
  });
});

/* ------------------------------------------------------------------ §۶ */

describe('Approved intro layout — the CTA behavior and the focused practice view', () => {
  it('clicking the footer CTA: same card → guided, soft header-aware scroll, folds replace the intro-only sections', async () => {
    const { container } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        wordAudioUrls={null}
        relatedExamples={RELATED}
        exampleAudioByWord={EXAMPLE_AUDIO}
        initialProgress={{ stage: 'ready' }}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-ready-cta]')).not.toBeNull();
    });
    // ready = the FULL view: no folds, the open boxes are there
    expect(container.querySelector('[data-intro-fold]')).toBeNull();
    expect(container.querySelector('[data-teaching-box="pron"]')).not.toBeNull();
    fireEvent.click(container.querySelector('[data-ready-cta]')!);
    await waitFor(() => {
      expect(container.querySelector('[data-kana-stage]')?.getAttribute('data-kana-stage')).toBe('guided');
    });
    // the soft scroll to the canvas fired (A5 §1 kept)
    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalled();
      const call = scrollToSpy.mock.calls[0]![0] as { behavior?: string };
      expect(call?.behavior).toBe('smooth');
    });
    // focused practice: the pron box + examples collapse into folds (data kept)
    const pronFold = container.querySelector('[data-intro-fold="pron"]')!;
    expect(pronFold).not.toBeNull();
    expect(pronFold.contains(container.querySelector('[data-reading-card]')!)).toBe(true);
    expect(container.querySelector('[data-intro-fold="examples"]')).not.toBeNull();
    // the writing box stays OPEN around the canvas (current stroke guide)
    expect(container.querySelector('[data-teaching-box="how"]')).not.toBeNull();
    expect(container.querySelector('[data-stroke-info]')).not.toBeNull();
    // the footer (and its CTA) is gone while practicing
    expect(container.querySelector('[data-intro-section="footer"]')).toBeNull();
    expect(container.querySelector('[data-ready-cta]')).toBeNull();
  });
});
