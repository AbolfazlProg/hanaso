# TASK-HANASO-21 — CURRENT STATE (recovery point)

> Last updated: 2026-11-13 ~09:05 (Asia/Tehran) · Session resumed from context loss.
> Read this file FIRST, then `CHECKPOINT_LOG.md`, then `git log --oneline -8` + `git status`.

## Mission

TASK-HANASO-21 — Final Bug Remediation, Lesson Completion Reliability & AIZEN Seal.
Base: latest valid commit of `fix/TASK-HANASO-20-onboarding`. Branch: `fix/TASK-HANASO-21-completion-seal`.
Deliverable contract: the final reply to the owner MUST end with the complete one-line
VPS update command in a code block (real bootstrap SHA + real product target commit, no
placeholders, sandbox-validated). `OWNER-COMMAND.txt` is only the backup document.

## Git state (verified 2026-11-13 09:00)

- Branch: `fix/TASK-HANASO-21-completion-seal` (NOT pushed yet — no `origin/fix/TASK-HANASO-21-completion-seal`).
- Base: `2719e5d` (docs(ops) TASK-HANASO-20 deploy05 drill result) — i.e. TASK-HANASO-20
  branch tip, one commit after the reported target `2574788` (that commit only added the
  drill report doc; verified no product change: docs-only, touches `ops/checkpoints/TASK-HANASO-20/RELEASE_VALIDATION.md`).
- Reported TASK-HANASO-20 target commit `2574788c36521cec6ac0673488b769e77a8ab982` IS in history (verified).
- 5 TASK-21 commits on top (all local):

| SHA | What |
| --- | --- |
| `5204883` | P0 final-completion reliability (owner-observed 409 dead end) |
| `471f731` | AIZEN completion seal (Aizen no inkan, hanko SVG + ceremony) |
| `90ca72c` | BUG-009 — third option for every rule-listening pair (2AFC retired) |
| `5142293` | BUG-011 — commit hygiene CI gate |
| `2ef6630` | OBS-001..010 adjudicated and implemented |

- Uncommitted: `apps/web/scripts/tl08-a4-audio-gen.mjs` (+42: `contrastAndExerciseWords()`
  extractor — sweeps rule-step/rule-contrast words, a/b pair sides, kana-decode/rule-listening
  promptJa) — Phase 3.4 in progress.
- Untracked: `apps/web/tests/unit/h21-audio-inventory.test.ts` (SCRATCH inventory test).

## Phase status

| Phase | Status |
| --- | --- |
| 0 — recovery + TASK-20 docs | DONE (prior session) |
| 1 — P0 completion bug | DONE, committed `5204883` (root cause: stale `firstTryCorrect` closure in auto-next timer → perfect walk scored (N-1)/N → 409 `completion_not_met` on stn-kana-k8 2/3 & stn-kana-k12-foreign 1/2 → generic retry re-sent same stale score forever. Fix: sync mirror ref, late-bound advance, structured 409 payload, criterion-failure panel with redo-final-block-only, single-flight complete, bounded (3s) pre-complete walk-sync await) |
| 2 — AIZEN seal | DONE, committed `471f731` (vermilion shu hanko, 藍染 relief-negative tategaki, carved inner ring, ink-skip chips, −8° tilt, grain filter; enter→press→squash→halo→settle on `--dur-ceremonial`; stamps ONLY on fresh 200, `already:true` settles, replay end carries no seal, reduced-motion = fade) |
| 3.1 — BUG-009 | DONE, committed `90ca72c` (13+1 rule-listening pairs get a 3rd option from their own documented error family; validation gate [2]→[2,3]) |
| 3.2 — BUG-011 | DONE, committed `5142293` (scripts/ci/commit-hygiene.sh walks push range, fails docs/style touching apps/web/src, hygiene-waiver: trailer escape hatch; 4 fixture tests) |
| 3.3 — OBS-001..010 | DONE, committed `2ef6630` (adjudication summary in commit message; FULL table must be in `OBSERVATION_REMEDIATION.md` — NOT YET WRITTEN) |
| 3.4 — new-word audio | IN PROGRESS: gen script extractor extended (uncommitted); inventory: 160 referenced words, 125 committed, 35 pending of which 6 are `___` template scaffolds (not synthesizable) → ~29 real pending words. VOICEVOX: NOT reachable from this sandbox (no local service at 127.0.0.1:50021, no docker, no SSH to VPS) → per brief: prepare honestly, document limitation, DO NOT claim generation. UI honesty (no broken play buttons) still to verify. |
| 4 — protect TASK-20 wins | Unit suite green at each commit (731..735/735); full re-verify pending |
| 5 — regression + E2E | NOT STARTED. TASK-20 baseline: 718 unit / 22 E2E / 31 responsive / 100 drill. Current unit count at HEAD: 735 (+scratch inventory test). |
| 6 — checkpoint docs | NOT STARTED — this file is the first artifact. 14 files required (list in CHECKPOINT_LOG.md). |
| 7 — release prep | NOT STARTED (version: continue after `1.0.0-hanaso20-r01` → `1.0.0-hanaso21-r01`; bootstrap `infra/deploy/bootstrap-hanaso.sh` pinned at R=`5870eaf3892c7cb8a1bcfa3ec058d77474e3ad10` W=`d4736bd8…` in TASK-20 v11 — MUST recompute from the ref actually used; verify bootstrap changed-or-not since) |
| 8 — one-liner in final reply | NOT STARTED (contract: true ONE LINE, no placeholder, real SHAs, sandbox-tested) |

