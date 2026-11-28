/**
 * HANASO — EQA-10: station teaching contracts (ENGINE-REFORM 2026-11-22).
 *
 * «هر نوع ایستگاه قرارداد آموزشی مخصوص خودش را دارد — نه یک الگوی عمومی.»
 *
 * The staged-teaching pattern of the teaching framework (teaching-interaction
 * model D-0010/0011/0012 — the difficulty ladder the lesson engine already
 * encodes as teach=1 / guided=2 / independent=3), enforced ON THE DECK:
 *
 *  C-first-engage (error) — after every teaching PACKET (a maximal run of
 *      card blocks: kana/vocab/expression cards), the immediate next exercise
 *      block must contain at least one difficulty-1 item: «هر بار مقدار کمی
 *      مطلب جدید تدریس می‌شود، بلافاصله پس از آن فقط یک فعالیت کوتاه و ساده».
 *      The first questions must be answerable directly from the teaching.
 *  C-worked-before-decode (error) — inside a TEACHING-type station, the first
 *      kana-decode exercise block must be preceded by a worked model (an
 *      example-set with a reading moment, or a real-world material board):
 *      the skill is MODELED before it is tested. Review/practice stations are
 *      exempt (they teach nothing new — their material is prior teaching).
 *  C-guided-first (error) — a difficulty-3 (independent) exercise may only
 *      appear after the same target concept has had at least one guided
 *      (difficulty ≤ 2) assessment earlier in the course — «تمرین مستقل و
 *      جدی فقط بعد از آموزش و تمرین هدایت‌شده».
 *  C-type-structure (error) — the minimal per-type contract: each station
 *      type must carry its required teaching/interaction blocks (a vocab
 *      station teaches with vocab cards; a grammar station with rule/guided
 *      blocks; …) and a core station with a graded completion must have a
 *      scored interaction (S-4 alignment).
 *
 * The difficulty ladder is the ONLY staging datum the runtime model carries
 * (the lesson engine compiles stage→difficulty); enforcing it here makes the
 * «موتور بدون آموزش کافی سراغ آزمون می‌رود» pattern a build failure.
 */
import type { Chapter, TeachingBlock } from '../types';
import type { EqaFinding } from '../eqa/policy';
import { stationsInWalkOrder } from '../eqa/model';

const CARD_KINDS = new Set(['kana-card', 'vocab-card', 'expression-card', 'kanji-card']);
const WORKED_MODEL_KINDS = new Set(['example-set', 'realworld-board']);

/** Station types whose decks TEACH new content (the staged contracts apply).
 *  Review/practice/mastery stations consolidate — no new content, no staging duty. */
const TEACHING_STATION_TYPES = new Set([
  'kana',
  'vocab',
  'grammar',
  'structure',
  'expression',
  'listen',
  'integrate',
  'deepdive',
  /* AUDIO-UNIT/KANJI 2026-11-23 §۲ — the DEDICATED kanji station teaches new
   * content (its kanji-cards are the teaching event); the staged contracts
   * (packet → immediate d1 engage) apply to it exactly like every other
   * teaching type. */
  'kanji',
]);

/** One assessment event in the course, position-ordered — the staging history. */
export interface AssessmentEvent {
  chapterSlug: string;
  stationSlug: string;
  exerciseId: string;
  concept: string;
  difficulty: 1 | 2 | 3;
  /** (chapterIndex + 1) * 1_000_000 + stationOrder * 1000 + blockIndex — deck order. */
  position: number;
}

/** Flatten every practice exercise of the course (mastery pool excluded — the
 *  gate bank is the chapter gate's own architecture, QUESTION §۵-۱) into
 *  position-ordered assessment events. */
export function buildCourseAssessmentEvents(chapters: Chapter[]): AssessmentEvent[] {
  const events: AssessmentEvent[] = [];
  chapters.forEach((chapter) => {
    const ordered = stationsInWalkOrder(chapter);
    for (const station of ordered) {
      station.blocks.forEach((block) => {
        if (block.kind !== 'exercise') return;
        for (const id of block.exerciseIds) {
          const ex = chapter.exercises[id];
          if (!ex || ex.assessmentRole !== 'practice') continue;
          events.push({
            chapterSlug: chapter.slug,
            stationSlug: station.slug,
            exerciseId: id,
            concept: ex.targetConcept,
            difficulty: ex.difficulty,
            /* B4-REBUILD §E1 — the position must distinguish exercises WITHIN
             * one block: the old formula (chapter · station · block only) gave
             * every item of a drill the SAME position, so a guided (≤d2) round
             * could never count as "earlier" than an independent (d3) round of
             * the same concept in the same block — C-guided-first went blind
             * exactly where the ladders live (stn-13's cloze→prod pair was
             * waived as debt while the guided round sat right beside it). A
             * strict running counter is order-total by construction and cannot
             * collide. */
            position: events.length,
          });
        }
      });
    }
  });
  return events;
}

