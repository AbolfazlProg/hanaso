/**
 * HANASO — practice module public API, CLIENT-SAFE (TASK-SLICE-01 / Issue #40).
 * Pure TypeScript only (deterministic generator + checker run on both the server
 * RSC that renders /poc/practice and the client island that collects answers).
 * No node builtins → no `server` entry needed for this module.
 */
export {
  EXERCISE_KINDS,
  type ExerciseAnswer,
  type Exercise,
  type ExerciseItem,
  type ExerciseKind,
  type ExerciseOption,
  type FillTokenItem,
  type ListenNoTextItem,
  type OrderReconstructItem,
  type SpeakerIdentifyItem,
  type TokenOption,
} from './types';
export { KIND_OBJECTIVES, generateExercises } from './generator';
export { PracticeCheckError, checkAnswers, isAnswerCorrect } from './checker';
export type { ExerciseOutcome, PracticeCheckResult } from './checker';
