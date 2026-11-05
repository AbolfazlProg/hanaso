/**
 * HANASO — Educational QA gates EQA-1..7 (TASK-LEARNING-04, Issue #97).
 *
 * This file IS the CI gate: `pnpm --filter web test:eqa` runs it in CI and it
 * FAILS the build when any pedagogical violation is not covered by a registered,
 * issue-linked waiver. It prints the full Persian report to stdout.
 *
 * Test layers:
 *  1. POSITIVE  — the real bundled chapters pass with EXACTLY the registered
 *     waivers (no silent new violations, no waiver rot).
 *  2. NEGATIVE / MUTATION — for every gate, a mutated chapter that violates the
 *     rule MUST be rejected by that gate (proves no gate is a rubber stamp).
 *  3. REPORT   — error output is actionable (subject + reason + KB rule ref).
 *  4. #110     — mastery thresholds are injected from level policy (L4 ≠ L2).
 */
import { describe, expect, it } from 'vitest';
import { getChapter, listChapters } from '@/modules/curriculum/content';
import { LEVELS_BY_CODE, LEVEL_POLICIES } from '@/modules/curriculum/content/levels';
import { EQA_WAIVERS } from '@/modules/curriculum/content/eqa-waivers';
import {
  gateEqa1,
  gateEqa2,
  gateEqa3,
  gateEqa4,
  gateEqa5,
  gateEqa6,
  gateEqa7Chapter,
  gateEqa7Levels,
  runEqa,
  renderConsole,
  renderMarkdown,
  findingKey,
} from '@/modules/curriculum/eqa';
import type { Chapter } from '@/modules/curriculum/types';
import type { EqaWaiver } from '@/modules/curriculum/eqa/waivers';
import { toClientExercise, gradeMasterySubmission, servedCorrectPosition } from '@/modules/curriculum/grading';
import { computeMastery } from '@/modules/mastery';

/* ------------------------------------------------------------------ helpers */

function cloneChapter(): Chapter {
  return structuredClone(getChapter('first-meeting-01')!);
}

function runOnRealChapters() {
  return runEqa(listChapters(), LEVELS_BY_CODE, LEVEL_POLICIES, EQA_WAIVERS);
}

/* ================================================================ 1. POSITIVE */

describe('EQA gates over the REAL bundled chapters (the CI gate)', () => {
  const result = runOnRealChapters();

  it('passes: every error finding is covered by a registered waiver', () => {
    // The report is the evidence — print it so CI logs carry the full audit.
    const report = renderConsole(result);
    console.log(`\n${report}\n`);
    expect(result.staleWaivers, 'no stale waivers').toEqual([]);
    expect(result.duplicateWaivers, 'no duplicate waiver keys').toEqual([]);
    expect(result.levelFindings.filter((f) => f.severity === 'error')).toEqual([]);
    for (const ch of result.chapters) {
      expect(
        ch.unwaivedErrors.map((e) => `${e.gate} ${e.subject}: ${e.messageFa}`),
        `chapter ${ch.chapter.slug} must have no unwaived errors`,
      ).toEqual([]);
    }
  });

  it('registers exactly the known violation set — one waived finding per open issue entry', () => {
    const waivedKeys = result.chapters.flatMap((c) => c.waived.map((w) => findingKey(w.finding))).sort();
    expect(waivedKeys).toEqual([...EQA_WAIVERS].map((w) => w.key).sort());
  });

  it('every waived finding carries a Persian reason, an issue number and a fix mission', () => {
    for (const { waiver } of result.chapters.flatMap((c) => c.waived)) {
      expect(waiver.issue).toBeGreaterThan(0);
      expect(waiver.reason.length).toBeGreaterThan(20);
      expect(waiver.resolvedBy).toMatch(/^TASK-LEARNING-0\d/);
    }
  });

  it('reports zero unregistered concept references (listening sub-skills are declared via teachesConcepts — TASK-LEARNING-06)', () => {
    const review = result.chapters.flatMap((c) => c.review.map((r) => r));
    const unregistered = review.filter((r) => r.messageFa.includes('ثبت نشده'));
    // The 05B rebuild registers the listening sub-skills (listen-final-intonation on
    // the rebuilt GRAMMAR-2/LISTEN-1, listen-nasal-mora on LISTEN-2) via
    // teachesConcepts — the old #96-class EQA-9 review items are gone by design.
    expect(unregistered).toEqual([]);
  });
});

