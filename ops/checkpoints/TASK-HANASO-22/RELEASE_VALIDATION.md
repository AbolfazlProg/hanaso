# TASK-HANASO-22 — Release Validation (delivery layer)

> Run date: 2026-11-13 · Written AFTER the runs (never before). All numbers
> below are from executions in this session, logged in this file as they
> finished.

## Release identity

| Item | Value |
| --- | --- |
| Branch | `feat/TASK-HANASO-22-learning-experience` (pushed) |
| Branch tip at drill time (pushed) | `3c107eeaa103c52969a8efb0412e42fd7e2fc4fb` |
| **Product target commit (D)** | **`3d8b8ccd201dd503e403a6e5912351f68556d6e5`** (`3d8b8cc` — test(e2e)+docs CP-03; the last commit carrying product code — button feedback polish in `apps/web/src` + the h22 E2E runner; every commit after it is docs/ops only, verified by `git diff 3d8b8cc..HEAD --stat -- apps packages public db` = empty) |
| Release version | **`1.0.0-hanaso22-r01`** |
| Bootstrap tooling ref (R) | `5870eaf3892c7cb8a1bcfa3ec058d77474e3ad10` (unchanged since TASK-HANASO-20; `git diff R..HEAD -- infra/deploy/{bootstrap-hanaso,update-hanaso,rollback,deploy}.sh` empty) |
| Bootstrap SHA-256 (W) | `d4736bd8d676ac10f8c2832c3888e8f2a95eff72d2088a65088a9c5d85fb2073` (matches the git blob at R AND a REAL codeload.github.com download — below) |
| Delivery command | ONE LINE (OWNER-COMMAND.txt **v13**) — R and D are INDEPENDENT values in their correct slots (`HANASO_DEPLOY_SHA`=R tooling, `HANASO_TARGET_SHA`=D product, `HANASO_TARGET_VERSION`=1.0.0-hanaso22-r01) |

## Production reality check (verified live 2026-11-13T14:47Z)

`https://learn.kotodama.ir/api/health` → `ok:true`, **version
`1.0.0-hanaso21-r01`, commit `33304b1f…`, uptimeSec 14889 (~4h)** — the
owner HAS run the v12 one-liner, so production already carries TASK-HANASO-21.
The H22 release therefore jumps **n21 → n22**. The drill fixture mirrors
exactly this state (the h21 drill's n17 fixture is retired with it).

**Production is NOT deployed by this mission — the owner runs the one-liner.**

## Mission test evidence (product layer, from TEST_RESULTS.md)

| Suite | Result |
| --- | --- |
| Unit | 737/737 · 63 files |
| Integration in-memory | 32/32 |
| EQA content gates | 37/37 |
| Browser E2E — H21 regression | 44/44 |
| Browser E2E — H22 (H1..H8, incl. mobile viewport + real practice flow) | 25/25 |
| Production build | green (16 pre-existing audio-manifest warnings) |

## Delivery-layer drills (executed in this session)

| Drill | Result |
| --- | --- |
| **run-h22.sh (THE v13 one-liner — current)** | **92/92 PASS** — the EXACT line from OWNER-COMMAND.txt executed UNMODIFIED, only its environment redirected (mock curl serves REAL git blobs from a local bare mirror; mock docker/df; anonymous `file://` git transport) |
| run-h21.sh (v12) | **SKIP (v12 retired)**, exit 0 — retired gracefully, same contract as run-deploy05 before it |
| run-deploy05.sh (v11) | **SKIP (v11 retired)**, exit 0 |
| run-deploy04.sh (updater mechanics regression) | **140/140 PASS** |

### run-h22.sh scenario detail (92 assertions, 0 failures)

| Group | What was proven with the real pins (R=5870eaf3, D=3d8b8cc, v=1.0.0-hanaso22-r01) |
| --- | --- |
| P0 static safety (20) | exactly ONE one-liner; single `bash -c '…'` line; R≠D; both commits exist; W matches the blob at R; handoff `HANASO_TARGET_VERSION="1.0.0-hanaso22-r01" HANASO_DEPLOY_SHA="$R" HANASO_TARGET_SHA="$D"`; api before codeload; `sha256sum -c -` chained with `&&`; no placeholders / TLS-weakening / latest / token / wget / raw paths |
| P1 happy path (14) | full end-to-end n21→n22 via api.github.com: anonymous clone, `target commit verified : 3d8b8ccd…`, `integrity OK`, `target release : 1.0.0-hanaso22-r01 @ 3d8b8ccd201d`, .env switched to `ghcr.io/abolfazlprog/hanaso:3d8b8cc…`, docker build, one-shot migrate, `UPDATE COMPLETE — HANASO 1.0.0-hanaso22-r01`, health gate matched, `smoke: ALL GREEN` (pinned worktree smoke — the stale deploy-dir copy did NOT gate), KOTODAMA witness |
| P2 rate limit (7) | real curl 403 text shown verbatim; codeload fallback; api-before-codeload order asserted; update still completed |
| P3 TLS-blocked api (4) | codeload fallback; update completed |
| P4 both down (6) | honest abort; both real error texts visible; NO workspace created; .env untouched; zero docker calls |
| P5 corrupt tarball (5) | extraction abort; nothing executed |
| P6 tampered bootstrap (6) | REAL SHA-256 gate rejected it (`FAILED`); nothing executed |
| P7 HTML page (5) | hash gate rejected it; nothing executed |
| P8 idempotent re-run (7) | second run = no-op at the pinned target («already running target commit»); no rebuild / migrate / compose-up |
| P9 status (7) | read-only; reports current 1.0.0-hanaso21-r01 AND target 1.0.0-hanaso22-r01; zero mutations |
| P10 rollback round-trip (8) | update → `rollback` (`.env` restored to the n21 image, smoke green on the rolled-back generation) → re-update |
| P11 migrate failure (5) | automatic app rollback; DB backup still recorded |
| P12 global sweep (1) | no `compose down`, no non-hanaso container touched, no global docker mutation, no `rm -rf`, no TLS weakening, no raw path / no `--resolve` — across ALL scenarios |

## REAL-network verification (beyond the mocks)

Executed against the REAL GitHub from this sandbox, anonymous, exactly the
one-liner's two download paths at pin R:

- `api.github.com` contents API → **HTTP 403** (this sandbox IP is
  rate-limited — the honest P2 condition, not a regression).
- `codeload.github.com` tarball → **download OK**; extracted
  `infra/deploy/bootstrap-hanaso.sh` at R hashes to
  `d4736bd8d676ac10f8c2832c3888e8f2a95eff72d2088a65088a9c5d85fb2073` —
  **byte-identical to the pin W**. The v13 line's fallback chain therefore
  works verbatim on the real network from this very machine.

## What the owner should do

Paste the ONE line from `OWNER-COMMAND.txt` (v13) as root on the VPS. Optional
subcommands `status` / `rollback` go INSIDE the quotes, before the final quote.
Nothing else; no token, no password. Database and volumes are never touched by
`rollback`; KOTODAMA/HAProxy/BBB are never touched at all.
