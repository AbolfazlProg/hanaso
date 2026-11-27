/**
 * Scan: authored f1Fa/f2HintFa carrying the answer key (pre-mask), all chapters.
 * Mirrors B1 §۵ keyTexts — tells us the blast radius of the hint-leak fix.
 */
import { getChapter } from '../../apps/web/src/modules/curriculum/content';
import type { Chapter, Exercise } from '../../apps/web/src/modules/curriculum/types';

function keyTexts(ex: Exercise): string[] {
  const texts: string[] = [];
  const correct = ex.options?.find((o) => o.id === ex.correctOptionId);
  if (correct) texts.push(correct.label);
  for (const ids of [ex.correctOrder ?? [], ex.acceptedChipOrder ?? []]) {
    for (const id of ids) {
      const c = ex.chunks?.find((x) => x.id === id) ?? ex.chips?.find((x) => x.id === id);
      if (c) texts.push(c.ja);
    }
  }
  return texts.filter((t) => t && t !== '___NAME___' && !t.includes('[نام]'));
}

function allExercises(ch: Chapter): Exercise[] {
  return Object.values(ch.exercises);
}

for (const slug of ['kana-foundation-01', 'kana-expansion-01', 'first-meeting-01']) {
  const ch = getChapter(slug);
  const offenders: string[] = [];
  for (const ex of allExercises(ch)) {
    const keys = keyTexts(ex);
    for (const [lvl, line] of [
      ['f1', ex.feedback?.f1Fa],
      ['f2', ex.feedback?.f2HintFa],
    ] as const) {
      if (!line) continue;
      for (const k of keys) {
        if (k.length >= 2 && line.includes(k)) offenders.push(`${ex.id}/${lvl} carries «${k}»`);
      }
    }
  }
  console.log(`${slug}: ${offenders.length} authored leaks`);
  for (const o of offenders.slice(0, 40)) console.log('  ', o);
}
