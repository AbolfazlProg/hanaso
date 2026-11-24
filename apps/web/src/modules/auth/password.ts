/**
 * HANASO — the password credential service (M2 · AUTH-PASSWORD — owner
 * revision 2026-11-24: username+password is THE primary login; the four
 * older methods become password-RECOVERY methods).
 *
 * Storage follows the M1 architecture exactly — NO parallel system:
 *  - the scrypt encoder from credentials.ts (N=2^15, fresh salt,
 *    self-describing form) hashes the password into
 *    auth_identities.credential_hash;
 *  - provider='password', provider_account_id = the user's own id (stable
 *    across username changes; UNIQUE(user_id, provider) keeps it one-row);
 *  - the handle users.username (unique index) routes the login, exactly like
 *    auth_identities routes google/email.
 *
 * Rules implemented here:
 *  - setPassword: replace-style (fresh salt every change — no hash reuse);
 *  - verifyPassword: constant-time via verifySecret; unknown/absent → false;
 *  - the password identity is NEVER unlinkable from the methods page (it is
 *    CHANGED, not removed) — enforced in identities.unlinkMethod.
 */
import { and, eq } from 'drizzle-orm';
import { getDbClient } from '@/db/client';
import { authIdentities, users } from '../../../db/schema';
import { hashSecret, verifySecret } from './credentials';

/** The password identity row of a user (or null when none is set). */
export async function getPasswordIdentity(userId: string) {
  const { db } = getDbClient();
  const rows = await db
    .select()
    .from(authIdentities)
    .where(and(eq(authIdentities.userId, userId), eq(authIdentities.provider, 'password')))
    .limit(1);
  return rows[0] ?? null;
}

/** True when the account has an ACTIVE password credential. */
export async function hasPassword(userId: string): Promise<boolean> {
  const row = await getPasswordIdentity(userId);
  return Boolean(row && !row.disabledAt);
}

/**
 * Set (or replace) the password credential. A fresh scrypt salt every call —
 * changing a password never reuses the old hash. Re-enables a previously
 * disabled row if one exists (UNIQUE(user_id, provider) makes it an update).
 */
export async function setPassword(userId: string, password: string): Promise<void> {
  const { db } = getDbClient();
  const existing = await getPasswordIdentity(userId);
  if (existing) {
    await db
      .update(authIdentities)
      .set({
        credentialHash: hashSecret(password),
        verifiedAt: new Date(),
        disabledAt: null,
        lastUsedAt: new Date(),
      })
      .where(eq(authIdentities.id, existing.id));
    return;
  }
  await db.insert(authIdentities).values({
    userId,
    provider: 'password',
    providerAccountId: userId,
    credentialHash: hashSecret(password),
    verifiedAt: new Date(),
  });
}

/**
 * Verify a password for login — constant-time, and `false` for every
 * no-credential / disabled / malformed case (the caller answers ONE generic
 * message; which check failed is never leaked).
 */
export async function verifyPassword(userId: string, password: string): Promise<boolean> {
  if (typeof password !== 'string' || password.length === 0 || password.length > 200) return false;
  const row = await getPasswordIdentity(userId);
  if (!row || row.disabledAt) return false;
  return verifySecret(password, row.credentialHash);
}

/** Stamp the password identity's last-used marker (login success path). */
export async function touchPasswordUsage(userId: string): Promise<void> {
  const { db } = getDbClient();
  await db
    .update(authIdentities)
    .set({ lastUsedAt: new Date() })
    .where(and(eq(authIdentities.userId, userId), eq(authIdentities.provider, 'password')));
}

/* ------------------------------------------------------------- username */

/** The user row's username (or null) — the login handle truth. */
export async function getUsername(userId: string): Promise<string | null> {
  const { db } = getDbClient();
  const rows = await db.select({ username: users.username }).from(users).where(eq(users.id, userId)).limit(1);
  return rows[0]?.username ?? null;
}

/** Find a user id by the exact (already normalized) username. */
export async function findUserIdByUsername(username: string): Promise<string | null> {
  const { db } = getDbClient();
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  return rows[0]?.id ?? null;
}

/**
 * Set the login handle for an account that has none (google-created or
 * legacy mnemonic accounts — the «phrase users can set a username» rule).
 * Returns 'taken' when another account already owns the handle and
 * 'already_set' when this account has one (changes go through the profile).
 */
export async function setUsername(
  userId: string,
  username: string,
): Promise<{ ok: true } | { ok: false; reason: 'taken' | 'already_set' }> {
  const { db } = getDbClient();
  const mine = await getUsername(userId);
  if (mine) return { ok: false, reason: 'already_set' };
  const owner = await findUserIdByUsername(username);
  if (owner && owner !== userId) return { ok: false, reason: 'taken' };
  await db.update(users).set({ username, updatedAt: new Date() }).where(eq(users.id, userId));
  return { ok: true };
}
