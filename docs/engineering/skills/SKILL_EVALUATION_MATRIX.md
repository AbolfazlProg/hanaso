# Skill Evaluation Matrix — scoring of external skill candidates

> **TL;DR (فا):** امتیازدهی ۱-به-۵ هر کاندید خارجی بر اساس ده معیار مأموریت (با وزن اهمیت) + دو دروازهٔ حذفی (مجوز رایگان/متن‌باز و امنیت). آستانهٔ پذیرش: میانگین وزنی ≥ ۴٫۰ و عبور از هر دو دروازه. دوازده Skill پذیرفته شدند؛ بقیه با دلایل مستند رد شدند.

**Evaluated:** 2026-11-02 · **Evidence:** GitHub API stats pulled live (authenticated) on 2026-11-02; skill content fetched at pinned commits (see PROVENANCE files).

---

## 1. Rubric

Score each criterion 1–5; weighted average = Σ(score × weight) / Σweight(max 5).

| #   | Criterion                             | Weight            | What 5 looks like                                                                                                                |
| --- | ------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Quality of specialized instructions   | **3 (very high)** | Deep, actionable, expert-level guidance — not generic advice                                                                     |
| C2  | Relevance to real HANASO needs        | **3 (very high)** | Maps to a live stack need (Next 16.4.3 / React 19 / PG18 / Playwright M1 / RTL+a11y / Aizen) without duplicating an internal SKL |
| C3  | Maintainer credibility & track record | 2 (high)          | Official org or established maintainer; active maintenance                                                                       |
| C4  | Freshness                             | 2 (high)          | Upstream commits within ~2 weeks; guidance current for 2026                                                                      |
| C5  | Documentation quality                 | 2 (high)          | Well-structured, references, worked examples                                                                                     |
| C6  | GitHub stars & adoption               | 1 (medium)        | Broad community adoption — **supporting evidence, never proof**                                                                  |
| C7  | Tests & examples quality              | 2 (high)          | Real examples/scripts that run; honest caveats                                                                                   |
| C8  | Security & trustworthiness            | **3 (very high)** | Clean audit; no injection surface, secret access, or egress                                                                      |
| C9  | Compatibility with our coding agents  | **3 (very high)** | Standard SKILL.md format; runs with repo toolchain; light context load                                                           |
| C10 | License & free usage                  | **GATE**          | OSI license / clear free terms — fail = reject regardless of score                                                               |

**Hard gates (fail → reject, no score appeal):** C10 license gate · C8 security gate (HIGH/MEDIUM audit finding without mitigation) · free-of-paid-dependency gate (core function must not require a paid service).

**Acceptance threshold:** weighted ≥ **4.0** AND all gates passed AND no duplication of an internal SKL that already covers the domain better (KB anti-fragmentation rule).

## 2. Scores — vendored skills (all accepted)

| Skill                               | C1  | C2  | C3  | C4  | C5  | C6  | C7  | C8  | C9  | Weighted | Gate | Verdict                                     |
| ----------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | -------- | ---- | ------------------------------------------- |
| EXT-001 webapp-testing              | 5   | 5   | 5   | 5   | 4   | 5   | 5   | 5   | 5   | **4.90** | ✓    | Accept (P0)                                 |
| EXT-002 frontend-design             | 5   | 5   | 5   | 5   | 4   | 5   | 3   | 5   | 5   | **4.71** | ✓    | Accept (P0) — constrained by Aizen lock     |
| EXT-003 test-driven-development     | 5   | 5   | 4   | 5   | 4   | 5   | 4   | 5   | 5   | **4.71** | ✓    | Accept (P0)                                 |
| EXT-005 vercel-react-best-practices | 5   | 5   | 5   | 5   | 5   | 4   | 4   | 5   | 4   | **4.71** | ✓¹   | Accept (P1)                                 |
| EXT-008 postgresql-table-design     | 5   | 4   | 4   | 5   | 5   | 4   | 4   | 5   | 5   | **4.62** | ✓    | Accept (P1) — SKL-006 pins override         |
| EXT-004 systematic-debugging        | 5   | 4   | 4   | 5   | 4   | 5   | 3   | 5   | 5   | **4.48** | ✓    | Accept (P1)                                 |
| EXT-006 web-design-guidelines       | 4   | 5   | 5   | 5   | 4   | 4   | 3   | 4   | 5   | **4.38** | ✓²   | Accept (P1) — runtime fetch removed         |
| EXT-009 next-dev-loop               | 5   | 4   | 5   | 5   | 5   | 5   | 3   | 5   | 3   | **4.38** | ✓    | Accept (P1) — needs agent-browser CLI       |
| EXT-012 next-bundle-optimizer       | 5   | 4   | 5   | 5   | 5   | 5   | 3   | 5   | 3   | **4.38** | ✓    | Accept (P2) — canary, re-verify on upgrades |
| EXT-007 wcag-audit-patterns         | 4   | 4   | 4   | 5   | 4   | 4   | 3   | 5   | 5   | **4.29** | ✓    | Accept (P1) — RTL stays with SKL-003        |
| EXT-010 stride-analysis-patterns    | 4   | 4   | 4   | 5   | 4   | 4   | 3   | 5   | 5   | **4.29** | ✓    | Accept (P2)                                 |
| EXT-011 seo-technical               | 5   | 3   | 3   | 5   | 5   | 4   | 3   | 4   | 4   | **4.00** | ✓³   | Accept (P2) — paid sections out of scope    |

