/**
 * HANASO — Temporary PREVIEW MODE (owner review pass, FINALIZATION phase).
 *
 * PURPOSE: lets the OWNER browse every published chapter AND every Lesson-Engine
 * draft in the browser without locks — while ordinary users see exactly the
 * normal progressive-reveal experience.
 *
 * SECURITY CONTRACT (do not weaken):
 *  1. The whole feature is OFF unless the server env `PREVIEW_MODE_KEY` is set.
 *     Unset key → every helper here returns false/404 — no code path changes.
 *  2. The owner activates by visiting /preview/enter?key=<PREVIEW_MODE_KEY>
 *     (server-side timing-safe compare). The cookie stores ONLY an HMAC of the
 *     key — the raw secret never rides the cookie and cannot be replayed from
 *     it. httpOnly + secure + sameSite=lax, 12 h TTL.
 *  3. Preview RESOLVES THE LEARNER to a `pv-<id>` namespace — station progress,
 *     chapter progress, FSRS and events written while previewing land under that
 *     namespace, so the real learner's progress/mastery state is never touched.
 *  4. Locks/prereqs are bypassed at VIEW level only (journey availability +
 *     chapterAccessStatus); the underlying stores and the normal-user logic are
 *     unchanged. Nothing here ever widens access for a request without the
 *     preview cookie.
 *  5. Disable: unset/remove PREVIEW_MODE_KEY and redeploy (or restart) — every
 *     entry point stops resolving, the cookie becomes inert.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const PREVIEW_COOKIE_NAME = 'hanaso_preview';
const PREVIEW_TTL_SECONDS = 12 * 60 * 60;

/** The feature master switch — unset env = feature fully disabled. */
export function previewModeEnabled(): boolean {
  return Boolean(process.env.PREVIEW_MODE_KEY);
}

/** HMAC cookie value derived from the key (safe to store client-side). */
export function previewCookieValue(key: string): string {
  return createHmac('sha256', key).update('hanaso-preview-v1').digest('hex');
}

/** Timing-safe check of a preview cookie value against the configured key. */
export function previewCookieValid(value: string | null | undefined): boolean {
  const key = process.env.PREVIEW_MODE_KEY;
  if (!key || !value) return false;
  const expected = Buffer.from(previewCookieValue(key));
  const given = Buffer.from(value);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** RSC variant: read the preview cookie via next/headers. */
export async function hasPreviewAccess(): Promise<boolean> {
  const jar = await cookies();
  return previewCookieValid(jar.get(PREVIEW_COOKIE_NAME)?.value);
}

/** Route-handler variant: parse the preview cookie off a Request header. */
export function hasPreviewAccessFromRequest(req: Request): boolean {
  const header = req.headers.get('cookie') ?? '';
  const re = new RegExp(`(?:^|;\\s*)${PREVIEW_COOKIE_NAME}=([^;]+)`, 'g');
  let last: string | null = null;
  for (const m of header.matchAll(re)) last = m[1] ?? null;
  return previewCookieValid(last ? decodeURIComponent(last) : null);
}

/**
 * Preview learner namespace: every progress write during preview lands here.
 * Derived from the caller's own learner id (or 'guest') so even the preview
 * namespace is per-browser, never shared.
 */
export function previewLearnerId(orig: string): string {
  return `pv-${orig}`;
}

/** Cookie attributes for the enter/exit route handlers. */
export function previewCookieAttributes(value: string | null): {
  name: string;
  value: string;
  maxAge: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
} {
  return {
    name: PREVIEW_COOKIE_NAME,
    value: value ?? '',
    maxAge: value ? PREVIEW_TTL_SECONDS : 0,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  };
}
