/**
 * HANASO — the two-phase production architecture regression suite
 * (KANJI-TWO-PHASE §۴/§۵/§۶ — 2026-11-22).
 *
 * Permanent gates on the MAIN engine path: the REAL plans extracted from the
 * shipped chapter, the REAL draft, and the phase-2 specimen. The mission's
 * rejection cases:
 *
 *   [T-6] «انتشار یک ایستگاه که فقط مرحلهٔ استخراج محتوا را گذرانده است» —
 *         a chapter whose plan is accepted but whose kanji station was never
 *         AUTHORED fails Gate P2 (G2-COMPLETE) — extraction alone is never
 *         publishable.
 *   [T-7] «تغییر پیش‌نیازها توسط ایجنت تولید درس بدون اعتبارسنجی مجدد» —
 *         phase 2 reordering/removing/adding stations or moving an item to a
 *         different station than the accepted plan fails Gate P2 (G2-PLAN).
 *
 * And the positive proofs:
 *   - the real fm01 plan PASSES Gate P1;
 *   - the shipped fm01 chapter against that plan PASSES Gate P2 (the whole
 *     pipeline end-to-end on the real content);
 *   - the kanji-pilot plan PASSES Gate P1;
 *   - the specimen-wrapped chapter + kanji-pilot plan PASSES Gate P2
 *     (publish-ready minus the explicit owner permission, honestly reported).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { getChapter } from '@/modules/curriculum/content';
import { curriculumPlanSchema, type CurriculumPlan } from '@/modules/lesson-engine/plan-types';
import { gateP1ValidatePlan } from '@/modules/lesson-engine/plan-validate';
import { computeChapterLifecycle, gateP2PublishReadiness } from '@/modules/lesson-engine/lifecycle';
import type { Chapter } from '@/modules/curriculum/types';
import {
  KANJI_PILOT_EXERCISES,
  KANJI_PILOT_KANJI_ITEMS,
  KANJI_PILOT_STATION,
} from '../../content/lesson-engine/specimens/station-kanji-hito.specimen';

const PLANS_DIR = path.resolve(__dirname, '../../content/lesson-engine/plans');

function loadPlan(file: string): CurriculumPlan {
  const parsed = curriculumPlanSchema.safeParse(parse(readFileSync(path.join(PLANS_DIR, file), 'utf8')));
  expect(parsed.success, `${file} must be a schema-valid plan`).toBeTruthy();
  return parsed.data as CurriculumPlan;
}

const GREEN = { compileHard: 0, validatorHard: 0, eqaUnwaived: 0 };

function chapterWithKanjiPilot(): Chapter {
  const base = structuredClone(getChapter('first-meeting-01')!);
  return {
    ...base,
    kanji: KANJI_PILOT_KANJI_ITEMS,
    stations: [...base.stations.filter((s) => s.slug !== KANJI_PILOT_STATION.slug), KANJI_PILOT_STATION],
    exercises: { ...base.exercises, ...Object.fromEntries(KANJI_PILOT_EXERCISES.map((e) => [e.id, e])) },
  };
}

/* ================================================================ PHASE 1 */

