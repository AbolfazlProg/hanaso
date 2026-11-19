/**
 * HANASO-IR production QA regression (2026-11-19):
 * POST /api/progress for a CHAPTER dialogue (no B_lesson anchor) must be
 * acknowledged with 200 applied:false — never a 500. The repository's
 * TASK-HANASO-21 sentinel (NoUnitAnchorError) is a programming-error tripwire;
 * the runtime condition is expected and handled.
 *
 * The unit environment runs in-memory stores (never the PG layer), so the store
 * getter is mocked to a repository whose upsert throws NoUnitAnchorError —
 * exactly what PgProgressRepository throws for chapter dialogues in production.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as postProgress } from '@/app/api/progress/route';
import { NoUnitAnchorError } from '@/db/repositories/progress';

const HANASO_LEARNER = '0f0f0f0f-0f0f-4f0f-8f0f-0f0f0f0f0f0f';

vi.mock('@/lib/learner/server', () => ({
  GUEST_LEARNER_ID: 'guest',
  resolveLearnerIdFromRequest: () => HANASO_LEARNER,
}));

const upsertMock = vi.fn();

/** An existing A_selfcheck unit so `dialogue_watched` is a legal transition (B_lesson). */
const CURRENT_UNIT = {
  userId: HANASO_LEARNER,
  dialogueId: 'dlg-kana-welcome-01',
  stage: 'A_selfcheck',
  status: 'in_progress',
  updatedAt: new Date().toISOString(),
};
vi.mock('@/lib/poc/stores', () => ({
  getProgressStore: () => ({
    get: (userId: string, dialogueId: string) => ({ ...CURRENT_UNIT, dialogueId }),
    upsert: upsertMock,
  }),
  getAttemptStore: () => ({ find: () => null }),
}));

function progressRequest(dialogueId: string, body: Record<string, unknown>): Request {
  return new Request('http://hanaso.ir/api/progress', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `hanaso_lid=${HANASO_LEARNER}.sig`,
    },
    body: JSON.stringify({ dialogueId, ...body }),
  });
}

describe('chapter-dialogue progress events (HANASO-IR QA)', () => {
  afterEach(() => {
    upsertMock.mockReset();
  });

  it('acknowledges the event with 200 applied:false when the dialogue has no unit anchor', async () => {
    upsertMock.mockImplementation(() => {
      throw new NoUnitAnchorError('kana-welcome-01');
    });
    const res = await postProgress(
      progressRequest('dlg-kana-welcome-01', {
        event: { type: 'dialogue_watched' },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.applied).toBe(false);
    expect(upsertMock).toHaveBeenCalled();
  });

  it('still applies the unit upsert for anchor-bearing dialogues (applied:true, 201)', async () => {
    upsertMock.mockResolvedValue({
      userId: HANASO_LEARNER,
      dialogueId: 'dlg-cafe-morning-01',
      stage: 'A_open',
      status: 'in_progress',
      updatedAt: new Date().toISOString(),
    });
    const res = await postProgress(
      progressRequest('dlg-cafe-morning-01', {
        event: { type: 'dialogue_watched' },
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.data.applied).toBe(true);
    expect(upsertMock).toHaveBeenCalled();
  });
});
