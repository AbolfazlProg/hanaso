# TASK-HANASO-22 — CURRENT STATE

> Updated: 2026-11-13 (Asia/Tehran). Recovery: read this file, then `CHECKPOINT_LOG.md`,
> then `git log --oneline -10` on the mission branch. Continue from «Next action».

## Mission

Learning Experience Evolution: (1) Learn — new-concept teaching, (2) Practice — real
independent Kana practice (extensible architecture for future skills), (3) Review —
spaced-review connection, (4) Motivation — chapter intros, lesson-end achievements,
AIZEN seal presentation upgrade + licensed sound, real-world milestones, journey icons,
button feedback, split chapter 01 into two logical sections, remove punitive scoring
from Learn.

## Phase status

| # | Phase | Status |
| --- | --- | --- |
| 0 | Git/state audit + branch + first checkpoint | ✅ DONE (this file, CP-00) |
| 1 | Scientific research (4 docs in docs/research/) | ✅ DONE (CP-01) |
| 2 | Learn/Practice/Review architecture design | ✅ DONE (CP-02) |
| 3 | Kana Practice implementation (Focused + Mixed) | ✅ DONE |
| 4 | Remove punitive scoring from Learn + feedback redesign | ✅ DONE |
| 5 | Chapter intros + lesson achievements + milestones | ✅ DONE |
| 6 | AIZEN seal presentation upgrade + sound effect | ✅ DONE |
| 7 | Chapter 01 → two sections + journey icons + locked feedback | ✅ DONE |
| 8 | Button/interaction feedback audit | ✅ DONE |
| 9 | Full testing + regression | ✅ DONE (E2E 25/25 + H21 44/44 + unit 737 + integ 32 + EQA 37) |
| 10 | Release prep | 🔶 BRANCH READY (production build green; owner decides deploy) |

## Git state

