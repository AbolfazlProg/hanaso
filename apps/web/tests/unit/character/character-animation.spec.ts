/**
 * TASK-DLG-POC-01 — ADR-018 AnimationController behaviours (unit, fake renderers + timers):
 * - active speaker → speaking; everyone else → listening, gazing at the speaker
 * - emotion_tag → ExpressionTag; unknown → neutral + warning
 * - mouth active ONLY while speaking
 * - blink scheduler: random 2–6s in every state
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AnimationController,
  BLINK_INTERVAL_MAX_MS,
  BLINK_INTERVAL_MIN_MS,
  type CharacterRenderer,
  type CharacterStateChange,
  type ExpressionTag,
} from '@/modules/character';

class FakeRenderer implements CharacterRenderer {
  states: CharacterStateChange[] = [];
  expressions: ExpressionTag[] = [];
  blinks = 0;
  destroyed = false;

  async mount(): Promise<void> {}
  setState(s: CharacterStateChange): void {
    this.states.push(s);
  }
  setExpression(tag: ExpressionTag): void {
    this.expressions.push(tag);
  }
  blink(): void {
    this.blinks += 1;
  }
  destroy(): void {
    this.destroyed = true;
  }
  get lastState(): CharacterStateChange | undefined {
    return this.states.at(-1);
  }
}

function threeCharacterScene(controller: AnimationController) {
  const renderers: Record<string, FakeRenderer> = {
    'chr-miki': new FakeRenderer(),
    'chr-yamada': new FakeRenderer(),
    'chr-sora': new FakeRenderer(),
  };
  for (const [id, r] of Object.entries(renderers)) controller.attach(id, r);
  return renderers;
}

describe('AnimationController — scene state machine (ADR-018 §۲-۱ج)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('active speaker → speaking; the other two → listening and gazing at the speaker', () => {
    const controller = new AnimationController();
    const renderers = threeCharacterScene(controller);

    controller.handleLineStart({
      lineId: 's-cafe-morning-01-l2',
      speakerId: 'chr-miki',
      emotionTag: 'happy',
      atMs: 1000,
    });

    expect(renderers['chr-miki']!.lastState).toMatchObject({
      characterId: 'chr-miki',
      state: 'speaking',
      lineId: 's-cafe-morning-01-l2',
      mouthActive: true,
      gazeTargetId: null,
    });
    for (const other of ['chr-yamada', 'chr-sora'] as const) {
      expect(renderers[other]!.lastState).toMatchObject({
        state: 'listening',
        gazeTargetId: 'chr-miki', // look at the active speaker (ADR-018)
        mouthActive: false,
      });
    }
    const snap = controller.snapshot();
    expect(snap['chr-miki']!.state).toBe('speaking');
    expect(snap['chr-yamada']!.state).toBe('listening');
    expect(snap['chr-sora']!.state).toBe('listening');
  });

  it('emotion_tag maps to ExpressionTag; mouth is active ONLY while speaking', () => {
    const controller = new AnimationController();
    const renderers = threeCharacterScene(controller);

    controller.handleLineStart({
      lineId: 'l-a',
      speakerId: 'chr-yamada',
      emotionTag: 'apologetic',
      atMs: 1,
    });
    expect(renderers['chr-yamada']!.expressions.at(-1)).toBe('apologetic');

    controller.handleLineEnd({ lineId: 'l-a', speakerId: 'chr-yamada', atMs: 2 });
    // after the line ends nobody is speaking → no mouth anywhere
    for (const r of Object.values(renderers)) {
      expect(r.lastState?.mouthActive).toBe(false);
      expect(r.lastState?.state).toBe('listening');
    }

    controller.handleLineStart({ lineId: 'l-b', speakerId: 'chr-sora', emotionTag: undefined, atMs: 3 });
    expect(renderers['chr-sora']!.expressions.at(-1)).toBe('neutral'); // no tag → neutral
    // across the whole timeline: mouthActive appears ONLY in speaking states
    for (const r of Object.values(renderers)) {
      for (const s of r.states) {
        expect(s.mouthActive).toBe(s.state === 'speaking');
      }
    }
  });

  it('unknown emotion_tag → neutral + recorded warning (content CI signal)', () => {
    const controller = new AnimationController();
    const renderers = threeCharacterScene(controller);

    const mapped = controller.mapEmotionTag('excited');
    expect(mapped.expression).toBe('neutral');
    expect(mapped.warning).toContain('excited');

    controller.handleLineStart({ lineId: 'l-x', speakerId: 'chr-miki', emotionTag: 'excited', atMs: 1 });
    expect(renderers['chr-miki']!.expressions.at(-1)).toBe('neutral');
    expect(controller.snapshot()['chr-miki']!.warnings.some((w) => w.includes('excited'))).toBe(true);
  });

  it('playback idle/ended → everyone back to idle', () => {
    const controller = new AnimationController();
    const renderers = threeCharacterScene(controller);
    controller.handleLineStart({ lineId: 'l-a', speakerId: 'chr-miki', emotionTag: 'happy', atMs: 1 });
    controller.handlePlaybackStateChange('ended');
    for (const r of Object.values(renderers)) {
      expect(r.lastState?.state).toBe('idle');
      expect(r.lastState?.mouthActive).toBe(false);
    }
  });

  it('blinks randomly every 2–6s in all states, driven through the renderer', () => {
    const controller = new AnimationController({ random: () => 0.5 }); // deterministic mid-point
    const renderers = threeCharacterScene(controller);
    controller.start();

    // random=0.5 → interval exactly 4000ms
    vi.advanceTimersByTime(BLINK_INTERVAL_MIN_MS + 1999); // 3999ms
    expect(renderers['chr-miki']!.blinks).toBe(0);
    vi.advanceTimersByTime(1); // 4000ms
    expect(renderers['chr-miki']!.blinks).toBe(1);
    expect(renderers['chr-yamada']!.blinks).toBe(1);
    expect(renderers['chr-sora']!.blinks).toBe(1);

    // blinking continues while a line is being spoken (background behaviour)
    controller.handleLineStart({ lineId: 'l-a', speakerId: 'chr-miki', emotionTag: 'neutral', atMs: 4001 });
    vi.advanceTimersByTime(4000);
    expect(renderers['chr-miki']!.blinks).toBe(2); // blink in speaking state too

    const snap = controller.snapshot();
    expect(snap['chr-miki']!.blinkCount).toBe(2);
    expect(snap['chr-miki']!.lastBlinkAtMs).not.toBeNull();
  });

  it('blink interval respects the 2s and 6s bounds for extreme RNG values', () => {
    const min = new AnimationController({ random: () => 0 });
    const rMin = new FakeRenderer();
    min.attach('chr-miki', rMin);
    min.start();
    vi.advanceTimersByTime(BLINK_INTERVAL_MIN_MS - 1);
    expect(rMin.blinks).toBe(0);
    vi.advanceTimersByTime(1);
    expect(rMin.blinks).toBe(1); // exactly at the 2s floor

    const max = new AnimationController({ random: () => 1 });
    const rMax = new FakeRenderer();
    max.attach('chr-miki', rMax);
    max.start();
    vi.advanceTimersByTime(BLINK_INTERVAL_MAX_MS - 1);
    expect(rMax.blinks).toBe(0);
    vi.advanceTimersByTime(1);
    expect(rMax.blinks).toBe(1); // exactly at the 6s ceiling
  });

  it('stop() halts the blink scheduler; detach destroys the renderer', () => {
    const controller = new AnimationController({ random: () => 0.5 });
    const renderers = threeCharacterScene(controller);
    controller.start();
    vi.advanceTimersByTime(4000);
    const blinked = renderers['chr-miki']!.blinks;
    expect(blinked).toBe(1);

    controller.stop();
    vi.advanceTimersByTime(60_000);
    expect(renderers['chr-miki']!.blinks).toBe(blinked); // frozen

    controller.detach('chr-miki');
    expect(renderers['chr-miki']!.destroyed).toBe(true);
  });
});
