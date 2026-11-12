/**
 * HANASO — TASK-LEARNING-14 rule-teaching content gates.
 *
 * The golden rule made mechanical: «no question or example may depend on
 * untaught knowledge». These tests prove the six TL-14 gates CATCH violations
 * (mutation fixtures over the real chapter — each mutation is a bug that
 * shipped in TL-13 and must never ship again) and that the rewritten slide
 * decks satisfy the structural contracts on the real data.
 */
import { describe, expect, it } from 'vitest';
import { getChapter } from '@/modules/curriculum/content';
import { LEVELS_BY_CODE } from '@/modules/curriculum/content/levels';
import { validateChapter } from '@/modules/curriculum/validation';
import { toClientStation } from '@/modules/curriculum/client-transport';
import type { Chapter, Station } from '@/modules/curriculum/types';

const chapter = getChapter('kana-foundation-01')!;
const level = LEVELS_BY_CODE[chapter.levelCode]!;

function stationBySlug(slug: string): Station {
  const s = chapter.stations.find((x) => x.slug === slug);
  if (!s) throw new Error(`station ${slug} missing`);
  return s;
}

/** Deep-mutated copy of the real chapter (the real one stays untouched). */
function mutatedChapter(fn: (ch: Chapter) => void): Chapter {
  const copy = structuredClone(chapter);
  fn(copy);
  return copy;
}

function violationsOf(ch: Chapter): string[] {
  return validateChapter(ch, level).map((v) => `${v.rule} :: ${v.message}`);
}

