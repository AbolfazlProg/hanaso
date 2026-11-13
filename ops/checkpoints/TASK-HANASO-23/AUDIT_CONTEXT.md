# TASK-HANASO-23 — AUDIT CONTEXT PACK (shared by every subagent)

> READ THIS FILE COMPLETELY BEFORE AUDITING. It is the single source of
> truth for scope, ground-truth state, file map, verification methods and
> the finding format. If anything here conflicts with what you see in the
> repository, trust the repository and report the conflict as a finding.

## 1. Mission & hard rules (apply to every subagent, every round)

- This mission is **AUDIT ONLY**. Do NOT modify product code, content,
  tests, migrations or deployment files. Do NOT weaken anything.
- You may create EXACTLY ONE file: the report file your prompt assigns you
  (under `ops/checkpoints/TASK-HANASO-23/rounds/<round>/<letter>.md`).
  Nothing else in the working tree may be created, edited or deleted.
- Production `https://learn.kotodama.ir` is LIVE and serves EXACTLY the code
  being audited (verified: version `1.0.0-hanaso22-r01`, commit
  `3d8b8ccd201dd503e403a6e5912351f68556d6e5`). Treat it as READ-ONLY:
  you may open pages, but never run destructive tests, never touch other
  users' data, never hammer it (no loops faster than 1 req/s, no heavy
  crawls). Where a side effect is needed, use the LOCAL server (§5) —
  never production.
- Never print or store credentials. The git remote already carries auth.
- Findings must be EVIDENCE-BASED. Every finding carries the file path +
  line numbers (or the station/exercise id) and a short verbatim quote.
  Mark every finding `CONFIRMED` (you saw the source/evidence yourself) or
  `HYPOTHESIS` (suspected, needs verification). Never present a hypothesis
  as a confirmed bug.

## 2. Ground-truth state (do not re-derive; verified by the lead)

| Item | Value |
| --- | --- |
| Repo | https://github.com/AbolfazlProg/hanaso (public) |
| Audit worktree | `/home/z/my-project/hanaso23` — branch `audit/TASK-HANASO-23`, tip `84ec60e` (re-added from origin 2026-11-13 after a sandbox recycle deleted the worktrees; base repo /home/z/my-project/hanaso16) |
| Product code under audit | identical to commit `3d8b8ccd` (branch tip is docs-only on top; production runs it) |
| Live production | https://learn.kotodama.ir · 1.0.0-hanaso22-r01 @ 3d8b8ccd (uptime fresh 2026-11-13) |
| Research KB | `/home/z/my-project/japanese-learning-kb` (tip `8b8627c`) — `docs/knowledge-base/` holds EV-numbered evidence the content cites |
| Prior-mission checkpoints | `ops/checkpoints/TASK-HANASO-21/`, `ops/checkpoints/TASK-HANASO-22/` (read for context; do not trust them as proof — verify) |

## 3. Content map — Chapter 1 & Chapter 2 (the audit scope)

All content is CONTENT-AS-CODE under
`apps/web/src/modules/curriculum/content/` (worktree-relative).

### Chapter 1 — `kana-foundation-01` (L1) — «مبانی نوشتار: هیراگانا و کاتاکانا»

| File | Lines | Contents |
| --- | --- | --- |
| `chapter-kana01.ts` | 123 | chapter def: 2 sections (`section-a-hiragana`, `section-b-katakana`), estMinutes 406, mastery weights M1..M5, dialogueSlug `kana-welcome-01` |
| `chapter-kana01.stations.ts` | 4201 | KANA_STATIONS: 34 stations (h0 scene, h1..h15 hiragana rows + k1..k13 katakana rows + 2 milestone stations `stn-kana-m1-reading` / `stn-kana-m2-realworld` + optional `stn-kana-opt-*`) — each station = scene/dialogue/teaching blocks + exercise blocks (`blk-*`) |
| `chapter-kana01.exercises.ts` | 11222 | ~475 exercise items (`id: '…'`), types: recognition/recall/reading/listening/writing/derived/prereq; each has prompt, options, correct answer, distractors, per-option Persian feedback, hints |
| `kana-items.ts` | 2961 | 92-glyph registry: glyph, romaji, row, hostWord{word, meaningFa}, confusableWith, mnemonic, `introducedInUnit` (H1..H15 / K1..K13) — THE prerequisite ground truth |
| `kana-teaching.ts` | 1282 | teaching copy for kana stations |
| `levels.ts` | 170 | level policies incl. kana gate `weighted: 0.9, minMeasure: 0.8` |

### Chapter 2 — `first-meeting-01` (L2) — «اولین مکالمه: わたしは学生です»

| File | Lines | Contents |
| --- | --- | --- |
| `index.ts` (lines 15–115) | ~100 | CHAPTER_FIRST_MEETING def: 2 story units (turns 1–8, 9–14), estMinutes 71, scene: کافهٔ یامادا — میکی، سورا، یامادا، علی، کیم |
| `chapter-fm01.items.ts` | 295 | FM01_WORDS (8+ vocab), FM01_GRAMMAR (です/は/か/も/じゃありません/から), FM01_EXPRESSIONS |
| `chapter-fm01.stations.ts` | 1185 | 22 stations (`stn-fm01-01-anchor` … `stn-fm01-18-integrate` + 4 optional) |
| `chapter-fm01.exercises.ts` | 2007 | 82 exercise items |

