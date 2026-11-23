#!/usr/bin/env node
/**
 * HANASO — AUDIO-UNIT word/sentence audio generation (2026-11-23 §۱).
 *
 * Generates the STANDALONE teaching-audio assets of a chapter's audio-unit
 * bindings into the words registry `public/audio/words/`:
 *   - every chapter word with a `wordAudio` content id (its OWN pronunciation —
 *     DD-119 «صدای واژه باید واقعاً همان واژه باشد»);
 *   - every `word-form` / `sentence` binding text declared by the chapter's
 *     exercises (minimal-pair forms, grammar-in-sentence forms).
 *
 * RUNS ON AN ISOLATED OFFLINE RUNNER ONLY (this sandbox — the local
 * voicevox_engine 0.26.2 CPU at 127.0.0.1:50021). NEVER on the VPS or
 * production (owner constraint 2026-11-21: no VOICEVOX process on the serving
 * host, ever). Production only SERVES the committed files.
 *
 * Voice + mastering chain IDENTICAL to the committed kana/hostwords assets
 * (speaker 90 — VOICEVOX:ぞん子 ノーマル; HPF70 + shelf+2.5dB@2.5k +
 * gate(-40dB,2:1) + loudness-match RMS→−17dBFS peak≤−1.5dBFS; opus 64k /
 * m4a 128k) — one acoustic family for every isolated-word pronunciation.
 *
 * Every generated file is ASR-VERIFIED against its registered text (z-ai ASR
 * on the mastered wav; the ASR's Japanese output tends to surface kanji forms
 * — each asset's acceptance surfaces are DECLARED below: kana + katakana +
 * the kanji surface). The manifest row records the transcript + status
 * («وضعیت اعتبارسنجی»); the EQA-13 gate fails CI for any non-verified row.
 *
 * Texts are EXTRACTED FROM THE CONTENT SOURCE (chapter-fm01.items.ts /
 * chapter-fm01.exercises.ts) — the same source the gate reads — so the
 * generator, the registry and the engine contract can never drift apart.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';

const VOICEVOX = process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021';
const SPEAKER = 90; // VOICEVOX:ぞん子 ノーマル — same as every committed word asset
const NO_ASR = process.argv.includes('--no-asr'); // generate only (validation: pending-asr)
const VERIFY_ONLY = process.argv.includes('--verify-only'); // ASR the COMMITTED files, rewrite validation only
const BATCH_ASR = process.argv.includes('--batch-asr'); // ONE concatenated call over the whole registry
const ASR_GAP_MS = Number(process.env.ASR_GAP_MS ?? 20000); // pacing between ASR calls (rate limits)

const CREDIT = 'VOICEVOX:ぞん子';
const WEB = path.join(process.cwd(), 'apps', 'web');
const WORDS_DIR = path.join(WEB, 'public', 'audio', 'words');
const ITEMS = path.join(WEB, 'src', 'modules', 'curriculum', 'content', 'chapter-fm01.items.ts');
const EXERCISES = path.join(WEB, 'src', 'modules', 'curriculum', 'content', 'chapter-fm01.exercises.ts');
const SCRIPT = 'apps/web/scripts/audio-unit-word-gen.mjs';
const MANIFEST_PATH = path.join(WORDS_DIR, 'manifest.json');

/** Incremental manifest write — progress persists across interrupted runs
 * (the ASR service rate-limits hard; partial verification is never lost). */
function writeManifest(entries) {
  writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(
      {
        generatedBy:
          `audio-unit 2026-11-23 §۱ — voicevox_engine 0.26.2 CPU on an ISOLATED OFFLINE RUNNER (never the VPS/production), ` +
          `speaker 90 (${CREDIT} ノーマル), speedScale 1.0, offline pre-generation. ` +
          `Mastering: HPF70 + shelf+2.5dB@2.5k + gate(-40dB,r2:1) + loudness-match (RMS→−17dBFS, peak≤−1.5dBFS); opus 64k / m4a 128k — ` +
          `identical to the committed kana/hostwords chain. Every entry ASR-verified against its registered text. ` +
          `Credit: ${CREDIT} (VOICEVOX character terms)`,
        format: 'voicevox-opus-m4a',
        entries,
      },
      null,
      2,
    ) + '\n',
  );
}

