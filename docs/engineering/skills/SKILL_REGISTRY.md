# Skills Registry — HANASO Engineering

> **TL;DR (فا):** رجیستری واحد همهٔ Skillهای پروژه — ۱۶ Skill داخلی (منبع canonical: مرکز دانش `japanese-learning-kb`) + ۱۲ Skill خارجی معتبرِ vendored شده (منبع canonical: `agent-skills/external/` همین ریپو). همه در `.claude/skills/` نصب و قابل کشف هستند. تغییر وضعیت هر ردیف فقط از مسیر PR و طبق `SKILL_MAINTENANCE_POLICY.md`.

**Status:** living document · **Created:** 2026-11-02 (TASK-ENG, Issue #75, ADR-006) · **Review cadence:** monthly (see maintenance policy)

**Canonical sources (two-tier model — ADR-006):**

| Tier                                    | Skills       | Canonical source                                              | Change path                                    |
| --------------------------------------- | ------------ | ------------------------------------------------------------- | ---------------------------------------------- |
| Internal (project-specific)             | SKL-001..016 | `japanese-learning-kb/agent-skills/` (KB repo)                | KB change + catalog registration, then re-sync |
| External (vendored, community/official) | EXT-001..012 | `agent-skills/external/` (this repo, pinned upstream commits) | PR to this repo + security re-audit            |

Install everything: `bash scripts/sync-skills.sh` (KB via `KB_PATH`, external from this repo). `.claude/skills/` is **generated output** — never hand-edited.

---

## 1. External skills (EXT) — vendored & audited 2026-11-02

| ID      | Name                          | Category                        | Pri    | Source repo (stars @2026-11-02)    | License    | Pinned version (commit)       | Last upstream push | Installed path                               | Trigger (short)                                          | Security review                          | Status |
| ------- | ----------------------------- | ------------------------------- | ------ | ---------------------------------- | ---------- | ----------------------------- | ------------------ | -------------------------------------------- | -------------------------------------------------------- | ---------------------------------------- | ------ |
| EXT-001 | `webapp-testing`              | Testing / QA                    | **P0** | anthropics/skills (186,491★)       | Apache-2.0 | `ca45fc4`                     | 2026-10-28         | `.claude/skills/webapp-testing`              | E2E/browser tests, runtime UI verification (Playwright)  | PASS                                     | Active |
| EXT-002 | `frontend-design`             | UI/UX — Visual Design           | **P0** | anthropics/skills (186,491★)       | Apache-2.0 | `ca45fc4`                     | 2026-10-28         | `.claude/skills/frontend-design`             | New/reshaped UI, design quality critique                 | PASS                                     | Active |
| EXT-003 | `test-driven-development`     | Testing discipline              | **P0** | obra/superpowers (310,809★)        | MIT        | `2ce8aa1`                     | 2026-10-29         | `.claude/skills/test-driven-development`     | Before writing implementation code (feature/bugfix)      | PASS                                     | Active |
| EXT-004 | `systematic-debugging`        | QA / Process                    | P1     | obra/superpowers (310,809★)        | MIT        | `2ce8aa1`                     | 2026-10-29         | `.claude/skills/systematic-debugging`        | Any bug/test failure/unexpected behavior, before fixes   | PASS                                     | Active |
| EXT-005 | `vercel-react-best-practices` | Frontend / Performance          | P1     | vercel-labs/agent-skills (33,376★) | MIT¹       | `1a2c79d`                     | 2026-10-28         | `.claude/skills/vercel-react-best-practices` | Writing/reviewing/refactoring React/Next.js code         | PASS                                     | Active |
| EXT-006 | `web-design-guidelines`       | UI Review / Visual QA           | P1     | vercel-labs/agent-skills (33,376★) | MIT¹       | `1a2c79d` (+ rules `434b7f9`) | 2026-10-28         | `.claude/skills/web-design-guidelines`       | UI-code review vs Web Interface Guidelines (local rules) | PASS (runtime fetch removed — see audit) | Active |
| EXT-007 | `wcag-audit-patterns`         | Accessibility                   | P1     | wshobson/agents (42,092★)          | MIT        | `7e2fb55`                     | 2026-11-02         | `.claude/skills/wcag-audit-patterns`         | WCAG 2.2 audits, a11y fixes, accessible components       | PASS                                     | Active |
| EXT-008 | `postgresql-table-design`     | Database                        | P1     | wshobson/agents (42,092★)          | MIT        | `7e2fb55`                     | 2026-11-02         | `.claude/skills/postgresql-table-design`     | PG schema/type/index/constraint design & review          | PASS                                     | Active |
| EXT-009 | `next-dev-loop`               | Frontend — runtime verification | P1     | vercel/next.js canary (143,462★)   | MIT        | `dcbb561`                     | 2026-11-02         | `.claude/skills/next-dev-loop`               | Verify edits work at runtime during `next dev`           | PASS                                     | Active |
| EXT-010 | `stride-analysis-patterns`    | Security — threat modeling      | P2     | wshobson/agents (42,092★)          | MIT        | `7e2fb55`                     | 2026-11-02         | `.claude/skills/stride-analysis-patterns`    | Threat modeling, security design review                  | PASS                                     | Active |
| EXT-011 | `seo-technical`               | SEO / Content engineering       | P2     | AgriciDaniel/claude-seo (25,701★)  | MIT        | `6be93f4`                     | 2026-11-01         | `.claude/skills/seo-technical`               | Technical SEO audits; phase-1.5 SEO work                 | PASS (paid-API sections out of scope)    | Active |
| EXT-012 | `next-bundle-optimizer`       | Performance                     | P2     | vercel/next.js canary (143,462★)   | MIT        | `dcbb561`                     | 2026-11-02         | `.claude/skills/next-bundle-optimizer`       | Slow routes, oversized bundles, deferred features        | PASS                                     | Active |

¹ MIT declared in upstream README + per-skill frontmatter; upstream has no root LICENSE file at the pinned commit — declaration recorded in each vendored `LICENSE` (see evaluation matrix caveat).

Per-skill mandatory metadata (source path, pinned SHA, maintainer, tools, limitations, adaptations, dependencies) lives in `agent-skills/external/<name>/PROVENANCE.md`. Full evaluation scores: `SKILL_EVALUATION_MATRIX.md`. Rejected candidates: `SKILL_REJECTED_CATALOG.md`.

## 2. Internal skills (SKL) — canonical in KB

Installed from `japanese-learning-kb/scripts/install-skills.sh .` → same `.claude/skills/` location. Catalog & change rules: KB `docs/knowledge-base/10-agent-engineering/agent-skills-catalog.md`.

| ID      | Name                                 | Category           | Pri    | Canonical source | Trigger (short)                                    | Status |
| ------- | ------------------------------------ | ------------------ | ------ | ---------------- | -------------------------------------------------- | ------ |
| SKL-001 | `architecture-guardian`              | Architecture       | **P0** | KB               | Any structural/infra/dependency change             | Active |
| SKL-002 | `frontend-engineering`               | Frontend           | **P0** | KB               | Every page/component build or change               | Active |
| SKL-003 | `bilingual-rtl-ltr`                  | i18n / RTL         | **P0** | KB               | Any text/render/layout work (fa-RTL + ja-LTR)      | Active |
| SKL-004 | `design-system-implementation`       | UI / Design System | **P0** | KB               | Components, restyling, visual execution (Aizen)    | Active |
| SKL-005 | `backend-engineering`                | Backend            | **P0** | KB               | Endpoints, server logic, jobs, mutations           | Active |
| SKL-006 | `database-engineering`               | Database           | **P0** | KB               | Schema/migration/query changes                     | Active |
| SKL-007 | `fsrs-integration`                   | Learning core      | P1     | KB               | Scheduling/review-session work                     | Active |
| SKL-008 | `content-pipeline`                   | Content            | P1     | KB               | Content produce/edit/validate/publish              | Active |
| SKL-009 | `audio-dialogue`                     | Audio              | P1     | KB               | Audio assets, dialogue playback, audio QA          | Active |
| SKL-010 | `quality-gates`                      | Testing / QA       | **P0** | KB               | Before every commit/PR/milestone                   | Active |
| SKL-011 | `security-privacy`                   | Security           | **P0** | KB               | Auth, user data, input, headers, monthly review    | Active |
| SKL-012 | `kb-documentation`                   | Documentation      | P1     | KB               | Editing KB documents (KB-repo work)                | Active |
| SKL-013 | `learning-experience-implementation` | Learning UX        | P1     | KB               | Lesson/exercise/review/path/dashboard work         | Active |
| SKL-014 | `devops-deployment`                  | DevOps             | **P0** | KB               | Docker/compose/Caddy/CI/deploy, releases, rollback | Active |
| SKL-015 | `analytics-engineering`              | Analytics          | P1     | KB               | Analytics events, rollups, admin dashboards        | Active |
| SKL-016 | `admin-console-implementation`       | Admin console      | P1     | KB               | `/admin/**` pages/actions, roles, audit, billing   | Active |

## 3. Agent compatibility

| Runtime                         | Discovery mechanism                                               | Notes                                                            |
| ------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| Claude Code (≥2.1.277)          | Native `.claude/skills/` discovery after `scripts/sync-skills.sh` | Primary runtime; frontmatter validated by install scripts        |
| Codex / other AGENTS.md readers | `AGENTS.md` §۳ lists both tiers + this registry                   | Skills read as project files (same pattern KB already documents) |
| Cursor / Gemini CLI / Copilot   | Same root-instruction pointer (AGENTS.md)                         | No adapter duplication — one canonical registry, read on demand  |

Rules that apply to **every** agent are in `AGENT_SKILL_USAGE_POLICY.md` (preflight, mandatory loading, PR declaration). Task-type mapping is in `SKILL_SELECTION_MATRIX.md`.

## 4. Status values

`Active` (installed + enforced) · `Deprecated` (superseded; kept for history, removed from selection matrix) · `Rejected` (never installed — see rejected catalog) · `Deferred` (approved but intentionally not yet active, with reason in this file).
