/**
 * HANASO — the server-side Smart Ruby services (SMART-RUBY 2026-11-23 §۲).
 *
 * Memoized per server process (pure module singletons — the same derived
 * data every RSC render and every API call answers from):
 *   - the course ReadingModel (built once from the bundled chapters + the N5
 *     reference — content-as-code, so it can never drift from validation);
 *   - the compact client transport (ruby-relevant subset — what the root
 *     layout ships to the browser);
 *   - the per-LEARNER view builder (completed stations → taught kanji/
 *     readings) — the ONLY truth the ruby show/hide law may consult.
 */
import { CHAPTERS } from '../content';
import { buildKnowledgeRegistry } from './registry';
import {
  buildLearnerJaView,
  buildReadingModel,
  rubyTransportModel,
  type LearnerJaView,
  type ReadingModel,
} from './reading-model';

/* Deterministic singletons — built once per process, never per request. */
const COURSE_MODEL: ReadingModel = buildReadingModel(CHAPTERS);
const COURSE_REGISTRY = buildKnowledgeRegistry(CHAPTERS);
const STATION_TITLE_BY_SLUG = new Map<string, string>();
const ALL_STATION_SLUGS: string[] = [];
for (const chapter of CHAPTERS) {
  for (const station of chapter.stations) {
    STATION_TITLE_BY_SLUG.set(station.slug, station.titleFa);
    ALL_STATION_SLUGS.push(station.slug);
  }
}

/** The full server-side model (validation / reports). */
export function getCourseReadingModel(): ReadingModel {
  return COURSE_MODEL;
}

/** The compact client transport (what the root layout ships to the browser). */
export function getRubyTransportModel(): ReadingModel {
  return rubyTransportModel(COURSE_MODEL);
}

/** Every station slug of the course (the progress query surface). */
export function listCourseStationSlugs(): string[] {
  return [...ALL_STATION_SLUGS];
}

/** The per-learner ruby truth — completed stations only (never registry presence). */
export function getLearnerJaView(completedStationSlugs: ReadonlySet<string>): LearnerJaView {
  return buildLearnerJaView({
    chapters: CHAPTERS,
    taughtAt: COURSE_REGISTRY.taughtAt,
    completedStationSlugs,
    stationTitleBySlug: STATION_TITLE_BY_SLUG,
    model: COURSE_MODEL,
  });
}
