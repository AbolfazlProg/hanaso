# TASK-HANASO-25 — CURRENT STATE

> Last updated: CP-00 (2026-11-14). This file is the recovery point: on session
> loss, resume from here + CHECKPOINT_LOG.md.

## Mission

Fix question/answer/feedback/audio/gate integrity for chapter 1 (Kana) of
HANASO. Scope: kana-foundation-01 exercises, Hiragana/Katakana practice &
assessment, first-chapter listening, the chapter-end mastery gate, and related
review content. OUT of scope: chapter 2 content fixes (23 mis-keyed rationales,
p2-c2-prod-1, g2-cloze-1), full teaching-method redesign.

## Ground truth (verified this session)

- Repo: `/home/z/my-project/hanaso16`, remote `origin = github.com/AbolfazlProg/hanaso`.
- Branch `fix/TASK-HANASO-25-kana-integrity` created from `facb358` =
  tip of `fix/TASK-HANASO-24-security` (10 checkpoints, 3-subagent verified,
  RC complete, NOT deployed — production still runs pre-24 `3d8b8cc`).
- TASK-23 audit reference docs read (REMEDIATION_ROADMAP, BUG_REGISTER,
  CONTENT_QUALITY_REPORT, QUESTION_AND_FEEDBACK_AUDIT, FINDINGS_VERIFICATION).
- `core.fileMode false` set (sandbox permission-bit noise only).

## Key code facts established (CP-00 investigation)

- **BUG-001 (gate audio)**: `assessment/page.tsx` maps gate items through
  `toClientExercise` but NEVER attaches `promptAudio` — unlike
  `journey/[station]/page.tsx:115-118` which does for kana-listening/kana-recall.
  The 5 kana-listening gate items (M2×3: m2-1 hira-e, m2-2 hira-he, m2-3 kata-me;
  M5×2: m5-1 hira-n, m5-2 hira-wo) render «به صدای پخش‌شده گوش کن» with no sound.
  All 5 audio assets EXIST on disk (`public/audio/kana/kn-{hira-e,hira-he,kata-me,hira-n,hira-wo}.{opus,m4a}`)
  → pure wiring fix, no generation needed.
- **Gate math (BUG-001 part 2)**: gate bank = 13 items. M1×3, M2×3, M3×3, M4×2,
  M5×2. L1 thresholds: weighted 0.9, minMeasure 0.8. With n=2 or 3 per measure,
  ONE miss ⇒ that measure ≤ 0.5 or 0.667 < 0.8 ⇒ remediate. Weighted 0.9 never
  binds (dead letter). P(pass) for honest listener ≈ (1/3)^5 on M2∪M5 guessing…
  audit says 1/243. Fix per roadmap: rebank ≥4 items/measure so one miss stays
  recoverable (0.75 < 0.8 still fails — need ≥5 for one-miss-tolerance at 0.8:
  4/5=0.8 ≥ 0.8 passes). Decision needed: rebank to ≥5/measure (one miss OK) or
  lower minMeasure for L1 to match pedagogy. MUST also fix M5 mislabeled
  (measureLabelsFa M5 = «تولید نوشتاری» but M5 items are kana-listening!).
- **BUG-002 (60 two-correct)**: 19 recall + 41 listening/warm ids listed in
  TASK-23 rounds/c1/B.md C1-B-01 (per-station counts k1:4 k2:6 k3:6 k4:4 k5:5
  k6:4 k7:5 k8:2 k9:6 k10:4 k11:5 k12:6 k13:2 gate:1). Fix: script-explicit
  prompts (pattern `ex-kana-gate-m4-2`) or drop the hiragana twin from options.
- **BUG-020 (92 recall f1Fa)**: every recall item's f1Fa ends with
  «— به شکل درست نگاه کن.» TWICE (template concatenation bug).
- **BUG-029 (F1 recognition leak)**: recognition f1Fa embeds the correct
  reading (e.g. `«こ» صدای «کُ» دارد…`) at first miss — leaks the answer.
  Listening+recall clean at F1.
- **BUG-023 (hint no-op)**: exercise-session.tsx:948-956 button sets
  `hintRevealed` but the hint paragraph (:1009) requires `!feedback` while the
  button only renders INSIDE the feedback panel → dead. Fix: render f2HintFa
  (needs a server round-trip via a new hint action — f2HintFa never crosses to
  client pre-answer) + reset hintRevealed in retry().
- **BUG-026**: gate-m5-1 options ン/ん both /n/ — unanswerable by sound.
- **Listening rationale (172/173)**: shapes-for-a-sound template — must name
  the picked option's sound.
- Test infra: vitest, `pnpm test` (unit), `pnpm eqa`, CI at .github/workflows/ci.yml
  (format/lint/typecheck/test/integration-PG18/build/audit/smoke).
  h21-audio-inventory.test.ts exists (hostwords registry gate; kn- carve-out is
  for basic kana glyphs which have their own registry).

## Phase plan

| Phase | Content | Status |
| --- | --- | --- |
| 0 | Branch, this file, CHECKPOINT_LOG, push | ✅ this commit |
| 1 | Gate: audio wiring + bank math + M5 labels + gate-m5-1 | ⬜ |
| 2 | 60 two-correct items (script-explicit prompts) | ⬜ |
| 3 | 92 recall f1Fa dedup + listening rationale + F1 recognition leak | ⬜ |
| 4 | Hint wiring (server hint action + UI) | ⬜ |
| 5 | Content Lint + CI + fixtures | ⬜ |
| 6 | 3 subagents × 2 rounds | ⬜ |
| 7 | Regression (unit/integration/E2E/browser) | ⬜ |
| 8 | Release prep + OWNER-COMMAND.txt | ⬜ |

## Rules in force

- Commit+push after every phase/checkpoint; record SHAs.
- No test may be deleted/weakened to go green.
- TASK-24 security fixes must survive (IDOR, session, /poc gating, transactions).
- Chapter 2 content: lint may record new findings, no content fixes.
- Production NOT deployed by this mission.

## Issues / blockers

- None. (Sandbox has no live PostgreSQL; PG-backed integration tests skip —
  record, don't force.)

## 2026-11-14 — TASK-HANASO-25 FINAL STATE (CP-09, tip 0e1cf37)
- Round 1 reports saved+pushed (e76f702); CP-06 remediation (b5fe987);
  CP-07 all Round-2 A findings + CL-12 general rule (d10d09a);
  Round 2 CLOSED: A=B=C=PASS (18a3177).
- PHASE 7: regression 69f/787t green; real-browser E2E 13/13 (live 25-question
  gate run; TASK-24 guards verified live: GUEST 401, hint=only-hintFa+no-store);
  CP-08 (eca0c00).
- PHASE 8: production build EXIT 0; pins R=14d9d3a (tooling) /
  W=d4736bd8… (bootstrap sha256, mirror-verified) / D=9828640 (product);
  version 1.0.0-hanaso25-r01; OWNER-COMMAND.txt v14 committed+pushed (0e1cf37).
  Known follow-up (honest): run-h25 sandbox-drill fixture refresh (the v13
  harness fixture predates the TASK-24 .env keys — 62/92 with stale fixtures).
- No deploy/restart performed — the owner runs the one-liner.
