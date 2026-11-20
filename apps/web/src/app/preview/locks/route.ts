/**
 * /preview/locks?mode=open|enforce[&back=/learn] — OWNER LOCK CONTROL toggle
 * (see src/lib/preview.ts for the contract).
 *
 * - Feature disabled (env unset) OR no valid preview cookie → plain 404
 *   (no feature hint; ordinary users can never reach this route).
 * - mode must be exactly 'open' or 'enforce' → 400 otherwise.
 * - Sets the HMAC-signed locks-mode cookie (12 h) and redirects back.
 * - GET (not POST) on purpose: the owner presses a plain link button in the
 *   /learn owner panel; no client JS involved.
 *
 * The toggle changes VIEW-level locking only (journey availability +
 * chapterAccessStatus for the pv- learner). It never touches stored progress —
 * the pv- namespace keeps its own walk state in both modes.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  previewModeEnabled,
  hasPreviewAccessFromRequest,
  PREVIEW_LOCKS_COOKIE_NAME,
  previewLocksCookieValue,
  PREVIEW_TTL_SECONDS,
} from '@/lib/preview';

export const dynamic = 'force-dynamic';

/** Same-origin relative path only (no open redirect through `//` or schemes). */
function safeBack(req: Request): string {
  const raw = new URL(req.url).searchParams.get('back') ?? '/learn';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/learn';
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!previewModeEnabled()) return new NextResponse('Not Found', { status: 404 });
  if (!hasPreviewAccessFromRequest(req)) return new NextResponse('Not Found', { status: 404 });

  const mode = new URL(req.url).searchParams.get('mode');
  if (mode !== 'open' && mode !== 'enforce') {
    return new NextResponse('Bad Request: mode must be open|enforce', { status: 400 });
  }

  // cookies().set() on a route-handler context merges into the outgoing
  // response (the same mechanics the enter/exit routes rely on).
  const jar = await cookies();
  jar.set({
    name: PREVIEW_LOCKS_COOKIE_NAME,
    value: previewLocksCookieValue(mode),
    maxAge: PREVIEW_TTL_SECONDS,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
  return NextResponse.redirect(new URL(safeBack(req), req.url), { status: 302 });
}
