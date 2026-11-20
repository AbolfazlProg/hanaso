#!/usr/bin/env node
/**
 * HANASO — FINALIZATION: generate the MISSING dialogue audio assets for
 * first-meeting-01 (l9..l12 + l13-co) with the SAME cast, params and mastering
 * chain as the committed l1..l8 assets (TASK-LEARNING-02 voices.yaml + the
 * manifest sidecar).
 *
 *   VOICEVOX_URL=http://127.0.0.1:50021 node apps/web/scripts/gen-first-meeting-missing-audio.mjs
 *
 * Cast (voices.yaml, style ids verified against the engine at generation time):
 *   yamada -> 玄野武宏  ノーマル (11)   sora -> 九州そら ノーマル (16)
 *   kim    -> 春日部つむぎ ノーマル (8)
 * Params (dialogue manifest): speedScale 0.95, volumeScale 1.0, pitchScale 0.0,
 * intonationScale 1.0, prePhonemeLength 0.06, postPhonemeLength 0.18.
 * Mastering (identical to the committed assets): HPF 70 Hz + high-shelf +2.5 dB @ 2.5 kHz
 * + gate (−40 dB, 2:1) + loudness match. Loudness note (FINALIZATION QC): the
 * committed l1..l8 dialogue assets sit at RMS ≈ −25..−23 dB — the new files are
 * matched to −23.5 dB (NOT the kana/hostwords −17 dBFS target) so sequential
 * playback across the whole dialogue is level-consistent; peak ≤ −1.5 dBFS.
 * opus 32 k / m4a 96 k. The manifest sidecar gains the new entries (bytes/durationMs/hash).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

const VOICEVOX = process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021';
const WEB = path.join(process.cwd(), 'apps', 'web');
const DIR = path.join(WEB, 'public', 'audio', 'dialogues');
const MANIFEST = path.join(DIR, 'manifest.json');

const PARAMS = {
  speedScale: 0.95,
  volumeScale: 1.0,
  pitchScale: 0.0,
  intonationScale: 1.0,
  prePhonemeLength: 0.06,
  postPhonemeLength: 0.18,
};

// voiceId → style id (voices.yaml ノーマル styles)
const STYLES = {
  'vv-male-02-normal': 11, // 玄野武宏 (yamada)
  'vv-neutral-03-normal': 16, // 九州そら (sora)
  'vv-female-04-bright': 8, // 春日部つむぎ (kim)
};

// The five missing assets. text = the dialogue line's textJa (display string).
const TARGETS = [
  { key: 's-first-meeting-01-l9', voiceId: 'vv-male-02-normal', text: 'キムさん も ちゅうごくじん です か。' },
  { key: 's-first-meeting-01-l10', voiceId: 'vv-neutral-03-normal', text: 'いいえ、キムさんは ちゅうごくじんでは ありません。かんこくじん です。' },
  { key: 's-first-meeting-01-l11', voiceId: 'vv-male-02-normal', text: 'そうですか。わかりました。' },
  { key: 's-first-meeting-01-l12', voiceId: 'vv-female-04-bright', text: 'はじめまして、キムです。かんこくから きました。よろしく おねがいします。' },
  { key: 's-first-meeting-01-l13-co', voiceId: 'vv-male-02-normal', text: 'よろしく おねがいします。' },
];

/** Same rule as modules/dialogue hashAudioLine (sha256 of JSON {text, voiceId}, 16 hex). */
function hashAudioLine(text, voiceId) {
  return createHash('sha256').update(JSON.stringify({ text, voiceId }), 'utf8').digest('hex').slice(0, 16);
}

async function synth(text, speaker) {
  const qRes = await fetch(`${VOICEVOX}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`, { method: 'POST' });
  if (!qRes.ok) throw new Error(`audio_query ${qRes.status}`);
  const q = await qRes.json();
  Object.assign(q, PARAMS);
  // sentence-final breath: slightly longer tail after the last accent phrase
  if (q.accent_phrases && q.accent_phrases.length > 0) {
    q.accent_phrases[q.accent_phrases.length - 1].pause_length = (q.accent_phrases[q.accent_phrases.length - 1].pause_length ?? 0) + 0.12;
  }
  const sRes = await fetch(`${VOICEVOX}/synthesis?speaker=${speaker}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(q),
  });
  if (!sRes.ok) throw new Error(`synthesis ${sRes.status}`);
  return Buffer.from(await sRes.arrayBuffer());
}

function master(wavPath, outBase) {
  // two-pass RMS→−17 dBFS with peak cap −1.5 dBFS, same chain as the committed assets
  execFileSync('ffmpeg', ['-y', '-i', wavPath, '-af', 'highpass=f=70,treble=f=2500:g=2.5,agate=threshold=-40dB:ratio=2:attack=2:release=20', '-f', 'wav', `${outBase}.stage1.wav`], { stdio: 'pipe' });
  const vol = spawnSync('ffmpeg', ['-i', `${outBase}.stage1.wav`, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
  const meanRms = Number(/mean_volume:\s*(-?[\d.]+) dB/.exec(vol.stderr ?? '')?.[1] ?? '-20');
  const gain = -23.5 - meanRms; // dB toward the committed assets' RMS level
  execFileSync('ffmpeg', ['-y', '-i', `${outBase}.stage1.wav`, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=0.8414:level=false`, '-f', 'wav', `${outBase}.master.wav`], { stdio: 'pipe' });
  execFileSync('ffmpeg', ['-y', '-i', `${outBase}.master.wav`, '-c:a', 'libopus', '-b:a', '32k', `${outBase}.opus`], { stdio: 'pipe' });
  execFileSync('ffmpeg', ['-y', '-i', `${outBase}.master.wav`, '-c:a', 'aac', '-b:a', '96k', `${outBase}.m4a`], { stdio: 'pipe' });
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const results = [];
for (const t of TARGETS) {
  const speaker = STYLES[t.voiceId];
  if (!speaker) throw new Error(`unknown voiceId ${t.voiceId}`);
  const wav = await synth(t.text, speaker);
  const base = path.join(DIR, t.key);
  const tmp = path.join(DIR, `.${t.key}.tmp`);
  writeFileSync(tmp, wav);
  master(tmp, base);
  for (const f of [tmp, `${base}.stage1.wav`, `${base}.master.wav`]) execFileSync('rm', ['-f', f]);
  const stat = (p) => execFileSync('stat', ['-c', '%s', p]).toString().trim();
  const dur = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `${base}.opus`]).toString().trim();
  const entry = {
    bytes: Number(stat(`${base}.opus`)),
    bytesM4a: Number(stat(`${base}.m4a`)),
    durationMs: Math.round(Number(dur) * 1000),
    hash: hashAudioLine(t.text, t.voiceId),
  };
  manifest.entries[t.key] = entry;
  results.push({ key: t.key, ...entry });
  console.log('generated', t.key, JSON.stringify(entry));
}
// stable-ordered entries
manifest.entries = Object.fromEntries(Object.entries(manifest.entries).sort(([a], [b]) => (a < b ? -1 : 1)));
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
console.log('manifest updated:', MANIFEST);
