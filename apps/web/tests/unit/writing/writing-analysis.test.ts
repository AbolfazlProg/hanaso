/**
 * HANASO — handwriting analysis layer tests (TASK-LEARNING-07 / DD-105/DD-106).
 *
 * The analysis layer is the HANASO-proprietary geometry judge on top of the
 * Hanzi Writer quiz: it must be FAIR (correct-but-imperfect strokes pass),
 * HONEST (inconclusive evidence → `uncertain`, never a fabricated fail) and
 * explain rejections (direction / form / position — the Persian feedback
 * ladder). These tests pin all of that with synthetic paths in the 1024²
 * char space.
 */
import { describe, expect, it } from 'vitest';
import {
  BORDERLINE_BAND,
  classifyRejection,
  dimensionsFrom,
  evaluateStroke,
  hanziWriterLeniency,
  resample,
  strokeMetrics,
  verdictFrom,
  type Point,
} from '@/modules/writing';

/** A straight horizontal stroke median in char space (y down). */
const H_MEDIAN: Point[] = [
  { x: 100, y: 800 },
  { x: 512, y: 800 },
  { x: 900, y: 800 },
];

describe('resample', () => {
  it('preserves endpoints and count for a multi-point path', () => {
    const out = resample(H_MEDIAN, 16);
    expect(out).toHaveLength(16);
    expect(out[0]!.x).toBeCloseTo(100);
    expect(out[15]!.x).toBeCloseTo(900);
    // 16 points ⇒ 15 equal arc-length intervals: the 8th point sits at 8/15 of the path
    expect(out[8]!.x).toBeCloseTo(100 + (8 / 15) * 800);
  });

  it('handles the degenerate single-point and zero-length paths without throwing', () => {
    expect(resample([{ x: 5, y: 5 }], 8)).toHaveLength(8);
    expect(resample([], 8)).toEqual([]);
    const flat = resample(
      [
        { x: 7, y: 7 },
        { x: 7, y: 7 },
      ],
      8,
    );
    expect(flat).toHaveLength(8);
    expect(flat.every((p) => p.x === 7 && p.y === 7)).toBe(true);
  });
});

describe('strokeMetrics (fairness geometry)', () => {
  it('scores a copy of the median at 1.0 on every axis', () => {
    const m = strokeMetrics(H_MEDIAN, H_MEDIAN);
    expect(m.direction).toBeCloseTo(1);
    expect(m.shape).toBeCloseTo(1);
    expect(m.position).toBeCloseTo(1);
    expect(m.overall).toBeCloseTo(1);
  });

  it('keeps a slightly wobbly correct stroke well above the accept line', () => {
    const wobble: Point[] = H_MEDIAN.map((p, i) => ({ x: p.x, y: p.y + (i % 2 === 0 ? 14 : -14) }));
    const m = strokeMetrics(wobble, H_MEDIAN);
    expect(m.overall).toBeGreaterThan(0.65); // teaching + standard accept
  });

  it('is placement-FAIR: a displaced-but-perfectly-shaped stroke keeps shape at 1.0', () => {
    const moved = H_MEDIAN.map((p) => ({ x: p.x, y: p.y - 300 }));
    const m = strokeMetrics(moved, H_MEDIAN);
    expect(m.direction).toBeCloseTo(1);
    expect(m.shape).toBeCloseTo(1); // centroid-aligned shape ignores placement
    expect(m.position).toBeLessThan(0.5); // placement lives on the position axis only
  });

  it('penalizes a REVERSED stroke on the direction axis (order/direction signal)', () => {
    const reversed: Point[] = [...H_MEDIAN].reverse();
    const m = strokeMetrics(reversed, H_MEDIAN);
    expect(m.direction).toBeLessThan(0.1);
    expect(m.overall).toBeLessThan(0.1);
  });

  it('penalizes a stroke drawn in the wrong place on the position axis', () => {
    const moved = H_MEDIAN.map((p) => ({ x: p.x, y: p.y - 600 }));
    const m = strokeMetrics(moved, H_MEDIAN);
    expect(m.position).toBeLessThan(0.5);
    expect(m.overall).toBeLessThan(0.5);
  });

  it('penalizes a wrong shape (vertical instead of horizontal) on the shape axis', () => {
    const vertical: Point[] = [
      { x: 100, y: 200 },
      { x: 100, y: 800 },
    ];
    const m = strokeMetrics(vertical, H_MEDIAN);
    expect(m.shape).toBeLessThan(0.6);
  });
});

