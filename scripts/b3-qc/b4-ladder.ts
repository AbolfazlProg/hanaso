/**
 * B4 targeted verification — the F1/F2/F3 ladder on the NEW exercises:
 * grade a REAL wrong answer, then fetch the F2 hint, and assert the key never
 * appears pre-reveal (the E2 mask over both surfaces). Verifies on the live
 * LOCAL server as the qc_b4_desk2 learner.
 */
const BASE = 'http://localhost:3000';
const cookie = require('node:fs').readFileSync('/tmp/b4-full-desk2.txt', 'utf8').trim();

const { getChapter } = require('../../apps/web/src/modules/curriculum/content');
const ch = getChapter('first-meeting-01');

const TARGETS = [
  'ex-fm01-e2-engage-1',
  'ex-fm01-e2-engage-2',
  'ex-fm01-e2-engage-3',
  'ex-fm01-p2-c2-guide-1',
  'ex-fm01-od2-resp-2',
];

const keyText = (ex: any): string[] => {
  const out: string[] = [];
  const correct = (ex.options ?? []).find((o: any) => o.id === ex.correctOptionId);
  if (correct) out.push(correct.label);
  for (const id of ex.acceptedChipOrder ?? []) {
    const c = (ex.chips ?? []).find((x: any) => x.id === id);
    if (c) out.push(c.ja);
  }
  return out.filter((t: string) => t && t !== '___NAME___');
};

async function main() {
  let bad = 0;
  for (const id of TARGETS) {
    const ex = (ch.exercises as any)[id];
    if (!ex) {
      console.log(`${id}: NOT FOUND`);
      bad++;
      continue;
    }
    const host = ch.stations.find((st: any) =>
      st.blocks.some((b: any) => b.kind === 'exercise' && (b.exerciseIds ?? []).includes(id)),
    );
    const stationSlug = host?.slug ?? 'stn-fm01-14-expression';
    const wrong = (ex.options ?? []).find((o: any) => o.id !== ex.correctOptionId);
    const payload: any = {
      action: 'grade',
      chapterSlug: 'first-meeting-01',
      stationSlug,
      exerciseId: id,
      attemptNo: 1,
      answer: wrong
        ? { kind: 'option', optionId: wrong.id }
        : { kind: 'build', chipOrder: (ex.chips ?? []).slice(0, 1).map((c: any) => c.id) },
    };
    const gr = await fetch(`${BASE}/api/curriculum/station`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(payload),
    });
    const g = await gr.json().catch(() => ({}));
    if (id === TARGETS[0]) console.log('grade shape:', JSON.stringify(g).slice(0, 400));
    const f1 = g?.data?.outcome?.feedbackFa ?? '';
    const keys = keyText(ex);
    const leakF1 = keys.filter((k: string) => k.length >= 2 && String(f1).includes(k));
    // the F2 hint round-trip
    const hr = await fetch(`${BASE}/api/curriculum/station`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({
        action: 'hint',
        chapterSlug: 'first-meeting-01',
        stationSlug,
        exerciseId: id,
      }),
    });
    const h = await hr.json().catch(() => ({}));
    if (id === TARGETS[0]) console.log('hint shape:', JSON.stringify(h).slice(0, 400));
    const hint = h?.data?.hintFa ?? '';
    const leakF2 = keys.filter((k: string) => k.length >= 2 && String(hint).includes(k));
    const ok = leakF1.length === 0 && leakF2.length === 0;
    if (!ok) bad++;
    console.log(
      `${id}: grade=${gr.status} hint=${hr.status} f1leak=${JSON.stringify(leakF1)} f2leak=${JSON.stringify(leakF2)} ${ok ? 'OK' : 'LEAK!'}`,
    );
    console.log(`   f1: ${String(f1).slice(0, 70)}`);
    console.log(`   f2: ${String(hint).slice(0, 70)}`);
  }
  console.log(bad === 0 ? 'LADDER CLEAN (key only at F3 reveal)' : `${bad} leaks`);
}

main();
