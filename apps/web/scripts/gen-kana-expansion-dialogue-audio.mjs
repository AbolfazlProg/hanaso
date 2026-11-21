#!/usr/bin/env node
/**
 * HANASO — FINALIZATION: generate the dialogue audio assets for the anchor
 * micro-dialogue kana-expansion-01 (l1..l3) — the LAST dialogue family without
 * committed audio (RUN-20261121 §6.4 follow-up batch).
 *
 *   VOICEVOX_URL=http://127.0.0.1:50021 node apps/web/scripts/gen-kana-expansion-dialogue-audio.mjs
 *
 * CONSTRAINT honored: generation runs ONLY on the isolated engine (voicevox_engine
 * 0.26.2 CPU official release, sandbox/runner, 127.0.0.1:50021) — NEVER on the VPS;
 * the production server only ever serves the committed static files (no runtime TTS).
 *
 * SAME method as the committed batches (gen-first-meeting-missing-audio.mjs):
 * cast (voices.yaml, style ids verified against the engine at generation time):
 *   miki -> 四国めたん ノーマル (2)   sora -> 九州そら ノーマル (16)
 * Params (dialogue manifest): speedScale 0.95, volumeScale 1.0, pitchScale 0.0,
 * intonationScale 1.0, prePhonemeLength 0.06, postPhonemeLength 0.18 + the same
 * sentence-final breath (+0.12s on the last accent phrase).
 * Mastering (identical to the committed dialogue assets): HPF 70 Hz + high-shelf
 * +2.5 dB @ 2.5 kHz + gate (−40 dB, 2:1), two-pass RMS match to −23.5 dBFS (the
 * dialogues level — NOT the kana/hostwords −17 dBFS target), peak cap via alimiter
 * 0.8414 (≈ −1.5 dBFS). opus 32 k / m4a 96 k.
 *
 * Text binding (Reviewer-C S2): the manifest hash binds to the RUNTIME line text =
 * token surfaces JOINED (no spaces) — read straight from dialogue.kana-expansion-01.yaml.
 * The synthesis text carries display spacing (tokens joined with single spaces, no
 * punctuation — the YAML lines are unpunctuated fragments).
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
const SLUG = 'kana-expansion-01';

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
  'vv-female-01-normal': 2, // 四国めたん (miki)
  'vv-neutral-03-normal': 16, // 九州そら (sora)
};

// chr-* → voiceId (the character registry's default casting — mirrors resolveSpeaker)
const CHARACTER_VOICE = {
  'chr-miki': 'vv-female-01-normal',
  'chr-sora': 'vv-neutral-03-normal',
};

// Read the lines straight from the dialogue YAML so code and validator can never
// drift apart (same rule as the runtime lineText()).
function yamlLines() {
  const doc = parseYaml(
    readFileSync(path.join(WEB, 'src', 'modules', 'dialogue', 'content', `dialogue.${SLUG}.yaml`), 'utf8'),
  );
  return (doc.dialogue ?? doc).lines.map((l) => ({
    id: l.id,
    speaker: l.speaker,
    runtimeText: l.tokens.map((t) => t.surface).join(''),
    synthText: l.tokens.map((t) => t.surface).join(' '),
  }));
}

function hashAudioLine(text, voiceId) {
  return createHash('sha256').update(JSON.stringify({ text, voiceId }), 'utf8').digest('hex').slice(0, 16);
}

/** Assert the cast's style ids against the live engine before any synthesis. */
async function verifyCast() {
  const res = await fetch(`${VOICEVOX}/speakers`);
  if (!res.ok) throw new Error(`speakers ${res.status}`);
  const speakers = await res.json();
  for (const [voiceId, styleId] of Object.entries(STYLES)) {
    const speakerName = { 2: '四国めたん', 16: '九州そら' }[styleId];
    const s = speakers.find((sp) => sp.name === speakerName);
    if (!s) throw new Error(`speaker ${speakerName} not on engine`);
    const style = s.styles.find((st) => st.id === styleId);
    if (!style || style.name !== 'ノーマル') {
      throw new Error(`style ${styleId} for ${speakerName} is not ノーマル on this engine`);
    }
    console.log('cast verified:', speakerName, `style ${styleId}`, 'ノーマル');
  }
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
  // two-pass RMS→−23.5 dBFS with peak cap −1.5 dBFS, same chain as the committed assets
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
  const gain = -23.5 - meanRms; // dB toward the committed dialogue assets' RMS level
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

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
await verifyCast();
const results = [];
for (const t of yamlLines()) {
  const voiceId = CHARACTER_VOICE[t.speaker];
  const speaker = STYLES[voiceId];
  if (!speaker) throw new Error(`unknown speaker ${t.speaker}`);
  const wav = await synth(t.synthText, speaker);
  const base = path.join(DIR, t.id);
  const tmp = path.join(DIR, `.${t.id}.tmp`);
  writeFileSync(tmp, wav);
  master(tmp, base);
  for (const f of [tmp, `${base}.stage1.wav`, `${base}.master.wav`]) execFileSync('rm', ['-f', f]);
  const stat = (p) => execFileSync('stat', ['-c', '%s', p]).toString().trim();
  const dur = execFileSync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'csv=p=0',
    `${base}.opus`,
  ])
    .toString()
    .trim();
  const entry = {
    bytes: Number(stat(`${base}.opus`)),
    bytesM4a: Number(stat(`${base}.m4a`)),
    durationMs: Math.round(Number(dur) * 1000),
    // the committed hash binds to the runtime line text (token-joined), NOT the synthesis spacing
    hash: hashAudioLine(t.runtimeText, voiceId),
  };
  manifest.entries[t.id] = entry;
  results.push({ key: t.id, ...entry });
  console.log('generated', t.id, JSON.stringify(results[results.length - 1]));
}
// stable-ordered entries
manifest.entries = Object.fromEntries(Object.entries(manifest.entries).sort(([a], [b]) => (a < b ? -1 : 1)));
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
console.log('manifest updated:', MANIFEST);
