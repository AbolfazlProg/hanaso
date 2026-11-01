/**
 * HANASO — character registry (ADR-018 §۴ follow-up requirement).
 * Loads + validates all `content/characters/<id>/manifest.json` descriptors and resolves
 * speaker ids → { manifest, voiceId } for the dialogue pipeline (speaker id → everything,
 * ADR-018 §۲-۳). Manifests are statically imported (bundled — no runtime fs).
 */
import { z } from 'zod';
import mikiManifest from './content/characters/chr-miki/manifest.json';
import soraManifest from './content/characters/chr-sora/manifest.json';
import yamadaManifest from './content/characters/chr-yamada/manifest.json';
import type { CharacterAssetManifest, ExpressionTag } from './contracts';

const EXPRESSION_TAGS: [ExpressionTag, ...ExpressionTag[]] = [
  'neutral',
  'happy',
  'surprised',
  'apologetic',
  'thinking',
  'sad',
  'confident',
];

const assetRefSchema = z.object({ src: z.string().min(1), hash: z.string().optional() }).nullable();

/** ADR-018 §۲-۱(a) — the manifest contract, enforced at load time. */
export const characterManifestSchema = z.object({
  id: z.string().regex(/^chr-[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'art semver'),
  nameJa: z.string().min(1),
  nameFa: z.string().min(1),
  role: z.enum(['central', 'companion-1', 'companion-2']),
  colorToken: z.string().regex(/^speaker-\d$/, 'locked DD-067 speaker tokens'),
  voiceId: z.string().min(1),
  states: z.array(z.enum(['idle', 'listening', 'speaking'])).min(1),
  expressions: z.record(z.enum(EXPRESSION_TAGS), assetRefSchema),
  assets: z.object({
    renderer: z.enum(['svg-css', 'rive', 'spine', 'lottie', 'video']),
    entry: z.string().min(1),
    layers: z.array(z.string()).optional(),
    totalBytes: z.number().int().min(0),
    checksums: z.record(z.string(), z.string()),
  }),
  performance: z.object({ fps60Mobile: z.boolean(), measuredBytes: z.number().int().min(0) }),
});

const RAW_MANIFESTS: unknown[] = [mikiManifest, yamadaManifest, soraManifest];

function loadRegistry(): Map<string, CharacterAssetManifest> {
  const map = new Map<string, CharacterAssetManifest>();
  for (const raw of RAW_MANIFESTS) {
    const parsed = characterManifestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`invalid character manifest: ${parsed.error.message}`);
    }
    const m = parsed.data as CharacterAssetManifest;
    if (map.has(m.id)) throw new Error(`duplicate character id ${m.id}`);
    // exactly one central character per v1 scope (DD-082)
    map.set(m.id, m);
  }
  const centrals = [...map.values()].filter((m) => m.role === 'central');
  if (centrals.length !== 1) {
    throw new Error(`expected exactly 1 central character, found ${centrals.length}`);
  }
  return map;
}

const registry = loadRegistry();

/** All registered manifests (validated at module load — fail fast). */
export function listCharacters(): CharacterAssetManifest[] {
  return [...registry.values()];
}

/** Resolve a dialogue speaker id → manifest + voice (ADR-018 §۲-۳). Throws on unknown ids. */
export function resolveSpeaker(speakerId: string): { manifest: CharacterAssetManifest; voiceId: string } {
  const manifest = registry.get(speakerId);
  if (!manifest) {
    throw new Error(
      `unknown speaker "${speakerId}" — registered: ${[...registry.keys()].join(', ')} (ADR-018 manifest missing)`,
    );
  }
  return { manifest, voiceId: manifest.voiceId };
}

/** Voice-distinctness helper (KB audio-ms §۳): all registered voice ids, unique. */
export function registeredVoiceIds(): string[] {
  return [...new Set([...registry.values()].map((m) => m.voiceId))];
}
