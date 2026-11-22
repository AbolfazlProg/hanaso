/**
 * HANASO — Content surface inventory (ENGINE-REFORM 2026-11-22) — PURE module.
 *
 * The exhaustive collector the prerequisite engine (EQA-8) walks: EVERY
 * Japanese-bearing surface of every station deck — teaching cards, rule
 * slides, worked examples, real-world boards, character scenes, writing
 * canvases, and every exercise field the learner reads (prompt, options
 * INCLUDING distractors, cloze tokens, chunks, chips, feedback and
 * distractor rationales).
 *
 * Roles (mission §۳ — the pedagogical contract of each surface):
 *   teach    — the surface TEACHES its content (folds into the known set as
 *              soon as it is walked, in DECK order).
 *   exposure — the anchor-dialogue first encounter (three-origin rule): the
 *              learner MEETS new items here; nothing may be ASSESSED on the
 *              strength of an exposure. Exempt from prerequisite checks BY
 *              DESIGN (the mission's conversation carve-out) — and recorded
 *              as exposureAt in the registry, never as teaching.
 *   use      — receptive/production material that PRESUPPOSES its content
 *              (examples, boards, scenes): every glyph/mark/word it shows
 *              must be taught at-or-before its deck position.
 *   assess   — an exercise surface: presupposed content must be taught, and
 *              the exercise's own target must be taught earlier in the deck.
 *              The exercise's promptJa is the VESSEL (the thing being
 *              asked about — e.g. a decode word whose meaning is given in
 *              the prompt) — its glyphs are checked, but it is not treated
 *              as assumed surrounding vocabulary.
 */
import type { Chapter, Exercise, Station, TeachingBlock } from '../types';
import type { StationType } from '../types';

export type SurfaceRole = 'teach' | 'exposure' | 'use' | 'assess';

export interface ContentSurface {
  role: SurfaceRole;
  /** The Japanese-bearing text (Persian/Latin-only surfaces are NOT collected). */
  text: string;
  chapterSlug: string;
  stationSlug: string;
  stationOrder: number;
  stationType: StationType;
  blockId: string;
  /** 0-based position of the block inside the station deck (deck-order key). */
  blockIndex: number;
  exerciseId?: string;
  /** The exercise's type (assess surfaces only) — drives the R3 scope. */
  exerciseType?: string;
  field: string;
  /** Assess surfaces: the exercise's declared concepts (target + assesses). */
  declaredConcepts?: string[];
  /** True when the surface comes from a GRADED NON-EXERCISE block (ENGINE-REFORM
   *  §4 — guided-discovery / structured-input / dialogue-player prediction):
   *  the block IS an assessment for the prerequisite engine, so it must declare
   *  its concepts (R5 teach-before-assess) and cannot ship unlabeled (R6). */
  gradedBlockKind?: 'guided-discovery' | 'structured-input' | 'prediction';
  /** True for the exercise's own promptJa (the asked-about vessel). */
  isPromptVessel?: boolean;
  /** True when the surface is SELF-SUPPORTING: the meaning/reading is provided
   *  inline (reading-moment examples, glossed real-world boards) — first encounter
   *  by design, never an assumed knowledge. */
  selfSupporting?: boolean;
  /** True when the surface carries an authored Persian gloss (realworld boards). */
  glossed?: boolean;
}

const JA_RE = /[\u3040-\u30ff\u4e00-\u9fff]/;

/** Japanese runs inside a mostly-Persian string (feedback copy, rationales). */
export function jaRunsOf(text: string): string[] {
  if (!text) return [];
  const runs = text.match(/[\u3040-\u30ff\u4e00-\u9fff][\u3040-\u30ff\u4e00-\u9fff\uff70-\uff9f\u30fc]*/g);
  return (runs ?? []).filter((r) => r.length > 0);
}

