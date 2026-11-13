# T2-B — Adversarial Audit of T1-B (Backend/Security) — TASK-HANASO-23

> Subagent B, Round T2 (adversarial). Mandate: verify/refute/narrow T1-B-01..10
> with fresh LOCAL probes (port 3129, in-memory stores, 3 server runs) + source
> re-reads, then hunt what T1-B missed. Nothing trusted from T1-B without my own
> evidence. Scripts: /home/z/my-project/scripts/h23-audit/t2b-probe{,2,3}.mjs
> (outside the worktree). Production touched with exactly ONE read-only GET
> (§N1 evidence). All other probes local.

## T1 verdict table

| T1 id | Verdict | Evidence (probe ids below) |
| --- | --- | --- |
| T1-B-01 | **VERIFIED (+extended)** | P2a–e, Q3a–d: two-learner cross read/write confirmed; full 5-request takeover chain to `status=understood`; shared `poc-user` default confirmed live. |
| T1-B-02 | **VERIFIED** | P1 wire capture: `hanaso_lid=…; Path=/; Expires=…; Max-Age=31536000; SameSite=lax` — NO `Secure`, NO `HttpOnly`. P3b forged-cookie state access; Q5a genuine lid leak via /api/events. |
| T1-B-03 | **VERIFIED & NARROWED** | Q1: recognition F1 leak 10/10 across 10 distinct stations (h1–h14). Q2: listening 4×2 + recall 4×2 attempts leak NOTHING (no answer text, no correctReading/correctAudio/reveal pre-reveal) — leak class is recognition-only. |
| T1-B-04 | **VERIFIED (+sharpened)** | Q5d/P6b: cookie-less + cross-cookie GET returns all rows incl. `victim-user` and `null` userIds; P6a POST under arbitrary non-UUID userId `victim-user` → 201. |
| T1-B-05 | **VERIFIED & NARROWED** | P5e fabricated `{kind:'write',accepted:true}` → `correct:true`. P5g/h order/build kinds → 400 (schema rejects); P5f attemptNo 0 → 400; P5i cross-learner session answer → 404 (sessions ARE cookie-scoped). |
| T1-B-06 | **NARROWED (refuted as stated)** | No `exercise_threshold` station exists in either chapter (grep: 54 `task_completed`, 2 `viewed`); P5c `score:1` → 409 `station/completion_not_met`. The client-trust hole that exists is the `taskCompleted` flag (→ T2-B-05); `score` only pollutes `bestScore` stats. |
| T1-B-07 | **VERIFIED** | P7a/b (201 anonymous + forged `user_id` props reflected), Q5a genuine learner UUIDs in GET, P10e 30/30 rapid POSTs accepted (ring buffer 1000). |
| T1-B-08 | **VERIFIED (source; impact PG-only)** | Re-read curriculum.ts:125-144 (SELECT-then-INSERT increment), practice.ts recordCompleted (no conflict path), sweepExpired defined but no production caller. Matches T1-B's own HYPOTHESIS framing for runtime. |
| T1-B-09 | **VERIFIED** | Re-grep: exactly 2 `sql.raw` sites (seed.ts:220, seed-curriculum.ts:206), content-controlled slugs. |
| T1-B-10 | **VERIFIED & STRENGTHENED** | P8a: 200KB `optionId` accepted on a REAL exercise → graded `200 level=1` (T1-B only reached a 404 path). P8b: mastery `z.record` accepted a 200KB key pre-gate. No 413 anywhere. |

Score: 8 VERIFIED (2 strengthened), 1 VERIFIED&NARROWED, 1 NARROWED/refuted-as-stated. **Zero T1-B findings fully refuted; none overstated except B-06's exploit path.**

## V. Key verification evidence (all LOCAL :3129 unless noted)

