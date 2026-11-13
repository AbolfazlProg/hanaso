/**
 * HANASO — /api/practice (TASK-HANASO-22) — the independent-practice surface.
 *
 * Actions (envelope contract ok/fail — same as every HANASO route):
 *  - generate: build a server session (focused|mixed). The response carries
 *    STRIPPED items only — the answer keys never leave this file's scope
 *    (SKL-013 parity with lessons).
 *  - answer: grade one item server-side, return the honest outcome (practice
 *    ladder: statement at miss 1, full reveal at miss 2 — shorter than the
 *    lesson ladder, no option elimination: EV-045 scaffolding off in practice).
 *  - complete: persist the session (append-only) + fold Learning Object
 *    evidence (introduced → practiced → eligible_for_review). NEVER touches
 *    FSRS scheduling (single-scheduler rule) and NEVER gates the walk.
 *  - GET status: honest counts for the hub (completed sessions, weak objects,
 *    eligibility) — no fake review dates.
 *
 * Prerequisite safety: the taught set comes from the learner's REAL completed
 * stations (walk store) — an untaught glyph can never enter a session.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, ok } from '@/modules/shared';
import { GUEST_LEARNER_ID, resolveLearnerIdFromRequest } from '@/lib/learner/server';
import { getLearningObjectStore, getPracticeSessionStore, getStationProgressStore } from '@/lib/poc/stores';
import { loadChapterBundle } from '@/modules/curriculum/server';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import { foldItemResult, isWeakObject, seedRecord } from '@/modules/practice/evidence';
import { generateKanaSession } from '@/modules/practice/kana/generator';
import { glyphsIntroducedByStation } from '@/modules/practice/kana/items';
import { PRACTICE_POLICY } from '@/modules/practice/kana/policy';
import { isKanaDimension, KANA_DIMENSION_LABELS_FA } from '@/modules/practice/kana/dimensions';
import { toClientItem, type PracticeItemResult, type StoredPracticeSession } from '@/modules/practice/session';
import { newSessionId, type InFlightSession } from '@/modules/practice/repository';

export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ schemas */

const generateSchema = z.object({
  action: z.literal('generate'),
  skill: z.literal('kana'),
  kind: z.enum(['focused', 'mixed']),
  /** Focused: a completed station slug. Mixed: unused (chapter scope). */
  scopeKey: z.string().min(1).max(120),
  includeWriting: z.boolean().optional().default(false),
});

const answerSchema = z.object({
  action: z.literal('answer'),
  sessionId: z.string().uuid(),
  itemId: z.string().min(1).max(80),
  attemptNo: z.number().int().min(1).max(PRACTICE_POLICY.maxAttempts),
  answer: z.union([
    z.object({ kind: z.literal('choice'), optionId: z.string().min(1).max(40) }),
    z.object({ kind: z.literal('write'), accepted: z.boolean() }),
  ]),
});

const completeSchema = z.object({
  action: z.literal('complete'),
  sessionId: z.string().uuid(),
  /** [{itemId, ms}] — correctness comes from the SERVER's session state. */
  items: z
    .array(z.object({ itemId: z.string().min(1).max(80), ms: z.number().int().min(0).max(600000).optional().default(0) }))
    .max(64),
});

const bodySchema = z.discriminatedUnion('action', [generateSchema, answerSchema, completeSchema]);

/* ------------------------------------------------------------------ helpers */

/** The learner's completed kana stations (the prerequisite truth). */
async function completedKanaStations(userId: string): Promise<Set<string>> {
  const chapter = loadChapterBundle('kana-foundation-01').chapter;
  const states = await getStationProgressStore().listForUnit(
    userId,
    chapter.stations.map((s) => s.slug),
  );
  return new Set(states.filter((s) => s.status === 'completed').map((s) => s.stationSlug));
}

/** Weak object ids from the evidence store (honest, evidence-backed only). */
async function weakObjectIds(userId: string): Promise<Set<string>> {
  const records = await getLearningObjectStore().listForUser(userId, 'kana');
  return new Set(records.filter(isWeakObject).map((r) => r.objectId));
}

/* ------------------------------------------------------------------ GET status */

