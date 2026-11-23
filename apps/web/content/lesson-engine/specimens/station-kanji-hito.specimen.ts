/**
 * HANASO — the phase-2 specimen: ONE fully authored kanji station
 * (KANJI-TWO-PHASE §۴/§۸ — 2026-11-22).
 *
 * This is the «ایستگاه طراحی‌شده» the mission asked to pass BOTH gates: the
 * dedicated kanji station the kanji-pilot plan (plans/first-meeting-01-kanji-pilot.plan.yaml)
 * places for 人 + 国, AUTHORED as a real lesson deck — teaching cards, immediate
 * retrieval after the packet (the 2–3 card packet rule), the self-contained
 * hint ladder (W-E contract: inline feedback, every distractor reasoned),
 * and honest Persian copy.
 *
 * It is a SPECIMEN, not shipped chapter content: it joins no chapter list,
 * enrolls nothing, and publishes nothing by itself — the regression suite
 * (tests/unit/two-phase-gates.test.ts) wraps it with the real first-meeting-01
 * chapter data and proves it passes Gate P2 (and that tampered variants fail).
 *
 * Data sources (anti-invention):
 *  - kanji facts: the N5 reference (kj-4eba 人، kj-56fd 国) — KANJIDIC2/KanjiVG;
 *  - anchor words: the shipped chapter's own vocabulary (日本人・中国人・イラン人・韓国人);
 *  - exercise copy: authored per the W-E self-contained contract (distractor
 *    reasons for EVERY wrong option; hints carry content, never «think again»).
 */
import type { Exercise, KanjiItem, Station, TeachingBlock } from '@/modules/curriculum/types';

/** The chapter-level kanji declarations this station teaches (runtime KanjiItem). */
export const KANJI_PILOT_KANJI_ITEMS: KanjiItem[] = [
  {
    kanjiId: 'kj-4eba',
    fsrs: { rec: 'kj-rec-kj-4eba', wri: 'kj-wri-kj-4eba' },
    anchorWordIds: ['voc-nihonjin', 'voc-chuugokujin', 'voc-iranjin', 'voc-kankokujin'],
  },
  {
    kanjiId: 'kj-56fd',
    fsrs: { rec: 'kj-rec-kj-56fd', wri: 'kj-wri-kj-56fd' },
    anchorWordIds: ['voc-chuugokujin', 'voc-kankokujin'],
  },
];

/** The station deck — teach (packet of 2 kanji cards) → immediate retrieval per card. */
export const KANJI_PILOT_BLOCKS: TeachingBlock[] = [
  {
    kind: 'scene',
    id: 'sc-kanji-intro',
    titleFa: 'دو کانجی که تا حالا دیده‌ای',
    bodyFa:
      'در واژه‌های ژاپنی، چینی، ایرانی و کره‌ای که یاد گرفتی، دو کانجی پنهان بود: 人 (انسان) و 国 (کشور). حالا وقت جدا کردنشان است.',
  },
  {
    kind: 'kanji-card',
    id: 'kcard-jin',
    kanjiId: 'kj-4eba',
    anchorWordIds: ['voc-nihonjin', 'voc-chuugokujin', 'voc-iranjin', 'voc-kankokujin'],
    noteFa:
      'کانجی 人 یعنی «انسان/شخص». دو ضربه دارد: یک خط مورب که به پایین می‌رود و دومی که از آن جدا باز می‌شود — مثل دو پای آدمی که راه می‌رود. این کانجی آخر هر ملیت نشسته: 日本人 (nihonjin)، 中国人 (chuugokujin)، イラン人 (iranjin)، 韓国人 (kankokujin) — همه «انسانِ آن کشور».',
  },
  {
    kind: 'exercise',
    id: 'blk-ex-kanji-jin-recall',
    exerciseIds: ['ex-kanji-jin-recall'],
  },
  {
    kind: 'kanji-card',
    id: 'kcard-kuni',
    kanjiId: 'kj-56fd',
    anchorWordIds: ['voc-chuugokujin', 'voc-kankokujin'],
    noteFa:
      'کانجی 国 یعنی «کشور». دور آن یک قاب چهارگوش کشیده شده (مثل مرز یک سرزمین) و 玉 (گنج/گوهر) داخلش نشسته — «سرزمینی که چیزهای گران‌بها دارد». 中国 (chuugoku) یعنی چین و 韓国 (kankoku) یعنی کره — کشورِ هر کدام.',
  },
  {
    kind: 'exercise',
    id: 'blk-ex-kanji-kuni-recall',
    exerciseIds: ['ex-kanji-kuni-recall'],
  },
  {
    kind: 'wrap-up',
    id: 'wrapup-kanji',
    titleFa: 'جمع‌بندی ایستگاه کانجی',
    itemsFa: [
      '人 = انسان/شخص — آخر همهٔ ملیت‌ها (日本人، 中国人، イラン人، 韓国人)',
      '国 = کشور — 中国 چین، 韓国 کره',
      'این دو کانجی حالا وارد مرور روزانهٔ حافظه‌ات می‌شوند — هم به شکل تشخیص (دیدن و یادآوری) هم به شکل نوشتن.',
    ],
  },
];

