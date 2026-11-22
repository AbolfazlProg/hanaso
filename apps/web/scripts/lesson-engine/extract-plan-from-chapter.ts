/**
 * HANASO — Phase-1 plan extractor (KANJI-TWO-PHASE §۴ sample tooling — 2026-11-22).
 *
 * Derives a CurriculumPlan (the phase-1 output) from a SHIPPED chapter's real
 * data — stations, item→station assignments (the vocab-card/expression-card
 * grammar anchors of the actual deck), the dialogue lines of the chapter's
 * dialogue bundle. This is the honest way to on-board existing chapters into
 * the two-phase architecture (their plans document what they teach) and it
 * produced the phase-1 SAMPLE the gates prove the pipeline with.
 *
 * Usage: tsx scripts/lesson-engine/extract-plan-from-chapter.ts <chapterSlug> <out.yaml>
 */
import { writeFileSync } from 'node:fs';
import { stringify } from 'yaml';
import { getChapter, listChapters } from '../../src/modules/curriculum/content';
import { loadDialogueBundle } from '../../src/lib/poc/dialogue-bundle';
import { stationsInWalkOrder } from '../../src/modules/curriculum/eqa/model';
import { KANJI_ITEMS_BY_LITERAL } from '../../src/modules/curriculum/kanji';
import type { CurriculumPlan } from '../../src/modules/lesson-engine/plan-types';

const [, , slug, out] = process.argv;
if (!slug || !out) {
  console.error('usage: tsx extract-plan-from-chapter.ts <chapterSlug> <out.yaml>');
  process.exit(2);
}
const chapter = listChapters().find((c) => c.slug === slug) ?? getChapter(slug);
if (!chapter) {
  console.error(`chapter not found: ${slug}`);
  process.exit(1);
}

/* the dialogue lines (provenance = the bundle's real line ids) */
const bundle = loadDialogueBundle(chapter.dialogueSlug);
const dialogue = bundle.dialogue.lines.map((l) => ({
  speaker: l.speaker,
  textJa: l.tokens.map((t) => t.surface).join(''),
  romaji: undefined,
  sourceRef: {
    artifact: `dialogue-${chapter.dialogueSlug}`,
    lesson: chapter.orderInLevel,
    locator: l.id,
  },
}));

/* stations in walk order — the plan's teaching map */
const stationDomainBy = (type: string): CurriculumPlan['stations'][number]['domain'] =>
  type === 'anchor'
    ? 'anchor'
    : type === 'vocab'
      ? 'vocab'
      : type === 'grammar' || type === 'structure'
        ? 'grammar'
        : type === 'kana'
          ? 'kana'
          : type === 'kanji'
            ? 'kanji'
            : type === 'listen'
              ? 'listening'
              : type === 'practice'
                ? 'practice'
                : type === 'review'
                  ? 'review'
                  : type === 'integrate'
                    ? 'transfer'
                    : type === 'expression'
                      ? 'vocab'
                      : type === 'deepdive'
                        ? 'grammar'
                        : type === 'mastery'
                          ? 'review'
                          : 'vocab';
const stations = stationsInWalkOrder(chapter).map((s) => ({
  id: s.slug,
  domain: stationDomainBy(s.type),
  type: (s.type === 'practice' ? 'practice' : s.type === 'review' ? 'review' : 'teaching') as
    'teaching' | 'practice' | 'review',
  objectiveFa: s.objectiveFa,
  order: s.order,
  prerequisites: s.prerequisites,
}));

/* item→station assignments from the REAL deck (vocab-card / expression-card /
 * kanji-card blocks + grammar cluster anchoring) */
const teachStationOfWord = new Map<string, string>();
const teachStationOfExpression = new Map<string, string>();
for (const s of stationsInWalkOrder(chapter)) {
  for (const b of s.blocks) {
    if (b.kind === 'vocab-card') teachStationOfWord.set(b.wordId, s.slug);
    if (b.kind === 'expression-card') teachStationOfExpression.set(b.expressionId, s.slug);
  }
}
const grammarHost = new Map<string, string>();
for (const g of chapter.grammar) {
  const hosts = stationsInWalkOrder(chapter).filter(
    (s) =>
      (s.type === 'grammar' || s.type === 'structure') &&
      g.lineRefs.length > 0 &&
      g.lineRefs.every((l) => s.lineRefs.includes(l)),
  );
  grammarHost.set(g.id, hosts[0]?.slug ?? chapter.stations[0]!.slug);
}