## Audio pending list (from scratch inventory run 2026-11-13 08:58)

Real pending (29, gen surface covers ALL of them — "PENDING not covered by the gen surface: (none)"):
`ええ かぎ かぜ がこう きゃく きゅう きよう くうき けっか さっき さんすう ざせき せん ちゅうごくじん とうきょう ば ぱ ぱん びょういん らーめん ケーキ コヒー コーラ タクシー ティッシュ ネコ ファイル フアイル ヴァイオリン`
(+6 `___` template scaffolds excluded from synthesis by design.)

## Environment facts

- Repo: `/home/z/my-project/hanaso21` (workdir). Remote `origin` = https://github.com/AbolfazlProg/hanaso.git (public; anonymous fetch OK; push needs PAT supplied by owner in brief).
- VPS: NOT SSH-reachable from this sandbox (no keys). Prod `https://learn.kotodama.ir/api/health` returns 200 (reachable read-only).
- Production currently runs `1.0.0-hanaso20-r01` (TASK-HANASO-20, target `2574788`… confirmed via /api/health commit field — RE-VERIFY at release time).
- Test runner: `cd apps/web && npx vitest run` (unit), EQA = part of unit suite; tsc+eslint via package scripts (check package.json).
- E2E methodology from TASK-20: Playwright against local dev/preview server (see TASK-20 TEST_RESULTS.md for exact commands).

## NEXT ACTIONS (in order)

1. Finish Phase 3.4: verify UI honesty for words without audio (how play buttons gate on committed assets), finalize/replace the scratch inventory test, commit gen-script extension as the honest "assets prepared for VPS run" change.
2. Phase 5 regression: full unit + EQA + tsc + eslint.
3. Phase 5 E2E: real-browser completion walk (new user, first lesson, to the end) + AIZEN seal (fresh stamp, refresh persistence, replay no-seal) + responsive spot checks. Screenshots into `screenshots/`.
4. Write the 13 remaining checkpoint docs (content largely derivable from the 5 commit messages + test evidence; OBSERVATION_REMEDIATION.md must carry the FULL 10-row adjudication table).
5. Commit checkpoints; push branch with PAT; record pushed SHA.
6. Phase 7: set version `1.0.0-hanaso21-r01`, decide bootstrap pin (check if `infra/deploy/bootstrap-hanaso.sh` changed since `5870eaf`), compute SHA-256, build the ONE-LINE command, sandbox-validate it (download via api.github.com + codeload fallback, hash check, bash -n syntax, dry health-gate logic), run owner smoke where possible.
7. Final reply: summary + answers to the 22 questions + THE ONE-LINER as the last operational content.
