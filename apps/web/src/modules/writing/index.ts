/**
 * HANASO — writing module public entry (TASK-LEARNING-07 / DD-105, v2 in
 * TASK-LEARNING-08 phase 2 / #117).
 *
 * The shared handwriting engine (kana + kanji — one system, no parallel tools).
 * `analysis.ts` — pure geometry core; `engine.ts` — the v2 judging pipeline
 * (acceptance authority: normalization + confidence + Persian feedback);
 * `char-data.ts` — browser-side asset loader (KanjiVG centerlines). The React
 * canvas lives in components/writing (client island, own SVG renderer).
 */
export * from './types';
export * from './analysis';
export * from './engine';
export * from './render';
export * from './char-data';
