/**
 * TASK-LEARNING-07 (Wave 2) — DialogueScene markup tests (Issues #98..#101).
 *
 * Static-markup assertions (react-dom/server — effects never run, so the scene
 * renders in its INITIAL state: idle, no line active, finish CTA disabled):
 * - Issue #101: `embedded` hides every PoC navigation surface (bottom nav,
 *   /poc/lesson token-chunk + teaches links, finish CTA without onFinish);
 *   the standalone PoC scene keeps them (PoC routes stay dev-only).
 * - Issue #100: `onFinish` renders the CTA in embedded mode (host-owned routing).
 * - Joint turns: the bubble label shows BOTH names — «سورا و یامادا (با هم)».
 * - Issue #98: the transcript is an inner scroll region (poc-scene-transcript).
 * - No glyph emoji anywhere in the transport controls (Persian labels + lucide
 *   icons with aria-labels) — the repo-wide no-emoji rule for product UI.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DialogueScene } from '@/app/poc/dialogue/dialogue-scene';
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

function entry(lineId: string, voiceId: string): { lineId: string; voiceId: string; hash: string; files: { opus: string; m4a: string }; bytes: number } {
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
  it('hides the bottom nav, ALL /poc/lesson links and the teaches chips stay plain', () => {
    const m = renderToStaticMarkup(<DialogueScene bundle={bundle} embedded />);
    expect(m).not.toContain('/poc'); // no PoC route anywhere
    expect(m).not.toContain('<nav'); // bottom nav gone
    // teaches chips render as plain spans (chrk-* ids still visible as plain chips)
    expect(m).toContain('>chrk-yoroshiku<');
    // token chunks inside the JP line are NOT links in embedded mode
    expect(m).not.toContain('class="poc-token-link');
  });

  it('hides the finish CTA entirely when no onFinish is provided (station owns completion)', () => {
    const m = renderToStaticMarkup(<DialogueScene bundle={bundle} embedded />);
    expect(m).not.toContain('پایان مشاهده');
    expect(m).not.toContain('برای فعال‌شدن این دکمه');
  });

  it('renders the finish CTA with host-owned routing when onFinish is provided (Issue #100)', () => {
    const m = renderToStaticMarkup(
      <DialogueScene bundle={bundle} embedded onFinish={() => {}} />,
    );
    expect(m).toContain('>پایان مشاهده</button>'); // the CTA exists …
    expect(m).not.toContain('رفتن به درس'); // … without the PoC-stage routing label
    expect(m).toContain('disabled'); // still gated on last-line-seen
    expect(m).toContain('برای فعال‌شدن این دکمه، مکالمه را تا خط آخر ببین.');
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
