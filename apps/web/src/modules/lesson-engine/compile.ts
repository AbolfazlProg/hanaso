/**
 * HANASO — Lesson Engine compiler (owner-pass 2026-11-19, mission phase 3).
 *
 * Lowers an EngineChapter DRAFT into the EXISTING runtime types
 * (modules/curriculum/types.ts: Chapter/Station/TeachingBlock/Exercise) —
 * the D-0011 contract: no parallel engine, StationRunner stays the only walk
 * runtime. Draft chapters compile as a VALIDATION STEP (proving compilability
 * and shape-compatibility with the shipped runtime); publishing remains an
 * explicit owner action that flips `published` and checks the chapter in.
 *
 * Interaction → runtime mapping (from the gap analysis §۵ mapping table):
 *   select→meaning-select · listen_choose→audio-meaning · complete→cloze ·
 *   order→word-order · build→produce-template · match→match-in-line ·
 *   judge→response-select · spot→gist-select · transform/sort→word-order.
 */
import type {
  Chapter,
  ChapterUnit,
  CompletionCriteria,
  Exercise,
  Station,
  TeachingBlock,
  VocabItem,
  GrammarCluster,
  ExpressionItem,
} from '@/modules/curriculum/types';
import { ENGINE_CONFIG } from './engine-config';
import type { EngineChapter, EngineStation, EngineStep, ValidatorFinding } from './types';

const INTERACTION_TO_EXERCISE: Record<string, Exercise['type']> = {
  select: 'meaning-select',
  spot: 'gist-select',
  match: 'match-in-line',
  complete: 'cloze',
  // Order/Build: tiles-only = click-to-order (word-order); with extraTiles =
  // distractor chips → produce-template (chips) — QUESTION §۲ semantics.
  order_build: 'word-order',
  transform: 'word-order',
  listen_choose: 'audio-meaning',
  repeat_record: 'audio-meaning',
  sort: 'word-order',
  judge: 'response-select',
};

const DIFFICULTY_BY_STAGE: Record<string, 1 | 2 | 3> = { teach: 1, guided: 2, independent: 3 };

export interface CompileResult {
  chapter: Chapter;
  findings: ValidatorFinding[];
}

/** One display step → a `scene` block (title/body only — audio rides on the exercise). */
function displayBlock(step: EngineStep, chapter: EngineChapter): TeachingBlock {
  void chapter;
  return {
    kind: 'scene',
    id: `sc-${step.id}`,
    titleFa: step.card?.textFa ?? step.goal,
    bodyFa: [step.card?.textJa, step.card?.reading, step.card?.highlight ? `های‌لایت: ${step.card.highlight}` : null]
      .filter(Boolean)
      .join('\n'),
  } as TeachingBlock;
}

