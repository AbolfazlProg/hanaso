# TASK-HANASO-21 — CHECKPOINT LOG

Running log; newest at the bottom. Every phase transition, commit, test run,
decision and incident gets an entry HERE as soon as it happens.

---

## CP-01 · 2026-11-13 ~09:05 — Session recovery + state audit (Phase 0 re-run)

- Context was lost after 5 TASK-21 commits existed. This session re-audited
  everything from git + working tree (no guessing):
  - Branch `fix/TASK-HANASO-21-completion-seal`, base = TASK-HANASO-20 tip
    `2719e5d` (docs-only commit after the reported target `2574788`; product
    state identical to `2574788`).
  - Verified `2574788c36521cec6ac0673488b769e77a8ab982` in history. ✔
  - `origin/main` NOT merged / NOT used (per brief; no blind merge or reset).
  - 5 commits present (P0 fix, AIZEN seal, BUG-009, BUG-011, OBS-001..010) —
    details recorded in CURRENT_STATE.md.
  - Uncommitted: audio gen extractor (+42 lines) — Phase 3.4 mid-flight.
  - Untracked scratch: `tests/unit/h21-audio-inventory.test.ts`.
- Ran scratch audio inventory: 160 referenced / 125 committed / 35 pending
  (6 are `___` scaffolds → 29 real). Gen surface covers all 29. ✔
- VOICEVOX reachability: 127.0.0.1:50021 dead locally; no docker in sandbox;
  no SSH keys to VPS → audio generation IMPOSSIBLE from this sandbox.
  Decision (per brief): honest-preparation path — commit the gen-script
  extension, keep UI honest, document the VPS-run requirement, DO NOT claim
  generation. Limitation will be reported explicitly.
- Branch NOT pushed yet (no origin counterpart). Push with owner PAT at
  Phase 6.
- Created this checkpoint directory; CURRENT_STATE.md written first.
- NEXT: Phase 3.4 completion (UI honesty + commit), then Phase 5 regression.

## CP-02 · 2026-11-13 ~09:05 — Phase 3.4 DONE (commit c25dba7)

- Verified the UI honesty contract on EVERY playable surface (server route
  `if (urls)` guards + `ExampleAudioButton` null→hidden + `playBoth` only when
  both sides have assets + `hostWordAudioUrls` manifest+file check). No dead
  play buttons exist for pending words. Dialogue-line exercises use the
  separate committed dialogues registry (audioLineRef) — out of scope by design.
- Gen script: added `--list` mode (JSON surface, no synthesis) and
  `wordSurface()` single source used by BOTH --list and generateAll — the
  staged list and the real run can never drift.
- Replaced the scratch inventory test with the permanent honesty gate
  `tests/unit/h21-audio-inventory.test.ts`: orphans (playable words neither
  committed nor covered by the gen surface) FAIL CI.