/** The minimal structural contract per station type — the machine core of
 *  «هر نوع ایستگاه چه ترتیب، محتوای آموزشی، مثال، تعامل و تمرینی لازم دارد». */
export const STATION_TYPE_CONTRACT: Record<
  string,
  { ruleFa: string; requires: (b: TeachingBlock) => boolean; requirementFa: string }
> = {
  kana: {
    ruleFa: 'ایستگاه کانا: دست‌کم یک کارت/اسلاید قاعده + یک تمرین',
    requires: (b) =>
      b.kind === 'kana-card' ||
      b.kind === 'rule-card' ||
      b.kind === 'rule-step' ||
      b.kind === 'rule-prereq' ||
      b.kind === 'rule-contrast',
    requirementFa: 'kana-card یا بلوک قاعده (rule-*)',
  },
  vocab: {
    ruleFa: 'ایستگاه واژگان: دست‌کم یک کارت واژه + یک تمرین',
    requires: (b) => b.kind === 'vocab-card',
    requirementFa: 'vocab-card',
  },
  expression: {
    ruleFa: 'ایستگاه عبارت: دست‌کم یک کارت عبارت + یک تمرین',
    requires: (b) => b.kind === 'expression-card',
    requirementFa: 'expression-card',
  },
  grammar: {
    ruleFa: 'ایستگاه گرامر: دست‌کم یک بلوک قاعده/کشف هدایت‌شده + یک تمرین',
    requires: (b) => b.kind === 'rule-card' || b.kind === 'guided-discovery' || b.kind === 'structured-input',
    requirementFa: 'rule-card/guided-discovery/structured-input',
  },
  structure: {
    ruleFa: 'ایستگاه ساختار: دست‌کم یک بلوک قاعده/کشف هدایت‌شده + یک تمرین',
    requires: (b) => b.kind === 'rule-card' || b.kind === 'guided-discovery' || b.kind === 'structured-input',
    requirementFa: 'rule-card/guided-discovery/structured-input',
  },
  listen: {
    ruleFa: 'ایستگاه شنیدن: دست‌کم یک تکلیف شنیداری/پخش مکالمه + یک تمرین',
    requires: (b) => b.kind === 'listening-task' || b.kind === 'dialogue-player',
    requirementFa: 'listening-task/dialogue-player',
  },
  /* AUDIO-UNIT/KANJI 2026-11-23 §۲ — the dedicated kanji station's minimal
   * contract: its kanji-card (the ONLY legal teaching event for kanji —
   * EQA-12 K1) + an exercise. */
  kanji: {
    ruleFa: 'ایستگاه کانجی: دست‌کم یک کانجی‌کارت اختصاصی + یک تمرین',
    requires: (b) => b.kind === 'kanji-card',
    requirementFa: 'kanji-card',
  },
  practice: {
    ruleFa: 'ایستگاه تمرین: دست‌کم یک بلوک تمرین (بدون محتوای جدید)',
    requires: (b) => b.kind === 'exercise',
    requirementFa: 'exercise',
  },
  review: {
    ruleFa: 'ایستگاه مرور: دست‌کم یک بلوک بازیابی/بازخوانی هدایت‌شده',
    requires: (b) =>
      b.kind === 'exercise' || b.kind === 'drill-menu' || b.kind === 'example-set' || b.kind === 'dialogue-player',
    requirementFa: 'exercise/drill-menu/example-set/dialogue-player',
  },
  anchor: {
    ruleFa: 'ایستگاه لنگر: پخش مکالمهٔ محوری + بازبینی فهمِ پس از مشاهده (بدون پرسش حدسیِ نمره‌دار)',
    requires: (b) => b.kind === 'dialogue-player',
    requirementFa: 'dialogue-player',
  },
  integrate: {
    ruleFa: 'ایستگاه انتقال: صحنهٔ شخصیت با تمرین تولید',
    requires: (b) => b.kind === 'character-scene',
    requirementFa: 'character-scene',
  },
  mastery: {
    ruleFa: 'دروازهٔ فصل: بانک سنجش',
    requires: (b) => b.kind === 'exercise',
    requirementFa: 'exercise (mastery bank)',
  },
};

