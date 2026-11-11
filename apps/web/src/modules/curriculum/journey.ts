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

/**
 * TASK-HANASO-17 (§۷): the section (ChapterUnit) that holds a station — the
 * «بازگشت به همان مسیر و Section» deep-link target after a lesson ends.
 * Pure data lookup (units[] grouping — DD-123). Returns null when the chapter
 * declares no units[] (the implicit single-section case: the map link carries
 * no ?s= parameter).
 */
export function sectionOfStation(chapter: Chapter, stationSlug: string): string | null {
  if (!chapter.units || chapter.units.length === 0) return null;
  return chapter.units.find((u) => u.stationSlugs.includes(stationSlug))?.slug ?? null;
}

/* ------------------------------------------------------------------ sections */
/*
 * TASK-HANASO-16 — the one-section-at-a-time Learning Journey panel.
 *
 * A «Section» IS the chapter's existing `units[]` island/story grouping
 * (DD-123/T-79 — grouping only, never a walk gate). Everything below is
 * DERIVED from the same JourneyNode availabilities the map used: no new
 * stored state, no new walk semantics, no data-model level. Chapters without
 * units[] resolve to ONE implicit section (all stations, in walk order).
 */

/** Derived (never stored) status of one section. */
export type SectionStatus = 'completed' | 'in_progress' | 'locked';

/** What the row's CTA should do (derived from the row node's availability). */
export type SectionRowAction = 'start' | 'continue' | 'review' | 'locked';

/** One station row inside the active section panel. */
export interface SectionRow {
  node: JourneyNode;
  action: SectionRowAction;
}

/** One section of the panel (ChapterUnit when the chapter declares units[]). */
export interface SectionView {
  slug: string;
  titleFa: string;
  /** The section's short goal (ChapterUnit.summaryFa). */
  goalFa?: string;
  status: SectionStatus;
  rows: SectionRow[];
  coreCompleted: number;
  coreTotal: number;
  /** True when this section holds the learner's next actionable station. */
  isFocus: boolean;
}

/** The chapter's sections in data order + the default active panel index. */
export interface SectionsView {
  sections: SectionView[];
  /** Default panel: the section holding the next actionable station (else the
   * last section for review, else the first). */
  activeIndex: number;
}

const DONE: ReadonlySet<string> = new Set(['completed', 'skipped', 'needs_retry']);

function rowAction(availability: StationAvailability): SectionRowAction {
  switch (availability) {
    case 'completed':
    case 'skipped':
      return 'review';
    case 'in_progress':
    case 'needs_retry': // soft-pass (island §۹) — the learner returns to improve
      return 'continue';
    case 'available':
      return 'start';
    default:
      return 'locked';
  }
}

/**
 * Resolve the section panel view of a journey. Pure: same inputs → same output;
 * order comes ONLY from the chapter's authored units[]/station order (the
 * resolver's unitGroups when present, else one implicit section).
 */
export function resolveSections(journey: Journey): SectionsView {
  const focus = nextStation(journey)?.slug ?? null;

  const groups: { slug: string; titleFa: string; goalFa?: string; nodes: JourneyNode[] }[] =
    journey.unitGroups && journey.unitGroups.length > 0
      ? journey.unitGroups.map((g) => ({
          slug: g.unit.slug,
          titleFa: g.unit.titleFa,
          goalFa: g.unit.summaryFa,
          nodes: g.nodes,
        }))
      : [
          {
            slug: `${journey.chapter.slug}--all`,
            titleFa: journey.chapter.titleFa,
            goalFa: journey.chapter.summaryFa,
            nodes: journey.nodes,
          },
        ];

  const sections: SectionView[] = groups.map((g) => {
    const core = g.nodes.filter((n) => n.station.core);
    const coreCompleted = core.filter((n) => DONE.has(n.availability)).length;
    const rows: SectionRow[] = g.nodes.map((node) => ({ node, action: rowAction(node.availability) }));
    const hasLive = g.nodes.some((n) => n.availability === 'in_progress' || n.availability === 'needs_retry');
    const isFocus = focus !== null && g.nodes.some((n) => n.station.slug === focus);
    const allLocked = g.nodes.every((n) => n.availability === 'locked');
    const status: SectionStatus =
      core.length > 0 && coreCompleted === core.length
        ? 'completed'
        : isFocus || hasLive || coreCompleted > 0
          ? 'in_progress'
          : allLocked
            ? 'locked'
            : 'in_progress'; // non-locked, nothing done yet → the current frontier
    return {
      slug: g.slug,
      titleFa: g.titleFa,
      goalFa: g.goalFa,
      status,
      rows,
      coreCompleted,
      coreTotal: core.length,
      isFocus,
    };
  });

  let activeIndex = sections.findIndex((s) => s.isFocus);
  if (activeIndex < 0) {
    activeIndex = sections.findIndex((s) => s.status === 'in_progress');
  }
  if (activeIndex < 0) {
    activeIndex = sections.length - 1; // everything completed → review the last section
  }
  return { sections, activeIndex };
}
