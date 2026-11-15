# PROVENANCE — stride-analysis-patterns (EXT-010)

> Mandatory provenance record for every vendored external skill (TASK-ENG / Issue #75).
> Canonical registry: `docs/engineering/skills/SKILL_REGISTRY.md` · Security audit: `docs/engineering/skills/SKILL_SECURITY_AUDIT.md` · Selection matrix: `docs/engineering/skills/SKILL_SELECTION_MATRIX.md`

| Field                            | Value                                                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skill ID                         | EXT-010                                                                                                                                                        |
| Name                             | stride-analysis-patterns                                                                                                                                       |
| Category                         | Security — Threat Modeling                                                                                                                                     |
| Priority                         | P2                                                                                                                                                             |
| Source repository                | https://github.com/wshobson/agents                                                                                                                             |
| Source path                      | plugins/security-scanning/skills/stride-analysis-patterns                                                                                                      |
| Pinned commit (version)          | `7e2fb559cf4b824b27f1fec49fe88f7511066d26`                                                                                                                     |
| License                          | MIT — Copyright (c) 2024 Seth Hobson (LICENSE in this folder)                                                                                                  |
| Upstream stars at review         | 42,092 (repo-level, 2026-11-02)                                                                                                                                |
| Upstream last push               | 2026-11-02                                                                                                                                                     |
| Installed on                     | 2026-11-02 (TASK-ENG, Issue #75)                                                                                                                               |
| Last verified                    | 2026-11-02                                                                                                                                                     |
| Maintainer (upstream)            | Seth Hobson (wshobson)                                                                                                                                         |
| Security review                  | PASS — methodology text + template reference; no scripts, no URLs, no risky instructions.                                                                      |
| Trigger conditions               | Threat-modeling sessions; security design reviews; new module/endpoint authz design; security documentation.                                                   |
| Required tools                   | None.                                                                                                                                                          |
| Limitations / project precedence | Complements SKL-011 (security-privacy), which owns the project's security checklist and monthly review; STRIDE output feeds SKL-011 review, never replaces it. |
| Dependencies                     | references/details.md (vendored).                                                                                                                              |
| Local adaptations                | None — vendored verbatim (skill folder extracted from its plugin).                                                                                             |
| Status                           | Active                                                                                                                                                         |

## Update rules

Upstream changes are NEVER pulled automatically. Follow
`docs/engineering/skills/SKILL_MAINTENANCE_POLICY.md`: fetch → diff → re-run
`scripts/audit-external-skills.py` → human review → replace via PR, and update
this file (pinned commit, dates, verdicts).
