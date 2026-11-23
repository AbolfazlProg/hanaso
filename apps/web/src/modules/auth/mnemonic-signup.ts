/**
 * HANASO — the mnemonic signup/enroll wizard service (M1 · AUTH-ACCOUNTS).
 *
 * The whole phrase lifecycle in ONE place:
 *  - `startWizard` — generate → seal (15-min pending row bound to the browser's
 *    guest cookie) → return words + quiz positions. Works for signup (new
 *    account) and enroll (attach to the logged-in account — mission §۲'s
 *    «پیشنهاد فعال‌سازی بدون اجبار»).
 *  - `refetchPhrase` — re-display while unexpired (the user may need a second
 *    look before the quiz; bound to the same browser).
 *  - `completeWizard` — quiz answers → account created + identity row (the
 *    phrase NEVER stored raw: scrypt verifier + server-keyed lookup key only)
 *    → the sealed row is destroyed.
 *
 * Anti-abuse: the pending row is browser-bound (a stolen registrationId from
 * another browser is useless), single-use, and 15-minute-lived.
 */
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { getDbClient } from '@/db/client';
import { authIdentities, mnemonicPendingRegistrations, users } from '../../../db/schema';
import { QUIZ_POSITION_COUNT, checkQuizAnswers, generateMnemonicPhrase, pickQuizPositions, redactPhrase, wordsOf } from './mnemonic';
import { deriveLookupKey, hashSecret } from './credentials';
import { sealPhrase, unsealPhrase } from './seal';
import { findIdentity } from './identities';

/** 15 minutes — the wizard window. */
export const WIZARD_TTL_MS = 15 * 60 * 1000;

/** Start a wizard (signup or enroll) for THIS browser. */
export async function startWizard(input: {
  guestLearnerId: string;
  purpose: 'signup' | 'enroll';
  userId?: string | null;
}): Promise<{ registrationId: string; words: string[]; positions: number[]; expiresAt: Date }> {
  const phrase = generateMnemonicPhrase();
  const positions = pickQuizPositions(QUIZ_POSITION_COUNT);
  const phraseHash = hashSecret(phrase);
  const { db } = getDbClient();
  const inserted = await db
    .insert(mnemonicPendingRegistrations)
    .values({
      guestLearnerId: input.guestLearnerId,
      phraseSealed: sealPhrase(phrase),
      phraseHash,
      lookupKey: deriveLookupKey(phrase),
      // operational visibility only — the canonical salt lives inside phraseHash
      salt: phraseHash.split('$')[4] ?? '',
      positions,
      purpose: input.purpose,
      userId: input.userId ?? null,
      expiresAt: new Date(Date.now() + WIZARD_TTL_MS),
    })
    .returning({ id: mnemonicPendingRegistrations.id });
  const row = inserted[0]!;
  console.info(`[auth] mnemonic wizard start registration=${row.id} purpose=${input.purpose} phrase=${redactPhrase(phrase)}`);
  return { registrationId: row.id, words: wordsOf(phrase), positions, expiresAt: new Date(Date.now() + WIZARD_TTL_MS) };
}

/** Re-display the sealed phrase (same browser, unexpired, uncompleted). */
export async function refetchPhrase(registrationId: string, guestLearnerId: string): Promise<string[] | null> {
  const { db } = getDbClient();
  const rows = await db
    .select()
    .from(mnemonicPendingRegistrations)
    .where(and(eq(mnemonicPendingRegistrations.id, registrationId), isNull(mnemonicPendingRegistrations.consumedAt), gt(mnemonicPendingRegistrations.expiresAt, sql`now()`)))
    .limit(1);
  const row = rows[0];
  if (!row || row.guestLearnerId !== guestLearnerId) return null;
  const phrase = unsealPhrase(row.phraseSealed);
  return phrase ? wordsOf(phrase) : null;
}

export type CompleteOutcome =
  | { kind: 'ok'; userId: string; newAccount: boolean }
  | { kind: 'not_found' | 'expired' | 'wrong' | 'bound' | 'phrase_seal' | 'already_enrolled' };

/**
 * Verify the quiz and finish the wizard:
 *  - signup: create the account (with the mnemonic as its FIRST identity —
 *    the account id itself is the identity's providerAccountId);
 *  - enroll: attach the mnemonic identity to the wizard's account.
 * The pending row is deleted either way (single-use; the sealed phrase is
 * destroyed at completion).
 */
export async function completeWizard(input: {
  registrationId: string;
  guestLearnerId: string;
  answers: { position: number; word: string }[];
}): Promise<CompleteOutcome> {
  const { db } = getDbClient();
  const rows = await db
    .select()
    .from(mnemonicPendingRegistrations)
    .where(and(eq(mnemonicPendingRegistrations.id, input.registrationId), isNull(mnemonicPendingRegistrations.consumedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) return { kind: 'not_found' };
  if (row.guestLearnerId !== input.guestLearnerId) return { kind: 'bound' };
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(mnemonicPendingRegistrations).where(eq(mnemonicPendingRegistrations.id, row.id));
    return { kind: 'expired' };
  }
  const phrase = unsealPhrase(row.phraseSealed);
  if (!phrase) return { kind: 'phrase_seal' };
  if (!checkQuizAnswers(phrase, input.answers)) {
    // wrong quiz — the wizard row survives (retry inside the window)
    return { kind: 'wrong' };
  }
  if (row.purpose === 'enroll') {
    const userId = row.userId!;
    await db.delete(mnemonicPendingRegistrations).where(eq(mnemonicPendingRegistrations.id, row.id));
    if (await findIdentity('mnemonic', userId)) return { kind: 'already_enrolled' };
    await db.insert(authIdentities).values({
      userId,
      provider: 'mnemonic',
      providerAccountId: userId,
      lookupKey: row.lookupKey,
      credentialHash: row.phraseHash,
      verifiedAt: new Date(),
    });
    console.info(`[auth] mnemonic enrolled to user=${userId}`);
    return { kind: 'ok', userId, newAccount: false };
  }
  // signup: account + anchor identity, then the pending row dies with its seal
  const created = await db
    .insert(users)
    .values({})
    .returning({ id: users.id });
  const userId = created[0]!.id;
  await db.insert(authIdentities).values({
    userId,
    provider: 'mnemonic',
    providerAccountId: userId,
    lookupKey: row.lookupKey,
    credentialHash: row.phraseHash,
    verifiedAt: new Date(),
  });
  await db.delete(mnemonicPendingRegistrations).where(eq(mnemonicPendingRegistrations.id, row.id));
  console.info(`[auth] mnemonic signup user=${userId}`);
  return { kind: 'ok', userId, newAccount: true };
}
