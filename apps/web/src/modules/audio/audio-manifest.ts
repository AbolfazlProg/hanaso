/**
 * HANASO — line audio manifest (TASK-DLG-POC-01; ADR-009 identity contract).
 * Server-side: builds one manifest entry per dialogue line from the content + registry,
 * and reads the sidecar written by the placeholder generator (bytes/durationMs) when present.
 *
 * Every entry carries full traceability: lineId + characterId + voiceId + content hash +
 * dual-format file slots. Production fills opus+m4a; the PoC generator fills both slots
 * with the generated WAV (documented honestly in the PoC report).
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { hashAudioLine } from '@/modules/dialogue/server';

export interface LineAudioManifestEntry {
  lineId: string;
  voiceId: string;
  characterId: string;
  hash: string;
  files: { opus: string; m4a: string };
  bytes: number;
  durationMs?: number;
}

/** Sidecar written by scripts/generate-placeholder-audio.mjs next to the WAVs. */
const sidecarSchema = z.object({
  generatedBy: z.string(),
  format: z.string(),
  entries: z.record(z.string(), z.object({ bytes: z.number().int().min(0), durationMs: z.number().int().min(0) })),
});

export type AudioSidecar = z.infer<typeof sidecarSchema>;

const voicesSchema = z.object({
  voices: z.record(
    z.string(),
    z.object({
      engine: z.string(),
      /** TASK-LEARNING-02: VOICEVOX casting (ignored by the placeholder fallback). */
      speakerName: z.string().optional(),
      speakerStyleId: z.number().int().optional(),
      credit: z.string().optional(),
      character: z.string(),
      family: z.string(),
      params: z.object({
        f0Hz: z.number().positive(),
        harmonics: z.array(z.number()),
        speedScale: z.number().positive(),
      }),
    }),
  ),
  distinctness_matrix: z
    .array(
      z.object({
        pair: z.tuple([z.string(), z.string()]),
        delta_semitones: z.number(),
        axes_passed: z.array(z.string()),
      }),
    )
    .optional(),
});

export interface VoiceConfig {
  voiceId: string;
  engine: string;
  character: string;
  family: string;
  f0Hz: number;
  harmonics: number[];
  speedScale: number;
}

function resolveModuleContentPath(file: string): string {
  const rel = path.join('src', 'modules', 'audio', 'content', file);
  const candidates = [path.join(process.cwd(), rel), path.join(process.cwd(), 'apps', 'web', rel)];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(`audio content file not found: ${file} (tried: ${candidates.join(', ')})`);
}

let voicesCache: Map<string, VoiceConfig> | null = null;

/** Load + validate config/voices.yaml (distinctness source of truth). */
export function loadVoices(): Map<string, VoiceConfig> {
  if (voicesCache) return voicesCache;
  const raw = readFileSync(resolveModuleContentPath('voices.yaml'), 'utf8');
  const parsed = voicesSchema.parse(parseYaml(raw));
  voicesCache = new Map(
    Object.entries(parsed.voices).map(([voiceId, v]) => [
      voiceId,
      {
        voiceId,
        engine: v.engine,
        character: v.character,
        family: v.family,
        f0Hz: v.params.f0Hz,
        harmonics: v.params.harmonics,
        speedScale: v.params.speedScale,
      },
    ]),
  );
  return voicesCache;
}

function resolveSidecarPath(): string {
  const rel = path.join('public', 'poc-audio', 'manifest.json');
  const candidates = [path.join(process.cwd(), rel), path.join(process.cwd(), 'apps', 'web', rel)];
  for (const c of candidates) if (existsSync(c)) return c;
  return candidates[0]!;
}

/**
 * TASK-LEARNING-02: REAL pre-generated VOICEVOX assets (dual opus+m4a, committed
 * under public/audio/dialogues/). Preferred over the PoC sine placeholders whenever
 * a line has an entry here. Engine: voicevox 0.15.7 (VPS, build-time — never runtime).
 */
function resolveRealAssetsPath(): string {
  const rel = path.join('public', 'audio', 'dialogues', 'manifest.json');
  const candidates = [path.join(process.cwd(), rel), path.join(process.cwd(), 'apps', 'web', rel)];
  for (const c of candidates) if (existsSync(c)) return c;
  return candidates[0]!;
}

let realAssetsCache: RealAudioAssets | null | undefined;

export interface RealAudioAssets {
  generatedBy: string;
  format: string;
  voices?: Record<string, { engine: string; speakerName: string; speakerStyleId: number; credit: string }>;
  entries: Record<string, { bytes: number; bytesM4a?: number; durationMs: number }>;
}

