/**
 * HANASO — content lifecycle + Gate P2 (publish readiness) — KANJI-TWO-PHASE §۵, 2026-11-22.
 *
 * «در موتور وضعیت هر محتوا و ایستگاه باید مشخص باشد:»
 *   استخراج انجام شده؟ · پیش‌نیازها اعتبارسنجی شده؟ · طراحی آموزشی انجام
 *   شده؟ · همهٔ بلوک‌های آموزش/تمرین کامل‌اند؟ · اعتبارسنجی نهایی موفق
 *   بوده؟ · مجوز انتشار دارد؟
 *
 * This module computes that state (per chapter AND per station) and enforces
 * Gate P2 — the INDEPENDENT gate between phase 2 and publication:
 *
 *   G2-PLAN    phase-2 fidelity: the authored chapter matches the ACCEPTED
 *              plan (stations, orders, types, item→station assignments).
 *              Any deviation is a HARD finding — «تغییر پیش‌نیازها توسط
 *              ایجنت تولید درس بدون اعتبارسنجی مجدد» — the fix is re-running
 *              Gate P1 on a revised plan, never silently authoring around it.
 *   G2-AUTHOR  the lesson is really authored: every teaching station carries
 *              teaching material AND a graded/interactive block; every
 *              exercise carries the feedback ladder (f1/f2/f3 — the W-E
 *              self-contained contract).
 *   G2-COMPLETE the deck is complete for its station type: a vocab station
 *              has the vocab-cards of its planned words; a kanji station has
 *              the kanji-cards of its planned kanji; no empty decks.
 *   G2-VALIDATE the final validation passed: compile (0 hard), pedagogical
 *              validator (0 hard), EQA (0 unwaived errors) — passed in as the
 *              authoritative reports, never re-derived here.
 *
 * publishPermission is an EXPLICIT owner flag (never computed) — «صرف داشتن
 * عنوان، واژگان و ساختار اولیه یک ایستگاه را آماده تدریس یا قابل‌انتشار
 * نمی‌کند».
 */
import type { Chapter, Station, TeachingBlock } from '../curriculum/types';
import { blockIsInteractive } from '../curriculum/eqa/policy';
import type { CurriculumPlan, PlanFinding } from './plan-types';
import { gateP1ValidatePlan } from './plan-validate';

export type ContentPhase =
  | 'legacy' // shipped before the two-phase architecture; no plan on file (grandfathered, documented)
  | 'absent' // no plan, no draft
  | 'extracted' // phase 1 output exists — NOT accepted yet (Gate P1 pending)
  | 'planned' // Gate P1 PASSED (accepted plan) — phase 2 may begin
  | 'authored' // phase 2 output exists and passes G2-PLAN/G2-AUTHOR/G2-COMPLETE
  | 'validated' // authored + G2-VALIDATE green (compile + validator + EQA)
  | 'publishable'; // validated + explicit publishPermission (owner)

export interface StationLifecycle {
  stationId: string;
  /** The station exists in an accepted (or pending) plan — extraction named it. */
  extractionDone: boolean;
  /** The plan's prereqs/orders for this station passed Gate P1. */
  prereqsValidated: boolean;
  /** The station's deck is authored (teaching material + a graded/interactive block). */
  authoringDone: boolean;
  /** The deck is complete for its station type (cards for every planned item). */
  blocksComplete: boolean;
  /** The chapter-level final validation (compile + validator + EQA) passed. */
  finalValidationPassed: boolean;
  /** Explicit owner permission — never computed. */
  publishPermission: boolean;
}

export interface ChapterLifecycle {
  chapterId: string;
  phase: ContentPhase;
  stations: StationLifecycle[];
  /** Gate P1 report of the plan on file (null = no plan). */
  planGate: ReturnType<typeof gateP1ValidatePlan> | null;
  /** Gate P2 findings (publish readiness). */
  gate2: { passed: boolean; hardCount: number; softCount: number; findings: PlanFinding[] };
}

/* ------------------------------------------------------------------ block predicates */

/** The interactive/graded predicate — re-exported from the EQA policy module
 *  (the ONE canonical definition; never a private re-implementation). */
const isGradedOrInteractive = blockIsInteractive;

function deckHasTeachingMaterial(blocks: TeachingBlock[]): boolean {
  return blocks.some(
    (b) =>
      b.kind === 'vocab-card' ||
      b.kind === 'expression-card' ||
      b.kind === 'kana-card' ||
      b.kind === 'kanji-card' ||
      b.kind === 'rule-card' ||
      b.kind === 'rule-prereq' ||
      b.kind === 'rule-step' ||
      b.kind === 'rule-contrast' ||
      b.kind === 'example-set' ||
      b.kind === 'dialogue-player' ||
      b.kind === 'scene' ||
      b.kind === 'character-scene' ||
      b.kind === 'realworld-board' ||
      b.kind === 'word-wall' ||
      b.kind === 'listening-task',
  );
}

