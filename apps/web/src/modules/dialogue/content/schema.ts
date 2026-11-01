/**
 * HANASO — dialogue content schema (TASK-DLG-POC-01) — PURE module (client-safe).
 * zod schemas + parse/normalize per the KB dialogue-content-schema contract.
 * File loading (node:fs) lives in content/loader.ts behind the module's server entry —
 * this file must stay free of node builtins so the module index is browser-bundleable.
 */
import { z } from 'zod';
import type { Dialogue, DialogueLine, DialogueToken } from '../types';

/** Emotion tags understood by content CI. Unknown tags still map (→ neutral) at the animation layer (ADR-018 §۲-۲). */
export const CONTENT_EMOTION_TAGS = [
  'neutral',
  'happy',
  'surprised',
  'apologetic',
  'thinking',
  'sad',
  'confident',
] as const;

export const CONTENT_FRAMES = ['wide', 'speaker-a', 'speaker-b', 'close'] as const;

export const tokenSchema = z.object({
  surface: z.string().min(1),
  reading: z.string().min(1),
  pos: z.string().min(1).optional(),
  katakana: z.boolean().optional(),
  chunk: z.string().min(1).optional(),
});

export const lineSchema = z.object({
  id: z.string().regex(/^s-[a-z0-9-]+$/, 'line id must be slug-shaped like s-cafe-morning-01-l1'),
  speaker: z.string().regex(/^chr-[a-z0-9-]+$/, 'speaker must be a character id (chr-*)'),
  frame: z.enum(CONTENT_FRAMES).optional(),
  tokens: z.array(tokenSchema).min(1),
  fa: z.string().min(1),
  emotion_tag: z.enum(CONTENT_EMOTION_TAGS).optional(),
  gap_after_ms: z.number().int().min(0).max(5000).optional(),
  voice_override: z.string().min(1).optional(),
  teaches: z.array(z.string().min(1)).optional(),
});

export const dialogueFileSchema = z.object({
  meta: z.object({
    id: z.string().regex(/^dlg-[a-z0-9-]+$/),
    format: z.literal(2),
    stage: z.number().int().min(1).max(5),
    jlpt: z.string().min(1),
    review: z.boolean().default(true),
    generated: z.object({ tool: z.string().min(1), at: z.string().min(1) }),
  }),
  dialogue_ref: z.string().min(1),
  scene: z.string().min(1),
  characters: z.array(z.string().regex(/^chr-[a-z0-9-]+$/)).min(1),
  turn_gap_default_ms: z.number().int().min(0).max(5000).default(300),
  lines: z.array(lineSchema).min(1),
});

export type DialogueFile = z.infer<typeof dialogueFileSchema>;

/**
 * Validate a parsed YAML document and normalize it into the engine-side Dialogue.
 * Throws zod errors with dialogue context — the caller (loader) adds file context.
 */
export function parseDialogueDocument(slug: string, doc: unknown): Dialogue {
  const parsed = dialogueFileSchema.safeParse(doc);
  if (!parsed.success) {
    throw new Error(`dialogue ${slug} failed schema validation: ${parsed.error.message}`);
  }
  const d = parsed.data;
  if (d.dialogue_ref !== d.meta.id) {
    throw new Error(`dialogue ${slug}: dialogue_ref (${d.dialogue_ref}) ≠ meta.id (${d.meta.id})`);
  }

  const seen = new Set<string>();
  const speakers = new Set<string>();
  for (const line of d.lines) {
    if (seen.has(line.id)) throw new Error(`dialogue ${slug}: duplicate line id ${line.id}`);
    seen.add(line.id);
    if (!d.characters.includes(line.speaker)) {
      throw new Error(`dialogue ${slug}: line ${line.id} speaker ${line.speaker} not in characters`);
    }
    speakers.add(line.speaker);
  }
  if (speakers.size < 2) {
    throw new Error(`dialogue ${slug}: needs at least 2 distinct speakers (multi-speaker contract)`);
  }

  return {
    id: d.meta.id,
    scene: d.scene,
    characterIds: [...d.characters],
    turnGapDefaultMs: d.turn_gap_default_ms,
    lines: d.lines.map(
      (l) =>
        ({
          id: l.id,
          speaker: l.speaker,
          frame: l.frame,
          tokens: l.tokens as DialogueToken[],
          fa: l.fa,
          emotionTag: l.emotion_tag,
          gapAfterMs: l.gap_after_ms,
          voiceOverride: l.voice_override,
          teaches: l.teaches,
        }) satisfies DialogueLine,
    ),
  };
}

/** Plain-text surface of a line (audio identity input + hash source, shared with the placeholder generator). */
export function lineText(line: DialogueLine): string {
  return line.tokens.map((t) => t.surface).join('');
}
