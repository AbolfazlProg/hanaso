/**
 * HANASO — Content validation (TASK-LEARNING-01) — PURE module.
 *
 * CI-able rules over a Chapter's DATA — the encoding of the KB design rules that
 * must hold for EVERY chapter (island S1..S3/O1..O5 + QUESTION quality rules +
 * L2 caps from LEVEL_MATRIX). Run in unit tests over every bundled chapter and
 * over the seeded DB rows (integration).
 *
 * Each rule id maps to its KB source; a failing rule = the chapter cannot ship.
 */
import type { Chapter, Exercise, LevelPolicy, TeachingBlock } from './types';
import { orderedStations } from './journey';
import { KANA_ITEMS, KANA_ITEMS_BY_ID } from './content/kana-items';
import { RULE_MARK_STATION, decomposeJa, type RuleMark } from './glyph-budget';

export interface ContentViolation {
  rule: string;
  message: string;
}

const RULES = {
  vocabCap: 'L2-VOCAB-CAP (LEVEL_MATRIX §۲ / DD-091)',
  grammarCap: 'L2-GRAMMAR-CAP (LEVEL_MATRIX §۲ / DD-091)',
  stationCap: 'STATION-CAP (island S3 — hard max with registered exception)',
  stationFloor: 'STATION-FLOOR (island S3 — main path needs ≥5)',
  oneObjective: 'ONE-OBJECTIVE (island S1 — exactly one objectiveCode per station)',
  lineRefs: 'LINE-REFS (CONTENT-080 — knowledge stations anchor to dialogue lines)',
  prereqOrder: 'PREREQ-ORDER (island O1 — prerequisites precede dependents)',
  duplicateSlug: 'SLUG-UNIQUE',
  optionalNoGate: 'OPTIONAL-NO-GATE (island §۷-۱ — optional never a prerequisite of core)',
  mcqThree: 'MCQ-THREE (QUESTION §۲-۳ — exactly 3 options; minimal-pair 2 allowed)',
  feedbackLadder: 'FEEDBACK-LADDER (QUESTION §۴ — F1/F2/F3 copy required)',
  answerShape: 'ANSWER-SHAPE (QUESTION §۵ — per-type answer + acceptance fields)',
  masteryPool: 'MASTERY-POOL (QUESTION §۵-۱ — mastery items never in practice blocks)',
  masterySwitches: 'MASTERY-SWITCHES (QUESTION §۵-۲ — ≥2 items per measure)',
  gateThreshold: 'GATE-THRESHOLD (level caps — chapter gate must match level policy)',
  exerciseAnchored: 'EXERCISE-ANCHORED (CONTENT-085 — non-production exercises carry lineRef/audioLineRef)',
  weightsSum: 'WEIGHTS-SUM (dialogue-mastery-model §۱ — weights sum to 1)',
  kanaRegistry: 'KANA-REGISTRY (CONTENT-106 — every kana-card kanaId exists in the registry)',
  kanaDecodable: 'KANA-DECODABLE (CONTENT-105 — kana text is decodable with glyphs taught by that point)',
  kanaUnitPacket: 'KANA-PACKET (CONTENT-103 — a kana unit teaches exactly one full row/ん/one rule)',
  /*
   * TASK-LEARNING-13 (progress audit A-4/A-5): id uniqueness gates. Both bugs
   * shipped to production silently — 16 stations carried a duplicated listening
   * block (same id twice → React duplicate keys + stepOfBlock ambiguity + the
   * same 5 questions answered twice) and the kana bank carried 80 exercise ids
   * with TWO different definitions (Object.fromEntries silently kept the last —
   * edits to the shadowed copies were no-ops). Load-time fail-fast from now on.
   */
  blockIdUnique: 'BLOCK-ID-UNIQUE (TL-13 A-4 — block ids unique within a station)',
  exerciseIdUnique: 'EXERCISE-ID-UNIQUE (TL-13 A-5 — exercise ids unique in the bank)',
  /*
   * TASK-LEARNING-14 — the golden rule made mechanical: «no question or example
   * may depend on untaught knowledge». The TL-13 audit proved the old
   * CONTENT-105 scope (kana-decode promptJa + reading examples only) let
   * untaught glyphs ship inside rule-card tables, option labels and slide words
   * (U1-U3). These gates check EVERY kana surface of the kana chapter.
   */
  glyphBudget: 'GLYPH-BUDGET (TL-14 — every kana surface uses only taught glyphs + taught rule marks)',
  transcriptConsistent: 'TRANSCRIPT-CONSISTENT (TL-14 — one Persian reading per word, chapter-wide)',
  ruleListeningShape: 'RULE-LISTENING-SHAPE (TL-14 — minimal-pair listening carries exactly 2 options)',
  passiveRun: 'PASSIVE-RUN (TL-14 — at most 2 consecutive receptive slides in a deck)',
  prereqData: 'PREREQ-DATA (TL-14 — rule-deck stations declare introducesGlyphs)',
} as const;

