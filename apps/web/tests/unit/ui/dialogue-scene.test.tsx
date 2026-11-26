/**
 * TASK-LEARNING-07 (Wave 2) — DialogueScene markup tests (Issues #98..#101).
 *
 * Static-markup assertions (react-dom/server — effects never run, so the scene
 * renders in its INITIAL state: idle, no line active, finish CTA disabled):
 * - Issue #101 + LESSON-UX PART1: `embedded` hides every PoC navigation surface
 *   (bottom nav, /poc/lesson token-chunk + teaches links) and NEVER renders the
 *   in-player finish CTA — the product walk’s «ادامه» is the one forward action;
 *   the standalone PoC scene keeps its own CTA (PoC routes stay dev-only).
 * - Joint turns: the bubble label shows BOTH names — «سورا و یامادا (با هم)».
 * - Issue #98: the transcript is an inner scroll region (poc-scene-transcript).
 * - LESSON-UX PART1 (scroll chaining): the transcript CSS must NOT cut the
 *   scroll chain to the page (no overscroll-behavior: contain).
 * - No glyph emoji anywhere in the transport controls (Persian labels + lucide
 *   icons with aria-labels) — the repo-wide no-emoji rule for product UI.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DialogueScene } from '@/app/poc/dialogue/dialogue-scene';
import { POC_SCENE_CSS } from '@/app/poc/jp-text';
import type { CharacterRef, Dialogue, DialogueToken } from '@/modules/dialogue';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn() }),
}));

const characters: CharacterRef[] = [
  { id: 'chr-sora', nameJa: 'ソラ', nameFa: 'سورا', colorToken: 'speaker-1', voiceId: 'vv-female-01-normal' },
  { id: 'chr-yamada', nameJa: 'やまだ', nameFa: 'یامادا', colorToken: 'speaker-2', voiceId: 'vv-male-02-normal' },
];

const tokens = (t: [string, string, string?][]): DialogueToken[] =>
  t.map(([surface, reading, chunk]) => ({ surface, reading, ...(chunk ? { chunk } : {}) }));

const dialogue: Dialogue = {
  id: 'dlg-joint-test',
  scene: 'صحنهٔ آزمون',
  characterIds: ['chr-sora', 'chr-yamada'],
  turnGapDefaultMs: 300,
  lines: [
    {
      id: 'l1',
      speaker: 'chr-sora',
      tokens: tokens([['こんにちは', 'こんにちは', 'chrk-konnichiwa']]),
      fa: 'سلام',
      teaches: ['chrk-konnichiwa'],
    },
    {
      id: 'l2',
      speaker: 'chr-sora',
      coSpeaker: 'chr-yamada',
      tokens: tokens([['よろしく', 'よろしく', 'chrk-yoroshiku']]),
      fa: 'یوروشیکو اونِگای‌شیماس (با هم)',
      teaches: ['chrk-yoroshiku'],
    },
  ],
};

function entry(
  lineId: string,
  voiceId: string,
): { lineId: string; voiceId: string; hash: string; files: { opus: string; m4a: string }; bytes: number } {
  return {
    lineId,
    voiceId,
    hash: `hash-${lineId}`,
    files: { opus: `/audio/dialogues/${lineId}.opus`, m4a: `/audio/dialogues/${lineId}.m4a` },
    bytes: 2048,
  };
}

const bundle = {
  dialogue,
  characters,
  audio: {
    available: true,
    entries: [
      entry('l1', 'vv-female-01-normal'),
      entry('l2', 'vv-female-01-normal'),
      entry('l2-co', 'vv-male-02-normal'), // the joint-turn co-speaker asset
    ],
  },
};

/** Every glyph emoji/dingrat the transport controls must never use again. */
const FORBIDDEN_GLYPHS = /[⏸⏮⏭↺▶✓✗🎧]/;

describe('DialogueScene — PoC mode (standalone /poc/dialogue instance)', () => {
  it('keeps the PoC navigation: nav links, /poc/lesson token + teaches links', () => {
    const m = renderToStaticMarkup(<DialogueScene bundle={bundle} />);
    expect(m).toContain('poc/lesson#item-chrk-konnichiwa'); // token-chunk link
    expect(m).toContain('poc/lesson#item-chrk-yoroshiku'); // teaches chip link
    expect(m).toContain('مسیر یادگیری (/learn)'); // bottom nav
    expect(m).toContain('آزمون T2'); // PoC nav link
  });

  it('renders the finish CTA (disabled until the last line is seen)', () => {
    const m = renderToStaticMarkup(<DialogueScene bundle={bundle} />);
    expect(m).toContain('پایان مشاهده — رفتن به درس (B)');
    expect(m).toContain('disabled'); // lastLineSeen=false in the initial state
    expect(m).toContain('برای فعال‌شدن این دکمه، مکالمه را تا خط آخر ببین.');
  });
});

