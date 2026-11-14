/**
 * HANASO — Learner identity (TASK-LEARNING-08 / WP-5 — resolves #109).
 *
 * PROBLEM (owner feedback E + #109): every learn page and API keyed progress to
 * the SHARED 'poc-user' id — all visitors shared one progress store, and nothing
 * survived a walk-state reset because in-station position was never persisted.
 *
 * DESIGN (mission §8.4, no-auth yet): a stable per-browser learner id:
 *  - generated ONCE per install (crypto.randomUUID), stored in localStorage
 *    `hanaso.learnerId.v1` AND mirrored into the cookie `hanaso_lid` (365d) so
 *    RSC pages / route handlers can resolve it server-side.
 *  - the server prefers this id and falls back to POC_DEFAULT_USER_ID only when
 *    the cookie is absent/invalid (first-ever visit, tests) — never a shared
 *    account for real browsing.
 *  - MIGRATION PATH (better-auth, M1): the authenticated user id takes
 *    precedence; the guest id + its progress rows merge into the account.
 *
 * Client-side only (localStorage/document.cookie) — the server twin lives in
 * `./server.ts`.
 */

export const LEARNER_ID_STORAGE_KEY = 'hanaso.learnerId.v1';
export const LEARNER_COOKIE_NAME = 'hanaso_lid';
const LEARNER_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 365; // one year

/** UUID v4 shape (crypto.randomUUID output) — anything else is not a learner id. */
export function isLearnerId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function readStoredId(): string | null {
  try {
    const raw = window.localStorage.getItem(LEARNER_ID_STORAGE_KEY);
    return raw && isLearnerId(raw) ? raw : null;
  } catch {
    return null; // private-mode storage — degrade honestly to the cookie path
  }
}

function writeStoredId(id: string): void {
  try {
    window.localStorage.setItem(LEARNER_ID_STORAGE_KEY, id);
  } catch {
    /* storage unavailable — the cookie still carries the id */
  }
}

function readCookieId(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LEARNER_COOKIE_NAME}=([^;]+)`));
  const raw = match?.[1] ? decodeURIComponent(match[1]) : null;
  return raw && isLearnerId(raw) ? raw : null;
}

function writeCookieId(id: string): void {
  // Not httpOnly on purpose: set from the client, read by RSC/route handlers.
  document.cookie = `${LEARNER_COOKIE_NAME}=${encodeURIComponent(id)}; path=/; max-age=${LEARNER_COOKIE_MAX_AGE_S}; samesite=lax`;
}

/**
 * The stable learner id for THIS browser — creating it on first call. Safe to
 * call repeatedly (idempotent); returns null only when neither storage nor
 * cookies work (extremely rare — caller falls back to server default).
 */
export function getOrCreateLearnerId(): string | null {
  if (typeof window === 'undefined') return null;
  const existing = readStoredId() ?? readCookieId();
  if (existing) {
    // keep both stores in sync (cheap no-ops when already written)
    writeStoredId(existing);
    if (readCookieId() !== existing) writeCookieId(existing);
    return existing;
  }
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null;
  if (!id) return null;
  writeStoredId(id);
  writeCookieId(id);
  return id;
}
