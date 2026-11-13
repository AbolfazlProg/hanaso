# T1-B — Backend / DB / Security Audit (TASK-HANASO-23)

> Auditor B, Round T1. Method: source reading first (apps/web/src), sharpest
> claims verified with LOCAL probes on the standalone build (PORT 3128,
> in-memory stores, no DATABASE_URL). Production untouched. 26 probe requests
> executed across 2 local server runs (scripts: /home/z/my-project/scripts/
> h23-audit/t1b-probe.mjs, t1b-probe2.mjs — outside the worktree).

## Findings

### T1-B-01 — /api/progress trusts a client-supplied userId (cross-user read/write)  [SEVERITY: High] [STATUS: CONFIRMED]
- Location: apps/web/src/app/api/progress/route.ts:30,55; apps/web/src/modules/progress/types.ts:46-50
- Problem: the route never resolves the learner cookie. GET takes `userId`
  from the query string, POST from the body; both fall back to the SHARED
  `POC_DEFAULT_USER_ID` (`'poc-user'`, lib/poc/principal.ts:8).
- Expected: identity from `resolveLearnerIdFromRequest` + GUEST rejection,
  like every curriculum/practice route (station route:157-173).
- Actual: `const userId = url.searchParams.get('userId') ?? POC_DEFAULT_USER_ID;`
  (route.ts:30) and `const userId = parsed.data.userId ?? POC_DEFAULT_USER_ID;`
  (route.ts:55) — `userId: z.string().min(1).optional()` (types.ts:48), any
  string accepted, no cookie binding, no shape check.
- Evidence: LOCAL probes — GET `?dialogueId=…&userId=<A>` with NO cookie →
  `200 {"ok":true,"data":{"userId":"1111…","progress":…}}`; POST with cookie
  of learner B but body `userId:"victim-user"` → `201` progress written under
  `victim-user` (cookie ignored); POST `userId:"poc-user"` → `201` written to
  the shared store. The mastery_passed gate (route.ts:63-75) compares the
  attempt's userId to the ATTACKER-CHOSEN userId, so it does not bind identity
  either. Route comment admits "DEV-ONLY — no auth in the slice" but this code
  is live in production.
