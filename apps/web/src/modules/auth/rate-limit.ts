/**
 * HANASO — auth rate limiting (M1 · AUTH-ACCOUNTS — mission §۴).
 *
 * DB-backed ledger (`app.auth_rate_events`), NOT in-memory buckets: limits
 * survive restarts and stay consistent behind PgBouncer across instances.
 * Two operations only:
 *
 *  - `record(bucket)` — append an event row (fire-and-forget allowed).
 *  - `tooMany(bucket, windowMs, max)` — count rows in the sliding window.
 *
 * Buckets (the freeze — add only with an ADR note):
 *   'login:phrase:fail'      + <lookupKey>   → 5 fails / 15 min  → lockout 15 min
 *   'login:password:fail'    + <identifier>  → 5 fails / 15 min  → lockout 15 min (M2)
 *   'login:ip'              + <ipPrefix>    → 40 attempts / hour
 *   'otp:send:destination'  + <dest>        → 1 / min AND 5 / hour
 *   'otp:send:ip'           + <ipPrefix>    → 10 / hour
 *   'otp:verify:destination'+ <dest>        → 10 fails / hour (code rows also cap attempts)
 *   'signup:guest'          + <guestLearnerId> → 3 wizards / hour
 *   'oauth:start:ip'        + <ipPrefix>    → 20 / hour
 *   'password:change'       + <userId>      → 5 changes / hour (M2)
 *   'username:change'       + <userId>      → 5 sets / hour (M2)
 *
 * Sweeping: the expired-rows sweep lives in the same cleanup pass as OTP/pending
 * registrations (see sweep.ts) — old events age out of every window anyway.
 */
import { and, eq, gte, sql } from 'drizzle-orm';
import { getDbClient } from '@/db/client';
import { authRateEvents } from '../../../db/schema';

/** The canonical bucket prefix registry (see module docblock). */
export const RATE_BUCKETS = {
  phraseLoginFail: 'login:phrase:fail',
  passwordLoginFail: 'login:password:fail',
  loginIp: 'login:ip',
  otpSendDestination: 'otp:send:destination',
  otpSendIp: 'otp:send:ip',
  otpVerifyDestination: 'otp:verify:destination',
  signupGuest: 'signup:guest',
  oauthStartIp: 'oauth:start:ip',
  emailVerifyFail: 'email:verify:fail',
  passwordChange: 'password:change',
  usernameSet: 'username:change',
} as const;

/** One event — recorded at the moment the throttled action is ATTEMPTED/FAILED. */
export async function recordRateEvent(bucket: string): Promise<void> {
  const { db } = getDbClient();
  await db.insert(authRateEvents).values({ bucket });
}

/** True when `bucket` already has `max`+ events inside the last `windowMs`. */
export async function tooManyEvents(bucket: string, windowMs: number, max: number): Promise<boolean> {
  const { db } = getDbClient();
  const since = new Date(Date.now() - windowMs);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(authRateEvents)
    .where(and(eq(authRateEvents.bucket, bucket), gte(authRateEvents.createdAt, since)));
  return (rows[0]?.count ?? 0) >= max;
}

/** Convenience: count events in the window (diagnostics/tests). */
export async function countRecentEvents(bucket: string, windowMs: number): Promise<number> {
  const { db } = getDbClient();
  const since = new Date(Date.now() - windowMs);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(authRateEvents)
    .where(and(eq(authRateEvents.bucket, bucket), gte(authRateEvents.createdAt, since)));
  return rows[0]?.count ?? 0;
}