/** Load the committed VOICEVOX asset manifest (null when absent). */
export function loadRealAudioAssets(): RealAudioAssets | null {
  if (realAssetsCache !== undefined) return realAssetsCache;
  const p = resolveRealAssetsPath();
  if (!existsSync(p)) {
    realAssetsCache = null;
    return realAssetsCache;
  }
  try {
    const raw: unknown = JSON.parse(readFileSync(p, 'utf-8'));
    const parsed = realAssetsSchema.safeParse(raw);
    realAssetsCache = parsed.success ? parsed.data : null;
  } catch {
    realAssetsCache = null;
  }
  return realAssetsCache;
}

const realAssetsSchema = z.object({
  generatedBy: z.string(),
  format: z.string(),
  voices: z
    .record(
      z.string(),
      z.object({
        engine: z.string(),
        speakerName: z.string(),
        speakerStyleId: z.number().int(),
        credit: z.string(),
      }),
    )
    .optional(),
  entries: z.record(
    z.string(),
    z.object({
      bytes: z.number().int().min(0),
      bytesM4a: z.number().int().min(0).optional(),
      durationMs: z.number().int().min(0),
    }),
  ),
});

/**
 * Read the generator sidecar (real bytes/durations). Missing sidecar (audio not generated)
 * returns null — the API then reports availability=false and the player runs silent.
 */
export function loadAudioSidecar(): AudioSidecar | null {
  const p = resolveSidecarPath();
  if (!existsSync(p)) return null;
  const parsed = sidecarSchema.safeParse(JSON.parse(readFileSync(p, 'utf8')));
  return parsed.success ? parsed.data : null;
}

export interface DialogueAudioManifest {
  dialogueId: string;
  /** True when real (VOICEVOX) or placeholder audio files exist on disk. */
  available: boolean;
  /** Honest note surfaced to the UI when audio has not been generated yet. */
  note?: string;
  /** TASK-LEARNING-02: real TTS provenance + per-voice credit (VOICEVOX terms). */
  audioSource?: 'voicevox' | 'placeholder';
  voiceCredits?: string[];
  entries: LineAudioManifestEntry[];
}

export interface BuildManifestInput {
  dialogueId: string;
  lines: { id: string; speaker: string; voiceOverride?: string; text: string }[];
  resolveVoice: (speaker: string, voiceOverride?: string) => { voiceId: string };
}

/** URL slot for a line — REAL dual-format assets when present, PoC WAV otherwise. */
export function placeholderUrls(lineId: string): { opus: string; m4a: string } {
  const real = loadRealAudioAssets()?.entries[lineId];
  if (real) {
    return { opus: `/audio/dialogues/${lineId}.opus`, m4a: `/audio/dialogues/${lineId}.m4a` };
  }
  const wav = `/poc-audio/${lineId}.wav`;
  return { opus: wav, m4a: wav };
}

/** Build the per-line audio manifest for a dialogue. */
export function buildAudioManifest(input: BuildManifestInput): DialogueAudioManifest {
  const sidecar = loadAudioSidecar();
  const real = loadRealAudioAssets();
  const entries = input.lines.map((line) => {
    const voiceId = input.resolveVoice(line.speaker, line.voiceOverride).voiceId;
    const hash = hashAudioLine(line.text, voiceId);
    const realEntry = real?.entries[line.id];
    const side = sidecar?.entries[line.id];
    return {
      lineId: line.id,
      voiceId,
      characterId: line.speaker,
      hash,
      files: placeholderUrls(line.id),
      bytes: realEntry?.bytes ?? side?.bytes ?? 0,
      durationMs: realEntry?.durationMs ?? side?.durationMs,
    };
  });
  const realCount = input.lines.filter((l) => real?.entries[l.id]).length;
  const allReal = real !== null && realCount === input.lines.length;
  const credits = new Set<string>();
  if (real?.voices) {
    for (const line of input.lines) {
      const voiceId = input.resolveVoice(line.speaker, line.voiceOverride).voiceId;
      const v = real.voices[voiceId];
      if (v) credits.add(v.credit);
    }
  }
  return {
    dialogueId: input.dialogueId,
    available: allReal || sidecar !== null,
    audioSource: allReal ? 'voicevox' : 'placeholder',
    voiceCredits: allReal ? [...credits].sort() : undefined,
    note:
      realCount === 0 && sidecar === null
        ? 'audio not generated — run `pnpm gen:audio` (playback runs silent; error paths still demo-able)'
        : realCount > 0 && !allReal
          ? 'mixed audio: some lines have real VOICEVOX assets, others fall back to placeholders'
          : undefined,
    entries,
  };
}

/** Convenience: manifest entries for a loaded Dialogue (speaker → voice via the character registry). */
export function manifestForDialogue(
  dialogueId: string,
  lines: { id: string; speaker: string; voiceOverride?: string; text: string }[],
  resolveVoice: BuildManifestInput['resolveVoice'],
): DialogueAudioManifest {
  return buildAudioManifest({ dialogueId, lines, resolveVoice });
}
