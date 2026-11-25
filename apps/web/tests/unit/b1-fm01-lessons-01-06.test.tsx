// @vitest-environment jsdom
/**
 * B1-REBUILD 2026-11-26 — batch-1 (stations 1–6) regression tests.
 *
 * The batch's QC walk (real browser, desktop + mobile, zero-foundation
 * learner) found four engine-level defect classes; this file pins the fixed
 * laws so no future chapter can regress them:
 *
 *  §۱ «خط N» — the focused-line card's number is the line's REAL dialogue
 *     position and the term is «خط» (the dialogue player's own vocabulary),
 *     never «نوبت {within-block index}» (line 3 displayed as «نوبت 1» while
 *     every rule card around it said «خط ۳»).
 *  §۲ the name tile — the UNPLACED ___NAME___ chip renders the Persian label
 *     «[نامت]» in BOTH chip surfaces (exercise session + character-scene
 *     template-build); the internal convention never crosses to the learner.
 *  §۳ the word-order pattern table lays out LTR — the AはBです slot table
 *     read «です|B|は|A» under the RTL default, contradicting the very rule
 *     it teaches (Japanese reads left-to-right).
 *  §۴/§۵ content laws — no raw L\d line tokens in learner-facing copy, no
 *     Persian↔Latin letter adjacency corruption (the «تipe‌شناختی» class),
 *     and F1/F2 wrong-path feedback never carries the answer key (authored
 *     copy must not lean on the engine's runtime «…» masking).
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import * as React from 'react';

import { DialogueFocusLines } from '@/components/curriculum/dialogue-focus-lines';
import { ExerciseSession } from '@/components/curriculum/exercise-session';
import { getChapter } from '@/modules/curriculum/content';
import { toClientExercise } from '@/modules/curriculum/grading';
import type { ClientExercise } from '@/modules/curriculum/grading';
import type { DialogueFocusLineView } from '@/modules/curriculum/dialogue-focus';
import type { Chapter, Exercise } from '@/modules/curriculum/types';

const chapter = getChapter('first-meeting-01') as Chapter;
const bySlug = new Map(chapter.stations.map((s) => [s.slug, s]));
const exById = new Map(Object.values(chapter.exercises).map((e) => [e.id, e]));

beforeEach(() => cleanup());

/* ────────────────────────── §۱ «خط N» — the focused-line card ────────────────────────── */

const view = (lineNo: number): DialogueFocusLineView => ({
  id: `s-test-l${lineNo}`,
  lineNo,
  speaker: { id: 'chr-miki', nameJa: 'ミキ', nameFa: 'میکی', colorToken: 'speaker-1' },
  tokens: [{ surface: 'こんにちは', reading: 'こんにちは' }],
  reading: 'konnichiwa',
  fa: 'سلام.',
  teaches: [],
});

