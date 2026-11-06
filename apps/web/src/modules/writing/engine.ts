/**
 * HANASO — handwriting judging engine v2 (TASK-LEARNING-08 phase 2 / #117).
 *
 * The v1 layer explained rejections that the Hanzi Writer quiz (a black box)
 * had already decided — it could never make acceptance FAIR. This module is
 * the acceptance authority: given the user's raw pointer path (in 1024² char
 * space) and the character's centerline stroke data (KanjiVG-derived), it
 * decides per stroke:
 *
 *   accepted | accepted_with_hint | uncertain_retry | rejected + a reason
 *
 * Owner fairness contract (#117 §1) — the engine MUST distinguish:
 *   - form is recognizable / order correct / direction correct
 *   - close-enough shape / minor proportion-or-placement slip
 *   - genuinely wrong
 * A drawing must NOT be rejected for a few pixels of difference or natural
 * hand variation → size- and position-normalized shape comparison + generous
 * error bounds + a confidence band (uncertain asks for a retry, never a
 * definitive «wrong»). Leniency must not accept any scribble either.
 *
 * Rejection reasons map 1:1 to precise Persian feedback (#117 §1):
 *   order (wrong stroke) · incomplete (too short/long) · start (wrong start
 *   point) · direction (reversed) · form (shape too different) · position.
 *
 * The assist ladder (#117 §7/§8): each miss raises the leniency level; after
 * MAX_ATTEMPTS_ON_STROKE misses the stroke passes WITH ASSISTANCE — the
 * learner is never trapped in an endless failure loop, yet must genuinely
 * write a recognizable form to pass on their own.
 *
 * PURE module — no DOM, no fetch (testable headless). Raw pen paths stay in
 * the browser (DD-111): only structured summaries leave this module.
 */

import { CHAR_SPACE, centroid, dist, resample, type Point } from './analysis';
import type { StrokeMetrics, WritingCharData } from './types';

// ---------------------------------------------------------------- types

/** Verdict for one drawn stroke. */
export type StrokeJudge = 'accepted' | 'accepted_with_hint' | 'uncertain_retry' | 'rejected';

/** Why a stroke was rejected — drives the precise Persian feedback. */
export type StrokeRejectReason =
  | 'order_ahead'
  | 'order_behind'
  | 'order_redraw'
  | 'incomplete_short'
  | 'incomplete_long'
  | 'start'
  | 'direction'
  | 'form'
  | 'position';

/** Extended per-stroke metrics (v2 adds start-point accuracy + length ratio). */
export interface StrokeMetricsV2 extends StrokeMetrics {
  /** 0..1 — agreement of the pen-down point with the reference start. */
  start: number;
  /** user path length ÷ reference length (~1 is ideal). */
  lengthRatio: number;
}

/** The full judgement for one drawn stroke. */
export interface StrokeJudgement {
  judge: StrokeJudge;
  reason: StrokeRejectReason | null;
  /** The reference stroke the user's path matched BEST (identity evidence). */
  matchedStrokeIndex: number;
  metrics: StrokeMetricsV2;
  /** Precise Persian feedback (null when accepted cleanly). */
  feedbackFa: string | null;
  /** True when the stroke only passed via the assist ladder. */
  assisted: boolean;
}

/** Leniency stage of the assist ladder (0 = normal teaching baseline). */
export type AssistLevel = 0 | 1 | 2 | 3;

/** After this many misses on one stroke, the ladder passes it with assistance. */
export const MAX_ATTEMPTS_ON_STROKE = 4;

// ---------------------------------------------------------------- thresholds

interface Thresholds {
  /** Overall acceptance floor (drops as the assist ladder climbs). */
  accept: number;
  /** Half-width of the borderline band around `accept`. */
  band: number;
  /** Per-axis floors — below these the rejection reason names the axis. */
  directionFloor: number;
  shapeFloor: number;
  positionFloor: number;
  startFloor: number;
  /** Accepted path-length ratio range (user ÷ reference). */
  lengthMin: number;
  lengthMax: number;
  /** Identity-match margin: best must beat expected by this to call it order. */
  orderMargin: number;
}

