#!/usr/bin/env node
/**
 * HANASO — Knowledge Reference Registry snapshot (ENGINE-REFORM 2026-11-22).
 *
 * Human/search tooling over the course-wide knowledge registry: prints the
 * registry identity (schema version + digest), entry counts by kind, a few
 * search examples, and writes the full JSON snapshot to
 * ops/reports/knowledge-registry.snapshot.json (committed per release — the
 * versioned, searchable record the mission asked for; CI keeps it in sync via
 * the digest gates, this file keeps it human-readable).
 *
 * Run: cd apps/web && npx tsx scripts/knowledge-registry-snapshot.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { listChapters } from '@/modules/curriculum/content';
import { buildKnowledgeRegistry, searchKnowledge, taughtSetAt } from '@/modules/curriculum/knowledge';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..'); // apps/web/scripts → repo root

const registry = buildKnowledgeRegistry(listChapters());

const byKind = registry.entries.reduce((acc, e) => {
  acc[e.kind] = (acc[e.kind] ?? 0) + 1;
  return acc;
}, {});

console.log('════ Knowledge Reference Registry ════');
console.log(`schemaVersion : ${registry.schemaVersion}`);
console.log(`digest        : ${registry.digest}`);
console.log(`course        : ${registry.course.join(' → ')}`);
console.log(
  `entries       : ${registry.entries.length} (${Object.entries(byKind)
    .map(([k, v]) => `${k}:${v}`)
    .join(' ')})`,
);
console.log(`notes         : ${registry.notes.length} (all warning-grade, reported)`);
console.log('');

console.log('— search examples —');
for (const q of ['だいがく', 'daigaku', 'きゃ', 'キャ', 'せんせい']) {
  const hits = searchKnowledge(registry, { query: q, foldScript: true }).slice(0, 4);
  console.log(
    `  «${q}» → ${
      hits
        .map(
          (h) =>
            `${h.entry.id} [${h.matchedOn}] @${h.entry.firstTaught.chapterSlug}/${h.entry.firstTaught.stationSlug}`,
        )
        .join(' · ') || '(هیچ)'
    }`,
  );
}
console.log('');

console.log('— timing queries —');
const hd1 = taughtSetAt(registry, 'kana-expansion-01', 'stn-kana-hd1');
console.log(`  taught at stn-kana-hd1 (inclusive): ${hd1.size} items (e.g. hira-ga: ${hd1.has('hira-ga')})`);

const snapshot = {
  generatedAt: new Date().toISOString(),
  schemaVersion: registry.schemaVersion,
  digest: registry.digest,
  course: registry.course,
  entryCount: registry.entries.length,
  byKind,
  notes: registry.notes,
  entries: [...registry.entries]
    .sort((a, b) => a.firstTaught.globalIndex - b.firstTaught.globalIndex || a.id.localeCompare(b.id))
    .map((e) => ({
      id: e.id,
      kind: e.kind,
      surface: e.surface,
      reading: e.reading ?? null,
      meaningFa: e.meaningFa ?? null,
      firstTaught: e.firstTaught,
      exposureAt: e.exposureAt ?? null,
      prerequisites: e.prerequisites,
    })),
};

const outDir = join(repoRoot, 'ops', 'reports');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'knowledge-registry.snapshot.json');
writeFileSync(outPath, JSON.stringify(snapshot, null, 1) + '\n');
console.log(`snapshot written: ${outPath} (${registry.entries.length} entries)`);