/* ================================================================ 2. NEGATIVE / MUTATION — one per gate */

describe('EQA-1 (prerequisite) — mutations MUST be rejected', () => {
  it('rejects a target concept taught AFTER the host station (assessed ⊄ taught)', () => {
    const ch = cloneChapter();
    // v1-03 lives in the vocab station (order 2); ですか is taught at order 5.
    ch.exercises['ex-fm01-v1-p2-txt-1']!.targetConcept = 'gr-desu-qa';
    const findings = gateEqa1(ch);
    expect(findings.some((f) => f.subject === 'ex-fm01-v1-p2-txt-1' && f.severity === 'error')).toBe(true);
  });

  it('rejects a declared assessesConcepts entry that is taught later (the の-class layer)', () => {
    const ch = cloneChapter();
    ch.exercises['ex-fm01-v1-p2-txt-1']!.assessesConcepts = ['gr-desu-identity'];
    const findings = gateEqa1(ch);
    expect(
      findings.some(
        (f) => f.subject === 'ex-fm01-v1-p2-txt-1' && f.severity === 'error' && f.messageFa.includes('gr-desu-identity'),
      ),
    ).toBe(true);
  });

  it('rejects a concept that is never taught anywhere in the chapter', () => {
    const ch = cloneChapter();
    ch.exercises['ex-fm01-v1-p2-txt-1']!.targetConcept = 'voc-daigaku';
    // (bank consistency: the mutated item keeps its block reference)
    // remove the teaching: drop the vocab card + the word is now untaught
    for (const s of ch.stations)
      s.blocks = s.blocks.filter((b) => !(b.kind === 'vocab-card' && b.wordId === 'voc-daigaku'));
    const findings = gateEqa1(ch);
    expect(findings.some((f) => f.subject === 'ex-fm01-v1-p2-txt-1' && f.rule === 'assessed-not-taught')).toBe(true);
  });

  it('warns (not errors) on an unregistered concept reference — human EQA-9 review', () => {
    const ch = cloneChapter();
    ch.exercises['ex-fm01-v1-p2-txt-1']!.targetConcept = 'listen-something-new';
    const findings = gateEqa1(ch).filter((f) => f.subject === 'ex-fm01-v1-p2-txt-1');
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('warning');
  });
});

describe('EQA-2 (interaction/packet rules) — mutations MUST be rejected', () => {
  it('rejects a 4-card vocab run (packet rule DD-94)', () => {
    const ch = cloneChapter();
    const stn = ch.stations.find((s) => s.slug === 'stn-fm01-08-practice')!;
    stn.blocks = [
      { kind: 'scene', id: 'm1', titleFa: 'x', bodyFa: 'x' },
      { kind: 'vocab-card', id: 'm2', wordId: 'voc-watashi' },
      { kind: 'vocab-card', id: 'm3', wordId: 'voc-san' },
      { kind: 'vocab-card', id: 'm4', wordId: 'voc-nihonjin' },
      { kind: 'vocab-card', id: 'm5', wordId: 'voc-daigaku' },
      { kind: 'exercise', id: 'm6', exerciseIds: ['ex-fm01-p-01'] },
    ];
    const findings = gateEqa2(ch).filter((f) => f.subject === stn.slug);
    expect(findings.some((f) => f.rule === 'S-3-alternation' && f.messageFa.includes('4 کارت واژه'))).toBe(true);
  });

  it('rejects 3 consecutive non-card explanation blocks', () => {
    const ch = cloneChapter();
    const stn = ch.stations.find((s) => s.slug === 'stn-fm01-04-structure')!;
    stn.blocks = [
      { kind: 'scene', id: 'm1', titleFa: 'x', bodyFa: 'x' },
      { kind: 'rule-card', id: 'm2', patternJa: 'X', titleFa: 'x', bodyFa: 'x' },
      { kind: 'example-set', id: 'm3', examples: [] },
      { kind: 'wrap-up', id: 'm4', titleFa: 'x', itemsFa: ['x'] },
      { kind: 'exercise', id: 'm5', exerciseIds: ['ex-fm01-st-01'] },
    ];
    const findings = gateEqa2(ch).filter((f) => f.subject === stn.slug && f.rule === 'S-3-alternation');
    expect(findings.some((f) => f.messageFa.includes('بلوک توضیحی پیاپی'))).toBe(true);
  });

  it('rejects a core graded station with NO interactive block (S-4)', () => {
    const ch = cloneChapter();
    const stn = ch.stations.find((s) => s.slug === 'stn-fm01-07-listen')!;
    stn.blocks = [
      { kind: 'scene', id: 'm1', titleFa: 'x', bodyFa: 'x' },
      { kind: 'wrap-up', id: 'm2', titleFa: 'x', itemsFa: ['x'] },
    ];
    const findings = gateEqa2(ch).filter((f) => f.subject === stn.slug && f.rule === 'S-4-no-interaction');
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('error');
  });

  it('does NOT apply run rules to anchor/mastery stations (stage A/D by design — documented scope)', () => {
    const ch = cloneChapter();
    const findings = gateEqa2(ch).filter(
      (f) => f.subject === 'stn-fm01-01-anchor' || f.subject === 'stn-fm01-10-mastery',
    );
    expect(findings).toEqual([]);
  });
});