- Gate result (committed evidence): surface=180 committed=151 pending=29
  orphans=0. Pending list (needs the owner's VPS VOICEVOX run):
  ええ かぎ かぜ がこう きゃく きゅう きよう くうき けっか さっき さんすう ざせき
  せん ちゅうごくじん とうきょう ば ぱ ぱん びょういん らーめん ケーキ コヒー
  コーラ タクシー ティッシュ ネコ ファイル フアイル ヴァイオリン
- Commit: `c25dba7` (fix(audio): TASK-HANASO-21 — complete hostword gen
  surface + the honesty gate).
- NEXT: Phase 5 full regression (unit/EQA/tsc/eslint), then real-browser E2E.

## CP-03 · 2026-11-13 ~09:10 — Phase 5 static+DB regression GREEN (commit pending push)

- Unit suite: **736/736** (62 files) — includes the new audio honesty gate.
- Integration suite ran for the FIRST time since TASK-HANASO-20: staged a
  portable PostgreSQL **18.7** in the sandbox (PGDG debs extracted user-space:
  postgresql-18 + client-18 + libpq5 + liburing2 2.15; `pg_ctl` on
  127.0.0.1:5433, trust auth, isolated data dir /tmp/h21pg18). Result after
  re-pinning two stale expectations: **35 passed + 1 conditional skip (6/6
  files)** — incl. the live pg_dump/pg_restore drill (99,421B archive, 187
  entries, per-table counts equal, 0.128s restore).
  - Stale expectation 1: content.lessons 54→55 — TASK-HANASO-20's
    stn-kana-k12-foreign (32nd Ch01 station) was never re-pinned because the
    suite could not run in that sandbox.
  - Stale expectation 2: unit est_minutes 45→71 — TASK-HANASO-21 OBS-003.
  Both are intended product states; tests re-pinned, no product change.
- tsc --noEmit: clean (one strict-null fix in the new gate test).
- eslint: clean. stylelint: 2 errors in the AIZEN seal CSS (physical
  width/height) fixed → logical inline-size/block-size. Fonts budget: green.
- Commit: `test+style: TASK-HANASO-21 — integration suite re-pinned…`
- NEXT: real-browser E2E (dev server + Playwright): completion walk, AIZEN
  seal ceremony/persistence/replay, error scenarios, responsive matrix.

## CP-04 · 2026-11-13 ~10:15 — Browser E2E 46/46 GREEN + a REAL production bug fixed

- Staged full E2E env: production build (`next build`), real PG 18.7
  (hanaso_e2e db, migrate+seed+seed:curriculum), `next start -p 3123`,
  real Chromium 143 via playwright-core + the cached ms-playwright.
- Built `scripts/h21-e2e/run.mjs` (committed) + the permanent answer-key
  integrity test `tests/unit/h21-e2e-key.test.ts` (54 stations / 520
  exercises walker-answerable; dumps the key + mastery gate bank).
- **E2E RESULT: 46/46 PASS** — including:
  - S2.2 the owner-observed bug regression (stn-kana-k8 PERFECT walk via
    the auto-next path completes; was 409-forever before commit 5204883);
  - S4.1 OBS-001 fm01 anchor completes (after honest mastery-gate unlock);
  - the full error matrix (criterion 409 + redo, abort + retry, refresh
    resume, double-click single-flight, prereq 409, replay, idempotency,
    identity, GUEST).
- **REAL BUG FOUND & FIXED (production-affecting):** the kana chapter
  mastery gate 500'd on PostgreSQL — chapter dialogues have no B_lesson
  anchor by design, so the content map's INNER JOIN could not resolve
  kana-welcome-01 and the gate attempt persistence crashed
  (ContentNotSeededError). Fix: content-map LEFT JOIN (lessonUuid
  nullable) + guard in the PoC progress upsert. Regression test:
  tests/integration-pg/mastery-chapter.spec.ts (201 passed + understood;
  was 500). The VPS is affected the same way → this fix is part of the
  TASK-21 release.
- VLM design verification of the seal screenshots: vermilion hanko with
  藍染 tategaki relief, ink-skip texture, halo; clean at 360px and 1440px;
  criterion panel shows the Persian explanation + redo-only-final-exercise
  CTA + progress-kept reassurance.
- Commits: `fix(db)+test(e2e): TASK-HANASO-21 — chapter mastery gate
  un-500'd + the 46/46 browser E2E suite`.
- NEXT: re-run full unit suite (content-map change), then the 12 remaining
  checkpoint docs, push, release prep + one-liner sandbox validation.

## CP-05 · 2026-11-13 ~10:40 — MISSION COMPLETE (release validated + pushed)

- Release artifacts: OWNER-COMMAND.txt v12 (the TRUE one-liner:
  R=5870eaf3…, W=d4736bd8…, D=33304b1…, version 1.0.0-hanaso21-r01) +
  infra/deploy/sandbox-tests/run-h21.sh.
- Drill: **92/92 PASS** (static safety, both delivery paths end-to-end,
  all failure injections abort with nothing executed, idempotent re-run,
  status, rollback round-trip, migrate-fail auto-rollback, KOTODAMA
  isolation sweep). run-deploy04 re-verified 140/140 after the mock
  stdout change; run-deploy05 (v11) retires gracefully.
- Real-network verification: api.github.com 403 from this sandbox's
  rate-limited IP (the exact P2 condition) → the REAL codeload fallback
  delivered the bootstrap with the pinned sha256 byte-for-byte; D
  confirmed on the pushed remote branch.
- Production reality: learn.kotodama.ir still runs 1.0.0-hanaso17-r01 @
  3f41f6ee (the TASK-20 command was never run) → this release jumps
  n17→n21 carrying BOTH releases. The owner runs the one-liner.
- Branch pushed: fix/TASK-HANASO-21-completion-seal (tip d268e16…; the
  release pin D=33304b1… is the last product commit).
- All 14 checkpoint files present; 18 E2E screenshots committed.
- MISSION CLOSED. Next session: read CURRENT_STATE.md (final section).
