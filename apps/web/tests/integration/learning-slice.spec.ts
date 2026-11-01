/**
 * TASK-SLICE-01 — the full Learning Vertical Slice, end-to-end on the real modules
 * (in-memory DEV-ONLY repositories, no HTTP server needed — route handlers invoked
 * directly, exactly like the existing mastery-api spec):
 *
 *   /poc/dialogue (A→B) → /poc/lesson (B→C) → /poc/practice (C→D, exercises generated
 *   + checked by the practice module) → /poc/assessment (D→understood via /api/attempts
 *   + the mastery gate in /api/progress), with the ADR-016 event sink recording the flow.
 */
import { describe, expect, it } from 'vitest';
import { GET as getProgress, POST as postProgress } from '@/app/api/progress/route';
import { GET as getAttempts, POST as postAttempt } from '@/app/api/attempts/route';
import { GET as getEvents, POST as postEvent } from '@/app/api/events/route';
import { resolveSpeaker } from '@/modules/character';
import { loadDialogue } from '@/modules/dialogue/server';
import type { CharacterRef } from '@/modules/dialogue';
import { checkAnswers, generateExercises } from '@/modules/practice';
import type { ExerciseAnswer } from '@/modules/practice';
import { applyProgressEvent } from '@/modules/progress';
import { getProgressStore } from '@/lib/poc/stores';

const BASE = 'http://localhost/api';
const DLG = 'dlg-cafe-morning-01';

