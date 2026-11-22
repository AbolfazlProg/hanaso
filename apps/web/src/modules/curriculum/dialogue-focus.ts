/**
 * HANASO — Dialogue focus-line resolver (ENGINE-REFORM 2026-11-22 §۳/§۴).
 *
 * «وقتی یک خط مشخص از مکالمه برای آموزش انتخاب می‌شود، فقط همان خط نمایش
 * داده شود — نه کل مکالمه با Bold‌کردن خط موردنظر.»
 *
 * THE shared, chapter-independent resolver for a dialogue-player block's
 * `focusLineRefs` + `lineTeaching`:
 *
 *  - 'full'  — the block is the conversation EXPERIENCE (anchor/reconnect
 *              replay): the whole-dialogue player renders (the existing
 *              InlineDialoguePlayer path — focus lines only pick the start
 *              position). Selected when `lineTeaching` is false/absent, or the
 *              focus refs cover every line of the dialogue.
 *  - 'focus' — the block TEACHES with the SPECIFIC focus lines: the resolver
 *              extracts ONLY those lines, each fully self-contained (speaker
 *              name + color + image id, tokens with readings, the line's
 *              romaji, the Persian translation, teaching ids). The other
 *              dialogue lines are NOT part of the view — the component can
 *              never render them because it never receives them.
 *
 * PURE + DETERMINISTIC — same bundle + refs ⇒ byte-identical view. Works for
 * every chapter's anchor dialogue (the resolver only needs the standard
 * Dialogue/CharacterRef shapes) — never a per-lesson hardcode.
 */
import type { CharacterRef, Dialogue } from '@/modules/dialogue';

/** One extracted teaching line — everything the focused-line card renders. */
export interface DialogueFocusLineView {
  id: string;
  /** The speaking character (resolved name + color for the speaker chip). */
  speaker: { id: string; nameJa: string; nameFa: string; colorToken: string };
  /** Joint-turn co-speaker (TASK-LEARNING-07 — shown alongside the speaker). */
  coSpeaker?: { id: string; nameJa: string; nameFa: string; colorToken: string };
  /** The line's tokens (surface + reading each). */
  tokens: { surface: string; reading: string }[];
  /** Romaji of the CONTENT tokens (punctuation excluded), space-joined. */
  reading: string;
  /** Persian translation of the line. */
  fa: string;
  /** Learning items this line teaches (dialogue YAML `teaches`). */
  teaches: string[];
}

export interface DialogueFocusView {
  dialogueSlug: string;
  /** 'full' = whole-conversation experience; 'focus' = only the focus lines. */
  mode: 'full' | 'focus';
  /** Present in 'focus' mode — the extracted lines in DIALOGUE order. */
  lines: DialogueFocusLineView[];
}

/** The minimal bundle shape the resolver needs (the station page's transport). */
export interface DialogueFocusBundle {
  dialogueSlug: string;
  dialogue: Dialogue;
  characters: CharacterRef[];
}

function characterView(
  characters: CharacterRef[],
  id: string,
): { id: string; nameJa: string; nameFa: string; colorToken: string } | undefined {
  const c = characters.find((ch) => ch.id === id);
  return c ? { id: c.id, nameJa: c.nameJa, nameFa: c.nameFa, colorToken: c.colorToken } : undefined;
}

/** Romaji of the content tokens — punctuation (、。？) is never part of it. */
function lineReading(tokens: { surface: string; reading: string; pos?: string }[]): string {
  return tokens
    .filter((t) => t.pos !== 'punctuation' && !/^[、。？！\s]$/.test(t.surface))
    .map((t) => t.reading)
    .join(' ');
}

/**
 * Resolve a dialogue-player block's focus view.
 *
 * @param bundle            the chapter's anchor dialogue bundle (server transport)
 * @param focusLineRefs     the block's authored focus line ids
 * @param lineTeaching      the block's `lineTeaching` flag (true = the SPECIFIC
 *                          lines are the teaching material)
 */
export function resolveDialogueFocus(
  bundle: DialogueFocusBundle,
  focusLineRefs: string[],
  lineTeaching?: boolean,
): DialogueFocusView {
  const dialogueLines = bundle.dialogue.lines;
  const allIds = dialogueLines.map((l) => l.id);

  /* Unique focus refs that actually resolve (unknown ids are validation's
   * business — server validation rejects invalid refs at load time; here an
   * unresolvable ref is dropped so the view can never fabricate a line). */
  const seen = new Set<string>();
  const focusIds: string[] = [];
  for (const ref of focusLineRefs) {
    if (seen.has(ref)) continue;
    seen.add(ref);
    if (allIds.includes(ref)) focusIds.push(ref);
  }

  const coversWholeDialogue = focusIds.length === allIds.length && allIds.every((id) => seen.has(id));

  /* The teaching view applies ONLY when the authored intent is explicit
   * (lineTeaching) AND the focus lines are a strict subset — a full-coverage
   * focus set is the conversation experience itself. */
  if (!lineTeaching || !focusIds.length || coversWholeDialogue) {
    return { dialogueSlug: bundle.dialogueSlug, mode: 'full', lines: [] };
  }

  /* Extract ONLY the focus lines, in dialogue order — with the speaker's
   * resolved identity (name + color), readings, translation and teaches. */
  const byFocus = new Set(focusIds);
  const lines: DialogueFocusLineView[] = dialogueLines
    .filter((l) => byFocus.has(l.id))
    .map((l) => {
      const speaker = characterView(bundle.characters, l.speaker);
      const coSpeaker = l.coSpeaker ? characterView(bundle.characters, l.coSpeaker) : undefined;
      if (!speaker) {
        /* Unresolvable speaker id would render an anonymous card — validation
         * rejects these at load; the resolver degrades honestly to the raw id. */
        return {
          id: l.id,
          speaker: { id: l.speaker, nameJa: l.speaker, nameFa: l.speaker, colorToken: 'speaker-1' },
          ...(coSpeaker ? { coSpeaker } : {}),
          tokens: l.tokens.map((t) => ({ surface: t.surface, reading: t.reading })),
          reading: lineReading(l.tokens),
          fa: l.fa,
          teaches: [...(l.teaches ?? [])],
        };
      }
      return {
        id: l.id,
        speaker,
        ...(coSpeaker ? { coSpeaker } : {}),
        tokens: l.tokens.map((t) => ({ surface: t.surface, reading: t.reading })),
        reading: lineReading(l.tokens),
        fa: l.fa,
        teaches: [...(l.teaches ?? [])],
      };
    });

  return { dialogueSlug: bundle.dialogueSlug, mode: 'focus', lines };
}
