/**
 * HANASO — Character system contracts (ADR-018 §۲ — exact interface trio).
 * These three contracts are the ONLY engineering↔art contact surface:
 *   CharacterAssetManifest (JSON per character) · CharacterRenderer (DI) · AnimationController.
 * Production code depends on these interfaces, never on the SVG placeholder (ADR-018 §۲-۴).
 */

/** Locked vocabulary — ADR-018 §۲-۲ (extensible only with a minor contract version). */
export type CharacterStateId = 'idle' | 'listening' | 'speaking';

/** Locked vocabulary — ADR-018 §۲-۲. */
export type ExpressionTag = 'neutral' | 'happy' | 'surprised' | 'apologetic' | 'thinking' | 'sad' | 'confident';

/** Reference to a concrete art asset (null = fall back to neutral, ADR-018 §۲-۱(a)). */
export interface CharacterAssetRef {
  src: string;
  hash?: string;
}

/**
 * Per-character descriptor file: `content/characters/<id>/manifest.json` (ADR-018 §۲-۱(a)).
 * Semver is the ART version — independent of code version.
 */
export interface CharacterAssetManifest {
  id: string; // 'chr-miki'
  version: string; // art semver
  nameJa: string;
  nameFa: string;
  role: 'central' | 'companion-1' | 'companion-2';
  /** Token name from tokens.css (DD-067), e.g. 'speaker-1' → var(--color-speaker-1). */
  colorToken: string;
  /** → config/voices.yaml (audio wiring, ADR-009). */
  voiceId: string;
  states: CharacterStateId[];
  expressions: Record<ExpressionTag, CharacterAssetRef | null>;
  assets: {
    renderer: 'svg-css' | 'rive' | 'spine' | 'lottie' | 'video';
    entry: string;
    layers?: string[];
    totalBytes: number;
    checksums: Record<string, string>;
  };
  performance: { fps60Mobile: boolean; measuredBytes: number };
}

/**
 * State change pushed from the AnimationController to a renderer (ADR-018 §۲-۱(b)).
 * Core four fields are the ADR contract; the optional extras below are the PoC
 * concretization (gaze/mouth/blink are required by ADR §۲-۱(ج) behaviours but had no
 * carrier in the illustrative comment — flagged for ADR-018 refinement, see the PoC report).
 */
export interface CharacterStateChange {
  characterId: string;
  state: CharacterStateId;
  lineId?: string;
  atMs: number;
  /** Who this character is looking at (active speaker while listening). */
  gazeTargetId?: string | null;
  /** Mouth flaps only while speaking (ADR-018 §۲-۱(ج)) — ~8–12Hz soft open/close. */
  mouthActive?: boolean;
}

/** Renderer contract (ADR-018 §۲-۱(b)). Placeholder impl: renderers/svg-placeholder.ts. */
export interface CharacterRenderer {
  mount(el: HTMLElement, manifest: CharacterAssetManifest): Promise<void>;
  setState(s: CharacterStateChange): void;
  setExpression(tag: ExpressionTag, intensity?: number): void;
  destroy(): void;
}

/**
 * Optional renderer capability: externally-driven blink (the AnimationController owns the
 * random 2–6s schedule; renderers that implement this get one-shot blink triggers).
 * Renderers without it may self-blink ambiently — the controller keeps its own bookkeeping.
 */
export interface BlinkCapableRenderer extends CharacterRenderer {
  blink(): void;
}

/** Input event shapes the controller consumes (fed from the dialogue playback engine). */
export interface ControllerLineStartInput {
  lineId: string;
  speakerId: string;
  /** Raw emotion_tag from dialogue content — mapped to ExpressionTag, unknown → neutral + warning. */
  emotionTag?: string;
  atMs: number;
}

export interface ControllerLineEndInput {
  lineId: string;
  speakerId: string;
  atMs: number;
}

export type ControllerPlaybackStatus = 'idle' | 'playing' | 'paused' | 'error' | 'ended';

/** Testable per-character runtime snapshot (drives unit tests + debug UI). */
export interface CharacterRuntimeState {
  characterId: string;
  state: CharacterStateId;
  expression: ExpressionTag;
  gazeTargetId: string | null;
  mouthActive: boolean;
  lastBlinkAtMs: number | null;
  blinkCount: number;
  warnings: string[];
}

/**
 * Scene-level animation logic — engineering-owned, renderer-agnostic (ADR-018 §۲-۱(ج)).
 * Impl: animation-controller.ts.
 */
export interface AnimationController {
  attach(characterId: string, renderer: CharacterRenderer): void;
  detach(characterId: string): void;
  handleLineStart(ev: ControllerLineStartInput): void;
  handleLineEnd(ev: ControllerLineEndInput): void;
  handlePlaybackStateChange(status: ControllerPlaybackStatus): void;
  /** Start/stop the background scheduler (blinking). */
  start(): void;
  stop(): void;
  snapshot(): Record<string, CharacterRuntimeState>;
  /** Emotion tag mapping is exposed for content CI reuse. */
  mapEmotionTag(tag: string | undefined): { expression: ExpressionTag; warning?: string };
}
