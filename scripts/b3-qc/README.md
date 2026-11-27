# CH02-B3 QC tooling (stations 13-18) — same pattern as b2-qc

The zero-based browser walk of the batch-3 lessons:

1. `b3-unlock.ts <cookie>` — honest fast-forward: topologically grades one
   REAL exercise per prerequisite station (the M1 guard) and completes it;
   the target batch (stations 13-18) is excluded.
2. `b3-answerkey.ts` — extracts the walk answer key (option labels / chunk
   orders / chip sequences / scene replies / discovery answers) for
   stations 13-18 into `/tmp/b3-answerkey.json`.
3. `b3-walk.py <cookie> <desk|mob> <outdir> [station]` — the real-browser
   walk (Playwright/Chromium): answers every graded surface with EXACT
   label matching, advances every block, asserts the completion seal, and
   records console/page/HTTP errors + horizontal overflow + screenshots.
   `B3TEXT=1` also captures every unique text state (review mode) for the
   text lint.
4. The chapter-agnostic scans stay in `scripts/b2-qc/` (leaks + linerefs)
   and are now permanent law R15 + R14 in the contract suite.

Run from the repo root: `npx tsx scripts/b3-qc/<script>`.