- Branch: `feat/TASK-HANASO-22-learning-experience` (local, created from
  `origin/fix/TASK-HANASO-21-completion-seal` @ `8579643` — TASK-21's final pushed tip).
- Worktree: `/home/z/my-project/hanaso22` (repo shared with `/home/z/my-project/hanaso16`).
- TASK-21 verified COMPLETE and PUSHED: product target D=`33304b1`, release
  `1.0.0-hanaso21-r01`; production still runs `1.0.0-hanaso17-r01 @ 3f41f6ee` (owner
  never ran the TASK-20/21 one-liners — nothing auto-deployed, that is the owner's call).

## Audit findings (Phase 0 — code-verified, not from old reports)

### Architecture

- Monorepo `apps/web` (Next.js 16 App Router, pnpm, TS strict), modules:
  `audio, character, curriculum, dialogue, fsrs, home, mastery, practice, progress,
  shared, writing`. DB: Drizzle + PostgreSQL, schemas `content` + `app`
  (station_progress, chapter_progress, lesson_progress, dialogue_mastery_attempts).
- Chapters (content-as-code, `src/modules/curriculum/content/`):
  1. `kana-foundation-01` (L1): 33 stations (h0..h15, k1..k13, k12-foreign,
     opt-r-h9, opt-drill), 4 islands (`units[]`), estMinutes **386**, gate G1
     (0.90/0.80) on `/assessment`.
  2. `first-meeting-01` (L2): 18 core + 4 optional stations, 2 story units,
     estMinutes 71, prerequisite = kana chapter. Dialogue-native exercises.
- `units[]` (ChapterUnit) = grouping for the one-section-at-a-time SectionJourney UI
  (`resolveSections` in `journey.ts`). Sections are DERIVED from units, walk order and
  prereqs stay station-scoped.

### Learn today (what Phase 4 changes)

- **Punitive scoring root cause CONFIRMED in code**: 31/33 kana + 19 fm01 walk
  stations carry `completion: { kind: 'exercise_threshold', threshold: 0.7 }`. A
  first-try-correct score < 0.7 on the final exercise block → 409
  `station/completion_not_met` (route.ts:457-468) → red «criterion» panel + forced
  redo of the block. This is pass/fail scoring inside Learn.
- **Wrong-answer spoiler root cause CONFIRMED in code**: grading route attaches
  `correctReading` (big glyph + Persian + Latin) and `correctAudio` to EVERY answered
  outcome — including a FIRST wrong attempt (F1) (station/route.ts:267, 282). The
  F1→F2(hint+eliminate)→F3(reveal) ladder exists in `grading.ts` but the reveal-shaped
  reading card leaks at F1. Owner's complaint matches exactly.
- Feedback panel is in-place `role=status` (good), no scrollIntoView; first wrong
  answer auto-advances never; retry button at F1/F2, reveal at F3 (attempt 3).

### Practice / Review today

- `modules/practice` = dialogue exercise GENERATOR (speaker-identify,
  order-reconstruct, listen-no-text, fill-token) for the dialogue chapter — there is
  NO independent Kana practice surface and no practice-session persistence.
- FSRS: honestly `not-integrated` (`modules/fsrs/integration.ts` — FsrsReviewPort
  throws `FsrsNotIntegratedError`; ts-fsrs pinned; `kn-` card ids data-only;
  enrollment events carry `engine: 'not-integrated'`). Home review line honest.
- Kana exercise types already in lessons: `kana-recognition`, `kana-recall`,
  `kana-decode`, `kana-listening`, `rule-listening`.

### AIZEN seal today (Phase 6 baseline)

- `components/curriculum/aizen-seal.tsx`: SVG hanko 藍染, vermilion (shu) tokens,
  carved ring, tategaki, ink-skip chips, grain filter; CSS ceremony
  (`aizen-seal-stamp` + ink halo) in `globals.css`; reduced-motion → simple fade.
  Frame `size-28 md:size-32` inside station completion panel (station-runner.tsx:1067).
- Owner satisfied with the seal identity; wants bigger scale, rotating ink ring,
  shimmer, achievements beside it, licensed stamp sound, idempotency kept.
- NOTE: chapter `/complete` page still shows the OLD «理解» circle (not the seal) —
  that page is chapter completion, not lesson completion.
- NO sound effect exists today.

### Journey UI today (Phase 7 baseline)

- `SectionJourney`: left `RowMarker` circle shows Lock for locked rows AND right
  action box ALSO shows Lock (duplicate lock confirmed — section-journey.tsx:240-243).
  Locked row = non-clickable `div` with only a `title` tooltip (no shake/reason).
- Station types: `anchor, dialogue, vocab, grammar, expression, listen, structure,
  practice, integrate, mastery, review, deepdive, kana` — no per-type icon identity.

### Assets available for Practice

- 92-glyph `KANA_ITEMS` registry (glyph, script, row, romaji, hostWord{word,meaningFa},
  confusableWith, mnemonic, fsrsCardId, introducedInUnit H1..K13).
- 185 kana audio files (`public/audio/kana/kn-*.{opus,m4a}`), 307 hostword files.
- Writing engine: `modules/writing` (analysis/engine/render/char-data, KanjiVG
  centerlines → stroke-order data exists).

## Key decisions so far

- Work on branch `feat/TASK-HANASO-22-learning-experience` off TASK-21's tip (not main).
- All content edits stay content-as-code; no destructive migration; protect TASK-20/21
  fixes (user isolation, 409 mastery-gate fix, seal idempotency, hygiene gates).
- Scope guard: Kana practice implemented now; Vocabulary/Grammar/Kanji/Speaking only
  researched + architected (docs), NO new content for them. No library. No analytics.

## Next action (exact)

MISSION COMPLETE — all 10 phases delivered, tested, and pushed (tip `0b80617`).
Recovery for any future session: this file + CHECKPOINT_LOG.md + TEST_RESULTS.md.
Remaining for the OWNER: review the branch; deploy when ready (the deploy
one-liner pipeline is TASK-21's — a new release tag is cut at deploy time).
Out-of-scope leftovers (deliberate): FSRS M2 engine, Library, Vocabulary/Grammar/
Kanji/Speaking content (researched + architected only), PG integration re-run,
VOICEVOX hostword generation on the VPS.
