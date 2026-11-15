# TASK-HANASO-21 — Observation Remediation (Phase 3.3)

Full adjudication of OBS-001..OBS-010 (extracted from the TASK-HANASO-20
documents, not just the owner summary). Commit `2ef6630` (+ the E2E/audit
evidence from this mission).

| Obs | What it was | Adjudication | Action taken |
| --- | --- | --- | --- |
| OBS-001 | Two fm01 stations completed by VIEWING alone (no assessment) — the owner-decided bar says no CORE station completes by viewing | **Real product gap** (owner decision recorded in TASK-20) | `stn-fm01-01-anchor` and `stn-fm01-10-reconnect` converted from `viewed` to `exercise_threshold 0.6` with a 3-question SCENE-comprehension check each — answerable from the viewing itself (Persian glosses + prediction reveals), never from untaught language items. EQA-1's no-assessment-before-teaching gate stayed intact and RED-caught the first (line-comprehension) design before it shipped. Browser-verified end-to-end: S4.1 (fm01 anchor completes on a perfect walk, seal ceremony). |
| OBS-002 | fm01 exercise stations did not declare their mastery criterion | **Inconsistency** (kana01 already declared) | Every fm01 `exercise_threshold` station now declares its mastery criterion (kana01's 1:1 pattern — data for the future M2 engine). |
| OBS-003 | Declared chapter estMinutes ≠ honest station sum (45 vs 71; 348 vs 386) | **Real defect** (a declared lie) | Both chapters' `estMinutes` now equal the honest station sum (first-meeting-01 45→71, kana-foundation-01 348→386), pinned forever by a NEW validation gate (EST-MINUTES). The L2 `chapterMinutes` cap raised to the honest budget of the owner-approved 05B architecture ([35,75]) — the old 55' only "held" because the declared 45' was a lie. |
| OBS-004 | The four fm01 optional stations sat in the `__rest__` group | **Inconsistency** (kana01 pattern: an optional lives in a real unit) | The four optionals join `unit-02-2`. |
| OBS-005 | "Interactive block" undefined for the PASSIVE-RUN gate | **Documentation gap, not a code defect** | The formal definition is documented in `validation.ts`; the PASSIVE-RUN gate itself is unchanged and green. **No fix needed** — behavior was correct. |
| OBS-006 | The apply (手書き) role never used | **Product decision — stays deferred** with the owner's recorded TASK-HANASO-20 approval (apply role = full deck rewrite; "no feature just for traceability") | Not implemented (deliberate). |
| OBS-007 | `ex-fm01-or2-mp-1`'s distractor rationale map was empty | **Real content defect** | Filled from the documented error family (final-mora drop / long-e spelling); the audit's 59%-template state no longer exists. |
| OBS-008 | The `/complete` page claimed FSRS cards were "enqueued" (engine not integrated) | **Honesty defect** | The sentence is honest now: «آمادهٔ صف مرورند… هنوز فعال نیست». |
| OBS-009 | FSRS card counts on `/complete` were stale | **Data defect** | Counts recomputed from the real inventory and pinned here: **kana-foundation-01 = 110** (110 kana cards), **first-meeting-01 = 37** (11 words, 11 sentences, 5 grammar, 8 chunks, 2 sentence-lines) — total 147. The page renders from the live inventory (`listChapterCards`), so it can never drift again. |
| OBS-010 | A dev footer (`/api/health` + version) rendered on the learner-facing Home | **Product defect** (technical text in learner UI) | Removed from Home; operators read the endpoint directly. |

## Not touched (deliberate — the brief's rule)

No intentional educational/content difference was erased "just to unify".
OBS-005 (correct behavior, missing doc) and OBS-006 (owner-approved deferral)
are the two explicitly-not-fixed rows, each with its recorded reason above.