const THRESHOLDS: Record<AssistLevel, Thresholds> = {
  0: {
    accept: 0.44,
    band: 0.07,
    directionFloor: 0.55,
    shapeFloor: 0.5,
    positionFloor: 0.4,
    startFloor: 0.3,
    lengthMin: 0.55,
    lengthMax: 2.0,
    orderMargin: 0.14,
  },
  1: {
    accept: 0.36,
    band: 0.08,
    directionFloor: 0.48,
    shapeFloor: 0.42,
    positionFloor: 0.32,
    startFloor: 0.22,
    lengthMin: 0.45,
    lengthMax: 2.4,
    orderMargin: 0.2,
  },
  2: {
    accept: 0.28,
    band: 0.1,
    directionFloor: 0.4,
    shapeFloor: 0.34,
    positionFloor: 0.24,
    startFloor: 0.14,
    lengthMin: 0.35,
    lengthMax: 3.0,
    orderMargin: 0.26,
  },
  3: {
    accept: 0.2,
    band: 0.12,
    directionFloor: 0.34,
    shapeFloor: 0.26,
    positionFloor: 0.18,
    startFloor: 0.08,
    lengthMin: 0.25,
    lengthMax: 4.0,
    orderMargin: 0.34,
  },
};

// ---------------------------------------------------------------- geometry helpers

function pathLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += dist(points[i - 1]!, points[i]!);
  return total;
}

/**
 * Direction agreement, v2: ½ chord (start→end) + ½ mean resampled tangent
 * alignment. The tangent term catches a curve drawn backwards whose chord
 * happens to point the right way (the v1 chord-only blind spot).
 */
function directionSimilarityV2(user: Point[], median: Point[]): number {
  const n = 16;
  const u = resample(user, n);
  const m = resample(median, n);
  // chord term
  const uv = { x: u[u.length - 1]!.x - u[0]!.x, y: u[u.length - 1]!.y - u[0]!.y };
  const mv = { x: m[m.length - 1]!.x - m[0]!.x, y: m[m.length - 1]!.y - m[0]!.y };
  const ul = Math.hypot(uv.x, uv.y);
  const ml = Math.hypot(mv.x, mv.y);
  const chord = ul < 1e-6 || ml < 1e-6 ? 0.5 : Math.max(0, ((uv.x * mv.x + uv.y * mv.y) / (ul * ml) + 1) / 2);
  // tangent term
  let dotSum = 0;
  let count = 0;
  for (let i = 1; i < n; i += 1) {
    const ut = { x: u[i]!.x - u[i - 1]!.x, y: u[i]!.y - u[i - 1]!.y };
    const mt = { x: m[i]!.x - m[i - 1]!.x, y: m[i]!.y - m[i - 1]!.y };
    const tl = Math.hypot(ut.x, ut.y);
    const ml2 = Math.hypot(mt.x, mt.y);
    if (tl < 1e-6 || ml2 < 1e-6) continue;
    dotSum += (ut.x * mt.x + ut.y * mt.y) / (tl * ml2);
    count += 1;
  }
  const tangent = count === 0 ? 0.5 : Math.max(0, (dotSum / count + 1) / 2);
  return chord * 0.5 + tangent * 0.5;
}

/**
 * Shape agreement, v2: centroid-aligned AND scale-normalized — a stroke drawn
 * 30% larger or shifted within the box is still the right shape. Size and
 * placement are judged separately (position axis), so shape stays orthogonal.
 */
function shapeSimilarityV2(user: Point[], median: Point[]): number {
  const n = 16;
  const u = resample(user, n);
  const m = resample(median, n);
  const uc = centroid(u);
  const mc = centroid(m);
  const spread = (pts: Point[], c: Point) =>
    Math.sqrt(pts.reduce((s, p) => s + (p.x - c.x) ** 2 + (p.y - c.y) ** 2, 0) / pts.length) || 1;
  const us = spread(u, uc);
  const ms = spread(m, mc);
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const ux = (u[i]!.x - uc.x) / us;
    const uy = (u[i]!.y - uc.y) / us;
    const mx = (m[i]!.x - mc.x) / ms;
    const my = (m[i]!.y - mc.y) / ms;
    sum += Math.hypot(ux - mx, uy - my);
  }
  const meanDist = sum / n; // in RMS units (scale-free)
  return Math.max(0, Math.min(1, 1 - meanDist / 1.1));
}

