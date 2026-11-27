# CH02-B2 QC tooling (stations 07-12) — reused for the next batches

The zero-based browser walk of a rebuilt lesson batch:

1. `b2-unlock.ts <cookie>` — honest fast-forward: topologically grades one
   REAL exercise per prerequisite station (the M1 guard) and completes it;
   the target batch is excluded.
2. `b2-answerkey.ts` — extracts the walk answer key (option labels / chunk
   orders / chip sequences / scene replies / discovery answers) from the
   server content module into `/tmp/b2-answerkey.json`.
3. `b2-walk.py <cookie> <desk|mob> <outdir> [station]` — the real-browser
   walk (Playwright/Chromium): answers every graded surface with EXACT label
   matching, advances every block, asserts the completion seal, and records
   console/page/HTTP errors + horizontal overflow + screenshots.
   `B2TEXT=1` also captures every unique text state (review mode) for the
   text lint.
4. `b2-scan-leaks.ts` / `b2-scan-linerefs.ts` — authored F1/F2 key-leak and
   «خط N» citation scans (the contract-test R14 makes the latter permanent).

Run from the repo root: `npx tsx scripts/b2-qc/<script>` (tsx path fix:
scripts import `../../apps/web/...` — adjust if moved).
