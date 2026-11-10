/**
 * HANASO — writing render helpers (TASK-LEARNING-08 phase 2 / #117).
 *
 * Pure geometry→SVG helpers for the v3 writing canvas: live pen paths, guide
 * overlays (start marker + direction arrow), per-stroke demo timing, and the
 * Persian stroke-info panel data (شمارهٔ ضربه، محل شروع، جهت، نوع حرکت).
 * Replaces Hanzi Writer's rendering — drawn from the same KanjiVG centerline
 * data the engine judges against, so what you SEE is what you're graded on.
 */

import { positionHintFa } from './engine';
import { dist, type Point } from './analysis';
import type { WritingCharData } from './types';

/**
 * Render width of a brush stroke in the 1024² space (calligraphy feel).
 * TASK-LEARNING-08 Addendum-2 §6: 74 was TOO THICK. Addendum-3 §7: 46 was
 * still a touch heavy — on the ~26rem canvas fine multi-stroke glyphs (き、さ、
 * み…) lost detail at the joins. 38 keeps a natural pen weight while the
 * standard sample and the learner's pen share ONE width, so the per-stroke
 * replacement (Addendum-3 §13) is pixel-consistent: what the learner drew is
 * swapped for the standard form at the SAME weight.
 */
export const STROKE_WIDTH = 38;
/** The dashed guide under the learner's pen (a shade lighter than the ink). */
export const GUIDE_WIDTH = 25;

/**
 * Addendum-3 §13: the per-stroke replacement — the moment a stroke is
 * ACCEPTED the raw hand path is swapped for the STANDARD stroke, which re-inks
 * itself quickly in place (a short flow, not a wait). Mounts hidden then
 * animates (double-rAF) so the transition always plays.
 */
export const SAMPLE_STROKE_MS = 260;
export const SAMPLE_STROKE_STAGGER_MS = 90;

/** Addendum-3 §13: how fast the raw hand ink cross-fades into the standard form. */
export const INK_FADE_MS = 340;
/** Addendum-3 §3: the paper-soft fade when a completed glyph clears for the
 * free (from-memory) attempt — a deliberate calm transition, never a flash. */
export const CLEAR_FADE_MS = 420;

/** Build a smooth SVG path from raw pointer points (quadratic smoothing). */
export function livePathD(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0]!.x},${points[0]!.y}`;
  if (points.length === 2) return `M${points[0]!.x},${points[0]!.y}L${points[1]!.x},${points[1]!.y}`;
  let d = `M${points[0]!.x},${points[0]!.y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const mx = (points[i]!.x + points[i + 1]!.x) / 2;
    const my = (points[i]!.y + points[i + 1]!.y) / 2;
    d += `Q${points[i]!.x},${points[i]!.y} ${mx},${my}`;
  }
  const last = points[points.length - 1]!;
  d += `L${last.x},${last.y}`;
  return d;
}

/* ------------------------------------------------------------------------- *
 * Addendum-5 §2 — the stroke MORPH (user ink → standard form, in place).
 *
 * The owner's rule: the accepted stroke must NOT be erased and re-drawn from
 * the start; the learner's own line stays on the paper and is gently CORRECTED
 * into the precise standard path. Pure-math geometry (no DOM calls — jsdom
 * safe): flatten the standard SVG path to a polyline, resample BOTH paths
 * uniformly by arc length so point i of one corresponds to point i of the
 * other, then interpolate point-by-point.
 * -------------------------------------------------------------------------- */

/** Morph duration — a calm correction beat, fast enough to never block the
 * next stroke (the guide for stroke n+1 is already up while it settles). */
export const MORPH_STROKE_MS = 560;
/** Correspondence resolution — enough points for a smooth bend, small enough
 * for a tiny `d` string (re-rendered every frame). */
export const MORPH_SAMPLES = 64;

interface PathCursor {
  x: number;
  y: number;
  sx: number;
  sy: number;
  lastC: Point | null;
  lastQ: Point | null;
}

