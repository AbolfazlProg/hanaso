# SUBAGENT A — Authentication & IDOR Audit (TASK-HANASO-24)

Independent re-audit of the security-hardening branch `fix/TASK-HANASO-24-security` (tip 4216426).
Method: full source read of every auth/session/cookie/identity seam + IDOR sweep of all 10 API routes
and 6 RSC pages + repository layer + test-suite review + **live black-box probes** against a local
standalone build (port 3131, dedicated DB `hanaso_qa_a`, known audit secret). No production writes;
production not probed at all. No product files modified.

**Overall verdict:** the five claimed fixes are REAL and hold under adversarial probing (signed tokens
unforgeable without the secret, mint-on-GET/HEAD only, guest 401 on every write, caller-scoped reads,
legacy re-issue bounded and fail-closed). The lead's claims were accurate but incomplete: I found
**1 High + 3 Medium** issues they missed, all in the seams *around* the fixes.

---

## FINDINGS

### A-01 — Claimed "release gate" for HANASO_SESSION_SECRET does not exist; public dev fallback is reachable in production [SEVERITY: High] [STATUS: CONFIRMED]
- **Location:** `apps/web/src/lib/learner/session.ts:42-54`; claimed gate referenced at `session.ts:49` ("the release gate refuses to ship") and `ops/checkpoints/TASK-HANASO-24/AUTH_SESSION_HARDENING.md:53`.
- **Evidence:** Exhaustive grep for `HANASO_SESSION_SECRET` across `scripts/`, `.github/workflows/ci.yml`, `infra/deploy/*`, `infra/docker/*`: **zero executable checks**. The deploy gate `infra/deploy/update-hanaso.sh:303` requires only `HANASO_WEB_IMAGE POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB`. `apps/web/.env.example` does not mention `HANASO_SESSION_SECRET` at all. `getSessionSecret()` in NODE_ENV=production merely `console.warn`s once and returns the **source-committed constant** `hanaso-dev-session-secret-v1-do-not-use-in-production`.
- **Impact:** If the VPS `.env` omits the secret at the next deploy (nothing forces it in), any reader of the public repo can compute valid HMACs and mint `hanaso_lid=<any-uuid>.<sig>` for **every learner uuid** — full cross-account read/write (progress, attempts, practice, mastery). This is a silent single-env-var omission away; the in-code mitigation claim is false.
- **Suggested fix:** (1) fail-closed at boot in production (`throw`/exit when unset) or refuse to serve learner routes; (2) add `HANASO_SESSION_SECRET` (+ `HANASO_LEGACY_TOKEN_CUTOFF`) to `update-hanaso.sh` required-keys and `.env.example`; (3) add a CI gate asserting the env var name exists in deploy templates.

### A-02 — Unguarded `decodeURIComponent` → unauthenticated 500 on all mutating routes (and any route via `%25`) [SEVERITY: Medium] [STATUS: CONFIRMED]
- **Location:** `apps/web/src/middleware.ts:68`; `apps/web/src/lib/learner/server.ts:53,66`.
- **Evidence (live probe + server log):** `POST /api/curriculum/station` with `Cookie: hanaso_lid=%` (also `abc%2`, `%E0%A4%A`, `x%zz`, `<token>%`) → **500**, server log shows `⨯ URIError: URI malformed at decodeURIComponent`. `GET /api/progress` with `hanaso_lid=%25` → **500 in the middleware itself** (Next's cookie jar first decodes `%25`→`%`, then the middleware's own `decodeURIComponent('%')` throws). Raw `%` on GET survives only because Next's jar *drops* undecodable values (`cookies.get` → `undefined`, verified with NextRequest in isolation) — but on POST the no-mint pass-through hands the raw header to `resolveLearnerIdFromRequest`, whose regex+decode throws inside the handler.
- **Impact:** Trivial unauthenticated request-cost 500s on every write route; log/alert noise; a 500 page instead of a 401 changes the API contract. No state corruption, no data exposure.
- **Suggested fix:** wrap both decode sites in try/catch → treat undecodable as absent (guest); or drop the manual decode entirely (see A-10 note: the jar already decodes).

