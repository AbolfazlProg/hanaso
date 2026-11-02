/**
 * HANASO — content id ↔ engine id mapping (TASK-M0-10 DB-layer / Issue #11).
 *
 * The engine-facing ids are slug-shaped strings (`dlg-cafe-morning-01`) while the DB
 * stores uuid rows in `content.dialogues` / `content.lessons`. This module resolves
 * between the two, loading the (small) mapping table once per process and refreshing
 * lazily when a lookup misses (e.g. right after a seed ran on a live process).
 */
import { eq, and } from 'drizzle-orm';
import { dialogueContentId } from './ids';
import { getDbClient } from './client';
import { dialogues, lessons } from '../../db/schema';

/** Raised when a dialogue the YAML loader accepts is missing from the seeded DB. */
export class ContentNotSeededError extends Error {
  readonly slug: string;

  constructor(slug: string) {
    super(
      `dialogue "${slug}" exists as content YAML but is not seeded in the database — ` +
        'run the seed step (db-cli seed) before serving this dialogue',
    );
    this.name = 'ContentNotSeededError';
    this.slug = slug;
  }
}

export interface DialogueRef {
  /** Engine id (`dlg-cafe-morning-01`). */
  engineId: string;
  /** Content slug (`cafe-morning-01`). */
  slug: string;
  /** `content.dialogues.id` uuid. */
  dialogueUuid: string;
  /** The anchor `content.lessons.id` uuid (A→D unit record needs it — KB §۳). */
  lessonUuid: string;
}

const bySlug = new Map<string, DialogueRef>();
const byDialogueUuid = new Map<string, DialogueRef>();
let loaded = false;

/** `dlg-cafe-morning-01` → `cafe-morning-01` (unknown shapes pass through unchanged). */
export function engineIdToSlug(engineId: string): string {
  return engineId.replace(/^dlg-/, '');
}

/** `cafe-morning-01` → `dlg-cafe-morning-01`. */
export function slugToEngineId(slug: string): string {
  return slug.startsWith('dlg-') ? slug : `dlg-${slug}`;
}

/** (Re)load every dialogue + its anchor lesson. Cheap: the content set is tiny. */
export async function refreshContentMap(): Promise<void> {
  const { db } = getDbClient();
  // anchor lesson ONLY (unitStage='B_lesson'): when the full content schema attaches
  // multiple lessons to one dialogue, a bare join would let a non-anchor row win
  // (PR #74 review r1/S3) — lessonUuid must always be the A→D unit anchor.
  const rows = await db
    .select({
      dialogueUuid: dialogues.id,
      slug: dialogues.slug,
      lessonUuid: lessons.id,
    })
    .from(dialogues)
    .innerJoin(lessons, and(eq(lessons.dialogueId, dialogues.id), eq(lessons.unitStage, 'B_lesson')));

  bySlug.clear();
  byDialogueUuid.clear();
  for (const row of rows) {
    const ref: DialogueRef = {
      engineId: slugToEngineId(row.slug),
      slug: row.slug,
      dialogueUuid: row.dialogueUuid,
      lessonUuid: row.lessonUuid,
    };
    bySlug.set(ref.slug, ref);
    byDialogueUuid.set(ref.dialogueUuid, ref);
  }
  loaded = true;
}

async function ensureLoaded(): Promise<void> {
  if (!loaded || bySlug.size === 0) await refreshContentMap();
}

/** Resolve by engine id (`dlg-…`) or slug — throws ContentNotSeededError when missing. */
export async function resolveDialogue(idOrSlug: string): Promise<DialogueRef> {
  await ensureLoaded();
  const slug = engineIdToSlug(idOrSlug);
  const hit = bySlug.get(slug);
  if (!hit) {
    // one retry after a refresh (seed may have run after this process started)
    await refreshContentMap();
    const retry = bySlug.get(slug);
    if (!retry) throw new ContentNotSeededError(slug);
    return retry;
  }
  return hit;
}

/** Reverse lookup: `content.dialogues.id` → DialogueRef (null when unknown). */
export async function resolveDialogueByUuid(uuid: string): Promise<DialogueRef | null> {
  await ensureLoaded();
  return byDialogueUuid.get(uuid) ?? null;
}

/** Deterministic uuid a dialogue WOULD have (used by tests + seed assertions). */
export const expectedDialogueUuid = (slug: string) => dialogueContentId(slug);
