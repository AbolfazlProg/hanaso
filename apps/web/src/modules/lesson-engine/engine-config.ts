/**
 * HANASO — Lesson Engine calibration config (owner-pass 2026-11-19).
 *
 * EVERY number below is a framework DESIGN NUMBER, explicitly marked calibratable
 * in the teaching framework (see docs/lesson-engine/REQUIREMENTS.md §۷): the open
 * questions Q-004/007/009/011/017/020 own their final values. The validator and
 * compiler read ONLY this file — no pedagogical threshold is hardcoded elsewhere.
 * Sources: HANASO_STAGED_TEACHING_IMPLEMENTATION §۵ + teaching-interaction-model §۱/§۴,
 * prerequisite-and-sequencing §۳, everyday-vocabulary-use §۵, station-blueprint §۲.۵.
 */
export const ENGINE_CONFIG = {
  /** Teaching station step cap by level (D-0014, Q-017). */
  teachingStepCap: { H0: 5, H1: 6, H2: 9, H3: 9, H4: 9 } as Record<string, number>,
  /** Guided phase steps (last steps of a teaching station, D-0011). */
  guidedStepCap: 3,
  /** Practice station item bounds (station-blueprint §۲.۵). */
  practiceItems: { min: 8, max: 15 },
  /** Anti-fatigue: consecutive same-type interactions (staged-principles G1/G3). */
  maxConsecutiveSameInteraction: 2,
  /** Option count bounds (micro-interaction §۱, Q-020). */
  options: { min: 2, max: 4 },
  /** Tile bounds for build/order (mobile load). */
  buildTiles: { max: 4 },
  matchPairs: { max: 4 },
  /** Vocabulary tiers. */
  t1PerStation: { min: 1, max: 2 },
  /** Grammar budget per chapter (prerequisite-and-sequencing §۳ rule 3). */
  grammarPerChapter: { max: 2 },
  /** Kana per station (skills-executive-tables §و). */
  kanaPerStation: { min: 4, max: 6 },
  /** Vocabulary coverage of chapter texts (Q-009; 95 design number). */
  coveragePercentMin: 95,
  /** Review interleaving 60/40 (prerequisite-and-sequencing §۵). */
  interleaveNew: 60,
  /** SRS horizons (vocab walkthroughs; kanji longer — 14/60). */
  srsHorizon: { vocab: [7, 30], kanji: [14, 60], grammar: [7, 30], kana: [7, 30] } as Record<string, number[]>,
  /** Dialogue turns by level (conversation-centered §۲.۴). */
  dialogueTurns: { H0: 6, H1: 6, H2: 10, H3: 12, H4: 16 } as Record<string, number>,
  /** Kanji per chapter (D-0008, Q-004). */
  kanjiPerChapter: { min: 10, max: 15 },
  /** Listening: transcript allowed only after ≥2 listenings (D-0007, Q-002). */
  minListeningsBeforeTranscript: 2,
  /** Cultural notes per chapter (chapter-blueprint §۱). */
  culturalNotesMax: 2,
  /** Skill share cap per chapter (four-skills-interaction-matrix §۴). */
  skillShareMaxPercent: 40,
} as const;
