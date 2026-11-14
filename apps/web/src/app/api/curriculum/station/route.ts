import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, ok } from '@/modules/shared';
import { getStationProgressStore } from '@/lib/poc/stores';
import { GUEST_LEARNER_ID, resolveLearnerIdFromRequest } from '@/lib/learner/server';
import { loadChapterBundle } from '@/modules/curriculum/server';
import {
  applyStationEvent,
  stationMeetsCompletion,
  gradeExerciseAnswer,
  findBlockAnswer,
  type ExerciseAnswerPayload,
} from '@/modules/curriculum';
import { KANA_ITEMS } from '@/modules/curriculum/content/kana-items';
import { kanaAudioUrls } from '@/modules/audio/kana-audio';
import { hostWordAudioUrls } from '@/modules/audio/hostword-audio';
import { recordLearningEvent } from '@/modules/curriculum/events';
import { resumeFreshness, parseActivityAt } from '@/modules/curriculum/resume-policy';
import { completeStationWalk } from '@/lib/poc/completions';
import type { StationState } from '@/modules/curriculum/types';
import type { Chapter } from '@/modules/curriculum/types';

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
 * DEV-ONLY auth note: userId resolves to the per-browser learner id
 * (hanaso_lid cookie — TASK-LEARNING-08/#109; minted by src/middleware.ts on
 * the first response, TASK-HANASO-20). A request with NO valid cookie resolves
 * to the read-only GUEST scope: every state-changing action below rejects it
 * (401 learner/no_identity) — never a shared account, never a silent write.
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
    /** Block-interaction grading (guided-discovery / prediction / integrate replies):
     *  the SAME no-key-in-client rule as bank exercises — answers live only here. */
    action: z.literal('grade-block'),
    chapterSlug: z.string().min(1),
    stationSlug: z.string().min(1),
    blockId: z.string().min(1),
    stepIndex: z.number().int().min(0).optional(),
    answer: answerSchema,
  }),
  z.object({
    action: z.literal('enter'),
    chapterSlug: z.string().min(1),
    stationSlug: z.string().min(1),
    /** TASK-LEARNING-08 (WP-5): the block the walk is on (server resume anchor). */
    currentBlockId: z.string().min(1).optional(),
    stepIndex: z.number().int().min(0).optional(),
  }),
  z.object({
    /**
     * TASK-LEARNING-08 (WP-5 — owner feedback E): mid-walk position sync. Fired
     * on every block transition (NOT every answer — bounded write rate). Keeps
     * StationState.currentBlock fresh so a resume works even after a localStorage
     * clear on the same browser.
     */
    action: z.literal('progress'),
    chapterSlug: z.string().min(1),
    stationSlug: z.string().min(1),
    currentBlockId: z.string().min(1),
    stepIndex: z.number().int().min(0),
  }),
  z.object({
    action: z.literal('complete'),
    chapterSlug: z.string().min(1),
    stationSlug: z.string().min(1),
    /** Client-tracked session score (server-graded answers only) — clamped. */
    score: z.number().min(0).max(1).nullable().optional(),
    taskCompleted: z.boolean().optional(),
  }),
  z.object({
    /**
     * TASK-HANASO-25 (BUG-023 — the «سرنخ» no-op): fetch ONE exercise's F2 hint.
     * The hint ladder (f2HintFa) is authored teaching material — it never
     * crosses to the client pre-answer with the bank payload (answer-key
     * discipline), so the button must round-trip. Returns ONLY the hint text:
     * no options, no key, no rationale — nothing that grades an answer.
     * Read-only for the GUEST scope (identity rules unchanged). */
    action: z.literal('hint'),
    chapterSlug: z.string().min(1),
    stationSlug: z.string().min(1),
    exerciseId: z.string().min(1),
  }),
  z.object({
    /**
     * TASK-LEARNING-07 (DD-105/DD-111): handwriting practice record. The client
     * sends ONLY the structured summary (raw pen paths never leave the browser);
     * the character must belong to this station's writing content — a summary for
     * an arbitrary character is rejected (no fabricated practice records).
     */
    action: z.literal('writing-practice'),
    chapterSlug: z.string().min(1),
    stationSlug: z.string().min(1),
    blockId: z.string().min(1).optional(),
    character: z.string().min(1),
    mode: z.enum(['guided', 'trace', 'free']),
    verdict: z.string().min(1).max(40),
    strokesTotal: z.number().int().min(0).max(64),
    strokesFirstTry: z.number().int().min(0).max(64),
    totalMistakes: z.number().int().min(0).max(999),
    hintsShown: z.number().int().min(0).max(999),
    completed: z.boolean(),
    durationMs: z.number().int().min(0).max(3_600_000),
  }),
]);

