/**
 * HANASO — EQA taught-concept model (TASK-LEARNING-04) — PURE module.
 *
 * Derives, for every station of a chapter, the set of concepts a learner has
 * been taught at that point of the journey — the "taught side" of EQA-1's
 * «assessed ⊆ taught» and the coverage map of EQA-5.
 *
 * Concept universe of a chapter:
 *  - word ids (voc-*) — taught by vocab-card blocks
 *  - expression ids (chrk-*) — taught by expression-card blocks
 *  - kana item ids (hira-* / kata-* — TASK-LEARNING-06) — taught by kana-card blocks
 *    (the registry id IS the concept id for kana exercises — CONTENT-106)
 *  - grammar cluster ids (gr-*) — taught by the grammar station anchoring the
 *    cluster's lines (cluster.lineRefs ⊆ station.lineRefs, station type grammar;
 *    ambiguous anchoring is reported by the model, never guessed)
 *  - station objectiveCodes — taught at their stations (the objective IS what
 *    the station teaches — CONTRACT §۱/§۲)
 *  - station.teachesConcepts — the author-declared extras (listening sub-skills…)
 */
import type { Chapter, Station } from '../types';

export interface TaughtModel {
  /** station slug → concepts taught IN that station. */
  byStation: Map<string, Set<string>>;
  /** station slug → cumulative taught set at that station's order (inclusive). */
  cumulativeByStation: Map<string, Set<string>>;
  /** concept → earliest station order where it is taught (Infinity = never). */
  taughtAtOrder: Map<string, number>;
  /** grammar-cluster anchoring problems found while deriving (reported, not guessed). */
  anchorWarnings: { clusterId: string; reason: string }[];
  /** All concept ids that exist in this chapter's universe. */
  conceptUniverse: Set<string>;
}

/** Stations ordered by walk order (order asc, slug as tiebreaker). */
export function stationsInWalkOrder(chapter: Chapter): Station[] {
  return [...chapter.stations].sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

export function buildTaughtModel(chapter: Chapter): TaughtModel {
  const byStation = new Map<string, Set<string>>();
  const anchorWarnings: { clusterId: string; reason: string }[] = [];
  const ordered = stationsInWalkOrder(chapter);

  /* --- grammar cluster → host station(s) via line anchoring --- */
  const clusterHosts = new Map<string, Station[]>();
  const grammarStations = chapter.stations.filter((s) => s.type === 'grammar' || s.type === 'structure');
  for (const cluster of chapter.grammar) {
    const hosts = grammarStations.filter((s) => {
      const lineSet = new Set(s.lineRefs);
      return cluster.lineRefs.length > 0 && cluster.lineRefs.every((l) => lineSet.has(l));
    });
    if (hosts.length === 0) {
      anchorWarnings.push({
        clusterId: cluster.id,
        reason: `هیچ ایستگاه گرامری/ساختاری تمام خطوط ${cluster.lineRefs.join('،')} را لنگر نمی‌کند — خوشهٔ «${cluster.pattern}» جایی تدریس‌شده ثبت نیست`,
      });
    } else if (hosts.length > 1) {
      anchorWarnings.push({
        clusterId: cluster.id,
        reason: `خوشهٔ «${cluster.pattern}» به ${hosts.length} ایستگاه لنگر است (${hosts.map((h) => h.slug).join('،')}) — earliest استفاده می‌شود؛ برای دقت، teachesConcepts صریح بنویسید`,
      });
    }
    clusterHosts.set(cluster.id, hosts);
  }

  /* --- per-station taught concepts --- */
  for (const station of ordered) {
    const concepts = new Set<string>();
    // derivable from blocks
    for (const block of station.blocks) {
      if (block.kind === 'vocab-card') concepts.add(block.wordId);
      if (block.kind === 'expression-card') concepts.add(block.expressionId);
      // TASK-LEARNING-06 (DD-122): the kana-card block teaches its registry concept.
      if (block.kind === 'kana-card') concepts.add(block.kanaId);
    }
    // grammar clusters anchored to this station
    for (const [clusterId, hosts] of clusterHosts) {
      if (hosts.some((h) => h.slug === station.slug)) concepts.add(clusterId);
    }
    // the station's own objective is a teachable concept (mastery/objective references)
    if (station.objectiveCode) concepts.add(station.objectiveCode);
    // author-declared extras
    for (const c of station.teachesConcepts ?? []) concepts.add(c);
    byStation.set(station.slug, concepts);
  }

  /* --- cumulative + earliest order --- */
  const cumulativeByStation = new Map<string, Set<string>>();
  const taughtAtOrder = new Map<string, number>();
  const running = new Set<string>();
  for (const station of ordered) {
    for (const c of byStation.get(station.slug) ?? []) {
      running.add(c);
      const prev = taughtAtOrder.get(c);
      if (prev === undefined || station.order < prev) taughtAtOrder.set(c, station.order);
    }
    cumulativeByStation.set(station.slug, new Set(running));
  }

  /* --- concept universe --- */
  const conceptUniverse = new Set<string>([
    ...chapter.words.map((w) => w.id),
    ...chapter.grammar.map((g) => g.id),
    ...chapter.expressions.map((e) => e.id),
    ...chapter.stations.map((s) => s.objectiveCode).filter(Boolean),
    ...taughtAtOrder.keys(),
  ]);

  return { byStation, cumulativeByStation, taughtAtOrder, anchorWarnings, conceptUniverse };
}

/** Host station = the station whose exercise blocks reference the exercise (earliest wins). */
export function hostStationOf(exerciseId: string, chapter: Chapter): Station | undefined {
  const hosts = chapter.stations.filter((s) =>
    s.blocks.some((b) => b.kind === 'exercise' && b.exerciseIds.includes(exerciseId)),
  );
  if (hosts.length === 0) return undefined;
  return hosts.sort((a, b) => a.order - b.order)[0]!;
}

/** Grammar clusters anchored to a dialogue line (cluster.lineRefs contains the line). */
export function clustersAnchoredToLine(chapter: Chapter, lineRef: string): string[] {
  return chapter.grammar.filter((g) => g.lineRefs.includes(lineRef)).map((g) => g.id);
}

/** Words whose first teaching encounter (lineRef) is the given line. */
export function wordsAnchoredToLine(chapter: Chapter, lineRef: string): string[] {
  return chapter.words.filter((w) => w.lineRef === lineRef).map((w) => w.id);
}
