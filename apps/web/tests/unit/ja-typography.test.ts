/**
 * HANASO — JP typography standard regression tests (ENGINE-NEXTGEN W-B).
 *
 * The audit found: 5 raw clamp() word-hero sizes, a text-h1+text-hero-ja
 * collision on the review glyph front, two dead classes (text-micro, font-jp
 * — no token behind them, so the intended size/font NEVER applied), and
 * learner-read Japanese at the 12px furigana caption floor (board sides,
 * katakana names, post-answer readings). These tests pin the unified
 * content-role typography so none of it drifts back:
 *  - word heroes use the --text-word-hero(-lg) tokens (no raw clamps);
 *  - the review glyph front carries ONE size utility (text-hero-ja);
 *  - dead classes are real tokens now (text-micro=10px, font-jp=JP UI stack);
 *  - studied Japanese reading surfaces sit at ≥ --text-small (14px);
 *  - the furigana floor --furigana-size = max(0.5em, 12px) stays locked.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils';

const root = (p: string) => join(import.meta.dirname, '../../src', p);
const read = (p: string) => readFileSync(root(p), 'utf8');

const tokensCss = read('styles/tokens.css');

describe('ENGINE-NEXTGEN W-B — cn() keeps every custom size token alive', () => {
  it('every --text-* token in tokens.css is registered in the cn() font-size group', () => {
    const utils = read('lib/utils.ts');
    const tokenNames = [...tokensCss.matchAll(/--text-([a-z-]+):/g)].map((m) => m[1]!);
    const missing = tokenNames.filter((t) => !utils.includes(`'${t}'`));
    expect(missing, `cn() drops these custom text tokens: ${missing.join(', ')}`).toEqual([]);
  });

  it('a word-hero class survives a text-color in the same cn() call', () => {
    expect(cn('ja-block', 'text-word-hero font-bold leading-snug text-ink')).toContain('text-word-hero');
    expect(cn('text-micro font-black text-paper')).toContain('text-micro');
  });
});

describe('ENGINE-NEXTGEN W-B — the JP typography tokens', () => {
  it('word-hero / micro / seal / font-jp tokens are defined with the audited values', () => {
    expect(tokensCss).toContain('--text-word-hero: clamp(1.75rem, 7vw, 2.35rem)');
    expect(tokensCss).toContain('--text-word-hero-lg: clamp(2rem, 9vw, 3rem)');
    expect(tokensCss).toContain('--text-micro: 0.625rem');
    expect(tokensCss).toContain('--text-seal-glyph: 2.0625rem');
    expect(tokensCss).toContain('--font-jp: var(--font-ja-ui-loaded');
  });

  it('the furigana readability floor stays locked (50% + 12px minimum)', () => {
    expect(tokensCss).toContain('--furigana-size: max(0.5em, 12px)');
    expect(tokensCss).toContain('--text-ja: 1.0625rem'); // 17px JP body
    expect(tokensCss).toContain('--leading-ja: 1.9'); // ruby-bearing lines
  });
});

describe('W-B — no raw sizes on the audited learner surfaces', () => {
  it('the five word-hero sites use tokens, not raw clamp()', () => {
    for (const f of ['components/curriculum/station-runner.tsx', 'components/curriculum/kana-card.tsx']) {
      const src = read(f);
      expect(src, `${f} still carries a raw clamp`).not.toMatch(/text-\[clamp/);
      expect(src).toContain('text-word-hero');
    }
  });

  it('the review glyph front carries ONE size utility (text-hero-ja alone)', () => {
    const src = read('app/review/review-runner.tsx');
    expect(src).not.toMatch(/text-h1[^"]*text-hero-ja|text-hero-ja[^"]*text-h1/);
    expect(src).toMatch(/text-hero-ja font-black/);
  });

  it('no raw 10px/11px/13px text sizes in the product UI', () => {
    for (const f of ['components/site-nav.tsx', 'components/curriculum/aizen-seal.tsx']) {
      const src = read(f);
      expect(src, `${f} carries a raw px text size`).not.toMatch(/text-\[\d+px\]/);
    }
    // the seal glyphs draw with the token, not the raw 33px
    expect(read('components/curriculum/aizen-seal.tsx')).toContain('var(--text-seal-glyph)');
  });

  it('studied Japanese reading surfaces sit ABOVE the furigana floor', () => {
    // realworld-board sideJa: text-small + the JP font stack
    expect(read('components/curriculum/station-runner.tsx')).toMatch(
      /ja-block shrink-0 text-small text-ink-faint[^"]*" dir="ltr" lang="ja"/,
    );
    // post-answer kana reading: text-small
    expect(read('components/curriculum/exercise-session.tsx')).toMatch(
      /text-small text-ink-soft" dir="ltr" lang="ja">\s*\{ex\.promptJaReading\}/,
    );
    // katakana speaker name: text-small
    expect(read('components/curriculum/dialogue-focus-lines.tsx')).toContain(
      '<span lang="ja" dir="ltr" className="text-small">',
    );
  });

  it('grammar structure tables floor their Japanese runs at the JP body token', () => {
    expect(read('components/curriculum/station-runner.tsx')).toContain('w-full border-collapse text-small ja-instruct');
  });

  it('japanese-sentence ruby lines rely on the .fg-block contract (no raw leading)', () => {
    expect(read('components/patterns/japanese-sentence.tsx')).not.toContain('leading-[2]');
  });
});
