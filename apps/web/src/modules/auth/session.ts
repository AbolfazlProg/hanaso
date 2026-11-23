/**
 * HANASO — Account session service (M1 · AUTH-ACCOUNTS).
 *
 * The auth cookie `hanaso_session` carries a 43-char base64url token = 32
 * random bytes (minted ONLY at successful login). The DB stores ONLY its
 * SHA-256 hex (`sessions.token_hash`) — a database copy cannot be replayed as
 * a login (mission §۴: «عدم ذخیره توکن‌ها به‌صورت متن خام»). Sessions are
 * server-side rows so they are REVOCABLE (logout / logout-everywhere / expiry),
 * with a rolling 30-day lifetime and a ≤1/hour touch to keep writes cheap.
 *
 * This module is the DB-touching service; the cookie I/O helpers stay
 * framework-thin (`setSessionCookie` on a NextResponse) so unit tests can
 * drive the pure parts and integration tests the DB parts.
 */
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import type { NextResponse } from 'next/server';
import { getDbClient } from '@/db/client';
import { sessions, users } from '../../../db/schema';

/** The account-session cookie (httpOnly, Secure, SameSite=Lax, path=/). */
export const SESSION_COOKIE_NAME = 'hanaso_session';

/** 30 days, rolling. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Touch the row at most once per hour. */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

/** A verified account session (the learner identity for authenticated requests). */
export interface AccountSession {
  readonly sessionId: string;
  readonly userId: string;
  readonly method: string | null;
}

/** Mint a fresh opaque token — the ONLY place tokens are born. */
export function mintSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** sha256 hex of a token — the stored form (index lookup key). */
export function tokenHashOf(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Create a session row + return the raw token (the caller sets the cookie).
 * `deviceLabel` is a short UA summary; `ipPrefix` is a truncated IP.
 */
export async function createSession(input: {
  userId: string;
  method: string;
  deviceLabel?: string | null;
  ipPrefix?: string | null;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = mintSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const { db } = getDbClient();
  await db.insert(sessions).values({
    userId: input.userId,
    tokenHash: tokenHashOf(token),
    method: input.method,
    deviceLabel: input.deviceLabel ?? null,
    ipPrefix: input.ipPrefix ?? null,
    expiresAt,
  });
  return { token, expiresAt };
}

/**
 * Resolve a raw cookie token → the live session (unrevoked, unexpired).
 * Unknown/expired/revoked/garbage → null (the caller falls back to guest).
 * Also performs the rolling touch (≤1/hour) — failures are non-fatal.
 */
export async function resolveSession(token: string | null | undefined): Promise<AccountSession | null> {
  if (typeof token !== 'string' || token.length === 0 || token.length > 100) return null;
  const { db } = getDbClient();
  const tokenHash = tokenHashOf(token);
  const rows = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      method: sessions.method,
      expiresAt: sessions.expiresAt,
      lastSeenAt: sessions.lastSeenAt,
    })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, sql`now()`)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (Date.now() - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    void db
      .update(sessions)
      .set({ lastSeenAt: new Date(), expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
      .where(and(eq(sessions.id, row.id), isNull(sessions.revokedAt)))
      .catch(() => undefined);
  }
  return { sessionId: row.id, userId: row.userId, method: row.method };
}

/** Revoke one session (logout). Idempotent. */
export async function revokeSession(sessionId: string): Promise<void> {
  const { db } = getDbClient();
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
}

/** Revoke EVERY session of a user — «خروج از همه دستگاه‌ها». */
export async function revokeAllSessions(userId: string): Promise<void> {
  const { db } = getDbClient();
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}

/** The active (unrevoked, unexpired) sessions of a user — the devices list. */
export async function listSessions(userId: string) {
  const { db } = getDbClient();
  return db
    .select({
      id: sessions.id,
      method: sessions.method,
      deviceLabel: sessions.deviceLabel,
      ipPrefix: sessions.ipPrefix,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), gt(sessions.expiresAt, sql`now()`)))
    .orderBy(sql`${sessions.lastSeenAt} desc`)
    .limit(50);
}

/** Cookie attributes — one source of truth for set AND clear. */
function sessionCookieAttrs(expiresAt: Date) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
  };
}

/** Attach the session cookie to a response (login success path). */
export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieAttrs(expiresAt));
}

/** Remove the session cookie (logout path). */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', { ...sessionCookieAttrs(new Date(0)), maxAge: 0 });
}

/** The user row for a session (used by /api/me-style resolvers). */
export async function getUserById(userId: string) {
  const { db } = getDbClient();
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Short human device label from a UA string — coarse by design (never a full
 * UA dump at rest): «Chrome · Windows», «Safari · iOS», «Unknown».
 */
export function deviceLabelFromUserAgent(ua: string | null | undefined): string {
  if (!ua) return 'دستگاه ناشناخته';
  const os = /Windows/i.test(ua)
    ? 'Windows'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'iOS'
      : /Android/i.test(ua)
        ? 'Android'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'نامشخص';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\//i.test(ua)
      ? 'Opera'
      : /Chrome\//i.test(ua)
        ? 'Chrome'
        : /Firefox\//i.test(ua)
          ? 'Firefox'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : 'مرورگر ناشناخته';
  return `${browser} · ${os}`;
}

/**
 * Truncated IP for the devices list — privacy floor: IPv4 → first 2 octets,
 * IPv6 → first 2 hextets. Never a full address at rest.
 */
export function ipPrefixOf(ip: string | null | undefined): string | null {
  if (!ip) return null;
  if (ip.includes('.')) return ip.split('.').slice(0, 2).join('.') + '.*.*';
  const parts = ip.split(':');
  return parts.slice(0, 2).join(':') + ':*';
}