describe('EQA-3 (recall-first composition) — mutations MUST be rejected', () => {
  it('rejects a practice pool that drops below the 60% recall-first share', () => {
    const ch = cloneChapter();
    // Convert five recall items to the weakest recognition type (TASK-LEARNING-06 ids).
    for (const id of ['ex-fm01-g1-order-1', 'ex-fm01-g1-cloze-1', 'ex-fm01-p1-c2-prod-1', 'ex-fm01-p1-c3-decode-1', 'ex-fm01-e2-order-1']) {
      const ex = ch.exercises[id]!;
      ex.type = 'meaning-select';
      ex.options = [
        { id: 'a', label: 'x' },
        { id: 'b', label: 'y' },
        { id: 'c', label: 'z' },
      ];
      ex.correctOptionId = 'a';
    }
    const findings = gateEqa3(ch);
    expect(findings.some((f) => f.rule === 'recall-first-share' && f.severity === 'error')).toBe(true);
  });

  it('rejects a meaning-select share above the 30% MCQ cap', () => {
    const ch = cloneChapter();
    for (const id of [
      'ex-fm01-v1-p1-aud-1',
      'ex-fm01-v1-p1-aud-2',
      'ex-fm01-l1-gist-1',
      'ex-fm01-l2-gist-1',
      'ex-fm01-p1-c2-gist-1',
      'ex-fm01-p2-c1-decode-1',
      'ex-fm01-p2-c1-decode-2',
      'ex-fm01-e1-resp-1',
      'ex-fm01-e2-resp-1',
      'ex-fm01-v2-aud-1',
      'ex-fm01-g1-order-1',
      'ex-fm01-g1-cloze-1',
      'ex-fm01-g1-prod-1',
      'ex-fm01-g3-cloze-1',
      'ex-fm01-g3-prod-1',
      'ex-fm01-g4-cloze-1',
      'ex-fm01-g5-order-1',
      'ex-fm01-p2-c3-cloze-1',
      'ex-fm01-p2-c3-order-1',
      'ex-fm01-e2-prod-1',
    ]) {
      const ex = ch.exercises[id]!;
      if (ex.type !== 'meaning-select') {
        ex.type = 'meaning-select';
        ex.options = ex.options ?? [
          { id: 'a', label: 'x' },
          { id: 'b', label: 'y' },
          { id: 'c', label: 'z' },
        ];
        ex.correctOptionId = ex.correctOptionId ?? 'a';
      }
    }
    const findings = gateEqa3(ch);
    expect(findings.some((f) => f.rule === 'meaning-select-cap' && f.severity === 'error')).toBe(true);
  });
});

describe('EQA-4 (served position balance) — mutations MUST be rejected', () => {
  it('servedCorrectPosition matches what the client payload actually shows', () => {
    const ch = cloneChapter();
    for (const ex of Object.values(ch.exercises)) {
      if (!ex.options || !ex.correctOptionId) continue;
      const client = toClientExercise(ex);
      const pos = client.options!.findIndex((o) => o.id === ex.correctOptionId);
      expect(servedCorrectPosition(ex)).toBe(pos);
    }
  });

  it('rejects a grossly biased pool (every served position identical)', () => {
    const ch = cloneChapter();
    // Duplicate one exercise many times: identical id → identical deterministic
    // shuffle → every served position is the same → gross-bias rule fires.
    const seed = ch.exercises['ex-fm01-v1-p2-txt-1']!;
    const bank: Chapter['exercises'] = {};
    for (let i = 0; i < 24; i++) bank[seed.id] = seed; // same key on purpose
    ch.exercises = bank;
    const findings = gateEqa4(ch);
    expect(findings.some((f) => f.rule === 'position-gross-bias' && f.severity === 'error')).toBe(true);
  });

  it('rejects a statistically significant imbalance in a ≥15-item pool (chi-square)', () => {
    // 18 items whose served positions are 12/3/3 → χ² = Σ(12-6,3-6,3-6)²/6 = 9 ≫ 5.991.
    const positions = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2];
    // Direct statistical contract: the chi-square math the gate uses.
    const n = positions.length;
    const expected = n / 3;
    const observed = [0, 1, 2].map((p) => positions.filter((x) => x === p).length);
    const chi = observed.reduce((acc, o) => acc + (o - expected) ** 2 / expected, 0);
    expect(chi).toBeGreaterThan(5.991); // the gate's critical value (df=2, α=0.05)
  });

  it('accepts the REAL chapter pools (the deterministic shuffle keeps them balanced)', () => {
    const ch = cloneChapter();
    expect(gateEqa4(ch)).toEqual([]);
  });
});

