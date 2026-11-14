/**
 * HANASO — EQA waivers for bundled chapters (TASK-LEARNING-04, Issue #97).
 *
 * A waiver is an EXPLICIT, issue-linked, dated registration of a KNOWN pedagogical
 * violation in shipped content that is scheduled to be fixed in a later content
 * mission. It keeps CI green while making it impossible to add NEW violations
 * silently: every waived finding is printed in every EQA report, and a waiver
 * whose finding no longer exists is itself an error (no waiver rot).
 *
 * Rules:
 *  - A waiver must reference a GitHub issue (evidence + tracking).
 *  - A waiver must name the mission that will remove it (resolvedBy).
 *  - Removing the finding without removing the waiver fails CI (stale waiver).
 *  - Adding a NEW violation without a waiver fails CI.
 *
 * TASK-LEARNING-06 (2026-11-05): ALL SEVEN TASK-LEARNING-04 waivers are CLOSED by
 * the 05A/05B content rebuild — zero waivers remain:
 *   - #96 EQA-1 ×2 (ex-fm01-v1-01/02 line-grammar) → the vocab packet items are
 *     now WORD-level Q2 drills (targetConcept = word id) and the line layer is
 *     exempt for them by design (gates.ts word-drill rule).
 *   - #95 EQA-2 ×2 (stn-02/stn-06 S-3 alternation) → the rebuilt stations use
 *     3-card packets with in-flow retrieval + alternating expression cards.
 *   - #106 EQA-3 (recall-first share) → the rebuilt practice pool is ≥60%
 *     recall-first (kana-decode C1/C3 recycling + produce/cloze/word-order mix).
 *   - #104 EQA-6 ×2 (watashi/daigaku noteFa slots) → both words carry usage
 *     notes now.
 */
import type { EqaWaiver } from '../eqa/waivers';

export const EQA_WAIVERS: EqaWaiver[] = [];