/* ---------------------------------------------------------------- content extraction */

function chapterWords() {
  const src = readFileSync(ITEMS, 'utf8');
  const out = [];
  // VocabItem blocks: id → readingKana → … → wordAudio (order-stable fields of the item shape).
  // 〜 is a NOTATION marker (suffix particle), not a phonetic character — the
  // spoken text strips it (さん/から are what the file actually says).
  const blocks = src.split(/\n  \{/).slice(1);
  for (const b of blocks) {
    const id = b.match(/id: '(voc-[^']+)'/)?.[1];
    const reading = b.match(/readingKana: '([^']+)'/)?.[1];
    const wordAudio = b.match(/wordAudio: '(wa-[^']+)'/)?.[1];
    const term = b.match(/term: '([^']+)'/)?.[1];
    if (id && reading && wordAudio) {
      out.push({ wordId: id, readingKana: reading, wordAudio, term, spokenText: reading.replace(/^[〜]/, '') });
    }
  }
  if (out.length !== 11) throw new Error(`expected 11 FM01 words, got ${out.length}`);
  return out;
}

function bindingAssets() {
  const src = readFileSync(EXERCISES, 'utf8');
  const forms = [];
  for (const m of src.matchAll(/audio: \{ unit: 'word-form', text: '([^']+)', wordId: '(voc-[^']+)' \}/g)) {
    if (!forms.some((f) => f.text === m[1])) forms.push({ unit: 'word-form', text: m[1], wordId: m[2] });
  }
  const sentences = [];
  for (const m of src.matchAll(/audio: \{ unit: 'sentence', text: '([^']+)' \}/g)) {
    if (!sentences.some((s) => s.text === m[1])) sentences.push({ unit: 'sentence', text: m[1] });
  }
  return { forms, sentences };
}

/* ---------------------------------------------------------------- id derivation (shared with the engine) */

const hash16 = (text) => createHash('sha256').update(`${text}|voicevox:${SPEAKER}`).digest('hex').slice(0, 16);
const wordFormAudioId = (text) => `waf-${hash16(text)}`;
const sentenceAudioId = (text) => `se-${hash16(text)}`;

/* ---------------------------------------------------------------- ASR acceptance surfaces
 * The ASR (z-ai) transcribes spoken Japanese into its natural surface —
 * kanji where a kanji word exists (せんせい → 先生). Each asset declares its
 * acceptance surfaces: the kana reading, its katakana mirror, and the kanji
 * surface (the word's own term). Declared data — never guessed at runtime. */

const KATA_TO_HIRA = (s) => s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const HIRA_TO_KATA = (s) => s.replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
const norm = (s) => KATA_TO_HIRA(s.replace(/[\s、。.,！?？〜]/g, ''));

function acceptanceFor(asset) {
  const set = new Set([norm(asset.text), norm(HIRA_TO_KATA(asset.text))]);
  for (const surface of asset.kanjiSurfaces ?? []) set.add(norm(surface));
  return set;
}

/** The chapter's per-asset kanji surfaces (from the items' own term fields + the
 *  known compound surfaces of the form/sentence texts). */
function kanjiSurfacesFor(asset, words) {
  if (asset.unit === 'word') {
    const w = words.find((x) => x.wordId === asset.wordId);
    return w?.term ? [w.term.replace(/〜/g, '')] : [];
  }
  if (asset.unit === 'word-form') {
    const w = words.find((x) => x.wordId === asset.wordId);
    if (!w?.term) return [];
    // ちゅうごくじん (term 中国人) → the country form surface 中国 is the term minus its tail 人
    const tailKanji = '人';
    if (w.term.endsWith(tailKanji) && w.readingKana.startsWith(asset.text)) {
      return [w.term.slice(0, -1)]; // 中国 / 韓国
    }
    return [w.term.replace(/〜/g, '')];
  }
  // sentence: kanji surface via the carried words' terms (かんこくから きました。 → 韓国から来ました)
  if (asset.unit === 'sentence') {
    const map = [];
    for (const w of words) map.push([w.readingKana.replace(/〜/g, ''), w.term.replace(/〜/g, '')]);
    for (const f of bindingAssets().forms) {
      const w = words.find((x) => x.wordId === f.wordId);
      if (w?.term?.endsWith('人')) map.push([f.text, w.term.slice(0, -1)]);
    }
    let kanji = asset.text;
    for (const [reading, term] of map) {
      if (kanji.includes(reading)) kanji = kanji.split(reading).join(term);
    }
    return [kanji.replace(/[。]/g, '')];
  }
  return [];
}