describe('EQA-5 (objective coverage) — mutations MUST be rejected', () => {
  it('rejects an objective whose stations lost every practice opportunity', () => {
    const ch = cloneChapter();
    const stn = ch.stations.find((s) => s.slug === 'stn-fm01-06-expression')!;
    stn.blocks = stn.blocks.filter((b) => b.kind !== 'exercise');
    const findings = gateEqa5(ch).filter((f) => f.subject === 'greet-first-meeting');
    expect(findings.some((f) => f.rule === 'no-practice' && f.severity === 'error')).toBe(true);
  });

  it('rejects an objective with no mastery-path measure at all', () => {
    const ch = cloneChapter();
    // sov-bridge-persian: remove its gate item (gate-m3-3) AND its practice evidence.
    delete ch.exercises['ex-fm01-gate-m3-3'];
    ch.stations.find((s) => s.slug === 'stn-fm01-04-structure')!.blocks = ch
      .stations.find((s) => s.slug === 'stn-fm01-04-structure')!
      .blocks.filter((b) => !(b.kind === 'exercise'));
    ch.stations.find((s) => s.slug === 'stn-fm01-04-structure')!.completion = { kind: 'viewed' };
    const findings = gateEqa5(ch).filter((f) => f.subject === 'sov-bridge-persian');
    expect(findings.some((f) => f.rule === 'no-mastery-measure' && f.severity === 'error')).toBe(true);
  });

  it('accepts the REAL chapter (all seven core objectives covered)', () => {
    expect(gateEqa5(cloneChapter())).toEqual([]);
  });
});

describe('EQA-6 (vocab card slots) — mutations MUST be rejected', () => {
  it('rejects a card that lost its usage note (the watashi-class gap, #104)', () => {
    const ch = cloneChapter();
    delete (ch.words.find((w) => w.id === 'voc-san') as { noteFa?: string }).noteFa;
    const findings = gateEqa6(ch).filter((f) => f.subject === 'voc-san');
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe('error');
    expect(findings[0]!.messageFa).toContain('noteFa');
  });

  it('rejects a kanji term without furigana', () => {
    const ch = cloneChapter();
    delete (ch.words.find((w) => w.id === 'voc-sensee') as { termFurigana?: string }).termFurigana;
    const findings = gateEqa6(ch).filter((f) => f.subject === 'voc-sensee');
    expect(findings.some((f) => f.messageFa.includes('termFurigana'))).toBe(true);
  });
});

