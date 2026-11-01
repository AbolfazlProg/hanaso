/**
 * HANASO — character module public API (KB ADR-001: cross-module imports via index.ts only).
 * TASK-DLG-POC-01 / ADR-018.
 */
export type {
  AnimationController as AnimationControllerContract,
  BlinkCapableRenderer,
  CharacterAssetManifest,
  CharacterAssetRef,
  CharacterRenderer,
  CharacterRuntimeState,
  CharacterStateChange,
  CharacterStateId,
  ControllerLineEndInput,
  ControllerLineStartInput,
  ControllerPlaybackStatus,
  ExpressionTag,
} from './contracts';
export {
  AnimationController,
  BLINK_DURATION_MS,
  BLINK_INTERVAL_MAX_MS,
  BLINK_INTERVAL_MIN_MS,
} from './animation-controller';
export { SvgPlaceholderRenderer } from './renderers/svg-placeholder';
export { characterManifestSchema, listCharacters, registeredVoiceIds, resolveSpeaker } from './registry';
