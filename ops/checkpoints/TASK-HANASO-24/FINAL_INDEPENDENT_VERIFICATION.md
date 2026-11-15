# TASK-HANASO-24 — FINAL INDEPENDENT VERIFICATION (CP-07)

> The mission's acceptance gate: three independent subagents audited, all
> confirmed findings were remediated, all tests re-run, and the SAME three
> subagents then performed the final verification round against the remediated
> commit. **All three domains returned `DOMAIN VERDICT: PASS`.**

## 1. Process (mission §6, followed exactly)

| Step | What happened |
| --- | --- |
| Round 1 (CP-06) | Exactly 3 subagents in parallel (A/B/C), each reading code+Git independently, running real tests and live probes — explicitly forbidden to merely confirm the lead's reports. They returned **independent findings: 3 High + 1 critical-context + 10 Medium + 15 Low** — none of them mere confirmations. |
| Remediation (CP-07a, commit 14d9d3a) | Every confirmed in-scope finding fixed; deferrals recorded with rationale. Suites re-run: 755 in-memory + 35 PG green; live QA re-run: 12/12. |
| Round 2 (final verification) | The SAME three subagents (resumed with full context) verified each fix from source + live probes on their own servers/DBs, hunted for regressions introduced by the fixes, and issued domain verdicts. |

## 2. Round-1 findings → round-2 verdicts (per subagent)