describe('evaluateStroke (accept + honest error classification)', () => {
  it('accepts a near-copy at every leniency stage', () => {
    for (const leniency of ['teaching', 'standard', 'strict'] as const) {
      const ev = evaluateStroke(H_MEDIAN, H_MEDIAN, leniency);
      expect(ev.accepted).toBe(true);
      expect(ev.errorKind).toBeNull();
    }
  });

  it('classifies a reversed stroke as a direction error', () => {
    const ev = evaluateStroke([...H_MEDIAN].reverse(), H_MEDIAN, 'standard');
    expect(ev.accepted).toBe(false);
    expect(ev.errorKind).toBe('direction');
  });

  it('classifies a displaced stroke as a position error (not form)', () => {
    const moved = H_MEDIAN.map((p) => ({ x: p.x, y: p.y - 300 }));
    const ev = evaluateStroke(moved, H_MEDIAN, 'standard');
    expect(ev.accepted).toBe(false);
    expect(ev.errorKind).toBe('position');
  });

  it('classifies a wrong-shape stroke as a form error', () => {
    // L-shaped path: right half matches, then bends far away — shape diverges
    const bent: Point[] = [
      { x: 100, y: 800 },
      { x: 500, y: 800 },
      { x: 950, y: 300 },
    ];
    const ev = evaluateStroke(bent, H_MEDIAN, 'standard');
    expect(ev.accepted).toBe(false);
    expect(ev.errorKind).toBe('form');
  });

  it('answers `uncertain` (never a fabricated fail) when every axis is borderline', () => {
    // the honesty rule is pinned at the metrics level via classifyRejection: all
    // three axes within BORDERLINE_BAND of the floor ⇒ inconclusive evidence.
    const floor = 0.3; // standard axisFloor
    const borderline = { direction: floor, shape: floor + 0.05, position: floor - 0.05, overall: 0.05 };
    expect(classifyRejection(borderline, 'standard')).toBe('uncertain');
    // one clearly-broken axis ⇒ a concrete diagnosis is owed
    const positional = { direction: 0.95, shape: 0.9, position: 0.05, overall: 0.05 };
    expect(classifyRejection(positional, 'standard')).toBe('position');
    const directional = { direction: 0.05, shape: 0.9, position: 0.9, overall: 0.05 };
    expect(classifyRejection(directional, 'standard')).toBe('direction');
    // just OUTSIDE the band on the good side ⇒ not uncertain
    const aboveBand = { direction: 0.9, shape: floor + BORDERLINE_BAND + 0.02, position: 0.9, overall: 0.5 };
    expect(classifyRejection(aboveBand, 'standard')).not.toBe('uncertain');
  });

  it('the leniency ladder only ever loosens, never tightens (DD-106)', () => {
    const imperfect = H_MEDIAN.map((p, i) => ({ x: p.x, y: p.y + (i % 2 === 0 ? 160 : -55) }));
    const teaching = evaluateStroke(imperfect, H_MEDIAN, 'teaching').accepted;
    const standard = evaluateStroke(imperfect, H_MEDIAN, 'standard').accepted;
    const strict = evaluateStroke(imperfect, H_MEDIAN, 'strict').accepted;
    expect(teaching).toBe(true);
    expect(standard).toBe(false); // the same stroke must not pass stricter stages
    expect(strict).toBe(false);
  });

  it('maps the ladder onto the Hanzi Writer leniency parameter monotonically', () => {
    expect(hanziWriterLeniency('teaching')).toBeGreaterThan(hanziWriterLeniency('standard'));
    expect(hanziWriterLeniency('standard')).toBeGreaterThan(hanziWriterLeniency('strict'));
  });
});

describe('dimensionsFrom (DD-106 six dimensions)', () => {
  it('aggregates accepted strokes into full dimensions', () => {
    const ok = evaluateStroke(H_MEDIAN, H_MEDIAN, 'standard');
    const dims = dimensionsFrom([ok, ok, ok], 3, 3);
    expect(dims.count).toBeCloseTo(1);
    expect(dims.order).toBeCloseTo(1);
    expect(dims.direction).toBeCloseTo(1);
    expect(dims.form).toBeCloseTo(1);
    expect(dims.layout).toBeCloseTo(1);
    expect(dims.legibility).toBeCloseTo(1);
  });

  it('never zeroes the learner out on partial evidence', () => {
    const ok = evaluateStroke(H_MEDIAN, H_MEDIAN, 'standard');
    const bad = evaluateStroke([...H_MEDIAN].reverse(), H_MEDIAN, 'standard');
    const dims = dimensionsFrom([ok, bad], 2, 1);
    expect(dims.order).toBeCloseTo(0.5);
    expect(dims.direction).toBeGreaterThan(0);
    expect(dims.direction).toBeLessThan(1);
  });

  it('handles the empty attempt without dividing by zero', () => {
    const dims = dimensionsFrom([], 0, 0);
    expect(dims.count).toBe(0);
    expect(dims.direction).toBe(0);
  });
});

describe('verdictFrom (mission §4.2 verdicts)', () => {
  const ok = evaluateStroke(H_MEDIAN, H_MEDIAN, 'standard');
  const bad = evaluateStroke([...H_MEDIAN].reverse(), H_MEDIAN, 'standard');

  it('clean completion with zero mistakes is `correct`', () => {
    expect(verdictFrom({ completed: true, totalMistakes: 0, hintsShown: 0, evaluations: [ok] })).toBe('correct');
  });

  it('completion after hints is `correct_with_hints` (never punished)', () => {
    expect(verdictFrom({ completed: true, totalMistakes: 2, hintsShown: 1, evaluations: [ok] })).toBe(
      'correct_with_hints',
    );
  });

  it('dominant direction error maps to `order_error`', () => {
    expect(verdictFrom({ completed: true, totalMistakes: 4, hintsShown: 0, evaluations: [bad, bad] })).toBe(
      'order_error',
    );
  });

  it('an abandoned attempt with no evidence is `uncertain_retry`', () => {
    expect(verdictFrom({ completed: false, totalMistakes: 1, hintsShown: 0, evaluations: [] })).toBe('uncertain_retry');
  });

  it('an abandoned attempt with only accepted strokes asks for a retry instead of failing', () => {
    expect(verdictFrom({ completed: false, totalMistakes: 0, hintsShown: 0, evaluations: [ok, ok] })).toBe(
      'uncertain_retry',
    );
  });
});
