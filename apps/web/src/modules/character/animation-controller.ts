/**
 * HANASO — AnimationController (ADR-018 §۲-۱(ج)) — TASK-DLG-POC-01 / TASK-CHR-08 core.
 *
 * Scene-level state machine, engineering-owned and renderer-agnostic:
 *   idle → listening (non-speaker while a line is active) → speaking (line start→end)
 * Behaviours:
 * - Blink scheduler: random 2–6s per character, in ALL states (ADR-018 §۲-۱(ج)).
 * - Mouth active ONLY while speaking (soft open/close ~120ms ≈ 8Hz, no phoneme analysis).
 * - Listening characters gaze at the active speaker.
 * - emotion_tag → ExpressionTag; unknown → neutral + recorded warning (content CI signal).
 * - All renderer transitions respect the ≤400ms motion budget (DD-070 layer-2) —
 *   renderers own their CSS transition durations; the controller only issues commands.
 *
 * Pure TS (no DOM) — drives injected CharacterRenderer instances; unit-testable with fakes.
 */
import type {
  AnimationController as AnimationControllerContract,
  CharacterRenderer,
  CharacterRuntimeState,
  CharacterStateChange,
  ControllerLineEndInput,
  ControllerLineStartInput,
  ControllerPlaybackStatus,
  ExpressionTag,
} from './contracts';

/** Known emotion_tag → ExpressionTag (ADR-018 §۲-۲ vocabulary). */
const EMOTION_TAG_MAP: Record<string, ExpressionTag> = {
  neutral: 'neutral',
  happy: 'happy',
  surprised: 'surprised',
  apologetic: 'apologetic',
  thinking: 'thinking',
  sad: 'sad',
  confident: 'confident',
};

/** One blink: eyelid close+open. Kept inside the DD-070 micro-motion budget. */
export const BLINK_DURATION_MS = 120;
/** Blink interval bounds — random in [min,max] per character (ADR-018 §۲-۱(ج): ۲–۶s). */
export const BLINK_INTERVAL_MIN_MS = 2000;
export const BLINK_INTERVAL_MAX_MS = 6000;

type Timer = ReturnType<typeof setTimeout>;

interface CharacterRuntime {
  renderer: CharacterRenderer | null;
  state: CharacterRuntimeState;
  nextBlinkTimer: Timer | null;
  blinkCloseTimer: Timer | null;
}

export interface AnimationControllerOptions {
  /** Injectable RNG for deterministic tests (default: Math.random). */
  random?: () => number;
  /** Injectable clock for tests. */
  now?: () => number;
  /** Injectable scheduler (defaults to global setTimeout — faked in tests). */
  scheduler?: {
    set(cb: () => void, ms: number): Timer;
    clear(t: Timer): void;
  };
}

export class AnimationController implements AnimationControllerContract {
  private readonly random: () => number;
  private readonly now: () => number;
  private readonly scheduler: { set(cb: () => void, ms: number): Timer; clear(t: Timer): void };
  private readonly characters = new Map<string, CharacterRuntime>();
  private running = false;

  constructor(opts: AnimationControllerOptions = {}) {
    this.random = opts.random ?? Math.random;
    this.now = opts.now ?? (() => Date.now());
    this.scheduler = opts.scheduler ?? {
      set: (cb, ms) => setTimeout(cb, ms),
      clear: (t) => clearTimeout(t),
    };
  }

  // ------------------------------------------------------------ scene wiring

  attach(characterId: string, renderer: CharacterRenderer): void {
    const existing = this.characters.get(characterId);
    if (existing) this.detach(characterId);
    this.characters.set(characterId, {
      renderer,
      state: {
        characterId,
        state: 'idle',
        expression: 'neutral',
        gazeTargetId: null,
        mouthActive: false,
        lastBlinkAtMs: null,
        blinkCount: 0,
        warnings: [],
      },
      nextBlinkTimer: null,
      blinkCloseTimer: null,
    });
    this.push(characterId, { characterId, state: 'idle', atMs: this.now(), gazeTargetId: null, mouthActive: false });
    if (this.running) this.scheduleNextBlink(characterId);
  }

  detach(characterId: string): void {
    const rt = this.characters.get(characterId);
    if (!rt) return;
    this.clearBlinkTimers(rt);
    rt.renderer?.destroy();
    this.characters.delete(characterId);
  }

  // ------------------------------------------------------------ playback inputs

