/**
 * /preview/exit — clears the preview cookie and returns to the normal journey.
 * Without the feature enabled this is a harmless 404 too.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { previewModeEnabled, previewCookieAttributes } from '@/lib/preview';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  if (!previewModeEnabled()) return new NextResponse('Not Found', { status: 404 });
  const jar = await cookies();
  jar.set(previewCookieAttributes(null));
  return NextResponse.redirect(new URL('/learn', req.url), { status: 302 });
}
