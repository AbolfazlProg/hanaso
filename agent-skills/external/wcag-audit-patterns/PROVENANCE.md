# PROVENANCE — wcag-audit-patterns (EXT-007)

> Mandatory provenance record for every vendored external skill (TASK-ENG / Issue #75).
> Canonical registry: `docs/engineering/skills/SKILL_REGISTRY.md` · Security audit: `docs/engineering/skills/SKILL_SECURITY_AUDIT.md` · Selection matrix: `docs/engineering/skills/SKILL_SELECTION_MATRIX.md`

| Field                            | Value                                                                                                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skill ID                         | EXT-007                                                                                                                                                                                                                    |
| Name                             | wcag-audit-patterns                                                                                                                                                                                                        |
| Category                         | Accessibility                                                                                                                                                                                                              |
| Priority                         | P1                                                                                                                                                                                                                         |
| Source repository                | https://github.com/wshobson/agents                                                                                                                                                                                         |
| Source path                      | plugins/accessibility-compliance/skills/wcag-audit-patterns                                                                                                                                                                |
| Pinned commit (version)          | `7e2fb559cf4b824b27f1fec49fe88f7511066d26`                                                                                                                                                                                 |
| License                          | MIT — Copyright (c) 2024 Seth Hobson (LICENSE in this folder)                                                                                                                                                              |
| Upstream stars at review         | 42,092 (repo-level, 2026-11-02)                                                                                                                                                                                            |
| Upstream last push               | 2026-11-02                                                                                                                                                                                                                 |
| Installed on                     | 2026-11-02 (TASK-ENG, Issue #75)                                                                                                                                                                                           |
| Last verified                    | 2026-11-02                                                                                                                                                                                                                 |
| Maintainer (upstream)            | Seth Hobson (wshobson) — active maintainer, large verified catalog                                                                                                                                                         |
| Security review                  | PASS — no scripts, no external URLs, no risky instructions.                                                                                                                                                                |
| Trigger conditions               | WCAG 2.2 audits; fixing accessibility violations; implementing accessible components; pre-release a11y review.                                                                                                             |
| Required tools                   | None (pair with axe in E2E per docs/testing/TESTING.md).                                                                                                                                                                   |
| Limitations / project precedence | RTL/bilingual specifics (Persian RTL + Japanese LTR ruby/bidi) live in SKL-003, which stays authoritative; combine both on bilingual work. Persian/Arabic-script contrast and ALREQ nuances are NOT covered by this skill. |
| Dependencies                     | references/details.md (vendored).                                                                                                                                                                                          |
| Local adaptations                | None — vendored verbatim (skill folder extracted from its plugin).                                                                                                                                                         |
| Status                           | Active                                                                                                                                                                                                                     |

## Update rules

Upstream changes are NEVER pulled automatically. Follow
`docs/engineering/skills/SKILL_MAINTENANCE_POLICY.md`: fetch → diff → re-run
`scripts/audit-external-skills.py` → human review → replace via PR, and update
this file (pinned commit, dates, verdicts).
