/**
 * HANASO — Identity linking rules (M1 · AUTH-ACCOUNTS — mission §۲).
 *
 * ONE account per person; login methods are rows on that account. The core
 * anti-duplicate law: a (provider, provider_account_id) pair can point at
 * exactly ONE account, ever — enforced by the auth_identities unique index and
 * by this module's decision table:
 *
 *  GOOGLE LOGIN (no session):
 *   a. identity(google, sub) exists          → log THAT account in;
 *   b. no google identity, but a VERIFIED google email matches an email
 *      identity of exactly one account        → attach google to that account
 *      and log in (dedupe — never a second account for the same person);
 *   c. otherwise                              → create a FRESH account.
 *  GOOGLE LINK (with session — explicit consent on the settings page):
 *   - google sub already on ANOTHER account   → refuse (login with that method instead);
 *   - google email already on ANOTHER account → refuse (email ownership conflict);
 *   - else attach to the session's account.
 *
 *  EMAIL LOGIN: identity(email, address) exists → that account (no guessing —
 *  only an OTP-verified address creates such a row).
 *  EMAIL LINK: the OTP must have been issued with the session user's id as the
 *  target (otp_codes.user_id) — proof the destination mailbox consented.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { getDbClient } from '@/db/client';
import { authIdentities, users } from '../../../db/schema';

export type ProviderName = 'mnemonic' | 'google' | 'email' | 'sms';

/** A login method as the security-settings page sees it. */
export interface ActiveMethod {
  readonly provider: ProviderName;
  readonly providerAccountId: string;
  readonly verifiedAt: Date | null;
  readonly createdAt: Date;
  readonly lastUsedAt: Date | null;
}

/** The active (non-disabled) methods of an account. */
export async function listActiveMethods(userId: string): Promise<ActiveMethod[]> {
  const { db } = getDbClient();
  const rows = await db
    .select()
    .from(authIdentities)
    .where(and(eq(authIdentities.userId, userId), isNull(authIdentities.disabledAt)));
  return rows.map((r) => ({
    provider: r.provider as ProviderName,
    providerAccountId: r.providerAccountId,
    verifiedAt: r.verifiedAt,
    createdAt: r.createdAt,
    lastUsedAt: r.lastUsedAt,
  }));
}

/** The mnemonic login lookup: by the DETERMINISTIC lookup key (the anchor's
 * providerAccountId is the account id — NOT searchable by the phrase). */
export async function findMnemonicIdentity(lookupKey: string) {
  const { db } = getDbClient();
  const rows = await db
    .select()
    .from(authIdentities)
    .where(and(eq(authIdentities.provider, 'mnemonic'), eq(authIdentities.lookupKey, lookupKey)))
    .limit(1);
  return rows[0] ?? null;
}

/** Stamp usage on a located identity row (id-based — no providerAccountId guessing). */
export async function touchIdentityUsage(id: string): Promise<void> {
  const { db } = getDbClient();
  await db.update(authIdentities).set({ lastUsedAt: new Date() }).where(eq(authIdentities.id, id));
}

