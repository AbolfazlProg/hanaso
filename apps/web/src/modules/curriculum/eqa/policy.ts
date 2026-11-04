/**
 * HANASO — Educational QA gate policy (TASK-LEARNING-04, Issue #97) — PURE module.
 *
 * THE single place where every pedagogical gate threshold lives. Each number
 * carries its KB provenance; no gate logic may hardcode a number that is not
 * declared here (EQA-7 — numbers are policy data, never scattered literals).
 *
 * Sources (KB docs, read-only at ../japanese-learning-kb):
 *  - HANASO_INSTRUCTIONAL_DESIGN_CONTRACT.md §۵ (EQA-1..7 definitions — TASK-LEARNING-03)
 *  - PRACTICE_INSTRUCTION_BALANCE.md §۳/§۴ (DD-94 — alternation + packet rules)
 *  - QUESTION_AND_EXERCISE_ARCHITECTURE.md §۲/§۳ (DD-096/DD-013 — question quality,
 *    recall-first composition)
 *  - exercise-design.md §۱ (recall-first per-type classification)
 *  - LEVEL_BASED_CONTENT_MATRIX.md §۶ (gate thresholds per level band)
 *
 * Severity model (CONTRACT §۵ + TASK-LEARNING-04 §۴-C):
 *  - error   : machine-decidable rule violation → CI FAILS (unless waived with an issue)
 *  - warning : machine-detected anomaly needing human judgment (EQA-9) → reported, no fail
 *  - info    : not decidable with current data → boundary is stated, never faked
 */
import type { ExerciseType, StationType, TeachingBlock } from '../types';

/* ------------------------------------------------------------------ findings */

export type EqaSeverity = 'error' | 'warning' | 'info';

export type EqaGateId = 'EQA-1' | 'EQA-2' | 'EQA-3' | 'EQA-4' | 'EQA-5' | 'EQA-6' | 'EQA-7';

export interface EqaFinding {
  gate: EqaGateId;
  severity: EqaSeverity;
  /** Stable machine key used for waiver matching (e.g. 'stn-fm01-02-vocab' or 'practice-pool'). */
  subject: string;
  /** Machine rule code — waiver key = `${gate}:${subject}:${rule}`. */
  rule: string;
  /** Human-readable Persian explanation — actionable (names file/lesson/field/reason). */
  messageFa: string;
  /** KB rule reference for the report. */
  ruleRef: string;
}

/** Unique machine key of a finding — the waiver matching key. */
export function findingKey(f: Pick<EqaFinding, 'gate' | 'subject' | 'rule'>): string {
  return `${f.gate}:${f.subject}:${f.rule}`;
}

/* ------------------------------------------------------------------ policy */

/**
 * Interaction/alternation limits (DD-94 §۳/§۴ + CONTRACT §۲-۱/§۴ S-3).
 * Scope: TEACHING stations (see {@link RECEIPT_STATION_TYPES}).
 */
export const EQA_POLICY = {
  /** Max consecutive non-card explanation blocks without an active interaction (DD-94 §۳-۱ grammar row: «حداکثر ۲ بلوک توضیحی پیاپی»). */
  maxExplanationRun: 2,
  /** Max consecutive vocab cards without retrieval — the packet rule (DD-94 §۳-۱ vocab row: «کارت صدا-اول ×۲–۳ → بازیابی»). */
  maxVocabCardRun: 3,
  /** Max consecutive receptive blocks of ANY mix (e.g. scene + a 3-card packet = 4). Derived from the packet pattern: scene + ۳ کارت. */
  maxReceptiveStretch: 4,
  /** Recall-first share of the practice pool (DD-013 / QUESTION §۳: «≥۶۰٪ اقلام recall-first»). */
  recallFirstMinShare: 0.6,
  /** MCQ (meaning-select) share cap of the practice pool (QUESTION §۳: «MCQ (Q1) ≤۳۰٪ جلسهٔ تمرین»). */
  meaningSelectMaxShare: 0.3,
  /** Position-balance: pools smaller than this are statistically not checkable (chi-square needs expected ≥ 5 per cell → n ≥ 15 for 3 options). */
  balanceMinPoolSize: 15,
  /** Position-balance significance level (chi-square, df = options-1). QUESTION §۲-۴ anti-pattern «تعادل موقعیت گزینهٔ درست». */
  balanceAlpha: 0.05,
  /** Position-balance gross-bias guard for every pool regardless of size: no single served position may exceed this share. */
  balanceGrossMaxShare: 2 / 3,
  /** Level-policy gate value bounds (LEVEL_MATRIX §۶ — documented valid range; L1 placeholder uses the same bounds). */
  gateBounds: {
    weighted: [0.5, 0.95] as const,
    minMeasure: [0.4, 0.8] as const,
    remediationLoops: [1, 5] as const,
  },
} as const;