/** Validate one chapter against its level policy. Returns [] when shippable. */
export function validateChapter(chapter: Chapter, level: LevelPolicy): ContentViolation[] {
  const v: ContentViolation[] = [];
  const lineIds = new Set(chapterStationsLines(chapter));

  /* ---- vocab / grammar caps ---- */
  if (chapter.words.length < level.caps.vocabCore[0] || chapter.words.length > level.caps.vocabCore[1]) {
    v.push({
      rule: RULES.vocabCap,
      message: `${chapter.slug}: ${chapter.words.length} core words — cap [${level.caps.vocabCore.join('..')}]`,
    });
  }
  if (
    chapter.grammar.length < level.caps.grammarClusters[0] ||
    chapter.grammar.length > level.caps.grammarClusters[1]
  ) {
    v.push({
      rule: RULES.grammarCap,
      message: `${chapter.slug}: ${chapter.grammar.length} grammar clusters — cap [${level.caps.grammarClusters.join('..')}]`,
    });
  }

  /* ---- station counts (core) ---- */
  const core = chapter.stations.filter((s) => s.core);
  const [target, hardMax] = level.caps.stationsCore;
  if (core.length < 5) {
    v.push({ rule: RULES.stationFloor, message: `${chapter.slug}: ${core.length} core stations < 5` });
  }
  if (core.length > hardMax) {
    v.push({
      rule: RULES.stationCap,
      message: `${chapter.slug}: ${core.length} core stations > hard max ${hardMax}`,
    });
  }
  if (core.length > target) {
    // Over target but within hard max = the registered 25'-edge exception (S3) — must be documented.
    if (chapter.estMinutes > level.caps.chapterMinutes[1]) {
      v.push({
        rule: RULES.stationCap,
        message: `${chapter.slug}: ${core.length} stations > target ${target} AND est ${chapter.estMinutes}' > cap ${level.caps.chapterMinutes[1]}'`,
      });
    }
  }

  /* ---- slugs unique ---- */
  const slugs = new Set<string>();
  for (const s of chapter.stations) {
    if (slugs.has(s.slug)) v.push({ rule: RULES.duplicateSlug, message: `duplicate station slug ${s.slug}` });
    slugs.add(s.slug);
  }

  /* ---- per-station rules ---- */
  const byslug = new Map(chapter.stations.map((s) => [s.slug, s]));
  for (const s of chapter.stations) {
    // one objective code per station (S1)
    if (!s.objectiveCode) {
      v.push({ rule: RULES.oneObjective, message: `${s.slug}: missing objectiveCode` });
    }
    // knowledge stations must anchor to dialogue lines (anchor/practice/integrate may differ)
    const needsLines = ['vocab', 'grammar', 'structure', 'expression', 'listen'].includes(s.type);
    if (needsLines && s.lineRefs.length === 0) {
      v.push({ rule: RULES.lineRefs, message: `${s.slug} (${s.type}): no lineRefs` });
    }
    for (const ref of s.lineRefs) {
      if (!lineIds.has(ref)) {
        v.push({ rule: RULES.lineRefs, message: `${s.slug}: unknown line ref ${ref}` });
      }
    }
    // prerequisites must exist + precede (topological)
    for (const ref of s.prerequisites) {
      const p = byslug.get(ref);
      if (!p) {
        v.push({ rule: RULES.prereqOrder, message: `${s.slug}: unknown prerequisite ${ref}` });
      } else if (p.order >= s.order) {
        v.push({
          rule: RULES.prereqOrder,
          message: `${s.slug}: prerequisite ${ref} has order ${p.order} >= ${s.order}`,
        });
      }
    }
    // TL-13 (A-4): block ids unique within the station — walk anchors
    // (resume / return-to-teaching / skip panels) address blocks BY id.
    const blockIds = new Set<string>();
    for (const b of s.blocks) {
      if (blockIds.has(b.id)) {
        v.push({ rule: RULES.blockIdUnique, message: `${s.slug}: duplicate block id ${b.id}` });
      }
      blockIds.add(b.id);
    }
  }

  /* ---- optional stations never gate core (island §۷-۱) ---- */
  const optionalSlugs = new Set(chapter.stations.filter((s) => !s.core).map((s) => s.slug));
  for (const s of chapter.stations.filter((x) => x.core)) {
    for (const ref of s.prerequisites) {
      if (optionalSlugs.has(ref)) {
        v.push({ rule: RULES.optionalNoGate, message: `core ${s.slug} depends on optional ${ref}` });
      }
    }
  }

  /* ---- topological walk covers everything ---- */
  const ordered = orderedStations(chapter);
  if (ordered.length !== chapter.stations.length) {
    v.push({
      rule: RULES.prereqOrder,
      message: `journey resolver dropped stations (${ordered.length}/${chapter.stations.length})`,
    });
  }

  /* ---- exercise rules ---- */
  const practiceIdsInBlocks = new Set<string>();
  for (const s of chapter.stations) {
    for (const block of s.blocks) {
      if (block.kind === 'exercise') block.exerciseIds.forEach((id) => practiceIdsInBlocks.add(id));
    }
  }
  for (const ex of Object.values(chapter.exercises)) {
    validateExercise(ex, practiceIdsInBlocks, lineIds, chapter.slug, v);
  }

  /* ---- TASK-LEARNING-06: kana rules (CONTENT-103/105/106, machine-checkable core) ---- */
  validateKanaContent(chapter, v);

  /* ---- TASK-LEARNING-14: rule-teaching golden-rule gates (kana chapter) ---- */
  validateRuleTeaching(chapter, v);

  /* ---- mastery pool wiring ---- */
  for (const id of practiceIdsInBlocks) {
    const ex = chapter.exercises[id];
    if (ex && ex.assessmentRole !== 'practice') {
      v.push({
        rule: RULES.masteryPool,
        message: `station block references ${id} with role ${ex.assessmentRole} (practice pool only)`,
      });
    }
  }
  for (const measure of ['M1', 'M2', 'M3', 'M4', 'M5'] as const) {
    const count = Object.values(chapter.exercises).filter((e) => e.assessmentRole === `mastery_${measure}`).length;
    if (count < 2) {
      v.push({ rule: RULES.masterySwitches, message: `mastery bank ${measure}: ${count} switches (<2)` });
    }
  }

  /* ---- gate + weights ---- */
  const weightSum = Object.values(chapter.mastery.weights).reduce((a, b) => a + b, 0);
  if (Math.abs(weightSum - 1) > 1e-9) {
    v.push({ rule: RULES.weightsSum, message: `weights sum ${weightSum} ≠ 1` });
  }
  // TASK-LEARNING-04 (#110 / EQA-7): the old hardcoded L2 gate check (expectedGate
  // = 0.7) is gone. Gate thresholds now flow from level_policy into the mastery
  // path by construction (gradeMasterySubmission injects them); policy sanity
  // (bounds, escalation, level existence) is enforced by EQA-7 in modules/curriculum/eqa.
  for (const [measure, stationSlugs] of Object.entries(chapter.mastery.weakPointMap)) {
    for (const stationSlug of stationSlugs) {
      if (!byslug.has(stationSlug)) {
        v.push({ rule: RULES.gateThreshold, message: `weakPointMap ${measure} → unknown station ${stationSlug}` });
      }
    }
  }

  return v;
}