/** One interaction step → an `exercise` block + its runtime Exercise record. */
function compileInteraction(
  chapter: EngineChapter,
  station: EngineStation,
  step: EngineStep,
  orderIndex: number,
  findings: ValidatorFinding[],
): { block: TeachingBlock; exercise: Exercise } {
  const it = step.interaction;
  if (!it) throw new Error(`step ${step.id} has no interaction`);
  const exType = INTERACTION_TO_EXERCISE[it.type] ?? 'meaning-select';
  const exerciseId = `ex-${station.id}-${step.id}`;
  const options = (it.options ?? []).map((o) => ({ id: o.id, label: o.ja ?? o.label }));
  // REBUILD-02: the runtime rule MCQ-THREE is a HARD content gate (validation.ts)
  // — surface it at compile time with the same severity.
  if ((it.type === 'select' || it.type === 'listen_choose' || it.type === 'judge') && options.length !== 3) {
    findings.push({
      rule: 'C-MCQ-THREE',
      severity: 'hard',
      message: `تعامل MCQ دقیقاً ۳ گزینه لازم دارد (قاعدهٔ محصول MCQ-THREE) — الان ${options.length}.`,
      location: `station[${station.id}].${step.id}`,
    });
  }
  /*
   * UX-AUDIT #142 (root B — unanswerable placeholders never compile): an
   * order/transform/sort interaction with NO tiles (the TODO skeleton class —
   * e.g. the raw n5-lesson-02 draft) would compile into an exercise with an
   * empty answer key and an EMPTY F3 reveal — unanswerable content. Hard
   * finding: the draft stays out of the registry, the index and the walk.
   */
  if ((it.type === 'order_build' || it.type === 'transform' || it.type === 'sort') && (it.tiles ?? []).length < 2) {
    findings.push({
      rule: 'C-ORDER-TILES',
      severity: 'hard',
      message: `تعامل چینش دست‌کم ۲ تایل لازم دارد — الان ${(it.tiles ?? []).length} (محتوای پاسخ‌ناپذیر/placeholder).`,
      location: `station[${station.id}].${step.id}`,
    });
  }

  const exercise: Exercise = {
    id: exerciseId,
    type: exType,
    targetSkill:
      station.domain === 'vocab'
        ? 'vocab'
        : station.domain === 'grammar'
          ? 'grammar'
          : station.domain === 'kana'
            ? 'structure'
            : 'listening',
    targetConcept: `${chapter.id}:${station.id}:${step.goal}`,
    assessesConcepts: [],
    lineRef: step.card?.lineRef,
    difficulty: DIFFICULTY_BY_STAGE[step.stage] ?? 1,
    promptFa: it.promptFa,
    promptJa: step.card?.textJa,
    promptJaReading: step.card?.reading,
    audioLineRef: step.card?.audioRef ?? step.card?.lineRef,
    options: options.length > 0 ? options : undefined,
    correctOptionId: typeof it.correct === 'string' ? it.correct : undefined,
    clozeTokens:
      it.type === 'complete' && step.card?.textJa
        ? step.card.textJa.split(/\s+/).map((t) => (t.includes('__') ? null : t))
        : undefined,
    chunks:
      it.type === 'order_build' || it.type === 'transform' || it.type === 'sort'
        ? (it.tiles ?? []).map((t, i) => ({ id: `t${i}`, ja: t }))
        : undefined,
    correctOrder:
      it.type === 'order_build' || it.type === 'transform' || it.type === 'sort'
        ? (it.tiles ?? []).map((_t, i) => `t${i}`)
        : undefined,
    chips:
      it.type === 'order_build' && (it.extraTiles?.length ?? 0) > 0
        ? [...(it.tiles ?? []), ...(it.extraTiles ?? [])].map((t, i) => ({ id: `c${i}`, ja: t }))
        : undefined,
    acceptedChipOrder:
      it.type === 'order_build' && (it.extraTiles?.length ?? 0) > 0
        ? (it.tiles ?? []).map((_t, i) => `c${i}`)
        : undefined,
    distractorRationaleFa: it.distractorReasons,
    feedback: {
      /*
       * UX-AUDIT #139 (root D — the ladder is the WRONG-path ladder): f1/f2
       * are the pre-reveal beats — they take the HINTS/wrong-path copy. The
       * SUCCESS message (feedbackCorrectFa — which naturally contains the
       * answer) may only surface at F3, the reveal level. Previously f1Fa
       * carried feedbackCorrectFa verbatim: every draft exercise leaked its
       * answer on the FIRST wrong attempt.
       */
      f1Fa: it.hints?.[0] ?? it.feedbackWrongFa ?? 'با یادآور محتوایی یک بار دیگر تلاش کن.',
      f2HintFa: it.hints?.[1] ?? it.feedbackWrongFa ?? 'یک بار دیگر با یادآور محتوایی تلاش کن.',
      f3ExplainFa: it.hints?.[2] ?? it.feedbackCorrectFa ?? it.feedbackWrongFa ?? 'پاسخ با مثال حل‌شده نمایش می‌شود.',
    },
    assessmentRole: 'practice',
    referenceBlockId: undefined,
  };
  return { block: { kind: 'exercise', id: `blk-ex-${step.id}`, exerciseIds: [exerciseId] } as TeachingBlock, exercise };
}