describe('B1 §۱ — focused-line card: «خط {real position}», one term with the player', () => {
  it('renders the REAL dialogue position (line 3 → «خط ۳»), never «نوبت»', () => {
    const { container } = render(
      <DialogueFocusLines lines={[view(3), view(7)]} audioByLine={{}} audioAvailable={false} />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('خط ۳');
    expect(text).toContain('خط ۷');
    expect(text).not.toContain('نوبت ۱');
    expect(text).not.toContain('نوبت ۲');
  });
});

/* ────────────────────────── §۲ the name tile label ────────────────────────── */

function renderSession(ex: Exercise): void {
  const client = toClientExercise(ex);
  render(
    <ExerciseSession
      chapterSlug="first-meeting-01"
      stationSlug="stn-fm01-03-grammar-desu"
      exercises={[client as ClientExercise]}
      audioByLine={{}}
      audioAvailable={false}
    />,
  );
}

describe('B1 §۲ — the unplaced name tile renders «[نامت]», never ___NAME___', () => {
  it('exercise-session: the produce-template chip surface (real ex-fm01-g1-prod-2)', () => {
    const ex = exById.get('ex-fm01-g1-prod-2')!;
    expect(ex.chips?.some((c) => c.ja === '___NAME___')).toBe(true);
    renderSession(ex);
    // the Persian-labelled tile is reachable…
    expect(screen.getByRole('button', { name: '[نامت]' })).toBeTruthy();
    // …and the internal convention is NOWHERE on screen.
    expect(screen.queryByText('___NAME___')).toBeNull();
    expect(document.body.textContent ?? '').not.toContain('___NAME___');
  });
});

/* ────────────────────────── §۳ the word-order pattern table ────────────────────────── */

describe('B1 §۳ — the AはBです slot table is authored LTR (the Japanese order)', () => {
  it('stn-fm01-03 rule card: dir=ltr on the pattern-slot table', () => {
    const stn3 = bySlug.get('stn-fm01-03-grammar-desu')!;
    const rule = stn3.blocks.find((b) => b.id === 'blk-g1-rule');
    expect(rule && 'structureTable' in rule && rule.structureTable).toBeTruthy();
    const table = (rule as { structureTable: { headers: string[]; dir?: 'ltr' | 'rtl' } }).structureTable;
    // the columns are the pattern's SLOTS — Japanese reads left-to-right.
    expect(table.dir).toBe('ltr');
    expect(table.headers).toEqual(['A (موضوع)', 'は', 'B (هویت)', 'です']);
  });

  it('stn-fm01-04 comparison table stays RTL (Persian headers — the default)', () => {
    const stn4 = bySlug.get('stn-fm01-04-structure')!;
    const rule = stn4.blocks.find((b) => b.id === 'blk-st-rule');
    const table = (rule as { structureTable?: { headers: string[]; dir?: 'ltr' | 'rtl' } }).structureTable;
    expect(table?.dir).toBeUndefined();
  });
});

/* ───────────────────── §۴/§۵ the batch-1 content laws (data level) ───────────────────── */

const STATION_SLUGS = [
  'stn-fm01-01-anchor',
  'stn-fm01-02-vocab',
  'stn-fm01-03-grammar-desu',
  'stn-fm01-04-structure',
  'stn-fm01-05-grammar-qa',
  'stn-fm01-06-expression',
];

/** Exercises referenced by the batch's stations, in walk order. */
function stationExercises(slug: string): Exercise[] {
  const stn = bySlug.get(slug)!;
  const ids: string[] = [];
  for (const b of stn.blocks) {
    if (b.kind === 'exercise' && 'exerciseIds' in b) ids.push(...b.exerciseIds);
  }
  return ids.map((id) => exById.get(id)!).filter(Boolean);
}

/** Every learner-facing Persian string of the batch (stations + items + exercises). */
function learnerFacingStrings(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const push = (where: string, text: string | undefined) => {
    if (typeof text === 'string' && text.length) out.push({ where, text });
  };
  for (const slug of STATION_SLUGS) {
    const stn = bySlug.get(slug)!;
    push(`${slug}/titleFa`, stn.titleFa);
    push(`${slug}/objectiveFa`, stn.objectiveFa);
    for (const b of stn.blocks) {
      const w = `${slug}/${b.id}`;
      if ('titleFa' in b && b.titleFa) push(`${w}/titleFa`, b.titleFa);
      if ('bodyFa' in b && b.bodyFa) push(`${w}/bodyFa`, b.bodyFa);
      if (b.kind === 'rule-card') {
        push(`${w}/bodyFa`, b.bodyFa);
        if (b.persianBridgeFa) push(`${w}/persianBridgeFa`, b.persianBridgeFa);
        if (b.honestyLabelFa) push(`${w}/honestyLabelFa`, b.honestyLabelFa);
      }
      if (b.kind === 'example-set') {
        for (const ex of b.examples) {
          push(`${w}/${ex.id}/fa`, ex.fa);
          push(`${w}/${ex.id}/whyFa`, ex.whyFa);
          if (ex.selfExplainFa) push(`${w}/${ex.id}/selfExplainFa`, ex.selfExplainFa);
        }
      }
      if (b.kind === 'exercise') {
        for (const id of b.exerciseIds) {
          const x = exById.get(id);
          if (!x) continue;
          push(`${w}/${id}/promptFa`, x.promptFa);
          if (x.feedback) {
            push(`${w}/${id}/f1`, x.feedback.f1Fa);
            push(`${w}/${id}/f2`, x.feedback.f2HintFa);
            push(`${w}/${id}/f3`, x.feedback.f3ExplainFa);
          }
        }
      }
    }
  }
  for (const w of chapter.words) push(`word/${w.id}`, w.noteFa);
  for (const e of chapter.expressions) {
    push(`expr/${e.id}/functionFa`, e.functionFa);
    push(`expr/${e.id}/replyFa`, e.replyFa);
    if (e.taarofNoteFa) push(`expr/${e.id}/taarofNoteFa`, e.taarofNoteFa);
  }
  return out;
}

describe('B1 §۴ — no raw line tokens, no script-corruption in learner copy', () => {
  it('no raw «L\d» line tokens (the dialogue player term is «خط N»)', () => {
    const offenders = learnerFacingStrings().filter(({ text }) => /\bL\d+\b/.test(text));
    expect(offenders.map((o) => o.where)).toEqual([]);
  });

  it('no Persian↔Latin letter ADJACENCY corruption (the «تipe‌شناختی» class)', () => {
    const offenders = learnerFacingStrings().filter(({ text }) =>
      /[\u0621-\u064A][A-Za-z]|[A-Za-z][\u0621-\u064A]/.test(text),
    );
    expect(offenders.map((o) => `${o.where}: ${o.text.slice(0, 60)}`)).toEqual([]);
  });
});

describe('B1 §۵ — F1/F2 wrong-path feedback never carries the answer key', () => {
  /** Mirrors grading.ts correctKeyTexts (the runtime safety net stays). */
  function keyTexts(ex: Exercise): string[] {
    const texts: string[] = [];
    const correct = ex.options?.find((o) => o.id === ex.correctOptionId);
    if (correct) texts.push(correct.label);
    for (const ids of [ex.correctOrder ?? [], ex.acceptedChipOrder ?? []]) {
      for (const id of ids) {
        const c = ex.chunks?.find((x) => x.id === id) ?? ex.chips?.find((x) => x.id === id);
        if (c) texts.push(c.ja);
      }
    }
    return texts.filter((t) => t && t !== '___NAME___' && !t.includes('[نام]'));
  }

  it('every batch-1 exercise: f1/f2 contain none of the key texts (authored, pre-mask)', () => {
    const offenders: string[] = [];
    for (const slug of STATION_SLUGS) {
      for (const ex of stationExercises(slug)) {
        const keys = keyTexts(ex);
        for (const [lvl, line] of [
          ['f1', ex.feedback?.f1Fa],
          ['f2', ex.feedback?.f2HintFa],
        ] as const) {
          if (!line) continue;
          for (const k of keys) {
            if (k.length >= 2 && line.includes(k)) offenders.push(`${ex.id}/${lvl} carries ${k}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

/* ───────────────────── §۶ walk sanity — the batch still completes ───────────────────── */

describe('B1 §۶ — batch data integrity (every referenced exercise resolves)', () => {
  it('all station-referenced exercise ids exist in the chapter bank', () => {
    const missing: string[] = [];
    for (const slug of STATION_SLUGS) {
      const stn = bySlug.get(slug)!;
      for (const b of stn.blocks) {
        if (b.kind === 'exercise' && 'exerciseIds' in b) {
          for (const id of b.exerciseIds) if (!exById.has(id)) missing.push(`${slug}/${id}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