function chapterStationsLines(chapter: Chapter): Set<string> {
  // Dialogue line ids are validated lazily against the loaded dialogue (server-side
  // `validateChapterAgainstDialogue`); here we collect refs from a helper the caller
  // provides via chapter.lineUniverse when available.
  return (
    (chapter as Chapter & { lineUniverse?: Set<string> }).lineUniverse ??
    new Set(chapter.stations.flatMap((s) => s.lineRefs))
  );
}

function validateExercise(
  ex: Exercise,
  practiceIdsInBlocks: Set<string>,
  lineIds: Set<string>,
  slug: string,
  v: ContentViolation[],
): void {
  const usesOptions = [
    'meaning-select',
    'audio-meaning',
    'response-select',
    'cloze',
    'gist-select',
    'match-in-line',
    'speaker-identify',
    'listen-minimal-pair',
    // TASK-LEARNING-06: kana shapes are option-based.
    'kana-recognition',
    'kana-recall',
    'kana-decode',
    // TASK-LEARNING-14: minimal-pair word listening (2 options — the pair).
    'rule-listening',
  ].includes(ex.type);
  if (usesOptions) {
    const count = ex.options?.length ?? 0;
    const allowed = ex.type === 'listen-minimal-pair' ? [2, 3] : ex.type === 'rule-listening' ? [2] : [3];
    if (!allowed.includes(count)) {
      v.push({ rule: RULES.mcqThree, message: `${slug}/${ex.id}: ${count} options (allowed ${allowed.join('/')})` });
    }
    if (!ex.correctOptionId || !ex.options?.some((o) => o.id === ex.correctOptionId)) {
      v.push({ rule: RULES.answerShape, message: `${slug}/${ex.id}: missing/invalid correctOptionId` });
    }
  }
  if (ex.type === 'word-order' || ex.type === 'dialogue-order') {
    if (!ex.correctOrder?.length || ex.correctOrder.length !== (ex.chunks?.length ?? 0)) {
      v.push({ rule: RULES.answerShape, message: `${slug}/${ex.id}: correctOrder must match chunks` });
    }
  }
  if (ex.type === 'produce-template') {
    if (!ex.acceptedChipOrder?.length || ex.acceptedChipOrder.length !== (ex.chips?.length ?? 0)) {
      v.push({ rule: RULES.answerShape, message: `${slug}/${ex.id}: acceptedChipOrder must match chips` });
    }
  }
  if (!ex.feedback?.f1Fa || !ex.feedback?.f2HintFa || !ex.feedback?.f3ExplainFa) {
    v.push({ rule: RULES.feedbackLadder, message: `${slug}/${ex.id}: feedback ladder copy incomplete` });
  }
  if (ex.assessmentRole === 'practice' && !practiceIdsInBlocks.has(ex.id)) {
    // practice items must be reachable from some station block (dead content = bug)
    v.push({ rule: RULES.masteryPool, message: `${slug}/${ex.id}: practice item not referenced by any station block` });
  }
  if (ex.lineRef && lineIds.size > 0 && !lineIds.has(ex.lineRef) && ex.lineRef.startsWith('s-')) {
    v.push({ rule: RULES.exerciseAnchored, message: `${slug}/${ex.id}: unknown lineRef ${ex.lineRef}` });
  }
}

