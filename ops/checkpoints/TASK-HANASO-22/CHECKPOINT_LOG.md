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