/** Placement agreement: centroid distance with a generous tolerance. */
function positionSimilarityV2(user: Point[], median: Point[]): number {
  const uc = centroid(user);
  const mc = centroid(median);
  return Math.max(0, Math.min(1, 1 - dist(uc, mc) / (CHAR_SPACE * 0.32)));
}

/** Start-point agreement (generous — natural hand placement varies). */
function startSimilarity(user: Point[], median: Point[]): number {
  const d = dist(user[0]!, median[0]!);
  return Math.max(0, Math.min(1, 1 - d / (CHAR_SPACE * 0.22)));
}

/** Persian position words for feedback («بالا-چپ») from a char-space point. */
export function positionHintFa(p: Point): string {
  const h = p.x < CHAR_SPACE / 3 ? 'چپ' : p.x > (CHAR_SPACE * 2) / 3 ? 'راست' : 'وسط';
  const v = p.y < CHAR_SPACE / 3 ? 'بالا' : p.y > (CHAR_SPACE * 2) / 3 ? 'پایین' : 'وسط';
  if (h === 'وسط' && v === 'وسط') return 'وسطِ نویسه';
  if (h === 'وسط') return v;
  if (v === 'وسط') return h;
  return `${v}-${h}`;
}

// ---------------------------------------------------------------- core judge

export interface JudgeInput {
  /** User's raw pointer path in char space (>= 1 point). */
  userPath: Point[];
  /** The character's stroke data (centerlines + medians). */
  charData: WritingCharData;
  /** The stroke the walk currently expects (0-based). */
  expectedIndex: number;
  /** Strokes already accepted in this attempt (0-based indices). */
  completedIndices: number[];
  /** Current assist-ladder level for this stroke. */
  assist: AssistLevel;
  /** Attempts already made on this stroke (for the assisted-pass ceiling). */
  attemptsOnStroke: number;
}

const FA_FEEDBACK: Record<
  StrokeRejectReason,
  (ctx: { expectedNo: number; startHint: string; endHint: string; posHint: string }) => string
> = {
  order_ahead: ({ expectedNo }) => `این ضربه، ضربهٔ بعدی است — فعلاً ضربهٔ ${expectedNo} را بنویس.`,
  order_behind: ({ expectedNo }) => `جلو زدی — اول ضربهٔ ${expectedNo} را تمام کن.`,
  order_redraw: ({ expectedNo }) => `این ضربه را قبلاً نوشتی؛ حالا نوبت ضربهٔ ${expectedNo} است.`,
  incomplete_short: () => 'این ضربه ناقص ماند — مسیر را کامل‌تر و کمی بلندتر بکش.',
  incomplete_long: () => 'ضربه بیش از حد بلند شد — کوتاه‌تر و تمیزتر بکش.',
  start: ({ startHint }) => `از نقطهٔ شروع درست بردار — این ضربه از ${startHint} شروع می‌شود.`,
  direction: ({ startHint, endHint }) => `جهت این ضربه برعکس است — از ${startHint} شروع کن و به سمت ${endHint} بکش.`,
  form: () => 'فرم این ضربه با الگو نمی‌خواند — یک بار نمایش را دوباره ببین و مسیرش را دنبال کن.',
  position: ({ posHint }) => `این ضربه را ${posHint} بنویس — جای فعلی‌اش کمی بیرون از الگو است.`,
};

const UNCERTAIN_FA = 'کمی واضح‌تر بنویس تا مطمئن شویم — همین مسیر را یک بار دیگر بکش.';
const HINT_FA = 'درست شد — فقط کمی جابه‌جا بود. دفعهٔ بعد نقطهٔ شروع را دقیق‌تر بگیر.';
const ASSISTED_FA = 'با کمی کمک قبول شد — در مرور بعدی دوباره تمرینش می‌کنیم.';

/**
 * Judge one drawn stroke. Pure: same input → same judgement.
 */