/**
 * A deck with ONLY framing (scene/wrap-up copy) — the «title + initial
 * structure» class the mission rejects («صرف داشتن عنوان، واژگان و ساختار
 * اولیه یک ایستگاه را آماده تدریس یا قابل‌انتشار نمی‌کند»). Drill/practice
 * decks whose whole content is authored exercises are REAL content, not
 * framing — they pass (their graded material is checked by G2-AUTHOR).
 */
function deckIsOnlyFraming(blocks: TeachingBlock[]): boolean {
  if (blocks.length === 0) return true; // a literally empty deck
  return blocks.every((b) => b.kind === 'scene' || b.kind === 'wrap-up');
}

function feedbackLadderComplete(chapter: Chapter, station: Station): boolean {
  return station.blocks.every((b) => {
    if (b.kind !== 'exercise') return true;
    return b.exerciseIds.every((id) => {
      const ex = chapter.exercises[id];
      if (!ex) return false;
      return Boolean(ex.feedback?.f1Fa && ex.feedback?.f2HintFa && ex.feedback?.f3ExplainFa);
    });
  });
}

/* ------------------------------------------------------------------ Gate P2 */

export interface GateP2ValidationReports {
  /** compileEngineChapter hard findings count (0 = green). */
  compileHard: number;
  /** validateEngineChapter (draft mode) hard count (0 = green). */
  validatorHard: number;
  /** EQA unwaived error count for this chapter (0 = green). */
  eqaUnwaived: number;
}

export interface GateP2Options {
  /** The accepted plan on file for this chapter (null = no plan → legacy mode). */
  plan: CurriculumPlan | null;
  validation: GateP2ValidationReports;
  /** Explicit owner publish permission — never derived. */
  publishPermission: boolean;
}

