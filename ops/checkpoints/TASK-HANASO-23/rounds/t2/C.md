# T2-C — Adversarial Architecture Audit (attack on T1-C)

> Subagent C, Round T2 (TASK-HANASO-23). Mandate: verify/refute T1-C's 15 findings, then attack T1-C's own declared gaps (mastery/scoring, dialogue engine, fsrs integration, exercise-session body) + fresh angles (migrations, worker, deps, chunk). READ-ONLY; all evidence re-derived from source unless marked accepted.

**Summary: 15 T1-C verdicts: 12 VERIFIED, 1 NARROWED (C-14), 2 count-drift-but-verified (C-04, C-13); 0 REFUTED — T1-C is honest. 9 new findings (T2-C-01..09): 1 High (kana gate is de-facto 14/14 perfect; the 0.9 weighted threshold can never bind), 5 Medium, 3 Low. Headline discovery: in T1-C's own blind spots sit the two most consequential architecture facts of the mission — (a) the mastery gate's minMeasure floor quantizes to "zero mistakes" at current bank sizes, and (b) the entire learning-event contract (incl. the FSRS enrollment replay source) is an in-memory ring that dies on every restart while every progress store beside it persists to PG.**

## §1 Verdict table — T1-C-01..C-15

| ID | Verdict | Re-derivation (what I did) |
| --- | --- | --- |
| C-01 two progress machines | **VERIFIED** (+narrow) | Both files exist; `modules/progress` consumed by `app/api/progress` + `lib/poc/*`. Nuance T1 missed: the POC attempts route hardcodes `LEVELS_BY_CODE['L2']!` (attempts/route.ts:77) but is *documented* as the L2 pilot band scheduled for removal (#101) — drift risk bounded, see T2-C-09. |
| C-02 `void CHAPTER_FLOW` dead table | **VERIFIED** | `void CHAPTER_FLOW;` at progress-machine.ts:123 and `void lessons;` at db/repositories/curriculum.ts:290 both seen directly. |
| C-03 raw `JSON.parse` snapshot cast | **VERIFIED** | walk-persistence.ts:106 `const parsed = JSON.parse(raw) as StationWalkSnapshot;` seen verbatim; 5 sibling raw casts confirmed (fsrs/index.ts:74, 3 audio manifest files). |
| C-04 non-null assertions (24) | **VERIFIED, count NARROWED** | With T1-C's stated regex `[a-zA-Z0-9_)]!(\.|\[)` I count **16** across the trio+practice (station-runner 8, exercise-session 5, mastery-gate 1, section-journey 1, kana/generator 1; practice/generator.ts and kana/items.ts = 0). Wider forms (e.g. journey/route.ts:40 `LEVELS_BY_CODE[chapter.levelCode]!`) recover ~24. The claim's substance is real — exercise-session.tsx:756 is verbatim `ex.chunks!.find((c) => c.id === id)!`. |
| C-05 StationRunner 2,801 lines | **VERIFIED** | wc -l: station-runner 2801, exercise-session 1135, kana-card 1034, section-journey 473 — all four exact. |
| C-06 duplicated 409 logic | **VERIFIED** | station/route.ts:470-479 criterion envelope (`details: { kind: 'criterion', … }`) + mastery-gate.tsx:79 own-409 comment; two hand-parsers confirmed. |
| C-07 uncleaned timers | **VERIFIED** | 5 uncleaned `window.setTimeout` at station-runner.tsx:526,565,609,632,639; note line 388-389 (seal sound) *does* clean up — the codebase knows the pattern and skips it for notices. |
| C-08 WritingCanvas per-move setState | **ACCEPTED (not re-derived)** | Time-boxed out; no contradicting evidence. |
| C-09 no content-lint | **VERIFIED (stronger)** | No `content-lint*` in scripts/; stronger: the repo's *only* content-fix tooling is one-off python fixers (`tl14-fix-exercises.py`, `hanaso20_content_remediation.py`) — fixes happen as ad-hoc scripts, never as a gate. |
| C-10 lean payloads / 180KB kana chunk | **VERIFIED (chunk)** | `2iop210mmmbv8.js` = **183,690 B** on disk — matches "180 KB". Wire probes accepted. |
| C-11 batched repos, no N+1 | **VERIFIED (partial)** | Journey route confirmed single bundle load + one level lookup (journey/route.ts:38-42); `inArray` batching not re-derived. |
| C-12 practice write graded client-side | **VERIFIED (strongest form)** | practice/route.ts:246-249: server trusts `payload.answer.kind === 'write' && payload.answer.accepted` — the client boolean IS the grade. |
| C-13 test blind spots | **VERIFIED, count drift** | Recursive count: tests/unit **57** files (T1: 61), integration 5 ✓, integration-pg **7** (T1: 8). Substance (no content-semantics layer, gate-audio carve-out) accepted. |
| C-14 zero observability | **NARROWED** | Substance VERIFIED: no Sentry wiring; `console.*` in app/ = 0 files (only worker/main.ts, db/cli.ts, db/readiness.ts, audio/client-cache.ts). But the evidence quote "sentry = 0 matches" is wrong: modules/shared/index.ts:5 explicitly names "the error monitor (Sentry or GlitchTip — OTD-011 open)" — the gap is *known and ticketed*, an unstarted contract, not an oversight. |
| C-15 env surface small | **ACCEPTED** | Consistent with requiredEnv usage in worker/migrate; not re-derived. |

## §2 New findings in T1-C's declared gaps

### T2-C-01 — Kana mastery gate quantizes to a perfect 14/14; the 0.90 weighted threshold is dead-letter  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: modules/curriculum/content/levels.ts:35 (`gate: { weighted: 0.9, minMeasure: 0.8 }`) × chapter-kana01.exercises.ts mastery bank (M1×4, M2×3, M3×3, M4×2, M5×2 = 14 items, counted via `assessmentRole: 'mastery_M*'` grep) × modules/mastery/scoring.ts:67
- Problem: minMeasure 0.8 against per-measure banks of 2–4 items means ANY single wrong answer makes its measure ≤ 0.75 < 0.8 → `weakMeasures` non-empty → outcome `remediate`. Best achievable with one error: M1 3/4=0.75, M2/M3 2/3≈0.67, M4/M5 1/2=0.5 — all below floor. The gate therefore requires **14/14 perfect**.
- Actual (the dead-letter part): with one M1 error the weighted score is 0.3·0.75+0.25+0.2+0.15+0.1 = **0.925 ≥ 0.9** — so `thresholds.weighted` (the headline kana-gate number from thresholds.json/DD-120) can NEVER be the binding constraint at this bank size. The gate is materially stricter than its designed threshold.
- Evidence: arithmetic over the counted bank + levels.ts read + scoring.ts:67,73 read; chapter weights {0.3,0.25,0.2,0.15,0.1} sum to 1 (chapter-kana01.ts:106).
- Learner impact: after 3 remediation loops (`maxRemediationLoops: 3`) a learner who misses ONE listening item twice is parked in terminal-ish `remediate` despite a 92.5% weighted score. (fm01/L2 at 0.7/0.5 tolerates one M2 error — 0.5 is not < 0.5 — so this is a kana-chapter-specific cliff.)
- Suggested fix: either author more items per measure (≥5 for M1, ≥4 for M4/M5) so 0.8 is a real fraction, or lower kana minMeasure, or grade per-measure floors only over measures with ≥3 items.
- Regression test: property test over bank sizes × thresholds asserting "weighted ≥ 0.9 with zero weak measures is achievable with ≥1 wrong answer".

### T2-C-02 — A chapter whose gate bank lacks any item for one measure can NEVER pass — unguarded  [SEVERITY: Medium] [STATUS: CONFIRMED (latent)]
- Location: modules/curriculum/grading.ts:259-265 (`M5: c5 ? m5 / c5 : null`) → modules/mastery/scoring.ts:70-72 (any null → `outcome: 'incomplete'`, never `passed`) → app/api/curriculum/mastery/route.ts:102,133 (`passed: graded.outcome === 'passed'`)
- Problem: if a future chapter ships a mastery bank with zero items for, say, M5, every fully-answered submission returns `incomplete`; the route folds it as a failed attempt (`passed: false`), remediationCount climbs, chapter lands in `remediate` — permanently unfinishable, with no error more specific than "remediate".
- Actual: `rg 'mastery_|bank' modules/curriculum/eqa/policy.ts` = **0 matches** — EQA validates gate *thresholds* (policy.ts:259) but not per-measure bank coverage. Both current chapters cover all five measures (counted: kana 4/3/3/2/2, fm01 3/2/3/2/2), so this is latent for ch3+.
- Evidence: full reads of grading.ts + scoring.ts + mastery route; grep proof of no guard.
- Suggested fix: eqa gate asserting every `mastery_*` measure with non-zero weight has ≥N bank items; and mastery route returning a typed 500 (`mastery/bank_degenerate`) instead of folding `incomplete` as failed.
- Regression test: unit test — chapter with empty M5 bank → route/e2e asserts the explicit error, not remediate.

### T2-C-03 — Learning-event store is in-memory in production; the FSRS "replay from the event log" promise is structurally void  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: lib/poc/stores.ts:75-78 (`getEventStore(): InMemoryEventStore` — unconditional singleton; contrast lines 69-113 where attempts/progress/station/chapter/practice-session/LO stores all swap to PG via `usingPostgresStores()`) × modules/fsrs/integration.ts:19-21 ("the future engine can replay enrollments from the event log") × app/api/curriculum/station/route.ts:501-512 (`fsrs_cards_enrolled` events)
- Problem: every `recordLearningEvent` — `fsrs_cards_enrolled`, `remediation_triggered`, `chapter_completed`, `gate_measure_completed`, the whole ADR-016 contract — is written to a volatile ring. Restart/deploy erases it while the learner's progress rows survive. The integration.ts header's replay promise therefore cannot hold for any enrollment that happened before a restart.
- Actual: events.ts header is honest about this ("the analytics BACKEND … is a future task … in-memory ring store — ADR-016's current honest state"), but integration.ts makes the stronger, un-caveated replay claim — two honest-status docs that contradict each other.
- Evidence: stores.ts read; the only persisted future-facing surface is `app.learning_object_states` (migration 0004) written by practice-complete — LO states DO persist; enrollment *events* do not.
- Impact: when M2 activates FSRS, the "replay" will silently start from an empty log; also every analytics answer ("how many remediations last week?") is per-uptime only.
- Suggested fix: PgEventStore behind `usingPostgresStores()` (table + journal), or delete the replay sentence from integration.ts and state enrollment replay = from LO states only.
- Regression test: integration-pg spec — record event, reconnect store, assert event survives.

### T2-C-04 — Zero transaction boundaries: multi-step writes fold sequentially with no atomicity  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: rg `\.transaction` over db/, app/, modules/, lib/ = **0 matches**. Practice complete: app/api/practice/route.ts:310 (`recordCompleted`) then :321-328 a per-object read→fold→upsert loop (N sequential `get`+`upsert`). Mastery: route.ts:105 attempt `create` + :147 chapter `upsert`. Station complete: station/route.ts:481 upsert + :535+ chapter fold.
- Problem: a crash (or two concurrent `complete` POSTs) between steps leaves the session recorded but Learning-Object states partially folded, or the attempt persisted without the chapter aggregate. The loop is a read-modify-write per object with no row lock — a concurrent double-submit can lose one fold (last-write-wins on `get`→`upsert`).
- Actual: the code *claims* idempotence ("Fold evidence into Learning Object states (idempotent, honest)" — route.ts:312) but `foldItemResult` idempotence was not verifiable in scope and nothing re-checks `recordCompleted` duplicates on re-POST.
- Evidence: full read of practice complete handler; grep proof of no transaction API use anywhere.
- Impact: low probability (single-user flows), but the failure mode is silent partial state — exactly the class T1-C-05's CP-04 race fix addressed for reads.
- Suggested fix: wrap practice-complete and mastery routes in a single `db.transaction` (drizzle supports it on the pool); or make complete idempotent by keying on (session_id) with a unique constraint.
- Regression test: integration-pg — two concurrent completes of one session; assert LO states fold exactly once.

### T2-C-05 — The cloze interaction is single-select-shared-across-all-blanks by construction — C1-B-02 is a structural class, not a one-off  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: components/curriculum/exercise-session.tsx:703-710 (render: every `null` token shows the SAME `{selected ? labelFor(ex, selected) : '؟'}`) + :541-543 (grade: one `{kind:'option', optionId: selected}` for the whole item)
- Problem: the client can only express ONE token choice for an item, applied to every blank simultaneously. C1-B-02 (two blanks needing ですね/です, one 3-option list, key valid for blank 2 only) is therefore not an authoring slip that slipped past review — it is the *only* outcome the UI shape permits for any multi-null cloze with a single-token key. No eqa/content-lint rule rejects multi-null items (T1-C-09 gap confirms none exists).
- Actual: verbatim from the render loop: `tok === null ? (<span …>{selected ? labelFor(ex, selected) : '？'}</span>)`.
- Evidence: read of the render block + check() + C1-B-02 cross-read (rounds/c1/B.md:83-92).
- Impact: any future chapter author writing a multi-blank cloze re-ships the same unanswerable item; the learner sees both blanks filled with the same token and one graded verdict.
- Suggested fix: content-lint rule "clozeTokens null-count > 1 ⇒ options must be compound (multi-slot) or the item must split"; long-term, per-blank select UI.
- Regression test: content-lint over both chapters would have flagged ex-fm01-g2-cloze-1.

### T2-C-06 — Remediation loop outputs are fire-and-forget: dead event type, no read-back surface, volatile trail  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: modules/curriculum/progress-machine.ts:66 (`{ type: 'remediation_loop' }` — **zero emitters** in src/ and tests/, grep-proof) × app/api/curriculum/mastery/route.ts:194 (`remediationStations` only in the POST response) × mastery-gate.tsx:169 (renders `result.remediationStations`) × station/route.ts:540 (only `remediationCount` resurfaces)
- Problem: after a failed gate the learner gets point-return station links exactly once, in the POST response. No GET re-serves `remediationStations`; the `remediation_triggered` events go to the volatile store (T2-C-03); the persisted `chapterState.status = 'remediate'` is consumed by nothing server-side to re-derive pointers. Reload/navigate away → the remediation map is gone; the learner sees only the gate again.
- Actual (verified invariant): `applyChapterEvent` keeps DD-048 honest even from `remediate` — a later passed attempt still flips to `understood` (progress-machine.ts:102-109), so the loop is not a dead-end, just invisible after the fact.
- Evidence: greps above; full read of progress-machine.ts:60-145 and mastery route.
- Suggested fix: persist `remediationStations` on chapterState (or derive from `wrongByMeasure` ∩ weakPointMap on GET); emit `remediation_loop` where it was intended (station re-completion after remediate).
- Regression test: e2e — fail gate, reload gate page, assert remediation pointers still rendered.

### T2-C-07 — fsrs `listChapterCards` misattributes enrollment stations via prefix-match + stations[0] fallback  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: modules/fsrs/integration.ts:106-112 (`enrollStationFor`: `s.fsrsItems.some((id) => id.startsWith(contentRef))`, fallback `chapter.stations[0]?.slug ?? ''`) + :179-183 (`kanaCards` computed then `void kanaCards; void stationBySlug;`)
- Problem: a card whose itemId isn't declared in any station's fsrsItems silently enrolls at the chapter's FIRST station; prefix matching means `w-foo` also matches `w-foo-2`-style ids. Two dead derivations (`kanaCards`, `stationBySlug`) computed and discarded on every call.
- Impact: today cosmetic (inventory is data-only, engine not integrated); on M2 activation the misattribution becomes real scheduling metadata.
- Suggested fix: exact-id Set lookup; drop the dead locals; log/flag unmatched cards instead of defaulting to stations[0].
- Regression test: unit — chapter with a word absent from all fsrsItems asserts a null/flagged enrollStation, not stations[0].

### T2-C-08 — C2-A-01 root verified; fix shape is sound and cheaper than the manifest suggests  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: modules/audio/audio-manifest.ts:274 (`available: allReal || sidecar !== null`), :216+ (`hasRealAudioAsset(lineId)` — already exported), :207-214 (`placeholderUrls` returns REAL per-line URLs when present)
- Verified: the coarseness is only the bundle flag — per-line manifest `entries` are already correct (real URLs where assets exist, honest PoC wav otherwise, honest `bytes`), and the per-line predicate already exists. Also confirmed `audioSource: allReal ? 'voicevox' : 'placeholder'` mislabels mixed chapters (9 real lines still labeled 'placeholder').
- Fix assessment: C2-A's `audioAvailable={hasRealAudioAsset(lineId)}` is a pure wiring change at the page/runner seam — no manifest redesign needed; agree with the proposed shape. The mixed-chapter `note` string already says "mixed audio" — the UI just never gets per-line truth.
- Regression test: manifest unit test — 9/13 real lines ⇒ exactly 9 playable LineAudioButtons.

### T2-C-09 — POC attempts route: hardcoded L2 gate + non-null map lookup  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: app/api/attempts/route.ts:77 — `computeMastery(graded.scores, LEVELS_BY_CODE['L2']!.caps.gate)`; also uses default MASTERY_WEIGHTS, not chapter weights.
- Problem: any POC dialogue not in the L2 band is graded against L2's 0.7/0.5; `['L2']!` crashes with TypeError if the level code is ever renamed. Documented in-file as the pilot band with removal scheduled (#101) — so Low, but it is the one live route that bypasses EQA-7's "no hardcoded stage" guarantee.
- Suggested fix: resolve from the dialogue's chapter/linkage like the curriculum route does, or delete with the POC surface.
- Regression test: none (route scheduled for removal) — pin the removal issue instead.

## §3 Fresh angles

- **(e) Migrations additive-only — CONFIRMED POSITIVE.** db/migrations 0000–0004: 0004 is pure `CREATE TABLE` ×2 + `CREATE INDEX` ×2 (learning_object_states, practice_sessions); 0002 is `int → real` with an explicit "implicit cast, no data loss, no drops — SKL-006" note; 0003 `ADD COLUMN` with "No drops, no rewrites, idempotent". Grep `DROP|TRUNCATE|DELETE FROM` over all migration SQL = 0 (comments only). Transaction question answered adversely in T2-C-04 instead.
- **(f) Worker — CONFIRMED POSITIVE, no API race surface.** src/worker (506 lines): pg-boss 12, `useListenNotify: false` (documented PgBouncer transaction-pooling constraint), exactly two crons — `ops.backup` 03:30 and `ops.db-verify` 04:00 Asia/Tehran (nightly pg_dump -Fc + verify + retention). No job touches learner-facing tables; structured JSON console logs. The only console.* cluster outside db/cli — consistent with T1-C-14.
- **(g) Dependency surface — small and current.** apps/web: **21 direct runtime deps**, 18 dev; root workspace package.json: 0 deps. Majors all current-generation: next 16.4.3, react 19.3.1, zod ^4.6.7, drizzle-orm ^0.45.4, pg ^8.16.1, pg-boss ^12.38.0, ts-fsrs ^6.0.0. No legacy heavyweights (no moment/lodash/axios). "No deprecated majors" is offline-judged [HYPOTHESIS — registry not queried]; the surface is small enough to audit by hand, which is itself the finding.
- **(h) Content registry chunk — T1-C-10's number VERIFIED.** `.next/static/chunks/2iop210mmmbv8.js` = 183,690 bytes on disk (T1 said 180 KB). Total chunks dir 1.6 MB (T1 said 3.5 MB static JS total — different denominator, not contradictory). Registry-split recommendation stands.

## POSITIVE FINDINGS (T2-C-P*)
- **P1 — Mastery scoring is genuinely data-driven (EQA-7 honored).** scoring.ts accepts only injected thresholds; weights renormalize over assessed measures (`/ weightSum`) so a chapter whose weights sum ≠1 still scores sanely; all-null → honest `incomplete`, never a fabricated pass. Zero hardcoded stages in the live curriculum path.
- **P2 — The FSRS port refuses loudly.** `FSRS_NOT_INTEGRATED` throws `FsrsNotIntegratedError` on every operation ("can never return a fake success") — the mission's no-demo-fake rule is enforced in code, and `home/server.ts:94` reads `fsrsPort.status` rather than a hand-maintained flag.
- **P3 — Practice never fabricates evidence.** route.ts:289 `if (!item || !prog) continue; // never fabricate evidence` — unknown submitted items are dropped, not credited; per-item results come only from server-side recorded progress.
- **P4 — Ops discipline is real.** Additive-only migrations with written data-loss reasoning per file; a separate worker image with PgBouncer-aware polling, nightly backup + verify + retention; direct-vs-pooled connection split documented in migrate.ts.
- **P5 — DD-048 survives every path I attacked.** `understood` only from `passed` in both machines; even a terminal `remediate` status yields to a later pass; the mastery route re-verifies the walk gate server-side before grading.
- **P6 — Per-line audio truth already exists server-side** (`hasRealAudioAsset`, per-line real URLs in manifest entries) — C2-A-01's fix is wiring, not architecture.

## COVERAGE
- Read in full: modules/mastery/scoring.ts (84), modules/fsrs/integration.ts (185), modules/shared/index.ts (41), app/api/curriculum/mastery/route.ts (222), modules/curriculum/grading.ts (360), dialogue/types.ts (1-80), events.ts (1-90), migrate.ts (1-40), db/migrations/0004 (full), worker/main.ts (1-50), stores.ts (event/practice/LO sections), audio-manifest.ts (204-300).
- Read in part: practice/route.ts (223-342 + header greps), station/route.ts (470-539), progress-machine.ts (60-145), exercise-session.tsx 530-629 + 695-730 (~19% — state/check/retry/auto-play/cloze render), attempts/route.ts (60-90), levels.ts (L1 block + gate greps).
- Greps/counts: non-null assertions (2 regex passes), JSON.parse casts (5 files), sentry/console (files listed), `.transaction` (0), fsrsItems trace (stations → route → events), remediate/remediation_loop emitters, mastery bank per-measure counts (both chapters), destructive-migration ops (0), dep inventory (21+18), chunk byte size, test counts (57/5/7).
- Still not covered (for Round 3): dialogue playback engine beyond types (the runtime player lives in components/audio + station-runner render paths), kana-card.tsx body, in-memory→PG repo behavioral parity (integration-pg specs only skimmed), POC surfaces beyond attempts.