### A-03 — Duplicate-cookie parse disagreement: middleware/RSC take the LAST `hanaso_lid`, route handlers take the FIRST → account re-key / write-lockout via cookie injection [SEVERITY: Medium] [STATUS: CONFIRMED]
- **Location:** `apps/web/src/lib/learner/server.ts:65` (regex `(?:^|;\s*)hanaso_lid=([^;]+)` — first match) vs `apps/web/src/middleware.ts:67` and RSC `server.ts:53` (Next cookie jar — last value wins; verified empirically: `new NextRequest` with `hanaso_lid=AAAA; hanaso_lid=BBBB` → `cookies.get()` = `BBBB`).
- **Evidence (live):**
  - `POST` with `hanaso_lid=<attacker-valid>; hanaso_lid=<victim-valid>` → **200, write lands in the ATTACKER's rows** (verified: attacker's own cookie then reads the station `in_progress`). Middleware passed because it validated the LAST (victim) token; the route resolver used the FIRST (attacker) token.
  - `POST` with `hanaso_lid=garbage; hanaso_lid=<valid>` → middleware sees valid (no mint, pass-through) but resolver picks garbage → **401 learner/no_identity**: a first-position injected cookie **locks the victim out of all writes** while `/learn` RSC (last-wins) still renders their real progress — verified end-to-end (page shows completed markers, API returns guest).
  - `POST` with `hanaso_lid=<valid>; hanaso_lid=garbage` → middleware sees garbage (no mint on POST) but resolver uses the valid FIRST token → 200 write (the two layers disagree about whether a valid session exists).
- **Impact:** Requires a cookie-injection primitive on the victim's browser — realistic via any sibling subdomain setting `hanaso_lid` with `Domain=.kotodama.ir` (the app sets host-only cookies, so a domain-wide twin coexists and browsers send both), or any XSS. Consequences: silent re-keying of the victim's learning writes into an account the attacker controls (integrity + privacy of victim activity), or full write-lockout (availability). Not a read of the victim's prior data.
- **Suggested fix:** make `resolveLearnerIdFromRequest` last-wins to match Next's jar (iterate `header.split(';')` keeping the last `hanaso_lid=`, or reuse `req.cookies`); add a regression test for duplicate cookies at both seams.

### A-04 — `/api/events` accepts unbounded `props` (and name registry is not enforced) → authenticated memory-exhaustion; ring holds 1000 × arbitrary-size objects [SEVERITY: Medium] [STATUS: CONFIRMED]
- **Location:** `apps/web/src/lib/poc/event-store.ts:9-13` (`props: z.record(z.string(), z.unknown())` — no size/count cap); `apps/web/src/app/api/events/route.ts:44-54` (POST requires identity only); ring `maxLength = 1000`.
- **Evidence (live):** `POST /api/events` with a 2 MB `props` payload → **201**, event stored (`total` incremented). Identity is free: one prior GET mints a valid signed cookie, so this is effectively an anonymous vector.
- **Impact:** ~1000 × N-MB heap growth per process → OOM/DoS of the whole app; also arbitrary junk readable via the global GET (A-05).
- **Suggested fix:** cap `props` (e.g. `z.string().max(512)` values, ≤16 keys, total ≤4 KB) and validate `name` against `LEARNING_EVENTS`; reject >N events/min per identity.

### A-05 — `/api/events` GET is anonymous and streams every learner's event props (only `user_id` is stripped) [SEVERITY: Low] [STATUS: CONFIRMED]
- **Location:** `apps/web/src/app/api/events/route.ts:57-68`.
- **Evidence (live):** cookie-less `GET /api/events` → 200 with the last 50 events of ALL learners (chapter ids, exercise ids, correctness, scores, handwriting summaries). `user_id` correctly stripped (verified: no `user_id` key in any returned event, incl. server-recorded `station_entered`).
- **Impact:** Cross-learner learning-behavior disclosure to anyone (PoC observability surface); event props are PII-free by contract but still leak activity patterns; combined with A-04 it is also the exfil channel.
- **Suggested fix:** require identity for GET too (or gate behind NODE_ENV≠production / an operator role).

