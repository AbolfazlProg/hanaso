# TASK-HANASO-23 — SECURITY AUDIT (backend, identity, data isolation, answer-key integrity)

> Consolidated from T1-B (26 probes), T2-B (~75 probes + 1 read-only prod
> GET), T3 (wire-level re-verification, 5-request takeover chain). All
> findings CONFIRMED unless noted. Production was never mutated.

## Threat model summary

The app has no accounts — identity is a minted `hanaso_lid` UUID cookie.
The learn surfaces (curriculum/practice/mastery) do resolve the cookie
server-side and strip answer keys; the LEGACY /poc + shared-store surfaces
(/api/progress, /api/attempts, /poc/*) do not. Anonymous and cross-user
writes are reproducible today, including on production (read-only
verified for the answer-key leak; the takeover chain was verified
locally with identical code).

## Confirmed vulnerabilities (by severity)

### HIGH
1. **Cross-user read/write via client-supplied userId** (T1-B-01 + T2-B
   extension + T3 chain): /api/progress GET+POST and /api/attempts POST
   trust body/query `userId`, default to the shared `poc-user`, and ignore
   the learner cookie. Verified 5-request takeover: attacker cookie writes
   a victim's status to `understood`; any third cookie reads it. The
   shared poc-user store is poisonable anonymously.
### MEDIUM
2. **Answer-key leak on /poc/practice** (T2-B-01): the RSC flight payload
   ships the full stage-C key (correctOptionId×9, correctOrder×2) — live
   on production (read-only GET). Only /poc page leaking.
3. **F1 feedback leak on recognition items** (T1-B-03, narrowed): the
   authored f1Fa text embeds the correct reading (10/10 across 10
   stations) — bypasses the otherwise-clean key stripping. Listening +
   recall clean at F1/F2.
4. **Unauthenticated row growth** (T3-01): every cookie-less POST mints a
   fresh identity (middleware) — the GUEST 401 guard is dead code over
   HTTP; state-changing routes grow PG rows without authentication.
   (T2-B's "401 on grade" claim was REFUTED at wire level — reframed
   here.)
5. **/api/attempts** (T1-B-04 + T2-B-03): GET lists ALL users' attempts;
   POST accepts arbitrary/NULL userId (any string, no UUID check); no
   rate limit — production PG pollution vector.
6. **Identity cookie** (T1-B-02, wire-confirmed): unauthenticated bearer
   UUID, no Secure, not httpOnly — forged-cookie IDOR.
7. **Practice write grading** (T1-B-05/T1-C-12): `accepted:true` from the
   client fabricates LO evidence.
### LOW
8. /api/events exposes all learners' `user_id` + anonymous spam (T1-B-07).
9. Client-trusted completion `score` — zero exercise_threshold stations
   exist today (narrowed); score:1→409; the trust remains design-deep
   (T2-B-05: 54/56 complete on bare `taskCompleted:true`).
10. No request-body size limits on station API (200KB reached grading);
    no rate limiting anywhere (T1-B-10, T2-B-06).
11. /api/ready discloses DB configuration mode (T2-B-04).
12. Seed raw-SQL slug interpolation (dev-only surface — T1-B-09).
13. Non-atomic writes (folds into the reliability section — T2-C-04).

## What is genuinely solid (verified, attack-held)

- **Answer-key stripping on learn surfaces**: 0 key fields in all probed
  payloads (curriculum station/journey/mastery, practice sessions,
  dialogues); client chunks scanned (0 hits across 31 chunks); the RSC
  payloads of learn pages clean. Practice sessions are cookie-scoped.
- **Server-authoritative prerequisites & gate**: walk-order integrity
  enforced server-side (the 409 machinery); the gate refuses
  client-authored scores (score:1 → 409).
- **Traversal-blocked slugs**: station/chapter/dialogue slugs validated
  against the registry (probe: encoded traversal attempts rejected).
- **Structured leak-free errors**: fail() envelopes carry no stacks or
  internals (probed with malformed bodies).
- **No SQL injection surface in the learn path**: parameterized queries
  throughout; the 2 raw-SQL sites are dev seed scripts with
  registry-derived slugs.
- **XSS**: 4 dangerouslySetInnerHTML sites — all static CSS strings
  (grep-verified); React escaping elsewhere; no href/javascript: sinks
  found in the learn path.
- **Completion idempotence** (already:true) + single-flight guards.
- **No cross-user caching** (0 cache boundaries; events ring is the only
  shared mutable surface — see T1-B-07).

## Production exposure notes

- Production runs exactly the audited code (1.0.0-hanaso22-r01 @ 3d8b8ccd
  — verified twice tonight).
- The /poc answer-key leak was verified on production with ONE read-only
  GET; the takeover chain was verified locally (identical code) — treat
  as production-exposed until patched.
- The 29 pending VOICEVOX words and the event-store volatility are
  availability issues, not confidentiality ones (see PERFORMANCE_AUDIT).

## Fix priority (see REMEDIATION_ROADMAP for the full plan)

1. Resolve identity ONLY server-side from the cookie on
   /api/progress + /api/attempts (reject absent/invalid → 401; no
   mint-and-proceed on state-changing routes) — closes #1/#5/#6's root.
2. Route /poc exercises through the key-strippers or delete the poc pages
   (legacy) — closes #2.
3. httpOnly+Secure cookie — closes #6's forgery surface.
4. Rewrite the recognition F1 template — closes #3.
5. Server-side stroke grading for practice write (or disable the kind) —
   closes #7.
6. Body-size + rate limits — closes #9/#10.