Gate notes:
¹ MIT declared in README + frontmatter; no root LICENSE file at pinned commit — declaration archived in vendored LICENSE (accepted with caveat recorded).
² Upstream runtime-fetch design failed the C8 gate **as-is**; accepted only with the local-vendored-rules adaptation (audit doc §2).
³ Core is free; optional DataForSEO/Google-API sections explicitly out of scope (free-license rule).

## 3. Scores — evaluated and rejected (top of the funnel)

| Candidate                                     | Weighted      | Failed gate / reason                                                                                                |
| --------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| anthropics `docx`/`pdf`/`pptx`/`xlsx`         | n/a           | **License gate** — source-available under Anthropic ToS, not OSI                                                    |
| anthropics `mcp-builder`                      | 3.6           | C2 relevance (no MCP work in scope) + WebFetch injection surface (C8)                                               |
| anthropics `skill-creator`                    | 3.8           | Conflicts with KB's own skill-authoring standard (frontmatter/7-section template + validation) — anti-fragmentation |
| anthropics `canvas-design`                    | 3.4           | C2 — poster/print art direction, not product-UI work (off-lens)                                                     |
| anthropics `web-artifacts-builder`            | 3.3           | Stack mismatch (React18+Vite single-file artifacts vs Next 16 app)                                                  |
| anthropics `theme-factory`                    | 2.9           | Conflicts with pinned Aizen art direction                                                                           |
| obra `requesting-code-review`                 | 4.2 (quality) | **Duplication** — repo already mandates KB code-review-standard + independent reviewers + ops/reviews flow          |
| obra `verification-before-completion`         | 4.0 (quality) | **Duplication** — SKL-010 quality-gates + DoD own this domain ("no almost-green")                                   |
| wshobson `screen-reader-testing`              | 3.9           | Requires real SR software (NVDA/JAWS/VoiceOver) unavailable to agents; overlaps EXT-007 + SKL-003/004               |
| vercel-labs `vercel-optimize`                 | 3.2           | **Free gate** — needs Vercel platform + paid Observability Plus; project self-hosts on VPS                          |
| vercel-labs `composition-patterns`            | 3.6           | Overlaps SKL-002 + EXT-005; upstream frontmatter invalid (name mismatch, no description)                            |
| `coreyhaines31/marketingskills` (ai-seo etc.) | 3.3           | C2 — marketing/CRO lens, phase-inappropriate; revisit at phase 1.5                                                  |

(Complete list with links and dates: `SKILL_REJECTED_CATALOG.md`.)

## 4. Notes on evidence quality

- **Stars are dated 2026-11-02 and pulled from the GitHub API by the evaluator** — not copied from articles or READMEs. Stars informed C6 only; no candidate was accepted on popularity alone, and no candidate with a license/security failure was saved by popularity.
- Version pins: every vendored skill records its exact upstream commit in `PROVENANCE.md`, so the evaluation is reproducible.
- Priority assignment: P0 = needed on essentially every matching task (testing discipline, UI quality, E2E); P1 = frequent domain work; P2 = situational/threat-modeling/SEO-phase-1.5/measurement-heavy work.
