/**
 * HANASO — EQA waiver contract (TASK-LEARNING-04) — PURE module.
 */
export interface EqaWaiver {
  /** Must equal findingKey(finding) = `${gate}:${subject}:${rule}`. */
  key: string;
  /** GitHub issue carrying the evidence and the fix tracking. */
  issue: number;
  /** Persian reason — what exactly is waived and why it is acceptable for now. */
  reason: string;
  /** The mission that MUST remove this waiver (by fixing content, not by deleting the waiver). */
  resolvedBy: string;
  /** Registration date (ISO). */
  registeredAt: string;
  /** Chapter slug the waiver belongs to (for report grouping). */
  chapter: string;
}

export type WaiverMatch =
  { status: 'active'; waiver: EqaWaiver } | { status: 'unmatched' } | { status: 'stale'; waiver: EqaWaiver };

export function matchWaivers(
  findings: readonly { key: string }[],
  waivers: readonly EqaWaiver[],
): { matches: Map<string, EqaWaiver>; stale: EqaWaiver[]; duplicates: EqaWaiver[] } {
  const keys = new Set(findings.map((f) => f.key));
  const matches = new Map<string, EqaWaiver>();
  const stale: EqaWaiver[] = [];
  const duplicates: EqaWaiver[] = [];
  for (const w of waivers) {
    if (matches.has(w.key)) {
      duplicates.push(w);
      continue;
    }
    if (keys.has(w.key)) matches.set(w.key, w);
    else stale.push(w);
  }
  return { matches, stale, duplicates };
}
