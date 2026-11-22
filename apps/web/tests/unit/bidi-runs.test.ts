/**
 * HANASO — bidi run engine regression tests (ENGINE-NEXTGEN W-A).
 *
 * Pins the shared mixed-direction contract the whole product renders through:
 *  - Persian prose arrows point at the NEXT-read item (right-pointing glyphs
 *    flip in RTL context; symmetric arrows pass through);
 *  - LTR runs (kana pairs, Latin sequences, dates) keep their arrows verbatim;
 *  - Japanese / Latin / number runs are isolated from the RTL flow;
 *  - determinism: same input → same segments.
 */
import { describe, expect, it } from 'vitest';

import { flipArrowsRtl, segmentForDisplay } from '@/lib/bidi-runs';

const join = (s: string) =>
  segmentForDisplay(s)
    .map((seg) => (seg.dir === 'ltr' ? `\u2066${seg.text}\u2069` : seg.text))
    .join('');

describe('semantic arrows — RTL Persian prose points at the next-read item', () => {
  it('a Persian sequence arrow flips (→ becomes ←)', () => {
    const segs = segmentForDisplay('سلام → معرفی → پرسش');
    expect(segs.some((s) => s.text.includes('\u2190'))).toBe(true); // ← present
    expect(segs.some((s) => s.text.includes('→'))).toBe(false); // → gone
    // every segment is RTL prose here
    expect(segs.every((s) => s.dir === 'rtl')).toBe(true);
  });

  it('already-left arrows and symmetric arrows stay untouched in RTL', () => {
    expect(flipArrowsRtl('سلام ← معرفی')).toBe('سلام ← معرفی');
    expect(flipArrowsRtl('رفت ⇄ برگشت')).toBe('رفت ⇄ برگشت');
    expect(flipArrowsRtl('A ↔ B')).toBe('A ↔ B');
  });

  it('an arrow between a kana island and Persian gloss flips (bidi N1: mixed sides → paragraph RTL)', () => {
    // «く+う → «کوو»» — kana run is LTR, Persian gloss is RTL; the arrow sits
    // between an L and an R strong → paragraph RTL → must point LEFT.
    const segs = segmentForDisplay('く+う → «کوو»');
    const arrows = segs.flatMap((s) => [...s.text]).filter((c) => c === '→' || c === '←');
    expect(arrows).toEqual(['\u2190']);
  });

  it('Persian-letter kana-rule pairs flip (ک→گ stays a Persian relation)', () => {
    const segs = segmentForDisplay('゛ = واک‌دار کردن صامت (ک→گ، س→ز)');
    const flat = segs.map((s) => s.text).join('');
    expect(flat).not.toContain('→');
    expect(flat).toContain('←');
  });
});

describe('semantic arrows — LTR runs keep verbatim direction', () => {
  it('kana↔kana pairs keep →', () => {
    const segs = segmentForDisplay('そ → ぞ');
    const ja = segs.find((s) => s.dir === 'ltr' && s.lang === 'ja');
    expect(ja?.text).toContain('→');
  });

  it('dakuten chains inside Japanese runs keep their arrows', () => {
    const segs = segmentForDisplay('は → ば (゛) → ぱ (゜)');
    const flat = segs.map((s) => s.text).join('');
    expect(flat).toContain('→'); // the whole chain is one ltr ja run
  });

  it('all-Latin lesson-code sequences keep →', () => {
    const segs = segmentForDisplay('L1-L2 → L3-L4 → L5-L8');
    expect(segs.some((s) => s.dir === 'ltr' && s.text.includes('→'))).toBe(true);
    expect(segs.some((s) => s.text.includes('←'))).toBe(false);
  });
});

describe('run isolation — mixed lines keep their LTR islands intact', () => {
  it('a station title isolates the Japanese pattern run', () => {
    const segs = segmentForDisplay('الگوی هویت: AはBです');
    const ja = segs.find((s) => s.lang === 'ja');
    expect(ja?.dir).toBe('ltr');
    expect(ja?.text).toBe('AはBです');
  });

  it('mixed Japanese + Persian gloss with colon and parens stays segmentable', () => {
    const segs = segmentForDisplay('こんにちは (سلام) → はじめまして (بازدید اول)');
    // Japanese runs isolated; Persian gloss runs RTL; the arrow between the
    // two Japanese islands resolves by its Persian neighbors → RTL → flipped
    const flat = segs.map((s) => s.text).join('');
    expect(flat).not.toContain('\u2192');
  });

  it('a date inside Persian prose becomes ONE ltr number isolate', () => {
    const segs = segmentForDisplay('تاریخ 2026-11-01 ثبت شد');
    const date = segs.find((s) => /^2026-11-01$/.test(s.text));
    expect(date?.dir).toBe('ltr');
    expect(date?.lang).toBeUndefined();
  });

  it('determinism — repeated segmentation is byte-identical', () => {
    const s = 'واژهٔ بومی → هیراگانا (漢字) و L1 → مرحلهٔ بعد در 2026-11';
    expect(segmentForDisplay(s)).toEqual(segmentForDisplay(s));
  });
});

describe('empty + edge inputs', () => {
  it('empty string → no segments', () => {
    expect(segmentForDisplay('')).toEqual([]);
  });
  it('pure Persian → single rtl segment, arrows flipped', () => {
    const segs = segmentForDisplay('خوشبختم → معرفی');
    expect(segs).toHaveLength(1);
    expect(segs[0]!.dir).toBe('rtl');
    expect(segs[0]!.text).toBe('خوشبختم ← معرفی');
  });
  it('pure Japanese → single ja ltr segment verbatim', () => {
    const segs = segmentForDisplay('せんせい → せんせ');
    expect(segs).toHaveLength(1);
    expect(segs[0]!.lang).toBe('ja');
    expect(segs[0]!.text).toBe('せんせい → せんせ');
  });
});
