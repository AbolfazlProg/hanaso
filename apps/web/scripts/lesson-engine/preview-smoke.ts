/** Preview smoke: the full product path (loadChapterBundle incl. dialogue + validation) resolves the DRAFT. */
import { loadChapterBundle } from '../../src/modules/curriculum/server';
const b = loadChapterBundle('n5-lesson-01');
console.log(
  'PREVIEW OK:',
  b.chapter.slug,
  '| dialogue:',
  b.chapter.dialogueSlug,
  '| lines:',
  b.lineIds.length,
  '| stations:',
  b.chapter.stations.length,
  '| first block kinds:',
  b.chapter.stations[0]!.blocks.map((x) => x.kind).join(','),
);
console.log('journey chapters untouched:', JSON.stringify(loadChapterBundle('kana-foundation-01').chapter.slug));
