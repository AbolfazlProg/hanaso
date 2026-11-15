import { NextResponse } from 'next/server';
import { computeMastery } from '@/modules/mastery';
import { attemptSubmissionSchema } from '@/modules/mastery';
import { fail, ok } from '@/modules/shared';
import { getAttemptStore } from '@/lib/poc/stores';
import { loadDialogueBundle } from '@/lib/poc/dialogue-bundle';
import { buildAssessmentQuestions, gradeAssessment } from '@/lib/poc/assessment-bank';
import { LEVELS_BY_CODE } from '@/modules/curriculum/content/levels';
import { GUEST_LEARNER_ID, resolveLearnerIdFromRequest } from '@/lib/learner/server';

/**
 * GET/POST /api/attempts — dialogue mastery attempts (TASK-DLG-POC-01 + TASK-SLICE-01
 * → Postgres persistence in TASK-M0-10).
 * POST accepts RAW ANSWERS ONLY: per-question grading happens HERE on the server
 * (KB dialogue-mastery-model §۱ — the answer key never reaches the client), then
 * computeMastery applies weights/floors and the repository persists the attempt
 * (in-memory DEV-ONLY, or app.dialogue_mastery_attempts when DATABASE_URL is set).
 *
 * TASK-HANASO-24 (RC-1 — audit BUG-011/030): ownership is the signed `hanaso_lid`
 * session token. GET lists the CALLER's attempts only (listForUser — pre-24 it
 * listed EVERY learner's attempts); POST records under the CALLER's identity —
 * a body-supplied `userId` is stripped by the schema, never trusted (pre-24 it
 * allowed arbitrary/NULL ids and the shared poc-user default).
 */
export const dynamic = 'force-dynamic';

function noIdentity(): NextResponse {
  return NextResponse.json(
    fail({
      code: 'learner/no_identity',
      message: 'شناسهٔ زبان‌آموز یافت نشد — کوکی «hanaso_lid» باید توسط مرورگر پذیرفته شود.',
    }),
    { status: 401, headers: { 'cache-control': 'no-store' } },
  );
}

export async function GET(req: Request) {
  const userId = resolveLearnerIdFromRequest(req);
  if (userId === GUEST_LEARNER_ID) return noIdentity();
  const url = new URL(req.url);
  const dialogueId = url.searchParams.get('dialogueId') ?? undefined;
  return NextResponse.json(ok({ attempts: await getAttemptStore().listForUser(userId, dialogueId) }), {
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

  const { dialogueId, answers } = parsed.data;
  const userId = resolveLearnerIdFromRequest(req);
  if (userId === GUEST_LEARNER_ID) return noIdentity();
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
  // TASK-LEARNING-04 (#110): thresholds are injected from the level policy — the
  // PoC dialogues are the L2 pilot band (N5-low), so the L2 gate applies. The PoC
  // pages are scheduled for removal in TASK-LEARNING-06 (#101).
  const result = computeMastery(graded.scores, LEVELS_BY_CODE['L2']!.caps.gate);
  const attempt = await getAttemptStore().create(
    { dialogueId, userId, scores: graded.scores, weakPoints: graded.weakPoints },
    result.outcome,
  );
  return NextResponse.json(ok({ attempt, scoring: result, perQuestion: graded.perQuestion }), {
    status: 201,
  });
}
