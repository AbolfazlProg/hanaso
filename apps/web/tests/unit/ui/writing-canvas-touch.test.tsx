// @vitest-environment jsdom
/**
 * HANASO — LESSON-UX PART1 (owner order 2026-11-26): the writing canvas touch law.
 *
 * «باکس مخصوص نوشتن قابلیت اسکرول کردن توش را ندارد — وقتی فقط دارد چیزی
 * نشان می‌دهد باید بتوانی اسکرول کنی.»
 *
 * The canvas square owns the touch gesture ONLY while it actually accepts
 * drawing (guided tracing / a live free attempt — exactly what onPointerDown
 * guards on). Every display-only state (the intro teaching pass, demo replays,
 * in-place replays, the resting reference, a finished attempt with its reveal)
 * must let the vertical page scroll pass straight through the square.
 *
 * The law is a PURE function (canvasAcceptsDrawing/canvasTouchClass) that both
 * the render className and the pointer guard read — they can never drift apart.
 */
import { describe, expect, it } from 'vitest';
import { canvasAcceptsDrawing, canvasTouchClass, type WritingMode } from '@/components/writing/writing-canvas';

describe('LESSON-UX PART1 — the writing canvas touch law', () => {
  it('display-only modes NEVER capture the touch — the page scrolls through the square', () => {
    const displayOnly: WritingMode[] = ['intro', 'demo', 'reference'];
    for (const mode of displayOnly) {
      expect(canvasAcceptsDrawing(mode), `${mode} is display-only`).toBe(false);
      expect(canvasTouchClass(mode), `${mode} must pass the vertical scroll`).toBe('touch-pan-y');
      expect(canvasTouchClass(mode), `${mode} must never lock the gesture`).not.toBe('touch-none');
    }
  });

  it('drawing modes capture the gesture — pen input owns the square', () => {
    expect(canvasTouchClass('guided')).toBe('touch-none');
    expect(canvasTouchClass('free')).toBe('touch-none');
  });

  it('a mid-write REPLAY (تکرار آموزش) releases the touch while it plays', () => {
    // the in-place teaching replay is display-only even inside a drawing mode
    expect(canvasAcceptsDrawing('free', { replaying: true })).toBe(false);
    expect(canvasTouchClass('guided', { replaying: true })).toBe('touch-pan-y');
  });

  it('a FINISHED free attempt (the reveal state) releases the touch', () => {
    expect(canvasAcceptsDrawing('free', { attemptDone: true })).toBe(false);
    expect(canvasTouchClass('free', { attemptDone: true })).toBe('touch-pan-y');
    // but an in-progress attempt keeps it
    expect(canvasTouchClass('free', { attemptDone: false })).toBe('touch-none');
  });
});
