/**
 * HANASO — Gate P1 CLI (KANJI-TWO-PHASE §۵): validate a curriculum plan.
 *
 * Usage: tsx scripts/lesson-engine/validate-plan.ts <plan.yaml>
 * Exit: 0 = plan ACCEPTED (phase 2 may begin) · 1 = hard findings.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { curriculumPlanSchema, type CurriculumPlan } from '../../src/modules/lesson-engine/plan-types';
import { gateP1ValidatePlan } from '../../src/modules/lesson-engine/plan-validate';

const [, , input] = process.argv;
if (!input) {
  console.error('usage: tsx validate-plan.ts <plan.yaml>');
  process.exit(2);
}
const parsed = curriculumPlanSchema.safeParse(parse(readFileSync(input, 'utf8')));
if (!parsed.success) {
  console.error('SCHEMA INVALID:', JSON.stringify(parsed.error.flatten(), null, 2));
  process.exit(1);
}
const plan: CurriculumPlan = parsed.data;
const report = gateP1ValidatePlan(plan);
console.log(`# گزارش گیت P1 — طرح ${plan.chapterId}`);
console.log(
  `قواعد بررسی‌شده: ${report.checkedRules} | HARD: ${report.hardCount} | SOFT: ${report.softCount} | ${report.passed ? '[PASS — طرح پذیرفته شد؛ فاز ۲ می‌تواند شروع شود]' : '[FAIL — فاز ۲ شروع نمی‌شود]'}`,
);
for (const sev of ['hard', 'soft'] as const) {
  const items = report.findings.filter((f) => f.severity === sev);
  if (items.length > 0) {
    console.log(`\n## ${sev === 'hard' ? 'خطاهای سخت (باید رفع شوند)' : 'هشدارها'}`);
    for (const f of items) console.log(`- [${f.rule}] ${f.location}: ${f.message}`);
  }
}
if (report.softCount > 0 && report.hardCount === 0) {
  console.log('\nهشدارهای SOFT باید با دلیل ثبت شوند (QC «حذف با دلیل»).');
}
process.exit(report.passed ? 0 : 1);
