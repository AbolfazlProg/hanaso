import { NextResponse } from 'next/server';
import { computeMastery } from '@/modules/mastery';
import { attemptSubmissionSchema } from '@/modules/mastery';
import { fail, ok } from '@/modules/shared';
import { getAttemptStore } from '@/lib/poc/stores';
import { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
import { buildAssessmentQuestions, gradeAssessment } from '@/lib/poc/assessment-bank';

/**
 * GET/POST /api/attempts — dialogue mastery attempts (TASK-DLG-POC-01 + TASK-SLICE-01
 * → Postgres persistence in TASK-M0-10).
 * POST accepts RAW ANSWERS ONLY: per-question grading happens HERE on the server
 * (KB dialogue-mastery-model §۱ — the answer key never reaches the client), then
 * computeMastery applies weights/floors and the repository persists the attempt
 * (in-memory DEV-ONLY, or app.dialogue_mastery_attempts when DATABASE_URL is set).
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dialogueId = url.searchParams.get('dialogueId') ?? undefined;
  return NextResponse.json(ok({ attempts: await getAttemptStore().list(dialogueId) }), {
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

  const parsed = attemptSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(fail({ code: 'attempts/validation_failed', message: parsed.error.message }), {
      status: 400,
    });
  }

  const { dialogueId, userId, answers } = parsed.data;
  // `dialogueId` is the content id (`dlg-<slug>`); the loader wants the slug.
  const slug = dialogueId.replace(/^dlg-/, '');
  let questions;
  try {
    questions = buildAssessmentQuestions(loadDialogueBundle(slug));
  } catch {
    return NextResponse.json(
      fail({ code: 'attempts/dialogue_not_found', message: `unknown dialogue: ${dialogueId}` }),
      { status: 404 },
    );
  }
  const known = new Set(questions.map((q) => q.id));
  const unknown = Object.keys(answers).filter((id) => !known.has(id));
  if (unknown.length > 0) {
    return NextResponse.json(
      fail({ code: 'attempts/unknown_question', message: `unknown question ids: ${unknown.join(', ')}` }),
      { status: 400 },
    );
  }
  const answered = questions.filter((q) => answers[q.id]).length;
  if (answered < questions.length) {
    return NextResponse.json(
      fail({ code: 'attempts/incomplete', message: `all ${questions.length} questions must be answered` }),
      { status: 400 },
    );
  }

  const graded = gradeAssessment(questions, answers);
  const result = computeMastery(graded.scores, 'stage2');
  const attempt = await getAttemptStore().create(
    { dialogueId, userId, scores: graded.scores, weakPoints: graded.weakPoints },
    result.outcome,
  );
  return NextResponse.json(ok({ attempt, scoring: result, perQuestion: graded.perQuestion }), {
    status: 201,
  });
}
