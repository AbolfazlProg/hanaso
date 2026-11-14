/**
 * HANASO — PoC principal constant (TASK-M0-10 DB-layer).
 *
 * Single home for the DEV-ONLY default user id used by the no-auth slice (better-auth
 * lands in M1). Both the API routes and the Postgres repositories need it — sharing it
 * here keeps the D→understood gate and the DB `user_id` default consistent.
 */
export const POC_DEFAULT_USER_ID = 'poc-user';
