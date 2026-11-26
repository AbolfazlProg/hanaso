/**
 * HANASO — The chapter-opening intro law (LESSON-UX PART1, owner order 2026-11-26).
 *
 * «این کلا قانونه که اول هر فصل یه اسلاید باید برای این باشه که بگه این متنی
 * که دیدی رو طبیعیه بلد نباسی، آخر فصل قراره یاد بگیری.»
 *
 * Every chapter's FIRST lesson opens with a reassurance slide BEFORE the anchor
 * conversation: the learner is explicitly told they are NOT expected to
 * understand the conversation yet — that is completely natural — and that by
 * the END of this very chapter they will have learned it. Slide 1 carries the
 * reassurance; slide 2 is the conversation itself.
 *
 * This module is the ONE home of the law's marker phrases: the anchor scene
 * data EMBEDS them, and the content-contract test asserts their presence for
 * every published chapter's anchor station — future chapters cannot ship
 * without the slide (root-cause enforcement, not per-chapter vigilance).
 */

/**
 * The «it's natural not to know this yet» marker. Every anchor's leading scene
 * body MUST contain this exact phrase (the reassurance half of the law).
 */
export const ANCHOR_INTRO_REASSURANCE_MARKER_FA = 'کاملاً طبیعی است که';

/**
 * The «by the end of THIS chapter you will have learned it» marker. Every
 * anchor's leading scene body MUST contain this exact phrase (the promise
 * half of the law — the chapter itself, not some far-away future).
 */
export const ANCHOR_INTRO_PROMISE_MARKER_FA = 'پایان این فصل';

/** Does one anchor scene body satisfy BOTH halves of the intro law? */
export function anchorIntroLawSatisfied(bodyFa: string | undefined): boolean {
  if (!bodyFa) return false;
  return bodyFa.includes(ANCHOR_INTRO_REASSURANCE_MARKER_FA) && bodyFa.includes(ANCHOR_INTRO_PROMISE_MARKER_FA);
}
