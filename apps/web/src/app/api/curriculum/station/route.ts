import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, ok } from '@/modules/shared';
import { getStationProgressStore, getChapterProgressStore } from '@/lib/poc/stores';
import { POC_DEFAULT_USER_ID } from '@/lib/poc/principal';
import { loadChapterBundle } from '@/modules/curriculum/server';
import {
  applyStationEvent,
  stationMeetsCompletion,
  gradeExerciseAnswer,
  type ExerciseAnswerPayload,
} from '@/modules/curriculum';
import type { StationState } from '@/modules/curriculum/types';

/**
 * POST /api/curriculum/station — island station walk events (TASK-LEARNING-01).
 *
 * Three actions (server-graded — the answer key never reaches the client):
 * - `enter`: mark the station in_progress (resume anchor).
 * - `grade`: grade ONE exercise answer at the given attempt number → F-ladder
 *   feedback (reveal only at level 3) + server-side attempt counter.
 * - `complete`: mark the station completed — the SERVER re-checks the criterion
 *   (viewed / task / threshold) before flipping, then folds the chapter aggregate.
 *
 * DEV-ONLY auth note: userId defaults to 'poc-user' until better-auth (M1).
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

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('grade'),
    chapterSlug: z.string().min(1),
    stationSlug: z.string().min(1),
    exerciseId: z.string().min(1),
    attemptNo: z.number().int().min(1).max(3),
    answer: answerSchema,
  }),
  z.object({
    action: z.literal('enter'),
    chapterSlug: z.string().min(1),
    stationSlug: z.string().min(1),
  }),
  z.object({
    action: z.literal('complete'),
    chapterSlug: z.string().min(1),
    stationSlug: z.string().min(1),
    /** Client-tracked session score (server-graded answers only) — clamped. */
    score: z.number().min(0).max(1).nullable().optional(),
    taskCompleted: z.boolean().optional(),
  }),
]);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail({ code: 'station/invalid_json', message: 'body must be JSON' }), { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(fail({ code: 'station/validation_failed', message: parsed.error.message }), { status: 400 });
  }
  const payload = parsed.data;
  const userId = POC_DEFAULT_USER_ID;

  let bundle;
  try {
    bundle = loadChapterBundle(payload.chapterSlug);
  } catch (err) {
    return NextResponse.json(
      fail({ code: 'station/unknown_chapter', message: (err as Error).message }),
      { status: 404 },
    );
  }
  const station = bundle.chapter.stations.find((s) => s.slug === payload.stationSlug);
  if (!station) {
    return NextResponse.json(
      fail({ code: 'station/unknown_station', message: `unknown station: ${payload.stationSlug}` }),
      { status: 404 },
    );
  }

  const store = getStationProgressStore();

  if (payload.action === 'enter') {
    const current = await store.get(userId, station.slug);
    const next = applyStationEvent(current ?? undefined, { type: 'station_entered', stationSlug: station.slug });
    const state = next ? await store.upsert(userId, station.slug, next) : current;
    return NextResponse.json(ok({ stationSlug: station.slug, state }), { headers: { 'cache-control': 'no-store' } });
  }

  if (payload.action === 'grade') {
    const exercise = bundle.chapter.exercises[payload.exerciseId];
    if (!exercise || exercise.assessmentRole !== 'practice') {
      return NextResponse.json(
        fail({ code: 'station/unknown_exercise', message: `unknown practice exercise: ${payload.exerciseId}` }),
        { status: 404 },
      );
    }
    const outcome = gradeExerciseAnswer(exercise, payload.answer as ExerciseAnswerPayload, payload.attemptNo);
    await store.incrementAttempts(userId, station.slug);
    return NextResponse.json(ok({ outcome }), { headers: { 'cache-control': 'no-store' } });
  }

  // complete
  const score = payload.score == null ? null : Math.max(0, Math.min(1, payload.score));
  const current = await store.get(userId, station.slug);
  if (current?.status === 'completed') {
    return NextResponse.json(ok({ stationSlug: station.slug, state: current, already: true }));
  }
  if (!stationMeetsCompletion(station, score, payload.taskCompleted ?? false)) {
    return NextResponse.json(
      fail({
        code: 'station/completion_not_met',
        message: `criterion not met (${station.completion.kind}; score=${score ?? 'null'})`,
      }),
      { status: 409 },
    );
  }
  const state = await store.upsert(userId, station.slug, {
    stationSlug: station.slug,
    status: 'completed',
    bestScore: score,
    attemptCount: current?.attemptCount ?? 0,
  });

  // chapter aggregate: all core stations terminal → stations_complete
  const chapterStore = getChapterProgressStore();
  const coreSlugs = bundle.chapter.stations.filter((s) => s.core).map((s) => s.slug);
  const states = new Map((await store.listForUnit(userId, coreSlugs)).map((s) => [s.stationSlug, s]));
  const allDone = coreSlugs.every(
    (slug) => states.has(slug) && states.get(slug)!.status !== 'in_progress',
  );
  let chapterState = await chapterStore.get(userId, payload.chapterSlug);
  if (allDone && (!chapterState || chapterState.status === 'started')) {
    chapterState = {
      status: 'stations_complete',
      bestWeighted: chapterState?.bestWeighted ?? null,
      bestMeasures: chapterState?.bestMeasures ?? null,
      remediationCount: chapterState?.remediationCount ?? 0,
    };
    await chapterStore.upsert(userId, payload.chapterSlug, chapterState);
  }

  return NextResponse.json(ok({ stationSlug: station.slug, state, chapterState }), {
    headers: { 'cache-control': 'no-store' },
  });
}

/** GET /api/curriculum/station?chapter=&station= — the stored state (resume anchor). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const chapterSlug = url.searchParams.get('chapter');
  const stationSlug = url.searchParams.get('station');
  if (!chapterSlug || !stationSlug) {
    return NextResponse.json(fail({ code: 'station/missing_params', message: 'chapter & station required' }), { status: 400 });
  }
  const state: StationState | null = await getStationProgressStore().get(POC_DEFAULT_USER_ID, stationSlug);
  return NextResponse.json(ok({ stationSlug, state }), { headers: { 'cache-control': 'no-store' } });
}
