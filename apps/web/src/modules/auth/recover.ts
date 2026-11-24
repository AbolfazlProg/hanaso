/**
 * HANASO — password RECOVERY (M2 · AUTH-PASSWORD — owner revision 2026-11-24:
 * «چهار روش = چهار روش بازیابی رمز عبور»).
 *
 * The four recovery doors onto the SAME single account:
 *  1. عبارت بازیابی (the BIP39 phrase) — verify → set a new password;
 *  2. ایمیل — a 6-digit OTP to the account's VERIFIED email → new password;
 *  3. گوگل — log in with the linked google account, then set a password in
 *     security settings (no separate flow to phish);
 *  4. پیامک — infrastructure only (به‌زودی; no sends, no fake success).
 *
 * Security invariants:
 *  - a reset REVOKES every session of the account (theft response) before
 *    issuing the fresh post-reset session;
 *  - email resets are anti-enumeration: the request endpoint answers the
 *    same 202-style envelope whether or not the identifier exists;
 *  - the OTP purpose is 'password_reset' — distinct from login/link codes,
 *    so a login code can never be replayed as a reset code (and vice versa).
 */
import { and, eq, isNull } from 'drizzle-orm';
import { getDbClient } from '@/db/client';
import { authIdentities, users } from '../../../db/schema';
import { deriveLookupKey, verifySecret } from './credentials';
import { findMnemonicIdentity } from './identities';
import { issueOtp } from './email-otp';
import { parseLoginIdentifier } from './login';
import { setPassword } from './password';
import { revokeAllSessions } from './session';

/** Verify a recovery phrase → the owning user id (scrypt proof), or null. */
export async function verifyRecoveryPhrase(phrase: string): Promise<{ userId: string } | null> {
  const lookupKey = deriveLookupKey(phrase);
  const identity = await findMnemonicIdentity(lookupKey);
  if (!identity || identity.disabledAt) return null;
  if (!verifySecret(phrase, identity.credentialHash)) return null;
  return { userId: identity.userId };
}

/**
 * Reset the password with the recovery phrase (door ۱): verify → set → revoke
 * every session. The caller then issues the fresh session on its own response.
 */
export async function resetPasswordWithPhrase(phrase: string, newPassword: string): Promise<{ userId: string } | null> {
  const found = await verifyRecoveryPhrase(phrase);
  if (!found) return null;
  await setPassword(found.userId, newPassword);
  await revokeAllSessions(found.userId);
  return found;
}

/** The account's VERIFIED email identity (the only email a reset may go to). */
export async function verifiedEmailOf(userId: string): Promise<string | null> {
  const { db } = getDbClient();
  const rows = await db
    .select({ email: authIdentities.providerAccountId })
    .from(authIdentities)
    .where(
      and(eq(authIdentities.userId, userId), eq(authIdentities.provider, 'email'), isNull(authIdentities.disabledAt)),
    )
    .limit(1);
  return rows[0]?.email ?? null;
}

/**
 * Issue a password-reset OTP for an identifier (door ۲). Anti-enumeration by
 * design: returns `null` for unknown identifiers / accounts without a
 * verified email — the ROUTE answers the same neutral envelope either way.
 */
export async function issuePasswordResetOtp(
  identifierRaw: string,
): Promise<{ email: string; code: string; otpId: string } | null> {
  const identifier = parseLoginIdentifier(identifierRaw);
  if (!identifier) return null;
  const { db } = getDbClient();
  let userId: string | null = null;
  if (identifier.kind === 'username') {
    const rows = await db.select({ id: users.id }).from(users).where(eq(users.username, identifier.value)).limit(1);
    userId = rows[0]?.id ?? null;
  } else {
    const rows = await db
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
    userId = rows[0]?.userId ?? null;
  }
  if (!userId) return null;
  const email = await verifiedEmailOf(userId);
  if (!email) return null;
  const { id, code } = await issueOtp({ channel: 'email', destination: email, purpose: 'password_reset', userId });
  return { email, code, otpId: id };
}

/**
 * Resolve the reset OTP target: the account owning the VERIFIED email
 * identity (only such a row could ever have received a reset code).
 */
export async function findUserIdByVerifiedEmail(email: string): Promise<string | null> {
  const { db } = getDbClient();
  const rows = await db
    .select({ userId: authIdentities.userId })
    .from(authIdentities)
    .where(
      and(
        eq(authIdentities.provider, 'email'),
        eq(authIdentities.providerAccountId, email.toLowerCase()),
        isNull(authIdentities.disabledAt),
      ),
    )
    .limit(1);
  return rows[0]?.userId ?? null;
}

/**
 * Complete the email reset (door ۲, step ۲): the caller has already consumed
 * the OTP (verifyOtp) — this sets the new password and revokes everything.
 */
export async function completeEmailReset(userId: string, newPassword: string): Promise<void> {
  await setPassword(userId, newPassword);
  await revokeAllSessions(userId);
}
