/**
 * HANASO — Client station transport (TASK-LEARNING-01 — Check 2-C S0-1/S1-1 fix).
 *
 * The station pages are RSC shells that pass a STRIPPED station to the client
 * island: every answer-carrying field (guided-discovery/structured-input/
 * prediction correctOptionId + explain, userReply acceptance) is REMOVED before
 * crossing the RSC boundary — grading round-trips /api/curriculum/station, the
 * same as bank exercises (SKL-013: the answer key NEVER reaches the client).
 */
import type { ContrastWord, Station, TeachingBlock, UserReplySpec } from './types';
import type { ClientExercise } from './grading';
import { toClientExercise } from './grading';
import { isKanjiChar } from './knowledge/reading-model';

/** A teaching block with all answer material stripped for client transport. */
export type ClientTeachingBlock =
  | { kind: 'scene'; id: string; titleFa: string; bodyFa: string }
  | {
      kind: 'dialogue-player';
      id: string;
      focusLineRefs: string[];
      /** ENGINE-REFORM §۳/§۴ — carried to the client: the runner branches on it
       * (focused-line teaching view vs the full conversation player). */
      lineTeaching?: boolean;
      prediction?: { questionFa: string; options: { id: string; label: string }[] };
      reducedSupport?: boolean;
    }
  | { kind: 'vocab-card'; id: string; wordId: string }
  | { kind: 'expression-card'; id: string; expressionId: string }
  | {
      /** KANJI-TWO-PHASE §۲ — the dedicated kanji teaching card (no answer
       *  material — the card is purely receptive; its retrieval packet is a
       *  normal exercise block). Passes to the client unchanged. */
      kind: 'kanji-card';
      id: string;
      kanjiId: string;
      anchorWordIds: string[];
      noteFa?: string;
    }
  | {
      /** TASK-LEARNING-06 (DD-122): kana glyph card — purely receptive (no answer material). */
      kind: 'kana-card';
      id: string;
      kanaId: string;
      showRomaji: boolean;
      confusableNoteFa?: string;
    }
  | {
      kind: 'guided-discovery';
      id: string;
      displayLineRef: string;
      highlightSurfaces: string[];
      compareLineRef?: string;
      questionFa: string;
      options: { id: string; label: string }[];
    }
  | {
      kind: 'rule-card';
      id: string;
      patternJa: string;
      titleFa: string;
      bodyFa: string;
      structureTable?: { headers: string[]; rows: string[][]; dir?: 'ltr' | 'rtl' };
      /* TASK-HANASO-20 (BUG-008) — the listening column's per-row audio binding. */
      listenWords?: (string | null)[];
      listenNoteFa?: string;
      persianBridgeFa?: string;
      honestyLabelFa?: string;
    }
  | {
      kind: 'example-set';
      id: string;
      examples: TeachingBlock extends never
        ? never
        : {
            id: string;
            role: 'anchor' | 'near' | 'varied' | 'faded' | 'reading';
            ja: string;
            reading: string;
            fa: string;
            /** UX-AUDIT #141 — optional now: the readability claim is computed. */
            whyFa?: string;
            lineRef?: string;
            selfExplainFa?: string;
            /** TASK-LEARNING-08 Addendum-5 §6 — a short authored pronunciation
             *  guide (only where a real point exists). Passes through with the
             *  block (example-set carries no answer material). */
            pronFa?: string;
          }[];
    }
  | {
      kind: 'structured-input';
      id: string;
      questionFa: string;
      lineRef?: string;
      options: { id: string; label: string }[];
    }
  | {
      /** TASK-LEARNING-14: prerequisites slide — receptive, no answer material. */
      kind: 'rule-prereq';
      id: string;
      titleFa: string;
      items: {
        glyph?: string;
        word?: string;
        readingFa: string;
        noteFa?: string;
        firstLook?: boolean;
      }[];
    }
  | {
      /** TASK-LEARNING-14: contrast slide — `ask` answer material stripped (SKL-013). */
      kind: 'rule-contrast';
      id: string;
      titleFa?: string;
      a: ContrastWord;
      b: ContrastWord;
      ask?: { questionFa: string; options: { id: string; label: string }[] };
    }
  | {
      /** TASK-LEARNING-14: one-concept slide — `ask` answer material stripped (SKL-013). */
      kind: 'rule-step';
      id: string;
      role: 'notice' | 'explain';
      titleFa?: string;
      bodyFa: string;
      word?: { ja: string; readingFa: string; fa: string; highlight: string[]; beats?: number };
      miniTable?: { headers: string[]; rows: string[][]; dir?: 'ltr' | 'rtl' };
      ask?: { questionFa: string; options: { id: string; label: string }[] };
    }
  | { kind: 'exercise'; id: string; exerciseIds: string[] }
  | {
      /** TASK-LEARNING-07 (DD-111): handwriting practice — no answer material to strip. */
      kind: 'writing-practice';
      id: string;
      characters: string[];
      initialMode: 'guided' | 'trace' | 'free';
      focusPairs?: [string, string][];
      instructionsFa?: string;
    }
  | {
      kind: 'character-scene';
      id: string;
      steps: {
        speaker: string;
        ja: string;
        reading: string;
        fa: string;
        userReply?: Omit<UserReplySpec, 'correctOptionId' | 'acceptedOrders'>;
      }[];
    }
  | { kind: 'listening-task'; id: string; taskId: string }
  | {
      /** Part-2 د/ط: the real-world board — pure display, no answer material.
       * LESSON-UX P2 #200: items carry their Persian reading (revealed on
       * tap) — still pure display, no answer material to strip. */
      kind: 'realworld-board';
      id: string;
      titleFa: string;
      captionFa?: string;
      showGloss: boolean;
      panels: {
        titleFa: string;
        leadJa?: string;
        items: { ja: string; readingFa?: string; glossFa?: string; sideJa?: string }[];
      }[];
    }
  | {
      /** LESSON-UX P2 #200: the closing word wall — pure display (shape +
       * reading + meaning; the audio binds client-side per word). */
      kind: 'word-wall';
      id: string;
      titleFa: string;
      bodyFa: string;
      hintFa?: string;
      words: { ja: string; readingFa: string; meaningFa: string }[];
    }
  | {
      /** Part-2 ز: the drill mode picker — pointer ids only, no answer material. */
      kind: 'drill-menu';
      id: string;
      titleFa: string;
      bodyFa: string;
      options: { id: string; labelFa: string; bodyFa: string; targetBlockId: string }[];
      finishLabelFa: string;
      finishTargetBlockId: string;
    }
  | {
      /** Part-2 و: the name builder — the answer is computed client-side from
       *  the learner's own input (kana-name.ts); no key ever exists to strip. */
      kind: 'name-katakana';
      id: string;
      titleFa: string;
      bodyFa: string;
      extrasCount: number;
    }
  | { kind: 'wrap-up'; id: string; titleFa: string; itemsFa: string[]; fsrsNoteFa?: string };

