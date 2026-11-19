/**
 * HANASO — compile-check CLI (mission phase 3): prove a draft compiles into the
 * EXISTING runtime Chapter shape (D-0011). Usage: tsx compile-check.ts <draft.yaml>
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import {
  compileEngineChapter,
  engineChapterSchema,
  formatValidatorReport,
  validateEngineChapter,
} from '../../src/modules/lesson-engine/index';

const [, , input] = process.argv;
if (!input) {
  console.error('usage: tsx compile-check.ts <draft.yaml>');
  process.exit(2);
}
const parsed = engineChapterSchema.safeParse(parse(readFileSync(input, 'utf8')));
if (!parsed.success) {
  console.error('SCHEMA INVALID:', JSON.stringify(parsed.error.flatten(), null, 2));
  process.exit(1);
}
const vReport = validateEngineChapter(parsed.data, { mode: 'draft' });
console.log(formatValidatorReport(vReport));
if (!vReport.passed) process.exit(1);
const { chapter, findings } = compileEngineChapter(parsed.data);
console.log(
  `\nCOMPILED ✓ runtime Chapter: slug=${chapter.slug} stations=${chapter.stations.length} exercises=${Object.keys(chapter.exercises).length} words=${chapter.words.length} grammar=${chapter.grammar.length} units=${chapter.units?.length ?? 0}`,
);
for (const f of findings) console.log(`- [${f.rule}/${f.severity}] ${f.message}`);
process.exit(0);
