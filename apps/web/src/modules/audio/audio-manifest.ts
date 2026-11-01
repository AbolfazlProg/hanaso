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
  format: z.literal('wav-pcm16'),
  entries: z.record(z.string(), z.object({ bytes: z.number().int().min(0), durationMs: z.number().int().min(0) })),
});

export type AudioSidecar = z.infer<typeof sidecarSchema>;

const voicesSchema = z.object({
  voices: z.record(
    z.string(),
    z.object({
      engine: z.string(),
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
  /** True when generated placeholder files exist on disk (sidecar present). */
  available: boolean;
  /** Honest note surfaced to the UI when audio has not been generated yet. */
  note?: string;
  entries: LineAudioManifestEntry[];
}

export interface BuildManifestInput {
  dialogueId: string;
  lines: { id: string; speaker: string; voiceOverride?: string; text: string }[];
  resolveVoice: (speaker: string, voiceOverride?: string) => { voiceId: string };
}

/** URL slot for a line (PoC: /poc-audio/<lineId>.wav in both dual-format slots). */
export function placeholderUrls(lineId: string): { opus: string; m4a: string } {
  const wav = `/poc-audio/${lineId}.wav`;
  return { opus: wav, m4a: wav };
}

/** Build the per-line audio manifest for a dialogue. */
export function buildAudioManifest(input: BuildManifestInput): DialogueAudioManifest {
  const sidecar = loadAudioSidecar();
  const entries = input.lines.map((line) => {
    const voiceId = input.resolveVoice(line.speaker, line.voiceOverride).voiceId;
    const hash = hashAudioLine(line.text, voiceId);
    const side = sidecar?.entries[line.id];
    return {
      lineId: line.id,
      voiceId,
      characterId: line.speaker,
      hash,
      files: placeholderUrls(line.id),
      bytes: side?.bytes ?? 0,
      durationMs: side?.durationMs,
    };
  });
  return {
    dialogueId: input.dialogueId,
    available: sidecar !== null,
    note:
      sidecar === null
        ? 'placeholder audio not generated — run `pnpm gen:audio` (playback runs silent; error paths still demo-able)'
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
