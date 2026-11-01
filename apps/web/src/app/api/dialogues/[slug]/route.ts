import { NextResponse } from 'next/server';
import { fail, ok } from '@/modules/shared';
import { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
import { loadVoices } from '@/modules/audio/server';

/**
 * GET /api/dialogues/[slug] — dialogue + characters + audio-manifest in one envelope
 * (TASK-DLG-POC-01). Speaker ids resolve through the character registry (ADR-018 §۲-۳)
 * and the audio manifest is built from content hashes (ADR-009 identity).
 */
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  // S2 fix (engineering review F3): block path traversal — slugs are kebab-case
  // content ids only; `path.join` would otherwise normalize `../` segments and
  // leak arbitrary YAML existence/details from outside the content directory.
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(fail({ code: 'dialogue/invalid_slug', message: 'slug must match ^[a-z0-9-]+$' }), {
      status: 404,
    });
  }
  try {
    loadVoices(); // fail fast on an invalid voices.yaml
    return NextResponse.json(ok(loadDialogueBundle(slug)), { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json(
      fail({
        code: 'dialogue/not_found',
        message: 'dialogue not found',
      }),
      { status: 404 },
    );
  }
}
