#!/usr/bin/env node
/**
 * HANASO — TASK-LEARNING-08 Addendum-4 audio regeneration (§6 + §7).
 *
 * ONE committed, repeatable command (run on the VPS — VOICEVOX at
 * 127.0.0.1:50021, offline pre-generation only; live runtime TTS stays
 * forbidden):
 *
 *   node apps/web/scripts/tl08-a4-audio-gen.mjs
 *
 * Regenerates, with the selected voice (speaker 14 — VOICEVOX:冥鳴ひまり;
 * A/B evidence: /root/a4-voice-ab/ + the checklist §A4-6 entry):
 *   1. 92 kana assets            public/audio/kana/<ref>.{opus,m4a} + manifest
 *   2. the host-word registry     public/audio/hostwords/<word>.{opus,m4a}
 *      — now covering the host words AND every example word (single per-word
 *      registry; one asset per unique word, keyed by the word itself).
 *
 * Texts are extracted from the CONTENT SOURCE (kana-items.ts + the stations
 * files) the same way the validator tests do, so code and validator can never
 * drift apart. Mastering chain identical to every committed asset:
 * HPF70 + shelf +2.5dB@2.5k + gate(-40dB,2:1) + peak-norm −1.5dBFS;
 * opus 64k / m4a 128k.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';

const VOICEVOX = process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021';
const SPEAKER = 14; // VOICEVOX:冥鳴ひまり ノーマル — Addendum-4 §6 (A/B evidence)
const CREDIT = 'VOICEVOX:冥鳴ひまり';
const WEB = path.join(process.cwd(), 'apps', 'web');
const KANA_DIR = path.join(WEB, 'public', 'audio', 'kana');
const HOST_DIR = path.join(WEB, 'public', 'audio', 'hostwords');
const GENERATED_BY =
  `voicevox:latest (VPS engine, 2026-10 image) — TASK-LEARNING-08 Addendum-4 §6: speaker 14 (${CREDIT} ノーマル), speedScale 1.0, offline pre-generation. ` +
  `A/B evidence: ops/checkpoints/TASK-LEARNING-08/OWNER_FEEDBACK_CHECKLIST.md §A4-6. ` +
  `Mastering: HPF70 + shelf+2.5dB@2.5k + gate(-40dB,r2:1) + peak-norm −1.5dBFS; opus 64k / m4a 128k. Credit: ${CREDIT} (VOICEVOX character terms)`;

// ---------------------------------------------------------------- content texts
function kanaEntries() {
  const src = readFileSync(path.join(WEB, 'src', 'modules', 'curriculum', 'content', 'kana-items.ts'), 'utf8');
  const out = [];
  for (const m of src.matchAll(/kanaId:\s*'([^']+)',\s*\n\s*glyph:\s*'([^']+)'/g)) {
    out.push({ ref: `kn-${m[1]}`, text: m[2] });
  }
  if (out.length !== 92) throw new Error(`expected 92 kana, got ${out.length}`);
  return out;
}

function hostWords() {
  const src = readFileSync(path.join(WEB, 'src', 'modules', 'curriculum', 'content', 'kana-items.ts'), 'utf8');
  const set = new Set();
  for (const m of src.matchAll(/word:\s*'([^']+)'/g)) set.add(m[1]);
  return [...set];
}

function exampleWords() {
  const set = new Set();
  for (const file of ['chapter-kana01.stations.ts', 'chapter-fm01.stations.ts']) {
    const src = readFileSync(path.join(WEB, 'src', 'modules', 'curriculum', 'content', file), 'utf8');
    for (const m of src.matchAll(/role:\s*'(?:anchor|near|varied|faded|reading)',\s*\n\s*ja:\s*'([^']+)'/g)) {
      const ja = m[1];
      if (/___|NAME|…/.test(ja)) continue; // template scaffold — not a speakable example
      set.add(ja);
    }
  }
  return [...set];
}

// ---------------------------------------------------------------- voicevox + ffmpeg
async function synth(text) {
  const q = new URLSearchParams({ text, speaker: String(SPEAKER) });
  const query = await (await fetch(`${VOICEVOX}/audio_query?${q}`, { method: 'POST' })).arrayBuffer();
  const s = new URLSearchParams({ speaker: String(SPEAKER) });
  const wav = await (
    await fetch(`${VOICEVOX}/synthesis?${s}`, {
      method: 'POST',
      body: query,
      headers: { 'content-type': 'application/json' },
    })
  ).arrayBuffer();
  return Buffer.from(wav);
}

function ffmpeg(args, input) {
  return execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { input, maxBuffer: 1 << 26 });
}

function master(wav) {
  return ffmpeg(['-f', 'wav', '-i', 'pipe:0', '-af', 'highpass=f=70,treble=g=2.5:f=2500,agate=threshold=0.01:ratio=2', '-f', 'wav', 'pipe:1'], wav);
}

function peakDbfs(wav) {
  const r = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'info', '-f', 'wav', '-i', 'pipe:0', '-af', 'astats=metadata=1', '-f', 'null', '-'],
    { input: wav, maxBuffer: 1 << 26 },
  );
  const out = (r.stdout?.toString() ?? '') + (r.stderr?.toString() ?? '');
  const m = out.match(/Peak level dB:\s*(-?[\d.]+)/g);
  if (!m) throw new Error('astats failed');
  const peaks = m.map((x) => parseFloat(x.split(':')[1]));
  return Math.max(...peaks);
}

function normTo(wav, targetDb = -1.5) {
  const p = peakDbfs(wav);
  const gain = (targetDb - p).toFixed(2);
  return ffmpeg(['-f', 'wav', '-i', 'pipe:0', '-af', `volume=${gain}dB`, '-f', 'wav', 'pipe:1'], wav);
}

function encode(masterWav, base) {
  const opus = ffmpeg(['-f', 'wav', '-i', 'pipe:0', '-c:a', 'libopus', '-b:a', '64k', '-f', 'ogg', 'pipe:1'], masterWav);
  // the mp4-family muxer needs a seekable output — write to a SHORT temp name
  // in os.tmpdir() (never inside the assets dir; long words exceed the fs limit)
  const tmp = path.join(os.tmpdir(), `a4-${createHash('sha1').update(base).digest('hex').slice(0, 10)}.m4a`);
  execFileSync(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-f', 'wav', '-i', 'pipe:0', '-c:a', 'aac', '-b:a', '128k', '-y', tmp],
    { input: masterWav, maxBuffer: 1 << 26 },
  );
  const m4a = readFileSync(tmp);
  rmSync(tmp);
  writeFileSync(`${base}.opus`, opus);
  writeFileSync(`${base}.m4a`, m4a);
  return { bytes: opus.length, bytesM4a: m4a.length };
}

/**
 * Duration of a WRITTEN audio file (a piped wav header carries no reliable
 * duration — probe the committed file itself).
 */
