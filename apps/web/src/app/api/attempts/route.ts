import { NextResponse } from 'next/server';
import { attemptInputSchema, computeMastery, type MasteryScores } from '@/modules/mastery';
import { fail, ok } from '@/modules/shared';
import { getAttemptStore } from '@/lib/poc/stores';

/**
 * GET/POST /api/attempts — dialogue mastery attempts (TASK-DLG-POC-01).
 * POST validates with zod, scores server-side (answers never trusted from the client
 * beyond per-measure fractions in this PoC) and stores via the repository interface.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dialogueId = url.searchParams.get('dialogueId') ?? undefined;
  return NextResponse.json(ok({ attempts: getAttemptStore().list(dialogueId) }), {
    headers: { 'cache-control': 'no-store' },
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail({ code: 'attempts/invalid_json', message: 'body must be JSON' }), {
      status: 400,
    });
  }

  const parsed = attemptInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(fail({ code: 'attempts/validation_failed', message: parsed.error.message }), {
      status: 400,
    });
  }

  const scores = parsed.data.scores as MasteryScores;
  const result = computeMastery(scores, 'stage2');
  const attempt = getAttemptStore().create(parsed.data, result.outcome);
  return NextResponse.json(ok({ attempt, scoring: result }), { status: 201 });
}
