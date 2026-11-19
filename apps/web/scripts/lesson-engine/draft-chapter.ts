/**
 * HANASO — booklet → EngineChapter draft generator (mission phase 4/6).
 *
 * Turns a parsed booklet lesson (booklet-draft.json) into a DRAFT EngineChapter
 * YAML — the skeleton the producing agent fills. Every item carries its booklet
 * sourceRef; anything the booklet does not provide (Persian meanings, three-origin
 * assignments, step interactions) stays NULL + flagged needs_review — the engine
 * NEVER invents content. The station map follows the framework's 13-stage model
 * (conversation-centered §۳) with the flows' goals pre-seeded (G/V/L blueprints).
 *
 * Usage: npx tsx scripts/lesson-engine/draft-chapter.ts <booklet.json> <lessonNo> <chapterSlug> <level> <out.yaml>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { stringify } from 'yaml';
import type { BookletDraft, BookletLesson } from './parse-booklet';
import type {
  DraftFlag,
  EngineChapter,
  EngineDialogueLine,
  EngineVocabItem,
} from '../../src/modules/lesson-engine/types';
import { engineChapterSchema, engineStationSchema, engineStepSchema } from '../../src/modules/lesson-engine/types';

/** Builder types = zod INPUT (fields with defaults stay optional for literals). */
type EngineStationInput = import('zod').input<typeof engineStationSchema>;
type EngineStepInput = import('zod').input<typeof engineStepSchema>;

const ARTIFACT = 'n5-booklet';