export function gateP2PublishReadiness(chapter: Chapter, options: GateP2Options): ChapterLifecycle['gate2'] {
  const findings: PlanFinding[] = [];
  const push = (rule: string, severity: 'hard' | 'soft', location: string, message: string) => {
    findings.push({ rule, severity, message, location });
  };

  const { plan, validation } = options;
  const stationsBySlug = new Map(chapter.stations.map((s) => [s.slug, s]));

  /* ---- G2-PLAN: fidelity to the accepted plan ---- */
  if (plan) {
    const p1 = gateP1ValidatePlan(plan);
    if (!p1.passed) {
      push(
        'G2-PLAN',
        'hard',
        'plan',
        `نقشهٔ پیوست فصل اعتبارسنجی P1 را نمی‌گذرد (${p1.hardCount} خطا) — نقشهٔ پذیرفته‌شده معتبر نیست.'`,
      );
    }
    if (plan.chapterId !== chapter.slug) {
      push('G2-PLAN', 'hard', 'plan', `نقشه برای فصل ${plan.chapterId} است اما روی فصل ${chapter.slug} اعمال شده است.`);
    }
    for (const ps of plan.stations) {
      const st = stationsBySlug.get(ps.id);
      if (!st) {
        push(
          'G2-PLAN',
          'hard',
          `station[${ps.id}]`,
          `ایستگاه ${ps.id} در نقشهٔ پذیرفته‌شده هست اما در فصل تدریس‌شده نیست — مرحلهٔ دوم نقشه را کامل نکرده است.`,
        );
        continue;
      }
      if (st.order !== ps.order) {
        push(
          'G2-PLAN',
          'hard',
          `station[${ps.id}]`,
          `ترتیب ایستگاه ${ps.id} در فصل ${st.order} است اما در نقشه ${ps.order} — تغییر ترتیب آموزشی توسط مرحلهٔ دوم بدون اعتبارسنجی مجدد.`,
        );
      }
      const expectedType =
        ps.domain === 'anchor'
          ? 'anchor'
          : ps.domain === 'vocab'
            ? 'vocab'
            : ps.domain === 'grammar'
              ? 'grammar'
              : ps.domain === 'kana'
                ? 'kana'
                : ps.domain === 'kanji'
                  ? 'kanji'
                  : ps.domain === 'listening'
                    ? 'listen'
                    : ps.domain === 'practice'
                      ? 'practice'
                      : ps.domain === 'review'
                        ? 'review'
                        : ps.type === 'practice'
                          ? 'practice'
                          : 'structure';
      /* The runtime's station types are finer-grained than the plan's domains
       * (structure≡grammar · expression≡vocab · integrate≡deepdive…): family
       * mismatches are SOFT notes. The DEDICATED kanji station is the one
       * hard wall — a plan-placed kanji station that authored into another
       * type is a contract breach (EQA-12 K1's plan-side twin). */
      if (ps.domain === 'kanji' && st.type !== 'kanji') {
        push(
          'G2-PLAN',
          'hard',
          `station[${ps.id}]`,
          `ایستگاه کانجی نقشه (${ps.id}) در فصل با نوع ${st.type} تألیف شده — تدریس کانجی فقط در ایستگاه اختصاصی kanji مجاز است.`,
        );
      } else if (st.type !== expectedType && ps.type === 'teaching') {
        push(
          'G2-PLAN',
          'soft',
          `station[${ps.id}]`,
          `نوع ایستگاه ${ps.id} (${st.type}) با دامنهٔ نقشه (${ps.domain} → ${expectedType}) هم‌خوان نیست — بازبینی.`,
        );
      }
      for (const p of ps.prerequisites) {
        if (!st.prerequisites.includes(p)) {
          push(
            'G2-PLAN',
            'hard',
            `station[${ps.id}]`,
            `پیش‌نیاز ${p} در نقشه هست اما در فصل تدریس‌شده حذف شده است — تغییر پیش‌نیازها توسط مرحلهٔ دوم.`,
          );
        }
      }
    }
    for (const st of chapter.stations) {
      if (!plan.stations.some((ps) => ps.id === st.slug)) {
        push(
          'G2-PLAN',
          'hard',
          `station[${st.slug}]`,
          `ایستگاه ${st.slug} در فصل هست اما در نقشهٔ پذیرفته‌شده نیست — ایستگاهِ خارج از طرح (بدون اعتبارسنجی مجدد نقشه).`,
        );
      }
    }
    /* item-level: planned words taught at their planned stations. */
    for (const v of plan.vocabulary) {
      const host = chapter.stations.find((s) => s.blocks.some((b) => b.kind === 'vocab-card' && b.wordId === v.id));
      if (!host) {
        push(
          'G2-COMPLETE',
          'hard',
          `vocabulary[${v.id}]`,
          `واژهٔ ${v.id} از نقشه در هیچ ایستگاه فصل با vocab-card تدریس نشده است — بلوک آموزش ناقص.`,
        );
        continue;
      }
      if (host.slug !== v.teachStationId) {
        push(
          'G2-PLAN',
          'hard',
          `vocabulary[${v.id}]`,
          `واژهٔ ${v.id} در ایستگاه ${host.slug} تدریس شده اما نقشه ${v.teachStationId} را تعیین کرده بود — واگذاری تغییر کرده بدون اعتبارسنجی مجدد.`,
        );
      }
    }
    for (const k of plan.kanji) {
      const declared = chapter.kanji?.some((item) => item.kanjiId === `kj-${k.character.codePointAt(0)!.toString(16)}`);
      const host = chapter.stations.find(
        (s) =>
          s.type === 'kanji' &&
          s.blocks.some(
            (b) => b.kind === 'kanji-card' && b.kanjiId === `kj-${k.character.codePointAt(0)!.toString(16)}`,
          ),
      );
      if (!declared || !host) {
        push(
          'G2-COMPLETE',
          'hard',
          `kanji[${k.character}]`,
          `کانجی ${k.character} از نقشه در فصل تدریس نشده است (ایستگاه اختصاصی/اعلام kanji ناقص) — بلوک آموزش کانجی ناقص.`,
        );
        continue;
      }
      if (host.slug !== k.teachStationId) {
        push(
          'G2-PLAN',
          'hard',
          `kanji[${k.character}]`,
          `کانجی ${k.character} در ایستگاه ${host.slug} تدریس شده اما نقشه ${k.teachStationId} را تعیین کرده بود.`,
        );
      }
    }
  }

  /* ---- G2-AUTHOR / G2-COMPLETE: authored and complete decks ---- */
  for (const station of chapter.stations) {
    const graded = station.blocks.some(isGradedOrInteractive);
    const teaching = deckHasTeachingMaterial(station.blocks);
    const onlyFraming = station.blocks.length === 0 || deckIsOnlyFraming(station.blocks);
    if (station.core && station.completion.kind !== 'viewed' && !graded) {
      push(
        'G2-AUTHOR',
        'hard',
        `station[${station.slug}]`,
        `ایستگاه ${station.slug} ملاک نمره‌دار دارد اما هیچ بلوک نمره‌دار/تعاملی ندارد — طراحی آموزشی ناقص.`,
      );
    }
    if (onlyFraming) {
      push(
        'G2-COMPLETE',
        'hard',
        `station[${station.slug}]`,
        `ایستگاه ${station.slug} فقط عنوان/چارچوب است (دک خالی یا فقط کپی صحنه/جمع‌بندی) — محتوای آموزشی واقعی ندارد و آماده تدریس نیست.`,
      );
    }
    if (station.type === 'kanji' && !station.blocks.some((b) => b.kind === 'kanji-card')) {
      push('G2-COMPLETE', 'hard', `station[${station.slug}]`, `ایستگاه kanji بدون کانجی‌کارت — بلوک آموزش کانجی ناقص.`);
    }
    if (station.type === 'vocab' && station.core && !station.blocks.some((b) => b.kind === 'vocab-card')) {
      push(
        'G2-COMPLETE',
        'hard',
        `station[${station.slug}]`,
        `ایستگاه واژگان core بدون هیچ vocab-card — بلوک آموزش واژه ناقص.`,
      );
    }
    if (!feedbackLadderComplete(chapter, station)) {
      push(
        'G2-AUTHOR',
        'hard',
        `station[${station.slug}]`,
        `ایستگاه ${station.slug} تمرین بدون نردبان بازخورد کامل (f1/f2/f3) دارد — قرارداد نردبان خودبسنده نقض شده.`,
      );
    }
    void teaching;
  }

  /* ---- G2-VALIDATE: the final validation reports ---- */
  if (validation.compileHard > 0)
    push('G2-VALIDATE', 'hard', 'compile', `کامپایل ${validation.compileHard} خطای سخت دارد — فصل قابل انتشار نیست.`);
  if (validation.validatorHard > 0)
    push(
      'G2-VALIDATE',
      'hard',
      'validator',
      `اعتبارسنجی آموزشی ${validation.validatorHard} خطای سخت دارد — فصل قابل انتشار نیست.`,
    );
  if (validation.eqaUnwaived > 0)
    push(
      'G2-VALIDATE',
      'hard',
      'eqa',
      `گیت‌های EQA ${validation.eqaUnwaived} خطای بدون-معافیت دارند — فصل قابل انتشار نیست.`,
    );

  /* publish permission: explicit, never computed — a missing owner flag is a
   * soft note at gate level (the gate PROVES readiness; the owner flips it). */
  if (findings.every((f) => f.severity !== 'hard') && !options.publishPermission) {
    push(
      'G2-PUBLISH',
      'soft',
      'chapter',
      'همهٔ گیت‌های ماشینی سبز است اما مجوز انتشار (مالک) هنوز صادر نشده — انتشار فقط با تأیید مالک.',
    );
  }

  const hardCount = findings.filter((f) => f.severity === 'hard').length;
  return { passed: hardCount === 0, hardCount, softCount: findings.length - hardCount, findings };
}

