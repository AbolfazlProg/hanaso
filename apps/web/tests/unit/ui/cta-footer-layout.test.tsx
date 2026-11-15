// @vitest-environment jsdom
/**
 * HANASO — TASK-HANASO-CTA-01 layout tests (owner 2026-11-08).
 *
 * §۴ The kana introduction's final content order:
 *      1. the stroke-order animation canvas,
 *      2. the writing-method / stroke-order boxes,
 *      3. the pronunciation & mnemonic boxes,
 *      4. ALL related usage examples (meaning + own audio),
 *      5. a small footer with «شروع تمرین نوشتن ←».
 *    — the CTA is the LAST element of the card: no example and no
 *      information sits below it; the old slot under the canvas no longer
 *      carries the button.
 * §۴ click behavior (unchanged, re-proven with examples present): progress
 *    saved, soft-scroll to the canvas, Guided writing on the SAME page.
 * §۴ during practice the examples collapse into ONE fold (nothing deleted);
 *    the footer disappears (the canvas owns the page).
 */
import { describe, expect, it, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as React from 'react';

import { KanaCard, type KanaRelatedExample } from '@/components/curriculum/kana-card';
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
});

const KANA_A: KanaItem = {
  kanaId: 'hira-a',
  glyph: 'あ',
  romaji: 'a',
  hostWord: { word: 'あい', meaningFa: 'عشق' },
} as unknown as KanaItem;

const EXAMPLES: KanaRelatedExample[] = [
  {
    id: 'ex-1',
    role: 'anchor',
    ja: 'あい',
    reading: 'آی',
    fa: 'عشق',
    whyFa: 'دو کانای «آ» و «ای» پشت هم.',
    pronFa: 'واکهٔ بلند — «آ» را کشیده بگو.',
  },
  {
    id: 'ex-2',
    role: 'reading',
    ja: 'あさ',
    reading: 'آسا',
    fa: 'صبح',
    whyFa: 'کانای «آ» در ابتدای واژه.',
  },
];

const AUDIO: Record<string, { opus: string; m4a: string } | null> = {
  あい: { opus: '/audio/ai.opus', m4a: '/audio/ai.m4a' },
  あさ: null,
};

function renderReady() {
  return render(
    <KanaCard
      kana={KANA_A}
      showRomaji
      audioUrls={null}
      wordAudioUrls={null}
      relatedExamples={EXAMPLES}
      exampleAudioByWord={AUDIO}
      initialProgress={{ stage: 'ready' }}
    />,
  );
}

/* ------------------------------------------------------------------ §۴ order */

describe('TASK-HANASO-CTA-01 §۴ — the footer CTA closes the introduction', () => {
  it('the CTA lives in the footer, AFTER the examples, as the LAST element — nothing below it', () => {
    const { container } = renderReady();
    const card = container.querySelector<HTMLElement>('[data-kana-stage]');
    expect(card).not.toBeNull();

    const footer = card!.querySelector<HTMLElement>('[data-intro-cta-footer]');
    const examples = card!.querySelector<HTMLElement>('[data-intro-examples]');
    const canvas = card!.querySelector('[data-canvas-anchor]');
    const attribution = card!.querySelector('details');

    // the five content layers exist, in the owner's order
    expect(canvas).not.toBeNull();
    expect(examples).not.toBeNull();
    expect(attribution).not.toBeNull();
    expect(footer).not.toBeNull();
    const pairs: [Element, Element][] = [
      [canvas!, examples!],
      [examples!, attribution!],
      [attribution!, footer!],
    ];
    for (const [a, b] of pairs) {
      expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }

    // the CTA button is INSIDE the footer and the footer is the card's LAST child
    const cta = footer!.querySelector<HTMLButtonElement>('[data-ready-cta]');
    expect(cta).not.toBeNull();
    expect(cta!.textContent).toContain('شروع تمرین نوشتن');
    expect(card!.lastElementChild).toBe(footer);
    expect(cta!.nextElementSibling).toBeNull();

    // no badge/label look in the footer: only the lead line + the button
    expect(footer!.querySelectorAll('.rounded-full')).toHaveLength(0);
    expect(footer!.textContent).toContain('معرفی این کاراکتر تمام شد! حالا نوبت توست.');
  });

  it('the action slot under the canvas no longer carries the CTA (empty in ready)', () => {
    const { container } = renderReady();
    const slot = container.querySelector<HTMLElement>('[data-stage-action="ready"]');
    expect(slot).not.toBeNull();
    expect(slot!.querySelector('[data-ready-cta]')).toBeNull();
    expect(slot!.textContent!.trim()).toBe('');
  });

  it('every readable card renders with meaning, glyph highlight and its own audio — and the host word never duplicates (TASK-LEARNING-09 §۶ dedup)', () => {
    const { container } = renderReady();
    const cards = container.querySelectorAll('[data-example-card]');
    // the host word あい IS also the first related example — the merge keeps
    // ONE card for it (anchor) + あさ = 2 cards total, never 3
    expect(cards).toHaveLength(2);
    // ONE CARD (the article) for the word あい — the play control inside it
    // also carries data-example-word, so count the CARDS, not every attribute
    expect(container.querySelectorAll('[data-example-card][data-example-word="あい"]')).toHaveLength(1);
    expect(cards[0]!.getAttribute('data-example-word')).toBe('あい');
    expect(cards[0]!.getAttribute('data-host-word-card')).toBe('true');
    expect(cards[0]!.textContent).toContain('عشق'); // معنی
    expect(cards[0]!.textContent).toContain('آی'); // خوانش فارسی (enriched from the matching example)
    // the glyph is highlighted inside the hero word
    const hero = cards[0]!.querySelector('.ja-block')!;
    expect(hero.textContent).toBe('あい');
    expect(hero.querySelector('span[class*="bg-shu/20"]')?.textContent).toBe('あ');
    // per-word audio: an asset exists for あい → playable control bound to it
    expect(cards[0]!.querySelector('[data-example-audio][data-example-word="あい"]')).not.toBeNull();
    // no asset for あさ → honest: no play control on that card
    expect(container.querySelector('[data-example-word="あさ"] [data-example-audio]')).toBeNull();
    // authored pronunciation guide renders (only where authored)
    expect(cards[0]!.querySelector('[data-pron-guide]')).not.toBeNull();
    expect(cards[1]!.querySelector('[data-pron-guide]')).toBeNull();
  });

  it('TASK-LEARNING-09 §۶ — the host word ALONE still renders the merged section (the anchor card); a kana with NO readable vocabulary renders no section', () => {
    // host word, no related examples → the merged «نمونه‌های قابل‌خواندن»
    // section renders with the ONE anchor card (dedup is a non-issue here)
    const { container } = render(
      <KanaCard kana={KANA_A} showRomaji audioUrls={null} wordAudioUrls={null} initialProgress={{ stage: 'ready' }} />,
    );
    const card = container.querySelector<HTMLElement>('[data-kana-stage]')!;
    const section = card.querySelector<HTMLElement>('[data-intro-examples]');
    expect(section).not.toBeNull();
    expect(section!.querySelectorAll('[data-example-card]')).toHaveLength(1);
    expect(section!.querySelector('[data-example-word="あい"]')).not.toBeNull();
    expect(section!.querySelector('[data-host-word-card="true"]')).not.toBeNull();
    expect(section!.textContent).toContain('واژهٔ قابل‌خواندن');
    const footer = card.querySelector<HTMLElement>('[data-intro-cta-footer]');
    expect(footer).not.toBeNull();
    expect(card.lastElementChild).toBe(footer);

    // no host word AND no examples → no vocabulary section at all (§۷ — no placeholder)
    const bare = render(
      <KanaCard
        kana={{ ...KANA_A, hostWord: undefined } as unknown as KanaItem}
        showRomaji
        audioUrls={null}
        wordAudioUrls={null}
        initialProgress={{ stage: 'ready' }}
      />,
    );
    const bareCard = bare.container.querySelector<HTMLElement>('[data-kana-stage]')!;
    expect(bareCard.querySelector('[data-intro-examples]')).toBeNull();
    expect(bareCard.querySelector('[data-example-card]')).toBeNull();
    const bareFooter = bareCard.querySelector<HTMLElement>('[data-intro-cta-footer]');
    expect(bareFooter).not.toBeNull();
    expect(bareCard.lastElementChild).toBe(bareFooter);
  });
});

