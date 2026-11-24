/**
 * HANASO — identifier+password login (M2 · AUTH-PASSWORD — owner revision
 * 2026-11-24). THE primary way in: «کاربر هر بار با رمز و نام کاربریش وارد
 * می‌شود».
 *
 * The identifier is ONE field accepting either:
 *  - a username (normalized via password-policy.normalizeUsername), or
 *  - an email address (lowercased) — resolved through the VERIFIED email
 *    identity (only OTP-proven addresses create such rows, so no guessing).
 *
 * Decision table (the caller maps each row to ONE honest Persian message):
 *   identifier not found / no password identity / wrong password → 'invalid'
 *     (identical answer — which check failed is never leaked);
 *   identifier found, account has NO password credential → 'passwordless'
 *     (a google-created or legacy-phrase account — the UI points at the
 *     google button / recovery page instead of a dead-end error).
 */
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { getDbClient } from '@/db/client';
import { authIdentities, users } from '../../../db/schema';
import { normalizeUsername } from './password-policy';
import { verifyPassword } from './password';

export type LoginIdentifier = { kind: 'username' | 'email'; value: string };

/** Parse the raw one-field identifier: an email, else a username. */
export function parseLoginIdentifier(raw: string): LoginIdentifier | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return null;
  if (trimmed.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { kind: 'email', value: trimmed.toLowerCase() };
  }
  const username = normalizeUsername(trimmed);
  if (username.length === 0 || !/^[a-z0-9_]+$/.test(username)) return null; // never a storable handle
  return { kind: 'username', value: username };
}

export interface LoginCandidate {
  readonly userId: string;
  readonly username: string | null;
  readonly email: string | null;
  readonly hasPassword: boolean;
}

/**
 * Resolve the identifier → the account it belongs to. The email branch
 * accepts EITHER an OTP-verified email identity OR the account's own
 * VERIFIED contact email (google-attached — emailVerifiedAt from the
 * id_token): both are proven mailboxes, and the fallback is what lets a
 * google-born user's email+password login resolve after they set a password
 * (and get the honest «no password yet» door-sign before that).
 */
export async function findLoginCandidate(identifier: LoginIdentifier): Promise<LoginCandidate | null> {
  const { db } = getDbClient();
  if (identifier.kind === 'username') {
    const rows = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users)
      .where(eq(users.username, identifier.value))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return { userId: row.id, username: row.username, email: row.email, hasPassword: await hasPassword(row.id) };
  }
  // email: the OTP-verified identity first, then the verified contact column
  const identRows = await db
    .select({ userId: authIdentities.userId })
    .from(authIdentities)
    .where(
      and(
        eq(authIdentities.provider, 'email'),
        eq(authIdentities.providerAccountId, identifier.value),
        isNull(authIdentities.disabledAt),
      ),
    )
    .limit(1);
  let userId = identRows[0]?.userId ?? null;
  if (!userId) {
    const contactRows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, identifier.value), isNotNull(users.emailVerifiedAt)))
      .limit(1);
    userId = contactRows[0]?.id ?? null;
  }
  if (!userId) return null;
  const userRows = await db
    .select({ id: users.id, username: users.username, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = userRows[0];
  if (!user) return null;
  return { userId: user.id, username: user.username, email: user.email, hasPassword: await hasPassword(user.id) };
}

async function hasPassword(userId: string): Promise<boolean> {
  const { db } = getDbClient();
  const rows = await db
    .select({ id: authIdentities.id })
    .from(authIdentities)
    .where(
      and(
        eq(authIdentities.userId, userId),
        eq(authIdentities.provider, 'password'),
        isNull(authIdentities.disabledAt),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

export type PasswordLoginOutcome =
  { kind: 'ok'; userId: string } | { kind: 'invalid' } | { kind: 'passwordless'; userId: string };

/** Verify the password of a resolved candidate. */
export async function loginWithPassword(candidate: LoginCandidate, password: string): Promise<PasswordLoginOutcome> {
  if (!candidate.hasPassword) return { kind: 'passwordless', userId: candidate.userId };
  const valid = await verifyPassword(candidate.userId, password);
  if (!valid) return { kind: 'invalid' };
  return { kind: 'ok', userId: candidate.userId };
}