function exerciseSurfaces(
  chapter: Chapter,
  station: Station,
  block: TeachingBlock & { kind: 'exercise' },
  blockIndex: number,
  out: ContentSurface[],
): void {
  for (const id of block.exerciseIds) {
    const ex: Exercise | undefined = chapter.exercises[id];
    if (!ex) continue;
    const declared = [ex.targetConcept, ...(ex.assessesConcepts ?? [])];
    const push = (text: string | null | undefined, field: string, opts?: Partial<ContentSurface>) => {
      if (!text || !JA_RE.test(text)) return;
      out.push({
        role: 'assess',
        text,
        chapterSlug: chapter.slug,
        stationSlug: station.slug,
        stationOrder: station.order,
        stationType: station.type,
        blockId: block.id,
        blockIndex,
        exerciseId: id,
        exerciseType: ex.type,
        field,
        declaredConcepts: declared,
        ...opts,
      });
    };
    push(ex.promptJa, 'promptJa', { isPromptVessel: true });
    push(ex.promptJaReading, 'promptJaReading');
    for (const opt of ex.options ?? []) push(opt.label, `opt-${opt.id}`);
    for (const tok of ex.clozeTokens ?? []) push(tok, `cloze`);
    for (const chunk of ex.chunks ?? []) push(chunk.ja, `chunk-${chunk.id}`);
    for (const chip of ex.chips ?? []) push(chip.ja, `chip-${chip.id}`);
    for (const [oid, rationale] of Object.entries(ex.distractorRationaleFa ?? {}))
      for (const run of jaRunsOf(rationale)) push(run, `rationale-${oid}`);
    for (const run of jaRunsOf(ex.feedback.f1Fa)) push(run, 'feedback-f1');
    for (const run of jaRunsOf(ex.feedback.f2HintFa)) push(run, 'feedback-f2');
    for (const run of jaRunsOf(ex.feedback.f3ExplainFa)) push(run, 'feedback-f3');
  }
}

