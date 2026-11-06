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
 * TASK-LEARNING-08 Addendum-2 §6: 74 was TOO THICK — it blurred the fine
 * shape details and muddied stroke intersections. 46 keeps the brush feel
 * while the form, the joins and the stroke differences stay clearly visible.
 */
export const STROKE_WIDTH = 46;

/**
 * Addendum-2 §2: the standard sample that replaces the accepted raw ink
 * re-inks itself fast (each stroke flows in) — a clean re-write, not a wait.
 * ~340ms per stroke + 110ms stagger keeps a 3-stroke glyph under ~1.3s.
 */
export const SAMPLE_STROKE_MS = 340;
export const SAMPLE_STROKE_STAGGER_MS = 110;

/** Addendum-2 §1: how fast the accepted raw ink fades out (ms). */
export const INK_FADE_MS = 520;

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
