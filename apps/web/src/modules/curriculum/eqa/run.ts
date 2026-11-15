/**
 * HANASO — EQA runner (TASK-LEARNING-04, Issue #97) — PURE module.
 *
 * Runs all seven pedagogical gates over the bundled chapters, matches findings
 * against the registered waivers, and produces the exit-code decision:
 *
 *   FAIL when  - any ERROR finding is not waived
 *              - any waiver is stale (its finding disappeared — clean it up)
 *              - any waiver key is duplicated
 *   PASS when  - all remaining errors are explicitly waived (each printed with
 *                its issue link), warnings are listed for EQA-9 human review.
 */
import type { Chapter, LevelPolicy } from '../types';
import type { EqaFinding } from './policy';
import { findingKey } from './policy';
import { gateEqa1, gateEqa2, gateEqa3, gateEqa4, gateEqa5, gateEqa6, gateEqa7Chapter, gateEqa7Levels } from './gates';
import type { EqaWaiver } from './waivers';
import { matchWaivers } from './waivers';

export interface EqaChapterResult {
  chapter: Chapter;
  findings: EqaFinding[];
  /** error findings matched to an active waiver (visible in every report). */
  waived: { finding: EqaFinding; waiver: EqaWaiver }[];
  /** error findings with NO waiver — these fail CI. */
  unwaivedErrors: EqaFinding[];
  /** warning/info findings (EQA-9 human review — never fail CI). */
  review: EqaFinding[];
}

export interface EqaRunResult {
  chapters: EqaChapterResult[];
  /** Global (chapter-independent) EQA-7 level-policy findings. */
  levelFindings: EqaFinding[];
  /** Stale waivers (finding no longer exists) — fail CI. */
  staleWaivers: EqaWaiver[];
  /** Duplicate waiver keys — fail CI. */
  duplicateWaivers: EqaWaiver[];
  pass: boolean;
}

export function runEqa(
  chapters: Chapter[],
  levels: Record<string, LevelPolicy>,
  levelList: LevelPolicy[],
  waivers: readonly EqaWaiver[],
): EqaRunResult {
  const levelFindings = gateEqa7Levels(levelList);
  const allFindings: { key: string; chapterSlug: string }[] = levelFindings.map((f) => ({
    key: findingKey(f),
    chapterSlug: '(levels)',
  }));
  const chapterResults: EqaChapterResult[] = [];

  for (const chapter of chapters) {
    const findings: EqaFinding[] = [
      ...gateEqa1(chapter),
      ...gateEqa2(chapter),
      ...gateEqa3(chapter),
      ...gateEqa4(chapter),
      ...gateEqa5(chapter),
      ...gateEqa6(chapter),
      ...gateEqa7Chapter(chapter, levels),
    ];
    for (const f of findings) allFindings.push({ key: findingKey(f), chapterSlug: chapter.slug });

    const { matches } = matchWaivers(
      findings.map((f) => ({ key: findingKey(f) })),
      waivers,
    );
    const waived: EqaChapterResult['waived'] = [];
    const unwaivedErrors: EqaFinding[] = [];
    const review: EqaFinding[] = [];
    for (const f of findings) {
      const w = matches.get(findingKey(f));
      if (f.severity === 'error' && w) waived.push({ finding: f, waiver: w });
      else if (f.severity === 'error') unwaivedErrors.push(f);
      else review.push(f);
    }
    chapterResults.push({ chapter, findings, waived, unwaivedErrors, review });
  }

  // Global waiver hygiene: every waiver must match some finding somewhere (chapter or level).
  const { matches: globalMatches, stale, duplicates } = matchWaivers(allFindings, waivers);
  void globalMatches;

  const pass =
    stale.length === 0 &&
    duplicates.length === 0 &&
    levelFindings.every((f) => f.severity !== 'error') &&
    chapterResults.every((c) => c.unwaivedErrors.length === 0);

  return { chapters: chapterResults, levelFindings, staleWaivers: stale, duplicateWaivers: duplicates, pass };
}
