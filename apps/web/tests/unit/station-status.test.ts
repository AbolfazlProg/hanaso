/**
 * HANASO — station-status visual distinction regression tests (ENGINE-NEXTGEN W-C).
 *
 * The audit found: start vs continue markers nearly identical (icon glyph
 * only), screen readers getting NO state (markers aria-hidden, only locked
 * rows carried «قفل»), locked section-status TEXT at ink-faint (3.6:1 — the
 * token is reserved for non-text hairlines), catalog in_progress/ready chips
 * text+color only, and a checkmark glyph on REMEDIATION (not-completed)
 * targets. These tests pin the shared distinctions:
 *  - continue = FILLED indigo marker (start stays outline);
 *  - non-locked rows carry the state in their accessible name;
 *  - locked status text at ink-soft (AA), icon may stay faint;
 *  - every catalog chip carries an icon;
 *  - remediation rows repeat, not check.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = (p: string) => join(import.meta.dirname, '../../src', p);
const read = (p: string) => readFileSync(root(p), 'utf8');

describe('W-C — station row markers', () => {
  const sj = read('components/curriculum/section-journey.tsx');

  it('continue is a FILLED indigo marker — visually distinct from outline start', () => {
    const continueBlock = /case 'continue':[\s\S]*?case 'start':/.exec(sj)![0];
    expect(continueBlock).toContain('border-indigo bg-indigo text-paper');
    const startBlock = /case 'start':[\s\S]*?default:/.exec(sj)![0];
    expect(startBlock).toContain('border-ink bg-paper text-ink');
  });

  it('completed is the filled SUCCESS-GREEN circle + check (JOURNEY-FIX 2026-11-23 §۲ — green reads as done at reading distance, distinct from the indigo in-progress and the ink outline start)', () => {
    const reviewBlock = /case 'review':[\s\S]*?case 'continue':/.exec(sj)![0];
    expect(reviewBlock).toContain('border-success bg-success text-paper');
    expect(reviewBlock).toContain('data-row-marker="done"');
  });

  it('locked keeps dashed + faint + flash (untouched access semantics)', () => {
    const lockBlock = /default:[\s\S]*?^  }/m.exec(sj)![0];
    expect(lockBlock).toContain('border-dashed border-ink-faint');
  });

  it('non-locked rows carry the access state in their accessible name (WCAG 1.3.1)', () => {
    expect(sj).toContain('aria-label={`${row.titleFa} — ${');
    expect(sj).toContain('fa.curriculum.rowReview');
    expect(sj).toContain('fa.curriculum.rowContinue');
    expect(sj).toContain('fa.curriculum.rowStart');
  });
});

describe('W-C — status text contrast', () => {
  it('the locked section-status TEXT uses ink-soft (AA), not the hairline-only ink-faint', () => {
    const sj = read('components/curriculum/section-journey.tsx');
    const statusLine = sj.match(/section\.status === 'locked'[\s\S]{0,420}/)![0];
    expect(statusLine).toContain('text-ink-soft');
  });
});

describe('W-C — catalog chips', () => {
  it('in_progress and ready chips carry icons (never text+color only)', () => {
    const jh = read('components/curriculum/journey-home.tsx');
    const inProgress = jh.match(/row\.status === 'in_progress'[\s\S]{0,700}/)![0];
    expect(inProgress).toMatch(/<Play[^>]*aria-hidden/);
    const ready = jh.slice(jh.indexOf('chapterCatalogReadyChip') - 320, jh.indexOf('chapterCatalogReadyChip') + 40);
    expect(ready).toMatch(/<Compass[^>]*aria-hidden/);
  });
});

describe('W-C — remediation semantics', () => {
  it('remediation rows use a REPEAT glyph, not a checkmark', () => {
    const mg = read('components/curriculum/mastery-gate.tsx');
    const from = mg.indexOf('(result.remediationStations ?? [])');
    const rem = mg.slice(from, mg.indexOf('</ul>', from));
    expect(rem).toMatch(/<Repeat2[^>]*aria-hidden/);
    expect(rem).not.toMatch(/<CircleCheck[^>]*aria-hidden/);
  });
});

describe('W-C — the owner preview panel obeys the token policy', () => {
  it('no raw hex colors remain in the learn page', () => {
    const src = read('app/learn/page.tsx');
    expect(src).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });
});