- Learner/system impact: any visitor can read/overwrite any learner's A→D
  dialogue-unit progress (stage flips, `understood` via mastery_passed with a
  victim's attempt id) and pollute the shared `poc-user` store.
- Suggested fix: replace both userId resolutions with
  `resolveLearnerIdFromRequest(req)` + 401 on GUEST; drop `userId` from
  `progressInputSchema` (keep optional for tests via a server-only default).
- Regression test: integration test — POST /api/progress with learner B's
  cookie and `userId:"A"` must 401/403, never write A's row.

### T1-B-02 — Learner identity is an unauthenticated bearer cookie (IDOR by forging a known lid)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: apps/web/src/middleware.ts:41-46; apps/web/src/lib/learner/identity.ts:54-57; lib/learner/server.ts:72-76
- Problem: `hanaso_lid` is a plain UUID cookie, deliberately `httpOnly:false`
  (client mirror), and WITHOUT a `Secure` flag. Every store read/write is
  keyed solely by this value — knowing a learner's UUID = full access to
  their data.
- Expected: at minimum `secure:true` (HTTPS-only transport); longer term a
  signed/session-bound identity (better-auth M1 is the documented plan).
- Actual: middleware sets `{path:'/', maxAge:…, sameSite:'lax', httpOnly:false}`;
  LOCAL probe P11 observed the raw Set-Cookie:
  `hanaso_lid=c4756efa…; Path=/; Max-Age=31536000; SameSite=lax` — no Secure.
- Evidence: LOCAL probe P2 — learner A `enter`ed a station; a second context
  sending A's UUID as its cookie value read A's station state (`200`, state
  `in_progress`), while the same request under B's own cookie got `state:null`
  (control). IDs are crypto.randomUUID (unguessable), so exploitability needs
  the UUID to leak (localStorage mirror + non-Secure transport make that
  plausible).
- Learner/system impact: lid disclosure (XSS, HTTP hop, logs) escalates to
  full account takeover of the guest profile: read progress, complete
  stations, submit mastery.
- Suggested fix: add `secure:true` in middleware + identity.ts; treat lid as
  a credential until better-auth lands (don't log it — see T1-B-07 where it
  IS exposed).
- Regression test: curl the app over plain HTTP (or assert the Set-Cookie
  header) — must contain `Secure`.

### T1-B-03 — F1 feedback text leaks the correct answer on kana-recognition exercises  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: apps/web/src/modules/curriculum/content/chapter-kana01.exercises.ts:32 (pattern, ~475 f1Fa entries); apps/web/src/app/api/curriculum/station/route.ts:253-265
- Problem: the server machinery correctly withholds `correctAudio` /
  `correctReading` until correct-or-F3 ("no key material leaves the server",
  route comment), but the AUTHORED `f1Fa` text for recognition exercises
  states the answer outright at attempt 1.
- Expected: F1 = statement/hint only (route's own design comment); the reveal
  (reading) belongs to F3 / a correct answer.
- Actual: exercise `ex-kana-h1-rec-hira-a` asks «این کانا چه صدایی دارد؟»
  (prompt あ, options آ/اُ/ای). LOCAL probe P12a (wrong answer, attemptNo 1)
  returned: `"feedbackFa":"«あ» صدای «آ» دارد — یک بار دیگر به شکلش نگاه کن."`
  — «آ» IS the correct option label. Same shape for hira-i/u/e/o (5/5 sampled).
  Recall exercises' f1Fa («کانای «آ» این نیست…») do NOT leak.
- Evidence: source read + local API probe (P12a-c); F2 leaks nothing, F3
  reveals by design.
- Learner/system impact: the exact spoiler class the owner reported in
  HANASO-22 ("leaked the correct answer immediately") re-enters through the
  feedback text; ladder scaffolding (elimination at F2) is undermined.
- Suggested fix: author F1 for recognition exercises without the reading
  (shape/mnemonic only), or gate f1Fa behind the same reveal rule.
- Regression test: for every option-type exercise, assert f1Fa/f2HintFa do
  not contain the correct option's label (normalized «»-stripped compare).

### T1-B-04 — /api/attempts has no user scoping: lists every learner's attempts  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: apps/web/src/app/api/attempts/route.ts:20-26 (GET), :45 (POST userId from body); apps/web/src/db/repositories/attempts.ts (list(dialogueId) filters dialogue only); modules/mastery/types.ts:69-73
- Problem: GET returns attempts for a dialogue with NO userId filter (any
  caller, any cookie); POST trusts the body's `userId` (any string, optional).
- Expected: list scoped to the cookie learner; POST keyed by resolved learner.
- Actual: `return NextResponse.json(ok({ attempts: await getAttemptStore().list(dialogueId) }…))`
  — rows carry `userId`, `scores` (M1..M5), `weakPoints`.
- Evidence: source read (route + repo); LOCAL probe P4a: no-cookie GET →
  `200 {"ok":true,"data":{"attempts":[]}}` (empty local in-memory store; shape
  and lack of scoping confirmed in code — production runs the PG repo where
  list() also filters by dialogue only).
- Learner/system impact: cross-user disclosure of learner UUIDs + mastery
  performance; combined with T1-B-01, an attacker can also CREATE attempts
  under any userId (which then satisfy the progress gate for that userId).
- Suggested fix: `list(dialogueId, userId)` + cookie identity on both verbs.
- Regression test: seed two users' attempts; GET with user A's cookie must
  not contain user B's rows.

### T1-B-05 — Practice `write` items are graded by a client-supplied boolean  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: apps/web/src/app/api/practice/route.ts:246-255,48-56
- Problem: for handwriting items the server's correctness decision is
  `payload.answer.kind === 'write' && payload.answer.accepted` — the client
  asserts its own success; there is no server-side stroke check.
- Expected: server-verified grading, or at minimum the evidence fold must not
  treat client-judged writes as first-try-correct facts.
- Actual: `const correct = … : payload.answer.kind === 'write' && payload.answer.accepted;`
  then `firstTryCorrect: prev.firstTryCorrect || (correct && payload.attemptNo === 1)`
  feeds `foldItemResult` → Learning Object states + weak-object suggestions.
- Evidence: source read (answer schema :54-56 `z.object({ kind: z.literal('write'), accepted: z.boolean() })`).
- Learner/system impact: fabricated "correct" handwriting evidence inflates
  eligible_for_review counts and hides weak objects (single-user product —
  self-deception, not cross-user harm; the character is shipped to the client
  by design, session.ts:100-109).
- Suggested fix: document write items as self-assessed in the evidence fold
  (separate `selfReported` flag) or grade strokes server-side later.
- Regression test: POST answer `{kind:'write',accepted:true}` for an item
  never drawn → evidence must not mark it firstTryCorrect.

### T1-B-06 — Station completion trusts the client-tracked session score  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: apps/web/src/app/api/curriculum/station/route.ts:90-97,415,452
- Problem: `complete` accepts `score` from the client (clamped 0..1 only);
  the criterion check `stationMeetsCompletion(station, score, …)` runs on
  that value.
- Expected: server-derived score from graded answers (the route already
  counts attempts via `incrementAttempts`).
- Actual: `const score = payload.score == null ? null : Math.max(0, Math.min(1, payload.score));`
- Evidence: source read; zod caps range (probe P6c: -5 → 400) but a
  fabricated `score:1` passes.
- Learner/system impact: a learner can complete any threshold-gated station
  without a correct answer (walk order still enforced via prerequisites) —
  integrity of completion/gate stats only.
- Suggested fix: accumulate server-graded correctness per (learner, station)
  and derive the score at complete.
- Regression test: complete with `score:1` having sent only wrong `grade`s →
  must 409.

### T1-B-07 — /api/events exposes all learners' identifiers and accepts anonymous spam  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: apps/web/src/app/api/events/route.ts:30-38; apps/web/src/modules/curriculum/events.ts:105
- Problem: GET returns the last 50 events including `user_id` (learner UUID)
  of every learner; POST records arbitrary events with no identity at all.
- Expected: owner-only observability or learner-scoped view; auth/spam guard.
- Actual: `store.record(name, { ...props, user_id: userId })`; GET
  `store.list(50)` to anyone.
- Evidence: LOCAL probe P5a (no cookie → 201 recorded) and P5b (response
  contained `"user_id":"11111111-…"` for learner A's station_entered event).
- Learner/system impact: cross-user activity timeline + the exact lid value
  an attacker needs for T1-B-02; ring buffer (1000, event-store.ts:24-29) can
  be evicted by spam, destroying real analytics.
- Suggested fix: bind POST to a learner id, drop user_id from GET (or gate
  behind an owner token).
- Regression test: GET /api/events with learner B's cookie must not include
  A's user_id.

### T1-B-08 — Non-atomic DB writes: attempt counters, LO upserts, practice completion  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: apps/web/src/db/repositories/curriculum.ts:125-144 (incrementAttempts = SELECT then INSERT); db/repositories/practice.ts:65-77 (recordCompleted insert, no conflict path), :136-158 (LO read-modify-write upsert); no production caller of `sweepExpired` (practice.ts:89-99 — in-flight Map grows until restart)
- Problem: read-modify-write without transactions/atomic SQL: parallel `grade`
  answers can lose attempt-count increments; a double `complete` of a
  practice session hits a PK conflict (500); parallel completes of sessions
  sharing objects lose dimensionStats updates.
- Expected: `UPDATE … SET attempt_count = attempt_count + 1` /
  `onConflictDoUpdate` with SQL-side increments; transaction around
  attempt+progress multi-step writes (station complete does attempt-less
  multi-writes: station upsert → chapter upsert → events, no tx).
- Actual: PG repo reads `existing?.attemptCount ?? 0` then writes `next`.
- Evidence: source read; LOCAL probe P13 (in-memory store, synchronous) showed
  exact count 11/11 — the race is PG-mode only (impact HYPOTHESIS, code
  pattern CONFIRMED). Production runs the PG repo (DATABASE_URL set).
- Learner/system impact: under-counted attempt stats, rare 500s; evidence-only
  data — no progress corruption.
- Suggested fix: atomic increment SQL + `onConflictDoNothing` on duplicate
  session-complete; call sweepExpired from a timer.
- Regression test: PG integration test firing N parallel grades → count == N.

### T1-B-09 — Seed scripts interpolate slugs into raw SQL  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: apps/web/src/db/seed.ts:220; apps/web/src/db/seed-curriculum.ts:202,206
- Problem: `sql.raw(ARRAY[${slugs.map((s) => `'${s}'`).join(',')}]::text[])`
  builds SQL by string interpolation instead of parameterizing.
- Expected: parameterized `inArray()` (used elsewhere in the same files).
- Actual: quoted-interp of content slugs; values are content-code-controlled
  (not user input) → not exploitable today, but a defense-in-depth violation
  that breaks if a slug ever carries an apostrophe/quote.
- Evidence: source read (grep of `sql.raw` across db/: exactly these 2 sites).
- Learner/system impact: none today; latent injection if slugs become dynamic.
- Suggested fix: `inArray(schema.units.slug, slugs)`.
- Regression test: seed with a slug containing `'` must not alter the query.

### T1-B-10 — No request-body size limits; unbounded zod strings on the station API  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: apps/web/src/app/api/curriculum/station/route.ts:40-48 (optionId/orderedIds/chipOrder/nameValue `min(1)` with NO max; answer arrays unbounded), curriculum/mastery route.ts:34 (`z.record` unbounded); practice route DOES bound (`.max(40)`, `.max(64)`)
- Problem: a single huge body is parsed and validated without limits.
- Expected: `.max()` bounds matching the practice route's discipline.
- Actual: LOCAL probe P6e — 200KB `optionId` accepted, reached business logic
  (404 unknown_exercise), no 413.
- Evidence: source + probe.
- Learner/system impact: memory/CPU DoS surface on a public POST endpoint
  (mitigated by no auth-free writes being meaningful — guest scope rejected
  only after validation).
- Suggested fix: add `.max(80)`-style caps + a body-size guard.
- Regression test: 1MB body → 413/400 before JSON parse.

## Positive findings

- T1-B-P1 — Answer-key stripping is disciplined and verified end-to-end:
  `toClientExercise` (grading.ts:344-360), `toClientStation`/
  `stripStationAnswerMaterial` (client-transport.ts), `toClientItem`
  (session.ts:88-110), `toClientQuestions` (assessment-bank.ts:30-37) are
  used at every serialization point checked (station page:99-101+241,
  dialogue page:49, assessment page:16, mastery GET:216-219, practice
  generate:224). LOCAL probes P8/P9/P12 scanned full payloads: zero
  `correctOptionId`/`correctOrder`/`acceptedChipOrder`/feedback/hint fields
  client-side; only T1-B-03 (authored F1 text) bypasses the discipline.
- T1-B-P2 — Guest-scope hardening works: curriculum + practice state-changing
  routes reject the cookie-less GUEST scope with a structured Persian 401
  (`learner/no_identity`, station route:165-173, practice route:162-170);
  middleware mints a per-browser UUID on the first response so first-visit
  SSR never reads a shared account (TASK-HANASO-20 remediation confirmed
  live: no-cookie writes landed under a FRESH minted id, probe P1a).
- T1-B-P3 — Server-authoritative walk order: `complete` re-checks
  prerequisites and completion criteria server-side with structured 409s
  naming the missing stations in Persian (station route:420-479); the mastery
  gate is locked until the core path is walked (mastery route:63-77);
  writing-practice rejects characters not in the station's content (probe P15
  → 422 `station/writing_char_not_in_station`).
- T1-B-P4 — Path traversal blocked where slugs touch the FS: the dialogue
  route enforces `^[a-z0-9]+$` (probe P6f → 404 `dialogue/invalid_slug`);
  station/chapter slugs are registry map lookups (P6b clean 404); static
  traversal attempt `/audio/../server.js` → 404 (P6g).
- T1-B-P5 — Error paths are structured and leak-free: every probed failure
  (wrong action, bad slug, negative score, attemptNo 99, unknown
  chapter/block, malformed JSON) returned the `ok/fail` envelope with a zod
  issue dump or a clean message — NO stack traces, NO paths, NO internals
  (probes P6a-P6h). 200KB body handled without crashing.
- T1-B-P6 — Attempt-number concurrency is engineered: PG repo computes
  attemptNo as MAX+1 with a unique index backstop and a 23505 detector that
  walks drizzle's `cause` chain (attempts.ts:31-42,75-105) — a genuinely
  thoughtful race handling absent from most PoCs.
- T1-B-P7 — Completion single-flight on both ends: client guard
  (`completingRef`, station-runner.tsx:695-699) + server idempotence
  (`already:true`, station route:417-419); 4 parallel completes locally all
  settled cleanly (P7c, 409s — no duplicate writes, no 500s).
- T1-B-P8 — No cross-user caching: zero `unstable_cache`/`revalidate`/`use
  cache` in the codebase (grep: 0 hits); the only server caches are static
  per-chapter content maps (`persianReadingCache`, station route:128;
  `idToSlugCache`); every API response sets `cache-control: no-store`.

## Coverage

- **Routes read line-by-line (9):** api/curriculum/{station,journey,mastery},
  api/progress, api/practice, api/attempts, api/events, api/dialogues/[slug],
  middleware.ts. (api/health, api/ready: trivial liveness, skimmed names only.)
- **Support code read:** lib/learner/{identity,server}.ts, lib/poc/{stores,
  event-store,principal,assessment-bank}.ts, db/repositories/{practice,attempts}
  .ts + curriculum.ts (upsert/incrementAttempts/listForUnit), modules/progress/
  types.ts, modules/mastery/types.ts, modules/practice/session.ts, modules/
  curriculum/{client-transport,events}.ts + grading.ts (toClientExercise),
  components/curriculum/station-runner.tsx (completion path 676-770),
  learn pages' exercise serialization (station/dialogue/assessment pages).
- **Greps run (12):** dangerouslySetInnerHTML (4 hits, all static
  POC_SCENE_CSS constant — no user data), unstable_cache|revalidate|use cache
  (0), sql.raw/${} across db/ (2 raw-interp sites → T1-B-09), toClientExercise
  consumers, exercises[] serialization sweep across app/+components (all pass
  through sanitizers), sweepExpired callers (none in production code),
  single-flight in station-runner, station-slug extraction, f1Fa counts
  (475 kana + 82 fm01), exercise-type samples, package.json deps, public/ dir
  listing (audio/{kana,words,sfx,dialogues,hostwords}, writing-data glyph
  JSONs, licenses, robots.txt — all static public assets, nothing private).
- **Probes executed (26 requests, 2 local server runs on :3128):** P1 guest
  writes, P2 forged-cookie IDOR (+control), P3 progress userId takeover
  (GET+POST), P4 attempts listing, P5 events spam+leak, P6a-h malformed
  bodies/traversal/unknown refs, P7 parallel grades+completes, P8 mastery bank
  key scan, P9 dialogue bundle key scan, P10 journey, P11 Set-Cookie flags,
  P12 F1/F2/F3 grading ladder key scan, P13 real-grade counter race, P14
  grade-block bogus, P15 writing-practice foreign character.
- **Dependencies:** package.json read (next 16.4.3, react 19.3.1, zod 4.6.7,
  drizzle-orm 0.45.4, pg 8.16.1, ts-fsrs 6.0.0 — all current majors; nothing
  obviously abandoned). No audit tool run (none available offline) and
  pnpm-lock head not re-read this round — honest gap, not evidence of safety.
- **Not covered (Round-3 targets):** DATABASE_URL-backed behavior of the local
  build (all probes ran on in-memory stores; PG-only races remain
  source-level), better-auth integration (not present), /poc page UI flows,
  pg-boss usage, e2e of the practice write-item judging UI.

> Conflict note: none — repo matched AUDIT_CONTEXT §2 ground truth everywhere
> checked (branch tip docs-only; product code as described).
