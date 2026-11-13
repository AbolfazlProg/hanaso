# TASK-HANASO-23 — CODE AUDIT ROUND 3 (verification; single-verifier consolidation)

> Date: 2026-11-13 · Source: `rounds/t3/A.md` (295 lines) — one verifier,
> covering all three classes; the deviation from the 3-subagent pattern is
> documented in its header (infra stability — see CURRENT_STATE). 0
> inherited conclusions; every verdict cites the verifier's own evidence.
> 2 PNGs (t3-focus-post-answer, t3-journey-360).

## Verdict ledger (14 findings verified)

| Finding | Verdict | Verifier's evidence |
| --- | --- | --- |
| T2-B-01 /poc key leak | VERIFIED-LOCAL-PROBE + VERIFIED-PRODUCTION | local :3130 GET /poc/practice → 200 with correctOptionId×9 + correctOrder×2; ONE read-only production GET → same; only /poc page leaking |
| T1-B-01 + T2-B ext (takeover chain) | VERIFIED-LOCAL-PROBE | R1 attempt→201 `passed` under `victim-t3a` (cookie ignored) · R2 ×4 stages A→D · R3 `mastery_passed`→201 `understood` · R4 third context reads 200 `understood` · R5 control cookie's own store `null` — full cross-user takeover |
| T2-C-01 gate quantization | VERIFIED (arithmetic) | bank 13 (M1–M5 = 3/3/3/2/2); any single error ⇒ ≤2/3 < 0.8 ⇒ remediate; weighted-with-one-error ∈ 0.900–0.950 ≥ 0.9 ⇒ never binds; runtime mastery GET count=13 concurs; C3-B's 1/243 independently re-derived — both derivations AGREE |
| T1-B-03 F1 leak | VERIFIED (narrowed form) | 10/10 recognition items across 10 stations leak the correct reading in f1Fa; listening+recall clean at F1/F2 |
| T2-A-01 focus→body | VERIFIED-BROWSER | reproduced: document.activeElement = BODY after answer submission |
| T2-C-03 event store | VERIFIED-SOURCE | getEventStore in-memory unconditionally; restart erases the ADR-016 event trail while progress rows survive |
| T1-C positives | RE-MEASURED | largest chunk 229,813 B; registry 183,690 B (== T2-C); journey/station payload sizes reproduced; keys 0 hits |
| T1-B-02 cookie flags | WIRE-CONFIRMED | no Secure, not httpOnly on the wire |
| T1-B-04 | VERIFIED | attempts listing unscoped |
| T2-B-02 | VERIFIED | poc-user poisoning path |
| T2-A-03 2G | VERIFIED-SOURCE (runtime throttle not re-run for budget) | |
| T2-C-04 | VERIFIED | 0 `.transaction` matches repo-wide |
| T2-C-05 | VERIFIED | cloze single-select structural |
| T1-A-01 | VERIFIED (narrowed form) | primary controls ≥44px at 360 |

## Corrections made this round (3)

1. **T2-B §P2 "401 learner/no_identity on grade" — REFUTED at wire level**:
   no-cookie/invalid-cookie POSTs get a middleware-minted UUID → 200/409,
   never 401. Reframed as **T3-01 [Medium]**: every cookie-less POST mints a
   fresh learner identity → the GUEST 401 guard is dead code over HTTP, and
   state-changing routes grow PG rows unauthenticated (mint → row → repeat).
   The shared-store protection itself HOLDS via minting (corrected framing).
2. **T2-C-01 bank count corrected**: 13 items (M1×3), not 14 (M1×4) —
   runtime `mastery GET count=13` concurs; the finding's substance is intact.
3. The verifier's own F2 "2/10 leak" scare — resolved as a substring
   artifact («ن»⊂«کن», «یا»⊂«یادسپارش»); T1-B-03's "F2 clean" stands.

## New finding (1)

- **T3-01 Medium** — per-request identity minting (middleware.ts:33-47):
  every cookie-less request creates a learner identity + PG rows;
  unauthenticated row-growth vector on all state-changing routes (station
  complete, attempts, progress, practice).

## Positives validated (5/5)

1. Key-stripping on all learn surfaces (curriculum/practice/mastery): 0 hits.
2. No shared-store contamination (the mint mechanism — corrected framing of
   the refuted 401 claim).
3. Completion idempotence (`already:true` on re-complete).
4. Additive migrations (0 destructive ops in migrate.ts + 0004).
5. No external requests (0 CDN refs in 31 chunks).

## Budget-note (honest)

Not re-run for time: the 2G runtime throttle (source-verified only) and the
/practice chip tap-size probe (state unreachable without a completed-lesson
learner; T2-A's PNG stands).
