/**
 * B3 QC — honest fast-forward via the content module (tsx): topologically
 * sorts every prerequisite station of the target lessons, then per station:
 * enter → grade one real exercise (the M1 guard) → complete.
 * Usage: npx tsx b3-unlock.ts <cookie-value>
 */
import { readFileSync } from 'node:fs';
import { getChapter } from '../../apps/web/src/modules/curriculum/content';

async function main(): Promise<void> {
  const cookie = process.argv[2];
  if (!cookie) {
    console.error('usage: tsx b3-unlock.ts <cookie>');
    process.exit(2);
  }
  const API = 'http://localhost:3000/api/curriculum/station';
  const headers = { 'content-type': 'application/json', cookie };

  /* every station of the three chapters, with its prerequisites */
  type Answer =
    | { kind: 'option'; optionId: string }
    | { kind: 'order'; orderedIds: string[] }
    | { kind: 'build'; chipOrder: string[] };
  type Node = { ch: string; slug: string; prereqs: string[]; exId?: string; optId?: string; answer?: Answer };
  const nodes: Node[] = [];
  const bySlug = new Map<string, Node>();
  for (const ch of ['kana-foundation-01', 'kana-expansion-01', 'first-meeting-01']) {
    const chapter = getChapter(ch);
    for (const stn of chapter.stations) {
      if (ch === 'first-meeting-01' && stn.order >= 11) continue; // the B4 debt batch (11-17) + optional branch — NOT unlocked
      const n: Node = { ch, slug: stn.slug, prereqs: [...stn.prerequisites] };
      let found = false;
      for (const b of stn.blocks as { kind: string; exerciseIds?: string[] }[]) {
        if (found || b.kind !== 'exercise' || !b.exerciseIds) continue;
        for (const id of b.exerciseIds) {
          const ex = (
            chapter.exercises as Record<
              string,
              {
                options?: { id: string }[];
                chunks?: { id: string }[];
                chips?: { id: string }[];
              }
            >
          )[id];
          if (!ex) continue;
          if (ex.options && ex.options.length > 0) {
            n.exId = id;
            n.optId = ex.options[0]!.id;
            n.answer = { kind: 'option', optionId: ex.options[0]!.id };
            found = true;
            break;
          }
          if (ex.chunks && ex.chunks.length > 0) {
            n.exId = id;
            n.answer = { kind: 'order', orderedIds: ex.chunks.map((c) => c.id) };
            found = true;
            break;
          }
          if (ex.chips && ex.chips.length > 0) {
            n.exId = id;
            n.answer = { kind: 'build', chipOrder: ex.chips.map((c) => c.id) };
            found = true;
            break;
          }
        }
      }
      nodes.push(n);
      bySlug.set(stn.slug, n);
    }
  }

  /* topological pass — repeat until no progress (skips already-done) */
  const done = new Set<string>();
  const seq: Node[] = [];
  let progress = true;
  while (progress) {
    progress = false;
    for (const n of nodes) {
      if (done.has(n.slug)) continue;
      if (n.prereqs.every((p) => !bySlug.has(p) || done.has(p))) {
        seq.push(n);
        done.add(n.slug);
        progress = true;
      }
    }
  }
  const unreachable = nodes.filter((n) => !done.has(n.slug));
  if (unreachable.length) console.log(`cycle/unreachable (skipped): ${unreachable.map((n) => n.slug).join(', ')}`);

  let fails = 0;
  for (const r of seq) {
    await fetch(API, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'enter', chapterSlug: r.ch, stationSlug: r.slug }),
    });
    let graded = false;
    if (r.exId) {
      const res = await fetch(API, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'grade',
          chapterSlug: r.ch,
          stationSlug: r.slug,
          exerciseId: r.exId,
          attemptNo: 1,
          answer: r.answer ?? { kind: 'option', optionId: r.optId },
        }),
      });
      graded = res.ok;
      if (!res.ok) console.log(`${r.slug}: GRADE ${res.status}`);
    }
    const res = await fetch(API, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'complete',
        chapterSlug: r.ch,
        stationSlug: r.slug,
        score: 1,
        taskCompleted: true,
      }),
    });
    if (!res.ok) {
      fails++;
      const body = await res.json().catch(() => ({}));
      console.log(`${r.slug}: complete=${res.status} ${JSON.stringify(body).slice(0, 120)}`);
    }
  }
  console.log(fails === 0 ? `FAST-FORWARD DONE (${seq.length} stations)` : `FAILED: ${fails}`);
  process.exit(fails === 0 ? 0 : 1);
}
void main();
