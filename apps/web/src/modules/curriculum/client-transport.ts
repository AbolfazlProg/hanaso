/**
 * HANASO — Client station transport (TASK-LEARNING-01 — Check 2-C S0-1/S1-1 fix).
 *
 * The station pages are RSC shells that pass a STRIPPED station to the client
 * island: every answer-carrying field (guided-discovery/structured-input/
 * prediction correctOptionId + explain, userReply acceptance) is REMOVED before
 * crossing the RSC boundary — grading round-trips /api/curriculum/station, the
 * same as bank exercises (SKL-013: the answer key NEVER reaches the client).
 */
import type { Station, TeachingBlock, UserReplySpec } from './types';
import type { ClientExercise } from './grading';
import { toClientExercise } from './grading';

/** A teaching block with all answer material stripped for client transport. */
export type ClientTeachingBlock =
  | { kind: 'scene'; id: string; titleFa: string; bodyFa: string }
  | {
      kind: 'dialogue-player';
      id: string;
      focusLineRefs: string[];
      prediction?: { questionFa: string; options: { id: string; label: string }[] };
      reducedSupport?: boolean;
    }
  | { kind: 'vocab-card'; id: string; wordId: string }
  | { kind: 'expression-card'; id: string; expressionId: string }
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
      structureTable?: { headers: string[]; rows: string[][] };
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
            whyFa: string;
            lineRef?: string;
            selfExplainFa?: string;
          }[];
    }
  | {
      kind: 'structured-input';
      id: string;
      questionFa: string;
      lineRef?: string;
      options: { id: string; label: string }[];
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
        prediction: block.prediction
          ? { questionFa: block.prediction.questionFa, options: block.prediction.options }
          : undefined,
        reducedSupport: block.reducedSupport,
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
    blocks: station.blocks.map(stripBlock),
  };
}

/**
 * TASK-LEARNING-02 (Reviewer-C S1): strip answer material from a FULL Station while
 * keeping the Station shape (pages that need lineRefs/objectiveCode/estMinutes, like
 * the anchor dialogue page). Same no-key rule as toClientStation — for pages whose
 * client islands consume the richer Station type.
 */
export function stripStationAnswerMaterial(station: Station): Station {
  return {
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
      // scene / vocab-card / expression-card / rule-card / example-set / exercise /
      // listening-task / wrap-up carry no answer material — pass through unchanged.
      return block;
    }) as Station['blocks'],
  };
}

/** Server-side lookup of a block answer (grading side — never sent to the client). */
export type BlockAnswerKind =
  | { blockKind: 'guided-discovery' | 'structured-input' | 'prediction'; correctOptionId: string; explainFa: string }
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
