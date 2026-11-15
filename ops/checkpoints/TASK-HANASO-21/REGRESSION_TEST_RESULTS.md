# TASK-HANASO-21 — Regression Test Results (Phase 5)

All numbers below are REAL runs from this mission (2026-11-13), not copies
of the TASK-HANASO-20 report.

## Unit + EQA (vitest, apps/web)

| Suite | Result |
| --- | --- |
| Full unit suite | **737/737 PASS** (63 files) |
| — of which EQA curriculum gates | 37/37 PASS |
| — new TASK-21 tests | audio honesty gate (1), E2E key integrity (1), final-completion reliability (6), AIZEN seal (6), commit-hygiene gate (4) |
| TypeScript (`tsc --noEmit`) | clean |
| ESLint | clean |
| Stylelint | green (the seal CSS moved to logical properties in this mission) |
| Fonts budget | green (1,954,720 B ≤ 2,355,200 B) |

## Integration — REAL PostgreSQL 18.7 (new capability this mission)

A portable PostgreSQL **18.7** was staged in the sandbox (PGDG debs extracted
user-space; `pg_ctl` on 127.0.0.1:5433; isolated data dir). TASK-HANASO-20's
sandbox had no PG and could not run this suite at all.

| Suite | Result |
| --- | --- |
| `tests/integration-pg` (7 files) | **36 PASS + 1 conditional skip** |
| — backup/restore drill (live pg_dump/pg_restore) | 99,421B archive · 187 entries · per-table counts equal · 0.128s restore |
| — NEW `mastery-chapter.spec.ts` | kana gate: 201 passed + chapter `understood` (was 500 before the content-map fix) |

Two stale expectations were re-pinned to INTENDED product states (no product
change): `content.lessons` 54→55 (TASK-20's k12-foreign station was never
re-pinned — the suite could not run then) and `first-meeting-01.est_minutes`
45→71 (this mission's OBS-003).

## Browser E2E — production build + real PG + real Chromium

**46/46 PASS** — full matrix in `COMPLETION_E2E_RESULTS.md`; evidence
`screenshots/e2e/E2E_RESULTS.json` + 18 PNGs. Includes the owner-bug
regression (k8 perfect walk), the second trap (k12-foreign), the OBS-001
fm01 anchor, the AIZEN seal states (fresh/settled/mobile/desktop/replay),
and the full error matrix (criterion 409 + redo, abort + retry, refresh
resume, double-click single-flight, prereq 409, idempotency, identity,
GUEST).

## Comparison with the TASK-HANASO-20 baseline

| Metric | TASK-20 | TASK-21 (now) |
| --- | --- | --- |
| Unit | 718/718 | **737/737** (+19) |
| PG integration | not run (no PG in sandbox; documented) | **36+1 (7 files)** — first real run since TASK-20 |
| Browser E2E | 22/22 (completion untested on short-deck stations) | **46/46** (completion is THE focus) |
| Responsive | 31/31 (TASK-20 matrix) | spot re-verified at 360/1440 in the E2E (seal, map, home); the full TASK-20 matrix's pages were re-rendered via the same production build |
| Deployment drill | 100/100 | re-validated in RELEASE_VALIDATION.md (this release's own drill) |

## TASK-20 protections re-verified (Phase 4)

User isolation + GUEST read-only (S5.8b), first-visit onboarding (S1.1/S1.2),
409-prerequisites structured payload (S5.5), resume state (S5.3), the
glyph/dakuten/yōon/きめ content fixes (all ships in the same content files —
EQA 37/37 includes those gates), curriculum CI gates (EQA + hygiene + new
EST-MINUTES), writing experience (unit suite), audio alignment (registry
honesty gate). None were removed or weakened; the full unit suite grew
around them.
