/**
 * HANASO — mastery module SERVER entry (node-only public API; TASK-DLG-POC-01 → M0-10).
 * Attempt repository: in-memory DEV-ONLY impl + the Postgres impl (`app.dialogue_mastery_attempts`)
 * behind the same async interface — the switch lives in `lib/poc/stores.ts`.
 */
export { InMemoryAttemptRepository } from './repository';
export type { AttemptRepository } from './repository';
export { PgAttemptRepository, findAttemptById } from '../../db/repositories/attempts';
