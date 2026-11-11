/**
 * HANASO — Resume expiration policy (TASK-HANASO-17 §۸) — PURE module.
 *
 * THE POLICY (owner-approved, RESUME_EXPIRATION_POLICY.md):
 *   A half-finished lesson's RESUME POINTER (never the learning history)
 *   expires after 7 days without MEANINGFUL activity:
 *     · meaningful = exercise answered / block answered / block advanced /
 *       station completed / writing practice / FIRST entry (row creation);
 *     · NOT meaningful = a plain re-entry/refresh of an already in-progress
 *       station (entering the page must not extend the deadline — §8.1).
 *   Boundary: now − lastActivityAt ≥ TTL → EXPIRED (closed boundary; the
 *   test-suite pins the exact 7×24h edge).
 *
 * WHAT EXPIRES: the walk POSITION only (server anchor `currentBlock` + the
 * browser walk snapshot). Completed stations, chapter states, best scores,
 * attempt counts, mastery stamps, analytics history and any future FSRS state
 * are NEVER touched (§8.4) — expiring a resume pointer is a presentation
 * decision, not a data deletion.
 *
 * TIMEZONE: comparisons are pure epoch-math (UTC ms) — no local timezone can
 * shift the verdict; Persian formatting happens only at display time.
 *
 * INJECTION: `nowMs` is a parameter everywhere (tests inject clocks; the
 * production system time is never monkey-patched — mission §13-E).
 */

/**
 * Default TTL: exactly 7 days in ms. A single named constant — the number
 * must never appear scattered across components (owner §8.1: «عدد پراکنده در
 * چند Component» is forbidden). Overridable ONLY through the env hook below
 * (used by the automated tests; production always uses this default).
 */
export const RESUME_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Test/lab override. Reads HANASO_RESUME_TTL_MS once per call (so tests can
 * flip it between cases); a missing/invalid value falls back to the default.
 * Production has no reason to set it.
 */
export function resumeTtlMs(): number {
  const raw = process.env.HANASO_RESUME_TTL_MS;
  if (raw === undefined || raw === '') return RESUME_TTL_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return RESUME_TTL_MS;
  return parsed;
}

/** Verdict of one resume pointer against a clock. */
export type ResumeFreshness = 'fresh' | 'expired' | 'unknown';

/**
 * Is a walk pointer still worth restoring?
 *   unknown — no trustworthy timestamp exists (pre-HANASO-17 rows, legacy
 *             snapshots): HONESTLY fresh-by-default so an upgrade never
 *             throws a learner back to block 0 out of nowhere.
 *   fresh   — last meaningful activity inside the TTL.
 *   expired — last meaningful activity reached/passed the TTL (closed bound).
 */
export function resumeFreshness(lastActivityAtMs: number | null | undefined, nowMs: number): ResumeFreshness {
  if (lastActivityAtMs === null || lastActivityAtMs === undefined) return 'unknown';
  if (!Number.isFinite(lastActivityAtMs)) return 'unknown';
  const age = nowMs - lastActivityAtMs;
  if (age < 0) return 'fresh'; // clock skew (client ahead) — tolerate small drift
  return age >= resumeTtlMs() ? 'expired' : 'fresh';
}

/** Parse a stored ISO timestamp to epoch ms (null when absent/unparseable). */
export function parseActivityAt(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}