/** Compile one station (steps → blocks + exercises). */
function compileStation(
  chapter: EngineChapter,
  dialogueSlug: string,
  station: EngineStation,
  order: number,
  findings: ValidatorFinding[],
): { station: Station; exercises: Exercise[] } {
  const blocks: TeachingBlock[] = [];
  const exercises: Exercise[] = [];
  const lineRefs = new Set<string>();

  if (station.intro) {
    /*
     * UX-AUDIT #142 (root B — the internal-id leak): the conversation link is
     * a STRUCTURED field, never baked into learner-facing copy. The station
     * runner resolves it against the chapter's own dialogue and renders the
     * linked line as CONTENT (speaker + text + translation + audio); an
     * unresolvable ref renders nothing. The old bodyFa literally printed
     * «اتصال به مکالمه: s-first-meeting-01-l1» — a registry id, to a beginner.
     */
    blocks.push({
      kind: 'scene',
      id: `sc-intro-${station.id}`,
      titleFa: station.intro.textFa,
      bodyFa: '',
      conversationRef: station.intro.conversationRef,
    } as TeachingBlock);
  }
  station.steps.forEach((step) => {
    if (step.card?.lineRef) lineRefs.add(step.card.lineRef);
    // REBUILD-02: the listening flow's predict/verify steps lower to the
    // EXISTING dialogue-player block (its prediction spec + transcript reveal)
    // instead of a passive scene — keeps PASSIVE-RUN honest on anchor decks.
    if (step.interaction && step.goal === 'predict') {
      const it = step.interaction;
      blocks.push({
        kind: 'dialogue-player',
        id: `dp-${step.id}`,
        focusLineRefs: step.card?.lineRef ? [step.card.lineRef] : [],
        prediction: {
          questionFa: it.promptFa,
          options: (it.options ?? []).map((o) => ({ id: o.id, label: o.ja ?? o.label })),
          correctOptionId: typeof it.correct === 'string' ? it.correct : undefined,
          revealFa: it.feedbackWrongFa ?? 'پس از شنیدن مقایسه کن.',
        },
      } as TeachingBlock);
      return;
    }
    if (!step.interaction && step.goal === 'verify') {
      blocks.push({
        kind: 'dialogue-player',
        id: `dp-${step.id}`,
        focusLineRefs: step.card?.lineRef ? [step.card.lineRef] : [],
      } as TeachingBlock);
      return;
    }
    if (step.interaction) {
      const { block, exercise } = compileInteraction(chapter, station, step, order, findings);
      blocks.push(block);
      exercises.push(exercise);
      if (step.card?.textFa || step.card?.textJa) blocks.push(displayBlock(step, chapter));
    } else {
      blocks.push(displayBlock(step, chapter));
    }
  });

  const minutes = Math.max(3, Math.min(15, Math.round(station.steps.length * 0.75)));
  const compiled: Station = {
    slug: station.id,
    type:
      station.type === 'review'
        ? 'review'
        : station.type === 'practice'
          ? 'practice'
          : mapDomainToStationType(station.domain),
    titleFa: station.intro?.textFa?.slice(0, 60) ?? station.objectiveFa.slice(0, 60),
    objectiveFa: station.objectiveFa,
    core: !station.id.startsWith('stn-opt'),
    order,
    prerequisites: station.prerequisites,
    lineRefs: [...lineRefs],
    objectiveCode: `OBJ-${chapter.id.toUpperCase()}-${order}`,
    teachesConcepts: station.steps.map((s) => `${chapter.id}:${station.id}:${s.goal}`),
    estMinutes: minutes,
    estLoad: minutes > 10 ? 'heavy' : minutes > 6 ? 'medium' : 'light',
    completion: (station.completion.kind === 'exercise_threshold'
      ? { kind: 'exercise_threshold', threshold: station.completion.threshold ?? 0.7 }
      : station.completion) as CompletionCriteria,
    mastery: { threshold: 0.7 },
    blocks,
    fsrsItems: station.fsrsItems,
  };
  return { station: compiled, exercises };
}

