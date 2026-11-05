# TASK-LEARNING-07 — Wave 3 work record (Z.ai, 2026-11-04)

Branch: `feat/learning-06-lesson-system` (working tree only — no commit, per wave instructions).
Baseline from Wave 2: 24 test files / 240 tests green. Final: **28 files / 273 tests green** (+ `pnpm eqa` 37 green).

## Scope (assigned issues)

| Issue | What | Where |
| --- | --- | --- |
| #106 | F2 option elimination + F4 return-to-teaching — client wiring | `components/curriculum/exercise-session.tsx`, `components/curriculum/station-runner.tsx`, new `modules/curriculum/station-walk.ts` |
| #102 | «مرحلهٔ قبل» back-navigation without losing earned exercise results | `station-runner.tsx` + `station-walk.ts` |
| #105 | Vocab card meaning-first hierarchy (beginners read Persian first) | `station-runner.tsx` vocab-card block |
| #108 | Remaining emoji/dingbat sweep + regression guard | poc pages, home page, fa.ts, kana content, deleted dead `app/learn/learn-card.tsx`, new `tests/unit/ui/no-emoji-gate.test.ts` |
| #94 residual | Honest `prerequisitesNote` copy + deep-link chapter gating | `messages/fa.ts`, `[chapter]/page.tsx`, `[chapter]/dialogue/page.tsx`, `journey/[station]/page.tsx`, new `components/curriculum/chapter-locked-notice.tsx` |

## Design decisions (for the next agent)

1. **F4 return = step jump, not DOM scroll.** StationRunner renders ONE block at a time, so
   «بازگشت به آموزش» moves the step pointer to the authored block (`station-walk.stepOfBlock`);
   an unresolvable id no-ops. A content test now pins every practice `referenceBlockId` to a block
   in its OWN station (otherwise the button would be dead).
2. **#102 result persistence.** Earned exercise results live in a `blockResults` map OUTSIDE the
   rendered block (component state would die on unmount). A completed exercise block renders a
   skip panel («این تمرین را کامل کرده‌ای» + «ادامه») instead of a fresh ExerciseSession — no
   re-grading, no re-requirement. Finishing score for `exercise_threshold` stations = the LAST
   authored exercise block's earned result (`station-walk.stationFinishScore`), so re-visiting an
   earlier block can't poison the completion score. Uncompleted blocks still need redoing (honest
   restart of that block's session).
3. **F2 elimination semantics.** `eliminated` accumulates across attempts within one exercise
   (`station-walk.mergeEliminated`), survives `retry`, cleared only on advancing. Eliminated
   options: `disabled` + `aria-disabled` + line-through + grey Aizen token + the note
   «یک گزینهٔ نادرست حذف شد», and the click guard never re-sends them (server stays permissive).
4. **Emoji guard scope (documented in the test header).** Dingbats/emoji banned everywhere under
   `src` (comments stripped — engineering notes legitimately use →/✓); arrows additionally banned
   in product UI surfaces (`app/`, `components/`, `messages/`); `modules/curriculum/eqa/report.ts`
   excluded (CLI-only engineering report); `.css`/fonts excluded. Known accepted residuals:
   → notation inside protected `chapter-fm01.*` authored feedback copy (wave rule: fm01 off-limits
   beyond the audited symbols; audit found none) and dev-facing strings in `modules/**`
   (validation/warning/EQA messages, character manifest `_note`s).
5. **Deep-link gating.** `ChapterLockedNotice` (shared component) renders the journey page's exact
   locked markup on the station page and the anchor-dialogue page (both now
   `force-dynamic` + `chapterAccessStatus`). `/learn/[chapter]` intro stays open (DD-114:
   locked ≠ hidden) but its `prerequisitesNote` now renders only when the chapter declares a
   prerequisite, with lock-honest copy.

## Files changed (Wave 3 only — Wave 2's uncommitted changes untouched)

- `apps/web/src/modules/curriculum/station-walk.ts` (NEW — pure walk math)
- `apps/web/src/components/curriculum/exercise-session.tsx` (F2/F4 wiring; exported `OptionRow` + `ReturnToTeachingButton`)
- `apps/web/src/components/curriculum/station-runner.tsx` (prev nav, blockResults, returnToBlock, vocab meaning-first, skip panel)
- `apps/web/src/components/curriculum/chapter-locked-notice.tsx` (NEW)
- `apps/web/src/messages/fa.ts` (coordination point — announced in AGENT_PROGRESS.md)
- `apps/web/src/app/learn/[chapter]/page.tsx`, `.../dialogue/page.tsx`, `.../journey/[station]/page.tsx`
- `apps/web/src/app/page.tsx` (footer ← arrows → words)
- `apps/web/src/app/poc/{assessment,lesson,practice,t2-eval}/*.tsx` (emoji → text/lucide `Play`)
- `apps/web/src/app/learn/learn-card.tsx` (DELETED — dead since Wave 2)
- `apps/web/src/modules/curriculum/content/chapter-kana01.stations.ts` (✗→«نادرست», →/↔→words; pure symbol swaps)
- `apps/web/src/modules/curriculum/content/chapter-kana01.ts`, `content/kana-items.ts` (→→«به/می‌شود»)
- Tests: NEW `tests/unit/curriculum-station-walk.test.ts` (17), `tests/unit/curriculum-access.test.ts` (4),
  `tests/unit/ui/exercise-session.test.tsx` (7), `tests/unit/ui/no-emoji-gate.test.ts` (3);
  EXTENDED `tests/unit/curriculum-content.test.ts` (+2 F4 contract tests)

## Gates (real output, run from `apps/web`)

- `pnpm typecheck` — clean
- `pnpm lint` — clean
- `pnpm vitest run` — **28 files / 273 tests passed**
- `pnpm eqa` (repo root) — 37 passed

## Honest residuals / follow-ups

- Completed exercise blocks cannot be REDONE for practice through the UI (skip panel only) — the
  task chose "simplest honest behavior"; a future "redo" affordance would need to clear the
  recorded result deliberately.
- Returning from F4 to teaching restarts an UNcompleted exercise block from its first exercise
  (session position is not preserved) — documented as honest simple behavior.
- `character-scene` (INTEGRATE) blocks still restart on revisit (no result map for them) — same
  as pre-Wave-3 behavior; only `exercise` blocks earned persistence per the task.
- `assessment` + `complete` chapter pages have no explicit chapter-lock notice (out of the task's
  named scope; the mastery API itself enforces the core-path walk server-side, so no state can be
  faked — a locked chapter's gate cannot be passed without walking its stations).
- fm01 → arrows in feedback copy left untouched (protected content, audit found none).

## Skills used / sources reviewed

See the final task report in the conversation; primary sources: `AGENTS.md`, `AGENT_PROGRESS.md`,
`docs/engineering/learning/AGENT_READINESS_PROTOCOL.md` (§۴ report sections), README.md,
grading.ts + station API route (server contract), journey page (lock pattern), Wave-2 test
patterns (`tokens-gate.test.ts`, `dialogue-scene.test.tsx`, `buttons.test.tsx`).
