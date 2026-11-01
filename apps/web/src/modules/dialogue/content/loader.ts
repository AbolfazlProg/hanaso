/**
 * HANASO — dialogue content loader (TASK-DLG-POC-01) — SERVER-ONLY (node:fs/crypto).
 * Reads the YAML next to this module, validates via the pure schema, caches per process.
 * Exposed through the module's server entry (`@/modules/dialogue/server`).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Dialogue } from '../types';
import { parseDialogueDocument } from './schema';

/**
 * Resolve a content file across dev / standalone / container layouts:
 * - dev (cwd = apps/web):                  <cwd>/src/modules/dialogue/content/<file>
 * - standalone run from repo root or /app: <cwd>/apps/web/src/modules/dialogue/content/<file>
 */
export function resolveContentPath(file: string): string {
  const rel = path.join('src', 'modules', 'dialogue', 'content', file);
  const candidates = [path.join(process.cwd(), rel), path.join(process.cwd(), 'apps', 'web', rel)];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error(
    `dialogue content file not found: ${file} (tried: ${candidates.join(', ')}) — run inside apps/web or the repo root`,
  );
}

const cache = new Map<string, Dialogue>();

/** Read + validate + normalize a dialogue YAML file. Throws with file context. */
export function loadDialogue(slug: string): Dialogue {
  const cached = cache.get(slug);
  if (cached) return cached;

  const file = resolveContentPath(`dialogue.${slug}.yaml`);
  const doc = parseYaml(readFileSync(file, 'utf8'));
  const dialogue = parseDialogueDocument(slug, doc);
  cache.set(slug, dialogue);
  return dialogue;
}

/**
 * Stable content→asset hash: sha256({text, voiceId}).
 * ⚠️ Must stay byte-identical to `hashLine()` in apps/web/scripts/generate-placeholder-audio.mjs
 * (a unit test pins the two together).
 */
export function hashAudioLine(text: string, voiceId: string): string {
  return createHash('sha256').update(JSON.stringify({ text, voiceId }), 'utf8').digest('hex').slice(0, 16);
}
