import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, ok } from '@/modules/shared';
import { getStationProgressStore } from '@/lib/poc/stores';
import { loadChapterBundle } from '@/modules/curriculum/server';
import { gradeMasterySubmission, type ExerciseAnswerPayload } from '@/modules/curriculum';
import { LEVELS_BY_CODE } from '@/modules/curriculum/content/levels';
import { recordLearningEvent } from '@/modules/curriculum/events';
import { GUEST_LEARNER_ID, resolveLearnerIdFromRequest } from '@/lib/learner/server';
import { submitMasteryWithFold } from '@/lib/poc/completions';

/**
 * POST /api/curriculum/mastery — the chapter gate (stage D — TASK-LEARNING-01).
 *
 * Accepts RAW ANSWERS ONLY for the mastery bank (server-side grading — the key
 * never reaches the client, same contract as /api/attempts). Grades → weights
 * (M1..M5) → pass/remediate → persists the attempt (app.dialogue_mastery_attempts)
 * and folds the chapter aggregate (app.chapter_progress): `understood` is ONLY
 * set from a passed attempt (DD-048).
 *
 * TASK-HANASO-24: explicit guest 401 at the top (consistency with every other
 * state-changing route — pre-24 the gate's 409 happened to block guests first,
 * but the guard was implicit and one refactor away from a guest write).
 */
export const dynamic = 'force-dynamic';

const answerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('option'), optionId: z.string().min(1) }),
  z.object({ kind: z.literal('order'), orderedIds: z.array(z.string().min(1)).min(1) }),
  z.object({
    kind: z.literal('build'),
    chipOrder: z.array(z.string().min(1)).min(1),
    nameValue: z.string().optional(),
  }),
]);

