# TASK-HANASO-22 — TASK PLAN (execution order per mission §PHASE 13)

| Step | Work | Depends on | Checkpoint |
| --- | --- | --- | --- |
| 1 | Git audit + branch + CURRENT_STATE | — | CP-00 ✅ |
| 2 | Research: KB reuse + 4 research docs + push | 1 | CP-01 |
| 3 | Pedagogy design: skill dimensions, exercise types, scheduling, review eligibility, Kana traceability matrix | 2 | CP-02 |
| 4 | Curriculum: split chapter 01 into 2 logical sections (hiragana/katakana boundary per dependency+load analysis), re-estimate minutes honestly, chapter intro promises + outcome mapping, milestones (Kana-scope only) | 3 | CP-03 |
| 5 | Learn: remove punitive scoring (exercise_threshold 0.7 → task_completed on walk stations; keep gate + prereq validation), fix wrong-answer feedback (no spoiler at F1, in-place animated feedback, graduated hint, retry) | 3 | CP-04 |
| 6 | Practice: engine + Kana exercise dimensions (visual, kana↔sound, decode, discrimination, combos/mora, writing recall, stroke order), Focused + Mixed, session persistence, results → review eligibility (no FSRS mutation) | 3,4 | CP-05 |
| 7 | AIZEN celebration: bigger seal, rotating ink ring, shimmer, licensed stamp sound (downloaded, licensed, bundled), lesson achievements (Introduced/Practiced/Demonstrated honest tiers) | 5,6 | CP-06 |
| 8 | Journey UI: right icon = content-type identity (locked keeps identity), left = access state, locked-click shake/pulse/vermilion + reason, button feedback states audit | 4 | CP-07 |
| 9 | Integration + E2E: Learn→Practice→Review flow, sections, milestones, completion+seal, responsive, a11y, persistence, console/network | all | CP-08 |
| 10 | Release: CI, production build, browser test, regression numbers | 9 | CP-09 |

## Protected invariants (never break)

- User isolation, auth, learner identity cookie.
- Progress/Resume (7-day expiry), walk-persistence, completion idempotency (TASK-21 P0).
- Mastery gate G1 + chapter soft-lock + prerequisite validation.
- EQA/curriculum CI gates (glyph budget, prerequisite gate, commit hygiene).
- KOTODAMA + shared infra untouched; no destructive migration; no real-user data edits.
- FSRS honesty: no fake scheduler, no fake review dates. Practice records evidence only.

## Testing checklist (Phase 14 acceptance)

- unit: typecheck, eslint, vitest (existing 737+) + new practice/feedback units.
- integration (pg): completion criteria change, practice persistence, sections.
- E2E (Playwright): full learn flow without 409 dead-ends, wrong-answer ladder (no
  F1 spoiler), practice session both types, seal ceremony once + persistence, locked
  click feedback, icons, mobile + desktop.
- Console/network clean; reduced-motion respected; aria-live on async states.
