/**
 * HANASO — username+password registration (M2 · AUTH-PASSWORD).
 *
 * The signup atom for the PRIMARY login path:
 *  - users row (username, optional unverified email) +
 *    auth_identities(provider='password', scrypt hash);
 *  - anti-duplicate gates BEFORE any insert: username taken → honest refuse
 *    (UX requires it — a signup form must be able to say «این نام کاربری
 *    گرفته شده»), email already a VERIFIED identity of another account →
 *    honest refuse («حساب داری — وارد شو»), never a silent second account;
 *  - the optional email is stored as the contact address but NEVER trusted
 *    (email_verified_at stays null) until its OTP is verified (purpose='link',
 *    the existing flow — verify attaches the email identity + stamps
 *    users.email_verified_at).
 */
import { eq } from 'drizzle-orm';
import { getDbClient } from '@/db/client';
import { authIdentities, users } from '../../../db/schema';
import { findUserEmailIdentity } from './identities';
import { findUserIdByUsername } from './password';

export type RegisterRejection = 'username_taken' | 'email_owned';

export interface RegisterResult {
  userId: string;
  username: string;
  email: string | null;
}

/** Create the account (username + password + optional unverified email). */
export async function registerWithPassword(input: {
  username: string;
  password: string;
  email?: string | null;
  hashPassword: (pw: string) => string;
}): Promise<{ ok: true; result: RegisterResult } | { ok: false; reason: RegisterRejection }> {
  const { db } = getDbClient();
  // gate 1 — the handle
  if (await findUserIdByUsername(input.username)) return { ok: false, reason: 'username_taken' };
  // gate 2 — the contact email (an OTP-verified identity = a real existing account)
  const email = input.email ? input.email.toLowerCase() : null;
  if (email) {
    const owner = await findUserEmailIdentity(email);
    if (owner) return { ok: false, reason: 'email_owned' };
    // users.email UNIQUE — a second claim on the same address must also refuse
    const claim = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (claim[0]) return { ok: false, reason: 'email_owned' };
  }
  const inserted = await db.insert(users).values({ username: input.username, email }).returning({ id: users.id });
  const userId = inserted[0]!.id;
  await db.insert(authIdentities).values({
    userId,
    provider: 'password',
    providerAccountId: userId,
    credentialHash: input.hashPassword(input.password),
    verifiedAt: new Date(),
  });
  return { ok: true, result: { userId, username: input.username, email } };
}