describe('DialogueScene — embedded mode (Issue #101: no PoC leak into product)', () => {
  it('hides the bottom nav, ALL /poc/lesson links and the teaches chips never leak registry ids', () => {
    // JOURNEY-FIX 2026-11-23 §۶: embedded (product) mode renders the teaches
    // chips through the chapter's item-label map — WITHOUT a map an
    // unresolvable id renders NOTHING (never the raw «chrk-…» key), WITH the
    // map the resolved learner-facing label renders as a plain span.
    const bare = renderToStaticMarkup(<DialogueScene bundle={bundle} embedded />);
    expect(bare).not.toContain('/poc'); // no PoC route anywhere
    expect(bare).not.toContain('<nav'); // bottom nav gone
    expect(bare).not.toContain('chrk-yoroshiku'); // the raw registry id is GONE
    expect(bare).not.toContain('class="poc-token-link'); // token chunks not links
    const labeled = renderToStaticMarkup(
      <DialogueScene
        bundle={bundle}
        embedded
        subtitleDefaultOn
        itemLabels={{ 'chrk-yoroshiku': 'よろしく おねがいします — «از رابطه‌مان خوشحال می‌شوم»' }}
      />,
    );
    expect(labeled).toContain('از رابطه‌مان خوشحال می‌شوم');
    expect(labeled).not.toContain('chrk-yoroshiku');
    expect(labeled).not.toContain('/poc');
  });

  it('hides the finish CTA entirely in embedded mode — the walk owns progression', () => {
    const m = renderToStaticMarkup(<DialogueScene bundle={bundle} embedded />);
    expect(m).not.toContain('پایان مشاهده');
    expect(m).not.toContain('برای فعال‌شدن این دکمه');
  });

  it('LESSON-UX PART1: embedded mode NEVER renders the in-player finish CTA — the walk’s «ادامه» is the one forward action', () => {
    // owner order 2026-11-26 «دکمه‌ای که زیرش دکمهٔ ادامه هست بی‌فایده است»: the
    // product walk renders its own «ادامه» right below the player — the
    // in-player «پایان مشاهده» CTA (and its watch-gate caption) is gone from
    // every embedded host, unconditionally.
    const m = renderToStaticMarkup(<DialogueScene bundle={bundle} embedded subtitleDefaultOn />);
    expect(m).not.toContain('پایان مشاهده');
    expect(m).not.toContain('برای فعال‌شدن این دکمه');
    expect(m).not.toContain('کل مکالمه را دیدی');
  });
});

describe('DialogueScene — joint turns (TASK-LEARNING-07)', () => {
  it('shows BOTH speaker names on the joint bubble: «سورا و یامادا (با هم)»', () => {
    const m = renderToStaticMarkup(<DialogueScene bundle={bundle} />);
    expect(m).toContain('سورا و یامادا (با هم)');
    // single-speaker line keeps its plain label
    expect(m).toContain('>سورا<');
  });
});

describe('DialogueScene — layout + a11y (Issue #98) + no-emoji rule', () => {
  it('transcript is its own scroll region with an accessible name', () => {
    const m = renderToStaticMarkup(<DialogueScene bundle={bundle} />);
    expect(m).toContain('class="poc-scene-transcript');
    expect(m).toContain('aria-label="خطوط مکالمه"');
    expect(m).toContain('tabindex="0"'); // keyboard-scrollable region
  });

  it('LESSON-UX PART1: the transcript keeps the scroll chain to the page (no overscroll containment)', () => {
    // owner report «وقتی دستت را روی کادر مکالمه می‌گذاری صفحه دیگر اسکرول
    // نمی‌شود»: overscroll-behavior: contain froze the whole page whenever the
    // finger rested on the transcript at its boundary (or with nothing to
    // scroll). The region stays its own scrollable area (overflow-y: auto) but
    // the chain to the page is NEVER cut again.
    const rule = POC_SCENE_CSS.match(/\.poc-scene-transcript\s*\{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('overflow-y: auto');
    expect(rule).not.toContain('overscroll-behavior');
    // no OTHER rule in the stylesheet may reintroduce scroll containment either
    // (the explanatory comment may NAME the removed property — rules may not)
    for (const block of POC_SCENE_CSS.match(/\{[^}]*\}/g) ?? []) {
      expect(block).not.toContain('overscroll-behavior');
    }
  });

  it('transport controls use Persian labels + lucide icons — no glyph emoji anywhere', () => {
    const m = renderToStaticMarkup(<DialogueScene bundle={bundle} />);
    expect(m).not.toMatch(FORBIDDEN_GLYPHS);
    expect(m).toContain('aria-label="پخش"');
    expect(m).toContain('aria-label="خط قبلی"');
    expect(m).toContain('aria-label="پخش دوبارهٔ همین جمله"');
    expect(m).toContain('aria-label="خط بعدی"');
    // lucide icons render as inline SVG, hidden from the accessible name
    expect(m).toContain('aria-hidden="true"');
  });

  it('per-line replay buttons keep 44px targets and Persian aria-labels', () => {
    const m = renderToStaticMarkup(<DialogueScene bundle={bundle} />);
    expect(m).toContain('aria-label="پخش از این خط: ');
    expect(m).toContain('size-11'); // 44px touch target
  });
});