export async function GET(req: Request) {
  const userId = resolveLearnerIdFromRequest(req);
  if (userId === GUEST_LEARNER_ID) {
    return NextResponse.json(fail({ code: 'learner/no_identity', message: 'شناسهٔ زبان‌آموز یافت نشد.' }), {
      status: 401,
      headers: { 'cache-control': 'no-store' },
    });
  }
  const completed = await completedKanaStations(userId);
  const records = await getLearningObjectStore().listForUser(userId, 'kana');
  const eligible = records.filter((r) => r.state === 'eligible_for_review');
  const weak = records.filter(isWeakObject).slice(0, PRACTICE_POLICY.weakMaxSuggestions);
  const sessions = await getPracticeSessionStore().listForUser(userId, 5);

  /** Focused targets: every completed kana station that introduced glyphs. */
  const chapter = loadChapterBundle('kana-foundation-01').chapter;
  const focusTargets = chapter.stations
    .filter((s) => completed.has(s.slug) && glyphsIntroducedByStation(s.slug).length > 0)
    .map((s) => ({ stationSlug: s.slug, titleFa: s.titleFa, glyphCount: glyphsIntroducedByStation(s.slug).length }));

  return NextResponse.json(
    ok({
      completedStations: completed.size,
      focusTargets,
      mixedUnlocked: completed.size >= PRACTICE_POLICY.mixedMinStations,
      mixedMinStations: PRACTICE_POLICY.mixedMinStations,
      eligibleForReview: eligible.length,
      totalKanaObjects: KANA_ITEMS.length,
      weakObjects: weak.map((r) => ({ objectId: r.objectId, labelFa: weakLabelFa(r.objectId) })),
      recentSessions: sessions.map((s) => ({
        id: s.id,
        kind: s.kind,
        scopeKey: s.scopeKey,
        items: s.itemResults.length,
        firstTryCorrect: s.itemResults.filter((r) => r.firstTryCorrect).length,
        completedAt: s.completedAt,
      })),
      reviewEngineNoteFa: 'کارت‌های واجد مرور ثبت می‌شوند؛ صف مرور با موتور زمان‌بندی فعال می‌شود (هنوز فعال نیست).',
    }),
    { headers: { 'cache-control': 'no-store' } },
  );
}

/** Honest Persian label for a weak object (glyph or word). */
function weakLabelFa(objectId: string): string {
  if (objectId.startsWith('word-')) return objectId.slice(5);
  const kanaId = objectId.replace(/^kn-(rec-|recall-)?/, '');
  const item = KANA_ITEMS.find((k) => k.kanaId === kanaId || k.fsrsCardId === objectId);
  return item ? `${item.glyph} (${item.romaji})` : objectId;
}

