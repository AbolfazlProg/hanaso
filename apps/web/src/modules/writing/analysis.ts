/**
 * HANASO — handwriting geometric analysis layer (TASK-LEARNING-07 / DD-105/DD-106).
 *
 * PURE module — no DOM, no fetch. This is the HANASO-proprietary layer on top of
 * the Hanzi Writer quiz engine: while the quiz validates each drawn stroke
 * against the expected stroke (count + order + geometry), this layer explains
 * WHY a rejected stroke failed — direction, form or relative position — using
 * normalized geometric comparison between the user's raw pointer path and the
 * reference median from the char data. The mission's fairness rule: no raw
 * bitmap comparison (a correct-but-slightly-imperfect stroke must not fail),
 * and when evidence is inconclusive the verdict is `uncertain`, never a
 * definitive fail.
 *
 * Coordinate space: the Hanzi-Writer data space is 1024×1024 with y pointing
 * DOWN (SVG). Callers must map user pointer coordinates into this space before
 * calling (see WritingPractice for the mapping).
 */

import type {
  StrokeErrorKind,
  StrokeEvaluation,
  StrokeMetrics,
  WritingDimensions,
  WritingLeniency,
  WritingVerdict,
} from './types';

export type Point = { x: number; y: number };

/** Hanzi-Writer data space is 1024×1024. */
export const CHAR_SPACE = 1024;