/**
 * TASK-LEARNING-10 §3 — authored Persian reading per kana id, derived from the
 * chapter's recognition exercises (their correct option label IS the authored
 * Persian reading — «»-stripped for a clean feedback display). First authored
 * label wins (stable order). Cached per chapter slug: the bank is static
 * in-process, so repeated grade calls never rescan it.
 */
const persianReadingCache = new Map<string, Map<string, string>>();
function persianReadingByKana(chapter: Chapter): Map<string, string> {
  const cached = persianReadingCache.get(chapter.slug);
  if (cached) return cached;
  const map = new Map<string, string>();
  for (const ex of Object.values(chapter.exercises)) {
    if (ex.type !== 'kana-recognition' || !ex.targetConcept || map.has(ex.targetConcept)) continue;
    const correct = ex.options?.find((o) => o.id === ex.correctOptionId);
    const label = correct?.label?.replace(/[«»]/g, '').trim();
    if (label) map.set(ex.targetConcept, label);
  }
  persianReadingCache.set(chapter.slug, map);
  return map;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(fail({ code: 'station/invalid_json', message: 'body must be JSON' }), { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(fail({ code: 'station/validation_failed', message: parsed.error.message }), {
      status: 400,
    });
  }
  const payload = parsed.data;
  const userId = resolveLearnerIdFromRequest(req);
  /*
   * TASK-HANASO-20 (BUG-001 remediation): a cookie-less client must never
   * write into a shared store. With the middleware every real request carries
   * a per-browser id; the GUEST scope only survives for bypassed paths and
   * direct handler calls — all POST actions here are state-changing, so a
   * uniform 401 with the Persian cause is the honest answer.
   */
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
    bundle = loadChapterBundle(payload.chapterSlug);
  } catch (err) {
    return NextResponse.json(fail({ code: 'station/unknown_chapter', message: (err as Error).message }), {
      status: 404,
    });
  }
  const station = bundle.chapter.stations.find((s) => s.slug === payload.stationSlug);
  if (!station) {
    return NextResponse.json(
      fail({ code: 'station/unknown_station', message: `unknown station: ${payload.stationSlug}` }),
      { status: 404 },
    );
  }

  const store = getStationProgressStore();

  if (payload.action === 'enter' || payload.action === 'progress') {
    const current = await store.get(userId, station.slug);
    const next = applyStationEvent(current ?? undefined, { type: 'station_entered', stationSlug: station.slug });
    // WP-5: keep the resume anchor (currentBlock) fresh — the walk position is
    // part of the stored state, not just the client's memory.
    const anchorBlockId = 'currentBlockId' in payload ? payload.currentBlockId : undefined;
    const anchorValid =
      anchorBlockId !== undefined && station.blocks.some((b) => b.id === anchorBlockId) ? anchorBlockId : undefined;
    const base = next ?? current;
    /*
     * TASK-HANASO-17 (§۸ — resume expiration, server-authoritative):
     * - a RE-enter of an existing in_progress row is NOT meaningful activity —
     *   no lastActivityAt in the payload (the repository PRESERVES the stored
     *   clock) so a refresh never extends the 7-day resume deadline;
     * - the FIRST entry of a row IS meaningful (the walk truly started);
     * - `progress` (a block transition) is always meaningful;
     * - an EXPIRED anchor is dropped HERE (idempotently — every device then
     *   sees the same honest state) and the response carries resumeExpired so
     *   the runner starts the walk from the top with the neutral notice.
     */
    const isFirstEntry = current === null;
    const resumeExpired =
      current?.status === 'in_progress' &&
      resumeFreshness(parseActivityAt(current.lastActivityAt), Date.now()) === 'expired';
    const nowIso = new Date().toISOString();
    const state = await store.upsert(userId, station.slug, {
      stationSlug: station.slug,
      status: base?.status ?? 'in_progress',
      bestScore: base?.bestScore ?? null,
      attemptCount: base?.attemptCount ?? 0,
      ...(base?.status === 'in_progress' && anchorValid && !resumeExpired ? { currentBlock: anchorValid } : {}),
      ...(resumeExpired ? { currentBlock: null } : {}),
      ...(payload.action === 'progress' || isFirstEntry ? { lastActivityAt: nowIso } : {}),
    });
    if (payload.action === 'enter') {
      recordLearningEvent(
        'station_entered',
        {
          chapter_id: payload.chapterSlug,
          station_id: station.slug,
          ...(station.core ? {} : { source: 'curious' as const }),
        },
        userId,
      );
    }
    return NextResponse.json(
      ok({ stationSlug: station.slug, state, ...(resumeExpired ? { resumeExpired: true } : {}) }),
      { headers: { 'cache-control': 'no-store' } },
    );
  }

  if (payload.action === 'hint') {
    /* TASK-HANASO-25 (BUG-023): the «سرنخ» button's server round-trip. The
     * exercise must be a PRACTICE item of THIS station (no cross-station
     * probing); the response carries the authored f2HintFa ONLY — the F2 hint
     * is the ladder's designed help tier (mnemonic/confusable redirect), it
     * never names the answer for recognition/decode items (the CP-03 leak
     * rewrite made sure of that at the content layer). */
    const station = bundle.chapter.stations.find((s) => s.slug === payload.stationSlug);
    const exercise = bundle.chapter.exercises[payload.exerciseId];
    const inStation =
      station?.blocks?.some(
        (b) => (b as { exerciseIds?: string[] }).exerciseIds?.includes(payload.exerciseId),
      ) ?? false;
    if (!exercise || exercise.assessmentRole !== 'practice' || !inStation) {
      return NextResponse.json(
        fail({ code: 'station/unknown_exercise', message: `unknown practice exercise: ${payload.exerciseId}` }),
        { status: 404 },
      );
    }
    return NextResponse.json(
      ok({ hintFa: exercise.feedback.f2HintFa }),
      { headers: { 'cache-control': 'no-store' } },
    );
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
    /*
     * TASK-HANASO-22 (owner feedback redesign): the answer's audio + reading
     * card attach ONLY to a CORRECT outcome or a REVEAL (ladder level ≥ 3 —
     * attempt 3, where the answer is intentionally shown). Attaching them at
     * the FIRST miss (the old behavior) leaked the correct answer immediately
     * — the exact spoiler the owner reported. A wrong F1/F2 attempt now gets
     * the statement/hint ONLY; the pronunciation stays hearable once the
     * learner has seen or found the answer (correct, or the F3 reveal).
     * Absent asset → no correctAudio (the client hides the control honestly).
     */
    const revealAnswer = outcome.correct || outcome.level >= 3;
    if (!revealAnswer) {
      /* F1/F2 miss: statement/hint only — no key material leaves the server. */
    } else if (exercise.type === 'kana-recognition' || exercise.type === 'kana-recall' || exercise.type === 'kana-listening') {
      const item = KANA_ITEMS.find((k) => k.kanaId === exercise.targetConcept);
      const urls = item ? kanaAudioUrls(`kn-${item.kanaId}`) : null;
      if (item && urls) outcome.correctAudio = { what: item.glyph, ...urls };
      /* TASK-LEARNING-10 §3 — the answer's reading (glyph + Persian + Latin)
       * for the integrated feedback panel. Persian reading = the authored
       * recognition label for that kana (exercise bank = single source of
       * truth; «»-stripped for a clean display). */
      if (item) {
        outcome.correctReading = {
          glyph: item.glyph,
          fa: persianReadingByKana(bundle.chapter).get(item.kanaId) ?? '',
          latin: item.romaji,
        };
      }
    } else if (exercise.type === 'kana-decode' && exercise.promptJa) {
      const urls = hostWordAudioUrls(exercise.promptJa);
      if (urls) outcome.correctAudio = { what: exercise.promptJa, ...urls };
    } else if (exercise.type === 'rule-listening' && exercise.promptJa) {
      /* TL-13 (T1): the WORD recording is the question; the reveal carries the
       * word's own audio + its reading (glyph + Persian) — the word never
       * crossed the client boundary pre-answer (station page strips it). */
      const urls = hostWordAudioUrls(exercise.promptJa);
      if (urls) outcome.correctAudio = { what: exercise.promptJa, ...urls };
      outcome.correctReading = {
        glyph: exercise.promptJa,
        fa: exercise.promptJaReading ?? '',
        latin: '',
      };
    }
    await store.incrementAttempts(userId, station.slug);
    // TASK-LEARNING-06: analytics contract (in-memory store — pipeline = M6) +
    // weak-point signal when the F-ladder is exhausted (#106/F4).
    recordLearningEvent(
      'exercise_answered',
      {
        exercise_id: exercise.id,
        type: exercise.type,
        correct: outcome.correct,
        attempt_no: payload.attemptNo,
      },
      userId,
    );
    if (!outcome.correct && outcome.level >= 3) {
      recordLearningEvent(
        'exercise_weak_point',
        {
          exercise_id: exercise.id,
          station_id: station.slug,
          ...(exercise.referenceBlockId ? { reference_block_id: exercise.referenceBlockId } : {}),
        },
        userId,
      );
    }
    return NextResponse.json(ok({ outcome }), { headers: { 'cache-control': 'no-store' } });
  }

  if (payload.action === 'grade-block') {
    const found = findBlockAnswer(station, payload.blockId, payload.stepIndex);
    if (!found) {
      return NextResponse.json(
        fail({ code: 'station/unknown_block', message: `block ${payload.blockId} has no gradable answer` }),
        { status: 404 },
      );
    }
    let correct = false;
    if (found.blockKind === 'userReply') {
      const ans = payload.answer as ExerciseAnswerPayload;
      if (ans.kind === 'option' && found.correctOptionId) correct = ans.optionId === found.correctOptionId;
      if (ans.kind === 'build') {
        const orderOk =
          found.acceptedOrders?.some(
            (o) => o.length === ans.chipOrder.length && o.every((id, i) => ans.chipOrder[i] === id),
          ) ?? true;
        const nameOk = found.nameSlotChipId ? (ans.nameValue ?? '').trim().length > 0 : true;
        correct = orderOk && nameOk;
      }
    } else {
      correct = payload.answer.kind === 'option' && payload.answer.optionId === found.correctOptionId;
    }
    // Predictions are unscored warm-ups (COMPOSITION §۳-۲): the reveal is
    // educational in BOTH outcomes, so return it regardless of correctness
    // (TASK-LEARNING-02 — anchor prediction now server-graded).
    // TASK-LEARNING-14: rule-slide micro-questions (rule-step/rule-contrast ask)
    // follow the SAME prediction semantics — pretesting guesses are never
    // punished; the reveal teaches either way.
    const explainFa =
      found.blockKind === 'userReply'
        ? ''
        : found.blockKind === 'prediction' || found.blockKind === 'rule-slide-ask'
          ? found.explainFa
          : correct
            ? ''
            : found.explainFa;
    await store.incrementAttempts(userId, station.slug);
    return NextResponse.json(ok({ outcome: { correct, level: 0 as const, feedbackFa: explainFa } }), {
      headers: { 'cache-control': 'no-store' },
    });
  }

  if (payload.action === 'writing-practice') {
    // Validate the practiced character belongs to THIS station's writing content:
    // a writing-practice block's characters / focus pairs, or a kana-card glyph
    // (registry id → glyph). Summaries for arbitrary characters are rejected —
    // no fabricated practice records.
    const stationGlyphs = new Set<string>();
    for (const b of station.blocks) {
      if (b.kind === 'writing-practice') {
        for (const ch of b.characters) stationGlyphs.add(ch);
        for (const pair of b.focusPairs ?? []) {
          stationGlyphs.add(pair[0]);
          stationGlyphs.add(pair[1]);
        }
      }
      if (b.kind === 'kana-card') {
        const item = KANA_ITEMS.find((k) => k.kanaId === b.kanaId);
        if (item) stationGlyphs.add(item.glyph);
      }
    }
    if (!stationGlyphs.has(payload.character)) {
      return NextResponse.json(
        fail({
          code: 'station/writing_char_not_in_station',
          message: `character "${payload.character}" is not part of this station's writing content`,
        }),
        { status: 422 },
      );
    }
    recordLearningEvent(
      'writing_practice_completed',
      {
        chapter_id: payload.chapterSlug,
        station_id: station.slug,
        character: payload.character,
        mode: payload.mode,
        verdict: payload.verdict,
        strokes_total: payload.strokesTotal,
        strokes_first_try: payload.strokesFirstTry,
        total_mistakes: payload.totalMistakes,
        hints_shown: payload.hintsShown,
        completed: payload.completed,
        duration_ms: payload.durationMs,
      },
      userId,
    );
    return NextResponse.json(ok({ recorded: true }), { headers: { 'cache-control': 'no-store' } });
  }

  // complete — the SERVER enforces the walk order (prerequisites), not just the UI
  const score = payload.score == null ? null : Math.max(0, Math.min(1, payload.score));
  const current = await store.get(userId, station.slug);
  if (current?.status === 'completed') {
    return NextResponse.json(ok({ stationSlug: station.slug, state: current, already: true }));
  }
  const prereqSlugs = station.prerequisites;
  if (prereqSlugs.length > 0) {
    const prereqStates = new Map((await store.listForUnit(userId, prereqSlugs)).map((s) => [s.stationSlug, s]));
    const unsatisfied = prereqSlugs.filter(
      (slug) => !prereqStates.has(slug) || prereqStates.get(slug)!.status === 'in_progress',
    );
    if (unsatisfied.length > 0) {
      /*
       * TASK-HANASO-20 (BUG-004 remediation): the 409 now TELLS the learner what
       * is missing, in Persian, with the ordered prerequisite list (slug +
       * titleFa) in `details.prerequisites` so the client can link straight to
       * the first unmet lesson — never a bare "try again" dead end again.
       */
      const prerequisites = unsatisfied
        .map((slug) => {
          const st = bundle.chapter.stations.find((s) => s.slug === slug);
          return { slug, titleFa: st?.titleFa ?? slug, order: st?.order ?? Number.MAX_SAFE_INTEGER };
        })
        .sort((a, b) => a.order - b.order)
        .map(({ slug, titleFa }) => ({ slug, titleFa }));
      return NextResponse.json(
        fail({
          code: 'station/prerequisites_not_met',
          message: `برای ثبت این درس، ابتدا باید این درس‌ها کامل شوند: ${prerequisites
            .map((p) => `«${p.titleFa}»`)
            .join(' و ')}`,
          details: { prerequisites },
        }),
        { status: 409, headers: { 'cache-control': 'no-store' } },
      );
    }
  }
  if (!stationMeetsCompletion(station, score, payload.taskCompleted ?? false)) {
    /*
     * TASK-HANASO-21 (the owner-observed completion failure): the old body was
     * an English technical string (`criterion not met (exercise_threshold;
     * score=0.6)`) the client could only show as a generic retry — and retrying
     * re-submits the SAME score forever. The rejection is now STRUCTURED (same
     * contract as the BUG-004 prerequisites payload): a Persian message that
     * names the bar and the earned score, plus `details.kind = 'criterion'`
     * with the threshold, so the runner offers the real recovery — redo ONLY
     * the final exercise block, never a dead retry and never a full re-walk.
     * The validation itself is unchanged: nothing is accepted that the server
     * criterion rejects.
     */
    const threshold = station.completion.kind === 'exercise_threshold' ? station.completion.threshold : null;
    const pct = (v: number) => `${Math.round(v * 100).toLocaleString('fa-IR')}٪`;
    return NextResponse.json(
      fail({
        code: 'station/completion_not_met',
        message:
          station.completion.kind === 'exercise_threshold' && threshold !== null && score !== null
            ? `برای ثبت پایان این درس، نمرهٔ تمرین پایانی باید دست‌کم ${pct(threshold)} باشد — نمرهٔ این دور: ${pct(score)}. بدون از دست رفتن پیشرفت، می‌توانی فقط تمرین پایانی را یک‌بار دیگر انجام دهی.`
            : station.completion.kind === 'task_completed'
              ? 'برای ثبت پایان این درس، باید تکلیف پایانی این درس کامل شود.'
              : 'شرط ثبت پایان این درس هنوز برقرار نشده است.',
        details: { kind: 'criterion', criterion: station.completion, score, threshold },
      }),
      { status: 409, headers: { 'cache-control': 'no-store' } },
    );
  }
  /*
   * TASK-HANASO-24 (BUG-036): station upsert + chapter-aggregate fold = ONE
   * transaction on Postgres — a mid-failure can no longer leave the station
   * completed while the chapter aggregate never flips to stations_complete.
   */
  const { station: state, chapter: chapterState } = await completeStationWalk({
    userId,
    chapterSlug: payload.chapterSlug,
    stationSlug: station.slug,
    stationState: {
      stationSlug: station.slug,
      status: 'completed',
      bestScore: score,
      attemptCount: current?.attemptCount ?? 0,
      currentBlock: null, // walk finished — no stale resume anchor
      lastActivityAt: new Date().toISOString(), // completion IS meaningful activity (HANASO-17 §۸)
    },
    coreSlugs: bundle.chapter.stations.filter((s) => s.core).map((s) => s.slug),
  });

  // TASK-LEARNING-06: analytics contract — completion + FSRS enrollment data
  // (engine honestly marked not-integrated; the future engine replays these).
  recordLearningEvent(
    'station_completed',
    {
      chapter_id: payload.chapterSlug,
      station_id: station.slug,
      score,
    },
    userId,
  );
  if (station.fsrsItems.length > 0) {
    recordLearningEvent(
      'fsrs_cards_enrolled',
      {
        chapter_id: payload.chapterSlug,
        station_id: station.slug,
        items: station.fsrsItems,
        engine: 'not-integrated',
      },
      userId,
    );
  }
  // Per-unit checkpoint event (T-79 grouping — the Ch02 unit / kana island moment).
  const unit = bundle.chapter.units?.find((u) => u.stationSlugs.includes(station.slug));
  if (unit) {
    const unitStates = await store.listForUnit(userId, unit.stationSlugs);
    const done = unitStates.filter((s) => s.status !== 'in_progress').length;
    recordLearningEvent(
      'unit_checkpoint_completed',
      {
        chapter_id: payload.chapterSlug,
        unit_id: unit.slug,
        stations_completed: done,
      },
      userId,
    );
  }

  /* The chapter fold itself runs INSIDE the service transaction. */

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
    return NextResponse.json(fail({ code: 'station/missing_params', message: 'chapter & station required' }), {
      status: 400,
    });
  }
  const userId = resolveLearnerIdFromRequest(req);
  const state: StationState | null = await getStationProgressStore().get(userId, stationSlug);
  /* TASK-HANASO-17 §۸: the server is the source of truth for resume expiry —
   * the client never decides alone (multi-device consistency, §10). */
  const resumeExpired =
    state?.status === 'in_progress' && resumeFreshness(parseActivityAt(state.lastActivityAt), Date.now()) === 'expired';
  return NextResponse.json(ok({ stationSlug, state, ...(resumeExpired ? { resumeExpired: true } : {}) }), {
    headers: { 'cache-control': 'no-store' },
  });
}
