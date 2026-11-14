# Engineering Skills — index

> **TL;DR (فا):** خانهٔ مستندات زیرساخت Skillهای HANASO. نقطهٔ شروع: `SKILL_REGISTRY.md` (چه چیزی وجود دارد) و `SKILL_SELECTION_MATRIX.md` (چه چیزی برای چه کاری الزامی است).

**Created:** 2026-11-02 (TASK-ENG, Issue #75, ADR-006)

## Documents

| Document                                                       | Purpose                                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [`SKILL_REGISTRY.md`](SKILL_REGISTRY.md)                       | Canonical registry — all 28 skills (16 internal SKL + 12 external EXT), sources, licenses, pinned versions, triggers, statuses |
| [`SKILL_SELECTION_MATRIX.md`](SKILL_SELECTION_MATRIX.md)       | Mandatory task-type → skills mapping + precedence rules + context economy                                                      |
| [`AGENT_SKILL_USAGE_POLICY.md`](AGENT_SKILL_USAGE_POLICY.md)   | The preflight protocol and usage/enforcement rules for every agent                                                             |
| [`SKILL_MAINTENANCE_POLICY.md`](SKILL_MAINTENANCE_POLICY.md)   | Monthly review, update/audit procedure, deprecation & removal criteria                                                         |
| [`SKILL_DISCOVERY_REPORT.fa.md`](SKILL_DISCOVERY_REPORT.fa.md) | Persian mission report: project needs matrix, search methodology, funnel, verified stats                                       |
| [`SKILL_EVALUATION_MATRIX.md`](SKILL_EVALUATION_MATRIX.md)     | Scoring rubric + per-candidate scores and gates                                                                                |
| [`SKILL_SECURITY_AUDIT.md`](SKILL_SECURITY_AUDIT.md)           | Audit methodology + per-skill security results + adaptations                                                                   |
| [`SKILL_REJECTED_CATALOG.md`](SKILL_REJECTED_CATALOG.md)       | Everything evaluated and NOT installed, with reasons and revisit markers                                                       |
| [`SKILL_VERIFICATION_REPORT.md`](SKILL_VERIFICATION_REPORT.md) | Practical tests A–D + infrastructure verification                                                                              |
| [`OWNER-REPORT-FA.md`](OWNER-REPORT-FA.md)                     | Persian executive report for the owner                                                                                         |

## Quick operations

```bash
bash scripts/sync-skills.sh                     # install all skills (KB + external) → .claude/skills
bash scripts/install-external-skills.sh --list # list vendored external skills
python3 scripts/audit-external-skills.py agent-skills/external   # security first-pass audit
```

Skill sources: internal = `japanese-learning-kb/agent-skills/` (KB repo) · external = `agent-skills/external/` (this repo). `.claude/skills/` is generated output — never hand-edit.
