/**
 * HANASO — Journey resolver (TASK-LEARNING-01) — PURE module.
 *
 * Resolves a chapter's station graph into the island journey the UI renders.
 * ORDER COMES FROM DATA ONLY (DATA-CONTRACT §۲: «ترتیب ایستگاه‌ها هرگز Hardcode
 * نمی‌شود») — the resolver topologically sorts by authored `order` + `prerequisites`
 * and derives availability from the user's stored walk state (island §۹):
 *
 *   locked       — some prerequisite is not completed/skipped yet
 *   available    — prereqs satisfied, not yet walked
 *   in_progress / completed / needs_retry / skpped — from the stored state
 *
 * Optional (core=false) stations NEVER block the main path (island §۷-۱) and are
 * excluded from chapter completion counting.
 */
import type {
  Chapter,
  Journey,
  JourneyNode,
  JourneyUnitGroup,
  LevelPolicy,
  Station,
  StationState,
  ChapterState,
  StationAvailability,
} from './types';

/** Walk-states that satisfy a prerequisite (skipped-via-Test-Out ≡ completed — O5-2;
 * needs_retry = soft-passed after 2 attempts — island §۹ «بدون گیرکردن»). */
const PREREQ_OK = new Set<StationState['status']>(['completed', 'skipped', 'needs_retry']);

/** Topological station order: authored order wins; prerequisites must always come first. */
export function orderedStations(chapter: Chapter): Station[] {
  const byslug = new Map(chapter.stations.map((s) => [s.slug, s]));
  const seen = new Set<string>();
  const out: Station[] = [];

  const visit = (station: Station, stack: Set<string>) => {
    if (seen.has(station.slug) || stack.has(station.slug)) return;
    stack.add(station.slug);
    for (const preref of station.prerequisites) {
      const prereq = byslug.get(preref);
      if (prereq) visit(prereq, stack);
    }
    stack.delete(station.slug);
    seen.add(station.slug);
    out.push(station);
  };

  // Authored order drives traversal; the recursive visit pins prerequisites first.
  for (const station of [...chapter.stations].sort((a, b) => a.order - b.order)) {
    visit(station, new Set());
  }
  return out;
}

/** Availability of one station given the stored states (derived — never stored). */
export function stationAvailability(
  station: Station,
  states: Map<string, StationState>,
  allStations: Station[],
): { availability: StationAvailability; blockedBy: string[] } {
  const state = states.get(station.slug);
  if (state) {
    return { availability: state.status, blockedBy: [] };
  }
  const byslug = new Map(allStations.map((s) => [s.slug, s]));
  const blockedBy = station.prerequisites.filter((ref) => {
    const prereq = byslug.get(ref);
    if (!prereq) return false; // unknown preref — surfaced by content validation
    const st = states.get(ref);
    return !st || !PREREQ_OK.has(st.status);
  });
  return { availability: blockedBy.length ? 'locked' : 'available', blockedBy };
}

/** Resolve the full journey view for a chapter + user states. */
export function resolveJourney(
  chapter: Chapter,
  level: LevelPolicy,
  stationStates: StationState[],
  chapterState: ChapterState | null,
): Journey {
  const states = new Map(stationStates.map((s) => [s.stationSlug, s]));
  const ordered = orderedStations(chapter);

  const nodes: JourneyNode[] = ordered.map((station) => {
    const { availability, blockedBy } = stationAvailability(station, states, chapter.stations);
    return { station, availability, blockedBy };
  });

  const core = ordered.filter((s) => s.core);
  const coreCompleted = core.filter((s) => {
    const st = states.get(s.slug);
    return st !== undefined && PREREQ_OK.has(st.status);
  }).length;

  // TASK-LEARNING-06 (T-79): group the same nodes by the chapter's declared units[]
  // (story units / islands) — pure presentation grouping; walk order and prereqs are
  // untouched. Stations not listed in any unit (should not happen — validated) are
  // appended to a trailing implicit group so no node is lost.
  let unitGroups: JourneyUnitGroup[] | undefined;
  if (chapter.units && chapter.units.length > 0) {
    const nodeBySlug = new Map(nodes.map((n) => [n.station.slug, n]));
    const seen = new Set<string>();
    unitGroups = chapter.units.map((unit) => {
      const groupNodes = unit.stationSlugs
        .map((slug) => nodeBySlug.get(slug))
        .filter((n): n is JourneyNode => n !== undefined);
      unit.stationSlugs.forEach((slug) => seen.add(slug));
      const groupCore = groupNodes.filter((n) => n.station.core);
      const doneCore = groupCore.filter((n) => PREREQ_OK.has(n.availability as StationState['status']));
      return {
        unit,
        nodes: groupNodes,
        coreCompleted: doneCore.length,
        coreTotal: groupCore.length,
      };
    });
    const leftovers = nodes.filter((n) => !seen.has(n.station.slug));
    if (leftovers.length > 0) {
      const groupCore = leftovers.filter((n) => n.station.core);
      unitGroups.push({
        unit: { slug: '__rest__', titleFa: 'سایر ایستگاه‌ها', stationSlugs: leftovers.map((n) => n.station.slug) },
        nodes: leftovers,
        coreCompleted: groupCore.filter((n) => PREREQ_OK.has(n.availability as StationState['status'])).length,
        coreTotal: groupCore.length,
      });
    }
  }

  return {
    chapter,
    level,
    nodes,
    coreCompleted,
    coreTotal: core.length,
    chapterState,
    unitGroups,
  };
}

/** Next actionable station (first available core station in walk order). */
export function nextStation(journey: Journey): Station | null {
  const available = journey.nodes.find((n) => n.station.core && n.availability === 'available');
  if (available) return available.station;
  const inProgress = journey.nodes.find((n) => n.station.core && n.availability === 'in_progress');
  return inProgress?.station ?? null;
}

/** All core stations completed → chapter is ready for the mastery gate. */
export function corePathComplete(journey: Journey): boolean {
  return journey.coreCompleted === journey.coreTotal;
}

/** The mastery gate station of a chapter (typed walk target for stage D). */
export function masteryStation(chapter: Chapter): Station | null {
  return chapter.stations.find((s) => s.type === 'mastery' && s.core) ?? null;
}