export interface ClientStation {
  slug: string;
  type: Station['type'];
  titleFa: string;
  objectiveFa: string;
  core: boolean;
  blocks: ClientTeachingBlock[];
  completion: Station['completion'];
}

/** Strip one block's answer material (pure). */
function stripBlock(block: TeachingBlock): ClientTeachingBlock {
  switch (block.kind) {
    case 'writing-practice':
      // practice-layer block — carries no answer material (never a gate, DD-106)
      return {
        kind: 'writing-practice',
        id: block.id,
        characters: block.characters,
        initialMode: block.initialMode,
        ...(block.focusPairs ? { focusPairs: block.focusPairs } : {}),
        ...(block.instructionsFa ? { instructionsFa: block.instructionsFa } : {}),
      };
    case 'guided-discovery':
      return {
        kind: 'guided-discovery',
        id: block.id,
        displayLineRef: block.displayLineRef,
        highlightSurfaces: block.highlightSurfaces,
        compareLineRef: block.compareLineRef,
        questionFa: block.questionFa,
        options: block.options,
      };
    case 'structured-input':
      return {
        kind: 'structured-input',
        id: block.id,
        questionFa: block.questionFa,
        lineRef: block.lineRef,
        options: block.options,
      };
    case 'dialogue-player':
      return {
        kind: 'dialogue-player',
        id: block.id,
        focusLineRefs: block.focusLineRefs,
        lineTeaching: block.lineTeaching,
        prediction: block.prediction
          ? { questionFa: block.prediction.questionFa, options: block.prediction.options }
          : undefined,
        reducedSupport: block.reducedSupport,
      };
    /* TASK-LEARNING-14: rule slides — strip ask.correctOptionId + ask.revealFa
       (the SAME no-key rule as dialogue-player.prediction; reveal comes from
       the server via grade-block in both outcomes). */
    case 'rule-contrast':
      return {
        kind: 'rule-contrast',
        id: block.id,
        ...(block.titleFa ? { titleFa: block.titleFa } : {}),
        a: block.a,
        b: block.b,
        ask: block.ask ? { questionFa: block.ask.questionFa, options: block.ask.options } : undefined,
      };
    case 'rule-step':
      return {
        kind: 'rule-step',
        id: block.id,
        role: block.role,
        ...(block.titleFa ? { titleFa: block.titleFa } : {}),
        bodyFa: block.bodyFa,
        ...(block.word ? { word: block.word } : {}),
        ...(block.miniTable ? { miniTable: block.miniTable } : {}),
        ask: block.ask ? { questionFa: block.ask.questionFa, options: block.ask.options } : undefined,
      };
    /* Part-2 د/ط: the realworld-board is PURE DISPLAY — every field is
       learner-facing content (item surfaces + authored glosses); there is no
       answer key to strip. The explicit case documents that decision.
       LESSON-UX P2 #200: readingFa joins the same pure-display contract
       (revealed on tap — the decode-then-verify loop, not an answer key). */
    case 'realworld-board':
      return {
        kind: 'realworld-board',
        id: block.id,
        titleFa: block.titleFa,
        captionFa: block.captionFa,
        showGloss: block.showGloss,
        panels: block.panels,
      };
    /* LESSON-UX P2 #200: the word wall is PURE DISPLAY too — shape + reading
       + meaning + its own audio binding; nothing to strip. */
    case 'word-wall':
      return {
        kind: 'word-wall',
        id: block.id,
        titleFa: block.titleFa,
        bodyFa: block.bodyFa,
        hintFa: block.hintFa,
        words: block.words,
      };
    case 'drill-menu':
      return {
        kind: 'drill-menu',
        id: block.id,
        titleFa: block.titleFa,
        bodyFa: block.bodyFa,
        options: block.options,
        finishLabelFa: block.finishLabelFa,
        finishTargetBlockId: block.finishTargetBlockId,
      };
    case 'name-katakana':
      return {
        kind: 'name-katakana',
        id: block.id,
        titleFa: block.titleFa,
        bodyFa: block.bodyFa,
        extrasCount: block.extrasCount,
      };
    case 'character-scene':
      return {
        kind: 'character-scene',
        id: block.id,
        steps: block.steps.map((s) => ({
          speaker: s.speaker,
          ja: s.ja,
          reading: s.reading,
          fa: s.fa,
          userReply: s.userReply
            ? {
                kind: s.userReply.kind,
                promptFa: s.userReply.promptFa,
                chips: s.userReply.chips,
                nameSlotChipId: s.userReply.nameSlotChipId,
                options: s.userReply.options,
              }
            : undefined,
        })),
      };
    default:
      return block;
  }
}

