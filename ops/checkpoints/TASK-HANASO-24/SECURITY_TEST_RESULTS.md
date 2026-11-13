# TASK-HANASO-24 — SECURITY TEST RESULTS (CP-05)

> The 12 mandatory QA scenarios (mission §5), executed against the standalone
> PRODUCTION build of THIS branch, served locally on 127.0.0.1:3124 with a REAL
> PostgreSQL 18.4 (dedicated `hanaso_qa` database on the isolated test cluster —
> never production) and a real `HANASO_SESSION_SECRET`. Two independent learner
> identities A and B (real Chromium contexts with server-minted signed cookies)
> + one anonymous context. Harness: `scripts/h24_security_qa.mjs`
> (workspace copy in the sandbox; evidence JSON committed under
> `qa-evidence/security_qa_results.json`).

**RESULT: 12/12 scenarios passed — 51/51 checks green.**

## 1. Environment

| Item | Value |
| --- | --- |
| Build | standalone production build of `fix/TASK-HANASO-24-security` (post-CP-04 + the CP-05 middleware fix) |
| Server | `node apps/web/server.js` · PORT 3124 · `DATABASE_URL=postgresql://postgres@127.0.0.1:54329/hanaso_qa` |
| Session | `HANASO_SESSION_SECRET` set (no dev fallback); no `HANASO_LEGACY_TOKEN_CUTOFF` (fail-closed default) |
| Browser | real Chromium (playwright-core 1.57), three contexts: A, B, anonymous |
| Identity A / B | server-minted signed tokens `<uuid>.<hmac>` — distinct per-browser |
| DB checks | read-only `psql` SELECTs on `hanaso_qa` (never mutated by the checks) |

## 2. The 12 scenarios (mission §5 verbatim → observed)

### S1 — A فقط اطلاعات خودش را دریافت کند ✅ (4/4)
A starts a legacy unit cycle (POST `/api/progress` `unit_started` → 201) and a
station walk (POST `station/enter` → 200). GET `/api/progress` returns A's own
record with `userId === A` and stage `A_selfcheck`; GET station state returns
A's `in_progress` row.

### S2 — A با ارسال userId=B نتواند Progress کاربر B را بخواند یا تغییر دهد ✅ (3/3)
- `GET /api/progress?dialogueId=…&userId=<B-uuid>` → **the parameter is ignored**;
  the server resolved `userId = A` and returned A's own record.
- `POST /api/progress` with `userId: <B-uuid>` in the BODY → applied to A's own
  record only: B's row stayed `A_selfcheck` while A advanced to `B_lesson`.

### S3 — A نتواند Attempt متعلق به B ثبت کند ✅ (4/4)
- `POST /api/attempts` with body `userId: <B-uuid>` → the attempt was recorded
  under **A** (`attempt.userId === A`).
- A's listing contains only A-owned rows; B's listing contains only B-owned rows
  (count 0 for B at that point — no cross rows).
- The D→understood gate accepts only the CALLER-OWNED passed attempt; the
  end state never flips to `understood` otherwise (status stayed `active`).