export function judgeStroke(input: JudgeInput): StrokeJudgement {
  const { userPath, charData, expectedIndex, completedIndices, assist, attemptsOnStroke } = input;
  const medians: Point[][] = charData.medians.map((m) => m.map((p) => ({ x: p[0] ?? 0, y: p[1] ?? 0 })));
  const expected = medians[expectedIndex];
  if (!expected) {
    return {
      judge: 'rejected',
      reason: 'form',
      matchedStrokeIndex: expectedIndex,
      metrics: { overall: 0, direction: 0, shape: 0, position: 0, start: 0, lengthRatio: 0 },
      feedbackFa: 'دادهٔ این ضربه در دسترس نیست.',
      assisted: false,
    };
  }

  // -- degenerate path: a dot or an accidental tap is an incomplete stroke
  const cleaned = userPath.filter((p, i) => i === 0 || dist(p, userPath[i - 1]!) > 2);
  const userLen = pathLength(cleaned);
  if (cleaned.length < 2 || userLen < CHAR_SPACE * 0.04) {
    return {
      judge: 'rejected',
      reason: 'incomplete_short',
      matchedStrokeIndex: expectedIndex,
      metrics: {
        overall: 0,
        direction: 0.5,
        shape: 0.5,
        position: 0.5,
        start: startSimilarity(cleaned.length ? cleaned : [userPath[0]!], expected),
        lengthRatio: 0,
      },
      feedbackFa: FA_FEEDBACK.incomplete_short({
        expectedNo: expectedIndex + 1,
        startHint: '',
        endHint: '',
        posHint: '',
      }),
      assisted: false,
    };
  }

  const refLen = pathLength(expected);
  const lengthRatio = refLen > 0 ? userLen / refLen : 0;
  const th = THRESHOLDS[assist];

  const metrics: StrokeMetricsV2 = {
    direction: directionSimilarityV2(cleaned, expected),
    shape: shapeSimilarityV2(cleaned, expected),
    position: positionSimilarityV2(cleaned, expected),
    start: startSimilarity(cleaned, expected),
    lengthRatio,
    overall: 0,
  };

  // -- identity: which stroke does this path actually match best?
  let bestIndex = expectedIndex;
  let bestScore = -1;
  let expectedScore = -1;
  for (let i = 0; i < medians.length; i += 1) {
    const s =
      shapeSimilarityV2(cleaned, medians[i]!) *
      positionSimilarityV2(cleaned, medians[i]!) *
      directionSimilarityV2(cleaned, medians[i]!);
    if (i === expectedIndex) expectedScore = s;
    if (s > bestScore) {
      bestScore = s;
      bestIndex = i;
    }
  }
  metrics.overall = metrics.direction * metrics.shape * metrics.position;

  const ctx = {
    expectedNo: expectedIndex + 1,
    startHint: positionHintFa(expected[0]!),
    endHint: positionHintFa(expected[expected.length - 1]!),
    posHint: positionHintFa(centroid(expected)),
  };

  const reject = (reason: StrokeRejectReason): StrokeJudgement => ({
    judge: 'rejected',
    reason,
    matchedStrokeIndex: bestIndex,
    metrics,
    feedbackFa: FA_FEEDBACK[reason](ctx),
    assisted: false,
  });

  // -- assist-ladder ceiling: after enough honest attempts, pass with help
  if (attemptsOnStroke >= MAX_ATTEMPTS_ON_STROKE - 1) {
    // Only if the shape is at least somewhat there (not a random dot) — the
    // ladder forgives imperfection, never total disengagement.
    if (metrics.shape >= 0.22 || bestIndex === expectedIndex) {
      return {
        judge: 'accepted',
        reason: null,
        matchedStrokeIndex: expectedIndex,
        metrics,
        feedbackFa: ASSISTED_FA,
        assisted: true,
      };
    }
  }

  // -- 1. order: the path clearly matches a DIFFERENT stroke
  if (bestIndex !== expectedIndex && bestScore - expectedScore > th.orderMargin) {
    if (completedIndices.includes(bestIndex)) return reject('order_redraw');
    return reject(bestIndex > expectedIndex ? 'order_ahead' : 'order_behind');
  }

  // -- 2. completeness
  if (lengthRatio < th.lengthMin) return reject('incomplete_short');
  if (lengthRatio > th.lengthMax) return reject('incomplete_long');

  // -- 3. per-axis floors (precise reason = the failing axis).
  // Priority: direction before start — a reversed stroke also starts at the
  // wrong end, and «جهت برعکس است» (with its where-to-start hint) is the more
  // instructive diagnosis. Then start (pen-down point), then placement, then
  // form.
  if (metrics.direction < th.directionFloor) return reject('direction');
  if (metrics.start < th.startFloor) return reject('start');
  if (metrics.position < th.positionFloor) return reject('position');
  if (metrics.shape < th.shapeFloor) return reject('form');

  // -- 4. confidence bands on the overall score
  if (metrics.overall >= th.accept + th.band) {
    return {
      judge: 'accepted',
      reason: null,
      matchedStrokeIndex: expectedIndex,
      metrics,
      feedbackFa: null,
      assisted: false,
    };
  }
  if (metrics.overall >= th.accept) {
    return {
      judge: 'accepted_with_hint',
      reason: null,
      matchedStrokeIndex: expectedIndex,
      metrics,
      feedbackFa: HINT_FA,
      assisted: false,
    };
  }
  if (metrics.overall >= th.accept - th.band) {
    // close enough to be inconclusive — never a definitive wrong
    return {
      judge: 'uncertain_retry',
      reason: null,
      matchedStrokeIndex: expectedIndex,
      metrics,
      feedbackFa: UNCERTAIN_FA,
      assisted: false,
    };
  }

  // -- clearly below: weakest axis relative to its floor names the reason
  const weakest = (
    [
      { kind: 'direction' as const, score: metrics.direction, floor: th.directionFloor },
      { kind: 'form' as const, score: metrics.shape, floor: th.shapeFloor },
      { kind: 'position' as const, score: metrics.position, floor: th.positionFloor },
    ] satisfies Array<{ kind: 'direction' | 'form' | 'position'; score: number; floor: number }>
  ).reduce((w, a) => (a.score - a.floor < w.score - w.floor ? a : w));
  return reject(weakest.kind);
}

