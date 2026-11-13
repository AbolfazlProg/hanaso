# T1-C — Architecture, Performance & QA Audit (learn path ch1+ch2, shared modules)

> Subagent C, Round T1. READ-ONLY audit of apps/web learn surfaces. Evidence-based; CONFIRMED/HYPOTHESIS per §4.
>
> Summary: 15 findings — High ×2 (T1-C-09 content-lint gap, T1-C-13 test blind spots), Medium ×6, Low ×7; all 15 CONFIRMED. No Critical architecture defect: layering is clean, no N+1, no answer-key leakage, payloads lean. The systemic risk is tooling: ~20k lines of content with zero static lint, and the one Critical of the C rounds (C2-B-01) shipped precisely through a carved-out exception in the only audio gate.

## Findings (T1-C-nn)

### T1-C-01 — Two parallel "progress machine" modules with duplicated mastery-gate semantics  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: apps/web/src/modules/curriculum/progress-machine.ts:1-145 vs apps/web/src/modules/progress/progress-machine.ts:1-148
- Problem: two state machines encode the same DD-048 rule («understood ONLY from a passed gate attempt») independently. `modules/progress` is the POC-era A→D dialogue cycle (routes to `/poc/dialogue`, `/poc/assessment`); `modules/curriculum` is the live island walk. Both define chapter/unit status transitions + mastery gating.
- Actual: curriculum machine comment: "`understood` ONLY from a passed gate attempt (DD-048) — never from walking"; progress machine: "the mastery gate: `mastery_passed` only flips status to 'understood' when the caller passes the attempt's real outcome".
- Evidence: read both files in full; usage grep — `modules/progress` consumed only by `app/api/progress/route.ts` + `lib/poc/*`.
- Impact: two sources of truth for "understood"; POC surface keeps a second gate path alive that can drift (it already differs: POC machine throws typed errors, curriculum one folds silently).
- Suggested fix: fold `modules/progress` into the POC demo area or mark it deprecated-owned (MODULE-OWNERSHIP), keep one canonical gate rule.
- Regression test: none needed (architectural).

### T1-C-02 — `CHAPTER_FLOW` transition table is declared then `void`ed — never enforced  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: apps/web/src/modules/curriculum/progress-machine.ts:68-74,123 (`void CHAPTER_FLOW;`)
- Problem: the intended chapter-flow legality table is dead code; actual transitions are enforced ad hoc in the switch (e.g. `stations_completed` only from `started`).
- Actual: `void CHAPTER_FLOW;` — kept only to silence the unused-var lint.
- Evidence: source read.
- Impact: misleading; a future edit may trust the table that does nothing. Same pattern at db/repositories/curriculum.ts:290 (`void lessons;` — unused import silenced instead of removed).

