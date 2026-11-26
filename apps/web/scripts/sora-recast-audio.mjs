#!/usr/bin/env node
/**
 * HANASO — LESSON-UX P2 #201: regenerate EVERY Sora dialogue asset with the
 * re-cast voice (九州そら → 東北きりたん, style 108).
 *
 *   VOICEVOX_URL=http://127.0.0.1:50021 node apps/web/scripts/sora-recast-audio.mjs
 *
 * Same params + mastering chain + RMS target (−23.5 dB, the dialogue level) as
 * every committed dialogue asset (gen-first-meeting-missing-audio.mjs). The
 * files keep their lineId names; the manifest entries get new bytes/durations
 * and hashes bound to {runtimeText, vv-female-05-young}. Old 九州そら files are
 * REPLACED in place (the registry stays orphan-free).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const VOICEVOX = process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021';
const WEB = path.join(process.cwd(), 'apps', 'web');
const DIR = path.join(WEB, 'public', 'audio', 'dialogues');
const MANIFEST = path.join(DIR, 'manifest.json');
const SORA_VOICE = 'vv-female-05-young';
const SORA_STYLE = 108; // 東北きりたん ノーマル

const PARAMS = {
  speedScale: 0.95,
  volumeScale: 1.0,
  pitchScale: 0.0,
  intonationScale: 1.0,
  prePhonemeLength: 0.06,
  postPhonemeLength: 0.18,
};

/* Every dialogue YAML + the sora lines to regenerate (main-speaker lines only;
 * l13-co is yamada's half of the joint turn and stays untouched). */
const DIALOGUES = [
  'dialogue.kana-welcome-01.yaml',
  'dialogue.kana-expansion-01.yaml',
  'dialogue.cafe-morning-01.yaml',
  'dialogue.first-meeting-01.yaml',
];

function hashAudioLine(text, voiceId) {
  return createHash('sha256').update(JSON.stringify({ text, voiceId }), 'utf8').digest('hex').slice(0, 16);
}

async function synth(text, speaker) {
  const qRes = await fetch(`${VOICEVOX}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`, {
    method: 'POST',
  });
  if (!qRes.ok) throw new Error(`audio_query ${qRes.status}`);
  const q = await qRes.json();
  Object.assign(q, PARAMS);
  // sentence-final breath: slightly longer tail after the last accent phrase
  if (q.accent_phrases && q.accent_phrases.length > 0) {
    q.accent_phrases[q.accent_phrases.length - 1].pause_length =
      (q.accent_phrases[q.accent_phrases.length - 1].pause_length ?? 0) + 0.12;
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
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      wavPath,
      '-af',
      'highpass=f=70,treble=f=2500:g=2.5,agate=threshold=-40dB:ratio=2:attack=2:release=20',
      '-f',
      'wav',
      `${outBase}.stage1.wav`,
    ],
    { stdio: 'pipe' },
  );
  const vol = spawnSync('ffmpeg', ['-i', `${outBase}.stage1.wav`, '-af', 'volumedetect', '-f', 'null', '-'], {
    encoding: 'utf8',
  });
  const meanRms = Number(/mean_volume:\s*(-?[\d.]+) dB/.exec(vol.stderr ?? '')?.[1] ?? '-20');
  const gain = -23.5 - meanRms; // the committed dialogue assets' RMS level
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      `${outBase}.stage1.wav`,
      '-af',
      `volume=${gain.toFixed(2)}dB,alimiter=limit=0.8414:level=false`,
      '-f',
      'wav',
      `${outBase}.master.wav`,
    ],
    { stdio: 'pipe' },
  );
  execFileSync('ffmpeg', ['-y', '-i', `${outBase}.master.wav`, '-c:a', 'libopus', '-b:a', '32k', `${outBase}.opus`], {
    stdio: 'pipe',
  });
  execFileSync('ffmpeg', ['-y', '-i', `${outBase}.master.wav`, '-c:a', 'aac', '-b:a', '96k', `${outBase}.m4a`], {
    stdio: 'pipe',
  });
}

/* Collect sora's lines: runtime text (token surfaces joined — the hash rule)
 * and a synthesis text (surfaces joined with natural spacing via the YAML's
 * own token groups — same convention as the committed assets). */
const targets = [];
for (const file of DIALOGUES) {
  const doc = parseYaml(readFileSync(path.join(WEB, 'src', 'modules', 'dialogue', 'content', file), 'utf8'));
  for (const line of doc.lines ?? []) {
    if (line.speaker !== 'chr-sora') continue;
    const runtime = line.tokens.map((t) => t.surface).join('');
    targets.push({ key: line.id, runtime, file });
  }
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
let done = 0;
for (const t of targets) {
  const speaker = SORA_STYLE;
  const wav = await synth(t.runtime, speaker);
  const base = path.join(DIR, t.key);
  const tmp = path.join(DIR, `.${t.key}.tmp`);
  writeFileSync(tmp, wav);
  master(tmp, base);
  for (const f of [tmp, `${base}.stage1.wav`, `${base}.master.wav`]) execFileSync('rm', ['-f', f]);
  const stat = (p) => Number(execFileSync('stat', ['-c', '%s', p]).toString().trim());
  const dur = Number(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `${base}.opus`])
      .toString()
      .trim(),
  );
  manifest.entries[t.key] = {
    bytes: stat(`${base}.opus`),
    bytesM4a: stat(`${base}.m4a`),
    durationMs: Math.round(dur * 1000),
    hash: hashAudioLine(t.runtime, SORA_VOICE),
  };
  done += 1;
  console.log(`re-cast ${t.key} (${t.runtime}) → ${manifest.entries[t.key].durationMs}ms`);
}

/* The voices map reflects the CURRENT registry provenance: the sora slot moves
 * to 東北きりたん; 九州そら leaves (no line resolves to it any more). */
manifest.voices[SORA_VOICE] = {
  engine: 'voicevox',
  speakerName: '東北きりたん',
  speakerStyleId: SORA_STYLE,
  credit: 'VOICEVOX:東北きりたん',
};
delete manifest.voices['vv-neutral-03-normal'];
manifest.generatedBy =
  'voicevox:0.15.7 (VPS engine) — TASK-LEARNING-02 pre-generation | ' +
  'LESSON-UX P2 #2026-11-27 re-cast batch: every chr-sora line regenerated with 東北きりたん ' +
  '(speaker 108, voicevox_engine 0.26.2 CPU on an ISOLATED OFFLINE RUNNER — never on the VPS/production), ' +
  'same params + mastering chain + −23.5 dB RMS dialogue level';

manifest.entries = Object.fromEntries(Object.entries(manifest.entries).sort(([a], [b]) => (a < b ? -1 : 1)));
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
console.log(`\ndone: ${done} sora assets re-cast — manifest updated (${Object.keys(manifest.entries).length} entries)`);