### A-06 — Deploy footguns: `HANASO_LEGACY_TOKEN_CUTOFF` (and the secret) undocumented + un-gated; omitting the cutoff silently orphans every pre-fix learner's progress [SEVERITY: Medium] [STATUS: CONFIRMED]
- **Location:** `apps/web/src/middleware.ts:58-64` (fail-closed default), `.env.example` (neither var listed), `infra/deploy/update-hanaso.sh:303` (required-keys loop).
- **Evidence:** source + file reads above. Production today runs the pre-fix build issuing **raw-uuid** cookies; on first post-fix deploy, if `HANASO_LEGACY_TOKEN_CUTOFF` is unset, `legacyReissueAllowed()` returns false → every existing learner gets a **fresh identity** and their PG rows keyed by the old raw uuid become unreachable (silent progress loss for the whole user base). The fail-closed *security* choice is correct; the *operational* wiring to actually set the cutoff does not exist anywhere.
- **Suggested fix:** document both vars in `.env.example` + VPS checklist; have the deploy script generate the cutoff (`deploy time + 14d`) and require the secret (ties into A-01); log a startup line stating whether legacy re-issue is active and until when.

### A-07 — Guest scope accepted (no 401) on two read routes; `GET /api/curriculum/station` reads under the literal key `userId='guest'` [SEVERITY: Low] [STATUS: CONFIRMED]
- **Location:** `apps/web/src/app/api/curriculum/station/route.ts:549-567` (no guest check), `apps/web/src/app/api/curriculum/journey/route.ts:41` (same).
- **Evidence (live):** cookie-less `GET /api/curriculum/station?...` → 200 `state:null` (read under `('guest', slug)`); `journey` guest → 200 `coreCompleted:0`. Contrasts with `/api/progress|attempts|practice` which 401 guests on GET.
- **Impact:** None today — no code path ever **writes** under `'guest'` (all POST actions 401 first; verified by grep of every store call and by the isolation spec asserting `get('guest', …)` stays null). Inconsistency is a drift hazard (a future "enter for guests" refactor would start writing guest rows).
- **Suggested fix:** return 401 for guest on both reads (or an explicit `guest: true` envelope) for uniformity.