/** Collect every Japanese-bearing surface of a chapter, in DECK ORDER. */
export function collectChapterSurfaces(chapter: Chapter): ContentSurface[] {
  const out: ContentSurface[] = [];
  const ordered = [...chapter.stations].sort((a, b) => a.order - b.order);
  for (const station of ordered) {
    station.blocks.forEach((block, blockIndex) => {
      const base = {
        chapterSlug: chapter.slug,
        stationSlug: station.slug,
        stationOrder: station.order,
        stationType: station.type,
        blockId: block.id,
        blockIndex,
      };
      const push = (
        text: string | null | undefined,
        field: string,
        role: SurfaceRole,
        opts?: Partial<ContentSurface>,
      ) => {
        if (!text || !JA_RE.test(text)) return;
        out.push({ role, text, ...base, field, ...opts });
      };
      switch (block.kind) {
        case 'kana-card':
        case 'vocab-card':
        case 'expression-card':
          break; // handled via the registry builder (ids fold in deck order)
        case 'rule-card': {
          push(block.patternJa, 'patternJa', 'teach');
          if (block.structureTable)
            block.structureTable.rows.forEach((row, ri) =>
              row.forEach((cell, ci) => push(cell, `table-r${ri}-c${ci}`, 'teach')),
            );
          for (const w of block.listenWords ?? []) push(w, 'listenWord', 'use');
          break;
        }
        case 'rule-prereq':
          for (const item of block.items) {
            push(item.glyph, 'prereq-glyph', 'teach', { glossed: true });
            push(item.word, 'prereq-word', 'teach');
            for (const run of jaRunsOf(item.noteFa ?? '')) push(run, `prereq-note-${item.glyph ?? ''}`, 'teach');
          }
          break;
        case 'rule-contrast':
          push(block.a.ja, 'contrast-a', 'teach');
          push(block.b.ja, 'contrast-b', 'teach');
          break;
        case 'rule-step':
          if (block.word) push(block.word.ja, 'step-word', 'teach');
          if (block.miniTable)
            block.miniTable.rows.forEach((row, ri) =>
              row.forEach((cell, ci) => push(cell, `mini-r${ri}-c${ci}`, 'teach')),
            );
          break;
        case 'example-set':
          for (const ex of block.examples) {
            push(ex.ja, `example-${ex.id}`, 'use', {
              selfSupporting: ex.role === 'reading',
            });
            for (const run of jaRunsOf(ex.whyFa ?? '')) push(run, `why-${ex.id}`, 'use');
            for (const run of jaRunsOf(ex.pronFa ?? '')) push(run, `pron-${ex.id}`, 'use');
            for (const run of jaRunsOf(ex.selfExplainFa ?? '')) push(run, `self-${ex.id}`, 'use');
          }
          break;
        case 'realworld-board':
          for (const panel of block.panels) {
            push(panel.leadJa, `board-${panel.titleFa}-lead`, 'use', {
              selfSupporting: block.showGloss,
              glossed: block.showGloss,
            });
            for (const item of panel.items) {
              push(item.ja, 'board-item', 'use', {
                selfSupporting: Boolean(item.glossFa) || block.showGloss,
                glossed: Boolean(item.glossFa) || block.showGloss,
              });
              push(item.sideJa, 'board-side', 'use', { selfSupporting: block.showGloss, glossed: block.showGloss });
            }
          }
          break;
        case 'character-scene':
          for (const step of block.steps) {
            push(step.ja, `scene-step-${step.speaker}`, 'use');
            if (step.userReply)
              for (const chip of step.userReply.chips ?? []) push(chip.ja, `scene-chip-${chip.id}`, 'use');
          }
          break;
        case 'writing-practice':
          push(block.characters.join(''), 'writing-chars', 'use');
          break;
        case 'structured-input':
          for (const opt of block.options)
            push(opt.label, `si-opt-${opt.id}`, 'assess', {
              declaredConcepts: block.assessesConcepts ? [...block.assessesConcepts] : undefined,
              gradedBlockKind: 'structured-input',
            });
          break;
        case 'guided-discovery':
          for (const h of block.highlightSurfaces) push(h, 'gd-highlight', 'teach');
          for (const opt of block.options)
            push(opt.label, `gd-opt-${opt.id}`, 'assess', {
              declaredConcepts: block.assessesConcepts ? [...block.assessesConcepts] : undefined,
              gradedBlockKind: 'guided-discovery',
            });
          break;
        case 'wrap-up':
          /* recap copy — everything it mentions was just experienced with
           * support inside this station's deck (self-supporting recap). */
          for (const run of jaRunsOf(block.titleFa)) push(run, 'wrapup-title', 'use', { selfSupporting: true });
          for (const item of block.itemsFa)
            for (const run of jaRunsOf(item)) push(run, 'wrapup-item', 'use', { selfSupporting: true });
          break;
        case 'scene':
          /* station framing copy: the Persian reading rides along (exposure-grade). */
          for (const run of jaRunsOf(block.titleFa)) push(run, 'scene-title', 'exposure');
          for (const run of jaRunsOf(block.bodyFa)) push(run, 'scene-body', 'exposure');
          break;
        case 'exercise':
          exerciseSurfaces(chapter, station, block, blockIndex, out);
          break;
        case 'dialogue-player': {
          /* The dialogue lines themselves stay EXEMPT (three-origin first
           * encounter — exposure, never teaching). The block's GRADED
           * prediction, however, IS an assessment (ENGINE-REFORM §۴): its
           * Japanese-bearing options join the inventory (R1–R4 + the R3 target
           * exemption via declaredConcepts); the teach-before-assess order and
           * the labelling duty are enforced by the R5b/R6 block walk in
           * prereq-gate.ts (graded blocks are gated even when their options
           * are Persian-only — never invisible to the engine). */
          if (block.prediction) {
            for (const opt of block.prediction.options) {
              push(opt.label, `pred-opt-${opt.id}`, 'assess', {
                declaredConcepts: block.prediction.assessesConcepts
                  ? [...block.prediction.assessesConcepts]
                  : undefined,
                gradedBlockKind: 'prediction',
              });
            }
          }
          break;
        }
        case 'listening-task':
        case 'name-katakana':
        case 'drill-menu':
          /* documented boundaries: listening-task lines are timed by
           * EQA-1 layer 2 (line comprehension); name-katakana answers are
           * computed from the learner's own input; drill-menu labels are Persian. */
          break;
      }
    });
  }
  return out;
}
