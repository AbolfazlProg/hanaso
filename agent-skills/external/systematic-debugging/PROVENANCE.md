# PROVENANCE — systematic-debugging (EXT-004)

> Mandatory provenance record for every vendored external skill (TASK-ENG / Issue #75).
> Canonical registry: `docs/engineering/skills/SKILL_REGISTRY.md` · Security audit: `docs/engineering/skills/SKILL_SECURITY_AUDIT.md` · Selection matrix: `docs/engineering/skills/SKILL_SELECTION_MATRIX.md`

| Field                            | Value                                                                                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skill ID                         | EXT-004                                                                                                                                                  |
| Name                             | systematic-debugging                                                                                                                                     |
| Category                         | QA / Process (root-cause debugging)                                                                                                                      |
| Priority                         | P1                                                                                                                                                       |
| Source repository                | https://github.com/obra/superpowers                                                                                                                      |
| Source path                      | skills/systematic-debugging                                                                                                                              |
| Pinned commit (version)          | `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b`                                                                                                               |
| License                          | MIT — Copyright (c) 2025 Jesse Vincent (LICENSE in this folder)                                                                                          |
| Upstream stars at review         | 310,809 (repo-level, 2026-11-02)                                                                                                                         |
| Upstream last push               | 2026-10-29                                                                                                                                               |
| Installed on                     | 2026-11-02 (TASK-ENG, Issue #75)                                                                                                                         |
| Last verified                    | 2026-11-02                                                                                                                                               |
| Maintainer (upstream)            | Jesse Vincent (obra)                                                                                                                                     |
| Security review                  | PASS — `find-polluter.sh` reviewed line-by-line (safe bisection over `npm test`, read-only checks); companions are guidance text.                        |
| Trigger conditions               | Any bug, test failure, unexpected behavior, performance problem, build failure or integration issue — BEFORE proposing fixes.                            |
| Required tools                   | None mandatory (find-polluter.sh optional; adapt the runner to `corepack pnpm test`).                                                                    |
| Limitations / project precedence | Cross-references to `superpowers:test-driven-development` resolve to EXT-003; `superpowers:verification-before-completion` resolves to internal SKL-010. |
| Dependencies                     | References root-cause-tracing.md, defense-in-depth.md, condition-based-waiting.md (+ TS example), find-polluter.sh — all vendored.                       |
| Local adaptations                | Excluded upstream dev/eval artifacts: `test-pressure-1..3.md`, `test-academic.md`, `CREATION-LOG.md`. No content changes.                                |
| Status                           | Active                                                                                                                                                   |

## Update rules

Upstream changes are NEVER pulled automatically. Follow
`docs/engineering/skills/SKILL_MAINTENANCE_POLICY.md`: fetch → diff → re-run
`scripts/audit-external-skills.py` → human review → replace via PR, and update
this file (pinned commit, dates, verdicts).