const vocabulary = chapter.words.map((w) => ({
  id: w.id,
  surface: w.term,
  reading: w.readingKana,
  meaningFa: w.meaningFa,
  dialogueLineIndex: undefined,
  teachStationId:
    teachStationOfWord.get(w.id) ??
    stationsInWalkOrder(chapter).find((s) => s.blocks.some((b) => b.kind === 'vocab-card' && b.wordId === w.id))
      ?.slug ??
    chapter.stations[0]!.slug,
  sourceRef: {
    artifact: `chapter-${chapter.slug}`,
    lesson: chapter.orderInLevel,
    locator: w.lineRef,
  },
}));

const grammar = chapter.grammar.map((g) => ({
  id: g.id,
  patternJa: g.pattern,
  functionFa: g.titleFa,
  teachStationId: grammarHost.get(g.id) ?? chapter.stations[0]!.slug,
  sourceRef: { artifact: `chapter-${chapter.slug}`, lesson: chapter.orderInLevel, locator: g.lineRefs[0] ?? '' },
}));

const expressions = chapter.expressions.map((e) => ({
  id: e.id,
  ja: e.ja,
  reading: e.reading,
  functionFa: e.functionFa,
  teachStationId: teachStationOfExpression.get(e.id) ?? chapter.stations[0]!.slug,
  sourceRef: { artifact: `chapter-${chapter.slug}`, lesson: chapter.orderInLevel, locator: e.lineRef ?? '' },
}));

/* kanji extraction: the ANCHOR INVENTORY of this chapter's words — which kanji
 * could be taught here (≥2 anchors available) and which must be deferred.
 * PLACEMENT (which station teaches which kanji) is a planning decision, not an
 * extraction fact — the extractor emits the inventory as notes and leaves
 * plan.kanji to the planning agent. */
const anchors = new Map<string, string[]>();
for (const w of chapter.words) {
  for (const ch of w.term) {
    if (KANJI_ITEMS_BY_LITERAL.has(ch)) {
      const list = anchors.get(ch) ?? [];
      list.push(w.id);
      anchors.set(ch, list);
    }
  }
}
const notes: string[] = [];
for (const [character, ids] of anchors) {
  const unique = [...new Set(ids)];
  notes.push(
    unique.length >= 2
      ? `کانجی ${character} (${KANJI_ITEMS_BY_LITERAL.get(character)!.kanjiId}) در ${unique.length} واژهٔ این فصل حاضر است — آمادهٔ جایگاه‌گذاری ایستگاه کانجی.`
      : `کانجی ${character} فقط ۱ واژهٔ anchor در این فصل دارد — تدریس اختصاصی به فصل بعدی موکول شود (قاعدهٔ ≥۲ anchor).`,
  );
}

const plan: CurriculumPlan = {
  planVersion: 1,
  chapterId: chapter.slug,
  phaseStatus: 'extracted',
  source: { artifact: `chapter-${chapter.slug}`, lesson: chapter.orderInLevel },
  titleFa: chapter.titleFa,
  canDoFa: chapter.canDoFa,
  level:
    chapter.levelCode === 'L1'
      ? 'H0'
      : chapter.levelCode === 'L2'
        ? 'H1'
        : chapter.levelCode === 'L3'
          ? 'H2'
          : chapter.levelCode === 'L4'
            ? 'H3'
            : 'H4',
  prerequisiteChapterSlug: chapter.prerequisiteChapterSlug,
  dialogue,
  vocabulary,
  grammar,
  expressions,
  kanji: [],
  stations,
  notes,
};

const yamlText = stringify(plan, { lineWidth: 120 });
writeFileSync(out, yamlText);
console.log(`plan extracted: ${out}`);
console.log(
  `  stations=${stations.length} vocabulary=${vocabulary.length} grammar=${grammar.length} expressions=${expressions.length} dialogue=${dialogue.length}`,
);
console.log(`  anchor inventory notes: ${notes.length}`);
