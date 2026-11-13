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
 * Regenerates, with the selected voice (speaker 90 — VOICEVOX:ぞん子;
 * Addendum-5 §6/§4 A/B evidence: /root/a5-voice-ab/ + the checklist §A5-4):
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
const SPEAKER = 90; // VOICEVOX:ぞん子 ノーマル — Addendum-5 §4 (A/B + ASR evidence)
const CREDIT = 'VOICEVOX:ぞん子';
const WEB = path.join(process.cwd(), 'apps', 'web');
const KANA_DIR = path.join(WEB, 'public', 'audio', 'kana');
const HOST_DIR = path.join(WEB, 'public', 'audio', 'hostwords');
const GENERATED_BY =
  `voicevox:latest (VPS engine) — TASK-LEARNING-08 Addendum-5 §4: speaker 90 (${CREDIT} ノーマル), speedScale 1.0, offline pre-generation. ` +
  `A/B + word-ASR evidence: ops/checkpoints/TASK-LEARNING-08/OWNER_FEEDBACK_CHECKLIST.md §A5-4 (/root/a5-voice-ab/). ` +
  `Mastering: HPF70 + shelf+2.5dB@2.5k + gate(-40dB,r2:1) + loudness-match (RMS→−17dBFS, peak≤−1.5dBFS); opus 64k / m4a 128k. Credit: ${CREDIT} (VOICEVOX character terms)`;

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

/*
 * TASK-HANASO-21 — the COMPLETE audio surface. The owner-observed completion
 * bug proved the cost of an incomplete registry (kana-decode outcomes without
 * committed word audio took the no-audio auto-next path). This extractor
 * sweeps every remaining content surface that can offer playback:
 *  - rule-step / rule-contrast WORDS and their a/b pair sides (teaching
 *    artifacts included — the contrast needs BOTH sides hearable);
 *  - the kana-decode / rule-listening exercise promptJa words (the question
 *    itself is audio; the server attaches the word's committed asset as
 *    correctAudio on the reveal).
 * Template scaffolds are excluded — same rule as exampleWords().
 */
function contrastAndExerciseWords() {
  const set = new Set();
  // the BASIC 92 kana glyphs own their registry entries (kn-*) — a length-1
  // text is skipped ONLY when it is one of them; derived single glyphs
  // (ば/ぱ — the dakuten/handakuten contrast sides) have no kana asset and
  // DO need a hostword clip for their contrast play button.
  const basicKana = new Set(kanaEntries().map((k) => k.text));
  const stationsDir = path.join(WEB, 'src', 'modules', 'curriculum', 'content');
  for (const file of ['chapter-kana01.stations.ts', 'chapter-fm01.stations.ts']) {
    const src = readFileSync(path.join(stationsDir, file), 'utf8');
    for (const m of src.matchAll(/\bja:\s*'([^']+)'/g)) {
      const ja = m[1];
      if (/___|NAME|…/.test(ja)) continue;
      if (basicKana.has(ja)) continue;
      if (/[\u3040-\u30ff]/.test(ja)) set.add(ja);
    }
  }
  for (const file of ['chapter-kana01.exercises.ts', 'chapter-fm01.exercises.ts']) {
    const src = readFileSync(path.join(stationsDir, file), 'utf8');
    // promptJa on decode/rule-listening items (the audible question/word)
    for (const m of src.matchAll(/promptJa:\s*'([^']+)'/g)) {
      const ja = m[1];
      if (/___|NAME|…/.test(ja)) continue;
      set.add(ja);
    }
  }
  return [...set];
}

/*
 * TASK-HANASO-20 (BUG-005 remediation): the k12-foreign station teaches
 * ファ/ティ/ヴ with these words. No assets exist yet (they cannot be synthesized
 * here — VOICEVOX runs on the VPS only), so the UI honestly hides their play
 * controls until THIS list is regenerated with the next VPS run.
 */
const FOREIGN_COMBO_WORDS = ['ファイル', 'ティッシュ', 'ヴァイオリン', 'パーティー'];

/*
 * TASK-HANASO-20 (BUG-008): the Yōon rule-card listening column needs the
 * SEPARATE-form clips for the live compact/separate contrast. They are
 * non-words (teaching artifacts) — synthesized as standalone texts on the
 * next VPS run; until then the UI plays the compact side only (honest).
 */
const YOON_SEPARATE_FORMS = ['きよう', 'しや', 'きや'];