/** The 13-stage station skeleton (draft steps pre-seeded with flow goals). */
function stationSkeletons(l: BookletLesson, chapterSlug: string): EngineStationInput[] {
  const ref = (section: string, locator: string, page?: number) => ({
    artifact: ARTIFACT,
    lesson: l.no,
    page,
    section: section as 'goals' | 'kaiwa' | 'goi' | 'hyoogen' | 'bumpoo' | 'other',
    locator,
  });
  const st = (s: EngineStationInput): EngineStationInput => s;
  const anchorId = `stn-${chapterSlug}-01-anchor`;
  const vocabId = `stn-${chapterSlug}-02-vocab`;
  const grammarId = `stn-${chapterSlug}-03-grammar`;
  const practiceId = `stn-${chapterSlug}-04-practice`;
  const transferId = `stn-${chapterSlug}-05-transfer`;

  return [
    st({
      id: anchorId,
      domain: 'anchor',
      type: 'teaching',
      objectiveFa: 'TODO: هدف مکالمهٔ فصل را از اهداف جزوه (Ⅰ) تکمیل کن',
      prerequisites: [],
      steps: [
        {
          id: 's1',
          goal: 'intro',
          stage: 'teach',
          card: { textFa: 'TODO: صحنه + شخصیت‌ها از مکالمهٔ جزوه' },
          interaction: null,
          transition: 'on_view',
          sourceRef: ref('kaiwa', 'صحنه', l.conversation[0]?.page),
        },
        {
          id: 's2',
          goal: 'predict',
          stage: 'teach',
          card: { textFa: 'TODO: پیش‌بینی از صحنه — بدون پاسخ غلط (L0)' },
          interaction: null,
          transition: 'on_view',
        },
        {
          id: 's3',
          goal: 'gist',
          stage: 'teach',
          card: { lineRef: `${chapterSlug}-l1`, textFa: 'TODO: شنیدن سراسری + سؤال gist (L1)' },
          interaction: null,
          transition: 'on_view',
        },
        {
          id: 's4',
          goal: 'targeted',
          stage: 'teach',
          card: { textFa: 'TODO: شنیدن هدفمند (L2) — سؤال جزئی از جزوه' },
          interaction: null,
          transition: 'on_view',
          listeningsBeforeTranscript: 1,
        },
        {
          id: 's5',
          goal: 'verify',
          stage: 'teach',
          card: { textFa: 'TODO: transcript فقط بعد از ≥۲ شنیدن (D-0007)', lineRef: `${chapterSlug}-l1` },
          interaction: null,
          transition: 'on_view',
          listeningsBeforeTranscript: 2,
        },
        {
          id: 's6',
          goal: 'exit',
          stage: 'teach',
          interaction: { type: 'select', promptFa: 'TODO: Exit Check مکالمه (از objective فصل)' },
          transition: 'on_correct_or_revealed',
        },
      ],
      completion: { kind: 'task_completed' },
      connections: { conversation: { sourceLineRef: `${chapterSlug}-l1` } },
      sourceRef: ref('kaiwa', 'مکالمهٔ محوری', l.conversation[0]?.page),
      flags: ['needs_review'],
    }),
    st({
      id: vocabId,
      domain: 'vocab',
      type: 'teaching',
      objectiveFa: 'TODO: هدف ایستگاه واژگان (T1 واژه‌های کلیدی جزوه Ⅲ)',
      prerequisites: [anchorId],
      steps: [
        {
          id: 'v0',
          goal: 'encounter',
          stage: 'teach',
          card: { textFa: 'TODO: مواجهه در خط مکالمه + های‌لایت واژهٔ T1' },
          interaction: null,
          transition: 'auto_after_audio',
        },
        {
          id: 'v1',
          goal: 'form',
          stage: 'teach',
          card: { textFa: 'TODO: فرم+صدا (Listen-Choose حداقل‌جفتی)' },
          interaction: null,
          transition: 'on_view',
        },
        {
          id: 'v2',
          goal: 'meaning',
          stage: 'teach',
          interaction: { type: 'select', promptFa: 'TODO: Select معنا (distractor از هم‌حوزهٔ فصل)' },
          transition: 'on_correct_or_revealed',
        },
        {
          id: 'v3',
          goal: 'situation',
          stage: 'teach',
          interaction: { type: 'select', promptFa: 'TODO: موقعیت طبیعی/نامناسب (V3 — فقط T1)' },
          transition: 'on_correct_or_revealed',
        },
        {
          id: 'v4',
          goal: 'collocation',
          stage: 'teach',
          interaction: { type: 'complete', promptFa: 'TODO: Complete فریم particle' },
          transition: 'on_correct_or_revealed',
        },
        {
          id: 'v5',
          goal: 'build',
          stage: 'guided',
          interaction: { type: 'order_build', promptFa: 'TODO: Build هدایت‌شده (V6) — تایل‌ها + ۱ اضافی' },
          transition: 'on_correct_or_revealed',
        },
        {
          id: 'v6',
          goal: 'exit',
          stage: 'teach',
          interaction: { type: 'select', promptFa: 'TODO: Exit مشترک واژگان' },
          transition: 'on_correct_or_revealed',
        },
      ],
      guidedStepIds: ['v5'],
      completion: { kind: 'task_completed' },
      connections: { srs: { days: [7, 30] } },
      sourceRef: ref('goi', 'واژگان', l.vocabulary[0]?.page),
      flags: ['needs_review'],
    }),
    st({
      id: grammarId,
      domain: 'grammar',
      type: 'teaching',
      objectiveFa: 'TODO: هدف ایستگاه گرامر (≤۲ ساختار — از Ⅴ جزوه)',
      prerequisites: [vocabId],
      steps: [
        {
          id: 'g0',
          goal: 'notice',
          stage: 'teach',
          card: { textFa: 'TODO: G0 بازپخش خط مکالمه + های‌لایت ساختار هدف' },
          interaction: null,
          transition: 'auto_after_audio',
        },
        {
          id: 'g1',
          goal: 'function',
          stage: 'teach',
          interaction: { type: 'select', promptFa: 'TODO: G1 کارکرد اول (Select موقعیت)' },
          transition: 'on_correct_or_revealed',
        },
        {
          id: 'g2',
          goal: 'form',
          stage: 'teach',
          interaction: { type: 'complete', promptFa: 'TODO: G2+G3 فرمول + Complete particle' },
          transition: 'on_correct_or_revealed',
        },
        {
          id: 'g3',
          goal: 'examples',
          stage: 'teach',
          interaction: { type: 'listen_choose', promptFa: 'TODO: G4 مثال anchor از مکالمه + مثال‌های متنوع' },
          transition: 'on_correct_or_revealed',
        },
        {
          id: 'g4',
          goal: 'build',
          stage: 'guided',
          interaction: { type: 'order_build', promptFa: 'TODO: G6 تولید هدایت‌شده (تایل‌ها از واژگان فصل)' },
          transition: 'on_correct_or_revealed',
        },
        {
          id: 'g5',
          goal: 'exit',
          stage: 'teach',
          interaction: { type: 'select', promptFa: 'TODO: G7 بازگشت به مکالمه + Exit' },
          transition: 'on_correct_or_revealed',
        },
      ],
      guidedStepIds: ['g4'],
      completion: { kind: 'task_completed' },
      connections: { srs: { days: [7, 30] }, conversation: { returnLineRef: `${chapterSlug}-l1` } },
      sourceRef: ref('bumpoo', 'گرامر', l.grammar[0]?.page),
      flags: ['needs_review'],
    }),
    st({
      id: practiceId,
      domain: 'practice',
      type: 'practice',
      objectiveFa: 'TODO: بازیابی درهم‌آمیخته ۶۰/۴۰ (۸–۱۵ آیتم، بدون hint)',
      prerequisites: [grammarId],
      steps: Array.from({ length: 8 }, (_v, i): EngineStepInput => {
        // pre-seeded TYPE ROTATION (≤2 consecutive same-type — D-0014) + 60/40
        // new/old interleaving is the agent's filling duty (REVIEW_TARGETS)
        const rotation = [
          'select',
          'complete',
          'listen_choose',
          'order_build',
          'select',
          'order_build',
          'complete',
          'judge',
        ] as const;
        return {
          id: `p${i + 1}`,
          goal: 'retrieve',
          stage: 'independent' as const,
          interaction: {
            type: rotation[i % rotation.length]!,
            promptFa: `TODO: آیتم بازیابی مستقل ${i + 1} (بدون hint — سیاست Independent)`,
          },
          transition: 'on_correct_or_revealed' as const,
        };
      }),
      completion: { kind: 'exercise_threshold', threshold: 0.7 },
      connections: {},
      flags: ['needs_review'],
    }),
    st({
      id: transferId,
      domain: 'transfer',
      type: 'review',
      objectiveFa: 'TODO: Transfer Task — مکالمهٔ جدید با همان Can-do (مرحلهٔ ۱۳)',
      prerequisites: [practiceId],
      steps: [
        {
          id: 't1',
          goal: 'transfer_intro',
          stage: 'teach',
          card: { textFa: 'TODO: موقعیت جدید (شخصیت/مکان متفاوت)' },
          interaction: null,
          transition: 'on_view',
        },
        {
          id: 't2',
          goal: 'transfer_task',
          stage: 'independent',
          interaction: { type: 'select', promptFa: 'TODO: وظیفهٔ انتقال — سنجه: gist + تولید' },
          transition: 'on_correct_or_revealed',
        },
        {
          id: 't3',
          goal: 'exit',
          stage: 'teach',
          interaction: { type: 'select', promptFa: 'TODO: جمع‌بندی فصل' },
          transition: 'on_correct_or_revealed',
        },
      ],
      completion: { kind: 'task_completed' },
      connections: {},
      flags: ['needs_review'],
    }),
  ];
}

