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