/* TASK-HANASO-20: the k8 chōonpu card's third row (タクシー) — pending asset. */
const PENDING_CARD_WORDS = ['タクシー'];

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
  return ffmpeg(
    [
      '-f',
      'wav',
      '-i',
      'pipe:0',
      '-af',
      'highpass=f=70,treble=g=2.5:f=2500,agate=threshold=0.01:ratio=2',
      '-f',
      'wav',
      'pipe:1',
    ],
    wav,
  );
}

function statsDbfs(wav) {
  const r = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'info', '-f', 'wav', '-i', 'pipe:0', '-af', 'astats=metadata=1', '-f', 'null', '-'],
    { input: wav, maxBuffer: 1 << 26 },
  );
  const out = (r.stdout?.toString() ?? '') + (r.stderr?.toString() ?? '');
  const grab = (re) => {
    const all = out.match(re) ?? [];
    return all.length ? Math.max(...all.map((x) => parseFloat(x.split(':')[1]))) : NaN;
  };
  const peak = grab(/Peak level dB:\s*(-?[\d.]+)/g);
  const rms = grab(/RMS level dB:\s*(-?[\d.]+)/g);
  if (!Number.isFinite(peak) || !Number.isFinite(rms)) throw new Error('astats failed');
  return { peak, rms };
}

/**
 * Addendum-4 §6 («قدرت شنیده شدن» across every kana): match perceived loudness,
 * not just peaks — every sample lands at −17 dBFS RMS (a natural single-mora
 * level), while the peak never exceeds −1.5 dBFS (whichever constraint binds
 * first). This kills the 5dB soft-mora spread of pure peak-normalization.
 */
const TARGET_RMS_DB = -17;
const CEILING_PEAK_DB = -1.5;
function normTo(wav) {
  const { peak, rms } = statsDbfs(wav);
  const gain = Math.min(TARGET_RMS_DB - rms, CEILING_PEAK_DB - peak);
  return ffmpeg(['-f', 'wav', '-i', 'pipe:0', '-af', `volume=${gain.toFixed(2)}dB`, '-f', 'wav', 'pipe:1'], wav);
}

function encode(masterWav, base) {
  const opus = ffmpeg(
    ['-f', 'wav', '-i', 'pipe:0', '-c:a', 'libopus', '-b:a', '64k', '-f', 'ogg', 'pipe:1'],
    masterWav,
  );
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
 * Addendum-5 §5 — File stem for a word: ALWAYS a deterministic ASCII hash
 * (w-<sha1-16>). The previous human-readable urlencoded names made the
 * served URLs percent-encoded, and Next 16's static route then lost the
 * custom cache headers (serving no-store — a re-download per play) or 500ed
 * depending on the header-rule shape. ASCII stems go through the plain
 * static path: correct MIME + max-age=86400 + stale-while-revalidate. The
 * manifest entry records the exact stem in `file`, so the resolver never
 * guesses and the word→asset binding stays 1:1.
 */
function wordStem(word) {
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
  const words = wordSurface(); // TASK-HANASO-21: single source — --list and the real run can never drift
  const hostManifest = { generatedBy: GENERATED_BY, format: 'voicevox-opus-m4a', entries: {} };
  for (const word of words) {
    const wav = normTo(master(await synth(word)));
    const { stem } = wordStem(word);
    const base = path.join(HOST_DIR, stem);
    const { bytes, bytesM4a } = encode(wav, base);
    hostManifest.entries[word] = { file: stem, bytes, bytesM4a, durationMs: probeMs(`${base}.opus`), hash: hash(word) };
    process.stdout.write(
      `word ${word} (${stem === encodeURIComponent(word) ? 'named' : 'hashed'}) ${probeMs(`${base}.opus`)}ms\n`,
    );
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

/* TASK-HANASO-21 — `--list`: print the COMPLETE hostword generation surface as
 * one JSON array and exit. No VOICEVOX, no writes. Purpose: the audio-honesty
 * unit test (tests/unit/h21-audio-inventory.test.ts) and the operator staging
 * a VPS run can verify WHAT the next regeneration would cover without
 * synthesizing anything. The committed registry stays the runtime truth. */
function wordSurface() {
  return [
    ...new Set([
      ...hostWords(),
      ...exampleWords(),
      ...contrastAndExerciseWords(),
      ...FOREIGN_COMBO_WORDS,
      ...YOON_SEPARATE_FORMS,
      ...PENDING_CARD_WORDS,
    ]),
  ].sort();
}

if (process.argv.includes('--list')) {
  process.stdout.write(JSON.stringify(wordSurface()) + '\n');
} else {
  generateAll().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