/* ------------------------------------------------------------------ block classification */

/**
 * Station types whose blocks are pure receipt or the assessment itself — the
 * alternation rules do NOT apply to them:
 *  - anchor  : stage A is gist-receipt by design (DD-94 §۴-۱ «شامل ANCHOR (دریافت‌محض)»);
 *              its allowed support = scene card + one prediction question (CONTRACT §۳).
 *  - mastery : stage D is the replay + separate gate assessment (DD-048); the
 *              scored interaction is the gate itself, not station blocks.
 */
export const RECEIPT_STATION_TYPES: ReadonlySet<StationType> = new Set(['anchor', 'mastery'] as const);

/** Receptive (non-interactive) block kinds — the learner only receives. */
const RECEPTIVE_KINDS: ReadonlySet<string> = new Set([
  'scene',
  'vocab-card',
  'expression-card',
  'rule-card',
  'example-set',
  'wrap-up',
]);

/** Non-card explanation kinds (vocab cards have their own packet rule). */
const EXPLANATION_KINDS: ReadonlySet<string> = new Set([
  'scene',
  'expression-card',
  'rule-card',
  'example-set',
  'wrap-up',
]);

export function blockIsInteractive(block: TeachingBlock): boolean {
  switch (block.kind) {
    case 'exercise':
    case 'guided-discovery':
    case 'structured-input':
    case 'listening-task':
      return true;
    case 'character-scene':
      return block.steps.some((s) => s.userReply !== undefined);
    case 'dialogue-player':
      // The anchor prediction question is an active scored interaction (CONTRACT §۳ A).
      return block.prediction !== undefined;
    default:
      return false;
  }
}

export function blockIsReceptive(block: TeachingBlock): boolean {
  if (blockIsInteractive(block)) return false;
  return RECEPTIVE_KINDS.has(block.kind);
}

export function blockIsExplanation(block: TeachingBlock): boolean {
  if (blockIsInteractive(block)) return false;
  return EXPLANATION_KINDS.has(block.kind);
}

/* ------------------------------------------------------------------ exercise classification */

/**
 * Closed recall-first classification (CONTRACT §۵ EQA-3 «تعریف بستهٔ نوع‌ها»).
 *
 * recall-first = the item makes the learner RETRIEVE/PRODUCE/COMPREHEND from memory:
 *  - cloze (Q3) — «قوی (recall)» (exercise-design §۱)
 *  - word-order (Q5) — «قوی» (exercise-design §۱)
 *  - produce-template (Q10) — «قوی برای تولید» (exercise-design §۱)
 *  - dialogue-order (Q13) — sequencing production (same cognitive class as Q5 — چینش ترتیب)
 *  - gist-select / listen-who-asked — «درک مطلب شنیداری ✅» (exercise-design §۱)
 *
 * recognition (complementary only — MCQ caps apply):
 *  - meaning-select (Q1) — «⚠️ ضعیف» + «فقط مکمل — سقف سهم §۳»
 *  - match-in-line (Q4 matching) — «⚠️ ضعیف»
 *  - audio-meaning (Q2) — «تشخیصی» word drill (13-06 §۱ قدم ۴: شنیدن→معنی = recognition)
 *  - speaker-identify (Q6) — voice identification
 *  - response-select (Q8) — situational selection format
 *  - listen-minimal-pair (Q14) — perceptual discrimination (ادراک شنیداری)
 */
