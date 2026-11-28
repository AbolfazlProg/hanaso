/**
 * B4 ground-truth scan: full EQA report for first-meeting-01 — every finding
 * (waived or not) with station + reason, so the deep pass fixes real debt.
 * Also prints the per-station assessment-event ordering for stations 19-23
 * and the difficulty sequence per station (progressive-difficulty check).
 */
import { getChapter } from '../../apps/web/src/modules/curriculum/content';
import { runEqa } from '../../apps/web/src/modules/curriculum/eqa/run';
import { LEVELS_BY_CODE, LEVEL_POLICIES } from '../../apps/web/src/modules/curriculum/content/levels';
import { EQA_WAIVERS } from '../../apps/web/src/modules/curriculum/content/eqa-waivers';

const chapters = [getChapter('kana-foundation-01'), getChapter('kana-expansion-01'), getChapter('first-meeting-01')];

const res = runEqa(chapters, LEVELS_BY_CODE, LEVEL_POLICIES, EQA_WAIVERS);

console.log('=== EQA pass:', res.pass, '===');
console.log(
  'stale waivers:',
  res.staleWaivers.map((w) => w.key),
);
console.log('duplicate waivers:', res.duplicateWaivers.length);

const fm: any = res.chapters.find((c: any) => c.chapter.slug === 'first-meeting-01')!;
console.log('\n--- first-meeting-01 findings (errors+waived) ---');
console.log('fm errors (unwaived):', (fm.errors ?? []).length);
for (const f of fm.errors ?? fm.findings) {
  const station = (f as any).stationSlug ?? (f as any).station?.slug ?? '';
  console.log(`[${f.gate}] ${station} :: ${f.key ?? ''} :: ${(f as any).messageFa ?? (f as any).reason ?? ''}`);
}
for (const { finding } of fm.waived) {
  const station = (finding as any).stationSlug ?? (finding as any).station?.slug ?? '';
  console.log(
    `[WAIVED:${finding.gate}] ${station} :: ${finding.key ?? ''} :: ${(finding as any).messageFa ?? (finding as any).reason ?? ''}`,
  );
}

console.log('\n--- station difficulty sequences (fm01) ---');
const ch = getChapter('first-meeting-01');
for (const st of ch.stations) {
  const seq: string[] = [];
  for (const b of st.blocks) {
    if (b.kind === 'exercise') {
      for (const eid of (b as any).exerciseIds ?? []) {
        const e = (ch.exercises as any)[eid];
        if (e) seq.push(`${eid.replace('ex-fm01-', '')}:d${e.difficulty}`);
      }
    }
  }
  if (seq.length) console.log(`${st.slug} (${st.type}) :: ${seq.join(' → ')}`);
}
