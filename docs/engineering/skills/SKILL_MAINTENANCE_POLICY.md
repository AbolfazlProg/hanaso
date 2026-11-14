# Skill Maintenance Policy — how the skill set evolves

> **TL;DR (فا):** چرخهٔ نگهداری Skillها: بازبینی ماهانه یا رویدادمحور (ارتقای Next/PG/Playwright)، به‌روزرسانی فقط از مسیر «دریافت → diff → ممیزی امنیتی مجدد → بازبینی انسانی → PR»، ممنوعیت به‌روزرسانی خودکار، و معیارهای حذف/از-رده-خارج‌کردن. ابزار ممیزی داخل ریپو است: `scripts/audit-external-skills.py`.

**Status:** active policy · **Created:** 2026-11-02 (TASK-ENG, Issue #75, ADR-006)

**Related:** `SKILL_REGISTRY.md` · `SKILL_SECURITY_AUDIT.md` · `AGENT_SKILL_USAGE_POLICY.md`

---

## 1. Review cadence

| Trigger                                                                                     | Action                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monthly** (first working day)                                                             | Registry review: check each EXT skill's upstream repo for new commits/releases; check internal catalog in KB for changes; record "reviewed, no change" or open an update PR |
| **Framework upgrade** (Next.js minor+, React major, PG major, Playwright major, Node major) | Immediate re-verification of affected skills (EXT-005/009/012 for Next; EXT-001 for Playwright; EXT-008 for PG)                                                             |
| **Security event** (advisory touching a vendored skill or its subject area)                 | Immediate targeted re-audit                                                                                                                                                 |
| **Project phase change** (e.g., entering phase 1.5 SEO work)                                | Revisit `Deferred`/`Rejected` entries whose reason was "not yet relevant"                                                                                                   |

The monthly review is a checklist pass, not a forced update: if upstream is unchanged, the entry stays as-is with its pinned commit.

## 2. Update procedure (per skill) — never automatic

1. **Fetch** the new upstream version of the exact skill folder (pinned-SHA downloads only; never `curl | bash`, never `npx skills add`).
2. **Diff** against the vendored copy (`diff -ru agent-skills/external/<name>/ <new>/`). Classify changes: content only / new files / new scripts / new URLs.
3. **Re-run the audit tool**: `python3 scripts/audit-external-skills.py agent-skills/external/<name>` (or on a staging copy first). Any HIGH/MEDIUM finding blocks.
4. **Manual review** of every content diff and every new script/URL (same standard as the initial audit, `SKILL_SECURITY_AUDIT.md`).
5. **Vendor + update PROVENANCE.md** (new pinned commit, dates, verdicts) and the registry row.
6. **PR** with the diff summary and audit output attached — reviewed like any code change.
7. **Re-sync**: `bash scripts/sync-skills.sh` and confirm discovery.

Adaptations applied during vendoring (e.g., web-design-guidelines' local rules file) must be re-applied and re-documented on every update.

## 3. Adding a new external skill

1. Verify the selection matrix has a real gap that an internal skill (SKL-xxx) cannot cover — the KB anti-fragmentation rule applies to the whole registry.
2. Evaluate per `SKILL_EVALUATION_MATRIX.md` rubric — license gate first (free/OSS only), then quality, relevance, maintenance, security.
3. Audit + manual review (§2 steps 1–4).
4. Vendor with `PROVENANCE.md` + LICENSE, register as EXT-0xx, add to the selection matrix, announce in `AGENT_PROGRESS.md`, PR.

## 4. Deprecation & removal criteria

A skill is **Deprecated** (removed from selection matrix, kept in registry with status) when:

- an internal skill now covers the domain better (project pattern > generic guidance);
- the skill's guidance conflicts with a pinned ADR/KB decision and cannot be constrained by a provenance note;
- a better source supersedes it (e.g., an official vendor skill replacing a community one);
- it stops matching the stack (e.g., a Next.js-major upgrade breaks its assumptions).

A skill is **removed** from `agent-skills/external/` (registry row kept, status `Deprecated`, folder deleted) when it is unused for two consecutive monthly reviews **and** deprecated, or when a security audit fails with no upstream fix. Removal is a PR with the reasoning recorded.

## 5. Ownership

| Artifact                                                                                                                          | Owner path                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `agent-skills/external/**` + `scripts/install-external-skills.sh` + `scripts/sync-skills.sh` + `scripts/audit-external-skills.py` | platform/`eng` scope (MODULE-OWNERSHIP); changes announced in `AGENT_PROGRESS.md` |
| `docs/engineering/skills/**`                                                                                                      | same scope; registry rows are co-located files — sequential changes only          |
| Internal SKL-001..016 sources                                                                                                     | KB repo (unchanged by this policy — KB's own catalog rules apply)                 |

## 6. Tooling

- Audit: `python3 scripts/audit-external-skills.py agent-skills/external` — exit code 1 on HIGH/MEDIUM findings; findings always require human interpretation (false positives exist, e.g. prose mentioning "telemetry").
- Discovery check: `bash scripts/sync-skills.sh` then `ls .claude/skills` (expected: 16 internal + 12 external = 28, no name collisions).
- Registry consistency: every Active EXT row must have `agent-skills/external/<name>/SKILL.md` + `PROVENANCE.md` + `LICENSE*` on disk, and every vendored folder must have an Active registry row. Drift is a blocker in the PR that introduces it.