### A-08 — `isLearnerId` is case-insensitive: an uppercase legacy raw uuid gets re-signed as a DISTINCT identity; residual unscoped `list()` on repositories [SEVERITY: Low] [STATUS: CONFIRMED]
- **Location:** `apps/web/src/lib/learner/identity.ts:24` (`/…/i`); `apps/web/src/db/repositories/progress.ts:113-132` and `attempts.ts:114-116` (unscoped `list()` still on the interface).
- **Evidence:** source read + `db/schema/app.ts` (all `user_id` columns plain `text`, default case-sensitive collation → uppercase uuid ≠ victim's lowercase rows; **no takeover**). Live: minted tokens are lowercase `crypto.randomUUID()`. The unscoped `list()` methods have **zero route callers** (grep: only `listForUser`/`listForUnit` are used; the events ring's `list(50)` is the store's own).
- **Impact:** cosmetic identity-spray possibility inside the legacy grace window (each uppercase variant = a new account); the dormant unscoped `list()` is one refactor away from re-introducing the pre-24 leak.
- **Suggested fix:** restrict `isLearnerId` to lowercase (or normalize+reject); delete the unscoped `list()` from the interfaces or mark them `@internal` with a lint rule.

### A-09 — Test gaps: no coverage for duplicate-cookie smuggling, %-malformed cookies, production Secure flag, OPTIONS no-mint, x-forwarded-proto [SEVERITY: Low] [STATUS: CONFIRMED]
- **Location:** `apps/web/tests/unit/middleware-learner-cookie.test.ts` (12 tests), `tests/unit/learner-identity.test.ts` (13), `tests/integration/learner-isolation.spec.ts` (5), `tests/integration/learning-slice.spec.ts`.
- **Evidence:** full read of all four. They genuinely prove the happy-path isolation (A/B stores independent, guest 401 + no writes, tampered/raw/tampered-signature rejected, `?userId=` ignored, cross-runtime byte-identity, legacy cutoff matrix incl. malformed-window behavior). **Missing:** every case that produced A-02/A-03 live (duplicate cookies, `%`/`%25` values, first-vs-last disagreement), a production-mode Set-Cookie `Secure` assertion (tests only check httponly+lax on http://localhost), OPTIONS/HEAD method matrix at HTTP level, and `x-forwarded-proto` handling. The live-QA evidence file (`qa-evidence/security_qa_results.json`) likewise has no duplicate-cookie or malformed-encoding scenario.
- **Suggested fix:** add the missing cases (they are cheap direct-handler/unit tests; A-02/A-03 each reproduce in <10 lines).

---

## POSITIVE FINDINGS (verified, holds)

1. **Token crypto is sound.** `parseSessionToken` (session.ts:71-80) enforces uuid-v4 shape, exactly-43-char base64url signature, `lastIndexOf('.')` (trailing-dot/multi-dot shapes die); node verify uses `timingSafeEqual` over equal-length buffers (session-node.ts:25-32); web verify loops all 43 chars (session-web.ts:34-44). Domain-separated message `hanaso_lid:v1:<uuid>`. **Cross-runtime byte-identity verified live**: a middleware-minted token (WebCrypto/edge) validates under an independent node HMAC with the same secret, and `verifySessionTokenWeb` accepts the node-signed token (unit test + live P1).
2. **Signing oracle closed.** Forged raw uuid → POST 401, GET mints a *fresh unrelated* uuid (live); tampered signature → 401 (live); fully-URI-encoded and `%2E`-encoded tokens decode identically at both seams — no encoding bypass (live).
3. **Mint discipline correct.** GET and HEAD mint (live P1/P14); POST without identity mints nothing (live: no Set-Cookie, 401 at route); OPTIONS returns 204 with no Set-Cookie (live P7); the middleware error path cannot mint a token for a presented raw uuid outside the grace window (unit tests + code).
4. **Legacy re-issue is genuinely fail-closed and bounded.** `legacyReissueAllowed` (middleware.ts:58-64): production without cutoff → false; `Date.parse` NaN (malformed value) → false; expired → false; same-uuid re-issue only inside the window (three unit tests pin exactly this matrix).
5. **IDOR is closed on all 10 routes.** Every store call in `/api/progress`, `/api/attempts`, `/api/curriculum/{station,mastery,journey}`, `/api/practice`, `/api/events` uses the cookie-resolved identity; client `userId` in query/body is ignored (live: `?userId=<A>` as B returns B; attempts GET is `listForUser`; practice answer/complete verify `session.userId === caller` → 404 for B on A's session, live-verified at HTTP level; body-`userId` spoof ignored). `recordLearningEvent` has a `poc-user` default but **no production caller omits the userId argument** (grep-verified, 13 call sites all pass it).
6. **No poc-user fallback remains in the repositories.** `PgAttemptRepository.create` requires userId (NOT NULL backstop); in-memory twins keyed per-identity; no `POC_DEFAULT_USER_ID` outside `principal.ts`/`events.ts` default.
7. **Client twin can no longer touch the cookie.** Zero `document.cookie` references in `src/` (grep); `identity.ts` is localStorage-only; `walk-persistence.ts` keys snapshots per *local* id and never crosses the network — keyspace cannot select another user's server data.
8. **Cookie flags correct.** Production standalone: `HttpOnly; Secure; SameSite=lax; Path=/; Max-Age=1y`, host-only (no `Domain`) — live-verified; `x-forwarded-proto: https` forces Secure (live P11).
9. **Matcher leaves no state-changing route outside the middleware.** `/((?!_next/static|_next/image|favicon.ico|audio/).*)` covers every `/api/*` and page path for all methods; exclusions are static assets only. No server actions exist (`'use server'` grep: none). Next 16.4.3 post-dates the CVE-2025-29927 middleware-bypass (`x-middleware-subrequest`) fix line.
10. **CSRF posture adequate and reasoned.** All mutations are POST + `req.json()` only (no form-encoded acceptance anywhere); SameSite=Lax + no-CORS means even same-registrable-domain siblings cannot fire a credentialed JSON POST without a preflight the server never answers; the Lax-vs-Strict tradeoff (external arrivals keep identity) is documented at middleware.ts:20-24. No GET mutates server state (minting a cookie is client-side only).
11. **`/poc/*` is really gone in production** (live: all six pages 404 in the standalone production build via `guardPocPage`), closing the answer-key RSC leak adjacent to this domain.
12. **Suites are green as claimed:** in-memory 64 files / 751 tests passed; PG integration 8 files, 34 passed / 8 skipped.

---

## COVERAGE

- **Source read (full):** `lib/learner/{session,session-node,session-web,server,identity,bootstrap}.ts`, `middleware.ts`, `lib/poc/{stores,event-store,principal,completions}.ts`, `modules/curriculum/{server,events,walk-persistence,journey}.ts`, `modules/{mastery,progress,practice,curriculum}/repository.ts` (in-memory), `db/repositories/{attempts,progress,curriculum,practice}.ts`, all 10 `app/api/**/route.ts`, `app/page.tsx` + `app/learn/**` (6 RSC pages) + `app/practice/page.tsx`, `next.config.ts`, `db/schema/app.ts` (user_id columns), `.env.example`, `infra/deploy/update-hanaso.sh`, `infra/docker/{Dockerfile,docker-compose.yml}`, `.github/workflows/ci.yml`.
- **Grep sweeps:** store-call predicate audit across `src/` (`.get/.upsert/.create/.list/listForUser/listForUnit/.find` — 120+ hits reviewed); `recordLearningEvent` call sites; `document.cookie`; `'use server'`; `POC_DEFAULT_USER_ID`; `HANASO_SESSION_SECRET`/`LEGACY_TOKEN_CUTOFF` repo-wide.
- **Live probes (local only, port 3131, own DB):** 20 probe groups — mint & flags, A/B isolation both directions, raw/tampered/encoded/duplicate/percent-malformed cookies across GET/POST/HEAD/OPTIONS/PUT, account-rekey PoC, guest reads on all GET routes, events anonymous read + 2 MB write, practice session ownership + userId spoof, x-forwarded-proto, `/poc/*` production 404s. Server log inspected for the URIError stack.
- **Tests executed:** `pnpm test` (751/751 green), PG integration via `TEST_DATABASE_URL` (34 passed/8 skipped).
- **Not covered:** real-browser cookie-ordering behavior for injected domain cookies (reasoned from RFC 6265 ordering, not driven in Chromium — the attack does not depend on order: *first-position* injection was proven server-side); better-auth (not present, M1); production instance (read-only, untouched).

## NEXT ACTIONS (priority order)

1. A-01/A-06: add the secret + cutoff to the deploy gate & `.env.example`; make `getSessionSecret` fail-closed in production (or emit a startup health-check failure surfaced on `/api/ready`).
2. A-02: try/catch (or remove) the double `decodeURIComponent` at all three seams.
3. A-03: align the route-handler regex to last-wins (match Next's jar) + regression tests for duplicates.
4. A-04/A-05: bound and register-check event props; require identity for events GET.
5. A-09: port the live probe cases (duplicate cookies, %-malformed, Secure-in-production, OPTIONS) into the unit/integration suites.

---

## FINAL VERIFICATION (round 2, commit 14d9d3a)

Independent re-verification of every round-1 finding on the remediation commit. Method: source read of the full CP-07a diff, direct execution of the new `getSessionSecret` (esbuild-bundled, NODE_ENV=production), fresh standalone build at 14d9d3a live-probed on port 3131 (own DB `hanaso_qa_a2`) plus a second no-secret instance on 3132, both suites re-run. No production access; no files modified beyond this report.

### Verdict table

| Finding | Verdict | Evidence |
|---|---|---|
| A-01 secret gate [High] | **FIXED** | (a) `session.ts:52-61`: production + missing env → `throw` — **proven by direct execution**: transpiled module run with NODE_ENV=production and no env → throws `"[hanaso/session] HANASO_SESSION_SECRET is required in production…"`; dev fallback intact; env-set returns it. (b) `update-hanaso.sh:308` loop now requires `HANASO_SESSION_SECRET HANASO_LEGACY_TOKEN_CUTOFF` (read at lines 303-309). (c) timing: the throw is **first-use, not import-time** — the process boots and serves POST-401s until a cookie-less GET hits the mint path; acceptable because the Docker HEALTHCHECK (`wget /api/health`, cookie-less GET) lands exactly on that path — **proven live**: no-secret instance → `/api/health` = **500**, `/learn` = 500 → container never healthy → the three-tier deploy gate fails the release. (d) shared-vps compose passes `env_file: .env` into the web container (compose lines 36, 53-56). See informational A-10. |
| A-02 decode 500s [Medium] | **FIXED** | `server.ts:50-56` `safeDecode` at both resolvers + `middleware.ts:69-77` try/catch. **Live**: POST `/api/progress` with `hanaso_lid=%`, `abc%2`, `%25`, `%E0%A4%A`, `x%zz` → all **401 `learner/no_identity`** (was 500); GET variants → 200 (mint), no URIError in the server log. |
| A-03 duplicate-cookie disagreement [Medium] | **FIXED** | `server.ts:81-87` now `matchAll` last-wins. **Live, both orders agree with the middleware's last-wins jar**: valid-first+garbage-last POST → 401, no mint (middleware also saw garbage-last); garbage-first+valid-last POST → 200 write under the VALID identity (read-back proves it) with no Set-Cookie; GET valid-first+garbage-last → middleware mints fresh AND the resolver follows the minted identity (proven on a station where the first-position identity had `in_progress`: response showed null, not the first identity's data — no divergence). **The round-1 re-key PoC is defeated**: attacker-token-first + victim-token-last now writes to the victim (attacker's later read: null; victim's: in_progress). Unit test `learner-identity.test.ts:92-113` covers all three orders and passes. |
| A-04 unbounded events props [Medium] | **FIXED** | `event-store.ts:17-23`: ≤16 keys, key ≤64 chars, ≤4KB serialized. **Live**: 2 MB props → **400 `events/validation_failed`**; 17 keys → 400. Regression test `mastery-api.spec.ts:183-197` (17-key, 8KB, legit-pass) green. |
| A-05 (events GET exposure) | **FIXED** | `events/route.ts:62-84`: identity required + caller-scoped filter on `props.user_id` + `user_id` stripped from the response; POST stamps the caller's `user_id` **after** the spread (`{ ...props, user_id: userId }`) so a client cannot poison the scoping key. **Live**: A posts `probe_a_event` → A's GET sees it, B's GET does not (B total: 0); server-emitted `station_entered` still visible to its own user; no `user_id` key in any returned event. See informational A-11 for the over-HTTP nuance. |
| A-06 (cutoff/secret ops wiring) | **FIXED** | `.env.example:23-31` documents both vars with `openssl rand -hex 32` + NOW+14d guidance; `AUTH_SESSION_HARDENING.md:86-96` updated and accurate; deploy A3 gate enforces both keys (see A-01b). |
| A-07 guest-scope reads on station/journey GETs [Low] | **NOT FIXED (deferred)** | No diff to those routes. Re-confirmed harmless: no write path can target `'guest'` (all POST actions 401 first; all 14 `recordLearningEvent` call sites still pass `userId` — re-verified per site). |
| A-08 `isLearnerId` case-insensitivity + dormant unscoped `list()` [Low] | **NOT FIXED (deferred)** | `identity.ts` unchanged; unscoped `list()` still on the interfaces but still has zero route callers. |
| A-09 test gaps [Low] | **FIXED (core cases)** | New `learner-identity.test.ts:86-113` (A-02 % variants incl. `%25`; A-03 three duplicate orders), `mastery-api.spec.ts:183-213` (A-04 bounds + B-05 scoping/401), `learning-slice.spec.ts` updated for the events GET identity requirement. Still missing (accepted): HTTP-level OPTIONS/HEAD matrix and production-`Secure` assertion. |

### Original five fixes — re-verified on 14d9d3a (live)

1. Signed-token shape & cross-runtime verify: minted token matches `uuid.base64url(43)` and validates under an independent node HMAC (same secret) — ✔.
2. Mint on GET/HEAD only: cookie-less POST → 401 with **no Set-Cookie** — ✔.
3. IDOR closed: `?userId=<A>` as B ignored (server resolves B); attempts GET as B → 0 rows; practice status as B → own data only — ✔.
4. Guest 401s: raw-uuid POST → 401, tampered-signature POST → 401, no-cookie POST → 401 — ✔.
5. Legacy cutoff fail-closed: `middleware.ts:58-64` unchanged (missing/malformed/expired cutoff → no re-issue); unit-test matrix still green — ✔.

Suites on 14d9d3a: in-memory **755/755** (64 files), PG integration **35 passed + 8 skipped** (8 files) — matches expectations. Cross-domain CP-07a changes (C-01 in-flight lifecycle, C-02 25P02 retry, C-04 attemptCount-in-tx, C-05 `runInTx` nesting guard, B-06 `correctOptionId` removal) reviewed for isolation regressions: all remain keyed by the server-resolved `userId`; no nesting path reaches `runInTx` inside `runInTx` from any route; no new client-supplied identity input.

### NEW findings introduced/exposed by the fixes (all Low/informational — none block)

- **A-10 — Fail-closed secret throw is first-use, not boot-time** [Low, informational] [CONFIRMED] — `session.ts:52` throws when `getSessionSecret()` is first called (middleware mint path / first parseable-token verify), not at module import. The process starts and can answer POST-401s before any throw. Acceptable in practice: the Docker HEALTHCHECK request is a cookie-less GET → always 500 without the secret (proven live), so the container never turns healthy and the three-tier deploy gate refuses the release; the A3 env gate blocks earlier still. Suggested (optional): assert the secret eagerly in `instrumentation.ts` so the process exits at boot.
- **A-11 — "GET requires identity" is route-level, not HTTP-level (mint-on-GET design)** [Low, informational] [CONFIRMED] — Over HTTP a cookie-less `GET /api/events` returns **200**, not 401: the middleware mints a fresh identity on the same request, so the resolver sees a valid token. Live-verified: the response is **own-scoped and empty** (total 0) — no cross-learner disclosure; the 401 only manifests when the middleware is bypassed (direct handler calls / matcher-excluded paths). Same applies to the other identity-gated GETs. No action required; worth a doc note.
- **A-12 — Double-decode nuance at the resolvers** [Low, informational] [CONFIRMED] — `safeDecode` decodes a value the Next jar has already decoded once (RSC seam) or decodes the raw header once (route seam). A *doubly*-percent-encoded valid token is accepted by the middleware (valid after its decode) but degrades to guest in the route resolver (still encoded after one decode) → self-inflicted 401 only; no cross-account impact (verified by reasoning over both seams; single-encoded tokens agree everywhere, live-retested). Optional hardening: canonicalize the cookie once (decode in exactly one place).

### DOMAIN VERDICT: PASS

Every High/Medium finding from round 1 (A-01, A-02, A-03, A-04, A-05/A-06 ops wiring) is verified fixed from source and by live probe on the remediation commit; the two deferred Lows (A-07, A-08) were known and carry no write-path exposure; the three new informational Lows (A-10..A-12) do not affect isolation, forgeability, or availability. The original five TASK-HANASO-24 fixes still hold in full on 14d9d3a.
