# TASK-HANASO-21 — Release Validation (Phase 7)

## Release identity

| Item | Value |
| --- | --- |
| Branch | `fix/TASK-HANASO-21-completion-seal` (pushed) |
| Branch tip (pushed) | `d268e162488f3c21ea0b1cb052dd964ac1eebc80` |
| **Product target commit (D)** | **`33304b1f2b402d70c3090f447d44e2139adcc6b7`** — the last commit carrying product code; every commit after it is docs/ops only |
| Release version | **`1.0.0-hanaso21-r01`** |
| Bootstrap tooling ref (R) | `5870eaf3892c7cb8a1bcfa3ec058d77474e3ad10` (unchanged since TASK-HANASO-20; verified byte-identical) |
| Bootstrap SHA-256 (W) | `d4736bd8d676ac10f8c2832c3888e8f2a95eff72d2088a65088a9c5d85fb2073` |
| Delivery command | ONE LINE (OWNER-COMMAND.txt v12) — R and D are INDEPENDENT values in their correct slots (`HANASO_DEPLOY_SHA`=R tooling, `HANASO_TARGET_SHA`=D product, `HANASO_TARGET_VERSION`=1.0.0-hanaso21-r01) |

## Production reality check (verified live 2026-11-13)

`https://learn.kotodama.ir/api/health` → `ok:true`, **version
`1.0.0-hanaso17-r01`, commit `3f41f6ee…`** — the owner never ran the
TASK-HANASO-20 update command, so production still runs HANASO-17. The
TASK-21 release therefore jumps **n17 → n21** and carries BOTH releases'
fixes (TASK-20's onboarding/isolation/409/content work rides inside the
TASK-21 target commit). The drill fixture mirrors exactly this state.

**Production is NOT deployed by this mission — the owner runs the one-liner.**

## Phase-7 checklist (brief) → evidence

| # | Requirement | Result |
| --- | --- | --- |
| 1 | Production build | ✅ `next build` green (twice: before E2E, and with the content-map fix) + `bundle-tools` (.tools/db-cli + worker) |
| 2 | Final image pinned | ✅ the updater builds `ghcr.io/abolfazlprog/hanaso:<D>` FROM the pinned commit on the VPS (no pull, no drift) |
| 3 | Version chosen | ✅ `1.0.0-hanaso21-r01` (continues the line after 1.0.0-hanaso20-r01) |
| 4 | Full target commit recorded | ✅ `33304b1f2b402d70c3090f447d44e2139adcc6b7` |
| 5 | Existing bootstrap reviewed | ✅ unchanged since R=5870eaf (`git diff R..HEAD -- bootstrap` empty); self-integrity check re-verified by the drill |
| 6 | Exact SHA-256 computed | ✅ `d4736bd8…` — matches the git blob at R AND a REAL codeload.github.com download (byte-for-byte) |
| 7 | Bash syntax checked | ✅ `bash -n` on the drill; the drill then EXECUTED the exact line |
| 8 | One-liner tested in sandbox with the final values | ✅ **`run-h21.sh`: 92/92** (P0 static safety, P1 happy path full end-to-end, P2 api-403→codeload, P3 api-TLS→codeload, P4 both-down abort, P5 garbage abort, P6 tamper→hash-gate reject, P7 HTML→hash-gate reject, P8 idempotent re-run, P9 status, P10 rollback round-trip, P11 migrate-fail auto-rollback, P12 KOTODAMA/isolation sweep) |
| 9 | Download + hash validation tested | ✅ drill P1–P7 + REAL network: api.github.com 403 in this sandbox (its IP is rate-limited — exactly the P2 condition) → the real codeload fallback delivered the bootstrap with the pinned hash |
| 10 | Health gate tested | ✅ drill P1 (health gate matched 1.0.0-hanaso21-r01), P11 (rollback health gate) |
| 11 | Home smoke tested | ✅ drill P1 «smoke: ALL GREEN» (the PINNED worktree smoke, not the stale deploy-dir copy) |
| 12 | User isolation tested | ✅ E2E S5.8b (GUEST clean state) + the full unit suite (isolation tests green) |
| 13 | Lesson completion smoke tested | ✅ E2E 46/46 incl. the owner-bug stations k8/k12-foreign |
| 14 | AIZEN seal tested in a real browser | ✅ E2E S1.4/S2.4/S3.2/S4.2–4 + VLM design review of the screenshots |
| 15 | Rollback tested in an isolated environment | ✅ drill P10 (update→rollback→update) + P11 (migrate-failure auto-rollback, DB backup recorded) |

## Drill totals

| Drill | Result |
| --- | --- |
| **run-h21.sh (THE v12 one-liner — current)** | **92/92 PASS** |
| run-deploy04.sh (updater mechanics — re-run after the mock change) | 140/140 PASS |
| run-deploy05.sh (v11 heredoc) | retired gracefully — v11 is history; its mechanics are re-covered by run-h21.sh through the new entrypoint |

## If the command changes after this validation

Per the mission rule: any post-validation change to the one-liner
invalidates this document — all validations must be re-run
(`bash infra/deploy/sandbox-tests/run-h21.sh`). The command in the final
report is byte-identical to the one pinned in OWNER-COMMAND.txt and drilled
here.

## Optional post-deploy step (NOT part of the one-liner)

The 29 pending word-audio assets need one VOICEVOX run on the VPS — see
`AUDIO_REMEDIATION.md` for the exact command and the honesty contract.