/* ------------------------------------------------------------------ POST */

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail({ code: 'practice/invalid_json', message: 'body must be JSON' }), {
      status: 400,
      headers: { 'cache-control': 'no-store' },
    });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(fail({ code: 'practice/validation_failed', message: parsed.error.message }), {
      status: 400,
      headers: { 'cache-control': 'no-store' } as HeadersInit,
    });
  }
  const payload = parsed.data;
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

  /* ---------------- generate ---------------- */
  if (payload.action === 'generate') {
    const completed = await completedKanaStations(userId);
    if (payload.kind === 'focused') {
      if (!completed.has(payload.scopeKey)) {
        return NextResponse.json(
          fail({ code: 'practice/scope_not_completed', message: 'تمرین متمرکز فقط برای درس‌های تکمیل‌شده باز می‌شود.' }),
          { status: 409, headers: { 'cache-control': 'no-store' } },
        );
      }
    } else if (completed.size < PRACTICE_POLICY.mixedMinStations) {
      return NextResponse.json(
        fail({
          code: 'practice/mixed_locked',
          message: `تمرین ترکیبی پس از کامل‌کردن دست‌کم ${new Intl.NumberFormat('fa-IR').format(PRACTICE_POLICY.mixedMinStations)} درس باز می‌شود.`,
        }),
        { status: 409, headers: { 'cache-control': 'no-store' } },
      );
    }

    const weak = payload.kind === 'mixed' ? await weakObjectIds(userId) : new Set<string>();
    const generated = generateKanaSession({
      kind: payload.kind,
      scopeKey: payload.scopeKey,
      completedStations: completed,
      weakObjectIds: weak,
      includeWriting: payload.includeWriting === true,
      seed: (Date.now() % 2147483646) + 1,
    });
    if (generated.items.length === 0) {
      return NextResponse.json(
        fail({ code: 'practice/no_items', message: generated.noteFa ?? 'مادهٔ تمرینی کافی نیست.' }),
        { status: 409, headers: { 'cache-control': 'no-store' } },
      );
    }

    const session: InFlightSession = {
      id: newSessionId(),
      userId,
      skill: 'kana',
      kind: payload.kind,
      scopeKey: payload.scopeKey,
      items: generated.items,
      progress: new Map(),
      startedAtMs: Date.now(),
    };
    await getPracticeSessionStore().create(session);
    return NextResponse.json(
      ok({
        sessionId: session.id,
        kind: session.kind,
        noteFa: generated.noteFa,
        items: generated.items.map(toClientItem),
      }),
      { headers: { 'cache-control': 'no-store' } },
    );
  }

  /* ---------------- answer ---------------- */
  if (payload.action === 'answer') {
    const session = await getPracticeSessionStore().get(payload.sessionId);
    if (!session || session.userId !== userId) {
      return NextResponse.json(
        fail({ code: 'practice/session_not_found', message: 'نشست تمرین یافت نشد یا منقضی شده است.' }),
        { status: 404, headers: { 'cache-control': 'no-store' } },
      );
    }
    const item = session.items.find((i) => i.id === payload.itemId);
    if (!item) {
      return NextResponse.json(
        fail({ code: 'practice/unknown_item', message: `unknown item: ${payload.itemId}` }),
        { status: 404, headers: { 'cache-control': 'no-store' } },
      );
    }
    const correct =
      item.interaction.kind === 'choice'
        ? payload.answer.kind === 'choice' && payload.answer.optionId === item.interaction.correctOptionId
        : payload.answer.kind === 'write' && payload.answer.accepted;

    const prev = session.progress.get(item.id) ?? { attempts: 0, firstTryCorrect: false };
    session.progress.set(item.id, {
      attempts: Math.max(prev.attempts, payload.attemptNo),
      firstTryCorrect: prev.firstTryCorrect || (correct && payload.attemptNo === 1),
    });

    /* The practice ladder (shorter than lessons): a miss at attempt 1 → honest
     * statement, NO reveal; the second miss (max) → the answer + teaching
     * reveal; a correct answer always closes the loop with the reveal. */
    const revealFa = correct
      ? item.interaction.revealFa
      : payload.attemptNo >= PRACTICE_POLICY.maxAttempts
        ? item.interaction.revealFa
        : undefined;
    return NextResponse.json(
      ok({
        correct,
        dimension: item.dimension,
        dimensionLabelFa: isKanaDimension(item.dimension) ? KANA_DIMENSION_LABELS_FA[item.dimension] : item.dimension,
        revealFa,
      }),
      { headers: { 'cache-control': 'no-store' } },
    );
  }

  /* ---------------- complete ---------------- */
  const session = await getPracticeSessionStore().get(payload.sessionId);
  if (!session || session.userId !== userId) {
    return NextResponse.json(
      fail({ code: 'practice/session_not_found', message: 'نشست تمرین یافت نشد یا منقضی شده است.' }),
      { status: 404, headers: { 'cache-control': 'no-store' } },
    );
  }

  const results: PracticeItemResult[] = [];
  for (const done of payload.items) {
    const item = session.items.find((i) => i.id === done.itemId);
    const prog = session.progress.get(done.itemId);
    if (!item || !prog) continue; // never fabricate evidence
    results.push({
      itemId: item.id,
      objectId: item.objectId,
      dimension: item.dimension,
      firstTryCorrect: prog.firstTryCorrect,
      attempts: Math.max(1, prog.attempts),
      ms: done.ms,
    });
  }

  const stored: StoredPracticeSession = {
    id: session.id,
    userId,
    skill: session.skill,
    kind: session.kind,
    scopeKey: session.scopeKey,
    itemResults: results,
    startedAt: new Date(session.startedAtMs).toISOString(),
    completedAt: new Date().toISOString(),
  };
  await getPracticeSessionStore().recordCompleted(stored);

  /* Fold evidence into Learning Object states (idempotent, honest). */
  const loStore = getLearningObjectStore();
  let newlyEligible = 0;
  const byObject = new Map<string, PracticeItemResult[]>();
  for (const r of results) {
    const list = byObject.get(r.objectId) ?? [];
    list.push(r);
    byObject.set(r.objectId, list);
  }
  for (const [objectId, list] of byObject) {
    const existing = await loStore.get(userId, objectId);
    let record = existing ?? seedRecord(userId, objectId, 'kana');
    const before = record.state;
    for (const r of list) record = foldItemResult(record, r);
    await loStore.upsert(record);
    if (before !== 'eligible_for_review' && record.state === 'eligible_for_review') newlyEligible += 1;
  }

  const firstTry = results.filter((r) => r.firstTryCorrect).length;
  return NextResponse.json(
    ok({
      recorded: true,
      items: results.length,
      firstTryCorrect: firstTry,
      objectsPracticed: byObject.size,
      newlyEligible,
      reviewEngineNoteFa: 'کارت‌های واجد مرور ثبت شدند؛ صف مرور با موتور زمان‌بندی فعال می‌شود (هنوز فعال نیست).',
    }),
    { headers: { 'cache-control': 'no-store' } },
  );
}
