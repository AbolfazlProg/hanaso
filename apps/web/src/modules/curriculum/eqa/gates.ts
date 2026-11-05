/**
 * HANASO — EQA gate implementations (TASK-LEARNING-04, Issue #97) — PURE module.
 *
 * Seven pedagogical quality gates over chapter DATA. Every gate:
 *  - takes real curriculum content (Chapter + LevelPolicy + dialogue line ids),
 *  - checks an explicit rule with transparent logic,
 *  - returns actionable Persian findings (file/lesson/field/reason),
 *  - distinguishes error (CI fail) / warning (human EQA-9) / info (boundary).
 *
 * Known violations on CURRENT content are managed via explicit, issue-linked
 * waivers (content/eqa-waivers.ts) — a waiver is visible in every report and a
 * stale waiver is itself an error. New violations fail CI.
 */
import type { Chapter, LevelPolicy, Station } from '../types';
import {
  EQA_POLICY,
  LINE_COMPREHENSION_TYPES,
  RECALL_FIRST_TYPES,
  RECEIPT_STATION_TYPES,
  blockIsInteractive,
  blockIsReceptive,
  blockIsExplanation,
  type EqaFinding,
} from './policy';
import { buildTaughtModel, clustersAnchoredToLine, hostStationOf, wordsAnchoredToLine } from './model';
import { servedCorrectPosition } from '../grading';

/* ------------------------------------------------------------------ helpers */

