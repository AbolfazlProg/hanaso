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
  try {
    loadVoices(); // fail fast on an invalid voices.yaml
    return NextResponse.json(ok(loadDialogueBundle(slug)), { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return NextResponse.json(
      fail({
        code: 'dialogue/not_found',
        message: err instanceof Error ? err.message : String(err),
      }),
      { status: 404 },
    );
  }
}
