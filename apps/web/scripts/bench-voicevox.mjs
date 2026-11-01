#!/usr/bin/env node
/**
 * HANASO — VOICEVOX benchmark (TASK-DLG-POC-01 / T10).
 *
 * Queues 100 sentences to a LOCAL VOICEVOX engine (default http://127.0.0.1:50021) and
 * records: wall time, CPU-seconds/sentence (system-wide via /proc/stat), peak RAM
 * (cgroup v1/v2 when available), output bytes. Writes a JSON report + human summary.
 *
 *   node scripts/bench-voicevox.mjs [--url http://127.0.0.1:50021] [--n 100] [--speaker 3]
 *   (or: pnpm bench:voicevox)
 *
 * ⚠️ NOT RUN in the Agent sandbox — no Docker/VOICEVOX engine there. This script is a
 * delivered artifact for the owner to execute on the VPS-like environment; results go
 * into docs/research/DLG-POC-01-REPORT.md §T10. See KB dialogue-technical-poc-plan §۲.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const BASE = arg('url', process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021');
const N = Number(arg('n', 100));
const SPEAKER = Number(arg('speaker', 3)); // VOICEVOX speaker id (default: a standard voice)
const OUT = arg('out', path.join(process.cwd(), 'docs/research/assets/voicevox-bench-result.json'));

const SENTENCES = [
  'いらっしゃいませ。',
  'おはようございます。コーヒーをお願いします。',
  'しょうしょうお待ちください。',
  '今日もいい天気ですね。',
  'けっこうです、ありがとうございます。',
  'かしこまりました。ごゆっくりどうぞ。',
  'またあとでね。',
  'ミルクはご入用ですか。',
];

/** System-wide CPU ticks from /proc/stat (Linux). */
async function cpuTicks() {
  try {
    const stat = await import('node:fs').then((fs) => fs.readFileSync('/proc/stat', 'utf8'));
    const m = stat.match(/^cpu\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (!m) return null;
    const [user, nice, system, idle] = m.slice(1).map(Number);
    return { total: user + nice + system + idle, busy: user + nice + system };
  } catch {
    return null;
  }
}

/** Cgroup RAM usage in bytes (v2 then v1), null when unavailable. */
async function cgroupRam() {
  const fs = await import('node:fs');
  for (const p of ['/sys/fs/cgroup/memory.current', '/sys/fs/cgroup/memory/memory.usage_in_bytes']) {
    try {
      return Number(fs.readFileSync(p, 'utf8').trim());
    } catch {
      /* try next */
    }
  }
  return null;
}

const t0 = performance.now();
const cpu0 = await cpuTicks();
const perSentence = [];
let bytes = 0;
let failures = 0;

console.log(`== VOICEVOX bench: ${N} sentences @ ${BASE} (speaker=${SPEAKER}) ==`);

// engine liveness
const speakersRes = await fetch(`${BASE}/speakers`).catch((err) => {
  console.error(`engine unreachable at ${BASE}: ${err.message}`);
  process.exit(1);
});
if (!speakersRes.ok) {
  console.error(`/speakers → HTTP ${speakersRes.status}`);
  process.exit(1);
}
console.log('engine reachable ✓');

for (let i = 0; i < N; i++) {
  const text = SENTENCES[i % SENTENCES.length];
  const s = performance.now();
  try {
    const qRes = await fetch(`${BASE}/audio_query?text=${encodeURIComponent(text)}&speaker=${SPEAKER}`, {
      method: 'POST',
    });
    if (!qRes.ok) throw new Error(`audio_query HTTP ${qRes.status}`);
    const query = await qRes.json();
    const synthRes = await fetch(`${BASE}/synthesis?speaker=${SPEAKER}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(query),
    });
    if (!synthRes.ok) throw new Error(`synthesis HTTP ${synthRes.status}`);
    const buf = Buffer.from(await synthRes.arrayBuffer());
    bytes += buf.length;
    perSentence.push({ i, text, ms: Math.round(performance.now() - s), bytes: buf.length });
    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${N} done (last: ${Math.round(performance.now() - s)}ms)`);
  } catch (err) {
    failures += 1;
    perSentence.push({ i, text, error: String(err.message ?? err) });
  }
}

const wallMs = Math.round(performance.now() - t0);
const cpu1 = await cpuTicks();
const ram = await cgroupRam();
const cpuBusyDelta = cpu0 && cpu1 ? cpu1.busy - cpu0.busy : null;
const cpuTotalDelta = cpu0 && cpu1 ? cpu1.total - cpu0.total : null;
const cpuSecondsPerSentence =
  cpuBusyDelta !== null && cpuTotalDelta !== null && cpuTotalDelta > 0
    ? Number((((cpuBusyDelta / 100) * (wallMs / 1000)) / Math.max(1, N - failures)).toFixed(3))
    : null;

const result = {
  meta: {
    engine: BASE,
    speaker: SPEAKER,
    sentences: N,
    failures,
    ranAt: new Date().toISOString(),
    host: (await import('node:os')).hostname(),
  },
  metrics: {
    wallMs,
    wallMsPerSentence: Number((wallMs / Math.max(1, N - failures)).toFixed(1)),
    cpuSecondsPerSentence,
    cpuTicks: cpuBusyDelta !== null ? { busy: cpuBusyDelta, total: cpuTotalDelta } : null,
    cgroupRamBytes: ram,
    outputBytes: bytes,
    outputBytesPerSentence: Math.round(bytes / Math.max(1, N - failures)),
  },
  perSentence,
};

writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log('\n== summary ==');
console.log(JSON.stringify(result.metrics, null, 2));
console.log(`report → ${OUT}`);