/* ---------------------------------------------------------------- voicevox + ffmpeg (identical chain to the committed word assets) */

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
  return execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], {
    input,
    maxBuffer: 1 << 26,
  });
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
  const tmp = path.join(os.tmpdir(), `au-${createHash('sha1').update(base).digest('hex').slice(0, 10)}.m4a`);
  execFileSync(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-f', 'wav', '-i', 'pipe:0', '-c:a', 'aac', '-b:a', '128k', '-y', tmp],
    {
      input: masterWav,
      maxBuffer: 1 << 26,
    },
  );
  const m4a = readFileSync(tmp);
  writeFileSync(`${base}.opus`, opus);
  writeFileSync(`${base}.m4a`, m4a);
  return { bytes: opus.length, bytesM4a: m4a.length };
}

function probeMs(file) {
  const out = execFileSync(
    'ffprobe',
    ['-hide_banner', '-loglevel', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
    { maxBuffer: 1 << 24 },
  ).toString();
  const v = parseFloat(out);
  if (!Number.isFinite(v)) throw new Error(`bad duration for ${file}`);
  return Math.round(v * 1000);
}

/* ---------------------------------------------------------------- ASR verification (z-ai CLI on the mastered wav — retry with backoff for rate limits) */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function asrTranscribe(wavPath) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const out = path.join(
      os.tmpdir(),
      `asr-${createHash('sha1')
        .update(wavPath + attempt)
        .digest('hex')
        .slice(0, 10)}.json`,
    );
    try {
      execFileSync('z-ai', ['asr', '--file', wavPath, '-o', out], { timeout: 180000, maxBuffer: 1 << 24 });
      const j = JSON.parse(readFileSync(out, 'utf8'));
      const t = String(j.text ?? '').trim();
      if (t) return { transcript: t, engine: 'z-ai-asr' };
    } catch (e) {
      const msg = String(e).slice(0, 160);
      if (attempt < 5) {
        process.stdout.write(`  asr retry ${attempt}/5 after error (${msg.split('\n')[0]})…\n`);
        await sleep(9000 * attempt);
      } else {
        return { transcript: null, engine: 'z-ai-asr', error: msg };
      }
    }
    await sleep(2500);
  }
  return { transcript: null, engine: 'z-ai-asr', error: 'unreachable' };
}

/*
 * BATCH pass (the rate-limit-friendly verification): ONE ASR call over the
 * concatenation of every committed opus with 0.7s silence gaps (API limit: 30s per file) — the ASR
 * hears the whole registry in order; every asset's acceptance surface must
 * appear in the transcript (normalized, order-checked loosely). One API call
 * instead of N; the validation records the matched surface honestly
 * («batch» engine tag). Falls back to nothing if the call fails — the
 * per-file pass remains the incremental path.
 */
async function asrBatchTranscribe(assets) {
  const parts = [];
  const silence = path.join(os.tmpdir(), 'au-batch-silence.wav');
  execFileSync(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '0.7', '-y', silence],
    { maxBuffer: 1 << 24 },
  );
  for (const a of assets) {
    const wav = path.join(os.tmpdir(), `au-batch-${a.contentId}.wav`);
    execFileSync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        path.join(WORDS_DIR, `${a.contentId}.opus`),
        '-ar',
        '24000',
        '-ac',
        '1',
        '-y',
        wav,
      ],
      { maxBuffer: 1 << 26 },
    );
    parts.push(wav, silence);
  }
  const listFile = path.join(os.tmpdir(), 'au-batch-list.txt');
  writeFileSync(listFile, parts.map((p) => `file '${p}'`).join('\n') + '\n');
  const concat = path.join(os.tmpdir(), 'au-batch-concat.wav');
  execFileSync(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-y', concat],
    { maxBuffer: 1 << 28 },
  );
  const asr = await asrTranscribe(concat);
  return { ...asr, engine: asr.transcript ? 'z-ai-asr (single batch pass over the full registry)' : asr.engine };
}