// ---------------------------------------------------------------- attempt state

/** Per-character practice attempt state (one full writing of the glyph). */
export interface WritingAttemptState {
  character: string;
  /** Index of the stroke the learner is currently expected to draw. */
  expectedIndex: number;
  /** Accepted strokes so far (indices). */
  completed: number[];
  /** Misses on the CURRENT stroke (drives the assist ladder). */
  missesOnStroke: number;
  /** Total misses in this attempt. */
  totalMisses: number;
  /** Strokes accepted cleanly on the first try. */
  firstTry: number;
  /** Strokes that only passed with assistance. */
  assistedCount: number;
  /** History of judgements (bounded by stroke count × ceiling). */
  history: Array<{ strokeIndex: number; judge: StrokeJudge }>;
}

export function createAttemptState(character: string): WritingAttemptState {
  return {
    character,
    expectedIndex: 0,
    completed: [],
    missesOnStroke: 0,
    totalMisses: 0,
    firstTry: 0,
    assistedCount: 0,
    history: [],
  };
}

export function assistLevelOf(misses: number): AssistLevel {
  if (misses >= 3) return 3;
  if (misses >= 2) return 2;
  if (misses >= 1) return 1;
  return 0;
}

/**
 * Apply a judgement to the attempt state (pure — returns the next state).
 * `done` marks the whole attempt complete (all strokes accepted).
 */
export function applyJudgement(
  state: WritingAttemptState,
  judgement: StrokeJudgement,
  strokesTotal: number,
): { state: WritingAttemptState; done: boolean } {
  const next: WritingAttemptState = {
    ...state,
    completed: [...state.completed],
    history: [...state.history, { strokeIndex: state.expectedIndex, judge: judgement.judge }],
  };
  if (judgement.judge === 'accepted' || judgement.judge === 'accepted_with_hint') {
    if (state.missesOnStroke === 0) next.firstTry += 1;
    if (judgement.assisted) next.assistedCount += 1;
    next.completed.push(state.expectedIndex);
    next.expectedIndex = state.expectedIndex + 1;
    next.missesOnStroke = 0;
    return { state: next, done: next.expectedIndex >= strokesTotal };
  }
  next.missesOnStroke += 1;
  next.totalMisses += 1;
  return { state: next, done: false };
}