- **P1** fresh-visit `/` Set-Cookie: `["hanaso_lid=c0ca1fd3-…; Path=/; Expires=Sat, 13 Nov 2027…; Max-Age=31536000; SameSite=lax"]` — no Secure, no HttpOnly.
- **P2** progress IDOR: A(body userId=A)→201 `A_selfcheck`; B-cookie GET `?userId=A`→200 reads A's stage; B-cookie POST body userId=A `dialogue_watched`→201 stage `B_lesson` (cookie ignored); no-cookie/no-userId POST→201 `userId=poc-user`; anonymous GET sees shared stage.
- **P2f** mass-assignment probe: extra `role/hack/__proto__/extra` fields stripped — stored doc keys `[userId,dialogueId,stage,status,updatedAt]`. No prototype pollution observable.
- **P3** station state: A enters h0 → journey(A) `in_progress` vs journey(B) `available`.
- **Q1** F1 leak (10 distinct stations, verbatim): `ex-kana-h1-rec-hira-a [stn-kana-h1] corr="«آ»" F1="«あ» صدای «آ» دارد — …" LEAK=true` … `ex-kana-h14-rec-hira-ya LEAK=true` → 10/10.
- **Q2** listening/recall: `fbLeak=false keyMat=none` at attempts 1–2; F2 emits exactly one elimination id (by design), never the key.
- **Q3** takeover chain (two learners + victim string id): attacker cookie A creates `passed` attempt for `victim-user` (Q3a 201), pushes `unit_started→dialogue_watched→lesson_studied→practice_done` (Q3b all 201, stage `D_mastery`), then `mastery_passed` → `status=understood` (Q3c); any third cookie reads it (Q3d 200 understood).
- **Q4** anonymous variant: no cookie at all — attempts POST (userId omitted → `undefined` → binds `poc-user` via `attempt.userId ?? POC_DEFAULT_USER_ID`, progress route.ts:65), progress chain to `D_mastery`, `mastery_passed`→201 `understood`; Q4d ANY fresh anonymous client GET sees `userId=poc-user status=understood`.
- **P5** practice: complete h0 (viewed, no score) 200; complete h1 `taskCompleted:true` 200 with zero interaction; h2 `score:1` → 409 `station/completion_not_met`; h3/h4 → 409 `prerequisites_not_met`; focused generate h1+writing → 14 items (choice+write); fabricated write → `correct=true`; cross-learner session → 404.
- **P6/Q5d** attempts: POST `userId:"victim-user"` (cookie B) → 201 stored; GET with A cookie → row incl. `scores {M1..M5:1}`; GET no filter → `userIds=["victim-user",null]`.
- **P7** events: no-cookie POST 201; GET reflects attacker props `{"user_id":"forged-lid-xyz","evil":1}`; 30/30 rapid POSTs 201.
- **P8** sizes: 200KB `optionId` on real exercise → 200 (graded); 200KB mastery record key parsed.
- **P9** RSC key-scan (cookie'd): station h1, h2?mode=review, /practice → `keyHits=[]`; mastery GET bank (13 items) `keyHits=[]`.
- **P10** health/ready: ready leaks `detail:"no DATABASE_URL configured (in-memory DEV-ONLY repositories active)"`; dialogue slug `a..b`,`A-B`,`x-y/z` → 404 `dialogue/invalid_slug`, `cafe-morning-01` → 200; text/plain POST body parsed → 201; no 429 ever.

## N. New findings

### T2-B-01 — /poc/practice ships the full stage-C answer key in the RSC flight payload (T1-B-P1 bypass; live in production)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: apps/web/src/app/poc/practice/page.tsx:13-35 (passes `generateExercises(...)` straight to the client island); modules/practice/types.ts:35,44,54,67 (`correctOptionId`/`correctOrder` on items); practice-runner.tsx:99 (client-side `checkAnswers`)
- Problem: every other surface routes exercises through `toClientExercise`/`toClientItem`/`toClientQuestions` (T1-B-P1), but /poc/practice serializes the RAW generated exercises — answer keys included — into the client payload.
- Expected: SKL-013 parity — "the answer keys never leave this file's scope" (practice/route.ts:6).
- Actual: LOCAL GET /poc/practice → `correctOptionId` ×9, `correctOrder` ×2 in the flight payload; excerpt: `…{\"id\":\"chr-sora\",\"labelFa\":\"میکی\"}],\"correctOptionId\":\"chr-yamada\"}],\"sourceLineIds\":…`. ONE read-only GET to production https://learn.kotodama.ir/poc/practice → `200, correctOptionId×9, correctOrder×2` (identical payload size 30243).
- Evidence: probe3 R1–R3 (local + production, single request, no side effects).
- Impact: any visitor reads the whole stage-C practice key; the client island also grades itself. Undermines the product's own SKL-013 invariant on a live public page.
- Suggested fix: strip keys via a `toClientPracticeExercise` before crossing the RSC boundary (or delete the PoC page now — it is scheduled for removal, TASK-LEARNING-06 #101).
- Regression test: fetch every `/poc/*` page with a cookie and assert the flight payload contains no `correctOptionId|correctOrder|acceptedChipOrder`.

### T2-B-02 — Anonymous cookie-less poisoning of the shared `poc-user` store (HANASO-20 claim "unreachable" is false)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: apps/web/src/app/api/progress/route.ts:30,55,65; apps/web/src/app/api/attempts/route.ts:45,78; lib/learner/server.ts:40-41 ("the legacy shared store stays untouched (and unreachable)")
- Problem: with NO cookie and NO userId, /api/attempts creates an attempt bound to `poc-user` (progress route.ts:65 maps `undefined → POC_DEFAULT_USER_ID`), and /api/progress walks + completes the shared unit — all anonymously.
- Actual: Q4a–d — anonymous attempt 201 (outcome passed), anonymous A→D chain, `mastery_passed` → 201 `status=understood`; ANY fresh anonymous client then GETs `userId=poc-user, status=understood`.
- Evidence: probe2 Q4 (5 requests, in-memory store).
- Impact: the exact shared-account contamination TASK-HANASO-20 retired returns through the API: cross-client state visible to every cookie-less caller; also lets an attacker pre-seed `poc-user`'s history.
- Suggested fix: reject GUEST on /api/progress + /api/attempts (401 `learner/no_identity` like station/practice); delete the `?? POC_DEFAULT_USER_ID` fallbacks.
- Regression test: no-cookie POST /api/progress must 401, never write under `poc-user`.

### T2-B-03 — /api/attempts: unauthenticated arbitrary-identity row creation, no rate limit (production PG pollution)  [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: apps/web/src/app/api/attempts/route.ts:38-45,78-81; modules/mastery/types.ts:68-73 (`userId: z.string().min(1).optional()` — any string)
- Problem: any caller creates mastery-attempt rows under ANY `userId` string (no UUID check, no cookie binding) or with `userId` absent (NULL user row in PG); unlimited writes, no rate limit.
- Actual: P6a `userId:"victim-user"` → 201; Q5d `userIds=["victim-user",null]`; P10e 30/30 rapid writes accepted.
- Evidence: probes + PG repo source (db/repositories/attempts.ts create path, parameterized — no injection, but rows land).
- Impact: in production (DATABASE_URL set) this is unauthenticated growth of `app.dialogue_mastery_attempts` with attacker-chosen user_ids + NULLs; poisons per-user analytics and any future better-auth merge (M1 plans to merge guest progress by id).
- Suggested fix: cookie-resolved identity + UUID-shape check + per-learner attempt-rate cap.
- Regression test: POST attempts with `userId:"../../etc"` → 401/400, never a stored row.

### T2-B-04 — /api/ready discloses database configuration mode to anonymous callers  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: apps/web/src/app/api/ready/route.ts (response body)
- Actual: `{"checks":{…"database":{"status":"skipped","detail":"no DATABASE_URL configured (in-memory DEV-ONLY repositories active)"}}}` — locally. On production the same endpoint will report the real DB status/detail.
- Evidence: probe2 Q5b (source of detail string confirmed).
- Impact: infrastructure fingerprinting (DB present/absent, mode) for zero benefit to a learner.
- Suggested fix: return `{"ok":true}` + checks with status codes only, no `detail` strings.
- Regression test: GET /api/ready body must not contain `DATABASE_URL` or config strings.

### T2-B-05 — task_completed stations complete on a bare client flag  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: apps/web/src/app/api/curriculum/station/route.ts:90-97 (`taskCompleted: z.boolean().optional()`), grading.ts:170-177 (`case 'task_completed': return taskCompleted`)
- Problem: 54 of 56 stations are `task_completed`; completion requires only `taskCompleted:true` in the POST body — no server-side verification that the task (writing/etc.) was touched.
- Actual: P5b — fresh learner, zero interactions, `complete stn-kana-h1 {taskCompleted:true}` → 200 `completed`.
- Evidence: probe1 P5b; grep counts (54 task_completed / 2 viewed, 0 exercise_threshold).
- Impact: walk-order bypass of the whole core path with ~34 identical requests (prereqs check passes once each parent is "completed" the same way); unlocks practice/mastery gates without learning. Integrity-only (same trust class as T1-B-05 write self-assessment, but it gates the WALK).
- Suggested fix: require N graded answers / writing-practice records for this station before accepting taskCompleted (server already counts `incrementAttempts`).
- Regression test: complete a task station with no prior grade/writing events → must 409.

### T2-B-06 — No rate limiting anywhere; state-changing endpoints accept unauthenticated/unbounded writes  [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: whole API surface (no limiter in middleware.ts or any route; grep 0 hits for rate/limit/throttle logic)
- Actual: 30/30 rapid anonymous /api/events POSTs → 201; same holds for progress/attempts writes (Q3/Q4 chains); bodies up to 200KB accepted (P8).
- Evidence: P10e + P8 + source grep.
- Impact: analytics ring-buffer eviction (1000 events), PG row growth (T2-B-03), CPU/memory pressure (T1-B-10) — all unauthenticated.
- Suggested fix: per-IP + per-learner token bucket on POST routes; body-size cap at the edge.
- Regression test: 100 rapid POSTs → expect 429 after threshold.

Non-findings (attacked, held): prototype pollution (zod strips; `__proto__` props dropped, no global pollution observable — P2f/P7b); mass-assignment (all stores build explicit objects; no body spread); CSRF (no state-changing GET; SameSite=lax blocks cross-site POST cookie attach; caveat: `req.json()` parses regardless of Content-Type — P10d text/plain → 201 — so do NOT relax SameSite); open-redirect (middleware has zero redirect logic — only cookie minting); middleware matcher bypass (excluded paths are static assets only; every state-changing route re-resolves identity itself).

## POSITIVE findings (attack on T1-B P1..P8)

- **P1 key-stripping: NARROWED, not universal** — refuted at /poc/practice (T2-B-01). It HELDS under attack everywhere else I hit it: station RSC (h1, h2?review), /practice, mastery GET bank (13 items), journey GET (no exercise payload at all), dialogue bundle (`containsCorrect=false`, 7.4KB clean shape), attempts grading (server-side, perQuestion reveal only post-submission). Practice sessions ARE cookie-scoped (P5i cross-learner → 404) — T1-B never tested that; it passes.
- **P2 guest hardening: HOLDS for station + practice routes** (401 `learner/no_identity` reproduced on every state-changing action incl. grade with 200KB bodies); does NOT apply to progress/attempts/events (B-01/B-04/T2-B-02).
- **P3 server-authoritative walk order: HOLDS** — h3/h4 `prerequisites_not_met` 409s, h2 `completion_not_met` 409, mastery `gate_locked` 409 fired BEFORE answer validation (P8b), writing-practice char validation unchanged (source).
- **P4 traversal: HOLDS** — slug probes `a..b`, `A-B`, `x-y/z` → 404 `dialogue/invalid_slug`; NOTE T1-B miscited the regex as `^[a-z0-9]+$`; actual is `^[a-z0-9-]+$` (dialogues/[slug]/route.ts:18) — behavior identical.
- **P5 structured errors: HOLDS** — every failure in my 70+ requests returned the ok/fail envelope, zero stacks/paths.
- **P6 attempt-number race engineering: source re-read, no counter-evidence** (23505 cause-chain walk, attempts.ts:31-42).
- **P7 completion idempotence: HELD** — no duplicate completes observed; 409/`already` path unchanged (source route.ts:417-419).
- **P8 no cross-user caching: HOLDS** — re-grep 0 hits for `unstable_cache|revalidate|use cache`; every /api route sets `cache-control: no-store` (10 route files).

## COVERAGE

- **T1-B findings re-verified:** 10/10 (source + probes; B-08 runtime stays PG-only hypothesis as T1-B itself framed).
- **Probes executed:** ~75 requests across 3 local server runs on :3129 (t2b-probe.mjs ~40, t2b-probe2.mjs ~30, t2b-probe3.mjs 6) + exactly 1 production GET (read-only page open, /poc/practice).
- **Content sampled for B-03:** 10 recognition exercises across 10 distinct stations (stn-kana-h1..h14, from a 126-exercise recognition census), 4 listening + 4 recall ×2 attempts each (from 173/92 censuses); block→station map built from all 381 blocks in chapter-kana01.stations.ts.
- **RSC flight payloads scanned:** /learn/…/stn-kana-h1, stn-kana-h2?mode=review, /practice, /poc/practice, /poc/assessment, /poc/t2-eval (local) + /poc/practice (prod).
- **Routes/sources re-read line-by-line:** progress, attempts, events, practice, station (1-570), mastery, journey, dialogues/[slug], middleware, learner/{server,identity}, poc/{event-store,principal,assessment-bank,dialogue-bundle}, mastery/types, progress/types, grading.ts (answer path), practice/{types,checker,generator}, db/repositories/{attempts,curriculum,practice}, poc pages (practice/assessment/t2-eval).
- **Greps:** sql.raw (2), cache APIs (0), rate-limit logic (0), completion kinds (54/2/0), toClient consumers, exercises serialization sweep incl. /poc (found the T2-B-01 bypass), sweepExpired callers (none in prod).
- **Not covered:** PG-backed local run (races stay source-level), better-auth (absent), /poc/t2-eval deep flow, fm01 chapter exercise payloads (only its station criteria), pg-boss.

> Conflict note: repo matches AUDIT_CONTEXT §2. One doc-vs-code conflict found: lib/learner/server.ts:41 claims the poc-user legacy store is "unreachable" — refuted by T2-B-02.