/** Resample a polyline to n evenly-spaced points (path-length parameterization). */
export function resample(points: Point[], n: number): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: n }, () => ({ ...points[0]! }));
  const seglens: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const d = dist(points[i - 1]!, points[i]!);
    seglens.push(d);
    total += d;
  }
  if (total === 0) return Array.from({ length: n }, () => ({ ...points[0]! }));
  const out: Point[] = [points[0]!];
  let seg = 0;
  let segUsed = 0;
  for (let k = 1; k < n; k += 1) {
    const target = (k / (n - 1)) * total;
    while (seg < seglens.length - 1 && segUsed + seglens[seg]! < target) {
      segUsed += seglens[seg]!;
      seg += 1;
    }
    const segLen = seglens[seg]! || 1;
    const t = Math.min(1, Math.max(0, (target - segUsed) / segLen));
    const a = points[seg]!;
    const b = points[seg + 1] ?? a;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function centroid(points: Point[]): Point {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Similarity of two directed chords (start→end), 0..1. */
function directionSimilarity(user: Point[], median: Point[]): number {
  const us = user[0]!;
  const ue = user[user.length - 1]!;
  const ms = median[0]!;
  const me = median[median.length - 1]!;
  const uv = { x: ue.x - us.x, y: ue.y - us.y };
  const mv = { x: me.x - ms.x, y: me.y - ms.y };
  const ul = Math.hypot(uv.x, uv.y);
  const ml = Math.hypot(mv.x, mv.y);
  if (ul < 1e-6 || ml < 1e-6) return 0.5; // degenerate dot — inconclusive
  const dot = (uv.x * mv.x + uv.y * mv.y) / (ul * ml);
  return clamp01((dot + 1) / 2); // -1..1 → 0..1
}

/**
 * Path-shape similarity: mean point distance after resampling both to the same
 * count, CENTROID-ALIGNED, normalized by the character space (fair to size and
 * fair to placement — the fairness rule). Alignment keeps the three evaluation
 * axes orthogonal: a displaced-but-perfectly-shaped stroke fails POSITION only
 * (not form), a bent stroke fails FORM, a reversed stroke fails DIRECTION.
 * Preserves the median's arc-length structure, so a reversed or bent stroke
 * scores low while a slightly wobbly correct stroke stays high.
 */
function shapeSimilarity(user: Point[], median: Point[]): number {
  const n = 16;
  const u = resample(user, n);
  const m = resample(median, n);
  const uc = centroid(u);
  const mc = centroid(m);
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    sum += dist({ x: u[i]!.x - uc.x, y: u[i]!.y - uc.y }, { x: m[i]!.x - mc.x, y: m[i]!.y - mc.y });
  }
  const meanDist = sum / n;
  return clamp01(1 - meanDist / (CHAR_SPACE * 0.3)); // 30% of space ≈ score 0
}

/** Relative-position similarity via normalized centroid distance. */
function positionSimilarity(user: Point[], median: Point[]): number {
  const uc = centroid(user);
  const mc = centroid(median);
  const d = dist(uc, mc);
  return clamp01(1 - d / (CHAR_SPACE * 0.35));
}

/** Full metrics for one user stroke against its reference median. */
export function strokeMetrics(user: Point[], median: Point[]): StrokeMetrics {
  const direction = directionSimilarity(user, median);
  const shape = shapeSimilarity(user, median);
  const position = positionSimilarity(user, median);
  // product combines the three — one bad axis drags the score down but a single
  // mediocre axis alone does not fail an otherwise-correct stroke.
  const overall = direction * shape * position;
  return { overall, direction, shape, position };
}

/** Leniency thresholds (DD-106 ladder). `teaching` accepts ~55% overall match,
 * `standard` ~65%, `strict` ~75% — the quiz's own leniency parameter is set to match. */
const LENIENCY: Record<WritingLeniency, { accept: number; axisFloor: number }> = {
  teaching: { accept: 0.55, axisFloor: 0.25 },
  standard: { accept: 0.65, axisFloor: 0.3 },
  strict: { accept: 0.75, axisFloor: 0.35 },
};

/** Half-width of the borderline band around each axis floor (in similarity units). */
export const BORDERLINE_BAND = 0.12;

/**
 * Classify WHY a rejected stroke failed from its metrics (pure — exported so the
 * honesty rule is testable without crafting an exotic path): the WEAKEST axis
 * relative to its floor is the dominant error; when EVERY axis is borderline
 * (each within BORDERLINE_BAND of its floor) the evidence is inconclusive and
 * the verdict is `uncertain` — never a fabricated diagnosis.
 */
export function classifyRejection(metrics: StrokeMetrics, leniency: WritingLeniency = 'standard'): StrokeErrorKind {
  const cfg = LENIENCY[leniency];
  const axes: Array<{ kind: StrokeErrorKind; score: number; floor: number }> = [
    { kind: 'direction', score: metrics.direction, floor: cfg.axisFloor },
    { kind: 'form', score: metrics.shape, floor: cfg.axisFloor },
    { kind: 'position', score: metrics.position, floor: cfg.axisFloor },
  ];
  const weakest = axes.reduce((w, a) => (a.score - a.floor < w.score - w.floor ? a : w));
  const borderline = axes.every((a) => a.score >= a.floor - BORDERLINE_BAND && a.score <= a.floor + BORDERLINE_BAND);
  if (borderline) return 'uncertain';
  return weakest.kind;
}

/**
 * Evaluate one stroke attempt and — when rejected — classify the dominant error.
 */
export function evaluateStroke(
  user: Point[],
  median: Point[],
  leniency: WritingLeniency = 'standard',
): StrokeEvaluation {
  const metrics = strokeMetrics(user, median);
  const cfg = LENIENCY[leniency];
  const accepted = metrics.overall >= cfg.accept;
  if (accepted) return { accepted: true, metrics, errorKind: null };
  return { accepted: false, metrics, errorKind: classifyRejection(metrics, leniency) };
}

/** Aggregate the DD-106 six dimensions from per-stroke evaluations. */
export function dimensionsFrom(
  evaluations: StrokeEvaluation[],
  strokesTotal: number,
  firstTryCorrect: number,
): WritingDimensions {
  const n = evaluations.length;
  const mean = (pick: (e: StrokeEvaluation) => number) =>
    n === 0 ? 0 : evaluations.reduce((s, e) => s + pick(e), 0) / n;
  return {
    count: strokesTotal > 0 ? clamp01(evaluations.length / strokesTotal) : 0,
    order: strokesTotal > 0 ? clamp01(firstTryCorrect / strokesTotal) : 0,
    direction: mean((e) => e.metrics.direction),
    form: mean((e) => e.metrics.shape),
    layout: mean((e) => e.metrics.position),
    legibility: strokesTotal > 0 ? clamp01(firstTryCorrect / strokesTotal) : 0,
  };
}

/**
 * Final attempt verdict (mission §4.2): correct / correct-with-hints /
 * dominant-error / uncertain-retry. Never zeroes the user out — DD-106.
 */
export function verdictFrom(input: {
  completed: boolean;
  totalMistakes: number;
  hintsShown: number;
  evaluations: StrokeEvaluation[];
}): WritingVerdict {
  if (!input.completed) {
    return input.evaluations.length === 0 ? 'uncertain_retry' : dominantError(input.evaluations);
  }
  if (input.totalMistakes === 0) return 'correct';
  if (input.hintsShown > 0) return 'correct_with_hints';
  return dominantError(input.evaluations);
}

function dominantError(evaluations: StrokeEvaluation[]): WritingVerdict {
  const kinds = evaluations.filter((e) => !e.accepted).map((e) => e.errorKind ?? 'uncertain');
  if (kinds.length === 0) return 'uncertain_retry';
  const tally = new Map<string, number>();
  for (const k of kinds) tally.set(k, (tally.get(k) ?? 0) + 1);
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  switch (top) {
    case 'direction':
      return 'order_error'; // a directional error on the current stroke is an order/sequence signal
    case 'form':
      return 'form_error';
    case 'position':
      return 'position_error';
    default:
      return 'uncertain_retry';
  }
}

/** Map the leniency ladder to the Hanzi Writer quiz `leniency` parameter. */
export function hanziWriterLeniency(l: WritingLeniency): number {
  switch (l) {
    case 'teaching':
      return 1.2;
    case 'standard':
      return 1.0;
    case 'strict':
      return 0.9;
  }
}