### T1-C-03 — Walk snapshot codec: raw `JSON.parse` cast, inner shapes unvalidated  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: apps/web/src/modules/curriculum/walk-persistence.ts:106 (`JSON.parse(raw) as StationWalkSnapshot`)
- Problem: only `v`, chapter/station slug, `stepIndex`, `completed` are checked. `blockResults`, `exerciseProgress` (incl. `index`, `attemptNo`), `kanaCardStages` pass through unvalidated — a corrupted/hand-edited snapshot injects arbitrary shapes into walk state (NaN indexes, negative `firstTryCorrect`).
- Expected: a schema check (zod or manual guards) over the nested fields like the API routes do; or `clamp`/sanitize on restore.
- Actual: `const parsed = JSON.parse(raw) as StationWalkSnapshot;` + 5 top-level checks only. `kanaCardStages` is typed `Record<string, string>` (values later normalized by `normalizeKanaStage` — partial mitigation).
- Evidence: full file read; consumer at station-runner.tsx:548-566 restores `snapshot.blockResults ?? {}` directly into state.
- Impact: low likelihood (own-browser localStorage), but a corrupt snapshot can wedge a walk (e.g. `exerciseProgress.index` = "2" string).
- Suggested fix: validate nested numeric fields on load; drop the snapshot on any mismatch (the file's own "honest: no resume rather than a wrong position" principle).
- Regression test: unit test loading a corrupted snapshot per nested field.

### T1-C-04 — Non-null assertions concentrated in the learn UI trio (24 sites)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: station-runner.tsx:840,846,1269,1272,1603-1604,2528-2536,2696; exercise-session.tsx:486,616-617,756,796; mastery-gate.tsx:281; section-journey.tsx:259; practice/generator.ts:161; practice/kana/generator.ts:372; practice/kana/items.ts:28; api/curriculum/journey/route.ts:40
- Problem: 24 `!` non-null assertions in the learn path. Several follow `.find()` chains where the not-found case is real (e.g. `ex.chunks!.find((c) => c.id === id)!` — a content id typo crashes the render with a TypeError instead of a boundary).
- Evidence: rg counts (`[a-zA-Z0-9_)]!(\.|\[)` = 23 in components+modules, +1 in journey route). Direct `any` is essentially absent (only 2 doc-comment matches; `as unknown as` ×3 in client-transport.ts:344,361,369 + 1 in audio/client-cache.ts:14).
- Impact: content-id drift (the very thing the C rounds found repeatedly) turns into a hard crash rather than an honest fallback.
- Suggested fix: replace `find(...)!` with null-guard + content-lint (see T1-C-09); keep `blocks[i]!` (index-bounded, safe).
- Regression test: render tests feeding a station whose chunk ids don't match the exercise (would crash today).

### T1-C-05 — StationRunner: 2,801 lines, 14-prop surface, walk + grading + audio + writing + ceremony in one component  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: apps/web/src/components/curriculum/station-runner.tsx (2,801 lines); trio: station-runner + exercise-session (1,135) + kana-card (1,034); section-journey 473.
- Problem: single component owns: resume/restore state machine (7 useState + refs), snapshot persistence, server sync, completion/retry/recovery (409 prerequisites/criterion), audio resolution for 5 registries, kana prefetch, seal ceremony, achievements, and the block renderer for 10+ block kinds. No `React.memo` anywhere in the trio; props include 5 audio Record maps (prop-map passing instead of a context/provider).
- Actual: `interface StationRunnerProps` lines 60-127 (14 props, 5 of them audio lookup maps); resume effect lines 519-646 is a 128-line stateful epic with deliberate dep-limits.
- Evidence: full read of lines 1-909 + targeted greps; wc -l.
- Impact: every new block kind or audio registry touches the same file; re-render blast radius is the whole runner (state changes are coarse but each re-render walks a large tree).
- Positive counter-evidence: business rules ARE extracted into pure modules (station-walk, walk-persistence, resume-policy, grading) and the resume race (CP-04) is explicitly fixed and documented — the file is monolithic but not spaghetti.
- Suggested fix: split block renderers into per-kind components registered by `kind`; wrap audio maps in one context object; extract the resume epic into a `useStationResume` hook.
- Regression test: behavior tests exist (station-walk-regression.test.tsx); port them per extracted hook.

### T1-C-06 — Completion-409 recovery logic duplicated between station-runner and mastery-gate  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: station-runner.tsx:759-809 (structured 409 parse: `station/prerequisites_not_met` + `station/completion_not_met` kind=criterion) vs mastery-gate.tsx (own fetch + 409 handling, e.g. comment line 79 "e.g. 409 mastery/gate_locked")
- Problem: both components hand-parse `error.details` payloads and run their own retry/recovery UX; no shared `apiErrorFrom(res)` helper. Station-runner's parser is defensive (Array.isArray checks); mastery-gate re-implements the pattern separately.
- Evidence: grep of 409/prerequisites/criterion across both files + read of station-runner block.
- Impact: an envelope change (e.g. new detail kind) must be fixed twice; drift risk.
- Suggested fix: one shared client helper `parseCompletionFailure(res)` in modules/curriculum/client-transport.ts (already the boundary module).
- Regression test: unit test of the helper against 409 fixtures (currently covered only via two separate UI tests).

### T1-C-07 — Uncleaned timeouts / settle-after-unmount in resume + notice effects  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: station-runner.tsx:526,565,609,632,639 (`window.setTimeout(() => setRestartNotice(false)/setResumedNotice(false), 4000-6000)` with no cleanup) and 581-642 (`fetchServerResume(...).then(...)` no abort/ignore-after-unmount).
- Problem: notice timers and the resume promise continue after unmount; `setResumeSettled(true)` can fire on a dead component. React 18 no longer warns and the state is dropped, so impact is cosmetic, but the same pattern in a future refactor (e.g. navigating between stations quickly) re-introduces the class of race the CP-04 fix addressed.
- Actual: the CP-04 race itself IS fixed (resumeSettled gate at line 656 correctly orders persist-after-settle).
- Evidence: source read; deps array at 646 is `[replayMode, restartRequested]` with restoreChecked guard — single execution confirmed.
- Suggested fix: store timer ids in refs, clear on unmount; ignore resume result via an `unmountedRef`.
- Regression test: RTL unmount-during-resume (asserts no setState after unmount).

### T1-C-08 — WritingCanvas re-renders on every pointer-move (per-point setState + O(n) array copy)  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: apps/web/src/components/writing/writing-canvas.tsx:533-541 (`onPointerMove`: `liveRef.current = [...liveRef.current, p]; setLive(liveRef.current);`)
- Problem: each pointer move allocates a new array (O(stroke-length) copy → O(n²) per stroke) and `setLive` re-renders the whole 832-line canvas component (all SVG layers, demo/hint state) per move. No `React.memo` on children; the re-render is confined to WritingCanvas (state is local), so station-runner is NOT re-rendered per keystroke — the hazard the round feared is bounded.
- Evidence: source read of state hooks (lines 282-313) + pointermove handler.
- Impact: on low-end mobile with a long free-writing stroke, jank is plausible; measured as Low because the component is leaf-local and paths are simple.
- Suggested fix: draw the live stroke on a `<canvas>`/path updated via ref during the move; commit points to state on pointerup only.
- Regression test: none (perf); a rAF-throttle would be observable in a perf trace.

### T1-C-09 — Content-as-code at 11k+ lines with NO content-lint tooling (architecture gap behind the C-round bugs)  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: modules/curriculum/content/chapter-kana01.exercises.ts (11,222 lines / ~475 items), chapter-kana01.stations.ts (4,201), kana-items.ts (2,961), fm01 pair (1,185+2,007)
- Problem: no automated content-lint exists. EQA gates (modules/curriculum/eqa/*, unit/eqa-gates.test.ts) check structural/pedagogy policies, but the C1/C2/C3 bug classes (option-id mismatches, prerequisite drift, distractor = correct answer, hint/rationale copy errors, audio refs) have no static cross-check layer; each C-round agent re-derived checks ad hoc.
- Evidence: eqa/gates.ts read (see T1-C-13 for coverage); C-round reports (rounds/c1..c3) each proposed validators; none exist in repo (no scripts/content-lint*, verified by glob).
- Impact: every content edit (ch3+) re-risks the same bug classes; review is manual-by-LLM.
- Suggested fix: a content-lint script (node loader like c2 used) asserting: option ids referenced by correct/distractors exist; every glyph used is introducedInUnit ≤ station unit; audio ids exist in manifest; no duplicated correct/distractor; Persian copy sanity (e.g. stray label fragments — C3's «راهنما» bug class).
- Regression test: the lint IS the regression test; wire into CI before ch3 authoring.

### T1-C-10 — RSC/client payloads measured: lean; no station-content leakage to client chunks  [SEVERITY: Low→POSITIVE-leaning] [STATUS: CONFIRMED]
- Location: local standalone server (PORT 3185/3186), identical build to production commit.
- Evidence (bytes, HTTP 200): `/learn/kana-foundation-01/journey` 84,283 B; `/learn/.../stn-kana-h1` 35,434 B; `stn-kana-m1-reading` 25,995 B; `/learn/first-meeting-01/journey` 24,718 B; `/api/curriculum/journey?chapter=kana-foundation-01` 21,858 B. Static JS total 3.5 MB; largest chunk 228 KB.
- Answer-key leakage probes: distinctive exercise feedback strings («به شکل あ و یادسپارش برگرد…», «کانای あ در هیراگانا/کاتاکانا…») NOT present in any .next/static chunk NOR in the stn-kana-h1 RSC payload (grep count 0 for probes, `correctOptionId`, `answerKey`). POSITIVE: the content-as-code → server-only contract holds at the wire level.
- Caveat (Low finding): `kana-items.ts` registry (glyph/mnemonic/hostWord, 2,961 lines) DOES ship in client chunk `2iop210mmmbv8.js` (180 KB) because station-runner imports `KANA_ITEMS_BY_ID/GYLH` for related-example matching — glyph metadata, not exercise keys, so contract-safe, but it is the single largest data block in the client bundle and will grow with every future chapter unless the registry is split per-chapter or the lookup moves server-side.

### T1-C-11 — Journey/station repository access is batched — NO N+1 found  [SEVERITY: Low→POSITIVE] [STATUS: CONFIRMED]
- Location: app/api/curriculum/journey/route.ts:45-49 (single `listForUnit` for all station slugs + one chapter get); db/repositories/curriculum.ts:104-122 (`inArray` batch + map join).
- Evidence: read both; `listForUnit` maps all slugs in one `inArray` query; id↔slug caches primed deterministically (db/ids.ts uuidv5).
- Impact: journey GET is 2 queries + access check regardless of 34 stations. POSITIVE.
- Note: `slugFromStationProgressId` falls back to `unknown:${id}` if the reverse cache is cold (curriculum.ts:273) — currently unreachable because `listForUnit` primes it first; a future caller skipping the priming gets silent `unknown:` slugs. Low hazard.

### T1-C-12 — Practice `write` items graded client-side (cross-ref T1-B-05, independently confirmed)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: modules/practice/session.ts:100-110,158 — `PracticeAnswerPayload = … | { kind: 'write'; accepted: boolean }`
- Problem/Impact/Evidence: see T1-B-05 (B found the same seam from the API angle). My architectural addition: the module comment documents it as deliberate ("the writing engine judges strokes locally — lesson parity"), but lessons store no progression-critical evidence from client grading while practice feeds `LearningObjectRecord` — the asymmetry makes this the one boundary where SKL-013 does not hold. Fix: `gradedBy: 'client'` marker now; server re-judgment before any FSRS promotion (M2).

### T1-C-13 — Test-suite architecture: strong on structure/persistence, blind on content semantics — 10 uncovered classes that produced the C-round bugs  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: apps/web/tests/unit (61 files, 539 it/test blocks measured), tests/integration (5 specs) + tests/integration-pg (8 specs) (69 blocks measured)
- What IS covered (strong): content structure pins (station counts, exercise-id uniqueness, blueprint numbers — curriculum-content.test.ts); EQA gate mutation tests (prerequisite/taught-after, packet rules, no-interactive rejection — eqa-gates.test.ts); walk snapshot codec incl. corrupt-JSON and per-learner keys (curriculum-walk-persistence.test.ts); server walk/resume/expiry/completion idempotency (station-walk-position, station-resume-expiry integration); UI regressions for refresh-revisit, stale-closure scoring (progress-integrity, final-completion-reliability, aizen-seal); audio orphan gate for host words (h21-audio-inventory.test.ts); FSRS never mutated by practice (fsrs-context.spec.ts).
- NOT covered — mapped to the C-round bugs each gap let through:
  1. Duplicate/cross-script-homophone options under one item → C1-B-01 (60 twin-answer items), C2-B-03 (`chuugokujin` twice). A content-lint enumerating all items for duplicate labels/readings would have caught both.
  2. `distractorRationaleFa` keys ⊆ option ids, keyed to the right option → C1-C-01. feedback-quality.test.tsx renders 2 sampled cases only.
  3. Japanese-string codepoint hygiene (Arabic ن, stray Persian chars in ja) → C1-A-03, C1-C-11.
  4. Copy-number ↔ dialogue-yaml reconciliation (stale «۱۴ نوبتی») → C1-A-06, C1-C-02.
  5. Wrap-up claims reconciliation (word counts, «FSRS ثبت شد») → C1-A-09/11, C1-C-06/07.
  6. Answer-position/length bias statistics → C1-B-05, C2-B-06, C2-B-10.
  7. **Gate listening-item audio existence** — h21-audio-inventory.test.ts deliberately excludes the `kn-` kana registry and gate items ("they own the separate kn-* kana registry") and NO test pins gate `promptAudio` → C2-B-01 (Critical: M2 listening unpassable-by-sound). The worst gap: a Critical shipped because the one existing audio gate carved out exactly the surface that broke.
  8. Gate pool ∩ practice pool = ∅ → C1-B-04, C2-B-05 (7 recycled gate items).
  9. Hint-affordance behavior («سرنخ» no-op) → C1-C-05 — no UI test drives the hint button.
  10. Practice session lifecycle integration (POST /api/practice start→answer→complete→LO upsert) — only generator/checker units + a touch in learning-slice; no dedicated spec.
- Brittle-vs-behavior: tests are predominantly behavioral (RTL renders, API envelopes). Two intentional pins are structure-coupled by design: curriculum-content.test.ts exact station counts and eqa-gates.test.ts "registers exactly the known violation set" (every new waiver requires editing the test — a deliberate ratchet, defensible).
- Suggested fix: implement the content-lint (T1-C-09) covering classes 1-8; add a gate-audio test; add practice-route integration spec.

### T1-C-14 — No error-observability layer: zero Sentry, zero structured logging on API routes  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: rg over apps/web/src: `sentry|Sentry` = 0 matches; `console.*` only in db/cli.ts (14), worker/main.ts (5), db/readiness.ts (1), audio/client-cache.ts (1)
- Problem: learn-path route handlers return typed `fail()` envelopes to the client but leave no server-side trace; a 500 in production (e.g. a content id crash from T1-C-04's `!` assertions) is invisible unless the owner reads container logs manually.
- Evidence: grep counts above; no logging middleware in src/middleware.ts.
- Impact: the production incidents this mission already re-derived (completion bug, audio drift) were found by browser probing, not telemetry.
- Suggested fix: minimal structured logger (request-id + route + status + duration) on API envelope `fail()` paths; Sentry (or self-hosted GlitchTip) for 5xx.
- Regression test: unit test asserting the logger emits on fail paths.

### T1-C-15 — Env/config surface is small and documented (POSITIVE, one Low note)  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: apps/web/.env.example; process.env usage: 14 sites (db/client ×3, worker, resume-policy, build-info ×3, restore, migrate, cli)
- Positive: no secrets in git; `NEXT_PUBLIC_*` limited to env/version/sha; absent DATABASE_URL degrades to in-memory dev repos by design (documented); resume-policy reads an env override with a documented default (7 days).
- Low note: resume-policy.ts:41 env override means the production resume TTL is config-dependent while the client snapshot TTL logic mirrors it — a config/client divergence class; acceptable because both read the same default, but the client cannot see the server override (it re-syncs via the server-authoritative expired flag — verified at station-runner.tsx:597-611). No action needed beyond awareness.

## POSITIVE FINDINGS (T1-C-P*)
- **P1 — API boundaries consistently zod-validated**: all learn-path routes parse bodies via discriminated unions (station route: 10 z schemas; practice: 7; mastery: 5; progress/events/attempts: 1 each — 25 occurrences/6 files). Read of station route confirms `bodySchema = z.discriminatedUnion('action', …)` incl. attemptNo bounds.
- **P2 — Answer keys never cross to the client**: verified at both layers (static chunks + RSC payload, T1-C-10); `toClientItem` destructures the key out (`const { correctOptionId: _key, revealFa: _reveal, ...rest }`) — the stripping is structural, not cosmetic.
- **P3 — Pure modules with genuine separation**: station-walk/walk-persistence/resume-policy/grading are UI-free, unit-tested pure functions; the monolith station-runner delegates its rules to them. The CP-04 resume race is fixed with an explicit, documented settle gate (station-runner.tsx:649-683).
- **P4 — Repositories are batched and deterministic**: uuidv5 id sharing between seed and repos (db/ids.ts) eliminates an id-resolution query class; upsert semantics (set/clear/preserve currentBlock via self-referencing SQL) are documented at curriculum.ts:64-74.
- **P5 — Honest offline/failure design**: every client fetch in station-runner has a typed fallback (gradeBlock → null, syncWalkPosition → swallowed, completion → structured 409 panels); single-flight completion guard + bounded (3s) ordering await on the in-flight sync (lines 695-726).
- **P6 — Practice never schedules reviews / never mutates FSRS** (session.ts header contract, single-scheduler rule) — architecture rule enforced by module boundary, tested in fsrs-context.spec.ts.

## COVERAGE
- Read in full: modules/curriculum/progress-machine.ts, modules/progress/progress-machine.ts, walk-persistence.ts, db/repositories/curriculum.ts, app/api/curriculum/journey/route.ts, modules/practice/session.ts (158/158 lines), station-runner.tsx lines 1-909 (32%) + targeted greps across all 2,801 lines (state/effects/props/409 paths), writing-canvas state+pointer sections, kana-card state section.
- Grepped/counted: all of apps/web/src for `any`/`as unknown as`/`@ts-ignore` (4 real hits, see T1-C-04), non-null assertions (24 in learn path), zod usage (25 across 6 API files), JSON.parse raw casts (6 files: walk-persistence + audio manifests).
- Measured locally (standalone build = production commit): 6 URLs (T1-C-10), static chunk audit (top 12 chunks, 3.5 MB total), 2 Persian answer-key probes × static chunks + RSC payload.
- Tests: inventory of tests/unit (61 files) + tests/integration (5) + integration-pg (8); read of eqa/gates.ts, eqa-gates.test.ts structure, curriculum-walk-persistence.test.ts, station-walk-regression.test.tsx headers (see T1-C-13 for what's NOT covered).
- NOT covered by me: mastery/scoring.ts internals, dialogue playback engine, fsrs/integration.ts, character module, full exercise-session.tsx body (1,135 lines — only state/answer paths sampled).

## Runtime-cost note (perf scope item, folded)
- The 4,201-line stations file is compiled TS (static object literals, eager imports in content/index.ts) — module-eval cost only, server-side; verified NO station/exercise text reaches client chunks (T1-C-10 probes), so the 11k-line exercise bank costs the client nothing. Import-time content "parsing" is a build-time non-issue by construction (content-as-code).
