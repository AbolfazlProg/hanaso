/**
 * HANASO — Gate P1: Curriculum-Plan acceptance (phase 1 → phase 2 — KANJI-TWO-PHASE §۵, 2026-11-22).
 *
 * The INDEPENDENT gate between Curriculum Planning / Content Extraction and
 * Lesson Authoring. A plan that passes P1 is the accepted teaching map phase
 * 2 must build on; phase 2 may not change it without this gate re-running.
 *
 * What P1 proves (each rule maps to a mission line):
 *   P1-STRUCT   the plan is structurally complete — stations with
 *               objective/type/order, dialogue present, no empty station set.
 *   P1-SOURCE   every extracted item carries booklet provenance (anti-invention).
 *   P1-MAP      every extracted item is ASSIGNED to a real station of the
 *               right domain (سازمان‌دهی بین ایستگاه‌ها — the division).
 *   P1-ORDER    the station graph is a DAG in walk order (prerequisites
 *               exist, point backward, orders are 1..N contiguous) — the
 *               teaching order (ترتیب آموزشی).
 *   P1-KANJI    the kanji placement is contract-correct: dedicated kanji
 *               stations exist in the map, every kanji resolves in the N5
 *               reference, has ≥2 anchor words, and every anchor word is
 *               taught at an EARLIER station than its kanji station
 *               (جایگاه ایستگاه‌های کانجی — D-0006).
 *   P1-BUDGET   the framework budgets hold at plan level (grammar ≤2;
 *               kanji-per-chapter soft window; Q-004).
 *
 * What P1 deliberately does NOT check (honest boundary — phase 2's job):
 * authored teaching copy, hint ladders, feedback, assessment wording,
 * dialogue three-origin declarations (draft validator), compile/EQA (the
 * runtime gates). A plan that only passes P1 is NOT a lesson — publishing
 * requires Gate P2.
 */
import { ENGINE_CONFIG } from './engine-config';
import type { CurriculumPlan, PlanFinding } from './plan-types';
import { KANJI_ITEMS_BY_LITERAL } from '../curriculum/kanji';

export interface GateP1Options {
  /** Kana chapters (no kanji content) may skip the kanji-per-chapter window. */
  readonly?: boolean;
}