export const RECALL_FIRST_TYPES: ReadonlySet<ExerciseType> = new Set([
  'cloze',
  'word-order',
  'produce-template',
  'dialogue-order',
  'gist-select',
  'listen-who-asked',
] as const);

/**
 * Line-comprehension types for EQA-1 layer 2: the ASSESSED content is the whole
 * source line (its grammar + words), not just the target concept. Word-spotting
 * (match-in-line), perceptual discrimination (listen-minimal-pair), voice
 * identification (speaker-identify), pragmatic reply selection (response-select)
 * and cloze (the blank IS the target cluster) are exempt — documented in the registry.
 */
export const LINE_COMPREHENSION_TYPES: ReadonlySet<ExerciseType> = new Set([
  'audio-meaning',
  'gist-select',
  'listen-who-asked',
] as const);

/* ------------------------------------------------------------------ gate registry (code-truth) */

export interface EqaGateSpec {
  id: EqaGateId;
  /** One-line Persian rule statement (report header). */
  ruleFa: string;
  /** KB source for the rule. */
  source: string;
  /** What the gate covers and what it deliberately does NOT (error/warning/info boundary). */
  scope: string;
  owner: string;
}

/**
 * The QA Gate Registry (TASK-LEARNING-04 §۴-E) — rendered into
 * docs/engineering/learning/EQA_GATE_REGISTRY.md by eqa:report. Derived from the
 * CONTRACT §۵ table + Issue #97 ACs, never from guesswork.
 */
