/**
 * HANASO — mastery module public API, CLIENT-SAFE (TASK-DLG-POC-01).
 * Types + scoring constants are shared; the node-backed repository is behind
 * `@/modules/mastery/server`.
 */
export {
  MASTERY_MEASURES,
  attemptInputSchema,
  attemptSubmissionSchema,
  dialogueMasteryAttemptSchema,
  weakPointSchema,
} from './types';
export type { AttemptInput, DialogueMasteryAttempt, MasteryMeasure, MasteryScores, WeakPoint } from './types';
export { MASTERY_WEIGHTS, computeMastery } from './scoring';
export type { MasteryResult, MasteryThresholds } from './scoring';
