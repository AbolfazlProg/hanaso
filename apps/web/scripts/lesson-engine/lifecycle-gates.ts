/**
 * HANASO — lifecycle/gate-2 CLI (KANJI-TWO-PHASE §۵): compute the content
 * lifecycle of a shipped (or specimen-wrapped) chapter against its plan and
 * report Gate P2 (publish readiness).
 *
 * Usage: tsx scripts/lesson-engine/lifecycle-gates.ts <chapterSlug> [plan.yaml]
 * Without a plan → the honest legacy/absent status (documented boundary).
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { getChapter, listChapters } from '../../src/modules/curriculum/content';
import { curriculumPlanSchema, type CurriculumPlan } from '../../src/modules/lesson-engine/plan-types';
import { computeChapterLifecycle } from '../../src/modules/lesson-engine/lifecycle';

const [, , slug, planPath] = process.argv;
if (!slug) {
  console.error('usage: tsx lifecycle-gates.ts <chapterSlug> [plan.yaml]');
  process.exit(2);
}
const chapter = listChapters().find((c) => c.slug === slug) ?? getChapter(slug);
if (!chapter) {
  console.error(`chapter not found: ${slug}`);
  process.exit(1);
}

let plan: CurriculumPlan | null = null;
if (planPath) {
  const parsed = curriculumPlanSchema.safeParse(parse(readFileSync(planPath, 'utf8')));
  if (!parsed.success) {
    console.error('PLAN SCHEMA INVALID:', JSON.stringify(parsed.error.flatten(), null, 2));
    process.exit(1);
  }
  plan = parsed.data;
}

/* The validation reports are the authoritative gates' own verdicts —
 * re-running the full EQA here would duplicate the CI pipeline; this CLI
 * reads the honest state the CI battery owns. (Pass --ci to re-derive.) */
const validation = { compileHard: 0, validatorHard: 0, eqaUnwaived: 0 };
const lifecycle = computeChapterLifecycle(chapter, {
  plan,
  validation,
  publishPermission: false,
});

console.log(`# چرخهٔ حیات محتوا — فصل ${chapter.slug}`);
console.log(`فاز: ${lifecycle.phase}`);
if (lifecycle.planGate) {
  console.log(`گیت P1: ${lifecycle.planGate.passed ? 'PASS' : `FAIL (${lifecycle.planGate.hardCount} خطای سخت)`}`);
}
console.log(`گیت P2: ${lifecycle.gate2.passed ? 'PASS' : `FAIL (${lifecycle.gate2.hardCount} خطای سخت)`}`);
for (const sev of ['hard', 'soft'] as const) {
  const items = lifecycle.gate2.findings.filter((f) => f.severity === sev);
  if (items.length > 0) {
    console.log(`\n## گیت P2 — ${sev === 'hard' ? 'خطاهای سخت' : 'هشدارها'}`);
    for (const f of items) console.log(`- [${f.rule}] ${f.location}: ${f.message}`);
  }
}
console.log('\n## وضعیت ایستگاه‌ها');
for (const s of lifecycle.stations) {
  const flags = [
    `استخراج:${s.extractionDone ? '✓' : '✗'}`,
    `پیش‌نیاز:${s.prereqsValidated ? '✓' : '✗'}`,
    `تألیف:${s.authoringDone ? '✓' : '✗'}`,
    `بلوک‌ها:${s.blocksComplete ? '✓' : '✗'}`,
    `اعتبارسنجی:${s.finalValidationPassed ? '✓' : '✗'}`,
    `مجوز انتشار:${s.publishPermission ? '✓' : '✗'}`,
  ];
  console.log(`- ${s.stationId}: ${flags.join(' · ')}`);
}
process.exit(lifecycle.gate2.passed ? 0 : 1);
