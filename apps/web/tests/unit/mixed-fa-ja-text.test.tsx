// @vitest-environment jsdom
/**
 * HANASO — MixedFaJaText render contract tests (ENGINE-NEXTGEN W-A).
 *
 * Pins the PRODUCT-WIDE mixed-direction renderer over the shared bidi engine:
 *  - every LTR run (Japanese / Latin / numbers) renders as a <bdi dir="ltr">
 *    island, Japanese runs with lang="ja" + the ja-block font stack;
 *  - RTL prose keeps its Persian flow with arrows pointing at the next-read
 *    item (→ flipped to ←);
 *  - the exercise feedback ladder copy renders through the SAME engine
 *    (previously plain text — the mixed lines scrambled).
 */
import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { MixedFaJaText } from '@/components/curriculum/mixed-fa-ja-text';

const markup = (text: string) => renderToStaticMarkup(React.createElement(MixedFaJaText, { text }));

describe('MixedFaJaText — run isolation (product-wide renderer)', () => {
  it('isolates a Japanese run inside a Persian title with lang=ja + ja-block', () => {
    const html = markup('الگوی هویت: AはBです');
    expect(html).toContain('<bdi dir="ltr" lang="ja"');
    expect(html).toContain('class="ja-block"');
    expect(html).toContain('AはBです');
  });

  it('isolates a Latin romaji run WITHOUT the Japanese font stack', () => {
    const html = markup('خوانش لاتین: watashi است');
    expect(html).toContain('<bdi dir="ltr"');
    expect(html).not.toContain('class="ja-block"');
  });

  it('isolates a date inside Persian prose as one ltr island', () => {
    const html = markup('تاریخ 2026-11-01 ثبت شد');
    expect(html).toMatch(/<bdi dir="ltr"[^>]*>2026-11-01<\/bdi>/);
  });

  it('pure Persian renders with no islands (zero overhead)', () => {
    const html = markup('جملهٔ کاملاً فارسی');
    expect(html).not.toContain('<bdi');
  });
});

describe('MixedFaJaText — semantic arrows', () => {
  it('flips a Persian-sequence arrow to point at the next-read item', () => {
    const html = markup('ترتیب: سلام → معرفی → پرسش');
    expect(html).not.toContain('→');
    expect(html).toContain('←');
  });

  it('keeps kana-pair arrows verbatim inside the Japanese island', () => {
    const html = markup('القاعده: そ → ぞ');
    const bdi = /<bdi dir="ltr" lang="ja"[^>]*>([^<]+)<\/bdi>/.exec(html);
    expect(bdi?.[1]).toBe('そ → ぞ'); // one verbatim LTR notation island
  });

  it('keeps an all-Latin arrow sequence verbatim', () => {
    const html = markup('مسیر L1-L2 → L3-L4 را برو');
    expect(html).toContain('→');
    expect(html).not.toContain('←');
  });
});

describe('the feedback ladder copy renders through the shared engine', () => {
  it('a mixed Persian+Japanese+arrow feedback line is segmented (bidi gap fix)', () => {
    // previously this text rendered as a plain <p> child and scrambled;
    // the feedback panel now wraps feedbackFa in MixedFaJaText — pinned by
    // asserting the engine handles exactly this shape.
    const html = markup('ترتیب: موضوع+も → هویت → です → か');
    expect(html).toContain('も');
    expect(html).not.toContain('→');
    expect(html).toContain('←');
    expect(html).toContain('<bdi');
  });
});