export async function findIdentity(provider: ProviderName, providerAccountId: string) {
  const { db } = getDbClient();
  const rows = await db
    .select()
    .from(authIdentities)
    .where(and(eq(authIdentities.provider, provider), eq(authIdentities.providerAccountId, providerAccountId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserEmailIdentity(email: string) {
  return findIdentity('email', email.toLowerCase());
}

/** The login decision table for google (see the module docblock). */
export type GoogleLoginResolution =
  { kind: 'login'; userId: string } | { kind: 'attach_and_login'; userId: string } | { kind: 'create_account' };

export async function resolveGoogleLogin(input: {
  sub: string;
  email: string;
  emailVerified: boolean;
}): Promise<GoogleLoginResolution> {
  const googleIdentity = await findIdentity('google', input.sub);
  if (googleIdentity && !googleIdentity.disabledAt) return { kind: 'login', userId: googleIdentity.userId };
  if (input.emailVerified && input.email) {
    const emailIdentity = await findUserEmailIdentity(input.email);
    if (emailIdentity && !emailIdentity.disabledAt) return { kind: 'attach_and_login', userId: emailIdentity.userId };
  }
  return { kind: 'create_account' };
}

/** Create the account + its first identity (the signup atom). */
export async function createAccountWithIdentity(input: {
  provider: ProviderName;
  providerAccountId: string;
  lookupKey?: string | null;
  credentialHash?: string | null;
  verifiedAt?: Date | null;
  email?: string | null;
  emailVerifiedAt?: Date | null;
  displayName?: string | null;
}): Promise<{ userId: string }> {
  const { db } = getDbClient();
  const inserted = await db
    .insert(users)
    .values({
      email: input.email ?? null,
      emailVerifiedAt: input.emailVerifiedAt ?? null,
      displayName: input.displayName ?? null,
    })
    .returning({ id: users.id });
  const userId = inserted[0]!.id;
  await db.insert(authIdentities).values({
    userId,
    provider: input.provider,
    providerAccountId: input.providerAccountId,
    lookupKey: input.lookupKey ?? null,
    credentialHash: input.credentialHash ?? null,
    verifiedAt: input.verifiedAt ?? new Date(),
  });
  return { userId };
}

/**
 * Attach google to an EXISTING account (link or dedupe). Refuses when the
 * google sub or its verified email already belongs to another account — the
 * anti-takeover rule. Idempotent when already attached to the same account.
 */
export async function attachGoogleIdentity(input: {
  userId: string;
  sub: string;
  email: string;
  emailVerified: boolean;
}): Promise<{ ok: true } | { ok: false; reason: 'google_already_linked_to_other' | 'email_owned_by_other' }> {
  const { db } = getDbClient();
  const bySub = await findIdentity('google', input.sub);
  if (bySub && bySub.userId !== input.userId) return { ok: false, reason: 'google_already_linked_to_other' };
  if (input.emailVerified && input.email) {
    const byEmail = await findUserEmailIdentity(input.email);
    if (byEmail && byEmail.userId !== input.userId) return { ok: false, reason: 'email_owned_by_other' };
  }
  if (bySub && bySub.userId === input.userId) {
    // already linked — refresh the last-used proof + verified stamp only
    await db
      .update(authIdentities)
      .set({ verifiedAt: new Date(), disabledAt: null, lastUsedAt: new Date() })
      .where(eq(authIdentities.id, bySub.id));
  } else {
    await db.insert(authIdentities).values({
      userId: input.userId,
      provider: 'google',
      providerAccountId: input.sub,
      verifiedAt: new Date(),
    });
  }
  if (input.emailVerified && input.email) {
    await refreshAccountEmail(input.userId, input.email);
  }
  return { ok: true };
}

/** Attach a VERIFIED email method to an account (the OTP link purpose atom). */
export async function attachEmailIdentity(input: {
  userId: string;
  email: string;
}): Promise<{ ok: true } | { ok: false; reason: 'email_owned_by_other' }> {
  const { db } = getDbClient();
  const existing = await findUserEmailIdentity(input.email);
  if (existing && existing.userId !== input.userId) return { ok: false, reason: 'email_owned_by_other' };
  if (existing && existing.userId === input.userId) {
    await db
      .update(authIdentities)
      .set({ verifiedAt: new Date(), disabledAt: null, lastUsedAt: new Date() })
      .where(eq(authIdentities.id, existing.id));
  } else {
    await db.insert(authIdentities).values({
      userId: input.userId,
      provider: 'email',
      providerAccountId: input.email,
      verifiedAt: new Date(),
    });
  }
  await refreshAccountEmail(input.userId, input.email);
  return { ok: true };
}

/**
 * Keep users.email = the most recently verified contact address. UNIQUE
 * users_email_key means the write is skipped when a DIFFERENT account already
 * claims that contact address (the identity tables remain the login truth).
 */
async function refreshAccountEmail(userId: string, email: string): Promise<void> {
  const { db } = getDbClient();
  const claim = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (claim[0] && claim[0].id !== userId) return; // another account's contact email — skip
  await db.update(users).set({ email, emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
}

/** Stamp lastUsedAt for a used method (best-effort, never blocks login). */
export async function touchMethodUsage(provider: ProviderName, providerAccountId: string): Promise<void> {
  const { db } = getDbClient();
  await db
    .update(authIdentities)
    .set({ lastUsedAt: new Date() })
    .where(and(eq(authIdentities.provider, provider), eq(authIdentities.providerAccountId, providerAccountId)));
}

/**
 * Remove a method from an account (mission §۲ — user-managed methods).
 * Rules: never the LAST active method (lockout protection); anything else is
 * allowed (mnemonic removal keeps the data — the account simply loses that
 * door; the UI warns with the exact consequence text).
 */
export async function unlinkMethod(
  userId: string,
  provider: ProviderName,
): Promise<{ ok: true } | { ok: false; reason: 'last_method' | 'not_found' }> {
  const active = await listActiveMethods(userId);
  const only = active[0];
  if (active.length === 1 && only?.provider === provider) return { ok: false, reason: 'last_method' };
  const { db } = getDbClient();
  const updated = await db
    .update(authIdentities)
    .set({ disabledAt: new Date() })
    .where(
      and(eq(authIdentities.userId, userId), eq(authIdentities.provider, provider), isNull(authIdentities.disabledAt)),
    )
    .returning({ id: authIdentities.id });
  if (updated.length === 0) return { ok: false, reason: 'not_found' };
  return { ok: true };
}