function post(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function json<T>(res: Response): Promise<T> {
  expect(res.ok).toBe(true);
  const body = (await res.json()) as { ok: boolean; data: T };
  expect(body.ok).toBe(true);
  return body.data;
}

async function fire(name: string, props: Record<string, unknown>): Promise<void> {
  const res = await postEvent(post(`${BASE}/events`, { name, props }));
  expect(res.status).toBe(201);
}

const dialogue = loadDialogue('cafe-morning-01');
const characters: CharacterRef[] = dialogue.characterIds.map((id) => {
  const { manifest, voiceId } = resolveSpeaker(id);
  return {
    id: manifest.id,
    nameJa: manifest.nameJa,
    nameFa: manifest.nameFa,
    colorToken: manifest.colorToken,
    voiceId,
  };
});

interface ProgressData {
  progress: { stage: string; status: string; masteryAttemptId?: string } | null;
}

describe('learning slice — full A→D cycle through the API surface', () => {
  it('runs Dialogue → Learn → Practice → Mastery → understood', async () => {
    // ---- A: nothing yet; starting the unit records stage A
    const before = await json<ProgressData>(await getProgress(new Request(`${BASE}/progress?dialogueId=${DLG}`)));
    expect(before.progress).toBeNull();

    await fire('unit_started', { dialogue_id: DLG });
    const a = await json<ProgressData & { event: { type: string } }>(
      await postProgress(post(`${BASE}/progress`, { dialogueId: DLG, event: { type: 'unit_started' } })),
    );
    expect(a.progress!.stage).toBe('A_selfcheck');

    // jump attempts are rejected with typed codes (no skipping the cycle)
    const jump = await postProgress(post(`${BASE}/progress`, { dialogueId: DLG, event: { type: 'lesson_studied' } }));
    expect(jump.status).toBe(400);
    expect(((await jump.json()) as { error: { code: string } }).error.code).toBe('progress/invalid_transition');

    // ---- A→B: the user watched the dialogue to the end
    await fire('dialogue_watched', { dialogue_id: DLG });
    const b = await json<ProgressData>(
      await postProgress(post(`${BASE}/progress`, { dialogueId: DLG, event: { type: 'dialogue_watched' } })),
    );
    expect(b.progress!.stage).toBe('B_lesson');

    // ---- B→C: lesson studied → practice becomes available
    await fire('lesson_studied', { dialogue_id: DLG });
    const c = await json<ProgressData>(
      await postProgress(post(`${BASE}/progress`, { dialogueId: DLG, event: { type: 'lesson_studied' } })),
    );
    expect(c.progress!.stage).toBe('C_practice');

    // ---- C: the practice session (generator + checker, all correct)
    const exercises = generateExercises(dialogue, characters);
    expect(exercises.length).toBeGreaterThanOrEqual(8);
    await fire('practice_started', { dialogue_id: DLG, exercises: exercises.length });

    const answers: Record<string, ExerciseAnswer> = {};
    for (const ex of exercises) {
      const item = ex.items[0]!;
      if (item.kind === 'order-reconstruct') answers[ex.id] = { orderedLineIds: [...item.correctOrder] };
      else answers[ex.id] = { optionId: item.correctOptionId };
    }
    const teachesByLine = new Map(dialogue.lines.map((l) => [l.id, l.teaches ?? []]));
    const result = checkAnswers(exercises, answers, teachesByLine);
    expect(result.correctCount).toBe(result.total);
    expect(result.weakPoints).toEqual([]);
    await fire('practice_submitted', {
      dialogue_id: DLG,
      correct: result.correctCount,
      total: result.total,
    });

    // ---- C→D: practice done → mastery gate unlocked
    const d = await json<ProgressData>(
      await postProgress(post(`${BASE}/progress`, { dialogueId: DLG, event: { type: 'practice_done' } })),
    );
    expect(d.progress!.stage).toBe('D_mastery');
    expect(d.progress!.status).toBe('active'); // D ≠ understood (DD-048)

    // ---- D: mastery attempt (server-side scoring in /api/attempts)
    const passedScores = { M1: 0.9, M2: 0.8, M3: 1, M4: 0.7, M5: 1 };
    const attemptData = await json<{
      attempt: { id: string; outcome: string; attemptNo: number };
      scoring: { outcome: string };
    }>(await postAttempt(post(`${BASE}/attempts`, { dialogueId: DLG, scores: passedScores, weakPoints: [] })));
    expect(attemptData.attempt.outcome).toBe('passed');
    await fire('mastery_passed', { dialogue_id: DLG, attempt_id: attemptData.attempt.id });

    // ---- D→understood: the gate verifies the attempt server-side
    const done = await json<ProgressData>(
      await postProgress(
        post(`${BASE}/progress`, {
          dialogueId: DLG,
          event: { type: 'mastery_passed', attemptId: attemptData.attempt.id },
        }),
      ),
    );
    expect(done.progress!.stage).toBe('D_mastery');
    expect(done.progress!.status).toBe('understood');
    expect(done.progress!.masteryAttemptId).toBe(attemptData.attempt.id);
    await fire('unit_understood', { dialogue_id: DLG });

    // the unit record survives re-reads (repository round-trip)
    const reread = await json<ProgressData>(await getProgress(new Request(`${BASE}/progress?dialogueId=${DLG}`)));
    expect(reread.progress!.status).toBe('understood');

    // the whole journey is visible in the event sink (ADR-016 object_verb names)
    const events = await json<{ events: { name: string }[] }>(await getEvents());
    const names = events.events.map((e) => e.name);
    for (const expected of [
      'unit_started',
      'dialogue_watched',
      'lesson_studied',
      'practice_started',
      'practice_submitted',
      'mastery_passed',
      'unit_understood',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('remediate does NOT open the gate — the unit stays active for targeted return', async () => {
    // a second dialogue-scoped user record: machine-advanced, then seeded into the
    // shared repository (the repository is the single write path for the API)
    const remediateUser = 'user-remediate';
    const a = applyProgressEvent(null, DLG, remediateUser, { type: 'unit_started' });
    const d = applyProgressEvent(
      applyProgressEvent(applyProgressEvent(a, DLG, remediateUser, { type: 'dialogue_watched' }), DLG, remediateUser, {
        type: 'lesson_studied',
      }),
      DLG,
      remediateUser,
      { type: 'practice_done' },
    );
    getProgressStore().upsert(d);

    const weak = await postAttempt(
      post(`${BASE}/attempts`, {
        dialogueId: DLG,
        userId: remediateUser,
        scores: { M1: 0.9, M2: 0.9, M3: 0.9, M4: 0.3, M5: 0.9 }, // M4 < floor → remediate
        weakPoints: [{ lineId: 's-cafe-morning-01-l6', objective: 'listening-comprehension', severity: 'high' }],
      }),
    );
    const weakBody = (await weak.json()) as { data: { attempt: { id: string; outcome: string } } };
    expect(weakBody.data.attempt.outcome).toBe('remediate');

    const refused = await postProgress(
      post(`${BASE}/progress`, {
        dialogueId: DLG,
        userId: remediateUser,
        event: { type: 'mastery_passed', attemptId: weakBody.data.attempt.id },
      }),
    );
    expect(refused.status).toBe(400);
    expect(((await refused.json()) as { error: { code: string } }).error.code).toBe('progress/mastery_not_passed');

    // unknown attempt ids are 404, not a silent pass
    const ghost = await postProgress(
      post(`${BASE}/progress`, {
        dialogueId: DLG,
        userId: remediateUser,
        event: { type: 'mastery_passed', attemptId: 'att-does-not-exist' },
      }),
    );
    expect(ghost.status).toBe(404);
    expect(((await ghost.json()) as { error: { code: string } }).error.code).toBe('progress/attempt_not_found');
  });

  it('GET /api/progress requires dialogueId and honors userId scoping', async () => {
    const missing = await getProgress(new Request(`${BASE}/progress`));
    expect(missing.status).toBe(400);
    expect(((await missing.json()) as { error: { code: string } }).error.code).toBe('progress/missing_dialogue_id');

    // userId scoping: the remediate user's record is D/active (gate never opened),
    // while a third user sees null
    const scoped = await json<ProgressData>(
      await getProgress(new Request(`${BASE}/progress?dialogueId=${DLG}&userId=user-remediate`)),
    );
    expect(scoped.progress).toMatchObject({ userId: 'user-remediate', stage: 'D_mastery', status: 'active' });
    const stranger = await json<ProgressData>(
      await getProgress(new Request(`${BASE}/progress?dialogueId=${DLG}&userId=user-stranger`)),
    );
    expect(stranger.progress).toBeNull();

    const attempts = await json<{ attempts: { outcome: string }[] }>(
      await getAttempts(new Request(`${BASE}/attempts?dialogueId=${DLG}`)),
    );
    expect(attempts.attempts.map((x) => x.outcome)).toEqual(['passed', 'remediate']);
  });
});
