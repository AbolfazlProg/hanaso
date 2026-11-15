#!/usr/bin/env node
/**
 * TASK29 — honest seeder: grade one real exercise per station (M1 guard)
 * then complete it, for a learner cookie. Mirrors the real runner's actions.
 * Usage: node seed-honest.js <signed-cookie-value> stn-kana-h0 stn-kana-h1 ...
 * Reads the chapter bundle through vitest-free TSX? No — exercise data is
 * exported by the built server chunks; instead we use the public station
 * page's embedded payload. Simplest robust path: import the content module
 * via the repo's tsconfig paths using the dev toolchain (tsx is absent, so
 * we shell out to vitest's node? No — use the API: GET the station page and
 * extract the first exercise id from the RSC flight data is fragile.
 *
 * PRAGMATIC: the curriculum content module is pure TS data. We compile the
 * needed lookup ONCE via `pnpm exec vitest run` is overkill; instead we run
 * a tiny vitest test that prints nothing. Better: Node with a loader.
 *
 * FINAL approach used: exercise ids for grading are fetched from the station
 * REST surface — GET /api/curriculum/station returns the CLIENT payload
 * (stripped of keys) including exercise ids per block. We parse that.
 */
const [, , cookieValue, ...stations] = process.argv;
if (!cookieValue || stations.length === 0) {
  console.error('usage: node seed-honest.js <cookie> <station>...');
  process.exit(2);
}
const API = 'http://127.0.0.1:3100/api/curriculum/station';
const CH = 'kana-foundation-01';
const headers = { 'content-type': 'application/json', cookie: `hanaso_lid=${cookieValue}` };

async function firstExerciseOf(stationSlug) {
  const res = await fetch(`${API}?chapter=${CH}&station=${stationSlug}`, { headers });
  if (!res.ok) throw new Error(`GET station ${stationSlug}: ${res.status}`);
  const json = await res.json();
  // the client payload carries blocks with exerciseIds + stripped exercises
  const data = json.data ?? json;
  const blocks = data.blocks ?? [];
  for (const b of blocks) {
    const ids = b.exerciseIds ?? [];
    for (const id of ids) {
      const ex = (data.exercises ?? {})[id];
      if (ex && (data.exercises[id].options ?? []).length > 0) {
        return { exerciseId: id, stationSlug };
      }
    }
  }
  return null;
}

async function gradeOnce(stationSlug) {
  const found = await firstExerciseOf(stationSlug);
  if (!found) return false; // exercise-free station — complete alone is fine
  // pick the FIRST option as the answer; wrong or right, the server records
  // the attempt (attemptCount++ → the M1 guard is satisfied honestly).
  const ex = await (await fetch(`${API}?chapter=${CH}&station=${stationSlug}`, { headers })).json();
  const blocks = (ex.data ?? ex).blocks ?? [];
  for (const b of blocks) {
    for (const id of b.exerciseIds ?? []) {
      const item = ((ex.data ?? ex).exercises ?? {})[id];
      if (item && (item.options ?? []).length > 0) {
        const res = await fetch(API, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'grade',
            chapterSlug: CH,
            stationSlug,
            exerciseId: id,
            attemptNo: 1,
            answer: { kind: 'option', optionId: item.options[0].id },
          }),
        });
        if (!res.ok) throw new Error(`grade ${stationSlug}/${id}: ${res.status}`);
        return true;
      }
    }
  }
  return false;
}

(async () => {
  for (const s of stations) {
    const graded = await gradeOnce(s);
    const res = await fetch(API, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'complete',
        chapterSlug: CH,
        stationSlug: s,
        score: 1,
        taskCompleted: true,
      }),
    });
    const body = await res.json().catch(() => ({}));
    console.log(`${s}: graded=${graded} complete=${res.status}${res.ok ? '' : ' ' + JSON.stringify(body)}`);
    if (!res.ok) process.exit(1);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