export function gateEqa10(chapter: Chapter, courseEvents: AssessmentEvent[]): EqaFinding[] {
  const findings: EqaFinding[] = [];
  const ordered = stationsInWalkOrder(chapter);

  for (const station of ordered) {
    const isTeaching = TEACHING_STATION_TYPES.has(station.type);

    /* C-type-structure */
    const contract = STATION_TYPE_CONTRACT[station.type];
    if (contract && !station.blocks.some(contract.requires)) {
      findings.push({
        gate: 'EQA-10',
        severity: 'error',
        subject: station.slug,
        rule: 'C-type-structure',
        messageFa: `ایستگاه ${station.slug} (نوع ${station.type}) بلوک الزامی نوع خود را ندارد: ${contract.requirementFa} — قرارداد آموزشی نوع ایستگاه نقض شد.`,
        ruleRef: 'ENGINE-REFORM §۴ C-type-structure · station-blueprint §۱',
      });
    }

    /* C-first-engage: every maximal card run must be followed by an exercise
     * block containing a difficulty-1 item. Findings dedupe PER STATION (the
     * message lists every offending packet). */
    if (isTeaching) {
      const blocks = station.blocks;
      const offendingPackets: string[] = [];
      let runStart = -1;
      for (let i = 0; i <= blocks.length; i++) {
        const isCard = i < blocks.length && CARD_KINDS.has(blocks[i]!.kind);
        if (isCard) {
          if (runStart < 0) runStart = i;
          continue;
        }
        if (runStart < 0) continue;
        const runKinds = blocks
          .slice(runStart, i)
          .map((b) =>
            b.kind === 'kana-card'
              ? ((b as { kanaId?: string }).kanaId ?? 'kana-card')
              : b.kind === 'vocab-card'
                ? ((b as { wordId?: string }).wordId ?? 'vocab-card')
                : b.kind === 'expression-card'
                  ? ((b as { expressionId?: string }).expressionId ?? 'expression-card')
                  : b.kind,
          )
          .join('، ');
        const next = blocks[i];
        const ok =
          next?.kind === 'exercise' && next.exerciseIds.some((id) => (chapter.exercises[id]?.difficulty ?? 0) === 1);
        if (!ok) offendingPackets.push(runKinds);
        runStart = -1;
      }
      if (offendingPackets.length > 0) {
        findings.push({
          gate: 'EQA-10',
          severity: 'error',
          subject: station.slug,
          rule: 'C-first-engage',
          messageFa: `در ایستگاه ${station.slug}، ${offendingPackets.length} پکت آموزشی [${offendingPackets.join(' ← ')}] بدون درگیرسازی ساده رها شده‌اند — پس از هر آموزشِ مقدار کم، بلافاصله یک فعالیت کوتاه و ساده (difficulty 1) باید بیاید؛ پاسخ باید از همان آموزش قابل تشخیص باشد.`,
          ruleRef: 'ENGINE-REFORM §۴ C-first-engage · teaching-interaction-model §۱ · DD-94 §۳',
        });
      }
    }

    /* C-worked-before-decode: the first kana-decode exercise of a TEACHING
     * station needs a worked model earlier in the deck. */
    if (isTeaching) {
      let firstDecodeIdx = -1;
      let workedIdx = -1;
      station.blocks.forEach((b, i) => {
        if (
          b.kind === 'exercise' &&
          firstDecodeIdx < 0 &&
          b.exerciseIds.some((id) => chapter.exercises[id]?.type === 'kana-decode')
        )
          firstDecodeIdx = i;
        if (WORKED_MODEL_KINDS.has(b.kind) && workedIdx < 0) workedIdx = i;
      });
      if (firstDecodeIdx >= 0 && (workedIdx < 0 || workedIdx > firstDecodeIdx)) {
        findings.push({
          gate: 'EQA-10',
          severity: 'error',
          subject: station.slug,
          rule: 'C-worked-before-decode',
          messageFa: `اولین تمرین رمزگشایی (kana-decode) ایستگاه ${station.slug} پیش از هر نمونهٔ الگو‌شده (example-set با لحظهٔ خواندن / realworld-board) در می‌آید — مهارت باید اول مدل‌سازی شود بعد سنجیده (بلوک ${firstDecodeIdx} در برابر ${workedIdx}).`,
          ruleRef: 'ENGINE-REFORM §۴ C-worked-before-decode · station-blueprint §۴',
        });
      }
    }

    /* C-guided-first: difficulty-3 items only after a ≤2 assessment of the same
     * concept EARLIER in the course (course-wide history, deck-ordered). */
    for (const b of station.blocks) {
      if (b.kind !== 'exercise') continue;
      for (const id of b.exerciseIds) {
        const ex = chapter.exercises[id];
        if (!ex || ex.difficulty !== 3) continue;
        const mine = courseEvents.find((e) => e.chapterSlug === chapter.slug && e.exerciseId === id);
        const priorGuided = courseEvents.some(
          (e) =>
            e.concept === ex.targetConcept && e.difficulty <= 2 && mine !== undefined && e.position < mine.position,
        );
        if (!priorGuided) {
          findings.push({
            gate: 'EQA-10',
            severity: 'error',
            subject: station.slug,
            rule: 'C-guided-first',
            messageFa: `تمرین مستقل (difficulty 3) ${id} روی مفهوم «${ex.targetConcept}» در ایستگاه ${station.slug} پیش از هر سنجش هدایت‌شدهٔ (≤ difficulty 2) همان مفهوم در کل مسیر می‌آید — تمرین جدی فقط بعد از آموزش و تمرین هدایت‌شده.`,
            ruleRef: 'ENGINE-REFORM §۴ C-guided-first · D-0012',
          });
        }
      }
    }
  }
  return findings;
}
