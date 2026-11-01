/**
 * HANASO — progress module SERVER entry (node-only public API; TASK-SLICE-01).
 * Unit-progress repository (DEV-ONLY in-memory slice impl behind the interface —
 * the Postgres app.lesson_progress implementation lands with DATABASE_URL, M0-10/M1).
 */
export { InMemoryProgressRepository, newProgressRowId } from './repository';
export type { ProgressRepository } from './repository';
