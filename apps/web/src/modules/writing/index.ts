/**
 * HANASO — writing module public entry (TASK-LEARNING-07 / DD-105).
 *
 * The shared handwriting engine (kana + kanji — one system, no parallel tools).
 * `analysis.ts` is pure and unit-testable; `char-data.ts` is the browser-side
 * asset loader; the React panel lives in components/writing (client island).
 * Hanzi Writer (MIT) is the rendering/quiz engine — see package.json.
 */
export * from './types';
export * from './analysis';
export * from './char-data';