/**
 * Server-side check against the LOADED dialogue: every station lineRef + exercise
 * lineRef must exist in the anchor dialogue, and the dialogue line count must fit
 * the level band. (Pure — receives the dialogue's line ids.)
 */
export function validateChapterAgainstDialogue(
  chapter: Chapter,
  level: LevelPolicy,
  dialogueLineIds: string[],
): ContentViolation[] {
  const v: ContentViolation[] = [];
  const ids = new Set(dialogueLineIds);
  if (dialogueLineIds.length < level.caps.dialogueLines[0] || dialogueLineIds.length > level.caps.dialogueLines[1]) {
    v.push({
      rule: 'DIALOGUE-LINES (LEVEL_MATRIX §۲)',
      message: `${chapter.slug}: ${dialogueLineIds.length} lines — band [${level.caps.dialogueLines.join('..')}]`,
    });
  }
  for (const s of chapter.stations) {
    for (const ref of s.lineRefs) {
      if (!ids.has(ref)) {
        v.push({ rule: RULES.lineRefs, message: `${s.slug}: line ${ref} not in dialogue ${chapter.dialogueSlug}` });
      }
    }
  }
  for (const ex of Object.values(chapter.exercises)) {
    for (const ref of [ex.lineRef, ex.audioLineRef]) {
      if (ref && !ids.has(ref)) {
        v.push({ rule: RULES.exerciseAnchored, message: `${ex.id}: line ${ref} not in dialogue` });
      }
    }
  }
  // word lineRefs must exist too
  for (const w of chapter.words) {
    if (!ids.has(w.lineRef)) {
      v.push({ rule: RULES.lineRefs, message: `word ${w.id}: line ${w.lineRef} not in dialogue` });
    }
  }
  return v;
}

