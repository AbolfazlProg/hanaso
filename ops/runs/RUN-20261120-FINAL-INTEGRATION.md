# RUN-20261120 — FINAL-INTEGRATION: Chapter-01 Part-1 + Part-2 onto merged main, deployed to production

> Owner order: «FINAL INTEGRATION — CHAPTER 01 PART 1 + PART 2» (2026-11-20) · executor: Z.ai
> Production: **https://hanaso.ir** (the live app; see «Environment notes» for learn.kotodama.ir)
> Release SHA: **`a7f53257f8835eca3442d2b5384ae96b1d03edf4`** — previous production SHA: **`c9f74d4ed0777169b4d1d48b344c10098b1586f0`**

## 1. Integration (PR-based, no force push, no destructive reset)

| Step | Action                                                                                                                                                      | Result                                                                                                                                                                                                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **PR #129 (Part-1) squash-merged → main**                                                                                                                   | `3df44b1` · CI success (run 44796580764). The repo allows squash only (`allow_merge_commit=false`, `allow_rebase_merge=false`), so `delete_branch_on_merge` deleted `fix/chapter01-part1` and open PR #130 auto-retargeted to main (display diff became 33 files = Part-1 duplication) |
| 2    | **Integration branch** `fix/chapter01-part2-integration` off the merged main; the **12 Part-2 commits (`b0229dd..130d765`) cherry-picked** — zero conflicts | No-duplication proof: `git diff 130d765..HEAD` = exactly the 9 finalization files (the other agent's work); PR diff vs main = exactly the 25 Part-2 files                                                                                                                              |
| 3    | **PR #131** opened (base=main) → CI all-green (main battery + compose smoke) → **squash-merged**                                                            | main = **`a7f5325`** · CI on `a7f5325`: main battery success · compose-smoke success · **image → GHCR success** (tag = SHA)                                                                                                                                                            |
| 4    | **PR #130 closed as superseded** with an explanatory comment                                                                                                | No duplicate application of Part-2                                                                                                                                                                                                                                                     |

## 2. Compatibility control (the merged tree)

- Local gates on the integration branch (tree identical to `a7f5325`): `format:check` ✓ · `typecheck` ✓ · `lint` ✓ · `vitest` **87 files / 931 tests** ✓ · `pnpm build` ✓
- The 931-suite carries BOTH missions: Part-1's t29 release guards + Part-2's 5 new suites (translit-standard, part2-fsrs-review, part2-realworld, part2-name, part2-full-walk incl. the 38-node real-API walk)
- **Real-browser verification on the integrated app** (dev server, in-memory DEV-ONLY stores — the documented local path; no DB):
  - FSRS loop end-to-end: h0+h1 via the REAL station API → `/review` shows «۵ کارت برای مرور — ۱ / ۵» → recall → reveal → the four scheduling ratings (دوباره/سخت/خوب/آسان) → «خوب» → queue advances to ۲/۵ — **8/8 PASS**
  - h0 NOTE-BUG1 fix intact: dialogue CTA «ادامهٔ درس — جمع‌بندی» anchors the walk → `?block=blk-stn-kana-h0-wrapup` → step ۳/۳ renders — **3/3 PASS**
  - Honest enforcement: completing without a graded exercise is refused (`station/no_graded_answers`, Persian message) · `score: null` is the API contract
  - **No numeric scoring** anywhere on learner surfaces (sweep over learn/station/review/home)
  - Preview: `/preview/locks` + `/preview/enter` → **404 fail-closed** without the feature flag (no feature hint for ordinary users)
- CI on `a7f5325` (main): format/lint/typecheck/test/integration(PG18 real)/build/audit/smoke = success · compose smoke (real image · pgbouncer path · backup drill) = success · image → GHCR = success

## 3. Production deploy (via the Web Terminal, as ordered)

- Production is the app behind **https://hanaso.ir** on the current VPS (`hostname: hanaso`) — web+worker containers from the CI image, real PostgreSQL 18 + pgbouncer, compose files `docker-compose.shared-vps.yml + docker-compose.hanaso-ir-1core.yml` under `/opt/hanaso-src/infra/deploy/learn-kotodama/`
- Access: **ops.hanaso.ir Web Terminal** (the ops-terminal panel) → root shell (ttyd → tmux «ops») — authenticated (edge basic auth; nothing printed or stored outside the server)
- Deploy script `/root/deploy-a7f5325.sh` was transferred **base64 in 6 chunks and SHA-256-verified on the server** (`723b0ceacc538b5ee64811c65abe35321156ec379b48c702edfbdc691ac81656` — byte-identical to the local pin), modeled on the established `deploy-c9f74d4.sh` staged-swap pattern
- Steps executed (all green, log `/root/deploy-a7f5325.log`):
  1. state snapshot + `PREV_IMAGE` recorded
  2. **SAFETY BACKUP**: read-only `pg_dump` (669,595 bytes) + `.env` copy → `/root/hanaso-backups/db-pre-final-integration-20261120T193335Z.sql` + `env-pre-…` — **no user data modified**
  3. src checkout force-synced to `a7f5325…` (mismatch-checked)
  4. CI image pulled from GHCR (`ghcr.io/abolfazlprog/hanaso:a7f5325…`) + retagged `hanaso-web:a7f5325…` (1.27GB)
  5. `.env` image-line swap only — **`UNLOCK_ALL_MODE=1` preserved exactly as the owner set it**
  6. migrate one-shot (migrate + seed) — ok · draft station rows verified
  7. recreate web+worker — **postgres/pgbouncer untouched** (Up 26h continuous)
  8. health gate: `/api/health` reports the NEW commit → **NEW SHA LIVE** · `/api/ready` ok
  9. probes: `/learn` public index ✓ · ch2-draft refs ✓ · draft walk API 200 (no preview cookie) ✓ · `/review` 200 ✓ (one probe used the wrong verb — `/api/review` GET 405 because the queue lives at **`/api/review/queue`**; re-probed: honest FSRS-6 JSON)
  10. rollback artifact check: image chain `a7f5325` → `c9f74d4` → `b46b948` → `e2f05c0` all retained

## 4. Post-deploy verification (from OUTSIDE the VPS)

- `https://hanaso.ir/api/health` → `"commit":"a7f53257f8835eca3442d2b5384ae96b1d03edf4"` · env production
- `/api/ready` → process ok · database ok (SELECT 1 via the app pool, PG 18.6)
- `/learn` 200 · `/review` 200 · `/` 200
- `/api/review/queue` → `{"ok":true,"data":{"engine":"FSRS-6","status":"integrated","dueCount":0,"due":[]}}` — the integrated review system live, honest empty for a fresh visitor

## 5. Rollback

- One-liner (printed by the deploy script, also in the log):
  `sed -i s|^HANASO_WEB_IMAGE=.*|HANASO_WEB_IMAGE=hanaso-web:c9f74d4ed0777169b4d1d48b344c10098b1586f0| /opt/hanaso-src/infra/deploy/learn-kotodama/.env && docker compose -f docker-compose.shared-vps.yml -f docker-compose.hanaso-ir-1core.yml --env-file /opt/hanaso-src/infra/deploy/learn-kotodama/.env up -d web worker`
- DB restored if ever needed: `/root/hanaso-backups/db-pre-final-integration-20261120T193335Z.sql` (the deploy itself never touched the database)

## 6. Environment notes (pre-existing, NOT caused by this deploy — untouched)

- **`learn.kotodama.ir` DNS still points at the OLD server IP (87.107.129.210) which does not answer** — the live production is `hanaso.ir` (45.135.242.140). The owner may want to repoint or retire that record.
- `kotodama.ir` (old shared server) is likewise unreachable — pre-existing; this deploy has no relation to it and changed nothing outside the hanaso compose project.
- Sandbox-local git worktrees were lost in a sandbox restore mid-mission; all work continued from the GitHub remote (the single source of truth) after a fresh clone — zero local-only commits existed.
