/**
 * HANASO — Dialogue focus-line resolver tests (ENGINE-REFORM 2026-11-22 §۳ —
 * owner order «نمایش بخش منتخب مکالمه»).
 *
 * The engine-level regression proof for the WHOLE-dialogue-instead-of-the-line
 * bug: a `lineTeaching` dialogue-player block whose focusLineRefs are a strict
 * subset must resolve to a view containing ONLY those lines (each with its
 * speaker's identity, reading, translation and teaches) — the other lines of
 * the conversation must NOT be part of the view, so the focused component can
 * never render them. Full-coverage / non-teaching blocks keep the whole-
 * dialogue player mode.
 */
import { describe, expect, it } from 'vitest';
import { resolveDialogueFocus } from '@/modules/curriculum/dialogue-focus';
import type { CharacterRef, Dialogue } from '@/modules/dialogue';

/* A compact synthetic bundle — the standard Dialogue/CharacterRef shapes any
 * chapter's anchor dialogue resolves through (never lesson-specific data). */
const L = (n: number) => `s-first-meeting-01-l${n}`;

const characters: CharacterRef[] = [
  { id: 'chr-miki', nameJa: 'ミキ', nameFa: 'میکی', colorToken: 'speaker-1', voiceId: 'v1' },
  { id: 'chr-yamada', nameJa: 'ヤマダ', nameFa: 'یامادا', colorToken: 'speaker-2', voiceId: 'v2' },
  { id: 'chr-sora', nameJa: 'ソラ', nameFa: 'سورا', colorToken: 'speaker-3', voiceId: 'v3' },
];

const dialogue: Dialogue = {
  id: 'dlg-test',
  scene: 'کافه',
  characterIds: characters.map((c) => c.id),
  turnGapDefaultMs: 500,
  lines: [
    {
      id: L(1),
      speaker: 'chr-miki',
      tokens: [
        { surface: 'こんにちは', reading: 'こんにちは' },
        { surface: '、', reading: '、', pos: 'punctuation' },
        { surface: 'やまださん', reading: 'やまださん' },
      ],
      fa: 'سلام آقای یامادا.',
      teaches: ['chrk-konnichiwa'],
    },
    {
      id: L(2),
      speaker: 'chr-yamada',
      tokens: [
        { surface: 'はじめまして', reading: 'はじめまして' },
        { surface: 'やまだ', reading: 'やまだ' },
        { surface: 'です', reading: 'です' },
      ],
      fa: 'از آشنایی‌تان خوشبختم؛ یامادا هستم.',
      teaches: ['gr-desu-identity'],
    },
    {
      id: L(3),
      speaker: 'chr-sora',
      coSpeaker: 'chr-yamada',
      tokens: [
        { surface: 'よろしく', reading: 'よろしく' },
        { surface: 'おねがいします', reading: 'おねがいします' },
      ],
      fa: 'یوروشیکو اونِگای‌شیماس. (دو نفر با هم)',
      teaches: ['chrk-yoroshiku'],
    },
  ],
};

const bundle = { dialogueSlug: 'first-meeting-01', dialogue, characters };

describe('resolveDialogueFocus — the focused-line teaching view (ENGINE-REFORM §۳)', () => {
  it('a lineTeaching SUBSET resolves to focus mode with ONLY the focus lines — never the whole conversation', () => {
    const view = resolveDialogueFocus(bundle, [L(2)], true);
    expect(view.mode).toBe('focus');
    expect(view.lines.map((l) => l.id)).toEqual([L(2)]);
    // the other lines are NOT part of the view (the component cannot show them)
    expect(view.lines.some((l) => l.id === L(1) || l.id === L(3))).toBe(false);
  });

  it('the extracted line keeps the speaker identity, readings, translation and teaches', () => {
    const view = resolveDialogueFocus(bundle, [L(2)], true);
    const line = view.lines[0]!;
    expect(line.speaker.id).toBe('chr-yamada');
    expect(line.speaker.nameFa).toBe('یامادا');
    expect(line.speaker.nameJa).toBe('ヤマダ');
    expect(line.speaker.colorToken).toBe('speaker-2');
    expect(line.tokens.map((t) => t.surface)).toEqual(['はじめまして', 'やまだ', 'です']);
    expect(line.reading).toBe('はじめまして やまだ です');
    expect(line.fa).toBe('از آشنایی‌تان خوشبختم؛ یامادا هستم.');
    expect(line.teaches).toEqual(['gr-desu-identity']);
  });

  it('a joint-turn line carries BOTH speakers (speaker + coSpeaker preserved)', () => {
    const view = resolveDialogueFocus(bundle, [L(3)], true);
    const line = view.lines[0]!;
    expect(line.speaker.id).toBe('chr-sora');
    expect(line.coSpeaker?.id).toBe('chr-yamada');
    expect(line.coSpeaker?.nameFa).toBe('یامادا');
  });

  it('focus lines resolve in DIALOGUE order regardless of the refs order, duplicates collapse', () => {
    const view = resolveDialogueFocus(bundle, [L(3), L(1), L(3)], true);
    expect(view.mode).toBe('focus');
    expect(view.lines.map((l) => l.id)).toEqual([L(1), L(3)]);
  });

  it('full focus coverage stays the conversation EXPERIENCE (whole player)', () => {
    const view = resolveDialogueFocus(bundle, [L(1), L(2), L(3)], true);
    expect(view.mode).toBe('full');
    expect(view.lines).toEqual([]);
  });

  it('without lineTeaching a subset stays the replay mode (focus refs = start position only)', () => {
    const view = resolveDialogueFocus(bundle, [L(2)], false);
    expect(view.mode).toBe('full');
    const absent = resolveDialogueFocus(bundle, [L(2)], undefined);
    expect(absent.mode).toBe('full');
  });

  it('unresolvable refs are dropped — the view can never fabricate a line', () => {
    const view = resolveDialogueFocus(bundle, [L(2), 's-first-meeting-01-l99'], true);
    expect(view.mode).toBe('focus');
    expect(view.lines.map((l) => l.id)).toEqual([L(2)]);
  });

  it('an empty focus list degrades to the full player (never a broken empty view)', () => {
    const view = resolveDialogueFocus(bundle, [], true);
    expect(view.mode).toBe('full');
  });

  /* B1-REBUILD 2026-11-26 §۱ (batch-1 QC — honest line numbering): the card's
   * «خط N» must be the line's REAL position in the dialogue, matching every
   * «خط N» cross-reference in the teaching copy (was «نوبت {within-block
   * index}» — line 3 displayed as «نوبت 1»). */
  it('lineNo is the REAL 1-based dialogue position — never a within-block index', () => {
    const view = resolveDialogueFocus(bundle, [L(2), L(3)], true);
    expect(view.lines.map((l) => l.lineNo)).toEqual([2, 3]);
    const sparse = resolveDialogueFocus(bundle, [L(3)], true);
    expect(sparse.lines[0]!.lineNo).toBe(3);
  });
});

describe('resolveDialogueFocus — determinism (the engine contract)', () => {
  it('same bundle + refs ⇒ byte-identical view', () => {
    const a = resolveDialogueFocus(bundle, [L(2), L(3)], true);
    const b = resolveDialogueFocus(
      { dialogueSlug: bundle.dialogueSlug, dialogue, characters: [...characters] },
      [L(2), L(3)],
      true,
    );
    expect(a).toEqual(b);
  });
});
