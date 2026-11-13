# TASK-HANASO-21 — BUG-011 Commit Hygiene Gate (Phase 3.2)

## The incident (TASK-HANASO-20 audit BUG-011)

A real product fix (the deferred-restart notice) shipped inside commit
`9127c1a` labeled `style(ci): prettier --write` — so the release pin, which
trusts commit labels, silently missed live behavior.

## The existing product fix (preserved, not rewritten)

TASK-HANASO-20 already carried the product-side fix on the branch; it was
reviewed and left untouched (per this mission's brief: "از حذف یا بازنویسی
آن خودداری کن").

## The gate (commit `5142293`)

- `scripts/ci/commit-hygiene.sh` — walks the PUSH RANGE
  (`github.event.before..sha`, fetch-depth 0) and FAILS any commit typed
  `docs(…)`/`style(…)` whose diff touches `apps/web/src`: product changes
  must ride `feat`/`fix`/`refactor`/`test` labels.
- **Deliberate, auditable escape hatch**: an explicit `hygiene-waiver:`
  trailer passes WITH a loud log line — for provably format-only prettier
  sweeps; the claim stays reviewable in the PR forever.
- Not a push event with a resolvable base (first push of a branch) → clean
  skip.
- Wired as an EARLY CI step in `.github/workflows/ci.yml` (before install —
  it only needs git).

## Valid + invalid fixtures (tests)

`tests/unit/commit-hygiene-gate.test.ts` (4 tests) builds throwaway git
fixtures and asserts:

| Fixture | Expected | Verified |
| --- | --- | --- |
| `docs(...)` commit touching `apps/web/src` | FAIL | ✅ |
| `style(...)` commit touching `apps/web/src` | FAIL | ✅ |
| `fix(...)` commit touching `apps/web/src` | PASS | ✅ |
| `docs(...)` commit touching only `ops/` | PASS | ✅ |
| waiver trailer | PASS loudly (logged) | ✅ |
| unresolvable base (first push) | skip | ✅ |

CI on this branch runs the gate on every push — the incompatible-label
changes are detected before they can hide a behavior change again.