describe('TL-14 gates — the golden rule is mechanical (mutation fixtures)', () => {
  it('GLYPH-BUDGET: an untaught glyph in a slide word is rejected', () => {
    const v = violationsOf(
      mutatedChapter((ch) => {
        const h4 = ch.stations.find((s) => s.slug === 'stn-kana-h4')!;
        const step = h4.blocks.find((b) => b.id === 'blk-stn-kana-h4-step-ie');
        if (step?.kind !== 'rule-step' || !step.word) throw new Error('fixture block missing');
        step.word.ja = 'いぬ'; // ぬ is taught at H8 — three stations AFTER H4
      }),
    );
    expect(v.some((x) => x.includes('GLYPH-BUDGET') && x.includes('ぬ'))).toBe(true);
  });

  it('GLYPH-BUDGET: an untaught glyph in an exercise OPTION is rejected (audit U1)', () => {
    const v = violationsOf(
      mutatedChapter((ch) => {
        const ex = ch.exercises['ex-kana-h4-warm-1']!;
        if (!ex.options) throw new Error('no options');
        ex.options[2]!.label = 'ち'; // た-row is H9 — untaught at H4
      }),
    );
    expect(v.some((x) => x.includes('GLYPH-BUDGET') && x.includes('opt'))).toBe(true);
  });

  it('GLYPH-BUDGET: a rule mark before its teaching unit is rejected (chōonpu at H13)', () => {
    const v = violationsOf(
      mutatedChapter((ch) => {
        const h13 = ch.stations.find((s) => s.slug === 'stn-kana-h13')!;
        const step = h13.blocks.find((b) => b.id === 'blk-stn-kana-h13-step-zasshi');
        if (step?.kind !== 'rule-step' || !step.word) throw new Error('fixture block missing');
        step.word.ja = 'ざっしー'; // ー belongs to K8 (order 24) — H13 is order 14
      }),
    );
    expect(v.some((x) => x.includes('GLYPH-BUDGET') && x.includes('choonpu'))).toBe(true);
  });

  it('GLYPH-BUDGET: the H6 first-look (やゆよ declared in introducesGlyphs) is LEGAL at H6', () => {
    // the real chapter already passes; assert specifically that H6's own table
    // options (よ/や in the きよう contrast) do NOT raise GLYPH-BUDGET.
    const v = violationsOf(chapter);
    expect(v.filter((x) => x.includes('GLYPH-BUDGET'))).toEqual([]);
  });

  it('TRANSCRIPT-CONSISTENT: two readings of one word are rejected (audit Q1)', () => {
    const v = violationsOf(
      mutatedChapter((ch) => {
        const h4 = ch.stations.find((s) => s.slug === 'stn-kana-h4')!;
        const contrast = h4.blocks.find((b) => b.id === 'blk-stn-kana-h4-contrast-ie');
        if (contrast?.kind !== 'rule-contrast') throw new Error('fixture block missing');
        contrast.a.readingFa = 'خوانش دیگر'; // いえ already reads «ایه» elsewhere
      }),
    );
    expect(v.some((x) => x.includes('TRANSCRIPT-CONSISTENT') && x.includes('いえ'))).toBe(true);
  });

  /*
   * TASK-HANASO-20 (BUG-003): the shipped きょう contradiction — three teaching
   * blocks + promptJaReading said «کیو» while the ONLY accepted decode answer
   * was «کیوو» (answer-as-taught = wrong). The gate now compares the correct
   * OPTION LABEL with every taught reading, so this class can never ship again.
   */
  it('TRANSCRIPT-CONSISTENT: a decode option label disagreeing with the taught reading is rejected (BUG-003)', () => {
    const v = violationsOf(
      mutatedChapter((ch) => {
        const ex = ch.exercises['ex-kana-h6-dec-3']!;
        // flip the taught reading to the OLD contradictory value
        if (ex.promptJaReading === undefined) throw new Error('fixture exercise missing');
        ex.promptJaReading = 'کیو'; // taught/canonical now says کیوو elsewhere + option says کیوو
      }),
    );
    expect(v.some((x) => x.includes('TRANSCRIPT-CONSISTENT') && x.includes('きょう') && x.includes('ex-kana-h6-dec-3'))).toBe(
      true,
    );
  });

  it('TRANSCRIPT-CONSISTENT: the correct-option label of a decode is itself a compared reading (BUG-003, direct)', () => {
    const v = violationsOf(
      mutatedChapter((ch) => {
        const ex = ch.exercises['ex-kana-h6-dec-3']!;
        if (!ex.options) throw new Error('no options');
        // swap the correct option label to a DIFFERENT reading — the exercise
        // key now disagrees with the taught reading of きょう (کیوو)
        const correct = ex.options.find((o) => o.id === ex.correctOptionId);
        if (!correct) throw new Error('no correct option');
        correct.label = '«کیو»';
      }),
    );
    expect(v.some((x) => x.includes('TRANSCRIPT-CONSISTENT') && x.includes('きょう'))).toBe(true);
  });

  it('RULE-LISTENING-SHAPE: a 3-option rule-listening pair is rejected (MCQ gap closed)', () => {
    const v = violationsOf(
      mutatedChapter((ch) => {
        const ex = ch.exercises['ex-kana-h4-lis-1']!;
        if (!ex.options) throw new Error('no options');
        ex.options.push({ id: 'c', label: 'いえいえ' });
      }),
    );
    expect(v.some((x) => x.includes('MCQ-THREE') && x.includes('ex-kana-h4-lis-1'))).toBe(true);
  });

  it('PASSIVE-RUN: three consecutive receptive slides are rejected (audit S1/S4)', () => {
    const v = violationsOf(
      mutatedChapter((ch) => {
        const h4 = ch.stations.find((s) => s.slug === 'stn-kana-h4')!;
        // replace the interactive contrast with a passive explain slide →
        // prereq, notice, step, explain = 4 receptive blocks in a row
        const idx = h4.blocks.findIndex((b) => b.id === 'blk-stn-kana-h4-contrast-ie');
        h4.blocks[idx] = {
          kind: 'rule-step',
          id: 'blk-stn-kana-h4-fixture-passive',
          role: 'explain',
          bodyFa: 'متن خواندنی بدون تعامل — سه‌تای پیاپی ممنوع.',
        };
      }),
    );
    expect(v.some((x) => x.includes('PASSIVE-RUN') && x.includes('stn-kana-h4'))).toBe(true);
  });

  it('PREREQ-DATA: a rule-deck station without introducesGlyphs is rejected', () => {
    const v = violationsOf(
      mutatedChapter((ch) => {
        const h4 = ch.stations.find((s) => s.slug === 'stn-kana-h4')!;
        delete h4.introducesGlyphs;
      }),
    );
    expect(v.some((x) => x.includes('PREREQ-DATA') && x.includes('stn-kana-h4'))).toBe(true);
  });

  it('SKL-013: rule-slide ask answers never cross the client boundary', () => {
    const h4 = stationBySlug('stn-kana-h4');
    const client = toClientStation(h4);
    const json = JSON.stringify(client);
    expect(json).not.toContain('correctOptionId');
    expect(json).not.toContain('revealFa');
    // the ask itself survives (question + options render; the answer does not)
    const contrast = client.blocks.find((b) => b.id === 'blk-stn-kana-h4-contrast-ie');
    expect(contrast && 'ask' in contrast && contrast.ask).toBeDefined();
  });
});