### Subagent A — Authentication & IDOR → **DOMAIN VERDICT: PASS**
| Finding | Round-2 verdict |
| --- | --- |
| A-01 [High] missing session-secret gate | **FIXED** — throw proven by direct execution; deploy gate A3 requires both keys; compose `env_file` passes them; a no-secret instance fails `/api/health` → the docker healthcheck/deploy gate fails closed. |
| A-02 [Med] decode 500s | **FIXED** — `%`, `abc%2`, `%25`, `%E0%A4%A`, `x%zz` all → 401 live; zero URIErrors in logs. |
| A-03 [Med] duplicate-cookie disagreement | **FIXED** — matchAll last-wins; live-probed both orders; the round-1 account-re-key PoC is defeated; unit test covers 3 orders. |
| A-04 [Med] unbounded event props | **FIXED** — 2MB → 400, 17 keys → 400 live. |
| A-05/A-06 (events exposure, ops wiring) | **FIXED** — identity + caller-scoped GET (A's events invisible to B, live); user_id stamped server-side (un-poisonable), stripped from output. |
| A-07/A-08 [Low] | Deferred — no write path under guest; zero route callers of dormant `list()`. |
| A-09 (test gaps) | **FIXED** (core cases). |
| New (all Low/info) | A-10 throw is first-use not boot-time (healthcheck + deploy gate make it unshippable anyway — accepted); A-11 route-level vs HTTP-level GET semantics (no disclosure — accepted); A-12 display nuance. |
| Original five fixes | Re-verified live on 14d9d3a: all hold. |

### Subagent B — API & Data Exposure → **DOMAIN VERDICT: PASS**
| Finding | Round-2 verdict |
| --- | --- |
| B-06 [Med] attempts key harvest | **FIXED** — type + grading + client form + absence test updated; live two-garbage-run probe: zero `correctOptionId` anywhere in the response (perQuestion/attempt/weakPoints/scoring). |
| B-05 [Med] events exposure | **FIXED** — caller scoping live-verified (A's marker invisible to B); 2MB/17-keys → 400; injected `user_id` overwritten + stripped. |
| B-02 (BUG-031) | **DEFERRED-OK** — docs now honest; live: `character` still present as agreed (deferred by product decision); nothing NEW leaks. |
| B-03 (BUG-001) / B-04 (BUG-029) | **DEFERRED-OK** — carried explicitly as content-track items (must survive into RELEASE_CANDIDATE; see §4). |
| B-11 (test gaps) | **PARTIALLY, acceptable** — the QA harness covers RSC flight + Chromium network scans; B independently re-ran all 12 scenarios: **12/12, 51/51 PASS**. |
| B-01 [Critical context] | **DEFERRED-OK (deploy = the blocker)** — no deploy commits exist; production re-confirmed still serving the pre-24 build; the deploy gate now requires both session env keys. |
| New (all Low/info) | B-13 residual 2-3-submission key reconstruction on the legacy PoC bank (bounded, not the chapter gate); B-14 route-level GET semantics. |
| Spot-checks | All 6 /poc pages + /poc root 404×7; 8 learn RSC flights clean (13 patterns); attempts/practice responses key-free; suites 755 + 35/8 match. |

### Subagent C — Database & Transaction → **DOMAIN VERDICT: PASS**
| Finding | Round-2 verdict |
| --- | --- |
| C-01 [High] in-flight leak / answered-after-complete | **FIXED** — `deleteInFlight` on the singleton after commit + sweep on every generate (verified in source AND compiled standalone chunks). Live: answer-after-complete → 404 (was 200); sequential replay → 404 (was 200 recorded+already); 200× generate spam all OK, DB consistent. |
| C-02 [Med] in-tx 25P02 → 500 | **FIXED** — `isRetryableTxError` (23505|25P02) in both service loops; deterministic experiment through the REAL service (hook after MAX select, /tmp copy): the race resolves with a whole-unit retry — attempt inserted, chapter `understood`, no unhandled 500. |
| C-03 [Med] PROD replay untested | **FIXED** — new PG test covers the 200-'already' service path; route-level replay live-probed 404. |
| C-04 [Low] attemptCount RMW | **PARTIALLY (acceptably bounded)** — fresh in-tx read discards the stale pre-tx value; a sub-ms READ COMMITTED window vs `incrementAttempts` remains (no FOR UPDATE); display-only counter. |
| C-05 [Low] nesting guard | **FIXED** — nested throws, concurrent units all succeed (experiment; now also an automated PG test). |
| C-07/C-08 [Low] | **FIXED** — predicate wired; doc counts/caveats accurate. |
| New (all Low/info) | C-10 nesting test now added (the reported message "typo" turned out to be a shared display artifact — the source string was correct; verified byte-level); C-11 sweep piggybacks on generate only (bounded, documented); C-12 cross-domain changes reviewed — no DB-integrity regression. |
| Original guarantees | PG suite re-run: 38 passed + 8 skips; in-memory 755; zero schema/migration changes. |

## 3. The mission's final success criteria — status

| Criterion | Status |
| --- | --- |
| هیچ کاربری نتواند Progress/Attempts دیگری را بخواند/تغییر دهد | ✅ proven live (S1-S4) + source (A) + unit suites |
| Guest نتواند هویت جعل کند یا اطلاعات خصوصی ببیند | ✅ live (S5-S7); forged raw/tampered/garbage never become identities |
| Cookie و Session رفتار امن و پایدار | ✅ signed tokens, httpOnly+Secure+Lax, fail-closed secret & cutoff, LAST-wins duplicates |
| Answer Key از Payload عمومی قابل‌استخراج نباشد | ✅ /poc 404 in production builds; RSC/DOM/network/bundles clean; perQuestion key removed |
| عملیات چندمرحله‌ای Database یکپارچگی | ✅ transactions + idempotency + advisory locks; live + experiment-verified |
| تست‌های امنیتی و داده‌ای موفق | ✅ 755 in-memory + 38 PG + live QA 12/12 (51/51) — none removed or weakened |
| تأیید هر سه ساب‌ایجنت با شواهد | ✅ three `DOMAIN VERDICT: PASS` (round 2, commit 14d9d3a) |
| Push همهٔ Checkpointها | ✅ every CP pushed to `fix/TASK-HANASO-24-security` (SHAs in CHECKPOINT_LOG.md) |

## 4. Deferred register (explicit — must survive into RELEASE_CANDIDATE.md)

| Item | Owner | Why deferred |
| --- | --- | --- |
| B-01: production still serves the pre-24 build (leak live until deploy) | deploy phase | Deployment is out of this mission by explicit instruction; the deploy gate now requires the session env keys. |
| B-03 = audit BUG-001 (mastery gate: 5 kana-listening items with NO promptAudio; honest-listener P(pass)=1/243; ch2 locked) | content track | Content/pedagogy fix (rebank + audio attach) — explicitly out of this mission's scope; the ONE Critical of the H23 register. |
| B-04 = audit BUG-029 (f1Fa feedback text embeds the correct reading at first miss) | content track | ~60 authored strings; content rewrite. |
| B-02 behavior = audit BUG-031 (write items: client-trusted `accepted`, `character` crosses for the local engine) | product decision | Server-side stroke grading is a feature change; evidence-only (never gates, never FSRS). Docs now state the trade honestly. |
| Rate limiting beyond the events-props bound (unbounded `generate` etc.) | infra follow-up | Needs product budgets; the sweep + in-flight fixes bound the damage. |
| A-10 (eager boot-time assert via instrumentation.ts), B-13, C-04 FOR UPDATE, in-repo automated RSC-flight tests | polish | All Low; healthcheck/deploy gate covers A-10's risk. |

## 5. Evidence index

- Subagent reports with round-2 sections: `SUBAGENT_REVIEW_{A,B,C}.md`.
- Live QA: `SECURITY_TEST_RESULTS.md` + `qa-evidence/security_qa_results.json`
  (12/12 scenarios; B independently re-ran 12/12 on its own instance).
- Suites at this point: TypeScript + ESLint clean · in-memory 64 files / 755 ·
  PG 9 files / 38 passed + 8 documented skips.