function mapDomainToStationType(domain: EngineStation['domain']): Station['type'] {
  switch (domain) {
    case 'anchor':
      return 'anchor';
    case 'vocab':
      return 'vocab';
    case 'grammar':
      return 'grammar';
    case 'kana':
      return 'kana';
    case 'listening':
      return 'listen';
    case 'practice':
      return 'practice';
    case 'review':
      return 'review';
    case 'writing':
      return 'integrate';
    default:
      return 'structure';
  }
}

/**
 * Compile the whole draft chapter into the runtime Chapter shape. Findings
 * include compile-level notes (soft) — a draft that produces ANY compile throw
 * is not compilable and must be fixed before publish.
 */
export function compileEngineChapter(draft: EngineChapter): CompileResult {
  const findings: ValidatorFinding[] = [];

  // REBUILD-02: the draft may REUSE an existing runtime dialogue asset — line
  // ids then live under that slug (s-<dialogueSlug>-lN), not the chapter slug.
  const dialogueSlug = draft.runtimeDialogueSlug ?? draft.id;
  const lineId = (n: number) => `s-${dialogueSlug}-l${n}`;

  const words: VocabItem[] = draft.vocabulary.map((v) => ({
    id: v.id,
    term: v.surface,
    readingKana: v.reading,
    romaji: v.romaji ?? v.reading.toLowerCase(),
    meaningFa: v.meaningFa,
    // the word as it appears in its source line — drafts carry the surface (the
    // agent refines during dialogue YAML authoring; vocab-card EQA-6 re-checks)
    surfaceInLine: v.surface,
    noteFa: v.flags.length > 0 ? `پرچم‌ها: ${v.flags.join(', ')}` : undefined,
    lineRef:
      v.dialogueLineIndex !== undefined && draft.dialogue[v.dialogueLineIndex] ? lineId(v.dialogueLineIndex + 1) : '',
    fsrs: { w: `w-${v.id}`, s: `s-${v.id}` },
  }));

  const grammar: GrammarCluster[] = draft.grammar.map((g) => ({
    id: g.id,
    pattern: g.patternJa,
    titleFa: g.functionFa,
    lineRefs: [lineId(1)],
    fsrs: { gr: `gr-${g.id}` },
  }));

  // REBUILD-02: formulaic expressions → the runtime six-column ExpressionItem.
  const expressions: ExpressionItem[] = draft.expressions.map((e) => ({
    id: e.id,
    ja: e.ja,
    reading: e.reading,
    functionFa: e.functionFa,
    formalityFa: e.formalityFa,
    replyFa: e.replyFa,
    lineRef: e.lineRef ?? lineId(1),
    fsrs: { chrk: `chrk-${e.id}` },
  }));

  let order = 0;
  const stations: Station[] = [];
  const allExercises: Record<string, Exercise> = {};
  draft.stations.forEach((station) => {
    const { station: compiled, exercises } = compileStation(draft, dialogueSlug, station, order, findings);
    order += 1;
    stations.push(compiled);
    exercises.forEach((e) => {
      allExercises[e.id] = e;
    });
  });

  // REBUILD-02: the mastery bank compiles to mastery_* exercises OUTSIDE walk
  // blocks (product rule MASTERY-POOL) — the assessment page consumes them via
  // the chapter mastery bank (weights/weakPointMap/labels).
  const weakPointMap: Record<string, string[]> = {};
  const measureLabels: Partial<Record<'M1' | 'M2' | 'M3' | 'M4' | 'M5', string>> = {};
  draft.masteryBank.forEach((m) => {
    const exercise: Exercise = {
      id: m.id,
      type: m.type === 'listen_choose' ? 'audio-meaning' : m.type === 'judge' ? 'response-select' : 'meaning-select',
      targetSkill: m.targetSkill,
      targetConcept: `${draft.id}:mastery:${m.measure}`,
      assessesConcepts: [],
      lineRef: m.lineRef,
      difficulty: 2,
      promptFa: m.promptFa,
      promptJa: m.promptJa,
      audioLineRef: m.lineRef,
      options: m.options.map((o) => ({ id: o.id, label: o.ja ?? o.label })),
      correctOptionId: m.correctOptionId,
      distractorRationaleFa: undefined,
      feedback: {
        f1Fa: m.hints?.[0] ?? m.feedbackWrongFa ?? 'با یادآور محتوایی یک بار دیگر تلاش کن.',
        f2HintFa: m.hints?.[1] ?? m.feedbackWrongFa ?? 'با یادآور محتوایی دوباره تلاش کن.',
        f3ExplainFa: m.hints?.[2] ?? m.feedbackWrongFa ?? 'توضیح با مثال حل‌شده در ایستگاه بازگشت.',
      },
      assessmentRole: `mastery_${m.measure}`,
    };
    allExercises[m.id] = exercise;
    measureLabels[m.measure] = m.measureLabelFa;
    if (m.returnStationId) {
      const acc = weakPointMap[m.measure] ?? [];
      if (!acc.includes(m.returnStationId)) acc.push(m.returnStationId);
      weakPointMap[m.measure] = acc;
    }
  });

  const units: ChapterUnit[] = draft.lessons.map((l) => ({
    slug: l.id,
    titleFa: l.microObjectiveFa.slice(0, 80),
    summaryFa: l.skillLinkFa,
    stationSlugs: l.stationIds,
  }));

  // EST-MINUTES honesty (HANASO-21): the declared chapter total equals the
  // station sum — never an independent number.
  const estMinutes = stations.reduce((acc, st) => acc + st.estMinutes, 0);

  const chapter: Chapter = {
    slug: draft.id,
    levelCode:
      draft.level === 'H0'
        ? 'L1'
        : draft.level === 'H1'
          ? 'L2'
          : draft.level === 'H2'
            ? 'L3'
            : draft.level === 'H3'
              ? 'L4'
              : 'L5',
    titleFa: draft.titleFa,
    canDoFa: draft.canDoFa,
    summaryFa: `draft از جزوهٔ N5 درس ${draft.bookletLesson} — ${draft.bookletSourceFile}`,
    dialogueSlug,
    orderInLevel: draft.bookletLesson,
    estMinutes,
    estLoad: estMinutes > 60 ? 'heavy' : estMinutes > 45 ? 'medium' : 'light',
    sceneFa: draft.dialogue[0]?.fa ?? '',
    words,
    grammar,
    expressions,
    stations,
    exercises: allExercises,
    mastery: {
      weights: { M1: 0.2, M2: 0.2, M3: 0.2, M4: 0.2, M5: 0.2 },
      weakPointMap,
      measureLabelsFa: measureLabels,
    } as Chapter['mastery'],
    units,
    prerequisiteChapterSlug: draft.prerequisiteChapterSlug,
  };

  findings.push({
    rule: 'C-DIALOGUE',
    severity: 'soft',
    message: draft.runtimeDialogueSlug
      ? `مکالمهٔ runtime بازاستفاده شد: ${draft.runtimeDialogueSlug} (صوت و cast همان دارایی موجود).`
      : 'مکالمهٔ draft به YAML مکالمهٔ runtime منتقل نشده — انتشار نیازمند ساخت dialogue YAML + صوت است (ماژول dialogue دست‌نخورده).',
    location: 'chapter.dialogue',
  });
  return { chapter, findings };
}

/** The practice-station item budget the compiler enforces for practice stations (info). */
export const PRACTICE_BUDGET = ENGINE_CONFIG.practiceItems;
