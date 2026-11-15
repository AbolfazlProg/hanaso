# TASK-HANASO-24 — SECURITY ROOT CAUSE (CP-01)

> Full-code census on the fix branch base (`af49535`, identical product code to
> production `3d8b8ccd`). Every claim below was re-read at line level in this
> worktree — nothing is inherited from the audit report without re-verification.
> Audit cross-refs use TASK-HANASO-23 BUG ids (d691e25 register).

## 1. Ground truth (re-validated this session)

| Item | Value | Validation |
| --- | --- | --- |
| Repo / branch | github.com/AbolfazlProg/hanaso · `fix/TASK-HANASO-24-security` | `git ls-remote` + local clone |
| Branch base | `af49535` (tip of feat/TASK-HANASO-22 line — 182 commits ahead of main) | `git merge-base`, log |
| Audit reference | `audit/TASK-HANASO-23 @ d691e25` (CP-07 final synthesis — mission complete) | `git show d691e25` |
| Production | `1.0.0-hanaso22-r01 @ 3d8b8cc` — read-only for this mission | in branch history |
| Identity | no accounts; `hanaso_lid` cookie = per-browser UUID | `lib/learner/*`, `middleware.ts` |

## 2. Identity architecture as-is

```
browser ──(no cookie)──> middleware (EVERY method/path) ──mints UUID──> Set-Cookie hanaso_lid=<uuid>
                          samesite=lax · httpOnly:false · NO Secure · 365d
route handlers / RSC: resolveLearnerId(FromRequest) → uuid | 'guest'
legacy routes (/api/progress, /api/attempts): NEVER call the resolver —
they read userId from body/query instead, defaulting to shared 'poc-user'.
```

## 3. Root causes (each confirmed at line level)

### RC-1 — Legacy routes resolve ownership from client input (BUG-011/030/033; mission finding 1)

- `api/progress/route.ts:30` — GET: `url.searchParams.get('userId') ?? POC_DEFAULT_USER_ID`
- `api/progress/route.ts:55` — POST: `parsed.data.userId ?? POC_DEFAULT_USER_ID`
- `api/attempts/route.ts:23` — GET: `getAttemptStore().list(dialogueId)` — **no user scoping at all** (repo: `db/repositories/attempts.ts` `list()` returns up to 500 rows of ALL users incl. their `userId`)
- `api/attempts/route.ts:45,78-80` — POST: `userId` from body (schema `modules/mastery/types.ts:71` — `z.string().min(1).optional()`, any string, NULL allowed); `PgAttemptRepository.create` re-defaults NULL → `poc-user` (`db/repositories/attempts.ts`: `input.userId ?? POC_DEFAULT_USER_ID`)
- Schemas accept userId from clients: `modules/progress/types.ts:48`, `modules/mastery/types.ts:71`

**Attack chain (audit-verified, re-confirmed by code):** attacker POSTs `/api/attempts {userId: victim, answers: all-correct}` → server grading creates a *passed* attempt owned by victim → POSTs `/api/progress {userId: victim, event: mastery_passed, attemptId}` → the D-gate ownership check at `api/progress/route.ts:65` (`attempt.userId === userId`) passes because BOTH sides are attacker-supplied → victim's unit flips to `understood`. Any third cookie reads it via GET `?userId=victim`. The `poc-user` default additionally lets anonymous clients poison the shared store (BUG-033).

