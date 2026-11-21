/**
 * HANASO — Knowledge Reference Registry types (ENGINE-REFORM 2026-11-22).
 *
 * The central, course-wide, searchable, versioned reference of EVERY teachable
 * item — the single source of truth the prerequisite engine answers against:
 *   «آیا این مطلب، پیش از این نقطه از مسیر، واقعاً تدریس شده است؟»
 *
 * DESIGN CONTRACT (mission §۲ + repo ADR-008 content-as-code):
 * - The chapters' authored content REMAINS the authoring truth. The registry
 *   is a DERIVED, DETERMINISTIC INDEX built from the station decks at module
 *   load — one derivation, no parallel truth, no drift (a CI gate proves the
 *   build is deterministic and content-sensitive).
 * - Registration of taught items is AUTOMATIC: a station's teaching blocks
 *   (kana/vocab/expression cards, rule decks, anchored grammar clusters,
 *   declared concepts) register their items with the exact first-teaching
 *   location (chapter/station/block) the moment the content is committed —
 *   «ثبت خودکار دانش جدید» is the derivation itself, part of content
 *   registration (the EQA run builds it; it can never be forgotten).
 * - Anti-duplication (chapter-blueprint §سازگاری): every datum has ONE
 *   defining home (firstTaught). A later use is a REFERENCE, not a re-teach.
 *
 * Exposure ≠ teaching (mission §۳): the anchor dialogue is the learner's FIRST
 * ENCOUNTER with target items (three-origin rule) — recorded as `exposureAt`,
 * never counted as teaching. Until the real teaching block runs, no question
 * may assume the item as known knowledge (that is EQA-8's job).
 */
import type { Chapter } from '../types';

/* ------------------------------------------------------------- registry ids */

export type KnowledgeKind =
  | 'kana' // a registry glyph (kana-items: hira-a … kata-pyo) — taught by kana-card
  | 'rule-mark' // a writing-system rule (dakuten/handakuten/yōon-small/sokuon/chōonpu/foreign-small) — taught by a rule unit
  | 'word' // a vocabulary item — taught by vocab-card (chapter words list)
  | 'grammar' // a grammar pattern cluster — taught by the station anchoring its lines
  | 'expression' // a functional expression — taught by expression-card
  | 'derived-glyph' // a derived form (voiced/small/foreign) — taught by its first explicit teaching display
  | 'concept'; // a station-declared concept (objectiveCode / teachesConcepts) — taught at its station

/** Canonical registry id of a rule mark. */
export type RuleMarkId = `mark-${'dakuten' | 'handakuten' | 'yoon-small' | 'sokuon' | 'choonpu' | 'foreign-small'}`;

/** The exact location an item was taught (or first exposed) — chapter + station + block. */
export interface KnowledgePoint {
  chapterSlug: string;
  stationSlug: string;
  stationOrder: number;
  /** The teaching block that defines the item (card/rule/example display). */
  blockId?: string;
  /** Global journey position: (chapterIndex + 1) * 10000 + stationOrder. */
  globalIndex: number;
}

/** One registry entry — the machine record of one teachable item. */
export interface KnowledgeEntry {
  id: string;
  kind: KnowledgeKind;
  /** Standard form: the glyph / term / pattern / expression ja / concept id. */
  surface: string;
  reading?: string;
  romaji?: string;
  meaningFa?: string;
  /** THE defining first-teaching point (single home — anti-duplication). */
  firstTaught: KnowledgePoint;
  /** First-exposure points (anchor dialogue / prediction) — NOT teaching. */
  exposureAt?: KnowledgePoint[];
  /** Registry ids this item presupposes (glyphs of its reading, its mark rule, …). */
  prerequisites: string[];
  /** Kana extras. */
  script?: 'hira' | 'kata';
  row?: string;
}

/** Which chapters the course is built from, in course order (the registry's input). */
export type RegistrySource = Chapter[];

/* ------------------------------------------------------------- search */

export interface KnowledgeSearchQuery {
  /** Free text: matches surface, reading or romaji (normalized). */
  query?: string;
  kinds?: KnowledgeKind[];
  /** Restrict to items taught at or before this point (inclusive). */
  taughtBy?: { chapterSlug: string; stationSlug: string };
  /** Restrict to items first taught in this chapter. */
  chapter?: string;
  /** Exact surface match instead of substring. */
  exact?: boolean;
  /** Fold hiragana↔katakana when matching surfaces (script-insensitive search). */
  foldScript?: boolean;
  limit?: number;
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry;
  matchedOn: 'surface' | 'reading' | 'romaji' | 'id';
}

/* ------------------------------------------------------------- integrity */

export interface RegistryIntegrityIssue {
  rule: string;
  message: string;
}

/** The built registry — derived data + the fast-lookup indexes. */
export interface KnowledgeRegistry {
  schemaVersion: number;
  /** Deterministic content digest (FNV-1a over the canonical entry serialization). */
  digest: string;
  /** Build input identity: chapter slugs in course order. */
  course: string[];
  entries: KnowledgeEntry[];
  byId: Map<string, KnowledgeEntry>;
  /** Exact surface → entries (raw + script-folded). */
  bySurface: Map<string, KnowledgeEntry[]>;
  bySurfaceFolded: Map<string, KnowledgeEntry[]>;
  byReading: Map<string, KnowledgeEntry[]>;
  /** id → first teaching point (the single home). */
  taughtAt: Map<string, KnowledgePoint>;
  /** `${chapterSlug}/${stationSlug}` → ids taught at-or-before that station (prereq chain included). */
  cumulativeByStation: Map<string, Set<string>>;
  /** `${chapterSlug}/${stationSlug}` → ids taught STRICTLY BEFORE that station
   *  (prerequisite-chapter chain + earlier stations of the chapter — the honest
   *  entry knowledge the station's own deck must build on, block by block). */
  cumulativeBeforeStation: Map<string, Set<string>>;
  /** Chapter → station slugs in walk order (the course's shape). */
  stationsByChapter: Map<string, string[]>;
  /** Non-fatal derivation notes (reported, never guessed away). */
  notes: RegistryIntegrityIssue[];
}
