/**
 * Runs the PRODUCT validators (validation.ts + dialogue cross-check) on the
 * compiled draft chapter — the publish-intent gate beyond the engine validator.
 * Usage: tsx scripts/lesson-engine/check-product.ts <draft.yaml>
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { compileEngineChapter, engineChapterSchema } from '../../src/modules/lesson-engine/index';
import { validateChapter, validateChapterAgainstDialogue } from '../../src/modules/curriculum/validation';
import { LEVELS_BY_CODE } from '../../src/modules/curriculum/content/levels';
import { loadDialogueBundle } from '../../src/lib/poc/dialogue-bundle';

const [, , input] = process.argv;
if (!input) { console.error('usage: tsx check-product.ts <draft.yaml>'); process.exit(2); }
const draft = engineChapterSchema.parse(parse(readFileSync(input, 'utf8')));
const { chapter } = compileEngineChapter(draft);
const level = LEVELS_BY_CODE[chapter.levelCode];
if (!level) { console.error('unknown level', chapter.levelCode); process.exit(1); }
const bundle = loadDialogueBundle(chapter.dialogueSlug);
const lineIds = bundle.dialogue.lines.map((l) => l.id);
const v = [...validateChapter(chapter, level), ...validateChapterAgainstDialogue(chapter, level, lineIds)];
if (v.length === 0) {
  console.log('PRODUCT VALIDATION: PASS —', chapter.stations.length, 'stations,', Object.keys(chapter.exercises).length, 'exercises,', chapter.words.length, 'words,', chapter.grammar.length, 'grammar clusters');
} else {
  console.log('PRODUCT VALIDATION FAILURES (' + v.length + '):');
  for (const x of v) console.log(`- [${x.rule}] ${x.message}`);
  process.exit(1);
}
