# TASK-HANASO-23 — CODE AUDIT ROUND 1 (merged from 3 independent reports)

> Date: 2026-11-13 · Sources: `rounds/t1/{A,B,C}.md`. A: frontend/browser
> (salvaged after a subagent death + lead completion — provenance in its
> header); B: backend/db/security (complete subagent run, 26 local probes);
> C: architecture/perf/QA (complete subagent run). Full evidence in the
> source reports; verification outcomes in CODE_AUDIT_ROUND_3.

## Findings (28 raw)

### Frontend (T1-A — 3, later dispositioned by T2-A/T3)
- T1-A-01 Low CONFIRMED — tap targets: primary learner controls pass 44px at 360px (radios 294×55, check 117×44); sub-44 = secondary controls only (journey «معرفی فصل» 107×32; «پخش مجدد» 143×36; «مجوز» 32×25; + /practice chips 46×25) — passes WCAG 2.5.8 AA (24px), misses the 44px touch guideline.
- T1-A-02 Low — radio Enter/aria-checked — REFUTED at T2-A (aria-checked=false present pre-answer; the null was a focus→body artifact; the REAL bug it hid: T2-A-01).
- T1-A-03 — contrast — RESOLVED at T2-A: palette passes AA everywhere, core AAA (13.39/12.61/12.05); one token contract miss (T2-A-02).

### Backend/security (T1-B — 10, all CONFIRMED, 26 probes on :3128)
- **T1-B-01 High — /api/progress trusts client-supplied `userId`** (GET query + POST body), defaults to the shared `poc-user`, ignores the learner cookie — cross-user read (200) + write (201) with no cookie at all (progress/route.ts:30,55).
- T1-B-02 Med — learner identity = unauthenticated bearer UUID cookie, no Secure flag, not httpOnly (middleware.ts:41-46; identity.ts:54-57) — forged-cookie IDOR reproduced.
- T1-B-03 Med — authored F1 feedback text leaks the correct reading on kana-RECOGNITION items (5/5 sampled; later NARROWED by T2-B/T3: recognition-only, listening+recall clean).
- T1-B-04 Med — GET /api/attempts lists ALL users' attempts (no user filter; attempts.ts list(dialogueId)); POST trusts body userId (later strengthened: arbitrary/NULL userIds).
- T1-B-05 Med — practice `write` items graded by client-supplied `accepted:true` (practice/route.ts:246-255) — fabricated LO evidence (cross-confirmed T1-C-12).
- T1-B-06 Low — station completion trusts client-tracked session `score` (clamped 0..1 only; station/route.ts:90-97,415,452) — later NARROWED: zero exercise_threshold stations exist today; score:1 → 409 (the design trust remains via T2-B-05).
- T1-B-07 Low — /api/events exposes all learners' `user_id` + accepts anonymous spam (events/route.ts:30-38).
- T1-B-08 Low — non-atomic DB writes: attempt counters (SELECT→INSERT), LO upserts read-modify-write, practice recordCompleted no conflict path, `sweepExpired` never called in production (in-flight Map grows until restart).
- T1-B-09 Low — seed scripts interpolate slugs into raw SQL (`sql.raw(ARRAY[...])` — seed.ts:220; seed-curriculum.ts:202,206).
- T1-B-10 Low — no request-body size limits on the station API (zod strings min(1) NO max; arrays unbounded; practice route DOES bound — later strengthened: 200KB reached real grading).

### Architecture/QA (T1-C — 15: 2 High, 6 Med, 7 Low)
- **T1-C-09 High — NO content-lint exists for ~20k lines of content-as-code** — the root architecture gap behind most C-round bug classes (option-id mismatches, prereq drift, distractor=answer, copy errors, audio refs all unlinted).
- **T1-C-13 High — test blind spots: 10 uncovered classes mapped to shipped C-round bugs** — worst: h21-audio-inventory.test.ts explicitly EXCLUDES the kn- registry/gate items → C2-B-01 (Critical) sailed through exactly that carve-out.
- T1-C-01 Med — two parallel progress machines (curriculum vs progress modules) with duplicated mastery-gate semantics (POC-era + live island walk).
- T1-C-03 Med — walk snapshot codec: raw `JSON.parse` cast; blockResults/exerciseProgress/kanaCardStages unvalidated (violates its own "no wrong-position resume" principle).
- T1-C-04 Med — 24 non-null assertions in the learn trio (later count-drift 16 by T2-C's regex — sites real, incl. verbatim `ex.chunks!.find(...)!`); content-id drift → render crash.
- T1-C-05 Med — StationRunner 2,801 lines / 14-prop surface; walk+grading+audio+writing+ceremony in one component; no React.memo in the trio.
- T1-C-12 Med — practice write graded client-side (cross-ref T1-B-05).
- T1-C-14 Med — zero observability: no Sentry, no structured logging on API routes (later NARROWED: OTD-011 tickets the gap — it's known, not unknown).
- T1-C-02 Low — CHAPTER_FLOW table declared then `void`ed — dead code.
- T1-C-06 Low — completion-409 recovery duplicated station-runner ↔ mastery-gate.
- T1-C-07 Low — uncleaned timers/settle-after-unmount in resume effects.
- T1-C-08 Low — WritingCanvas re-renders per pointer-move (O(n²) copies) — bounded to the canvas leaf.
- T1-C-10/C-11 — measured POSITIVE-leaning (payloads lean, no N+1 — see positives).
- T1-C-15 Low — env/config small and documented (POSITIVE + note).

## Positives (browser/probe/measurement-verified)

- No horizontal overflow at 360/390/430/768/1024/1440 (journey + station); RTL/Japanese bidi correct.
- Offline resilience: role=alert failure panel + one-click retry recovers; writing canvas accepts real strokes; seal idempotent; snapshot persistence survives refresh (incl. kanaCardStages); audio local; fonts self-hosted; Persian 404.
- Key-stripping verified at every learn serialization point (26 probes); guest 401 hardening; server-authoritative prerequisites/gate; traversal-blocked slugs; structured leak-free errors; single-flight completion.
- Perf clean: NO N+1 (2 batched queries), journey 84KB / station 35KB, largest JS chunk 228KB; answer keys absent from client chunks AND RSC (learn surfaces).

## Coverage

T1-A: 12 flows driven, 6 viewports × 2 pages, a11y roles/tab/keyboard, production read-only (health=1.0.0-hanaso22-r01 @ 3d8b8ccd, home/journey 200, Persian 404).
T1-B: 9 routes + middleware + 15 files read line-by-line; 12 greps; 26 probes.
T1-C: 6 modules full + station-runner 32%; all-src greps (any/casts/zod/JSON.parse); 6 URLs measured; 61 unit (539 blocks) + 13 integration inventoried.