  handleLineStart(ev: ControllerLineStartInput): void {
    const { expression, warning } = this.mapEmotionTag(ev.emotionTag);
    for (const [id, rt] of this.characters) {
      if (id === ev.speakerId) {
        rt.state.state = 'speaking';
        rt.state.expression = expression;
        rt.state.gazeTargetId = null; // speaking character faces the learner/camera
        rt.state.mouthActive = true; // mouth flaps ONLY while speaking (ADR-018)
        if (warning) rt.state.warnings.push(warning);
        this.push(id, {
          characterId: id,
          state: 'speaking',
          lineId: ev.lineId,
          atMs: ev.atMs,
          gazeTargetId: null,
          mouthActive: true,
        });
        rt.renderer?.setExpression(expression);
      } else {
        rt.state.state = 'listening';
        rt.state.gazeTargetId = ev.speakerId; // look at the active speaker
        rt.state.mouthActive = false;
        this.push(id, {
          characterId: id,
          state: 'listening',
          lineId: ev.lineId,
          atMs: ev.atMs,
          gazeTargetId: ev.speakerId,
          mouthActive: false,
        });
      }
    }
  }

  handleLineEnd(ev: ControllerLineEndInput): void {
    for (const [id, rt] of this.characters) {
      // speaker returns to listening (still in scene); gaze clears — no active speaker during the gap
      rt.state.state = 'listening';
      rt.state.mouthActive = false;
      rt.state.gazeTargetId = null;
      this.push(id, {
        characterId: id,
        state: 'listening',
        lineId: ev.lineId,
        atMs: ev.atMs,
        gazeTargetId: null,
        mouthActive: false,
      });
    }
  }

  handlePlaybackStateChange(status: ControllerPlaybackStatus): void {
    if (status === 'idle' || status === 'ended') {
      for (const [id, rt] of this.characters) {
        rt.state.state = 'idle';
        rt.state.gazeTargetId = null;
        rt.state.mouthActive = false;
        this.push(id, { characterId: id, state: 'idle', atMs: this.now(), gazeTargetId: null, mouthActive: false });
      }
    }
  }

  // ------------------------------------------------------------ background scheduler

  start(): void {
    if (this.running) return;
    this.running = true;
    for (const id of this.characters.keys()) this.scheduleNextBlink(id);
  }

  stop(): void {
    this.running = false;
    for (const rt of this.characters.values()) this.clearBlinkTimers(rt);
  }

  private scheduleNextBlink(characterId: string): void {
    const rt = this.characters.get(characterId);
    if (!rt || !this.running) return;
    const delay = BLINK_INTERVAL_MIN_MS + this.random() * (BLINK_INTERVAL_MAX_MS - BLINK_INTERVAL_MIN_MS);
    rt.nextBlinkTimer = this.scheduler.set(() => {
      rt.nextBlinkTimer = null;
      this.blinkNow(characterId);
      this.scheduleNextBlink(characterId);
    }, delay);
  }

  private blinkNow(characterId: string): void {
    const rt = this.characters.get(characterId);
    if (!rt) return;
    const atMs = this.now();
    rt.state.lastBlinkAtMs = atMs;
    rt.state.blinkCount += 1;
    // One-shot blink on capable renderers (CSS transition ≈ BLINK_DURATION_MS).
    const renderer = rt.renderer as Partial<{ blink: () => void }> | null;
    renderer?.blink?.();
    rt.blinkCloseTimer = this.scheduler.set(() => {
      rt.blinkCloseTimer = null;
    }, BLINK_DURATION_MS);
  }

  private clearBlinkTimers(rt: CharacterRuntime): void {
    if (rt.nextBlinkTimer !== null) {
      this.scheduler.clear(rt.nextBlinkTimer);
      rt.nextBlinkTimer = null;
    }
    if (rt.blinkCloseTimer !== null) {
      this.scheduler.clear(rt.blinkCloseTimer);
      rt.blinkCloseTimer = null;
    }
  }

  // ------------------------------------------------------------ introspection

  snapshot(): Record<string, CharacterRuntimeState> {
    const out: Record<string, CharacterRuntimeState> = {};
    for (const [id, rt] of this.characters) out[id] = { ...rt.state, warnings: [...rt.state.warnings] };
    return out;
  }

  mapEmotionTag(tag: string | undefined): { expression: ExpressionTag; warning?: string } {
    if (tag === undefined) return { expression: 'neutral' };
    const mapped = EMOTION_TAG_MAP[tag];
    if (mapped) return { expression: mapped };
    return {
      expression: 'neutral',
      warning: `unknown emotion_tag "${tag}" → neutral (fix content; ADR-018 §۲-۲)`,
    };
  }

  // ------------------------------------------------------------ renderer push

  private push(characterId: string, change: CharacterStateChange): void {
    this.characters.get(characterId)?.renderer?.setState(change);
  }
}