/**
 * TASK-LEARNING-06 — kana-specific content rules (05A checklist §۲ — the
 * machine-checkable core of CONTENT-103/105/106):
 *
 * - CONTENT-106: every kana-card's kanaId exists in the KANA_ITEMS registry.
 * - CONTENT-105: every kana-decode promptJa and every reading-moment example ja
 *   is decodable — all its kana glyphs are taught by kana-cards at order ≤ the
 *   station that carries the exercise/example (the decoding-engine guarantee,
 *   reproduced over the shipped glyph set).
 * - CONTENT-103 (light): a kana station's kana-cards carry ≥1 and ≤6 glyphs
 *   (a full row/ん/small rows — broken packets are rejected).
 */
function validateKanaContent(chapter: Chapter, v: ContentViolation[]): void {
  const hasKanaCards = chapter.stations.some((s) => s.blocks.some((b) => b.kind === 'kana-card'));
  if (!hasKanaCards) return; // non-kana chapters: nothing to check

  // cumulative glyph set by station order — a station's own introducesGlyphs
  // (TL-14 first-look declarations) are available to that station from its
  // position onward, exactly like its kana-cards.
  const ordered = [...chapter.stations].sort((a, b) => a.order - b.order);
  const cumulative = new Set<string>();
  const cumulativeBySlug = new Map<string, Set<string>>();
  for (const s of ordered) {
    for (const b of s.blocks) {
      if (b.kind === 'kana-card') {
        const item = KANA_ITEMS_BY_ID[b.kanaId];
        if (!item) {
          v.push({
            rule: RULES.kanaRegistry,
            message: `${s.slug}: kana-card references unknown kanaId ${b.kanaId} (registry has no such record — CONTENT-106)`,
          });
          continue;
        }
        cumulative.add(item.glyph);
      }
    }
    for (const g of s.introducesGlyphs ?? []) cumulative.add(g);
    cumulativeBySlug.set(s.slug, new Set(cumulative));
  }

  // Only BASE glyphs (the 92 registry records) are card-taught and checkable here.
  // Rule-derived forms — precomposed dakuten/handakuten (が/パ…), small kana
  // (っ/ゃ/ェ…), and the chōonpu — are taught by RULE units (05A §۲: a rule is one
  // unit, not per-glyph cards); their coverage is the unit design itself, which
  // the decodability engine guaranteed upstream (WP-0 package).
  const BASE_GLYPHS = new Set(KANA_ITEMS.map((k) => k.glyph));
  const kanaOf = (text: string): string[] => [...text].filter((ch) => BASE_GLYPHS.has(ch));

  for (const s of ordered) {
    const taught = cumulativeBySlug.get(s.slug) ?? new Set<string>();
    // CONTENT-103 (light): a kana station carries either glyph cards (row units,
    // 1–6) or a rule card (rule units — H4/H5/H6/H13/K8/K12 teach a RULE, not
    // new glyphs). Neither = not a kana unit.
    const glyphCards = s.blocks.filter((b) => b.kind === 'kana-card').length;
    const hasRuleCard = s.blocks.some((b) => b.kind === 'rule-card');
    if (s.type === 'kana' && ((glyphCards === 0 && !hasRuleCard) || glyphCards > 6)) {
      v.push({
        rule: RULES.kanaUnitPacket,
        message: `${s.slug}: ${glyphCards} kana-card block(s) — a kana unit carries one full row (1–6 cards) or exactly one rule (rule-card, CONTENT-103)`,
      });
    }
    // CONTENT-105: decode prompts + reading moments decodable
    for (const b of s.blocks) {
      if (b.kind === 'exercise') {
        for (const id of b.exerciseIds) {
          const ex = chapter.exercises[id];
          if (ex?.type === 'kana-decode' && ex.promptJa) {
            const unknown = kanaOf(ex.promptJa).filter((g) => !taught.has(g));
            if (unknown.length > 0) {
              v.push({
                rule: RULES.kanaDecodable,
                message: `${s.slug}/${ex.id}: promptJa uses untaught glyph(s) ${unknown.join('')} (CONTENT-105 — decoding engine guarantee)`,
              });
            }
          }
        }
      }
      if (b.kind === 'example-set') {
        for (const ex of b.examples) {
          if (ex.role === 'reading') {
            const unknown = kanaOf(ex.ja).filter((g) => !taught.has(g));
            if (unknown.length > 0) {
              v.push({
                rule: RULES.kanaDecodable,
                message: `${s.slug}/${ex.id}: reading-moment word ${ex.ja} uses untaught glyph(s) ${unknown.join('')} (CONTENT-105)`,
              });
            }
          }
        }
      }
    }
  }
}