describe('TL-14 slide decks — structural contracts on the shipped data', () => {
  const ruleStations = [
    'stn-kana-h4',
    'stn-kana-h5',
    'stn-kana-h6',
    'stn-kana-h7',
    'stn-kana-h13',
    'stn-kana-h15',
    'stn-kana-k8',
  ] as const;

  it.each(ruleStations)('%s is a slide deck: prereq first, no dense rule-card before the examples', (slug) => {
    const s = stationBySlug(slug);
    const kinds = s.blocks.map((b) => b.kind);
    // the rule teaching is decomposed: at least 4 slides between warmup and wrap-up
    const slideCount = kinds.filter((k) => k === 'rule-step' || k === 'rule-contrast' || k === 'rule-prereq').length;
    expect(slideCount, `${slug} slide count`).toBeGreaterThanOrEqual(4);
    // the reference rule-card (if present) comes AFTER the interactive slides —
    // the table is a summary of EXPERIENCED examples, not a wall of text first.
    const firstInteractive = kinds.findIndex((k) => k === 'rule-contrast' || k === 'rule-step');
    const ruleCardAt = kinds.indexOf('rule-card');
    if (ruleCardAt >= 0) {
      expect(ruleCardAt).toBeGreaterThan(firstInteractive);
    }
    // every deck opens its rule teaching with a prerequisites slide
    expect(kinds).toContain('rule-prereq');
  });

  it('H6 declares the big ゃゅょ counterparts (やゆよ) as first-look introductions', () => {
    expect(stationBySlug('stn-kana-h6').introducesGlyphs).toEqual(['や', 'ゆ', 'よ']);
    const prereq = stationBySlug('stn-kana-h6').blocks.find((b) => b.kind === 'rule-prereq');
    expect(prereq).toBeDefined();
  });

  it('H4 assessment stays fresh: the control word あさ never appears in a teaching slide', () => {
    const h4 = stationBySlug('stn-kana-h4');
    const teachingWords = h4.blocks
      .filter((b) => b.kind !== 'exercise')
      .flatMap((b) => {
        if (b.kind === 'rule-contrast') return [b.a.ja, b.b.ja];
        if (b.kind === 'rule-step' && b.word) return [b.word.ja];
        if (b.kind === 'example-set') return b.examples.map((e) => e.ja);
        if (b.kind === 'rule-prereq') return b.items.flatMap((i) => (i.word ? [i.word] : []));
        return [];
      });
    expect(teachingWords).not.toContain('あさ');
    expect(teachingWords).not.toContain('くうき'); // asm-2's fresh word stays fresh
  });

  it('exercise blocks are small (≤5 items) across the rewritten decks — no test walls', () => {
    for (const slug of ruleStations) {
      for (const b of stationBySlug(slug).blocks) {
        if (b.kind === 'exercise') {
          expect(b.exerciseIds.length, `${slug}/${b.id}`).toBeLessThanOrEqual(5);
        }
      }
    }
  });

  it('every rule deck keeps a listening/retrieval exercise with real-audio pairs (S9-S13)', () => {
    for (const slug of ruleStations) {
      const s = stationBySlug(slug);
      const hasListening = s.blocks.some(
        (b) => b.kind === 'exercise' && b.exerciseIds.some((id) => chapter.exercises[id]?.type === 'rule-listening'),
      );
      expect(hasListening, `${slug} has a rule-listening exercise`).toBe(true);
    }
  });
});
