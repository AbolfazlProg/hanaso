# TASK-HANASO-25 — PHASE 8: Release pin + OWNER-COMMAND v14 (CP-09)

## Pins (verified)
- Tooling ref R = 14d9d3abe726d9f585948eb60da587d4feefec4c (TASK-24 CP-07a tip;
  hardened updater with BOTH required env keys; smoke contract current;
  nothing after it touched infra/deploy or scripts/smoke.sh — verified by
  `git log 14d9d3a..HEAD -- infra/deploy/ scripts/smoke.sh` = empty)
- Bootstrap SHA-256 W = d4736bd8d676ac10f8c2832c3888e8f2a95eff72d2088a65088a9c5d85fb2073
  (real sha256 of infra/deploy/bootstrap-hanaso.sh AT commit R — recomputed
  from the git blob; also verified via a bare-mirror fetch + `sha256sum -c`)
- Product target D = 9828640d6ec6028adbe0a0a0cffe9426652c1f34 (branch tip after
  full regression 69 files/787 tests + typecheck + eslint + production build
  green + real-browser E2E 13/13)
- Version 1.0.0-hanaso25-r01 · Branch fix/TASK-HANASO-25-kana-integrity

## Verification performed in this phase
1. Production build: `corepack pnpm build` EXIT 0 (first failure was the dev
   server holding .next; after stopping it: compiled 10.7s, TypeScript clean,
   8/8 static pages, BUILD_ID 70Ar7WCGnwRoLlWR_vTIw).
2. One-liner statics: single line, R/W/D present, independent mapping
   HANASO_DEPLOY_SHA=$R (tooling) / HANASO_TARGET_SHA=$D (product) — never
   confused; api before codeload; sha256sum -c gate chained with &&; no
   placeholders/tokens/TLS-weakening fragments.
3. Bare-mirror sandbox check: bootstrap fetched from the pinned tooling
   commit of a bare mirror → sha256sum -c OK (W matches byte-for-byte).
4. Legacy drill run-h22.sh against the new line: 62/92 — the 30 failures are
   the harness's OWN v13 expectations (version-string h22 fixtures,
   OLD_SHA fixtures, and its .env fixture lacking the TASK-24 keys
   HANASO_SESSION_SECRET/HANASO_LEGACY_TOKEN_CUTOFF that the CURRENT
   updater — correctly — requires). This is a stale-fixture issue, not a
   defect of the line; documented honestly in OWNER-COMMAND.txt §HONESTY.
   A run-h25 refresh of the fixture is the known follow-up.
5. Prettier: this mission's touched files formatted + committed (9828640).
   Historical drift in untouched files predates the branch (27 files at the
   tooling pin, 76 at h22) — out of scope, not regressed by us.

## Not done (honest)
- The full 92-assertion sandbox drill with a REFRESHED fixture (run-h25.sh)
  was not completed within this session's budget; the delivery-layer
  mechanics that matter (multi-path download, SHA-256 gate, pin resolution
  against a mirror) were verified directly as above.
- No deploy/restart was performed (owner runs the line) — per directive.