/**
 * TASK-LEARNING-14 — the rule-teaching golden-rule gates (kana chapter only —
 * the same scope guard as validateKanaContent):
 *
 * - GLYPH-BUDGET: EVERY kana surface of every station (rule-card patternJa +
 *   table cells, ALL example roles, exercise promptJa/options/cloze/chips, and
 *   the new rule-prereq/rule-contrast/rule-step surfaces) decomposes into base
 *   glyphs taught by then (cumulative ∪ the station's introducesGlyphs) + rule
 *   marks (dakuten/handakuten/small-kana/sokuon/chōonpu) whose TEACHING unit
 *   has order ≤ this station. Foreign smalls (ファ/ティ/ヴ) are wave-2 — any
 *   use today is a violation.
 * - TRANSCRIPT-CONSISTENT: one Persian reading per Japanese word, chapter-wide
 *   (catches the H4 audit's کووکوو↔کوکو drift between example and exercise).
 * - PREREQ-DATA: rule-deck stations declare introducesGlyphs (even []).
 * - PASSIVE-RUN: at most 2 consecutive receptive slides in a station deck.
 */
function validateRuleTeaching(chapter: Chapter, v: ContentViolation[]): void {
  const hasKanaCards = chapter.stations.some((s) => s.blocks.some((b) => b.kind === 'kana-card'));
  if (!hasKanaCards) return; // non-kana chapters: glyph teaching is the kana chapter's contract

  const ordered = [...chapter.stations].sort((a, b) => a.order - b.order);
  const orderOfSlug = new Map(ordered.map((s) => [s.slug, s.order] as const));

  // rule-mark availability: the order of the unit that teaches each mark
  // (null = never taught in this chapter → any use is a violation).
  const markFrom: Partial<Record<RuleMark, number | null>> = {};
  for (const mark of Object.keys(RULE_MARK_STATION) as RuleMark[]) {
    const slug = RULE_MARK_STATION[mark];
    markFrom[mark] = orderOfSlug.has(slug) ? (orderOfSlug.get(slug) as number) : null;
  }

  /* ---- GLYPH-BUDGET: walk stations in order. A station's OWN teaching (its
     kana-cards + its introducesGlyphs first-looks) is available to its own
     surfaces (the packet rule: cards come before the exercises that use them);
     everything earlier is cumulative; everything later is a violation. */
  const cumulative = new Set<string>();
  for (const s of ordered) {
    for (const b of s.blocks) {
      if (b.kind === 'kana-card') {
        const item = KANA_ITEMS_BY_ID[b.kanaId];
        if (item) cumulative.add(item.glyph);
      }
    }
    const local = new Set(s.introducesGlyphs ?? []);
    const checkSurface = (surface: string, where: string): void => {
      const req = decomposeJa(surface);
      const unknownBase = req.base.filter((g) => !cumulative.has(g) && !local.has(g));
      if (unknownBase.length > 0) {
        v.push({
          rule: RULES.glyphBudget,
          message: `${s.slug}/${where}: uses untaught glyph(s) ${unknownBase.join('')} — legal set = glyphs taught by this point ∪ introducesGlyphs`,
        });
      }
      const earlyMarks = req.marks.filter((m) => {
        const from = markFrom[m];
        return from == null || from > s.order;
      });
      if (earlyMarks.length > 0) {
        v.push({
          rule: RULES.glyphBudget,
          message: `${s.slug}/${where}: uses rule mark(s) ${earlyMarks.join(', ')} before its teaching unit (${earlyMarks
            .map((m) => RULE_MARK_STATION[m])
            .join(', ')})`,
        });
      }
    };

    for (const b of s.blocks) {
      if (b.kind === 'rule-card') {
        checkSurface(b.patternJa, b.id);
        if (b.structureTable) {
          b.structureTable.rows.forEach((row, i) => row.forEach((cell) => checkSurface(cell, `${b.id}/table-r${i}`)));
        }
      }
      if (b.kind === 'example-set') {
        for (const ex of b.examples) checkSurface(ex.ja, ex.id);
      }
      if (b.kind === 'rule-prereq') {
        for (const item of b.items) {
          if (item.glyph) checkSurface(item.glyph, `${b.id}/prereq`);
          if (item.word) checkSurface(item.word, `${b.id}/prereq`);
        }
      }
      if (b.kind === 'rule-contrast') {
        checkSurface(b.a.ja, `${b.id}/a`);
        checkSurface(b.b.ja, `${b.id}/b`);
      }
      if (b.kind === 'rule-step') {
        if (b.word) checkSurface(b.word.ja, b.id);
        if (b.miniTable) {
          b.miniTable.rows.forEach((row, i) => row.forEach((cell) => checkSurface(cell, `${b.id}/table-r${i}`)));
        }
      }
      if (b.kind === 'exercise') {
        for (const id of b.exerciseIds) {
          const ex = chapter.exercises[id];
          if (!ex) continue;
          if (ex.promptJa) checkSurface(ex.promptJa, ex.id);
          for (const opt of ex.options ?? []) checkSurface(opt.label, `${ex.id}/opt-${opt.id}`);
          for (const tok of ex.clozeTokens ?? []) if (tok) checkSurface(tok, `${ex.id}/cloze`);
          for (const chip of ex.chips ?? []) checkSurface(chip.ja, `${ex.id}/chip-${chip.id}`);
        }
      }
    }

    // fold this station's introduces for LATER stations (its cards were folded above)
    for (const g of s.introducesGlyphs ?? []) cumulative.add(g);
  }

  /* ---- PREREQ-DATA: rule-deck stations declare their glyph introductions. */
  for (const s of chapter.stations) {
    const hasRuleSlides = s.blocks.some(
      (b) => b.kind === 'rule-prereq' || b.kind === 'rule-contrast' || b.kind === 'rule-step',
    );
    if (hasRuleSlides && !Array.isArray(s.introducesGlyphs)) {
      v.push({
        rule: RULES.prereqData,
        message: `${s.slug}: carries rule-* slides but no introducesGlyphs declaration (use [] when nothing is new)`,
      });
    }
  }

  /* ---- PASSIVE-RUN: ≤ 2 consecutive receptive slides in a station deck.
     Receptive = scene / rule-card / example-set / wrap-up / rule-prereq /
     rule-step WITHOUT a micro-question (an ask makes the slide interactive). */
  const isPassive = (b: TeachingBlock): boolean =>
    ['scene', 'rule-card', 'example-set', 'wrap-up', 'rule-prereq'].includes(b.kind) ||
    (b.kind === 'rule-step' && !b.ask);
  for (const s of chapter.stations) {
    let run = 0;
    let runStart = -1;
    s.blocks.forEach((b, i) => {
      if (isPassive(b)) {
        if (run === 0) runStart = i;
        run += 1;
        if (run === 3) {
          v.push({
            rule: RULES.passiveRun,
            message: `${s.slug}: 3+ consecutive receptive blocks from #${runStart} (${b.kind} at #${i}) — split with an interactive slide`,
          });
        }
      } else {
        run = 0;
      }
    });
  }

  /* ---- TRANSCRIPT-CONSISTENT: one Persian reading per word, chapter-wide.
     rule-listening promptJaReadings legitimately append the meaning in
     parentheses for the reveal («اییه (نه)») — compare the reading part only. */
  const readings = new Map<string, string>();
  const normReading = (r: string): string => r.replace(/\s*\([^)]*\)\s*$/, '');
  const noteReading = (word: string, reading: string, where: string): void => {
    const next = normReading(reading);
    const prev = readings.get(word);
    if (prev !== undefined && prev !== next) {
      v.push({
        rule: RULES.transcriptConsistent,
        message: `word ${word} has two Persian readings: «${prev}» vs «${reading}» (at ${where})`,
      });
    } else {
      readings.set(word, next);
    }
  };
  for (const s of chapter.stations) {
    for (const b of s.blocks) {
      if (b.kind === 'example-set') {
        for (const ex of b.examples) noteReading(ex.ja, ex.reading, `${s.slug}/${ex.id}`);
      }
      if (b.kind === 'rule-contrast') {
        noteReading(b.a.ja, b.a.readingFa, `${s.slug}/${b.id}/a`);
        noteReading(b.b.ja, b.b.readingFa, `${s.slug}/${b.id}/b`);
      }
      if (b.kind === 'rule-step' && b.word) noteReading(b.word.ja, b.word.readingFa, `${s.slug}/${b.id}`);
      if (b.kind === 'rule-prereq') {
        for (const item of b.items) if (item.word) noteReading(item.word, item.readingFa, `${s.slug}/${b.id}`);
      }
      if (b.kind === 'exercise') {
        for (const id of b.exerciseIds) {
          const ex = chapter.exercises[id];
          if (ex?.promptJa && ex.promptJaReading) noteReading(ex.promptJa, ex.promptJaReading, ex.id);
        }
      }
    }
  }
}