Root cause: these two routes predate the learner-identity work (TASK-LEARNING-08/#109); the newer surfaces were migrated, the legacy pair never was — and the repository layer *amplifies* it with its own `poc-user` fallback.

### RC-2 — Identity cookie is forgeable and stealable (BUG-028/039; mission findings 3+5)

`middleware.ts:41-46` + `lib/learner/identity.ts:54-57`:
- `httpOnly: false` (client JS reads/writes it — `identity.ts` `writeCookieId` sets it via `document.cookie`)
- **no `Secure`** — value crosses plaintext HTTP
- value = raw UUID, **no server-side issuance record, no signature** — any client that knows a victim's UUID becomes the victim (forged-cookie IDOR); the server cannot distinguish issued from forged
- `middleware.ts:30-48` mints a fresh identity for **every** request without a valid cookie — including state-changing POSTs. The in-code GUEST 401 guards (`server.ts` docblock, station/practice routes) are **dead code over HTTP**: a cookie-less POST never reaches them as guest, it arrives freshly minted. This is BUG-039 (unauthenticated row growth: every cookie-less POST grows PG rows).
- Session fixation: N/A today (no login/privilege change); cookie is never rotated; 365d lifetime.

Client twin consumers: `LearnerIdBootstrap` (layout mount, value unused) and `walk-persistence.ts:73,96,126` — the latter uses the id ONLY as a localStorage key namespace, never on the wire → safe to keep with an httpOnly cookie (existing users keep their localStorage uuid, so walk snapshots survive the hardening).

### RC-3 — `/poc/practice` ships the answer key to the client (BUG-032; mission finding 2)

- `app/poc/practice/page.tsx:15` — `generateExercises(dialogue, characters)` produces keyed items (`modules/practice/types.ts:35,44,54,67` — `correctOptionId`, `correctOrder`)
- the RSC page passes them as props to the `PracticeRunner` client island, which grades **client-side** (`practice-runner.tsx:13` imports `checkAnswers`/`isAnswerCorrect`) → the full stage-C key (correctOptionId×9, correctOrder×2) rides the RSC flight payload in the HTML — verified on production with one GET (audit T2-B-01; code re-confirmed here).
- Module docblock states the design openly: "deterministic generator + checker run on both the server RSC … and the client island" (`modules/practice/index.ts:1-7`) — the page predates the SKL-013 no-key-in-client rule that the H22 surfaces enforce.

Usage census: the product **never links into `/poc/*`** (`app/learn/page.tsx:17` asserts the invariant; nav has no poc links; grep confirms zero product callers). The only consumers are the legacy pages themselves and `lib/poc/client.ts`. The H22 real surface (`/practice` + `/api/practice`) grades server-side and strips via `toClientItem` (`modules/practice/session.ts` — `correctOptionId`/`revealFa`/`character` removed; audit wire-probed 0 key fields). => `/poc/practice` is a **dead legacy demo in production clothing**.

Other `/poc` pages: `/poc/assessment` correctly strips (`toClientQuestions`, `assessment-bank.ts` — SERVER-ONLY `correctOptionId`/`weakPoint` removed); `/poc/dialogue`, `/poc/lesson`, `/poc/ui`, `/poc/t2-eval` carry no exercise keys (dialogue bundle has none). The single key leak is `/poc/practice`.

### RC-4 — Zero transactions on multi-step writes (BUG-036; mission finding 4)

Repo-wide: no `db.transaction` anywhere (grep: 0 hits). Multi-step writes:

1. **Practice complete** (`api/practice/route.ts:277-328`): `recordCompleted` (INSERT `app.practice_sessions`) + N× `loStore.get → fold → upsert` (`app.learning_object_states`, one upsert per object) — a failure midway leaves the session logged with partial/no evidence fold (contradictory Progress/Attempts-adjacent state: session says practiced, LO states disagree).
2. **Station complete** (`api/curriculum/station/route.ts:481-543`): station `upsert` + chapter aggregate `upsert` — partial failure = station completed but chapter never flips to `stations_complete` (learner permanently locked out of the gate by an inconsistent aggregate).
3. `db/repositories/attempts.ts` `create`: MAX+1 attemptNo inside a 3-retry 23505 loop (concurrency handled for THIS single insert — the one place that already does it right).
4. Idempotency: practice `complete` has **no replay guard** — double-submit/concurrent duplicate → PK violation on `practice_sessions.id` → raw 500. Evidence fold is read-modify-write per object: two concurrent completes (different sessions, same object) → lost update.
5. Unique constraints (verified `db/schema/app.ts`): `dialogue_mastery_attempts (user_id, dialogue_id, attempt_no)` unique; `station_progress` PK (user, station); `chapter_progress` PK (user, unit); `learning_object_states` PK (user, objectId); `practice_sessions` PK (id). The constraints exist — the writes just don't run inside transactions and don't treat conflicts as idempotent replays.

Volatile-state register (mission §4 "document the risk"): (a) `PgPracticeSessionRepository.inFlight` is a **process-local Map** (`db/repositories/practice.ts` — "In-flight sessions are NOT kept in the DB"): in-flight session state (answers, attempts, firstTryCorrect) is heap-only, lost on restart (mid-practice 404s), and would break under multi-instance deployment — single-VPS today, documented; a PG-backed in-flight store is the follow-up, NOT built here (no new event-sourcing/FSRS per mission). (b) `InMemoryEventStore` ring (1000, heap) — same class, analytics only. (c) In-memory repository mode (no DATABASE_URL) is dev/CI-only and has no transaction concept at all — single-threaded JS makes it sequentially consistent; documented, not "fixed".

### RC-5 — Anonymous/legacy exposure surfaces (adjacent, LOW)

- `/api/events` POST: no identity check — anonymous unbounded spam into the ring (`app/api/events/route.ts`); GET lists last 50 events **with every learner's `user_id`** (`modules/curriculum/events.ts:105` `store.record(name, {...props, user_id: userId})`).
- `/api/ready` discloses DB mode (`skipped` detail) — operational endpoint, consumed by deploy gates; accepted risk (documented), not changed (changing it risks breaking deploy tooling — out of security scope, no user data).
- Practice `write` items: `api/practice/route.ts:249` — `payload.answer.kind === 'write' && payload.answer.accepted` grades by client boolean (BUG-031, fabricated LO evidence). Fixing needs server-side stroke grading (a feature) or dropping the kind (a product-behavior change) — **deferred with rationale** in §6; evidence-only surface (never gates the walk, never FSRS, review engine not active).
- F1 feedback text embeds correct readings on learn surfaces (BUG-029) — content-authoring fix, out of this mission's code scope (documented for the content track).
- No rate limiting / body-size limits anywhere (T2-B-06/T1-B-10) — noted; a real limiter is infra work (needs product decision on budgets), documented as deferred. The IDOR/identity fixes remove the *cross-user* damage; remaining exposure is self-inflicted rows under one's own identity.

## 4. Complete endpoint census (mission: "search for ALL similar paths")

| Surface | Method | Identity source | Ownership scoping | Key exposure | Multi-write | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/progress` | GET/POST | **body/query userId** (client) | ❌ none | — | 1 upsert | **FIX (RC-1)** |
| `/api/attempts` | GET/POST | **body userId** (client) | GET: ❌ none (all users) | server-graded ✓ | insert (attemptNo retry ✓) | **FIX (RC-1)** |
| `/api/events` | GET/POST | none | ❌ (global ring) | `user_id` in GET | heap ring | harden (CP-02) |
| `/api/ready`, `/api/health` | GET | none (ops) | n/a | DB mode (accepted) | n/a | document only |
| `/api/dialogues/[slug]` | GET | none (public content) | n/a | no keys in bundle | n/a | OK (traversal-blocked) |
| `/api/curriculum/station` | GET/POST | cookie (guest 401 on POST ✓) | ✓ per-learner | server-graded, reveal at F3 only ✓ | complete = 2 upserts ❌tx | **TX fix (CP-04)** |
| `/api/curriculum/journey` | GET | cookie (guest → honest empty) | ✓ | stripped ✓ | read-only | OK |
| `/api/curriculum/mastery` | POST | cookie, **no explicit guest 401** (gate 409s guests first — unreachable write) | ✓ | server-graded ✓ | attempt + chapter upsert ❌tx | add 401 + TX (CP-02/04) |
| `/api/practice` | GET/POST | cookie (guest 401 ✓) | ✓ session ownership checks | `toClientItem` stripped ✓ | complete = 1+N ❌tx, no idempotency | **TX+idempotency (CP-04)** |
| `/poc/*` pages (6) | RSC | mixed | — | `/poc/practice` ships full key (RC-3); assessment strips ✓ | — | **dev-only gate (CP-03)** |
| `/` home, `/learn`, `/practice` | RSC | cookie (`resolveLearnerId`) | ✓ per-learner | stripped (audit wire-probed) ✓ | reads only | OK |

## 5. Fix design (per phase; details in each phase doc)

**CP-02 — identity + IDOR (this doc → IDOR_REMEDIATION.md + AUTH_SESSION_HARDENING.md)**

1. *Signed session token* (real session architecture, stateless — fits no-accounts product, edge middleware, additive-only):
   - cookie value becomes `<uuid>.<base64url(hmac-sha256(HANASO_SESSION_SECRET, "hanaso_lid:"+uuid))>`; same name `hanaso_lid`, same 365d/lax.
   - Middleware (edge, WebCrypto) mints on GET/HEAD only — **no more mint-and-proceed on state-changing requests** (closes BUG-039: cookie-less POST → routes see guest → 401, the in-code guards become live).
   - Existing valid-shape raw-uuid cookies are **re-issued signed with the SAME uuid** on first GET (one-time transition; no re-keying, no orphaned progress; residual window documented in AUTH_SESSION_HARDENING.md).
   - Resolvers (`resolveLearnerId(FromRequest)`) verify signature (constant-time) → uuid or guest. `isLearnerId` becomes internal shape check.
   - Cookie flags: `httpOnly: true`, `secure` (https/x-forwarded-proto aware; 127.0.0.1 stays usable for QA), `sameSite: 'lax'` (Strict would mint fresh identities for users arriving from external links — identity loss; Lax already blocks cross-site POST fetches → CSRF for our JSON-only mutating APIs is closed by Lax + content-type; analysis in AUTH_SESSION_HARDENING.md).
   - Client twin: stops writing the cookie (server owns it); keeps localStorage mirror for walk-snapshot namespacing only.
   - Secret: `HANASO_SESSION_SECRET` env; dev/test fallback constant + one-time warn (determinism for tests); RELEASE_CANDIDATE gates on a real secret in prod.
2. *IDOR routes*: `/api/progress` + `/api/attempts` resolve identity from cookie only; `userId` removed from request schemas (zod strips unknown → stale clients ignored, never trusted); GET attempts scoped to the caller (`listForUser`); repo-level `poc-user` fallback removed from the request path (repository keeps the constant only for seeding/history); D-gate check now compares two server-derived values (chain dead). Explicit guest 401 on mastery POST for consistency.

**CP-03 — answer key (→ ANSWER_KEY_EXPOSURE_FIX.md)**: all six `/poc/*` pages become **dev/test-only** (`NODE_ENV==='production'` → `notFound()`): in production they 404 — no RSC payload, no key, nothing to strip; in dev they keep working (integration flows, demos). The H22 real surfaces are untouched. Verified by direct GET + browser test in CP-05 (scenario 12).

**CP-04 — transactions (→ DATABASE_TRANSACTION_FIX.md)**: a transaction-aware completion path (PG mode: `db.transaction` with tx-bound repository instances; memory mode: direct sequential calls — single-threaded) for (a) practice complete (idempotent replay via on-conflict + re-read; evidence fold under the tx; 23505 → bounded retry), (b) station complete (station + chapter upserts in one tx), (c) mastery gate (attempt insert + chapter fold in one tx). No destructive migration; constraints already exist (§3.RC-4.5).

## 6. Deferred items (explicit, with rationale)

| Item | Why deferred | Owner track |
| --- | --- | --- |
| BUG-031 write-kind client grading | fix = new server grading feature or product change; evidence-only, no gate/FSRS impact | product decision → next mission |
| BUG-029 F1 text content leak | content authoring (60+ strings), not code | content mission |
| Rate limiting / body-size limits | needs product budgets; cross-user damage removed by CP-02 | infra follow-up |
| PG-backed in-flight sessions + event store | availability (restart/multi-instance), not confidentiality; single VPS today | next data mission |
| `/api/ready` DB-mode disclosure | ops endpoint, consumed by deploy tooling | accepted risk |

## 7. Evidence index (primary locations)

- `middleware.ts:30-48` (mint-and-proceed, flags) · `lib/learner/identity.ts:54-57` (client cookie write) · `lib/learner/server.ts:43-76` (resolvers, GUEST)
- `api/progress/route.ts:30,55,65` · `api/attempts/route.ts:23,45,78` · `db/repositories/attempts.ts` (`list`, `create` poc-user fallback) · `modules/progress/types.ts:46-51` · `modules/mastery/types.ts:69-74`
- `app/poc/practice/page.tsx:15,34-42` · `modules/practice/types.ts:35,44,54,67` · `app/poc/practice/practice-runner.tsx:13` · `modules/practice/session.ts` (`toClientItem`) · `lib/poc/assessment-bank.ts` (correct strip pattern)
- `api/practice/route.ts:161-170,246-249,277-328` · `api/curriculum/station/route.ts:481-543` · `db/schema/app.ts:76,118,151,236` · `db/repositories/practice.ts` (inFlight Map)
- `modules/curriculum/events.ts:101-105` · `app/api/events/route.ts` · `app/learn/page.tsx:17` (no-poc-links invariant)