function longestRun(blocks: { predicate: boolean }[]): number {
  let best = 0;
  let cur = 0;
  for (const b of blocks) {
    if (b.predicate) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

/** chi-square critical value for df=2 at α=0.05 (two options-1 df for 3-option MCQ). */
const CHI2_DF2_A005 = 5.991;

function chiSquare(positions: number[], optionCount: number): number {
  const n = positions.length;
  const expected = n / optionCount;
  const observed = new Array<number>(optionCount).fill(0);
  for (const p of positions) observed[p] = (observed[p] ?? 0) + 1;
  return observed.reduce((acc, o) => acc + (o - expected) ** 2 / expected, 0);
}

/* ------------------------------------------------------------------ EQA-1 */

/**
 * EQA-1 — prerequisite: assessed concepts ⊆ taught concepts at the host point.
 * Layer 1: targetConcept + assessesConcepts (declared) must be taught at order ≤ host.
 * Layer 2: line-comprehension types (audio-meaning/gist-select/listen-who-asked)
 *          additionally require the source line's anchored grammar clusters and
 *          words to be taught at order ≤ host.
 */
export function gateEqa1(chapter: Chapter): EqaFinding[] {
  const findings: EqaFinding[] = [];
  const model = buildTaughtModel(chapter);

  for (const warning of model.anchorWarnings) {
    findings.push({
      gate: 'EQA-1',
      severity: 'warning',
      subject: warning.clusterId,
      rule: 'cluster-anchor',
      messageFa: `خوشهٔ گرامری ${warning.clusterId}: ${warning.reason}`,
      ruleRef: 'EQA-1 · مدل تدریس (لنگرسازی خوشه از lineRefs)',
    });
  }

  const lastOrder = Math.max(...chapter.stations.map((s) => s.order));
  const masteryStation = chapter.stations.find((s) => s.type === 'mastery');

  for (const ex of Object.values(chapter.exercises)) {
    const host = hostStationOf(ex.id, chapter);
    const isMasteryItem = ex.assessmentRole.startsWith('mastery_');
    // The gate bank is assessed at the mastery gate — after the whole core path.
    const hostOrder = host?.order ?? (isMasteryItem ? (masteryStation?.order ?? lastOrder) : lastOrder);
    const hostLabel = host?.slug ?? (isMasteryItem ? 'دروازهٔ mastery (پایان مسیر)' : 'بدون ایستگاه میزبان');

    /* Layer 1 — declared assessed concepts */
    const assessed = [ex.targetConcept, ...(ex.assessesConcepts ?? [])];
    for (const concept of assessed) {
      const taughtAt = model.taughtAtOrder.get(concept);
      if (taughtAt === undefined) {
        const known = model.conceptUniverse.has(concept);
        findings.push({
          gate: 'EQA-1',
          severity: known ? 'error' : 'warning',
          subject: ex.id,
          rule: 'assessed-not-taught',
          messageFa: known
            ? `تمرین ${ex.id} (میزبان: ${hostLabel}) مفهوم «${concept}» را می‌سنجد، اما این مفهوم هیچ‌جای فصل تدریس نمی‌شود — سنجشِ پیش از تدریس (S-1).`
            : `تمرین ${ex.id} (میزبان: ${hostLabel}) به مفهوم «${concept}» ارجاع می‌دهد که در هیچ فهرست مفاهیم فصل (واژه/گرامر/عبارت/objectiveCode/teachesConcepts) ثبت نشده — یا ارجاع غلط است یا مفهوم باید با teachesConcepts در ایستگاه مربوط ثبت شود (بازبینی انسانی EQA-9).`,
          ruleRef: 'CONTRACT §۴ S-1 · QUESTION_ARCH §۲-۵ (DD-096)',
        });
      } else if (taughtAt > hostOrder) {
        findings.push({
          gate: 'EQA-1',
          severity: 'error',
          subject: ex.id,
          rule: 'assessed-not-taught',
          messageFa: `تمرین ${ex.id} (میزبان: ${hostLabel}، order=${hostOrder}) مفهوم «${concept}» را می‌سنجد، اما این مفهوم در order=${taughtAt} (بعد از میزبان) تدریس می‌شود — سنجش پیش از تدریس (S-1).`,
          ruleRef: 'CONTRACT §۴ S-1 · QUESTION_ARCH §۲-۵ (DD-096)',
        });
      }
    }

    /* Layer 2 — line-comprehension types: the source line is part of the assessment.
     * TASK-LEARNING-06 (بستن #96 — بازنویسی تمرین‌های واژگان به سطح واژه): a Q2
     * audio item whose targetConcept is a WORD id is a WORD-LEVEL drill (شنیدنِ خودِ
     * واژه → معنی — 13-06 §۱ قدم ۴: recognition، نه درک خط): the line only CARRIES
     * the word's audio; its grammar is not being assessed. Exempt from layer 2. */
    const isWordLevelAudioDrill =
      ex.type === 'audio-meaning' && chapter.words.some((w) => w.id === ex.targetConcept);
    if (LINE_COMPREHENSION_TYPES.has(ex.type) && !isWordLevelAudioDrill) {
      const line = ex.audioLineRef ?? ex.lineRef;
      if (line) {
        for (const clusterId of clustersAnchoredToLine(chapter, line)) {
          const taughtAt = model.taughtAtOrder.get(clusterId);
          if (taughtAt === undefined || taughtAt > hostOrder) {
            findings.push({
              gate: 'EQA-1',
              severity: 'error',
              subject: ex.id,
              rule: 'line-grammar-not-taught',
              messageFa:
                `تمرین ${ex.id} (نوع ${ex.type}، میزبان: ${hostLabel}، order=${hostOrder}) درکِ خط ${line} را می‌سنجد، ` +
                `اما خوشهٔ گرامری «${clusterId}» لنگرِ همین خط${taughtAt === undefined ? ' هیچ‌جا تدریس نمی‌شود' : ` در order=${taughtAt} تدریس می‌شود (بعد از میزبان)`} — ` +
                `درک خط پیش از تدریس ساختار آن (S-1 / #96).`,
              ruleRef: 'CONTRACT §۴ S-1 · QUESTION_ARCH §۲-۵ (DD-096)',
            });
          }
        }
        for (const wordId of wordsAnchoredToLine(chapter, line)) {
          const taughtAt = model.taughtAtOrder.get(wordId);
          if (taughtAt === undefined || taughtAt > hostOrder) {
            findings.push({
              gate: 'EQA-1',
              severity: 'error',
              subject: ex.id,
              rule: 'line-word-not-taught',
              messageFa:
                `تمرین ${ex.id} (نوع ${ex.type}، میزبان: ${hostLabel}، order=${hostOrder}) درکِ خط ${line} را می‌سنجد، اما واژهٔ «${wordId}» از همین خط ` +
                `${taughtAt === undefined ? 'هیچ‌جا تدریس نمی‌شود' : `در order=${taughtAt} تدریس می‌شود (بعد از میزبان)`} — پاسخ‌دادن ممکن نیست (S-1).`,
              ruleRef: 'CONTRACT §۴ S-1 · QUESTION_ARCH §۲-۵ (DD-096)',
            });
          }
        }
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ EQA-2 */

/** EQA-2 — interaction & packet rules (DD-94 + S-3/S-4) over teaching stations. */
export function gateEqa2(chapter: Chapter): EqaFinding[] {
  const findings: EqaFinding[] = [];

  for (const station of chapter.stations) {
    if (RECEIPT_STATION_TYPES.has(station.type)) continue; // anchor/mastery: stage A/D by design

    const explanationRun = longestRun(station.blocks.map((b) => ({ predicate: blockIsExplanation(b) })));
    // TASK-LEARNING-06: kana-card packets follow the SAME packet rule as vocab cards
    // (05A experience spec §۲ — 2–3 cards then retrieval; DD-94 §۳-۱ vocab row).
    const vocabRun = longestRun(
      station.blocks.map((b) => ({ predicate: b.kind === 'vocab-card' || b.kind === 'kana-card' })),
    );
    const receptiveStretch = longestRun(station.blocks.map((b) => ({ predicate: blockIsReceptive(b) })));

    const alternation: string[] = [];
    if (explanationRun > EQA_POLICY.maxExplanationRun) {
      alternation.push(`${explanationRun} بلوک توضیحی پیاپی بدون تعامل (سقف ${EQA_POLICY.maxExplanationRun})`);
    }
    if (vocabRun > EQA_POLICY.maxVocabCardRun) {
      alternation.push(`${vocabRun} کارت واژه پیاپی بدون بازیابی — نقض قاعدهٔ پکت (سقف ${EQA_POLICY.maxVocabCardRun})`);
    }
    if (receptiveStretch > EQA_POLICY.maxReceptiveStretch) {
      alternation.push(`${receptiveStretch} بلوک دریافت‌پیاپی از هر نوع (سقف ${EQA_POLICY.maxReceptiveStretch})`);
    }
    if (alternation.length > 0) {
      findings.push({
        gate: 'EQA-2',
        severity: 'error',
        subject: station.slug,
        rule: 'S-3-alternation',
        messageFa: `ایستگاه ${station.slug} (${station.type}): ${alternation.join(' + ')} — الگوی «همهٔ کارت‌ها سپس همهٔ تمرین‌ها» ممنوع است؛ بازیابی باید داخل جریان آموزش بیاید (DD-94 §۳).`,
        ruleRef: 'DD-94 §۳ · CONTRACT §۴ S-3',
      });
    }

    // S-4 — a core station with a graded completion criterion must have a scored interaction.
    const hasInteractive = station.blocks.some((b) => blockIsInteractive(b));
    if (station.core && station.completion.kind !== 'viewed' && !hasInteractive) {
      findings.push({
        gate: 'EQA-2',
        severity: 'error',
        subject: station.slug,
        rule: 'S-4-no-interaction',
        messageFa: `ایستگاه core «${station.slug}» ملاک تکمیل «${station.completion.kind}» دارد اما هیچ بلوک تعاملی قابل‌نمره ندارد — ایستگاه بدون تعامل فعال «آموزشی» تلقی نمی‌شود (S-4).`,
        ruleRef: 'CONTRACT §۴ S-4 · LESSON_TEMPLATE §۵',
      });
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ EQA-3 */

/** EQA-3 — recall-first composition of the practice pool (DD-013 / QUESTION §۳). */
export function gateEqa3(chapter: Chapter): EqaFinding[] {
  const findings: EqaFinding[] = [];
  const practice = Object.values(chapter.exercises).filter((e) => e.assessmentRole === 'practice');
  if (practice.length === 0) {
    return [
      {
        gate: 'EQA-3',
        severity: 'error',
        subject: 'practice-pool',
        rule: 'pool-empty',
        messageFa: `فصل ${chapter.slug} هیچ تمرین practice ندارد — استخر خالی (QUESTION §۵-۱).`,
        ruleRef: 'DD-013 · QUESTION_ARCH §۳',
      },
    ];
  }
  const recall = practice.filter((e) => RECALL_FIRST_TYPES.has(e.type));
  const meaningSelect = practice.filter((e) => e.type === 'meaning-select');
  const recallShare = recall.length / practice.length;
  const msShare = meaningSelect.length / practice.length;

  if (recallShare < EQA_POLICY.recallFirstMinShare) {
    findings.push({
      gate: 'EQA-3',
      severity: 'error',
      subject: 'practice-pool',
      rule: 'recall-first-share',
      messageFa:
        `استخر practice فصل ${chapter.slug}: ${recall.length}/${practice.length} آیتم recall-first است ` +
        `(${(recallShare * 100).toFixed(1)}٪ < حداقل ${EQA_POLICY.recallFirstMinShare * 100}٪) — ` +
        `ترکیب جلسه به‌سمت تشخیص آسان انحراف دارد؛ انواع تولید/بازیابی (cloze، word-order، produce-template، درک مطلب شنیداری) باید ستون فقرات باشند (DD-013).`,
      ruleRef: 'DD-013 · QUESTION_ARCH §۳ · exercise-design §۱',
    });
  }
  if (msShare > EQA_POLICY.meaningSelectMaxShare) {
    findings.push({
      gate: 'EQA-3',
      severity: 'error',
      subject: 'practice-pool',
      rule: 'meaning-select-cap',
      messageFa:
        `استخر practice فصل ${chapter.slug}: ${meaningSelect.length}/${practice.length} آیتم meaning-select است ` +
        `(${(msShare * 100).toFixed(1)}٪ > سقف ${EQA_POLICY.meaningSelectMaxShare * 100}٪) — MCQ فقط مکمل است (QUESTION §۳).`,
      ruleRef: 'QUESTION_ARCH §۳ (MCQ ≤۳۰٪)',
    });
  }
  return findings;
}

/* ------------------------------------------------------------------ EQA-4 */

/** EQA-4 — correct-answer position balance of the SERVED (post-shuffle) options. */
export function gateEqa4(chapter: Chapter): EqaFinding[] {
  const findings: EqaFinding[] = [];
  const pools: { name: string; items: (typeof chapter.exercises)[string][] }[] = [
    {
      name: 'practice-pool',
      items: Object.values(chapter.exercises).filter((e) => e.assessmentRole === 'practice'),
    },
    {
      name: 'mastery-pool',
      items: Object.values(chapter.exercises).filter((e) => e.assessmentRole.startsWith('mastery_')),
    },
  ];

  for (const pool of pools) {
    // 3-option MCQ only — the served position space is comparable across items.
    const mcq = pool.items.filter((e) => e.options?.length === 3 && e.correctOptionId);
    if (mcq.length === 0) continue;
    const positions = mcq.map((e) => servedCorrectPosition(e)!);
    const counts = [0, 1, 2].map((p) => positions.filter((x) => x === p).length);
    const shares = counts.map((c) => c / positions.length);
    const maxShare = Math.max(...shares);

    if (maxShare > EQA_POLICY.balanceGrossMaxShare) {
      findings.push({
        gate: 'EQA-4',
        severity: 'error',
        subject: pool.name,
        rule: 'position-gross-bias',
        messageFa:
          `استخر ${pool.name} فصل ${chapter.slug}: توزیع موقعیت گزینهٔ درستِ ارائه‌شده ${counts.join('/')} است ` +
          `(بیشترین سهم ${(maxShare * 100).toFixed(0)}٪ > سقف ⅔) — الگوی قابل حدس‌زدن برای کاربر (QUESTION §۲-۴).`,
        ruleRef: 'QUESTION_ARCH §۲-۴ · CONTRACT §۵ EQA-4',
      });
      continue;
    }

    if (positions.length >= EQA_POLICY.balanceMinPoolSize) {
      const chi = chiSquare(positions, 3);
      if (chi > CHI2_DF2_A005) {
        findings.push({
          gate: 'EQA-4',
          severity: 'error',
          subject: pool.name,
          rule: 'position-chi2',
          messageFa: `استخر ${pool.name} فصل ${chapter.slug}: توزیع موقعیت گزینهٔ درست ${counts.join('/')} با خی‌دو ${chi.toFixed(2)} از حد ${CHI2_DF2_A005} (df=2، α=${EQA_POLICY.balanceAlpha}) فراتر می‌رود — انحراف معنی‌دار از توازن یکنواخت (QUESTION §۲-۴).`,
          ruleRef: 'QUESTION_ARCH §۲-۴ · CONTRACT §۵ EQA-4',
        });
      }
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ EQA-5 */

/** EQA-5 — every core objective has a practice opportunity and a mastery-path measure. */
export function gateEqa5(chapter: Chapter): EqaFinding[] {
  const findings: EqaFinding[] = [];
  const model = buildTaughtModel(chapter);
  const core = chapter.stations.filter((s) => s.core);

  // objectiveCode → stations (core only)
  const objectiveStations = new Map<string, Station[]>();
  for (const s of core) {
    const list = objectiveStations.get(s.objectiveCode) ?? [];
    list.push(s);
    objectiveStations.set(s.objectiveCode, list);
  }

  const masteryTargets = new Set(
    Object.values(chapter.exercises)
      .filter((e) => e.assessmentRole.startsWith('mastery_'))
      .map((e) => e.targetConcept),
  );

  for (const [objective, stations] of objectiveStations) {
    const onlyAnchor = stations.every((s) => s.type === 'anchor');
    if (onlyAnchor) continue; // stage-A gist objective — measured by the gate's M1 (documented)

    // practice evidence: an exercise block or a scored interaction in the objective's stations
    const hasPractice = stations.some((s) =>
      s.blocks.some(
        (b) =>
          b.kind === 'exercise' || (b.kind === 'character-scene' && b.steps.some((st) => st.userReply !== undefined)),
      ),
    );
    if (!hasPractice) {
      findings.push({
        gate: 'EQA-5',
        severity: 'error',
        subject: objective,
        rule: 'no-practice',
        messageFa:
          `هدف «${objective}» (ایستگاه‌ها: ${stations.map((s) => s.slug).join('، ')}) هیچ فرصت practice ندارد — ` +
          `هر objectiveCode حداقل یک تمرین practice یا تعامل نمره‌دار لازم دارد (CONTRACT §۱).`,
        ruleRef: 'CONTRACT §۱ · #97 CI-5',
      });
    }

    // mastery evidence: gate-bank item targeting the objective's concepts, or the
    // production task assessed by task_completed (station-design §۷)
    const objectiveConcepts = new Set(stations.flatMap((s) => [...(model.byStation.get(s.slug) ?? [])]));
    const inGate = [...objectiveConcepts].some((c) => masteryTargets.has(c));
    const assessedByTask = stations.some((s) => s.completion.kind === 'task_completed');
    if (!inGate && !assessedByTask) {
      findings.push({
        gate: 'EQA-5',
        severity: 'error',
        subject: objective,
        rule: 'no-mastery-measure',
        messageFa:
          `هدف «${objective}» (ایستگاه‌ها: ${stations.map((s) => s.slug).join('، ')}) نه در بانک mastery دروازه حاضر است ` +
          `نه با ملاک تکمیل نمره‌دار سنجیده می‌شود — هر هدف باید در معماری سنجش فصل حضور داشته باشد (DD-048).`,
        ruleRef: 'CONTRACT §۱ · DD-048 · #97 CI-5',
      });
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ EQA-6 */

const KANJI_RE = /[一-龯]/;

/** EQA-6 — vocab card data completeness (CONTRACT §۲-۲ — closes #104). */
export function gateEqa6(chapter: Chapter): EqaFinding[] {
  const findings: EqaFinding[] = [];
  for (const w of chapter.words) {
    const problems: string[] = [];
    if (!w.term?.trim()) problems.push('شکل نوشتاری (term) خالی است');
    if (!w.readingKana?.trim()) problems.push('خوانش کانا (readingKana) خالی است');
    if (!w.meaningFa?.trim()) problems.push('معنی فارسی (meaningFa) خالی است');
    if (!w.noteFa || w.noteFa.trim().length < 4) {
      problems.push('کاربرد/نکتهٔ حداقل یک‌خطی (noteFa) ندارد — کارت بدون کاربرد برای مبتدی «خالی» است (#104)');
    }
    if (KANJI_RE.test(w.term ?? '') && !w.termFurigana?.trim()) {
      problems.push('term کانجی دارد اما termFurigana ندارد (L2: فوریگانای کامل الزامی)');
    }
    if (!w.surfaceInLine?.trim()) problems.push('شکل واژه در خط منبع (surfaceInLine) خالی است');
    if (problems.length > 0) {
      findings.push({
        gate: 'EQA-6',
        severity: 'error',
        subject: w.id,
        rule: 'slot-missing',
        messageFa: `کارت واژهٔ ${w.id} در فصل ${chapter.slug}: ${problems.join('؛ ')}.`,
        ruleRef: 'CONTRACT §۲-۲ (اسلات‌های الزامی) · #104',
      });
    }
  }
  return findings;
}

/* ------------------------------------------------------------------ EQA-7 */

/** EQA-7 (per chapter) — numbers come from level_policy; the level resolves and is sane. */
export function gateEqa7Chapter(chapter: Chapter, levels: Record<string, LevelPolicy>): EqaFinding[] {
  const findings: EqaFinding[] = [];
  const level = levels[chapter.levelCode];
  if (!level) {
    findings.push({
      gate: 'EQA-7',
      severity: 'error',
      subject: chapter.slug,
      rule: 'unknown-level',
      messageFa: `فصل ${chapter.slug} به سطح «${chapter.levelCode}» ارجاع می‌دهد که در LEVEL_POLICIES وجود ندارد — همهٔ سقف‌ها/آستانه‌ها از سیاست سطح می‌آیند (EQA-7).`,
      ruleRef: 'CONTRACT §۱ · LESSON_ENGINE §۱ (DD-101) · #110',
    });
    return findings;
  }
  const { gate, maxRemediationLoops } = level.caps;
  const problems: string[] = [];
  if (gate.weighted < EQA_POLICY.gateBounds.weighted[0] || gate.weighted > EQA_POLICY.gateBounds.weighted[1]) {
    problems.push(`آستانهٔ وزنی ${gate.weighted} خارج بازهٔ مجاز [${EQA_POLICY.gateBounds.weighted.join('..')}]`);
  }
  if (gate.minMeasure < EQA_POLICY.gateBounds.minMeasure[0] || gate.minMeasure > EQA_POLICY.gateBounds.minMeasure[1]) {
    problems.push(`حداقل سنجه ${gate.minMeasure} خارج بازهٔ مجاز [${EQA_POLICY.gateBounds.minMeasure.join('..')}]`);
  }
  if (gate.minMeasure > gate.weighted) {
    problems.push(`حداقل سنجه (${gate.minMeasure}) از آستانهٔ وزنی (${gate.weighted}) بزرگ‌تر است`);
  }
  if (
    maxRemediationLoops < EQA_POLICY.gateBounds.remediationLoops[0] ||
    maxRemediationLoops > EQA_POLICY.gateBounds.remediationLoops[1]
  ) {
    problems.push(
      `تعداد حلقهٔ ترمیم ${maxRemediationLoops} خارج بازهٔ مجاز [${EQA_POLICY.gateBounds.remediationLoops.join('..')}]`,
    );
  }
  if (problems.length > 0) {
    findings.push({
      gate: 'EQA-7',
      severity: 'error',
      subject: chapter.levelCode,
      rule: 'policy-out-of-bounds',
      messageFa: `سیاست سطح ${chapter.levelCode} (${chapter.slug}): ${problems.join('؛ ')} — مقادیر از LEVEL_MATRIX §۶ مستند شوند.`,
      ruleRef: 'LEVEL_MATRIX §۶ · CONTRACT §۱ · #110',
    });
  }
  return findings;
}

/** EQA-7 (global) — the level policies themselves are complete and escalate monotonically. */
export function gateEqa7Levels(levels: LevelPolicy[]): EqaFinding[] {
  const findings: EqaFinding[] = [];
  const expected = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];
  const present = new Set(levels.map((l) => l.code));
  for (const code of expected) {
    if (!present.has(code)) {
      findings.push({
        gate: 'EQA-7',
        severity: 'error',
        subject: code,
        rule: 'level-missing',
        messageFa: `سیاست سطح ${code} در LEVEL_POLICIES وجود ندارد — ماتریس سطوح هفت‌گانه ناقص است.`,
        ruleRef: 'LEVEL_MATRIX §۱/§۶ · #110',
      });
    }
  }
  // Monotonic escalation L2→L7 (LEVEL_MATRIX §۶: thresholds tighten with level)
  const band = levels.filter((l) => l.code >= 'L2' && l.code <= 'L7').sort((a, b) => a.orderInCourse - b.orderInCourse);
  for (let i = 1; i < band.length; i++) {
    const prev = band[i - 1]!;
    const cur = band[i]!;
    if (cur.caps.gate.weighted < prev.caps.gate.weighted) {
      findings.push({
        gate: 'EQA-7',
        severity: 'error',
        subject: `${prev.code}->${cur.code}`,
        rule: 'escalation-broken',
        messageFa: `آستانهٔ وزنی ${cur.code} (${cur.caps.gate.weighted}) از ${prev.code} (${prev.caps.gate.weighted}) سخت‌گیرانه‌تر نیست — منطق LEVEL_MATRIX §۶ (تشدید تدریجی) نقض شده.`,
        ruleRef: 'LEVEL_MATRIX §۶ · #110',
      });
    }
  }
  return findings;
}
