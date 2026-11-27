/**
 * Scan: «خط N» references in learner-facing Fa strings vs the station's
 * lineRefs — every mention must be an anchored line of THAT station.
 */
import { getChapter } from '../../apps/web/src/modules/curriculum/content';
import type { Chapter, Station, TeachingBlock, Exercise } from '../../apps/web/src/modules/curriculum/types';

function blockStrings(b: TeachingBlock): string[] {
  const out: string[] = [];
  const push = (s: string | undefined) => {
    if (typeof s === 'string' && s.length) out.push(s);
  };
  if ('titleFa' in b) push((b as { titleFa?: string }).titleFa);
  if ('bodyFa' in b) push((b as { bodyFa?: string }).bodyFa);
  if ('questionFa' in b) push((b as { questionFa?: string }).questionFa);
  if ('promptFa' in b) push((b as { promptFa?: string }).promptFa);
  if ('explainFa' in b) push((b as { explainFa?: string }).explainFa);
  if ('revealFa' in b) push((b as { revealFa?: string }).revealFa);
  if ('persianBridgeFa' in b) push((b as { persianBridgeFa?: string }).persianBridgeFa);
  if ('listenNoteFa' in b) push((b as { listenNoteFa?: string }).listenNoteFa);
  if ('whyFa' in b) push((b as { whyFa?: string }).whyFa);
  if (b.kind === 'example-set') {
    for (const ex of (b as { examples: { fa?: string; whyFa?: string }[] }).examples) {
      push(ex.fa);
      push(ex.whyFa);
    }
  }
  return out;
}

function exStrings(ex: Exercise): string[] {
  const out = [ex.promptFa];
  if (ex.feedback) out.push(ex.feedback.f1Fa, ex.feedback.f2HintFa, ex.feedback.f3ExplainFa);
  if (ex.distractorRationaleFa) out.push(...Object.values(ex.distractorRationaleFa));
  return out.filter(Boolean);
}

for (const slug of ['kana-foundation-01', 'kana-expansion-01', 'first-meeting-01']) {
  const ch: Chapter = getChapter(slug);
  const exById = new Map(Object.entries(ch.exercises));
  const violations: string[] = [];
  for (const stn of ch.stations) {
    const ids = new Set(stn.lineRefs.map((r) => Number(r.split('-l').pop())));
    // exercises referenced by this station extend the allowed set (their own lineRef/audioLineRef)
    for (const b of stn.blocks) {
      if (b.kind === 'exercise') {
        for (const id of (b as { exerciseIds: string[] }).exerciseIds) {
          const ex = exById.get(id);
          if (!ex) continue;
          for (const ref of [ex.lineRef, ex.audioLineRef]) {
            if (ref) ids.add(Number(ref.split('-l').pop()));
          }
        }
      }
    }
    const check = (where: string, text: string) => {
      for (const m of text.matchAll(/خط\s*[۰-۹0-9]+/g)) {
        const faDigits = '۰۱۲۳۴۵۶۷۸۹';
        const raw = m[0].replace(/خط\s*/, '');
        const n = Number(
          raw
            .split('')
            .map((d) => (faDigits.includes(d) ? String(faDigits.indexOf(d)) : d))
            .join(''),
        );
        if (!ids.has(n))
          violations.push(
            `${stn.slug}/${where}: «${m[0]}» but L${n} not in lineRefs {${[...ids].sort((a, b) => a - b).join(',')}}`,
          );
      }
    };
    for (const b of stn.blocks) {
      for (const s of blockStrings(b)) check(b.id, s);
      if (b.kind === 'exercise') {
        for (const id of (b as { exerciseIds: string[] }).exerciseIds) {
          const ex = exById.get(id);
          if (ex) for (const s of exStrings(ex)) check(id, s);
        }
      }
    }
  }
  console.log(`${slug}: ${violations.length} line-mention violations`);
  for (const v of violations) console.log('  ', v);
}
