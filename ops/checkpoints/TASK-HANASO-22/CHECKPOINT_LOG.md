# TASK-HANASO-22 — CHECKPOINT LOG

Push discipline: after every phase, commit + push to
`feat/TASK-HANASO-22-learning-experience` and record the SHA here.

| CP | Phase | Commit (SHA) | Pushed | Note |
| --- | --- | --- | --- | --- |
| CP-00 | Phase 0 audit + branch + initial checkpoints | f523975 | ✅ | audit findings in CURRENT_STATE.md |
| CP-01 | Phase 1 research (4 docs + KB reuse) | 0d38f49 | ✅ | docs/research/*.md + RESEARCH_PROGRESS.md |
| CP-02 | Practice architecture + design decisions | 6d26d81 | ✅ | PRACTICE_DESIGN_DECISIONS.md |
| — | Practice engine + API + hub + nav | 5e50d2c | ✅ | milestone 1 |
| — | Learn de-scoring + F1 spoiler fix + feedback animation | f283f47 | ✅ | milestone 2 (737 unit green) |
| — | Chapter-01 two-section split + 2 milestones | d940199 | ✅ | milestone 3 |
| — | Journey icons + locked feedback + seal upgrade + CC0 sound + achievements | 8f783eb | ✅ | milestones 4+5 |
| CP-03 | Full testing (E2E 25/25 + H21 44/44 + 737 unit + 32 integ + 37 EQA) + evidence docs | 3d8b8cc | ✅ | TEST_RESULTS.md + screenshots + CURRICULUM_RESTRUCTURE + RESEARCH_FINDINGS |
| — | ops docs only (CP-03 log entry + final CURRENT_STATE) | 0b80617 / 3c107ee | ✅ | docs-only after D — D stays 3d8b8cc |
| CP-04 | **Delivery layer — OWNER-COMMAND v13 one-liner + sandbox drills** | (this commit) | ✅ | see below + RELEASE_VALIDATION.md |

## CP-04 — Delivery layer: the v13 TRUE one-liner (2026-11-13)

- **Product target D** = `3d8b8cc` (3d8b8ccd201dd503e403a6e5912351f68556d6e5) — the
  last product-code commit; the two ops-docs commits after it (0b80617,
  3c107ee) and this CP-04 commit never touch `apps/packages/public/db`, so D
  stays pinned. **Version** `1.0.0-hanaso22-r01`. **R/W unchanged**
  (5870eaf3 / d4736bd8…; `git diff R..HEAD` on the four tooling scripts = empty).
- **Live production verified 2026-11-13T14:47Z**: the owner HAS run the v12 line —
  `learn.kotodama.ir/api/health` → `1.0.0-hanaso21-r01 @ 33304b1f` (uptime ~4h).
  The release therefore jumps n21→n22; the drill fixture mirrors exactly this.
- **`run-h22.sh` created** (the current one-liner drill — extracts the EXACT line
  from OWNER-COMMAND.txt v13 and executes it unmodified): **92/92 PASS**.
- **`run-h21.sh` retired gracefully** (SKIP v12, exit 0) — same contract as
  run-deploy05.sh before it; `run-deploy05.sh` SKIP (v11) re-verified.
- **`run-deploy04.sh` regression re-run**: **140/140 PASS** (tooling byte-identical,
  so this was expected; re-run anyway for the record).
- **REAL-network verification**: api.github.com → honest 403 (sandbox IP
  rate-limited — the P2 condition); codeload.github.com tarball at R →
  SHA-256 `d4736bd8…` byte-identical to the pin. The fallback chain works on
  the real network from this machine.
- Files: OWNER-COMMAND.txt (v12→v13), run-h22.sh (new), run-h21.sh (retire guard),
  sandbox-tests/README.md, RELEASE_VALIDATION.md (this CP), CURRENT_STATE.md.
- The commit is docs/deploy-only → the D pin remains valid; the mirror inside
  any future drill re-run resolves R and D identically.

## CP-00 — Phase 0 audit (2026-11-13)

- Worktree `/home/z/my-project/hanaso22` on new branch
  `feat/TASK-HANASO-22-learning-experience` from `8579643`
  (`origin/fix/TASK-HANASO-21-completion-seal` — TASK-21 final tip, pushed, verified).
- TASK-21 state re-verified from Git (not from reports): 14 docs, product target
  `33304b1`, E2E 46/46, one-liner drill 92/92, mission complete.
- Code audit done (see CURRENT_STATE.md §Audit findings): punitive-scoring root cause
  (exercise_threshold 0.7 on 50/52 walk stations → 409), wrong-answer spoiler root
  cause (correctReading/correctAudio attached at F1), duplicate lock icons confirmed
  (section-journey.tsx:240), FSRS honestly not-integrated, no Kana practice surface,
  seal assets baseline, 92-glyph registry + 185 kana audio + 307 hostword audio +
  KanjiVG writing engine available for practice.
- Files: CURRENT_STATE.md, TASK_PLAN.md, CHECKPOINT_LOG.md (this file).
- Next: Phase 1 research (KB reuse + 4 docs).