/* ------------------------------------------------------------------ the lifecycle */

export function computeChapterLifecycle(
  chapter: Chapter,
  options: GateP2Options & { legacy?: boolean },
): ChapterLifecycle {
  const gate2 = gateP2PublishReadiness(chapter, options);
  const planStationIds = new Set(options.plan?.stations.map((s) => s.id) ?? []);
  const p1 = options.plan ? gateP1ValidatePlan(options.plan) : null;
  const validationGreen =
    options.validation.compileHard === 0 &&
    options.validation.validatorHard === 0 &&
    options.validation.eqaUnwaived === 0;

  const stations: StationLifecycle[] = chapter.stations.map((st) => {
    const graded = st.blocks.some(isGradedOrInteractive);
    const teaching = deckHasTeachingMaterial(st.blocks);
    const plannedHere =
      st.type === 'vocab'
        ? st.blocks.some((b) => b.kind === 'vocab-card')
        : st.type === 'kanji'
          ? st.blocks.some((b) => b.kind === 'kanji-card')
          : true;
    return {
      stationId: st.slug,
      extractionDone: options.legacy || planStationIds.has(st.slug),
      prereqsValidated: options.legacy || (p1?.passed ?? false),
      authoringDone: teaching && graded,
      blocksComplete: teaching && plannedHere && feedbackLadderComplete(chapter, st),
      finalValidationPassed: validationGreen,
      publishPermission: options.publishPermission,
    };
  });

  let phase: ContentPhase;
  if (options.legacy && !options.plan) {
    phase = 'legacy';
  } else if (!options.plan) {
    phase = 'absent';
  } else if (!p1?.passed) {
    phase = 'extracted';
  } else if (gate2.hardCount > 0) {
    phase = 'planned';
  } else if (!validationGreen) {
    phase = 'authored';
  } else if (!options.publishPermission) {
    phase = 'validated';
  } else {
    phase = 'publishable';
  }

  return { chapterId: chapter.slug, phase, stations, planGate: p1, gate2 };
}