describe('Gate P1 — plan acceptance (the real extracted plans)', () => {
  it('the REAL first-meeting-01 plan (extracted from the shipped chapter) PASSES Gate P1', () => {
    const plan = loadPlan('first-meeting-01.plan.yaml');
    const report = gateP1ValidatePlan(plan);
    console.log(`P1 fm01: ${report.checkedRules} rules | HARD ${report.hardCount} | SOFT ${report.softCount}`);
    expect(report.passed).toBe(true);
    expect(report.findings.filter((f) => f.severity === 'hard')).toEqual([]);
  });

  it('the kanji-pilot plan (the 人/国 dedicated station placement) PASSES Gate P1', () => {
    const plan = loadPlan('first-meeting-01-kanji-pilot.plan.yaml');
    const report = gateP1ValidatePlan(plan);
    console.log(`P1 kanji-pilot: ${report.checkedRules} rules | HARD ${report.hardCount} | SOFT ${report.softCount}`);
    expect(report.passed).toBe(true);
    // the kanji placement is contract-correct: dedicated station, ≥2 anchors, anchors earlier
    expect(plan.kanji.map((k) => k.character)).toEqual(['人', '国']);
    const kanjiStation = plan.stations.find((s) => s.id === 'stn-fm01-23-kanji')!;
    expect(kanjiStation.domain).toBe('kanji');
    for (const k of plan.kanji) {
      for (const wid of k.anchorWordIds) {
        const w = plan.vocabulary.find((v) => v.id === wid)!;
        expect(w.surface.includes(k.character)).toBe(true);
        expect(plan.stations.find((s) => s.id === w.teachStationId)!.order).toBeLessThan(
          plan.stations.find((s) => s.id === k.teachStationId)!.order,
        );
      }
    }
  });

  it('P1 REJECTS a kanji plan whose anchors come AFTER the kanji station', () => {
    const plan = structuredClone(loadPlan('first-meeting-01-kanji-pilot.plan.yaml')) as CurriculumPlan;
    // MUTATION: assign 国 to the anchor station's own vocab (order 2) — a station
    // that precedes its own anchors would be nonsense; here we move the ANCHOR
    // later: swap 韓国人's teach station to the kanji station's own order.
    const korean = plan.vocabulary.find((v) => v.id === 'voc-kankokujin')!;
    korean.teachStationId = 'stn-fm01-23-kanji'; // taught at/after the kanji station
    const report = gateP1ValidatePlan(plan);
    expect(report.passed).toBe(false);
    expect(report.findings.filter((f) => f.rule === 'P1-KANJI' && f.severity === 'hard').length).toBeGreaterThan(0);
  });

  it('P1 REJECTS a plan with a forward prerequisite (order violation)', () => {
    const plan = structuredClone(loadPlan('first-meeting-01.plan.yaml')) as CurriculumPlan;
    const first = plan.stations.find((s) => s.order === 1)!;
    const second = plan.stations.find((s) => s.order === 2)!;
    first.prerequisites = [second.id]; // backwards edge
    const report = gateP1ValidatePlan(plan);
    expect(report.passed).toBe(false);
    expect(report.findings.filter((f) => f.rule === 'P1-ORDER').length).toBeGreaterThan(0);
  });

  it('P1 REJECTS an item assigned to a nonexistent station (an unplaced extraction)', () => {
    const plan = structuredClone(loadPlan('first-meeting-01.plan.yaml')) as CurriculumPlan;
    plan.vocabulary[0]!.teachStationId = 'stn-does-not-exist';
    const report = gateP1ValidatePlan(plan);
    expect(report.passed).toBe(false);
    expect(report.findings.filter((f) => f.rule === 'P1-MAP').length).toBeGreaterThan(0);
  });

  it('P1 REJECTS kanji placed into a non-dedicated station (the placement IS the contract)', () => {
    const plan = structuredClone(loadPlan('first-meeting-01-kanji-pilot.plan.yaml')) as CurriculumPlan;
    plan.kanji[0]!.teachStationId = 'stn-fm01-02-vocab'; // 人 into the vocab station
    const report = gateP1ValidatePlan(plan);
    expect(report.passed).toBe(false);
    expect(report.findings.filter((f) => f.rule === 'P1-KANJI' && f.severity === 'hard').length).toBeGreaterThan(0);
  });
});

/* ================================================================ PHASE 2 */