/* --------------------------------------------------------- §۴ stage behavior */

describe('TASK-HANASO-CTA-01 §۴ — footer CTA lifecycle', () => {
  it('intro: the examples are visible but the footer CTA is NOT (the intro has not ended)', async () => {
    const { container } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        wordAudioUrls={null}
        relatedExamples={EXAMPLES}
        exampleAudioByWord={AUDIO}
      />,
    );
    await waitFor(() => {
      expect(container.querySelector('[data-kana-stage]')?.getAttribute('data-kana-stage')).toBe('intro');
    });
    expect(container.querySelector('[data-intro-examples]')).not.toBeNull();
    expect(container.querySelector('[data-intro-cta-footer]')).toBeNull();
    expect(container.querySelector('[data-ready-cta]')).toBeNull();
  });

  it('a RESTORED ready stage never yanks the page (the reveal scroll only fires on the live intro→ready beat)', () => {
    renderReady();
    expect(containerReadyHasCta()).toBe(true);
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('click: progress saved, soft-scroll to the canvas, Guided starts on the SAME page (no route)', async () => {
    const onProgress = vi.fn();
    const { container } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        wordAudioUrls={null}
        relatedExamples={EXAMPLES}
        exampleAudioByWord={AUDIO}
        initialProgress={{ stage: 'ready' }}
        onProgress={onProgress}
      />,
    );
    const cta = container.querySelector<HTMLButtonElement>('[data-ready-cta]')!;
    fireEvent.click(cta);
    await waitFor(() => {
      expect(container.querySelector('[data-kana-stage]')?.getAttribute('data-kana-stage')).toBe('guided');
    });
    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalled();
      expect((scrollToSpy.mock.calls[0]![0] as { behavior?: string }).behavior).toBe('smooth');
    });
    expect(onProgress).toHaveBeenCalledWith({ stage: 'guided' });
  });

  it('during practice the examples collapse into ONE fold (never deleted) and the footer hides', async () => {
    const { container } = render(
      <KanaCard
        kana={KANA_A}
        showRomaji
        audioUrls={null}
        wordAudioUrls={null}
        relatedExamples={EXAMPLES}
        exampleAudioByWord={AUDIO}
        initialProgress={{ stage: 'ready' }}
      />,
    );
    fireEvent.click(container.querySelector<HTMLButtonElement>('[data-ready-cta]')!);
    await waitFor(() => {
      expect(container.querySelector('[data-kana-stage]')?.getAttribute('data-kana-stage')).toBe('guided');
    });
    const fold = container.querySelector<HTMLElement>('[data-intro-fold="examples"]');
    expect(fold).not.toBeNull();
    // the data is still inside the fold (nothing deleted)
    expect(fold!.querySelector('[data-example-card]')).not.toBeNull();
    // the footer is gone while practicing (the canvas owns the page)
    expect(container.querySelector('[data-intro-cta-footer]')).toBeNull();
  });
});

/** tiny helper for the restored-ready test (document scope). */
function containerReadyHasCta(): boolean {
  return document.querySelector('[data-ready-cta]') !== null;
}