const bodySchema = z.object({
  chapterSlug: z.string().min(1),
  answers: z.record(z.string().min(1), answerSchema),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail({ code: 'mastery/invalid_json', message: 'body must be JSON' }), { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(fail({ code: 'mastery/validation_failed', message: parsed.error.message }), {
      status: 400,
    });
  }
  const { chapterSlug, answers } = parsed.data;
  const userId = resolveLearnerIdFromRequest(req);
  if (userId === GUEST_LEARNER_ID) {
    return NextResponse.json(
      fail({
        code: 'learner/no_identity',
        message: 'شناسهٔ زبان‌آموز یافت نشد — کوکی «hanaso_lid» باید توسط مرورگر پذیرفته شود.',
      }),
      { status: 401, headers: { 'cache-control': 'no-store' } },
    );
  }

  let bundle;
  try {
    bundle = loadChapterBundle(chapterSlug);
  } catch (err) {
    return NextResponse.json(fail({ code: 'mastery/unknown_chapter', message: (err as Error).message }), {
      status: 404,
    });
  }
  const chapter = bundle.chapter;

  // The gate only opens after the core path is walked (island §۷ — DD-048: the
  // D-stage replay tests comprehension of a dialogue the learner has studied).
  const stationStore = getStationProgressStore();
  const coreSlugs = chapter.stations.filter((s) => s.core).map((s) => s.slug);
  const walkStates = new Map((await stationStore.listForUnit(userId, coreSlugs)).map((s) => [s.stationSlug, s]));
  const unwalked = coreSlugs.filter((slug) => !walkStates.has(slug) || walkStates.get(slug)!.status === 'in_progress');
  if (unwalked.length > 0) {
    return NextResponse.json(
      fail({
        code: 'mastery/gate_locked',
        message: `core path incomplete — ${unwalked.length} station(s) not walked`,
      }),
      { status: 409 },
    );
  }

  // every gate question must be answered
  const bank = Object.values(chapter.exercises).filter((e) => e.assessmentRole.startsWith('mastery_'));
  const missing = bank.filter((q) => !answers[q.id]);
  if (missing.length > 0) {
    return NextResponse.json(
      fail({ code: 'mastery/incomplete', message: `${missing.length}/${bank.length} gate questions unanswered` }),
      { status: 400 },
    );
  }

  // TASK-LEARNING-04 (#110): gate thresholds come from the chapter's LEVEL POLICY
  // (single source of truth — EQA-7), never from a hardcoded stage. A chapter
  // with an unresolvable level cannot reach the gate (EQA-7 fails the build).
  const level = LEVELS_BY_CODE[chapter.levelCode];
  if (!level) {
    return NextResponse.json(
      fail({
        code: 'mastery/unknown_level',
        message: `chapter ${chapterSlug} has no level policy ${chapter.levelCode}`,
      }),
      { status: 500 },
    );
  }
  const graded = gradeMasterySubmission(chapter, answers as Record<string, ExerciseAnswerPayload>, level);

  /*
   * TASK-HANASO-24 (BUG-036): attempt insert + chapter fold = ONE transaction
   * on Postgres (per-(user,dialogue) advisory lock makes MAX+1 race-free and
   * serializes double-submits; a mid-failure rolls the attempt back with the
   * fold — no attempt row without its aggregate).
   */
  const { attempt, chapterState } = await submitMasteryWithFold({
    userId,
    chapterSlug,
    dialogueId: bundle.bundle.dialogue.id,
    input: {
      dialogueId: bundle.bundle.dialogue.id,
      userId,
      scores: {
        M1: graded.scores.M1,
        M2: graded.scores.M2,
        M3: graded.scores.M3,
        M4: graded.scores.M4,
        M5: graded.scores.M5,
      },
      weakPoints: Object.entries(graded.wrongByMeasure).flatMap(([measure, ids]) =>
        ids.map((id) => ({
          lineId: chapter.exercises[id]?.lineRef ?? chapter.exercises[id]?.audioLineRef ?? '',
          objective: measure,
          severity: 'medium' as const,
        })),
      ),
    },
    outcome: graded.outcome,
    gate: {
      passed: graded.outcome === 'passed',
      weighted: graded.weightedScore,
      measures: {
        M1: graded.scores.M1,
        M2: graded.scores.M2,
        M3: graded.scores.M3,
        M4: graded.scores.M4,
        M5: graded.scores.M5,
      },
    },
    maxRemediationLoops: LEVELS_BY_CODE[chapter.levelCode]?.caps.maxRemediationLoops ?? 3,
  });
  const attemptLoop = chapterState.remediationCount;

  // TASK-LEARNING-06: analytics contract — per-measure gate outcomes (threshold
  // calibration input — OQ-052/056), remediation triggers and the chapter verdict.
  for (const [measure, score] of Object.entries(graded.scores)) {
    if (score === null) continue;
    recordLearningEvent(
      'gate_measure_completed',
      {
        chapter_id: chapterSlug,
        measure,
        score,
        attempt_loop: attemptLoop,
      },
      userId,
    );
  }
  if (graded.outcome === 'remediate') {
    for (const stationSlug of graded.remediationStations) {
      recordLearningEvent(
        'remediation_triggered',
        {
          chapter_id: chapterSlug,
          measure: '',
          target_station_id: stationSlug,
        },
        userId,
      );
    }
  }
  recordLearningEvent(
    'chapter_completed',
    {
      chapter_id: chapterSlug,
      outcome: graded.outcome === 'passed' ? 'understood' : 'remediate',
      attempt_loop: attemptLoop,
    },
    userId,
  );

  return NextResponse.json(
    ok({
      attempt,
      outcome: graded.outcome,
      // qualitative only in the UI — AC-947 (no raw % to the learner)
      chapterState,
      remediationStations: graded.remediationStations,
      wrongByMeasure: graded.wrongByMeasure,
    }),
    { status: 201, headers: { 'cache-control': 'no-store' } },
  );
}

/** GET /api/curriculum/mastery?chapter= — the stripped gate bank for the client. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const chapterSlug = url.searchParams.get('chapter');
  if (!chapterSlug) {
    return NextResponse.json(fail({ code: 'mastery/missing_chapter', message: 'chapter required' }), { status: 400 });
  }
  let bundle;
  try {
    bundle = loadChapterBundle(chapterSlug);
  } catch (err) {
    return NextResponse.json(fail({ code: 'mastery/unknown_chapter', message: (err as Error).message }), {
      status: 404,
    });
  }
  const { toClientExercise } = await import('@/modules/curriculum');
  const bank = Object.values(bundle.chapter.exercises)
    .filter((e) => e.assessmentRole.startsWith('mastery_'))
    .map(toClientExercise);
  return NextResponse.json(ok({ bank, count: bank.length }), { headers: { 'cache-control': 'no-store' } });
}