function probeMs(file) {
  const out = execFileSync(
    'ffprobe',
    ['-hide_banner', '-loglevel', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
    { maxBuffer: 1 << 24 },
  ).toString();
  const v = parseFloat(out);
  if (!Number.isFinite(v)) throw new Error(`bad duration for ${file}: ${JSON.stringify(out)}`);
  return Math.round(v * 1000);
}

const hash = (text) => createHash('sha256').update(`${text}|voicevox:${SPEAKER}`).digest('hex').slice(0, 16);

/**
 * File stem for a word: the urlencoded word while it fits a filesystem
 * component (<200 chars — keeps the human-readable naming of every existing
 * asset), otherwise a deterministic short hash (long example sentences exceed
 * the 255-byte component limit). The manifest entry records the exact stem in
 * `file`, so the resolver never guesses.
 */
function wordStem(word) {
  const q = encodeURIComponent(word);
  if (q.length <= 200) return { stem: q, hashed: false };
  const h = createHash('sha1').update(word).digest('hex').slice(0, 16);
  return { stem: `w-${h}`, hashed: true };
}

// ---------------------------------------------------------------- registries
async function generateAll() {
  mkdirSync(KANA_DIR, { recursive: true });
  mkdirSync(HOST_DIR, { recursive: true });

  // 1. kana
  const kanaManifest = { generatedBy: GENERATED_BY, format: 'voicevox-opus-m4a', entries: {} };
  for (const { ref, text } of kanaEntries()) {
    const wav = normTo(master(await synth(text)));
    const base = path.join(KANA_DIR, ref);
    const { bytes, bytesM4a } = encode(wav, base);
    kanaManifest.entries[ref] = { bytes, bytesM4a, durationMs: probeMs(`${base}.opus`), hash: hash(text) };
    process.stdout.write(`kana ${ref} ${text} ${probeMs(`${base}.opus`)}ms\n`);
  }
  writeFileSync(path.join(KANA_DIR, 'manifest.json'), JSON.stringify(kanaManifest, null, 2) + '\n');

  // 2. host words + example words — ONE per-word registry
  const words = [...new Set([...hostWords(), ...exampleWords()])].sort();
  const hostManifest = { generatedBy: GENERATED_BY, format: 'voicevox-opus-m4a', entries: {} };
  for (const word of words) {
    const wav = normTo(master(await synth(word)));
    const { stem } = wordStem(word);
    const base = path.join(HOST_DIR, stem);
    const { bytes, bytesM4a } = encode(wav, base);
    hostManifest.entries[word] = { file: stem, bytes, bytesM4a, durationMs: probeMs(`${base}.opus`), hash: hash(word) };
    process.stdout.write(`word ${word} (${stem === encodeURIComponent(word) ? 'named' : 'hashed'}) ${probeMs(`${base}.opus`)}ms\n`);
  }
  writeFileSync(path.join(HOST_DIR, 'manifest.json'), JSON.stringify(hostManifest, null, 2) + '\n');

  // drop stale assets not in the manifest (the registry is the truth)
  const keep = new Set(Object.values(hostManifest.entries).map((e) => e.file ?? ''));
  for (const f of readdirSync(HOST_DIR)) {
    if (f.endsWith('.opus') || f.endsWith('.m4a')) {
      const stem = f.replace(/\.(opus|m4a)$/, '');
      if (!keep.has(stem)) rmSync(path.join(HOST_DIR, f));
    }
  }
  console.log(`\ndone: 92 kana + ${words.length} words (host + example, one registry) — voice ${CREDIT}`);
}

generateAll().catch((e) => {
  console.error(e);
  process.exit(1);
});
