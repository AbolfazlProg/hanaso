/**
 * HANASO — Learner identity, CLIENT twin (TASK-LEARNING-08 / WP-5 — resolves #109;
 * TASK-HANASO-24 — the cookie is now httpOnly and server-owned; this twin no
 * longer reads or writes it).
 *
 * What changed in 24 and why:
 *  - pre-24 the cookie was written/read here via document.cookie (not
 *    httpOnly, no Secure) — audit BUG-028: JS-readable + client-writable
 *    identity, the forgery surface of the whole IDOR chain;
 *  - from 24 the middleware mints + SIGNS the cookie on the first server
 *    response, httpOnly, so JS can neither read nor overwrite it;
 *  - this twin therefore keeps ONLY the localStorage id, used to namespace
 *    walk snapshots (modules/curriculum/walk-persistence.ts) — it never
 *    crosses the network and never selects server-side data.
 *
 * Migration path (better-auth, M1): the authenticated user id takes
 * precedence; the guest id + its progress rows merge into the account.
 */
export const LEARNER_ID_STORAGE_KEY = 'hanaso.learnerId.v1';
export const LEARNER_COOKIE_NAME = 'hanaso_lid';

/** UUID v4 shape (crypto.randomUUID output) — anything else is not a learner id. */
export function isLearnerId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function readStoredId(): string | null {
  try {
    const raw = window.localStorage.getItem(LEARNER_ID_STORAGE_KEY);
    return raw && isLearnerId(raw) ? raw : null;
  } catch {
    return null; // private-mode storage — degrade honestly (no local id)
  }
}

function writeStoredId(id: string): void {
  try {
    window.localStorage.setItem(LEARNER_ID_STORAGE_KEY, id);
  } catch {
    /* storage unavailable — walk snapshots just won't persist */
  }
}

/**
 * The stable LOCAL id for THIS browser — creating it on first call. Safe to
 * call repeatedly (idempotent). Used only for localStorage key namespacing
 * (walk snapshots); server-side identity comes from the signed `hanaso_lid`
 * cookie, which this twin cannot and must not touch (TASK-HANASO-24).
 */
export function getOrCreateLearnerId(): string | null {
  if (typeof window === 'undefined') return null;
  const existing = readStoredId();
  if (existing) return existing;
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null;
  if (!id) return null;
  writeStoredId(id);
  return id;
}