function cubicAt(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function quadAt(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
}

/**
 * Flatten an SVG path `d` into a dense polyline. Supports the subset the
 * KanjiVG centerline data uses (M L H V C S Q T Z + lowercase relatives) with
 * implicit repeated coordinate groups. Returns [] for unparsable input.
 */
export function flattenPathD(d: string): Point[] {
  const out: Point[] = [];
  const cmds = d.match(/[MLHVCSQTAZmlhvcsqtaz]|-?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g);
  if (!cmds) return out;
  let i = 0;
  const next = (): number => {
    const v = parseFloat(cmds[i++] ?? '');
    return Number.isFinite(v) ? v : 0;
  };
  const c: PathCursor = { x: 0, y: 0, sx: 0, sy: 0, lastC: null, lastQ: null };
  const SEG = 14; // samples per curve segment (dense → arc-length resample fixes spacing)
  while (i < cmds.length) {
    const cmd = cmds[i++]!;
    const rel = cmd === cmd.toLowerCase();
    const K = cmd.toUpperCase();
    if (K === 'M') {
      const x = next() + (rel ? c.x : 0);
      const y = next() + (rel ? c.y : 0);
      c.x = c.sx = x;
      c.y = c.sy = y;
      out.push({ x, y });
      c.lastC = c.lastQ = null;
    } else if (K === 'L') {
      const x = next() + (rel ? c.x : 0);
      const y = next() + (rel ? c.y : 0);
      out.push({ x, y });
      c.x = x;
      c.y = y;
      c.lastC = c.lastQ = null;
    } else if (K === 'H') {
      c.x = next() + (rel ? c.x : 0);
      out.push({ x: c.x, y: c.y });
      c.lastC = c.lastQ = null;
    } else if (K === 'V') {
      c.y = next() + (rel ? c.y : 0);
      out.push({ x: c.x, y: c.y });
      c.lastC = c.lastQ = null;
    } else if (K === 'C' || K === 'S') {
      let p1: Point;
      if (K === 'C') {
        p1 = { x: next() + (rel ? c.x : 0), y: next() + (rel ? c.y : 0) };
      } else {
        p1 = c.lastC ? { x: 2 * c.x - c.lastC.x, y: 2 * c.y - c.lastC.y } : { x: c.x, y: c.y };
      }
      const p2 = { x: next() + (rel ? c.x : 0), y: next() + (rel ? c.y : 0) };
      const p3 = { x: next() + (rel ? c.x : 0), y: next() + (rel ? c.y : 0) };
      for (let s = 1; s <= SEG; s += 1) out.push(cubicAt({ x: c.x, y: c.y }, p1, p2, p3, s / SEG));
      c.lastC = p2;
      c.lastQ = null;
      c.x = p3.x;
      c.y = p3.y;
    } else if (K === 'Q' || K === 'T') {
      const p1 =
        K === 'Q'
          ? { x: next() + (rel ? c.x : 0), y: next() + (rel ? c.y : 0) }
          : c.lastQ
            ? { x: 2 * c.x - c.lastQ.x, y: 2 * c.y - c.lastQ.y }
            : { x: c.x, y: c.y };
      const p2 = { x: next() + (rel ? c.x : 0), y: next() + (rel ? c.y : 0) };
      for (let s = 1; s <= SEG; s += 1) out.push(quadAt({ x: c.x, y: c.y }, p1, p2, s / SEG));
      c.lastQ = p1;
      c.lastC = null;
      c.x = p2.x;
      c.y = p2.y;
    } else if (K === 'Z') {
      out.push({ x: c.sx, y: c.sy });
      c.x = c.sx;
      c.y = c.sy;
      c.lastC = c.lastQ = null;
    } else if (K === 'A') {
      // (arc — not used by KanjiVG centerlines; consume the 7 args, line to end)
      i += 5;
      const x = next() + (rel ? c.x : 0);
      const y = next() + (rel ? c.y : 0);
      out.push({ x, y });
      c.x = x;
      c.y = y;
      c.lastC = c.lastQ = null;
    }
  }
  return out;
}

/** Resample a polyline to EXACTLY n points, uniformly by arc length. */
export function resamplePolyline(points: Point[], n: number): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: n }, () => points[0]!);
  const lens = [0];
  for (let i = 1; i < points.length; i += 1) lens.push(lens[i - 1]! + dist(points[i - 1]!, points[i]!));
  const total = lens[lens.length - 1]!;
  if (total <= 0) return Array.from({ length: n }, () => points[0]!);
  const out: Point[] = [];
  for (let k = 0; k < n; k += 1) {
    const target = (total * k) / (n - 1);
    let seg = 1;
    while (seg < lens.length - 1 && lens[seg]! < target) seg += 1;
    const segLen = lens[seg]! - lens[seg - 1]!;
    const t = segLen === 0 ? 0 : (target - lens[seg - 1]!) / segLen;
    const a = points[seg - 1]!;
    const b = points[seg]!;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

/** ease-in-out cubic — the correction feels like a nudge, not a snap. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** The morph frame: `from` and `to` are ALREADY resampled to the same length. */
export function morphPolylineD(from: Point[], to: Point[], t: number): string {
  const n = Math.min(from.length, to.length);
  if (n === 0) return '';
  let d = `M${from[0]!.x + (to[0]!.x - from[0]!.x) * t},${from[0]!.y + (to[0]!.y - from[0]!.y) * t}`;
  for (let i = 1; i < n; i += 1) {
    const x = from[i]!.x + (to[i]!.x - from[i]!.x) * t;
    const y = from[i]!.y + (to[i]!.y - from[i]!.y) * t;
    d += `L${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}

/** The path-drawing length of a median (used for demo pacing + arrow placement). */
export function medianLength(median: Point[]): number {
  let total = 0;
  for (let i = 1; i < median.length; i += 1) total += dist(median[i - 1]!, median[i]!);
  return total;
}

/**
 * Demo duration for one stroke — slow and educational (#117 §4): ~1.15s of
 * base draw time plus travel time, clamped so short strokes stay watchable
 * and long sweeps don't crawl.
 */
export function strokeDemoMs(median: Point[]): number {
  const len = medianLength(median);
  return Math.min(2800, Math.max(1400, 900 + len * 1.15));
}

/** Pause between two demo strokes (#117 §4: a beat to observe each stroke). */
export const DEMO_INTER_STROKE_MS = 900;

/**
 * INTRO pace (owner v4 §1/§3): the first encounter writes the whole glyph in
 * one flowing motion — clearly more than a flicker, but a showcase, not a
 * lecture. ~55% of the demo pace with a shorter breath between strokes.
 */
export function strokeIntroMs(median: Point[]): number {
  return Math.round(strokeDemoMs(median) * 0.55);
}

/** Pause between two intro strokes — a soft continuous breath. */
export const INTRO_INTER_STROKE_MS = 380;

/** Point at fraction t (0..1) along a polyline by arc length. */
export function pointAt(median: Point[], t: number): Point {
  const total = medianLength(median);
  if (total === 0) return median[0] ?? { x: 0, y: 0 };
  let target = total * Math.min(1, Math.max(0, t));
  for (let i = 1; i < median.length; i += 1) {
    const seg = dist(median[i - 1]!, median[i]!);
    if (seg >= target) {
      const k = seg === 0 ? 0 : target / seg;
      return {
        x: median[i - 1]!.x + (median[i]!.x - median[i - 1]!.x) * k,
        y: median[i - 1]!.y + (median[i]!.y - median[i - 1]!.y) * k,
      };
    }
    target -= seg;
  }
  return median[median.length - 1]!;
}

/** Direction arrow geometry: tip at ~42% along the stroke, oriented along it. */
export function directionArrow(median: Point[]): { tip: Point; angleDeg: number } {
  const tip = pointAt(median, 0.42);
  const before = pointAt(median, 0.36);
  const angle = (Math.atan2(tip.y - before.y, tip.x - before.x) * 180) / Math.PI;
  return { tip, angleDeg: angle };
}

/**
 * Honest geometric movement description for the side panel (#117 §4):
 * straight / curved / looped — derived from the reference geometry, never
 * hand-authored per glyph.
 */
export function movementHintFa(median: Point[]): string {
  const chord = dist(median[0]!, median[median.length - 1]!);
  const len = medianLength(median);
  const ratio = chord / (len || 1);
  // looped: the path travels much farther than the endpoints' distance AND
  // doubles back near its own start (e.g. the あ loop stroke)
  const nearStart = median.some((p, i) => i > 1 && i < median.length - 1 && dist(p, median[0]!) < len * 0.12);
  if (nearStart && ratio < 0.72) return 'این ضربه یک پیچِ کامل می‌خورد — قلم را از دست نده.';
  if (ratio < 0.55) return 'مسیر خمیده است — با یک حرکت نرم بکش.';
  if (ratio < 0.85) return 'کمی انحنا دارد؛ نرم و یک‌دست بکش.';
  return 'تقریباً مستقیم است — با یک حرکت بکش.';
}

/** Persian info block for one reference stroke (the demo/practice side panel). */
export interface StrokeInfoFa {
  /** «ضربهٔ ۲ از ۳» */
  label: string;
  /** «از بالا-چپ شروع کن» */
  startFa: string;
  /** «به سمت پایین-راست بکش» */
  directionFa: string;
  /** movement description */
  movementFa: string;
}

export function strokeInfoFa(data: WritingCharData, index: number): StrokeInfoFa {
  const median = data.medians[index]!.map((p) => ({ x: p[0] ?? 0, y: p[1] ?? 0 }));
  const total = data.medians.length;
  return {
    label: `ضربهٔ ${index + 1} از ${total}`,
    startFa: `از ${positionHintFa(median[0]!)} شروع کن`,
    directionFa: `به سمت ${positionHintFa(median[median.length - 1]!)} بکش`,
    movementFa: movementHintFa(median),
  };
}
