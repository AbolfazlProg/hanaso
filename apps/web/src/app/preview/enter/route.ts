/**
 * /preview/enter?key=<PREVIEW_MODE_KEY> — owner-only activation of Temporary
 * Preview Mode (see src/lib/preview.ts for the contract).
 *
 * - Feature disabled (env unset) or wrong key → plain 404 (no feature hint).
 * - Correct key → sets the HMAC-only preview cookie (12 h) and redirects to /learn.
 * - GET (not POST) on purpose: the owner opens the link directly in the browser.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'node:crypto';
import { previewModeEnabled, previewCookieAttributes, previewCookieValue } from '@/lib/preview';

export const dynamic = 'force-dynamic';

function plain404(): NextResponse {
  return new NextResponse('Not Found', { status: 404 });
}

export async function GET(req: Request): Promise<NextResponse> {
  const key = process.env.PREVIEW_MODE_KEY;
  if (!key) return plain404(); // unset env = feature fully disabled
  const given = new URL(req.url).searchParams.get('key') ?? '';
  const a = Buffer.from(given);
  const b = Buffer.from(key!);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return plain404();

  // cookies().set() on a route-handler context merges into the outgoing response
  // correctly (the hand-built NextResponse Set-Cookie was being dropped by the
  // session-minting middleware rewrite).
  const jar = await cookies();
  jar.set(previewCookieAttributes(previewCookieValue(key)));
  return NextResponse.redirect(new URL('/learn', req.url), { status: 302 });
}
