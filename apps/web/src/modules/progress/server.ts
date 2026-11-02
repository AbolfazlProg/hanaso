/**
 * HANASO — progress module SERVER entry (node-only public API; TASK-SLICE-01 → M0-10).
 * Unit-progress repository: in-memory DEV-ONLY impl + the Postgres impl (`app.lesson_progress`)
 * behind the same async interface — the switch lives in `lib/poc/stores.ts`.
 */
export { InMemoryProgressRepository, newProgressRowId } from './repository';
export type { ProgressRepository } from './repository';
export { PgProgressRepository } from '../../db/repositories/progress';
