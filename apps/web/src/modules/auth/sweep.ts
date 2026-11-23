/**
 * HANASO — auth sweep (M1 · AUTH-ACCOUNTS).
 *
 * The cleanup pass for the short-lived auth rows — called by the worker's
 * daily maintenance window and after any deploy's migrate step:
 *  - expired pending mnemonic registrations (the sealed phrase is DESTROYED —
 *    never kept past its 15-minute wizard window);
 *  - expired one-time codes;
 *  - consumed/expired oauth_states rows (already consumed-at + TTL);
 *  - rate-limit events older than the longest window (1 hour — they only ever
 *    live in windows).
 */
import { lt, sql } from 'drizzle-orm';
import { getDbClient } from '@/db/client';
import { authRateEvents, mnemonicPendingRegistrations, oauthStates, otpCodes } from '../../../db/schema';

export interface SweepResult {
  expiredPendingRegistrations: number;
  expiredOtpCodes: number;
  expiredOauthStates: number;
  oldRateEvents: number;
}

/** One pass — idempotent, safe to run concurrently (DELETE-only semantics). */
export async function sweepAuthArtifacts(): Promise<SweepResult> {
  const { db } = getDbClient();
  const pending = await db.delete(mnemonicPendingRegistrations).where(lt(mnemonicPendingRegistrations.expiresAt, sql`now()`)).returning({ id: mnemonicPendingRegistrations.id });
  const otp = await db.delete(otpCodes).where(lt(otpCodes.expiresAt, sql`now()`)).returning({ id: otpCodes.id });
  const oauth = await db.delete(oauthStates).where(lt(oauthStates.expiresAt, sql`now()`)).returning({ state: oauthStates.state });
  const events = await db
    .delete(authRateEvents)
    .where(lt(authRateEvents.createdAt, new Date(Date.now() - 2 * 60 * 60 * 1000)))
    .returning({ id: authRateEvents.id });
  return {
    expiredPendingRegistrations: pending.length,
    expiredOtpCodes: otp.length,
    expiredOauthStates: oauth.length,
    oldRateEvents: events.length,
  };
}