/** Strip a whole station for client transport. */
export function toClientStation(station: Station): ClientStation {
  return {
    slug: station.slug,
    type: station.type,
    titleFa: station.titleFa,
    objectiveFa: station.objectiveFa,
    core: station.core,
    completion: station.completion,
    blocks: expandKanjiWritingBlocks(station.blocks.map(stripBlock)),
  };
}

/* KANJI-WRITE-FIX 2026-11-23 §۱ (owner order «هر کانجی اسلاید مخصوص خودش را
 * دارد، از موتور»): a kanji writing deck travels to the walk as ONE SLIDE PER
 * KANJI. The authored `writing-practice` block may legally list several
 * kanji (the authoring agent's natural form); the ENGINE expands it during
 * client transport — every kanji receives its own dedicated slide with its own
 * staged writing timeline (auto intro pass → the ONE confirm → guided trace →
 * free from memory → auto-advance). This is the single chokepoint every
 * station surface passes through, so a future agent-authored kanji station
 * can never regress into "several kanji sharing one slide".
 *
 * Deterministic ids `${block.id}@${literal}` keep walk-position anchors,
 * block-stage snapshots and blockResults stable across renders. Kana decks
 * (and mixed decks) pass through untouched — the kana drill host keeps its
 * row-of-kana picker (owner: the kana side is the reference, unchanged). */