### Shared surfaces in scope (both chapters)

- Practice module: `apps/web/src/modules/practice/` (+`/kana/`) — session
  contract, dimensions, policy, items registry, generator, evidence,
  checker; API `apps/web/src/app/api/practice/route.ts`; UI
  `apps/web/src/components/practice/` + `/practice` page.
- Journey/learn UI: `apps/web/src/components/curriculum/` (section-journey,
  station-runner, exercise-session, mastery-gate, …) and
  `apps/web/src/app/(learn)…` routes.
- Persian UI copy: `apps/web/src/messages/fa.ts`.
- Audio: `apps/web/src/modules/audio/` + manifest; kana audio under
  `public/audio/kana/`, hostword audio `public/audio/words/`, SFX
  `public/audio/sfx/`.
- Progress/mastery: `apps/web/src/modules/progress/`, `…/mastery/`,
  walk persistence, DB repos `apps/web/src/db/repositories/`.
- E2E reference: `scripts/h21-e2e/`, `scripts/h22-e2e/` (real-browser
  flows incl. answer-key dump env `H21_E2E_DUMP`).

## 4. Finding format (every report, every round)

```md
### <ID> — <short title>  [SEVERITY: Critical|High|Medium|Low] [STATUS: CONFIRMED|HYPOTHESIS]
- Location: <file path>:<lines> (+ station/exercise id)
- Problem: <what is wrong>
- Expected: <what a correct product would do/say>
- Actual: <what it does/says today>  (verbatim quote when text)
- Evidence: <how you verified: source read / grep counts / browser / API>
- Learner/system impact: <consequence>
- Suggested fix: <concrete, minimal>
- Regression test: <the test that would have caught it>
```

- ID scheme: `<round>-<letter>-<nn>` (e.g. `C1-A-03`, `T2-B-11`).
- Severity: Critical = breaks learning/data/security; High = materially
  degrades a core flow or teaches something wrong; Medium = friction,
  confusion, waste; Low = polish.
- Include a short **POSITIVE FINDINGS** section (what genuinely works, with
  ids/quotes) — the final report must be able to defend the product's real
  strengths too, and Round 3 must validate positives as well as negatives.
- Include a **COVERAGE** section: which stations/exercises you actually
  read (counts, not vague claims), so Round 3 can target gaps.
- Hard length cap: **≤ 350 lines** per report. Depth over breadth; never
  pad.

## 5. Verification methods available to you

1. **Source reading** — primary method for content rounds.
2. **Cross-reference greps** — e.g. prerequisite check: for an exercise
   testing glyph X in station H_n, verify `introducedInUnit` of X ≤ the
   station's unit; for a listening item, verify the audio file exists in
   the manifest (`modules/audio`), etc.
3. **Local production server (side effects allowed here, NOT on prod)** —
   a ready standalone build identical to the audited code exists at
   `/home/z/my-project/hanaso23/apps/web/.next/standalone/` (built from THIS
   worktree: product code identical to 3d8b8ccd — the audit branch is
   docs-only on top). Run it in ONE bash command (background processes die
   when the command ends), server + your script in the SAME call:
   `(cd /home/z/my-project/hanaso23/apps/web/.next/standalone && env -u DATABASE_URL PORT=31XX HOSTNAME=127.0.0.1 node apps/web/server.js & echo $! > /tmp/srv.pid); sleep 3; node /tmp/<you>/script.mjs; kill $(cat /tmp/srv.pid) 2>/dev/null`.
   In-memory stores: sessions reset on restart. In Node scripts:
   `const {createRequire}=require('module'); const {chromium}=createRequire('/tmp/h22e2e/node_modules/playwright-core')` —
   playwright-core 1.57.0 lives at /tmp/h22e2e (reinstalled after the
   sandbox recycle; Chromium at ~/.cache/ms-playwright). To import the TS
   content files in node, write a small ESM loader (`--loader`) that maps
   '.ts' imports (the C2 agents did this; see rounds/c2 reports for what
   they imported). Reference E2E with auth/walk/answer-key patterns:
   `scripts/h22-e2e/run.mjs` in this worktree.
4. **Live production (READ-ONLY)** — open pages on
   https://learn.kotodama.ir, check console/network via playwright-core,
   verify static assets; NEVER submit forms that mutate other users' data;
   the GUEST flow is acceptable to open (it is the product's normal
   anonymous behavior) but keep it light.
5. **KB cross-check** — content claims often cite KB evidence ids
   (EV-xxx) in `japanese-learning-kb/docs/knowledge-base/`; use it to
   judge pedagogical claims, not as proof of implementation.

## 6. What "done" means for your round

- Your report file exists at the assigned path, ≤350 lines, follows §4.
- Your return message is ≤ 30 lines: counts (findings by severity/status),
  the 5 most important items by ID, coverage %, and any blocker you hit.
- You changed nothing else in the tree (verify with
  `git status --porcelain` before finishing — it must show ONLY your
  report file as untracked).