/** The retrieval exercises — the W-E self-contained contract. */
export const KANJI_PILOT_EXERCISES: Exercise[] = [
  {
    id: 'ex-kanji-jin-recall',
    type: 'meaning-select',
    targetSkill: 'vocab',
    targetConcept: 'kj-4eba',
    assessesConcepts: ['kj-4eba'],
    lineRef: 's-first-meeting-01-l3',
    difficulty: 1,
    promptFa: 'کانجی 人 چه چیزی را نشان می‌دهد؟',
    promptJa: '人',
    audioLineRef: 's-first-meeting-01-l3',
    options: [
      { id: 'o1', label: 'انسان / شخص' },
      { id: 'o2', label: 'کشور' },
      { id: 'o3', label: 'دانشگاه' },
    ],
    correctOptionId: 'o1',
    distractorRationaleFa: {
      o2: '«کشور» معنی کانجی 国 است — کانجیِ همراهِ همین ایستگاه؛ 人 نشانهٔ «انسانِ» آن سرزمین است.',
      o3: '«دانشگاه» معنی واژهٔ だいがく است — کانجی دیگری سرش می‌زند، نه 人.',
    },
    feedback: {
      f1Fa: 'به واژه‌های ملیتی که این کانجی درشان بود نگاه کن — در همهٔ آن‌ها آخرِ واژه است و «بودنِ آدمِ یک سرزمین» را می‌سازد.',
      f2HintFa: 'کانجی 人 دو ضربه دارد و شبیه آدمی است که راه می‌رود — «انسان».',
      f3ExplainFa: '人 یعنی انسان/شخص و «じん (jin)» خوانده می‌شود؛ آخرِ هر واژهٔ ملیت می‌نشیند: にほんじん = ژاپنی، ちゅうごくじん = چینی، かんこくじん = کره‌ای.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'kcard-jin',
  },
  {
    id: 'ex-kanji-kuni-recall',
    type: 'meaning-select',
    targetSkill: 'vocab',
    targetConcept: 'kj-56fd',
    assessesConcepts: ['kj-56fd'],
    lineRef: 's-first-meeting-01-l5',
    difficulty: 1,
    promptFa: 'کانجی 国 چه چیزی را نشان می‌دهد؟',
    promptJa: '国',
    audioLineRef: 's-first-meeting-01-l5',
    options: [
      { id: 'o1', label: 'کشور' },
      { id: 'o2', label: 'انسان / شخص' },
      { id: 'o3', label: 'استاد / معلم' },
    ],
    correctOptionId: 'o1',
    distractorRationaleFa: {
      o2: '«انسان» معنی کانجی 人 است — 国 «کشور» را می‌سازد، نه «انسان» را.',
      o3: '«استاد» معنی واژهٔ せんせい است — هیچ ربطی به 国 ندارد.',
    },
    feedback: {
      f1Fa: 'به دو واژه‌ای که این کانجی درشان بود برگرد: ちゅうごく (چین) و かんこく (کره) — 国 در هر دو «کشور» را می‌سازد.',
      f2HintFa: 'کانجی 国 یک قاب دارد مثل مرزِ یک سرزمین — «کشور».',
      f3ExplainFa: '国 یعنی کشور و «こく (koku)» خوانده می‌شود؛ ちゅうごく = چین (سرزمین میانه)، かんこく = کره.',
    },
    assessmentRole: 'practice',
    referenceBlockId: 'kcard-kuni',
  },
];

/** The assembled station — the kanji-pilot plan's stn-fm01-23-kanji. */
export const KANJI_PILOT_STATION: Station = {
  slug: 'stn-fm01-23-kanji',
  type: 'kanji',
  titleFa: 'کانجی‌های 人 و 国',
  objectiveFa: 'کانجی‌های 人 و 国 را در واژه‌های ملیت که آموخته‌ای بشناسد و معنی و خوانش هر کانجی را جدا کند',
  core: true,
  order: 23,
  prerequisites: ['stn-fm01-02-vocab', 'stn-fm01-11-vocab2'],
  lineRefs: ['s-first-meeting-01-l3', 's-first-meeting-01-l5', 's-first-meeting-01-l9'],
  objectiveCode: 'OBJ-FM01-KANJI-JIN-KUNI',
  teachesConcepts: ['kanji-jin-in-nationalities', 'kanji-kuni-in-countries'],
  estMinutes: 6,
  estLoad: 'light',
  completion: { kind: 'exercise_threshold', threshold: 0.7 },
  mastery: { threshold: 0.7 },
  blocks: KANJI_PILOT_BLOCKS,
  fsrsItems: ['kj-rec-kj-4eba', 'kj-wri-kj-4eba', 'kj-rec-kj-56fd', 'kj-wri-kj-56fd'],
};