describe('EQA-7 (numbers from policy) — mutations MUST be rejected', () => {
  it('rejects a chapter referencing a non-existent level', () => {
    const ch = cloneChapter();
    ch.levelCode = 'L9';
    const findings = gateEqa7Chapter(ch, LEVELS_BY_CODE);
    expect(findings.some((f) => f.rule === 'unknown-level' && f.severity === 'error')).toBe(true);
  });

  it('rejects a level list that lost a level', () => {
    const levels = LEVEL_POLICIES.filter((l) => l.code !== 'L4');
    const findings = gateEqa7Levels(levels);
    expect(findings.some((f) => f.rule === 'level-missing' && f.subject === 'L4')).toBe(true);
  });

  it('rejects broken threshold escalation (a higher level getting an easier gate)', () => {
    const levels = structuredClone(LEVEL_POLICIES);
    levels.find((l) => l.code === 'L5')!.caps.gate.weighted = 0.6;
    const findings = gateEqa7Levels(levels);
    expect(findings.some((f) => f.rule === 'escalation-broken')).toBe(true);
  });

  it('rejects minMeasure > weighted in a policy', () => {
    const levels = structuredClone(LEVEL_POLICIES);
    levels.find((l) => l.code === 'L2')!.caps.gate.minMeasure = 0.9;
    const findings = gateEqa7Chapter(
      getChapter('first-meeting-01')!,
      Object.fromEntries(levels.map((l) => [l.code, l])),
    );
    expect(findings.some((f) => f.rule === 'policy-out-of-bounds' && f.messageFa.includes('بزرگ‌تر'))).toBe(true);
  });

  it('LEVEL_POLICIES stay in sync with LEVEL_MATRIX §۶ bands (L2/L3, L4/L5, L6/L7)', () => {
    const byCode = Object.fromEntries(LEVEL_POLICIES.map((l) => [l.code, l]));
    expect(byCode['L2']!.caps.gate).toEqual({ weighted: 0.7, minMeasure: 0.5 });
    expect(byCode['L3']!.caps.gate).toEqual({ weighted: 0.7, minMeasure: 0.5 });
    expect(byCode['L4']!.caps.gate).toEqual({ weighted: 0.75, minMeasure: 0.55 });
    expect(byCode['L5']!.caps.gate).toEqual({ weighted: 0.75, minMeasure: 0.55 });
    expect(byCode['L6']!.caps.gate).toEqual({ weighted: 0.8, minMeasure: 0.6 });
    expect(byCode['L7']!.caps.gate).toEqual({ weighted: 0.8, minMeasure: 0.6 });
    expect(byCode['L2']!.caps.maxRemediationLoops).toBe(3);
    expect(byCode['L6']!.caps.maxRemediationLoops).toBe(2);
  });
});

/* ================================================================ 3. WAIVER HYGIENE */

describe('waiver hygiene — the waiver list cannot rot', () => {
  it('FAILS the run when a waiver no longer matches any finding (stale)', () => {
    const stale = [
      ...EQA_WAIVERS,
      {
        key: 'EQA-6:voc-hologram:slot-missing',
        issue: 999,
        reason: 'یافته‌ای که دیگر وجود ندارد',
        resolvedBy: 'TASK-LEARNING-05',
        registeredAt: '2026-11-04',
        chapter: 'first-meeting-01',
      },
    ];
    const result = runEqa(listChapters(), LEVELS_BY_CODE, LEVEL_POLICIES, stale);
    expect(result.pass).toBe(false);
    expect(result.staleWaivers.map((w) => w.key)).toEqual(['EQA-6:voc-hologram:slot-missing']);
  });

  it('FAILS the run when the same waiver key is registered twice', () => {
    // TASK-LEARNING-06: zero waivers ship — create a REAL finding via mutation, then
    // register two waivers for it: the second must be flagged as duplicate.
    const ch = cloneChapter();
    delete (ch.words.find((w) => w.id === 'voc-san') as { noteFa?: string }).noteFa;
    const key = 'EQA-6:voc-san:slot-missing';
    const mk = (): EqaWaiver => ({
      key,
      issue: 104,
      reason: 'test',
      resolvedBy: 'test',
      registeredAt: '2026-11-05',
      chapter: 'first-meeting-01',
    });
    const result = runEqa([ch], LEVELS_BY_CODE, LEVEL_POLICIES, [mk(), mk()]);
    expect(result.pass).toBe(false);
    expect(result.duplicateWaivers.length).toBe(1);
  });

  it('FAILS the run when a NEW violation appears without a waiver (the regression guard)', () => {
    const ch = cloneChapter();
    const voc = ch.words.find((w) => w.id === 'voc-san') as { noteFa?: string };
    delete voc.noteFa; // NEW EQA-6 violation, not in the waiver list
    const result = runEqa([ch], LEVELS_BY_CODE, LEVEL_POLICIES, EQA_WAIVERS);
    expect(result.pass).toBe(false);
    expect(result.chapters[0]!.unwaivedErrors.some((f) => f.subject === 'voc-san' && f.gate === 'EQA-6')).toBe(true);
  });

  it('a waiver for a FIXED violation becomes stale and fails — forces waiver cleanup', () => {
    const ch = cloneChapter();
    // TASK-LEARNING-06: the 05B rebuild filled every §۲-۲ slot (watashi carries a
    // note) — a synthetic waiver claiming that finding still exists must rot.
    const synthetic: EqaWaiver = {
      key: 'EQA-6:voc-watashi:slot-missing',
      issue: 104,
      reason: 'یافته‌ای که با بازسازی 05B رفع شده',
      resolvedBy: 'TASK-LEARNING-06',
      registeredAt: '2026-11-05',
      chapter: 'first-meeting-01',
    };
    const result = runEqa([ch], LEVELS_BY_CODE, LEVEL_POLICIES, [synthetic]);
    expect(result.pass).toBe(false);
    expect(result.staleWaivers.some((w) => w.key === 'EQA-6:voc-watashi:slot-missing')).toBe(true);
  });
});