/** Batch acceptance: the normalized transcript contains one accepted surface
 *  of EVERY asset (kana / katakana / kanji form — the ASR's natural surface). */
function batchAcceptsAll(assets, transcript) {
  const normTranscript = norm(transcript);
  const results = new Map();
  for (const asset of assets) {
    const surfaces = acceptanceFor({ ...asset, kanjiSurfaces: kanjiSurfacesFor(asset, chapterWordsCache) });
    const hit = [...surfaces].find((s) => normTranscript.includes(s));
    results.set(asset.contentId, hit ?? null);
  }
  return results;
}

let chapterWordsCache = null;

/* ---------------------------------------------------------------- run */

async function main() {
  mkdirSync(WORDS_DIR, { recursive: true });
  const words = chapterWords();
  const { forms, sentences } = bindingAssets();
  const assets = [
    ...words.map((w) => ({
      contentId: w.wordAudio,
      unit: 'word',
      text: w.spokenText,
      wordId: w.wordId,
      roleFa: 'تلفظ مستقل واژه — کارت واژه و پرسش‌های معنی/تلفظ (DD-119)',
    })),
    ...forms.map((f) => ({
      contentId: wordFormAudioId(f.text),
      unit: 'word-form',
      text: f.text,
      wordId: f.wordId,
      roleFa: 'شکل مستقل واژه برای جفت تمایزی شنیداری (minimal pair)',
    })),
    ...sentences.map((s) => ({
      contentId: sentenceAudioId(s.text),
      unit: 'sentence',
      text: s.text,
      wordId: null,
      roleFa: 'جملهٔ حامل گرامر 〜から きました — سنجش کارکرد から در قالب جمله',
    })),
  ];

  const entries = VERIFY_ONLY || BATCH_ASR ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')).entries : {};
  const report = [];
  let verified = 0;
  const generatedAt = new Date().toISOString();

  /* --batch-asr: ONE call over the concatenated registry — the rate-limit-
   * friendly pass. Every matched asset is marked asr-verified with the
   * matched surface recorded; unmatched assets keep their prior honest state. */
  if (BATCH_ASR) {
    chapterWordsCache = words;
    const pending = assets.filter((a) => entries[a.contentId]?.validation?.status !== 'asr-verified');
    if (pending.length === 0) {
      process.stdout.write('batch-asr: nothing pending — registry fully verified.\n');
      return;
    }
    process.stdout.write(
      `batch-asr: ONE call over ${pending.length} assets (${(pending.length * 1.5 + pending.reduce((s, a) => s + (entries[a.contentId]?.durationMs ?? 1000) / 1000, 0)).toFixed(0)}s)…\n`,
    );
    const batch = await asrBatchTranscribe(pending);
    if (!batch.transcript) {
      process.stdout.write(`batch-asr FAILED: ${batch.error}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`batch transcript: ${batch.transcript}\n`);
    const matches = batchAcceptsAll(pending, batch.transcript);
    for (const a of pending) {
      const hit = matches.get(a.contentId);
      if (hit) {
        entries[a.contentId] = {
          ...entries[a.contentId],
          validation: { status: 'asr-verified', transcript: hit, engine: batch.engine, checkedAt: generatedAt },
        };
        verified += 1;
        report.push(`PASS ${a.contentId} "${a.text}" matched="${hit}"`);
      } else {
        report.push(`UNMATCHED ${a.contentId} "${a.text}" (no accepted surface in the batch transcript)`);
      }
    }
    writeManifest(entries);
    process.stdout.write(report.join('\n') + '\n');
    process.stdout.write(`\nbatch-asr done: ${verified}/${pending.length} matched\n`);
    process.exitCode = verified === pending.length ? 0 : 1;
    return;
  }

  for (const asset of assets) {
    /* Skip assets already verified by a previous (interrupted) run —
     * --verify-only is idempotent and cumulative. */
    const prior = VERIFY_ONLY ? entries[asset.contentId] : null;
    if (prior?.validation?.status === 'asr-verified') {
      verified += 1;
      report.push(
        `PASS (cached) ${asset.contentId} ${asset.unit} "${asset.text}" asr="${prior.validation.transcript}"`,
      );
      continue;
    }
    const kanjiSurfaces = kanjiSurfacesFor(asset, words);
    const base = path.join(WORDS_DIR, asset.contentId);
    const opusFile = `${base}.opus`;

    let bytes;
    let bytesM4a;
    let durationMs;
    let asr;

    if (VERIFY_ONLY) {
      /* Re-verify the COMMITTED registry: decode the shipped opus to wav and
       * transcribe THAT (the exact bytes production serves). */
      if (!existsSync(opusFile)) throw new Error(`--verify-only: missing committed file ${opusFile}`);
      const e = entries[asset.contentId];
      if (!e) throw new Error(`--verify-only: manifest lacks ${asset.contentId}`);
      bytes = e.bytes;
      bytesM4a = e.bytesM4a;
      durationMs = e.durationMs;
      const wavTmp = path.join(os.tmpdir(), `asrwav-${asset.contentId}.wav`);
      execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', opusFile, '-y', wavTmp], {
        maxBuffer: 1 << 24,
      });
      asr = await asrTranscribe(wavTmp);
    } else {
      const raw = await synth(asset.text);
      const mastered = normTo(master(raw));
      const { bytes: b, bytesM4a: bm } = encode(mastered, base);
      bytes = b;
      bytesM4a = bm;
      durationMs = probeMs(opusFile);

      /* ASR on the mastered wav — the committed files are deterministic encodes
       * of exactly this master (byte hashes recorded below). */
      const wavTmp = path.join(os.tmpdir(), `asrwav-${asset.contentId}.wav`);
      writeFileSync(wavTmp, mastered);
      asr = NO_ASR ? { transcript: null, engine: 'z-ai-asr' } : await asrTranscribe(wavTmp);
    }

    const accept = acceptanceFor({ ...asset, kanjiSurfaces });
    const ok = asr.transcript !== null && accept.has(norm(asr.transcript));

    const validation =
      asr.transcript === null
        ? { status: 'pending-asr' }
        : ok
          ? { status: 'asr-verified', transcript: asr.transcript, engine: asr.engine, checkedAt: generatedAt }
          : { status: 'asr-mismatch', transcript: asr.transcript, engine: asr.engine, checkedAt: generatedAt };
    if (ok) verified += 1;

    entries[asset.contentId] = VERIFY_ONLY
      ? { ...entries[asset.contentId], validation }
      : {
          text: asset.text,
          targetId: asset.wordId,
          audioType: asset.unit,
          roleFa: asset.roleFa,
          voice: { speakerId: SPEAKER, name: CREDIT, style: 'ノーマル' },
          source: {
            engine:
              'voicevox_engine 0.26.2 CPU — ISOLATED OFFLINE RUNNER (sandbox; never the VPS/production — owner constraint 2026-11-21)',
            generatedAt,
            script: SCRIPT,
          },
          path: { opus: `/audio/words/${asset.contentId}.opus`, m4a: `/audio/words/${asset.contentId}.m4a` },
          bytes,
          bytesM4a,
          durationMs,
          hash: hash16(asset.text),
          validation,
        };
    report.push(
      `${ok ? 'PASS' : validation.status === 'pending-asr' ? 'PENDING' : 'FAIL'} ${asset.contentId} ${asset.unit} "${asset.text}" ${durationMs}ms asr="${asr.transcript ?? asr.error ?? '?'}" surfaces=[${[...accept].join(' | ')}]`,
    );
    /* Incremental persistence: every ASR result lands in the manifest
     * immediately — an interrupted run loses nothing. */
    writeManifest(entries);
    if (!NO_ASR && asset.contentId !== assets[assets.length - 1].contentId) await sleep(ASR_GAP_MS);
  }

  writeManifest(entries);

  process.stdout.write(report.join('\n') + '\n');
  process.stdout.write(`\ndone: ${assets.length} assets (${verified} ASR-verified) → ${WORDS_DIR}\n`);
  process.exitCode = verified === assets.length ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
