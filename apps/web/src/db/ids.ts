/**
 * HANASO — deterministic content ids (TASK-M0-10 DB-layer / Issue #11).
 *
 * The content seed needs STABLE uuids across re-runs (idempotent seed, resolvable
 * foreign keys) while the server default is uuidv7() (KB database-architecture §۱).
 * RFC 4122 uuidv5 (SHA-1, namespace + name) gives that determinism with no new
 * dependency: same name → same uuid, forever.
 *
 * Namespaced names: `character:chr-miki`, `dialogue:cafe-morning-01`,
 * `dialogue-line:s-cafe-morning-01-l3`, `lesson:cafe-morning-01`, `unit:cafe-morning-01`.
 */
import { createHash, randomUUID } from 'node:crypto';

/** Fixed HANASO content namespace — RFC 4122 DNS namespace — do NOT change once seeded. */
export const HANASO_CONTENT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS ns (RFC 4122 §4.3)

/**
 * RFC 4122 §4.3 (variant 1, version 5): SHA-1(namespace_bytes ‖ name_bytes), then set
 * version/variant bits. Verified against the canonical test vector in unit tests.
 */
export function uuidV5(name: string, namespace: string = HANASO_CONTENT_NAMESPACE): string {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(nsBytes).update(name, 'utf8').digest();

  hash[6] = (hash[6]! & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8]! & 0x3f) | 0x80; // variant 10xx

  const hex = hash.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Stable id for a content character (`chr-miki`). */
export const characterContentId = (characterId: string) => uuidV5(`character:${characterId}`);

/** Stable id for a content level band (`L1`..`L7`). */
export const levelContentId = (code: string) => uuidV5(`level:${code}`);

/** Stable id for a content dialogue (slug, e.g. `cafe-morning-01`). */
export const dialogueContentId = (slug: string) => uuidV5(`dialogue:${slug}`);

/** Stable id for a dialogue line (line id, e.g. `s-cafe-morning-01-l1`). */
export const dialogueLineContentId = (lineId: string) => uuidV5(`dialogue-line:${lineId}`);

/** Stable id for the anchor lesson of a dialogue unit (slug). */
export const lessonContentId = (slug: string) => uuidV5(`lesson:${slug}`);

/** Stable id for the (logical, not-yet-materialised) unit a dialogue anchors. */
export const unitContentId = (slug: string) => uuidV5(`unit:${slug}`);

/** Runtime id generation (attempt rows etc.) — server-side uuidv4 like the slice did. */
export const newRuntimeId = (): string => randomUUID();