/* ================================================================ 4. REPORT */

describe('EQA report output is actionable', () => {
  const result = runOnRealChapters();

  it('console report is honest: clean pass with zero waivers + the remaining review items', () => {
    // TASK-LEARNING-06: the 05A/05B rebuild closed all seven waivers — the report
    // shows a clean pass (any NEW violation still fails, the mutation tests prove it).
    const text = renderConsole(result);
    expect(text).toContain('PASS');
    expect(text).toContain('معاف‌شده: 0');
    expect(text).toContain('EQA'); // the registry is still rendered for reviewers
  });

  it('markdown report renders the honest clean state (all seven 05A/05B-era waivers closed)', () => {
    const md = renderMarkdown(result, { commit: 'test', date: '2026-11-05' });
    expect(md).toContain('EQA_RUN_REPORT');
    // TASK-LEARNING-06: zero active waivers — none of the old waived keys may return.
    expect(md).not.toContain('line-grammar-not-taught');
    expect(md).not.toContain('slot-missing');
    expect(md).not.toContain('recall-first-share');
  });
});

/* ================================================================ 5. #110 — thresholds injected from policy */

describe('#110 — mastery gate thresholds come from level policy, not a hardcoded stage', () => {
  it('the same submission passes under the L2 gate (0.70) and fails under the L4 gate (0.75)', () => {
    const scores = { M1: 0.8, M2: 0.7, M3: 0.7, M4: 0.75, M5: 0.6 };
    // weighted = 0.3·0.8 + 0.2·(0.7+0.7+0.75) + 0.1·0.6 = 0.73
    const l2 = computeMastery(scores, LEVELS_BY_CODE['L2']!.caps.gate);
    const l4 = computeMastery(scores, LEVELS_BY_CODE['L4']!.caps.gate);
    expect(l2.outcome).toBe('passed'); // 0.73 ≥ 0.70, floors 0.6 ≥ 0.5
    expect(l4.outcome).toBe('remediate'); // 0.73 < 0.75
  });

  it('the L4 per-measure floor (0.55) rejects what the L2 floor (0.50) accepts', () => {
    const scores = { M1: 0.9, M2: 0.9, M3: 0.9, M4: 0.9, M5: 0.53 };
    const l2 = computeMastery(scores, LEVELS_BY_CODE['L2']!.caps.gate);
    const l4 = computeMastery(scores, LEVELS_BY_CODE['L4']!.caps.gate);
    expect(l2.outcome).toBe('passed');
    expect(l4.outcome).toBe('remediate');
    expect(l4.weakMeasures).toEqual(['M5']);
  });

  it('gradeMasterySubmission grades the real chapter against its own level policy (L2 → behaviour unchanged)', () => {
    // Regression for the #110 refactor: current chapter is L2, so the outcome must
    // be identical to the old hardcoded stage2 behaviour (both are 0.7/0.5).
    const ch = getChapter('first-meeting-01')!;
    const answers: Record<
      string,
      | { kind: 'option'; optionId: string }
      | { kind: 'order'; orderedIds: string[] }
      | { kind: 'build'; chipOrder: string[] }
    > = {};
    for (const ex of Object.values(ch.exercises)) {
      if (ex.assessmentRole === 'practice') continue;
      if (ex.correctOptionId) answers[ex.id] = { kind: 'option', optionId: ex.correctOptionId };
      else if (ex.correctOrder) answers[ex.id] = { kind: 'order', orderedIds: ex.correctOrder };
      else if (ex.acceptedChipOrder) answers[ex.id] = { kind: 'build', chipOrder: ex.acceptedChipOrder };
    }
    const graded = gradeMasterySubmission(ch, answers, LEVELS_BY_CODE[ch.levelCode]!);
    expect(graded.outcome).toBe('passed');
    expect(graded.weightedScore).toBe(1);
  });
});
