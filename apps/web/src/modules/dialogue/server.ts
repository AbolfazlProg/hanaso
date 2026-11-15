/**
 * HANASO — dialogue module SERVER entry (node-only public API).
 * Two public entries per module (TASK-DLG-POC-01 refinement of ADR-001 L1, recorded in the
 * PoC report): `@/modules/dialogue` = client-safe (types/engine/errors/pure schema);
 * `@/modules/dialogue/server` = node builtins (fs/crypto) for route handlers & RSC pages.
 */
export { hashAudioLine, loadDialogue, resolveContentPath } from './content/loader';
export { CONTENT_EMOTION_TAGS, CONTENT_FRAMES, lineText } from './content/schema';
export { dialogueFileSchema, lineSchema, parseDialogueDocument, tokenSchema } from './content/schema';
export type { DialogueFile } from './content/schema';
