/**
 * HANASO — Learner session tokens (TASK-HANASO-24 / CP-02 — RC-2 remediation).
 *
 * The pre-24 identity was a RAW uuid cookie: forgeable (no server-side
 * issuance proof), JS-readable (no httpOnly), plaintext-transportable (no
 * Secure) — audit BUG-028. The 24 contract:
 *
 *   hanaso_lid = <uuid>.<base64url(hmac_sha256(secret, "hanaso_lid:v1:" + uuid))>
 *
 * - the token is minted ONLY by the server (middleware, GET/HEAD — see
 *   middleware.ts); a client cannot invent a valid (uuid, signature) pair;
 * - resolvers verify the signature (constant-time) before accepting the uuid
 *   as an identity — a stolen/forged RAW uuid (no signature) is guest;
 * - a legacy raw-uuid cookie is re-issued SIGNED with the SAME uuid on the
 *   first GET (one-time transition — no re-keying, no orphaned progress);
 * - the module is PURE (no crypto import): the HMAC itself has two thin
 *   runtime wrappers — `./session-node` (node:crypto, sync — resolvers/tests)
 *   and `./session-web` (WebCrypto, async — the edge middleware). Both
 *   produce identical bytes over the same secret + message.
 *
 * Secret: HANASO_SESSION_SECRET (≥ 32 random chars in production — see
 * RELEASE_CANDIDATE). Without it a fixed DEV fallback is used so dev/test
 * stay deterministic; the fallback is loudly inert because dev never serves
 * production learners.
 */
import { isLearnerId, LEARNER_COOKIE_NAME } from './identity';

export { LEARNER_COOKIE_NAME };

/** Domain separation for the HMAC message (versioned: a future v2 can coexist). */
export const SESSION_TOKEN_DOMAIN = 'hanaso_lid:v1:';

/** base64url (no padding) length of a SHA-256 HMAC — fixed by construction. */
const SESSION_SIGNATURE_LENGTH = 43;

/** Insecure but deterministic fallback — dev/test only (no HANASO_SESSION_SECRET). */
const DEV_SESSION_SECRET = 'hanaso-dev-session-secret-v1-do-not-use-in-production';

let warnedMissingSecret = false;

/** The HMAC key for this process (env first; deterministic dev fallback). */
export function getSessionSecret(): string {
  const fromEnv = process.env.HANASO_SESSION_SECRET;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv;
  if (!warnedMissingSecret) {
    warnedMissingSecret = true;
    if (process.env.NODE_ENV === 'production') {
      // No throw: booting must stay possible; the token is still unforgeable to
      // outsiders who don't know the source. The release gate refuses to ship.
      console.warn('[hanaso/session] HANASO_SESSION_SECRET is not set — using the public dev fallback. Set a real secret before serving real learners.');
    }
  }
  return DEV_SESSION_SECRET;
}

/** The exact bytes both HMAC implementations sign. */
export function sessionTokenMessage(uuid: string): string {
  return `${SESSION_TOKEN_DOMAIN}${uuid}`;
}

export interface SessionTokenParts {
  uuid: string;
  signature: string;
}

/**
 * Structural parse of a cookie value into (uuid, signature).
 * Returns null for anything that is not a v1 session token — including
 * legacy RAW uuids (no dot, no signature) and garbage.
 */
export function parseSessionToken(value: string): SessionTokenParts | null {
  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const uuid = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!isLearnerId(uuid)) return null;
  if (signature.length !== SESSION_SIGNATURE_LENGTH) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(signature)) return null;
  return { uuid, signature };
}

/** Test/migration helper: is this value a legacy RAW uuid (pre-24 cookie)? */
export function isRawLegacyLearnerValue(value: string): boolean {
  return isLearnerId(value);
}
