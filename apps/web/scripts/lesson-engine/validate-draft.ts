/**
 * HANASO — lesson-engine draft validator CLI (mission phase 5).
 * Usage: npx tsx scripts/lesson-engine/validate-draft.ts <draft.yaml> [--product]
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { engineChapterSchema, validateEngineChapter, formatValidatorReport } from '../../src/modules/lesson-engine/index';

const [, , input, modeFlag] = process.argv;
if (!input) {
  console.error('usage: tsx validate-draft.ts <draft.yaml> [--product]');
  process.exit(2);
}
const parsed = engineChapterSchema.safeParse(parse(readFileSync(input, 'utf8')));
if (!parsed.success) {
  console.error('SCHEMA INVALID:', JSON.stringify(parsed.error.flatten(), null, 2));
  process.exit(1);
}
const report = validateEngineChapter(parsed.data, { mode: modeFlag === '--product' ? 'product' : 'draft' });
console.log(formatValidatorReport(report));
process.exit(report.passed ? 0 : 1);
