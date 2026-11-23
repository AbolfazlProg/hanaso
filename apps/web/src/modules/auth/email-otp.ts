/**
 * HANASO — Email OTP service (M1 · AUTH-ACCOUNTS — mission §۱-ج).
 *
 * One-time 6-digit codes for email login AND email linking:
 *  - generate 10-minute codes with rejection-sampled randomBytes (no bias);
 *  - store ONLY the scrypt hash (never the code);
 *  - ONE live code per (destination, purpose) — a new request retires the old;
 *  - max 5 verification attempts per code, then it is dead;
 *  - rate limits are the caller's job via rate-limit.ts buckets (otp:send:*).
 *
 * The send result is honest: `transport_not_configured` → the caller must
 * answer 503, NOT 202 (no fake success — owner rule).
 */
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { getDbClient } from '@/db/client';
import { otpCodes } from '../../../db/schema';
import { hashSecret, verifySecret } from './credentials';

/** 6 digits, 10 minutes. */
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export type SendResult = { ok: true } | { ok: false; reason: 'transport_not_configured' | 'send_failed' };

/** Unbiased 6-digit code (000000..999999) — rejection sampling on randomBytes. */
export function generateOtpCode(): string {
  for (;;) {
    const buf = randomBytes(4);
    const v = buf.readUInt32BE(0);
    if (v < 1_000_000_000) return String(v % 1_000_000).padStart(6, '0');
  }
}

/** Insert a fresh code + retire any live predecessor for the same (dest, purpose). */
export async function issueOtp(input: {
  channel: 'email' | 'sms';
  destination: string;
  purpose: 'login' | 'link';
  userId?: string | null;
}): Promise<{ id: string; code: string; expiresAt: Date }> {
  const code = generateOtpCode();
  const { db } = getDbClient();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  // retire live codes for this destination+purpose (single active code)
  await db
    .update(otpCodes)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(otpCodes.channel, input.channel),
        eq(otpCodes.destination, input.destination),
        eq(otpCodes.purpose, input.purpose),
        isNull(otpCodes.consumedAt),
        gt(otpCodes.expiresAt, sql`now()`),
      ),
    );
  const rows = await db
    .insert(otpCodes)
    .values({
      channel: input.channel,
      destination: input.destination,
      purpose: input.purpose,
      codeHash: hashSecret(code),
      userId: input.userId ?? null,
      expiresAt,
    })
    .returning({ id: otpCodes.id });
  return { id: rows[0]?.id ?? '', code, expiresAt };
}

export type VerifyOutcome = 'ok' | 'no_active_code' | 'wrong_code' | 'expired' | 'too_many_attempts';

/**
 * Verify a code for a destination+purpose. On success the row is consumed and
 * its target user (link purpose) is returned; on failure the attempt counter
 * is incremented. Never throws on bad input.
 */
export async function verifyOtp(input: {
  channel: 'email' | 'sms';
  destination: string;
  purpose: 'login' | 'link';
  code: string;
}): Promise<{ outcome: VerifyOutcome; userId?: string | null }> {
  const { db } = getDbClient();
  const rows = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.channel, input.channel),
        eq(otpCodes.destination, input.destination),
        eq(otpCodes.purpose, input.purpose),
        isNull(otpCodes.consumedAt),
      ),
    )
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  const row = rows[0];
  if (!row) return { outcome: 'no_active_code' };
  if (row.expiresAt.getTime() <= Date.now()) return { outcome: 'expired' };
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { outcome: 'too_many_attempts' };
  if (typeof input.code !== 'string' || !/^\d{6}$/.test(input.code)) {
    await bumpAttempts(row.id);
    return { outcome: 'wrong_code' };
  }
  if (!verifySecret(input.code, row.codeHash)) {
    await bumpAttempts(row.id);
    return { outcome: 'wrong_code' };
  }
  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, row.id));
  return { outcome: 'ok', userId: row.userId };
}

async function bumpAttempts(id: string): Promise<void> {
  const { db } = getDbClient();
  await db
    .update(otpCodes)
    .set({ attempts: sql`${otpCodes.attempts} + 1` })
    .where(eq(otpCodes.id, id));
}

/** Retire a code (send-failure cleanup — never leave a usable orphan row). */
export async function retireOtp(id: string): Promise<void> {
  const { db } = getDbClient();
  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, id));
}