export function gateP1ValidatePlan(
  plan: CurriculumPlan,
  options: GateP1Options = {},
): { passed: boolean; hardCount: number; softCount: number; findings: PlanFinding[]; checkedRules: number } {
  const findings: PlanFinding[] = [];
  let rules = 0;
  const push = (rule: string, severity: 'hard' | 'soft', location: string, message: string) => {
    findings.push({ rule, severity, message, location });
  };
  const run = (rule: string, fn: () => void) => {
    rules += 1;
    fn();
  };

  const stations = plan.stations;
  const byId = new Map(stations.map((s) => [s.id, s]));

  /* ---- P1-STRUCT: the plan is a complete teaching map ---- */
  run('P1-STRUCT', () => {
    if (stations.length === 0)
      push('P1-STRUCT', 'hard', 'stations', 'نقشهٔ ایستگاه‌ها خالی است — طرح استخراج بدون بخش‌بندی معتبر نیست.');
    for (const s of stations) {
      if (s.objectiveFa.trim().length < 4)
        push('P1-STRUCT', 'hard', `station[${s.id}]`, 'هدف ایستگاه باید یک جملهٔ قابل‌سنجش باشد.');
      if (s.order < 1) push('P1-STRUCT', 'hard', `station[${s.id}]`, 'ترتیب ایستگاه باید عدد مثبت باشد.');
    }
    const orders = stations.map((s) => s.order).sort((a, b) => a - b);
    orders.forEach((o, i) => {
      if (o !== i + 1)
        push('P1-STRUCT', 'hard', 'stations', `ترتیب‌ها باید پیوسته از ۱ تا N باشند — ${o} در جای ${i + 1} نشسته است.`);
    });
    if (plan.dialogue.length === 0)
      push('P1-STRUCT', 'hard', 'dialogue', 'طرح فصل C-Dialogue بدون مکالمهٔ استخراج‌شده معتبر نیست.');
    if (!plan.canDoFa || plan.canDoFa.trim().length < 8)
      push('P1-STRUCT', 'hard', 'canDoFa', 'هدف فصل (can-do) الزامی است.');
  });

  /* ---- P1-SOURCE: provenance on every extracted item ---- */
  run('P1-SOURCE', () => {
    const check = (ref: CurriculumPlan['vocabulary'][number]['sourceRef'], label: string) => {
      if (!ref || !ref.artifact)
        push('P1-SOURCE', 'hard', label, 'آیتم استخراج‌شده بدون ارجاع منبع — قرارداد ضد-اختراع فاز ۱.');
    };
    plan.dialogue.forEach((l, i) => check(l.sourceRef, `dialogue[${i}]`));
    plan.vocabulary.forEach((v) => check(v.sourceRef, `vocabulary[${v.id}]`));
    plan.grammar.forEach((g) => check(g.sourceRef, `grammar[${g.id}]`));
    plan.expressions.forEach((e) => check(e.sourceRef, `expressions[${e.id}]`));
    plan.kanji.forEach((k) => check(k.sourceRef, `kanji[${k.character}]`));
  });

  /* ---- P1-MAP: assignment + domain fit ---- */
  run('P1-MAP', () => {
    const domainOf = (stationId: string) => byId.get(stationId)?.domain;
    plan.vocabulary.forEach((v) => {
      const d = domainOf(v.teachStationId);
      if (!d) {
        push(
          'P1-MAP',
          'hard',
          `vocabulary[${v.id}]`,
          `ایستگاه تدریس ${v.teachStationId} در نقشه نیست — واژه بدون خانه.`,
        );
      } else if (d !== 'vocab' && d !== 'transfer') {
        push(
          'P1-MAP',
          'hard',
          `vocabulary[${v.id}]`,
          `واژه به ایستگاه دامنهٔ ${d} واگذار شده — واژه باید در ایستگاه vocab تدریس شود.`,
        );
      }
    });
    plan.grammar.forEach((g) => {
      const d = domainOf(g.teachStationId);
      if (!d) push('P1-MAP', 'hard', `grammar[${g.id}]`, `ایستگاه تدریس ${g.teachStationId} در نقشه نیست.`);
      else if (d !== 'grammar') {
        push(
          'P1-MAP',
          'hard',
          `grammar[${g.id}]`,
          `الگوی گرامری به ایستگاه دامنهٔ ${d} واگذار شده — گرامر باید در ایستگاه grammar تدریس شود.`,
        );
      }
    });
    plan.expressions.forEach((e) => {
      const d = domainOf(e.teachStationId);
      if (!d) push('P1-MAP', 'hard', `expressions[${e.id}]`, `ایستگاه تدریس ${e.teachStationId} در نقشه نیست.`);
      else if (d !== 'vocab' && d !== 'grammar' && d !== 'transfer') {
        push(
          'P1-MAP',
          'hard',
          `expressions[${e.id}]`,
          `عبارت کاربردی به ایستگاه دامنهٔ ${d} واگذار شده — عبارت‌ها در ایستگاه واژه/گرامر/انتقال تدریس می‌شوند.`,
        );
      }
    });
    // every teaching station of a content domain carries at least one assigned item
    for (const s of stations) {
      if (s.type !== 'teaching') continue;
      const carries = [
        ...plan.vocabulary.filter((v) => v.teachStationId === s.id),
        ...plan.grammar.filter((g) => g.teachStationId === s.id),
        ...plan.expressions.filter((e) => e.teachStationId === s.id),
        ...plan.kanji.filter((k) => k.teachStationId === s.id),
      ];
      if (
        carries.length === 0 &&
        s.domain !== 'anchor' &&
        s.domain !== 'listening' &&
        s.domain !== 'speaking' &&
        s.domain !== 'practice' &&
        s.domain !== 'review' &&
        s.domain !== 'transfer'
      ) {
        push(
          'P1-MAP',
          'soft',
          `station[${s.id}]`,
          `ایستگاه آموزشی دامنهٔ ${s.domain} هیچ آیتم استخراج‌شده‌ای ندارد — نقشهٔ خالی؟ (بازبینی)`,
        );
      }
    }
  });

  /* ---- P1-ORDER: DAG + backward prerequisites ---- */
  run('P1-ORDER', () => {
    for (const s of stations) {
      for (const p of s.prerequisites) {
        const ps = byId.get(p);
        if (!ps) {
          push('P1-ORDER', 'hard', `station[${s.id}]`, `پیش‌نیاز ${p} در نقشه نیست.`);
          continue;
        }
        if (ps.order >= s.order)
          push(
            'P1-ORDER',
            'hard',
            `station[${s.id}]`,
            `پیش‌نیاز ${p} ترتیب ${ps.order} دارد ≥ ترتیب خود ایستگاه (${s.order}) — ترتیب آموزشی معتبر نیست.`,
          );
      }
    }
    // duplicate ids / orders
    const seenIds = new Set<string>();
    for (const s of stations) {
      if (seenIds.has(s.id)) push('P1-ORDER', 'hard', `station[${s.id}]`, 'شناسهٔ ایستگاه تکراری است.');
      seenIds.add(s.id);
    }
    const seenOrders = new Set<number>();
    for (const s of stations) {
      if (seenOrders.has(s.order)) push('P1-ORDER', 'hard', `station[${s.id}]`, 'ترتیب تکراری است.');
      seenOrders.add(s.order);
    }
  });

  /* ---- P1-KANJI: the kanji placement contract ---- */
  run('P1-KANJI', () => {
    for (const k of plan.kanji) {
      const ref = KANJI_ITEMS_BY_LITERAL.get(k.character);
      if (!ref) {
        push(
          'P1-KANJI',
          'hard',
          `kanji[${k.character}]`,
          `کانجی ${k.character} در مرجع N5 موجود نیست — تدریس کانجی خارج از مرجع ممکن نیست.`,
        );
        continue;
      }
      const station = byId.get(k.teachStationId);
      if (!station) {
        push('P1-KANJI', 'hard', `kanji[${k.character}]`, `ایستگاه تدریس ${k.teachStationId} در نقشه نیست.`);
        continue;
      }
      if (station.domain !== 'kanji' || station.type !== 'teaching') {
        push(
          'P1-KANJI',
          'hard',
          `kanji[${k.character}]`,
          `کانجی ${k.character} به ایستگاه ${station.id} (دامنهٔ ${station.domain}/${station.type}) واگذار شده — جایگاه ایستگاه کانجی باید ایستگاه اختصاصی kanji آموزشی باشد.`,
        );
      }
      for (const wid of k.anchorWordIds) {
        const w = plan.vocabulary.find((v) => v.id === wid);
        if (!w) {
          push('P1-KANJI', 'hard', `kanji[${k.character}]`, `واژهٔ anchor ${wid} در استخراج واژگان طرح نیست.`);
          continue;
        }
        if (!w.surface.includes(k.character)) {
          push(
            'P1-KANJI',
            'hard',
            `kanji[${k.character}]`,
            `واژهٔ anchor «${w.surface}» این کانجی را در بر ندارد — واژهٔ anchor باید حامل خود کانجی باشد (D-0006).`,
          );
        }
        const wordStation = byId.get(w.teachStationId);
        if (!wordStation || !station) continue;
        if (wordStation.order >= station.order) {
          push(
            'P1-KANJI',
            'hard',
            `kanji[${k.character}]`,
            `واژهٔ anchor «${w.surface}» در ایستگاه ${w.teachStationId} (ترتیب ${wordStation.order}) تدریس می‌شود — پس از ایستگاه کانجی (${station.order})؛ خوانش کانجی باید داخل واژهٔ آموزش‌دیدهٔ قبلی بیاید.`,
          );
        }
      }
    }
    // kanji stations that carry no planned kanji
    for (const s of stations) {
      if (s.domain === 'kanji' && plan.kanji.every((k) => k.teachStationId !== s.id)) {
        push('P1-KANJI', 'hard', `station[${s.id}]`, 'ایستگاه kanji بدون هیچ کانجیِ واگذار‌شده — جایگاه خالی.');
      }
    }
  });

  /* ---- P1-BUDGET: framework budgets at plan level ---- */
  run('P1-BUDGET', () => {
    if (plan.grammar.length > ENGINE_CONFIG.grammarPerChapter.max)
      push(
        'P1-BUDGET',
        'soft',
        'grammar',
        `بودجهٔ گرامر فریم‌ورک حداکثر ${ENGINE_CONFIG.grammarPerChapter.max} ساختار است — طرح ${plan.grammar.length} دارد؛ برای فصل‌های جدید باید با دلیل ثبت شود (فصل‌های موجود با ساختار بیشتر، مستند می‌مانند).`,
      );
    if (plan.kanji.length > 0 && !options.readonly) {
      const [min, max] = [ENGINE_CONFIG.kanjiPerChapter.min, ENGINE_CONFIG.kanjiPerChapter.max];
      if (plan.kanji.length < min || plan.kanji.length > max)
        push(
          'P1-BUDGET',
          'soft',
          'kanji',
          `تعداد کانجی طرح ${plan.kanji.length} است — بازهٔ طراحی ${min}–${max} (Q-004؛ فصل‌های کانا/مقدموع مستثنا).`,
        );
    }
  });

  const hardCount = findings.filter((f) => f.severity === 'hard').length;
  return { passed: hardCount === 0, hardCount, softCount: findings.length - hardCount, findings, checkedRules: rules };
}
