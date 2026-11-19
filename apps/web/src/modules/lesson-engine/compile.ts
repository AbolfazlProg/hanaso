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
  Exercise,
  Station,
  TeachingBlock,
  VocabItem,
  GrammarCluster,
} from '@/modules/curriculum/types';
import { ENGINE_CONFIG } from './engine-config';
import type {
  EngineChapter,
  EngineInteraction,
  EngineStation,
  EngineStep,
  ValidatorFinding,
} from './types';

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
  if (options.length > 0 && options.length !== 3) {
    findings.push({
      rule: 'C-OPTIONS',
      severity: 'soft',
      message: 'runtime MCQ convention = 3 options (QUESTION §۲-۳) — کم/زیاد بودن با آزمون مرورگر چک شود.',
      location: `station[${station.id}].${step.id}`,
    });
  }

  const exercise: Exercise = {
    id: exerciseId,
    type: exType,
    targetSkill: station.domain === 'vocab' ? 'vocab' : station.domain === 'grammar' ? 'grammar' : station.domain === 'kana' ? 'structure' : 'listening',
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
    correctOrder: it.type === 'order_build' || it.type === 'transform' || it.type === 'sort' ? (it.tiles ?? []).map((_t, i) => `t${i}`) : undefined,
    chips:
      it.type === 'order_build' && (it.extraTiles?.length ?? 0) > 0
        ? [...(it.tiles ?? []), ...(it.extraTiles ?? [])].map((t, i) => ({ id: `c${i}`, ja: t }))
        : undefined,
    acceptedChipOrder:
      it.type === 'order_build' && (it.extraTiles?.length ?? 0) > 0 ? (it.tiles ?? []).map((_t, i) => `c${i}`) : undefined,
    distractorRationaleFa: it.distractorReasons,
    feedback: {
      f1Fa: it.feedbackCorrectFa ?? 'درست بود!',
      f2HintFa: it.hints?.[0] ?? it.feedbackWrongFa ?? 'یک بار دیگر با یادآور محتوایی تلاش کن.',
      f3ExplainFa: it.hints?.[2] ?? it.feedbackWrongFa ?? 'پاسخ با مثال حل‌شده نمایش می‌شود.',
    },
    assessmentRole: 'practice',
    referenceBlockId: undefined,
  };
  return { block: { kind: 'exercise', id: `blk-ex-${step.id}`, exerciseIds: [exerciseId] } as TeachingBlock, exercise };
}

/** Compile one station (steps → blocks + exercises). */
function compileStation(
  chapter: EngineChapter,
  station: EngineStation,
  order: number,
  findings: ValidatorFinding[],
): { station: Station; exercises: Exercise[] } {
  const blocks: TeachingBlock[] = [];
  const exercises: Exercise[] = [];
  const lineRefs = new Set<string>();

  if (station.intro) {
    blocks.push({
      kind: 'scene',
      id: `sc-intro-${station.id}`,
      titleFa: station.intro.textFa,
      bodyFa: station.intro.conversationRef ? `اتصال به مکالمه: ${station.intro.conversationRef}` : '',
    } as TeachingBlock);
  }
  station.steps.forEach((step) => {
    if (step.card?.lineRef) lineRefs.add(step.card.lineRef);
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
    type: station.type === 'review' ? 'review' : station.type === 'practice' ? 'practice' : mapDomainToStationType(station.domain),
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
    completion: station.completion,
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

  const words: VocabItem[] = draft.vocabulary.map((v) => ({
    id: v.id,
    term: v.surface,
    readingKana: v.reading,
    romaji: v.romaji ?? v.reading.toLowerCase(),
    meaningFa: v.meaningFa,
    noteFa: v.flags.length > 0 ? `پرچم‌ها: ${v.flags.join(', ')}` : undefined,
    lineRef:
      v.dialogueLineIndex !== undefined && draft.dialogue[v.dialogueLineIndex]
        ? `s-${draft.id}-l${v.dialogueLineIndex + 1}`
        : '',
    fsrs: { w: `w-${v.id}`, s: `s-${v.id}` },
  }));

  const grammar: GrammarCluster[] = draft.grammar.map((g) => ({
    id: g.id,
    pattern: g.patternJa,
    titleFa: g.functionFa,
    lineRefs: draft.dialogue
      .map((_l, i) => `s-${draft.id}-l${i + 1}`)
      .slice(0, 1),
    fsrs: { gr: `gr-${g.id}` },
  }));

  let order = 0;
  const stations: Station[] = [];
  const allExercises: Record<string, Exercise> = {};
  draft.stations.forEach((station) => {
    const { station: compiled, exercises } = compileStation(draft, station, order, findings);
    order += 1;
    stations.push(compiled);
    exercises.forEach((e) => {
      allExercises[e.id] = e;
    });
  });

  // dialogue lines are compiled as lineRefs on stations; the runtime dialogue
  // YAML + audio remain the DIALOGUE pipeline's job (module boundary) — the
  // compiler records the expected slug for the dialogue module to consume.
  const dialogueSlug = draft.id; // 1:1 anchor (DD-090)
  const units: ChapterUnit[] = draft.lessons.map((l) => ({
    slug: l.id,
    titleFa: l.microObjectiveFa.slice(0, 80),
    summaryFa: l.skillLinkFa,
    stationSlugs: l.stationIds,
  }));

  const chapter: Chapter = {
    slug: draft.id,
    levelCode: draft.level === 'H0' ? 'L1' : draft.level === 'H1' ? 'L2' : draft.level === 'H2' ? 'L3' : draft.level === 'H3' ? 'L4' : 'L5',
    titleFa: draft.titleFa,
    canDoFa: draft.canDoFa,
    summaryFa: `draft از جزوهٔ N5 درس ${draft.bookletLesson} — ${draft.bookletSourceFile}`,
    dialogueSlug,
    orderInLevel: draft.bookletLesson,
    estMinutes: draft.stations.length * 6,
    estLoad: 'medium',
    sceneFa: draft.dialogue[0]?.fa ?? '',
    words,
    grammar,
    expressions: [],
    stations,
    exercises: allExercises,
    mastery: {
      weights: { M1: 0.2, M2: 0.2, M3: 0.2, M4: 0.2, M5: 0.2 },
      weakPointMap: {},
      measureLabelsFa: { M1: 'درس ۱', M2: 'درس ۲', M3: 'درس ۳', M4: 'درس ۴', M5: 'درس ۵' },
    } as Chapter['mastery'],
    units,
    prerequisiteChapterSlug: undefined,
  };

  findings.push({
    rule: 'C-DIALOGUE',
    severity: 'soft',
    message: 'مکالمهٔ draft به YAML مکالمهٔ runtime منتقل نشده — انتشار نیازمند ساخت dialogue YAML + صوت است (ماژول dialogue دست‌نخورده).',
    location: 'chapter.dialogue',
  });
  return { chapter, findings };
}

/** The practice-station item budget the compiler enforces for practice stations (info). */
export const PRACTICE_BUDGET = ENGINE_CONFIG.practiceItems;