function expandKanjiWritingBlocks(blocks: ClientTeachingBlock[]): ClientTeachingBlock[] {
  const out: ClientTeachingBlock[] = [];
  for (const block of blocks) {
    if (block.kind !== 'writing-practice' || block.characters.length <= 1) {
      out.push(block);
      continue;
    }
    const isKanjiDeck = block.characters.every((ch) => ch.split('').every(isKanjiChar));
    if (!isKanjiDeck) {
      out.push(block);
      continue;
    }
    for (const literal of block.characters) {
      out.push({
        kind: 'writing-practice',
        id: `${block.id}@${literal}`,
        characters: [literal],
        initialMode: block.initialMode,
        ...(block.focusPairs ? { focusPairs: block.focusPairs } : {}),
        ...(block.instructionsFa ? { instructionsFa: block.instructionsFa } : {}),
      });
    }
  }
  return out;
}

/**
 * KANJI-WRITE-FIX §۱ — the authored Station shape carries the UN-split deck
 * (pages that consume the richer Station type); the same per-kanji-slide law
 * applies: kanji writing decks expand, everything else keeps its block list.
 */
export function splitKanjiWritingBlocks(station: Station): Station {
  const blocks: TeachingBlock[] = [];
  for (const block of station.blocks) {
    if (block.kind !== 'writing-practice' || block.characters.length <= 1) {
      blocks.push(block);
      continue;
    }
    const isKanjiDeck = block.characters.every((ch) => ch.split('').every(isKanjiChar));
    if (!isKanjiDeck) {
      blocks.push(block);
      continue;
    }
    for (const literal of block.characters) {
      blocks.push({
        ...block,
        id: `${block.id}@${literal}`,
        characters: [literal],
      } as TeachingBlock);
    }
  }
  return station.blocks.length === blocks.length && station.blocks.every((b, i) => b === blocks[i])
    ? station
    : { ...station, blocks };
}

/**
 * TASK-LEARNING-02 (Reviewer-C S1): strip answer material from a FULL Station while
 * keeping the Station shape (pages that need lineRefs/objectiveCode/estMinutes, like
 * the anchor dialogue page). Same no-key rule as toClientStation — for pages whose
 * client islands consume the richer Station type.
 */