export function draftChapterFromBooklet(
  booklet: BookletDraft,
  lessonNo: number,
  chapterSlug: string,
  level: EngineChapter['level'],
): EngineChapter {
  const l = booklet.lessons.find((x) => x.no === lessonNo);
  if (!l) throw new Error(`lesson ${lessonNo} not found in booklet`);

  const dialogue: EngineDialogueLine[] = l.conversation.map((line) => ({
    speaker: line.speaker,
    textJa: line.ja,
    romaji: line.romaji,
    fa: undefined, // booklet has NO Persian per line — the agent translates (never invents here)
    origin: 'target', // default assignment is a DECISION the agent must verify → flagged
    originNoteFa: undefined,
    sourceRef: {
      artifact: ARTIFACT,
      lesson: l.no,
      page: line.page,
      section: 'kaiwa',
      locator: `turn ${line.indexInLesson + 1}`,
    },
    flags: ['needs_review'],
  }));

  // T1 = the words the conversation hinges on (first ~3) — agent reviews; rest T2/T3
  const vocabulary: EngineVocabItem[] = l.vocabulary.slice(0, 24).map((v, i) => ({
    id: `v-${chapterSlug}-${String(v.no).padStart(3, '0')}`,
    surface: v.ja,
    reading: v.ja, // kana-only parse surface; agent refines kanji/reading split
    romaji: v.romaji || undefined,
    meaningFa: `TODO معنی فارسی (کتاب: ${v.meaningEn || '—'})`,
    pos: undefined,
    tier: i < 3 ? 'T1' : 'T2',
    dialogueLineIndex: undefined,
    collocations: [],
    sourceRef: { artifact: ARTIFACT, lesson: l.no, page: v.page, section: 'goi', locator: `item ${v.no}` },
    flags: v.flags as DraftFlag[],
  }));

  const goalsFa = l.goals.map((g) => g.ja);

  const chapter = engineChapterSchema.parse({
    engineVersion: 1,
    published: false,
    id: chapterSlug,
    bookletLesson: l.no,
    bookletSourceFile: l.sourceFile,
    titleJa: l.titleJa,
    titleFa: `TODO: عنوان فارسی فصل (درس ${l.no} جزوهٔ N5)`,
    canDoFa: `TODO: Can-do فصل بر اساس اهداف جزوه: ${goalsFa.join('؛ ')}`,
    level,
    archetype: 'C-Dialogue',
    characters: [...new Set(l.conversation.map((c) => c.speaker))].slice(0, 6).map((name) => ({
      name,
      roleFa: 'TODO: نقش و رابطهٔ شخصیت (برای سطح رسمیت)',
    })),
    dialogue,
    vocabulary,
    grammar: l.grammar.slice(0, 2).map((g) => ({
      id: `g-${chapterSlug}-${String(g.no).padStart(2, '0')}`,
      patternJa: g.patternJa,
      functionFa: 'TODO: کارکرد ارتباطی (A1 — از دل مکالمه)',
      formulaFa: undefined,
      persianEquivalentFa: undefined,
      commonErrors: [],
      examples: g.examplesJa.slice(0, 3).map((ja) => ({ ja, kind: 'anchor' as const })),
      sourceRef: { artifact: ARTIFACT, lesson: l.no, page: g.page, section: 'bumpoo', locator: `pattern ${g.no}` },
      flags: ['needs_review'],
    })),
    kanji: [], // N5 lessons 1-2 are kana-only — kanji targets stay empty (honest)
    lessons: [
      {
        id: `les-${chapterSlug}-1`,
        microObjectiveFa: `TODO: درس ۱ — مکالمه (اهداف جزوه: ${goalsFa.slice(0, 2).join('، ') || '—'})`,
        stages: [1, 2, 3, 4, 5, 6],
        newKnowledgeRefs: [],
        stationIds: [`stn-${chapterSlug}-01-anchor`],
        sourceRef: { artifact: ARTIFACT, lesson: l.no, section: 'goals' },
        flags: ['needs_review'],
      },
      {
        id: `les-${chapterSlug}-2`,
        microObjectiveFa: 'TODO: درس ۲ — واژگان و گرامر (مراحل ۷–۸ مدل ۱۳-مرحله)',
        stages: [7, 8, 9, 10],
        newKnowledgeRefs: [],
        stationIds: [`stn-${chapterSlug}-02-vocab`, `stn-${chapterSlug}-03-grammar`],
        sourceRef: { artifact: ARTIFACT, lesson: l.no, section: 'goi' },
        flags: ['needs_review'],
      },
      {
        id: `les-${chapterSlug}-3`,
        microObjectiveFa: 'TODO: درس ۳ — تمرین مستقل، بازگشت و انتقال (مراحل ۱۰–۱۳)',
        stages: [10, 11, 12, 13],
        newKnowledgeRefs: [],
        stationIds: [`stn-${chapterSlug}-04-practice`, `stn-${chapterSlug}-05-transfer`],
        sourceRef: { artifact: ARTIFACT, lesson: l.no, section: 'bumpoo' },
        flags: ['needs_review'],
      },
    ],
    stations: stationSkeletons(l, chapterSlug),
    finalTask: {
      descriptionFa: `TODO: Transfer Task از موقعیت جدید — مبتنی بر اهداف جزوه: ${goalsFa.join('؛ ')}`,
      sourceRef: { artifact: ARTIFACT, lesson: l.no, section: 'goals' },
    },
    culturalNote: [],
  });
  return chapter as EngineChapter;
}

/* ------------------------------------------------------------------ CLI */
if (process.argv[1] && process.argv[1].endsWith('draft-chapter.ts')) {
  const [, , bookletPath, lessonArg, slugArg, levelArg, outArg] = process.argv;
  if (!bookletPath || !lessonArg || !slugArg || !outArg) {
    console.error('usage: tsx draft-chapter.ts <booklet.json> <lessonNo> <chapterSlug> [level] <out.yaml>');
    process.exit(2);
  }
  const booklet = JSON.parse(readFileSync(bookletPath, 'utf8')) as BookletDraft;
  const level = (levelArg ?? 'H1') as EngineChapter['level'];
  const chapter = draftChapterFromBooklet(booklet, Number(lessonArg), slugArg, level);
  writeFileSync(outArg, stringify(chapter, { lineWidth: 120 }));
  console.log(
    `draft written: ${outArg} — stations=${chapter.stations.length} dialogue=${chapter.dialogue.length} vocab=${chapter.vocabulary.length} grammar=${chapter.grammar.length}`,
  );
}
