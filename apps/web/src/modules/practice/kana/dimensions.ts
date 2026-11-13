/**
 * HANASO — Kana practice dimensions (TASK-HANASO-22).
 * Source of truth: docs/research/LANGUAGE_SKILL_DIMENSIONS.md §۱ (K1..K8).
 * Every dimension names what ability it exercises and where its data comes
 * from — a practice item must declare one, and weak-point analytics aggregate
 * by it (a learner strong in K2 but weak in K3 is a different lesson).
 */
export const KANA_DIMENSIONS = [
  'K1', // visual discrimination of confusable pairs (shape identity)
  'K2', // glyph → sound/reading (recognition)
  'K3', // sound → glyph (recall)
  'K4', // decoding a real taught word (reading)
  'K5', // mora awareness (counting / length within taught rules)
  'K6', // writing recall (from memory — optional, never required)
  'K7', // stroke order (tracing/judged writing — optional, never required)
  'K8', // katakana loanword reading (real-world vessels)
] as const;

export type KanaPracticeDimension = (typeof KANA_DIMENSIONS)[number];

export const KANA_DIMENSION_LABELS_FA: Record<KanaPracticeDimension, string> = {
  K1: 'تمایز شکل‌های شبیه',
  K2: 'از شکل به صدا',
  K3: 'از صدا به شکل',
  K4: 'خواندن واژهٔ واقعی',
  K5: 'آگاهی مورایی',
  K6: 'نوشتن از حافظه',
  K7: 'ترتیب حرکت‌ها',
  K8: 'خواندن وام‌واژه‌ها',
};

/** Dimensions that require the writing canvas (client-judged). */
export const WRITING_DIMENSIONS: readonly KanaPracticeDimension[] = ['K6', 'K7'];

/** Core dimensions every mixed session draws from (writing stays opt-in). */
export const CORE_DIMENSIONS: readonly KanaPracticeDimension[] = ['K2', 'K3', 'K4'];

/** Weakness-weighted dimensions (added by need, not always). */
export const SUPPORT_DIMENSIONS: readonly KanaPracticeDimension[] = ['K1', 'K5', 'K8'];

export function isKanaDimension(value: string): value is KanaPracticeDimension {
  return (KANA_DIMENSIONS as readonly string[]).includes(value);
}