export function stripStationAnswerMaterial(station: Station): Station {
  const strippedStation: Station = {
    ...station,
    blocks: station.blocks.map((block) => {
      const stripped = stripBlock(block) as unknown as TeachingBlock;
      // stripBlock already removed all answer fields; re-attach the non-answer
      // extras the full Station type carries for these block kinds.
      if (block.kind === 'dialogue-player') {
        return {
          ...stripped,
          kind: 'dialogue-player',
          id: block.id,
          focusLineRefs: block.focusLineRefs,
          lineTeaching: block.lineTeaching,
          prediction: block.prediction
            ? { questionFa: block.prediction.questionFa, options: block.prediction.options }
            : undefined,
          reducedSupport: block.reducedSupport,
        } as TeachingBlock;
      }
      if (block.kind === 'guided-discovery') {
        return {
          ...stripped,
          kind: 'guided-discovery',
          id: block.id,
          displayLineRef: block.displayLineRef,
          highlightSurfaces: block.highlightSurfaces,
          compareLineRef: block.compareLineRef,
          questionFa: block.questionFa,
          options: block.options,
        } as TeachingBlock;
      }
      if (block.kind === 'structured-input') {
        return {
          ...stripped,
          kind: 'structured-input',
          id: block.id,
          questionFa: block.questionFa,
          lineRef: block.lineRef,
          options: block.options,
        } as TeachingBlock;
      }
      if (block.kind === 'character-scene') {
        return {
          ...stripped,
          kind: 'character-scene',
          id: block.id,
          steps: block.steps.map((s) => ({
            speaker: s.speaker,
            ja: s.ja,
            reading: s.reading,
            fa: s.fa,
            userReply: s.userReply
              ? {
                  kind: s.userReply.kind,
                  promptFa: s.userReply.promptFa,
                  chips: s.userReply.chips,
                  options: s.userReply.options,
                  nameSlotChipId: s.userReply.nameSlotChipId,
                }
              : undefined,
          })),
        } as TeachingBlock;
      }
      if (block.kind === 'rule-contrast') {
        return {
          kind: 'rule-contrast',
          id: block.id,
          ...(block.titleFa ? { titleFa: block.titleFa } : {}),
          a: block.a,
          b: block.b,
          ask: block.ask ? { questionFa: block.ask.questionFa, options: block.ask.options } : undefined,
        } as unknown as TeachingBlock;
      }
      if (block.kind === 'rule-step') {
        return {
          kind: 'rule-step',
          id: block.id,
          role: block.role,
          ...(block.titleFa ? { titleFa: block.titleFa } : {}),
          bodyFa: block.bodyFa,
          ...(block.word ? { word: block.word } : {}),
          ...(block.miniTable ? { miniTable: block.miniTable } : {}),
          ask: block.ask ? { questionFa: block.ask.questionFa, options: block.ask.options } : undefined,
        } as unknown as TeachingBlock;
      }
      // scene / vocab-card / expression-card / kanji-card / rule-card / example-set /
      // exercise / listening-task / wrap-up / rule-prereq carry no answer material — pass through unchanged.
      return block;
    }) as Station['blocks'],
  };
  /* KANJI-WRITE-FIX §۱ — the same per-kanji-slide law as toClientStation: a
   * kanji writing deck never crosses into a client island as one shared slide. */
  return splitKanjiWritingBlocks(strippedStation);
}

/** Server-side lookup of a block answer (grading side — never sent to the client). */
export type BlockAnswerKind =
  | { blockKind: 'guided-discovery' | 'structured-input' | 'prediction'; correctOptionId: string; explainFa: string }
  | { blockKind: 'rule-slide-ask'; correctOptionId: string; explainFa: string }
  | { blockKind: 'userReply'; correctOptionId?: string; acceptedOrders?: string[][]; nameSlotChipId?: string }
  | null;

export function findBlockAnswer(station: Station, blockId: string, stepIndex?: number): BlockAnswerKind {
  for (const block of station.blocks) {
    if (block.id !== blockId) continue;
    if (block.kind === 'guided-discovery' || block.kind === 'structured-input') {
      return { blockKind: block.kind, correctOptionId: block.correctOptionId, explainFa: block.explainFa };
    }
    if (block.kind === 'dialogue-player' && block.prediction) {
      return {
        blockKind: 'prediction',
        correctOptionId: block.prediction.correctOptionId,
        explainFa: block.prediction.revealFa,
      };
    }
    /* TASK-LEARNING-14: rule-slide micro-questions — prediction semantics (the
       reveal is educational in BOTH outcomes; unscored warm-up). */
    if ((block.kind === 'rule-contrast' || block.kind === 'rule-step') && block.ask) {
      return {
        blockKind: 'rule-slide-ask',
        correctOptionId: block.ask.correctOptionId,
        explainFa: block.ask.revealFa,
      };
    }
    if (block.kind === 'character-scene' && stepIndex !== undefined) {
      const reply = block.steps[stepIndex]?.userReply;
      if (!reply) return null;
      return {
        blockKind: 'userReply',
        correctOptionId: reply.correctOptionId,
        acceptedOrders: reply.acceptedOrders,
        nameSlotChipId: reply.nameSlotChipId,
      };
    }
    return null;
  }
  return null;
}

export { toClientExercise };
export type { ClientExercise };
