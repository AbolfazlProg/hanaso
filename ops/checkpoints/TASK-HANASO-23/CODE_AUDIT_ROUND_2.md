# TASK-HANASO-23 — CODE AUDIT ROUND 2 (adversarial; merged from 3 independent reports)

> Date: 2026-11-13 · Sources: `rounds/t2/{A,B,C}.md` — each attacked its T1
> counterpart plus fresh angles. 19 PNGs (t2a-*), ~75 local probes (t2b-*),
> source re-derivations (t2c-*). Verification outcomes in CODE_AUDIT_ROUND_3.

## T1 verdict ledger

| T1 report | Verdicts |
| --- | --- |
| T1-A (frontend) | T1-A-01 VERIFIED-NARROWED (primary controls ≥44px; sub-44 secondary only + /practice chips); T1-A-02 REFUTED (aria-checked fine — the artifact hid T2-A-01); T1-A-03 RESOLVED (AA everywhere, core AAA). 8/9 positives held under attack. |
| T1-B (security) | 8 VERIFIED (B-04 strengthened: arbitrary/NULL userIds; B-10 strengthened: 200KB reached real grading), B-03 VERIFIED-NARROWED (recognition-only at F1/F2; listening+recall clean), B-06 NARROWED (zero exercise_threshold stations exist; score:1→409 — client-trust design remains via T2-B-05). None fully refuted. Positives: P1 narrowed (holds on curriculum/practice/mastery; practice cookie-scoped — new positive), P2–P8 held (P2's 401-claim later refuted at wire level by T3 → reframed as T3-01). |
| T1-C (arch/QA) | 12 VERIFIED, C-14 NARROWED (OTD-011 tickets the observability gap), C-04/C-13 count-drift-but-verified (16 non-null !; 57/5/7 test files). 0 refuted. "T1-C is honest." |

## New findings (19: High 1 / Med 10 / Low 8)

### T2-B (security) — 6
- **T2-B-01 Med CONFIRMED — /poc/practice ships the FULL stage-C answer key in the RSC flight payload** (correctOptionId×9, correctOrder×2 — poc/practice/page.tsx:13-35 passes generateExercises() straight to the client island) — bypasses T1-B-P1; **verified live on production** (read-only GET).
- T2-B-02 Med — anonymous cookie-less poisoning of the shared `poc-user` to `understood` (refutes server.ts:40-41 "unreachable" claim); with T1-B-01 forms a 5-request cross-user takeover chain (attacker cookie → victim status=understood → read by any third cookie).
- T2-B-03 Med — /api/attempts: unauthenticated arbitrary-identity/NULL row creation, no rate limit → production PG pollution.
- T2-B-04 Low — /api/ready discloses DB configuration mode to anonymous callers.
- T2-B-05 Low — task_completed stations (54/56) complete on a bare client `taskCompleted:true` — walk-order integrity is server-enforced, task integrity is not.
- T2-B-06 Low — no rate limiting anywhere; state-changing endpoints accept unauthenticated unbounded writes.

### T2-C (arch/QA) — 9
- **T2-C-01 High CONFIRMED — kana mastery gate quantizes to a perfect score; the 0.90 weighted threshold is dead-letter.** minMeasure 0.8 × per-measure banks of 2–4 items ⇒ ANY single error → remediate; with one error weighted ∈ 0.900–0.950 ≥ 0.9 ⇒ weighted never binds. (Bank later corrected to 13 items by T3 — substance intact; two independent derivations agree with C3-B's P=1/243.)
- T2-C-02 Med (latent) — a chapter whose gate bank lacks one measure can NEVER pass (`incomplete` folded as failed → permanent remediate); no EQA guard on bank coverage — latent for ch3+.
- T2-C-03 Med — learning-event store is in-memory ALWAYS (only store that never swaps to PG); the FSRS "replay from the event log" promise is structurally void — events die on restart.
- T2-C-04 Med — zero `.transaction` repo-wide; practice complete = 1 session write + N read-modify-write LO upserts — crash/concurrency ⇒ silent partial folds.
- T2-C-05 Med — the cloze interaction is single-select-shared-across-all-blanks BY CONSTRUCTION (every null renders the same `selected`) — C1-B-02 is a structural class, not a one-off.
- T2-C-06 Med — remediation loop outputs are fire-and-forget: `remediation_loop` event type has ZERO emitters; remediationStations served only in the POST response (gone on reload); volatile trail.
- T2-C-07 Low — fsrs listChapterCards misattributes enrollment stations via prefix-match + stations[0] fallback; two dead derivations computed per call.
- T2-C-08 Low — C2-A-01 root verified: `hasRealAudioAsset` + per-line truth already exist → wiring-only fix.
- T2-C-09 Low — POC attempts route hardcodes L2 gate + `['L2']!` non-null (the one live route bypassing EQA-7; removal scheduled #101).

### T2-A (frontend) — 4
- T2-A-01 Med CONFIRMED — keyboard focus dropped to `<body>` after every answer/advance (T1's a11y gap hid a real bug).
- T2-A-02 Low — spk-4-l 6.81:1 < the tokens' ≥7.1 contract; white/shu ratio mislabeled (4.85 → real 5.19).
- T2-A-03 Low — station page header-only 5–10s on 2G with ZERO skeletons.
- T2-A-04 Low — 93 aborted walk-save POSTs across the 12 flows (1 kind — benign aborts on navigation, worth a keepalive/abort-handle pass).

## The round's headline corroboration

With ALL 35 ch1 stations completed (score 1) via API, **chapter 2 remains locked** — the mastery gate needs real item evidence, and the gate is a lottery (C2-B-01/T2-C-01): **chapter 2 is effectively unreachable for an honest learner.** (The verifier later reached ch2 by answering gate items with real evidence — the ch2 360px surfaces then verified clean; PNGs t2a-360-ch2-*.)

## Coverage

T2-A: 12 flows re-driven (console totals: 0 error / 0 warning / 0 pageerror / 0 HTTP≥400; 106 assets 2xx; 0 external requests), 2G throttle, /practice + ch2 + 404 at 360px, 9/9 positives attacked (8 held; 1 not re-attacked for time).
T2-B: ~75 local requests on :3129 + 1 read-only prod GET; 3 probe scripts.
T2-C: 6 modules re-read + the 4 declared T1-C gaps (mastery/scoring internals, dialogue engine, fsrs integration, exercise-session body); lock/dep inventory (21 direct deps, current majors).