export const EQA_GATE_REGISTRY: readonly EqaGateSpec[] = [
  {
    id: 'EQA-1',
    ruleFa: 'پیش‌دانش: تمام مفاهیم سنجش‌شدهٔ هر تمرین ⊆ تدریس‌شده تا آن نقطه از مسیر',
    source: 'CONTRACT §۴ S-1 · QUESTION_ARCH §۲-۵ (DD-096) · #96',
    scope:
      'خطا: targetConcept (+assessesConcepts در صورت تألیف) باید در ایستگاه‌های با order ≤ میزبان تدریس شده باشد؛ برای انواع «درک خط» (audio-meaning/gist-select/listen-who-asked) همهٔ خوشه‌های گرامری لنگرشده به خط منبع و واژه‌های آن خط نیز باید تدریس‌شده باشند. هشدار: ارجاع به مفهوم ثبت‌نشده (مثل زیرمهارت‌های شنیداری بدون teachesConcepts). خارج از دسترس ماشینی: معناشمولی صورت‌سؤال (ذرات لنگرنشده مانند の) → پروتکل انسانی EQA-9؛ پس از تألیف assessesConcepts کامل می‌شود.',
    owner: 'Content Author + CI',
  },
  {
    id: 'EQA-2',
    ruleFa: 'تعامل: حداکثر ۲ بلوک توضیحی پیاپی، حداکثر ۳ کارت واژه پیاپی، و هر ایستگاه آموزشی حداقل یک تعامل فعال',
    source: 'DD-94 §۳/§۴ · CONTRACT §۲-۱/§۴ S-3/S-4 · #95',
    scope:
      'خطا (ایستگاه‌های آموزشی؛ anchor/mastery طبق طراحی A/D معاف): رشتهٔ بلوک توضیحی > ۲، رشتهٔ کارت واژه > ۳، کش دریافت پیاپی > ۴، و ایستگاه core با ملاک غیر-viewed بدون هیچ بلوک تعاملی. خارج از دسترس: «بودجهٔ تعامل ≥۵۰٪» رویدادمحور است و به دادهٔ واقعی کاربر نیاز دارد (DD-94 §۴-۱ → EQA-11 پس از auth، #109).',
    owner: 'Content Author + CI',
  },
  {
    id: 'EQA-3',
    ruleFa: 'Recall-first: سهم اقلام بازیابی-اول در استخر practice فصل ≥ ۶۰٪ (و meaning-select ≤ ۳۰٪)',
    source: 'DD-013 · QUESTION_ARCH §۳ · exercise-design §۱ · CONTRACT §۵',
    scope:
      'خطا: نسبت اقلام recall-first (طبقه‌بندی بستهٔ انواع در EQA_POLICY) در استخر practice زیر آستانه، یا سهم meaning-select بالای سقف. مرز: طبقه‌بندی بر اساس «نوع» است نه محتوای هر آیتم — انحراف معنایی صورت‌سؤال → EQA-9.',
    owner: 'Content Author + CI',
  },
  {
    id: 'EQA-4',
    ruleFa: 'تعادل: توزیع موقعیت گزینهٔ درستِ ارائه‌شده به کاربر بدون انحراف معنی‌دار از توازن یکنواخت',
    source: 'QUESTION_ARCH §۲-۴ · CONTRACT §۵ · #97',
    scope:
      'خطا: در استخرهای ≥ ۱۵ آیتم، آزمون خی‌دو موقعیت‌های ارائه‌شده (پس از shuffle قطعی سرور — همان چیزی که کاربر می‌بیند) در سطح α=۰٫۰۵ معنی‌دار نباشد؛ در همهٔ استخرها سهم هر موقعیت ≤ ⅔. استخرهای کوچک‌تر از ۱۵: فقط قاعدهٔ ⅔ (آزمون آماری قابل‌اعتماد نیست).',
    owner: 'CI',
  },
  {
    id: 'EQA-5',
    ruleFa: 'پوشش سنجش: هر objectiveCode فصل حداقل یک فرصت practice و یک سنجهٔ mastery دارد',
    source: 'CONTRACT §۱ · #97 CI-5 · DD-048',
    scope:
      'خطا: objectiveCode بدون هیچ تمرین practice (بلوک exercise یا تعامل نمره‌دار) یا بدون حضور در معماری سنجش (قلم mastery بانک دروازه یا ملاک completion نمره‌دار ایستگاه تولید). مرز: اهدافِ stage A (gist) از طریق سنجهٔ M1 دروازه سنجیده می‌شوند — anchor معاف از الزام practice.',
    owner: 'Content Author + CI',
  },
  {
    id: 'EQA-6',
    ruleFa: 'کامل‌بودن داده: هر کارت واژه تمام اسلات‌های الزامی §۲-۲ قرارداد را دارد',
    source: 'CONTRACT §۲-۲ (بستن #104) · DD-116',
    scope:
      'خطا: term/readingKana/meaningFa/noteFa (کاربرد ≥ یک‌خطی)/surfaceInLine خالی یا کوتاه؛ termFurigana نبودن وقتی term کانجی دارد؛ lineRef نامعتبر. اسلات صدای مستقل واژه (D-3) با رسیدن فیلد wordAudio در TASK-LEARNING-05 فعال می‌شود (الان not-checkable — ثبت‌شده).',
    owner: 'Content Author + CI',
  },
  {
    id: 'EQA-7',
    ruleFa: 'اعداد از سیاست: هیچ آستانهٔ گیت/mastery در منطق محصول هاردکد نیست — همه از level_policy تزریق می‌شوند',
    source: 'CONTRACT §۱ · LESSON_ENGINE §۱ (DD-101) · #110',
    scope:
      'خطا: levelCode فصل در LEVEL_POLICIES نباشد؛ مقدار gate سیاست خارج بازهٔ مستند؛ minMeasure > weighted؛ نقض یکنوایی تشدید آستانه L2→L7. تضمین ساختاری: computeMastery فقط آستانهٔ تزریق‌شده می‌پذیرد (امکان پاس‌دادن stage هاردکد وجود ندارد) + تست سنکرون LEVEL_MATRIX §۶.',
    owner: 'Engineering + CI',
  },
] as const;