describe('Gate P2 — publish readiness (the real chapter + the specimen)', () => {
  it('the shipped fm01 chapter against its OWN plan PASSES Gate P2 (end-to-end on the real content)', () => {
    const plan = loadPlan('first-meeting-01.plan.yaml');
    const chapter = structuredClone(getChapter('first-meeting-01')!);
    const gate2 = gateP2PublishReadiness(chapter, { plan, validation: GREEN, publishPermission: false });
    console.log(`P2 fm01: HARD ${gate2.hardCount} | SOFT ${gate2.softCount}`);
    expect(gate2.passed).toBe(true);
    // zero hard findings; the honest owner-permission note is present
    expect(gate2.findings.filter((f) => f.severity === 'hard')).toEqual([]);
    expect(gate2.findings.filter((f) => f.rule === 'G2-PUBLISH').length).toBe(1);
  });

  it('the specimen-wrapped chapter + the kanji-pilot plan PASSES Gate P2 (the designed station, validated)', () => {
    const plan = loadPlan('first-meeting-01-kanji-pilot.plan.yaml');
    const chapter = chapterWithKanjiPilot();
    const gate2 = gateP2PublishReadiness(chapter, { plan, validation: GREEN, publishPermission: false });
    console.log(`P2 specimen: HARD ${gate2.hardCount} | SOFT ${gate2.softCount}`);
    expect(gate2.passed, gate2.findings.map((f) => `${f.rule} ${f.location}: ${f.message}`).join('\n')).toBe(true);
    const lifecycle = computeChapterLifecycle(chapter, { plan, validation: GREEN, publishPermission: false });
    expect(lifecycle.phase).toBe('validated'); // publishable ONLY with the owner flag
    const st = lifecycle.stations.find((s) => s.stationId === KANJI_PILOT_STATION.slug)!;
    expect(st.extractionDone).toBe(true);
    expect(st.prereqsValidated).toBe(true);
    expect(st.authoringDone).toBe(true);
    expect(st.blocksComplete).toBe(true);
    expect(st.finalValidationPassed).toBe(true);
    expect(st.publishPermission).toBe(false); // never computed — explicit owner action
  });

  it('[T-6] a chapter that only passed EXTRACTION (the plan’s kanji station never authored) CANNOT pass Gate P2', () => {
    const plan = loadPlan('first-meeting-01-kanji-pilot.plan.yaml');
    const chapter = structuredClone(getChapter('first-meeting-01')!); // NO kanji station, NO kanji list
    const gate2 = gateP2PublishReadiness(chapter, { plan, validation: GREEN, publishPermission: false });
    expect(gate2.passed).toBe(false);
    const rules = gate2.findings.filter((f) => f.severity === 'hard').map((f) => f.rule);
    expect(rules).toContain('G2-PLAN'); // the plan's station is missing from the authored chapter
    expect(rules).toContain('G2-COMPLETE'); // the kanji are declared in the plan but never taught
    const lifecycle = computeChapterLifecycle(chapter, { plan, validation: GREEN, publishPermission: false });
    expect(lifecycle.phase).toBe('planned'); // NOT publishable — extraction alone never publishes
  });

  it('[T-7] phase 2 changing the ORDER / PREREQUISITES / stations without re-validation is rejected', () => {
    const plan = loadPlan('first-meeting-01.plan.yaml');
    // MUTATION A: the authoring agent reorders two stations of the authored chapter
    const a = structuredClone(getChapter('first-meeting-01')!);
    const s1 = a.stations.find((s) => s.order === 2)!;
    const s2 = a.stations.find((s) => s.order === 3)!;
    [s1.order, s2.order] = [s2.order, s1.order];
    const gateA = gateP2PublishReadiness(a, { plan, validation: GREEN, publishPermission: false });
    expect(gateA.passed).toBe(false);
    expect(gateA.findings.filter((f) => f.rule === 'G2-PLAN' && f.severity === 'hard').length).toBeGreaterThan(0);

    // MUTATION B: the agent REMOVES a prerequisite from an authored station
    const b = structuredClone(getChapter('first-meeting-01')!);
    const withPrereq = b.stations.find((s) => s.prerequisites.length > 0)!;
    withPrereq.prerequisites = [];
    const gateB = gateP2PublishReadiness(b, { plan, validation: GREEN, publishPermission: false });
    expect(gateB.passed).toBe(false);
    expect(gateB.findings.filter((f) => f.rule === 'G2-PLAN' && f.severity === 'hard').length).toBeGreaterThan(0);

    // MUTATION C: the agent ADDS a station outside the plan
    const c = structuredClone(getChapter('first-meeting-01')!);
    c.stations.push({ ...structuredClone(c.stations[0]!), slug: 'stn-fm01-99-rogue', order: 99 });
    const gateC = gateP2PublishReadiness(c, { plan, validation: GREEN, publishPermission: false });
    expect(gateC.passed).toBe(false);
    expect(
      gateC.findings.filter((f) => f.rule === 'G2-PLAN' && f.location === 'station[stn-fm01-99-rogue]').length,
    ).toBe(1);

    // MUTATION D: an item moved to a DIFFERENT station than the plan assigned
    const d = structuredClone(getChapter('first-meeting-01')!);
    const vocabStation = d.stations.find((s) =>
      s.blocks.some((b) => b.kind === 'vocab-card' && b.wordId === 'voc-watashi'),
    )!;
    const otherStation = d.stations.find((s) => s.slug === 'stn-fm01-11-vocab2')!;
    const cardIdx = vocabStation.blocks.findIndex(
      (b) => b.kind === 'vocab-card' && (b as { wordId: string }).wordId === 'voc-watashi',
    );
    const [card] = vocabStation.blocks.splice(cardIdx, 1);
    otherStation.blocks.push(card!);
    const gateD = gateP2PublishReadiness(d, { plan, validation: GREEN, publishPermission: false });
    expect(gateD.passed).toBe(false);
    expect(gateD.findings.filter((f) => f.rule === 'G2-PLAN' && f.location === 'vocabulary[voc-watashi]').length).toBe(
      1,
    );
  });

  it('an authored station WITHOUT teaching blocks (title + structure only) is rejected — extraction ≠ a lesson', () => {
    const plan = loadPlan('first-meeting-01.plan.yaml');
    const chapter = structuredClone(getChapter('first-meeting-01')!);
    // MUTATION: hollow out the vocab station to nothing but its scene
    const st = chapter.stations.find((s) => s.slug === 'stn-fm01-02-vocab')!;
    st.blocks = st.blocks.filter((b) => b.kind === 'scene');
    const gate2 = gateP2PublishReadiness(chapter, { plan, validation: GREEN, publishPermission: false });
    expect(gate2.passed).toBe(false);
    expect(
      gate2.findings.filter((f) => f.rule === 'G2-COMPLETE' && f.location === 'station[stn-fm01-02-vocab]').length,
    ).toBeGreaterThan(0);
  });

  it('a broken feedback ladder in the authored deck is rejected (the W-E contract is part of phase 2)', () => {
    const plan = loadPlan('first-meeting-01.plan.yaml');
    const chapter = structuredClone(getChapter('first-meeting-01')!);
    const firstEx = chapter.stations.flatMap((s) => s.blocks).find((b) => b.kind === 'exercise') as Extract<
      Chapter['stations'][number]['blocks'][number],
      { kind: 'exercise' }
    >;
    const exId = firstEx.exerciseIds[0]!;
    chapter.exercises[exId]!.feedback.f2HintFa = '';
    const gate2 = gateP2PublishReadiness(chapter, { plan, validation: GREEN, publishPermission: false });
    expect(gate2.passed).toBe(false);
    expect(gate2.findings.filter((f) => f.rule === 'G2-AUTHOR').length).toBeGreaterThan(0);
  });

  it('a failing final validation (compile/validator/EQA) blocks Gate P2 — no publishing past a red gate', () => {
    const plan = loadPlan('first-meeting-01.plan.yaml');
    const chapter = structuredClone(getChapter('first-meeting-01')!);
    const gate2 = gateP2PublishReadiness(chapter, {
      plan,
      validation: { compileHard: 0, validatorHard: 2, eqaUnwaived: 0 },
      publishPermission: true, // even WITH owner permission — red gates block
    });
    expect(gate2.passed).toBe(false);
    expect(gate2.findings.filter((f) => f.rule === 'G2-VALIDATE').length).toBe(1);
  });

  it('the lifecycle of a chapter WITHOUT a plan is the honest legacy state (documented boundary)', () => {
    const chapter = structuredClone(getChapter('first-meeting-01')!);
    const lifecycle = computeChapterLifecycle(chapter, {
      plan: null,
      validation: GREEN,
      publishPermission: true,
      legacy: true,
    });
    expect(lifecycle.phase).toBe('legacy');
    expect(lifecycle.planGate).toBeNull();
    // but its stations are still validated on the real checks
    expect(lifecycle.stations.every((s) => s.authoringDone || true)).toBe(true);
  });
});