### S4 — B نتواند اطلاعات A را مشاهده کند ✅ (3/3)
- `GET /api/progress?userId=<A-uuid>` by B → B's own record (resolved `B`).
- B's station GET for A's station → honest `null` (not A's `in_progress`).
- B's journey GET → 200 with B's own scoped view.

### S5 — دست‌کاری Cookie باعث جعل هویت نشود ✅ (8/8)
- **RAW B uuid (no signature) on GET → a FRESH identity was minted; the resolved
  identity was never B** (nor A), progress `null`. The same value on POST → 401.
- A's valid token with a tampered signature character → GET: fresh identity
  (never the forged one); POST → 401.
- Garbage / `poc-user` → GET: fresh identity + empty; POST → 401.
- Live cookie flags: **httpOnly=true, secure=true, sameSite=Lax**; page JS
  (`document.cookie`) cannot read the identity.

**Live finding fixed during this phase:** the first QA run showed the raw-uuid
re-issue as a permanent re-signing oracle (a stolen pre-24 raw value could be
re-signed forever). Closed in `middleware.ts` with the wall-clock-bounded
`HANASO_LEGACY_TOKEN_CUTOFF` grace (fail-closed in production when unset;
dev/test unaffected) — covered by 3 new middleware unit tests. The QA server
runs WITHOUT a cutoff → raw values are never re-signed, exactly as S5 now
proves.

### S6 — درخواست بدون Session معتبر به اطلاعات خصوصی دسترسی نداشته باشد ✅ (5/5)
Over HTTP, a cookie-less GET is minted a FRESH identity by the middleware (the
product's honest-empty behavior) and the response contains ONLY that fresh
identity's own empty data — never A's or B's:
- GET `/api/progress` → fresh `userId` (≠A, ≠B), `progress: null`.
- GET `/api/attempts` → lists nothing of others (count 0).
- GET station state → honest empty. Anonymous browser visit → 200 + a
  server-minted SIGNED token.

### S7 — Guest نتواند عملیات Write غیرمجاز انجام دهد ✅ (5/5)
Guest POSTs (no cookie): station enter → 401 · `/api/events` → 401 (the
anonymous ring-spam vector is closed) · `/api/practice` generate → 401 ·
`/api/progress` → 401 (no mint-and-proceed) · `/api/attempts` → 401.

### S8 — Logout/Login باعث باقی ماندن اطلاعات حساب قبلی نشود ✅ (3/3)
No accounts exist yet; the closest equivalent (cookie + storage loss) was
exercised: after clearing, the next visit minted a FRESH identity (≠ old A);
the fresh identity sees NONE of A's old data (`progress: null`). A's old rows
persist untouched in the DB (`lesson_progress` rows = 1) but are unreachable
by the new identity.

### S9 — Session نامعتبر پاسخ مناسب دریافت کند ✅ (3/3)
Invalid session on a WRITE → **401 + the typed Persian envelope**
(`learner/no_identity`, «شناسهٔ زبان‌آموز یافت نشد…»). On a READ the invalid
value is replaced by a fresh identity (never trusted as a key). Pages still
render 200 with the honest empty state.

### S10 — عملیات چندمرحله‌ای در صورت Failure هیچ دادهٔ ناقصی باقی نگذارد ✅ (6/6)
Real HTTP flow: A walked h0+h1 (viewed + task_completed), generated a focused
practice session (14 items, stripped — no key material in the payload),
answered every item, then fired **two concurrent `complete` requests**: one
`recorded` + one `already` — no 500s. Read-only DB verification:
`app.practice_sessions` has the session exactly once; the evidence
(`learning_object_states` seen counters) equals exactly ONE fold
(seenSum=14=items). The rollback machinery itself is proven by the CP-04 PG
suite (5/5, including the forced-failure test).

### S11 — درخواست‌های تکراری و هم‌زمان دادهٔ ناسازگار تولید نکنند ✅ (3/3)
- Concurrent identical machine events → 201/201 with exactly ONE
  `lesson_progress` row for A (no duplicates, no contradiction).
- Concurrent `/api/attempts` submissions → distinct sequential `attemptNos`
  (2,3) — the MAX+1 race is closed (advisory lock + 23505 retry).

### S12 — /poc/practice دیگر Answer Key را افشا نکند ✅ (4/4)
- Direct GET `/poc/practice` → **404** in the production build.
- RSC flight → no key material.
- Real browser navigation → 404, DOM clean, ZERO key-material network events.
- Production check (READ-ONLY, no mutation — the mission's production rule):
  learn.kotodama.ir still serves the pre-24 build (status 200, keys present)
  — exactly as expected; THIS branch closes the leak upon deploy.

## 3. Production safety during QA

All write tests ran exclusively against the local QA server + the isolated
`hanaso_qa` database. Production was touched by exactly ONE read-only GET
(documented in S12). No production data was read beyond static HTML, none was
modified. KOTODAMA / Nginx / HAProxy / BigBlueButton untouched.

## 4. Test layers green at this point

- In-memory suites: **64 files / 751 tests** (748 + 3 new cutoff tests).
- PostgreSQL suite: **8 files / 34 passed + 8 documented skips**.
- Live QA (this doc): **12/12 scenarios, 51/51 checks**.
