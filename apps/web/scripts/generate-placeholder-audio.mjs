#!/usr/bin/env node
/**
 * HANASO — placeholder audio generator (TASK-DLG-POC-01).
 *
 * Generates DETERMINISTIC placeholder WAVs for every line of the PoC dialogue so the
 * multi-speaker playback chain (T1), the pitch-distinctness axis (T2) and the error
 * paths can be exercised before VOICEVOX assets exist.
 *
 *   pnpm gen:audio        (from repo root; or pnpm --filter web gen:audio)
 *
 * - One file per line: apps/web/public/poc-audio/<lineId>.wav (gitignored — binary).
 * - F0 per voice from src/modules/audio/content/voices.yaml
 *   (miki=210Hz, yamada=110Hz, sora=160Hz + light harmonics) — sine synthesis, no TTS.
 * - Duration scales with line length (0.8–2.5s).
 * - Writes a sidecar manifest.json (bytes + durationMs per line) next to the WAVs.
 * - Hash = sha256({text, voiceId}) — MUST stay identical to `hashAudioLine()` in
 *   src/modules/dialogue/content/schema.ts (unit test pins this).
 *
 * ⚠️ HONESTY NOTE: the production pipeline (ADR-009) emits dual Opus + AAC/m4a via
 * VOICEVOX at build time. This placeholder emits WAV only; the dual-source playback
 * path is still exercised because both manifest slots point at the generated WAV.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const APP_ROOT = process.cwd(); // apps/web when run via pnpm --filter web
const CONTENT_DIR = path.join(APP_ROOT, 'src/modules/dialogue/content');
const VOICES_FILE = path.join(APP_ROOT, 'src/modules/audio/content/voices.yaml');
const OUT_DIR = path.join(APP_ROOT, 'public/poc-audio');

/** TASK-LEARNING-01: generate for EVERY bundled dialogue (not just the PoC). */
function listDialogueFiles() {
  return readdirSync(CONTENT_DIR)
    .filter((f) => f.startsWith('dialogue.') && f.endsWith('.yaml'))
    .map((f) => path.join(CONTENT_DIR, f));
}

const SAMPLE_RATE = 22050;

/** sha256({text, voiceId}) — keep byte-identical to hashAudioLine() in the dialogue module. */
export function hashLine(text, voiceId) {
  return createHash('sha256').update(JSON.stringify({ text, voiceId }), 'utf8').digest('hex').slice(0, 16);
}

/** Deterministic duration by token count (ms), clamped to [800, 2500]. */
export function estimateDurationMs(tokenCount) {
  return Math.min(2500, Math.max(800, Math.round(tokenCount * 260 + 500)));
}

/** Deterministic PRNG (mulberry32) seeded from the line hash — reproducible builds. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mono 16-bit PCM WAV header. */
function wavHeader(numSamples) {
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM format
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

/**
 * Synthesize one line's audio: harmonics stack + slow vibrato + attack/decay envelope.
 * Deterministic given (voice params, token count, hash seed).
 */
function synthesize({ f0Hz, harmonics, durationMs, seed }) {
  const numSamples = Math.round((durationMs / 1000) * SAMPLE_RATE);
  const rand = mulberry32(seed);
  const vibratoHz = 4.5 + rand() * 1.5;
  const vibratoDepth = 0.0025 + rand() * 0.002; // ±0.25–0.45% — subtle, keeps voices distinguishable
  const attack = Math.round(0.02 * SAMPLE_RATE);
  const release = Math.round(0.06 * SAMPLE_RATE);
  const samples = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const instF0 = f0Hz * (1 + vibratoDepth * Math.sin(2 * Math.PI * vibratoHz * t));
    let s = 0;
    for (let h = 0; h < harmonics.length; h++) {
      s += harmonics[h] * Math.sin(2 * Math.PI * instF0 * (h + 1) * t);
    }
    // envelope
    let env = 1;
    if (i < attack) env = i / attack;
    else if (i > numSamples - release) env = Math.max(0, (numSamples - i) / release);
    // gentle syllabic modulation (~4Hz) so it doesn't sound like a flat test tone
    const syllabic = 0.75 + 0.25 * Math.sin(2 * Math.PI * 3.7 * t + rand() * 0.0);
    const v = s * env * syllabic * 0.28; // headroom for stacked harmonics
    samples[i] = Math.max(-32767, Math.min(32767, Math.round(v * 32767)));
  }
  return Buffer.concat([wavHeader(numSamples), Buffer.from(samples.buffer, 0, numSamples * 2)]);
}

async function main() {
  const voicesDoc = parseYaml(readFileSync(VOICES_FILE, 'utf8'));
  const files = listDialogueFiles();
  if (files.length === 0) throw new Error(`no dialogue.*.yaml files under ${CONTENT_DIR}`);

  const manifests = {};
  let totalBytes = 0;
  let lineCount = 0;
  mkdirSync(OUT_DIR, { recursive: true });

  for (const file of files) {
    const dialogue = parseYaml(readFileSync(file, 'utf8'));
    for (const line of dialogue.lines) {
      const speaker = line.speaker;
      const voice = Object.values(voicesDoc.voices).find((v) => v.character === speaker);
      if (!voice) throw new Error(`no voice configured for speaker ${speaker}`);
      const voiceId = Object.entries(voicesDoc.voices).find(([, v]) => v.character === speaker)[0];
      const text = line.tokens.map((t) => t.surface).join('');
      const hash = hashLine(text, voiceId);
      const durationMs = estimateDurationMs(line.tokens.length);
      const seed = parseInt(hash.slice(0, 8), 16);
      const wav = synthesize({
        f0Hz: voice.params.f0Hz,
        harmonics: voice.params.harmonics,
        durationMs,
        seed,
      });
      const file = path.join(OUT_DIR, `${line.id}.wav`);
      writeFileSync(file, wav);
      totalBytes += wav.length;
      manifests[line.id] = { bytes: wav.length, durationMs };
      lineCount += 1;
    }
    console.log(`  ${path.basename(file)}: ${dialogue.lines.length} lines`);
  }

  writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify({ generatedBy: 'generate-placeholder-audio.mjs', format: 'wav-pcm16', entries: manifests }, null, 2),
  );
  console.log(
    `\n✓ ${lineCount} placeholder WAVs (${files.length} dialogues) → ${path.relative(APP_ROOT, OUT_DIR)} (total ${(totalBytes / 1024).toFixed(1)}KB)`,
  );
  console.log('  sidecar manifest.json written (bytes/durationMs per line)');
  console.log('  NOTE: production pipeline emits dual Opus+m4a (ADR-009); this placeholder is WAV.');
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
