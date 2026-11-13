# T3-A — Consolidated VERIFICATION report (technical track, all three classes)

> DEVIATION NOTE (mandated by lead): the mission's 3-subagent budget was spent in
> T1/T2; the lead merged Round T3 into ONE verifier (this file) for infra
> stability after 6 subagent deaths tonight. All three classes (frontend /
> backend-security / architecture) are covered by this single verifier, in the
> lead's priority order. Nothing below is inherited: every verdict cites
> evidence I produced this round (source re-reads, LOCAL probes on the
> standalone build — PORT 3130, in-memory stores, 6 server runs, ~110 requests —
> ONE read-only production GET, and one browser session). Scripts:
> /home/z/my-project/scripts/h23-audit/t3-{verify,verify2,browser,browser3,browser4,f2scan}.mjs
> (outside the worktree). PNGs: t3-journey-360.png, t3-focus-post-answer.png.

## §0 Verdict ledger

| ID | Verdict | One-line evidence (mine) |
| --- | --- | --- |
| T2-B-01 /poc/practice key leak | **VERIFIED-LOCAL-PROBE + VERIFIED-PRODUCTION** | local GET: `correctOptionId`×9 `correctOrder`×2 (30,243 B); prod GET: 200, same counts (32,693 B). Other /poc pages: 0 key hits. |
| T1-B-01 + T2-B ext (progress IDOR chain) | **VERIFIED-LOCAL-PROBE** | 7-req chain, 3 cookie contexts: `201 passed` under `victim-t3a` → 4×201 A→D → `201 status=understood` → third cookie reads `200 understood`; control cookie's own store `null`. |
| T2-C-01 gate quantization | **VERIFIED-SOURCE, count CORRECTED** | bank = **13** (M1×3 M2×3 M3×3 M4×2 M5×2), not 14; any single error ⇒ measure ≤ 2/3 < 0.8 ⇒ remediate; weighted with one error ∈ {0.900, 0.917, 0.933, 0.925, 0.950} ≥ 0.9 ⇒ never binds. Runtime `mastery GET count=13` concurs. C3-B P=1/243 AGREES. |
| T1-B-03 (narrowed) F1 recognition leak | **VERIFIED-LOCAL-PROBE** | F1 leak **10/10** across 10 stations (h1,h2,h3,h7,h8,h9,h10,h11,h12,h14); F2 clean (my initial 2/10 flag was a substring artifact — §1.4); listening 0/8 + recall 0/8 leaks, 0 key material. |
| T2-A-01 focus → body after answer | **VERIFIED-LOCAL-PROBE (browser)** | after «بررسی پاسخ» click: `activeElement === BODY` with feedback visible; radios stay mounted. (Enter on an *unselected* radio only selects it — the drop happens on submission.) |
| T2-C-03 event store in-memory always | **VERIFIED-SOURCE** | `getEventStore()` = unconditional `new InMemoryEventStore()`; the 6 sibling stores all branch on `usingPostgresStores()`. |
| T1-C-10 payloads/keys (positive) | **VERIFIED-LOCAL-PROBE** | journey 79,607 B; stn-h1 33,452 B; largest chunk 229,813 B; registry chunk 183,690 B (== T2-C); 0 key hits on station RSC / /practice / mastery GET / dialogue. |
| T1-B-02 cookie flags | **VERIFIED-LOCAL-PROBE + SOURCE** | wire: `hanaso_lid=…; Path=/; Expires=…; Max-Age=31536000; SameSite=lax` — no Secure, no HttpOnly; middleware.ts:41-46 matches. |
| T1-B-04 attempts unscoped | **VERIFIED-LOCAL-PROBE** | fresh-cookie GET returns victim-t3a's row incl. `scores`; route lists by dialogueId only. |
| T2-B-02 poc-user poisoning | **VERIFIED-LOCAL-PROBE** | anonymous chain: attempt 201 (NULL userId row), 4 pushes, `mastery_passed` 201 `understood`; fresh anonymous GET → `userId=poc-user status=understood`. |
| T2-A-03 2G header-only | **VERIFIED-SOURCE (partial)** | no skeleton/shimmer loading state exists anywhere in the learn path (grep: comments only; shimmer used solely by the aizen-seal ceremony). 2G runtime not re-run (budget). |
| T2-C-04 zero transactions | **VERIFIED-SOURCE** | `\.transaction` = 0 matches over db/, app/, modules/, lib/. |
| T2-C-05 cloze single-select structural | **VERIFIED-SOURCE** | exercise-session.tsx:703-710 every `null` token renders the SAME `selected` label; :541-543 grades ONE `{kind:'option', optionId: selected}` per item. |
| T1-A-01 (narrowed) tap targets | **VERIFIED-LOCAL-PROBE** | «معرفی فصل» anchor **107×32** (<44, secondary); primary controls ≥44: journey row chip 324×90, «شروع یادگیری» 328×73, exercise radio 286×79. Practice-hub chip not re-measured (§1.8). |
| T1-A-02 (T2-A's refutation) | **VERIFIED-LOCAL-PROBE (side-check)** | radios stay mounted post-answer with readable `aria-checked`; the "null" was activeElement=BODY (see T2-A-01). |

Refuted / corrected claims found during verification: **1** — T2-B §POSITIVE P2's
"401 `learner/no_identity` reproduced on every state-changing action incl.
grade" is **not wire-reachable** (§3.2). One count correction (T2-C-01: 13-item
bank, not 14). One measurement-artifact resolved in T1-B-03's favor (§1.4).

## §1 Detailed evidence (priority order)

### 1.1 T2-B-01 — /poc/practice ships the stage-C answer key (local + production)

- LOCAL (PORT 3130): `GET /poc/practice` → 200, 30,243 bytes, payload contains
  `correctOptionId` ×9 and `correctOrder` ×2 (`acceptedChipOrder` ×0,
  `revealFa` ×0). Excerpt shape: `"correctOptionId":"chr-yamada"` inside the
  RSC flight payload for the `PracticeRunner` island.
- PRODUCTION (exactly ONE read-only GET, no side effects):
  `curl https://learn.kotodama.ir/poc/practice` → **HTTP 200, 32,693 bytes,
  `correctOptionId` ×9, `correctOrder` ×2**. Live on production confirmed.
  (T2-B's "identical payload size 30243" is imprecise — counts identical,
  bytes differ by ~2.4 KB; irrelevant to the verdict.)
- /poc census (local): `/poc/assessment` (27,788 B), `/poc/dialogue` (43,101 B),
  `/poc/lesson` (58,688 B), `/poc/t2-eval` (15,800 B), `/poc/ui` (37,415 B) —
  **all 0 key hits**; `/poc` root → 404. The leak is /poc/practice ONLY.
- Source re-read: `app/poc/practice/page.tsx:15` calls
  `generateExercises(dialogue, characters)` and passes the raw array to the
  client island at :34-42 — no `toClientItem`/`toClientExercise` projection.
  Verdict: **CONFIRMED at both tiers** (Medium, live).

### 1.2 T1-B-01 + T2-B extension — cross-user takeover chain on /api/progress

Three distinct cookie contexts (A = attacker, B = control, C = third reader;
each minted via a first GET). Victim id: `victim-t3a`. Assessment answers
re-derived by me from `lib/poc/assessment-bank.ts` `correctOptionId`s
(b, b, a, b, a — source-verified this round, not copied from T2-B).

| # | Request (cookie → target) | Result |
| --- | --- | --- |
| R1 | A POST /api/attempts `{userId:'victim-t3a', answers}` | **201**, `scoring.outcome=passed`, `attempt.userId='victim-t3a'` (A's cookie ignored for identity) |
| R2a-d | A POST /api/progress `{userId:'victim-t3a', event:unit_started…}` ×4 | **201/201/201/201**, stages `A_selfcheck → B_lesson → C_practice → D_mastery` |
| R3 | A POST /api/progress `mastery_passed` | **201**, `status='understood'` |
| R4 | C GET `/api/progress?dialogueId=…&userId=victim-t3a` | **200**, reads `status='understood'` — any third context reads the victim's record |
| R5 | B GET `/api/progress?dialogueId=…` (B's own, no userId) | 200, `progress=null` — control: the writes went to the body's userId, not the cookie |

Also: attempts listing (T1-B-04) — a FRESH fourth cookie GET
`/api/attempts?dialogueId=dlg-cafe-morning-01` → 200 with the victim's row
including `scores` — unscoped cross-user read confirmed.
**Verdict: CONFIRMED (High) — full takeover chain reproduced; mastery gate
satisfied by an attacker-created attempt under a victim string id.**

### 1.3 T2-C-01 — kana gate quantizes to perfect; weighted 0.9 dead-letter

Re-derived from source, independently of T2-C and C3-B:
- Bank (grep `assessmentRole: 'mastery_M*'` in chapter-kana01.exercises.ts, all
  occurrences listed): M1×3 (lines 5682,5705,5728), M3×3 (5752,5776,5800),
  M4×2 (5823,5850), M2×3 (9638,9660,9682), M5×2 (9704,9726) = **13 items**.
  Runtime cross-check: `GET /api/curriculum/mastery?chapter=kana-foundation-01`
  → `count=13`. **T2-C-01's "14 items (M1×4)" is a count error; the lead's
  13-item figure is correct.**
- Gate (levels.ts:35): `weighted: 0.9, minMeasure: 0.8`; chapter weights
  (chapter-kana01.ts:106) M1..M5 = 0.3/0.25/0.2/0.15/0.1.
- scoring.ts:67-73: `passed = weighted >= 0.9 && weakMeasures.length === 0`.
- Any single error: worst per-measure ratio = 2/3 = 0.667 (3-item measures) or
  1/2 = 0.5 (2-item) — both < 0.8 ⇒ `weakMeasures` non-empty ⇒ `remediate`.
  **"Any single error ⇒ remediate" CONFIRMED** (stronger than T2-C's 3/4=0.75
  version — with M1×3 even the largest bank can't absorb one miss).
- Weighted with exactly one error (others correct): M1 err → 0.3·⅔+0.7 =
  **0.900**; M2 → 0.917; M3 → 0.933; M4 → 0.925; M5 → 0.950. All ≥ 0.9 ⇒ the
  weighted threshold is NEVER the binding constraint with ≤1 error.
  **Dead-letter CONFIRMED** (M1 case sits exactly at 0.900 ≥ 0.9 — the AND
  with minMeasure is what fails it, never the weighted arm).
- Cross-check C3-B (P=1/243): the 5 listening gate items are exactly M2∪M5 —
  I verified all 5 ids (`ex-kana-gate-m2-1..3`, `m5-1..2`) carry
  `type: 'kana-listening'` and 15 option labels total = 3 options each ⇒
  P(blind pass) = 3⁻⁵ = **1/243 ≈ 0.41%**. Two independent derivations agree
  with my 13-item count (M2×3 + M5×2) and with each other: the gate demands
  perfection on M2/M5 listening.
**Verdict: VERIFIED with corrected bank count (13, not 14). High severity
stands (3 remediation loops then terminal-ish `remediate` on one miss).**

### 1.4 T1-B-03 (narrowed) — F1 feedback leak, recognition only

- Recognition: 10 items, one per station, 10 DISTINCT stations
  (stn-kana-h1/h2/h3/h7/h8/h9/h10/h11/h12/h14), wrong answer, attempt 1:
  **F1 leak 10/10**. Verbatim (h1): `«あ» صدای «آ» دارد — یک بار دیگر به شکلش
  نگاه کن.` where «آ» IS the correct option label.
- F2 (attempt 2): my automated substring check first reported 2/10 "leaks"
  (h7 «ن», h14 «یا»). Manual inspection of the full texts shows both are
  **substring artifacts**: «ن» ⊂ «مقایسه کن» and «یا» ⊂ «یادسپارش» in the
  fixed F2 sentence `به شکل ん و یادسپارش برگرد؛ با جفت اشتباه‌پذیرش مقایسه کن.`
  The F2 ladder mentions only the GLYPH (already the visible prompt), never the
  reading. **F2 clean — T1-B-03's original "F2 leaks nothing" STANDS.**
- Listening (4 items × attempts 1-2 = 8 samples): 0 label leaks, 0 key material
  (`correctReading`/`correctAudio`/`reveal` never pre-reveal). Recall: same,
  0/8. **The recognition-only narrowing is CONFIRMED.**

### 1.5 T2-A-01 — focus dropped to `<body>` after answer

Browser (chromium, 360×740 touch, station stn-kana-h4 driven to its listening
exercise, 3 radios): radio click → «بررسی پاسخ» click → at +900 ms
`document.activeElement === document.body` (`{active:"BODY:", body:true}`) with
the feedback region rendered («نادرست — این صدای کانای دیگری بود…») and the
radios still mounted (`["true","false","false"]`). Screenshot:
t3-focus-post-answer.png. Methodological note: pressing Enter on an UNSELECTED
radio only selects it (focus correctly stays on the radio) — the focus drop
occurs on actual submission, which is why a naive Enter probe can miss it.
**Verdict: CONFIRMED (Medium).**

### 1.6 T2-C-03 — event store in-memory in production too

`lib/poc/stores.ts`: `getEventStore()` returns an unconditional
`InMemoryEventStore` singleton — the ONLY store without a
`usingPostgresStores()` branch (attempts, progress, station, chapter,
practice-session, learning-object all swap to Pg* repos). Restarts therefore
lose the entire event ring (capacity 1000): `fsrs_cards_enrolled`,
`remediation_triggered`, `chapter_completed`, `gate_measure_completed`,
`exercise_answered`, `station_completed` (my probes recorded these names live).
Meanwhile progress/attempt/LO rows persist — the fsrs integration.ts
"replay enrollments from the event log" promise is structurally void after any
restart. (My anonymous/minted-identity probes visibly wrote
`station_completed`/`unit_checkpoint_completed` events — the volatile trail is
real traffic, not hypothetical.) **Verdict: CONFIRMED (Medium).**

### 1.7 T1-C positives re-measured (payloads, chunks, keys)

Fresh local measurements (HTTP 200, identity encoding, cookie'd):
`/learn/kana-foundation-01/journey` **79,607 B**; `stn-kana-h1` **33,452 B**;
`stn-kana-m1-reading` 24,416 B; `/learn/first-meeting-01/journey` 23,946 B;
`/api/curriculum/journey?chapter=kana-foundation-01` 18,667 B — same lean
magnitude as T1-C-10 (84,283/35,434/25,995/24,718/21,858; delta = headers/
build drift, no material discrepancy). Chunks: largest
`1ucmtbcruvo27.js` **229,813 B** (T1-C said 228 KB ✓); kana registry
`2iop210mmmbv8.js` **183,690 B** (== T2-C's exact number ✓); chunks dir total
1,608,541 B. Key-stripping on learn surfaces: station RSC, /practice, mastery
GET (count=13), dialogue bundle — `correctOptionId|correctOrder|
acceptedChipOrder|revealFa` = **0 hits everywhere** (only /poc/practice leaks,
§1.1). **Verdict: T1-C-10 VERIFIED (positive-leaning, caveat unchanged).**

### 1.8 Spot-verifies (source / quick probes)

- **T1-B-02**: wire `Set-Cookie: hanaso_lid=f440163f-…; Path=/; Expires=Sat,
  13 Nov 2027…; Max-Age=31536000; SameSite=lax` — **no Secure, no HttpOnly**
  (both flags absent); middleware.ts:41-46 sets exactly these attributes
  (`httpOnly:false` is a documented deliberate client-mirror choice; `secure`
  is simply missing). CONFIRMED (Medium).
- **T1-B-04**: covered in §1.2 (fresh cookie lists victim rows + scores).
  CONFIRMED.
- **T2-B-02**: anonymous (NO cookie at all) chain: attempts POST → 201 with
  `attempt.userId=undefined` (NULL row — matches T2-B-03's PG NULL-user
  observation), 4 progress pushes → `D_mastery`, `mastery_passed` → 201
  `understood`, then a FRESH anonymous GET returns `userId=poc-user,
  status=understood` — the shared store is poisoned and visible to every
  cookie-less client. CONFIRMED (Medium).
- **T2-A-03**: source-level — `rg skeleton|shimmer` over the learn path finds
  only comments (station-runner.tsx:472 "no skeleton flash" is about block
  transitions) and the aizen-seal ceremony shimmer; NO loading skeleton exists
  for station data. Consistent with T2-A's 2G observation. VERIFIED-SOURCE
  (runtime 2G not re-run this round — T2-A PNGs stand unrebutted).
- **T2-C-04**: `\.transaction` → 0 matches across db/, app/, modules/, lib/.
  CONFIRMED (the practice-complete read→fold→upsert loop and mastery
  create+upsert remain non-atomic).
- **T2-C-05**: exercise-session.tsx:703-710 — every `null` cloze token renders
  `{selected ? labelFor(ex, selected) : '؟'}` (one selection shared across ALL
  blanks); :541-543 — the whole item grades as ONE `{kind:'option',
  optionId:selected}`. Structural single-select CONFIRMED.
- **T1-A-01 narrowed**: 360×740 touch, local build — journey «معرفی فصل»
  anchor **107×32** (<44, secondary control, matches T1-A exactly);
  primary controls all comfortably ≥44: journey row chip «ردیف あ» 324×90,
  «شروع یادگیری» CTA 328×73, exercise radio 286×79 (t3-journey-360.png).
  The /practice hub chip (46×25) could NOT be re-measured: with a fresh learner
  and even after completing stn-kana-h0 via API, the hub renders no row chips
  (focused practice needs kana-content stations completed) — T2-A's PNG stands
  unrebutted. **Narrowing CONFIRMED on all controls I could measure.**

## §2 New findings (stumbled upon only)

### T3-01 — Every cookie-less POST mints a fresh learner identity; the GUEST 401 guard is dead code over HTTP, and state-changing routes grow PG rows unauthenticated  [SEVERITY: Medium] [STATUS: CONFIRMED (mechanism) / IMPACT inferred for PG]
- Location: apps/web/src/middleware.ts:33-47 (mint on every invalid/absent
  `hanaso_lid`, matcher covers /api/*); app/api/curriculum/station/route.ts:157-173
  (GUEST 401 — unreachable because the middleware already minted); lib/poc/stores.ts
  (PG repos active when DATABASE_URL set — production per ground truth).
- Actual (my probes, PORT 3130): no-cookie POST `grade` → **200**, event
  recorded under a FRESH minted UUID (`exercise_answered:1a01d2a9-…`, not
  `guest`, not `poc-user`); cookie `hanaso_lid=guest` (invalid shape) → also
  200 (middleware replaces it); no-cookie `complete stn-kana-h0` → **200**,
  and a second identical request → 200 under a DIFFERENT minted UUID
  (`7ba86493` vs `716f9df0`, both writing `station_completed`). No-cookie
  practice generate → 409 `practice/mixed_locked` (business logic, not 401).
- Consequences: (a) the documented 401 `learner/no_identity` hardening can
  never fire over HTTP (defense-in-depth for direct handler calls only) —
  this CORRECTS T1-B-P2's framing and REFUTES T2-B P2's "401 reproduced on
  every state-changing action incl. grade"; (b) the shared-store contamination
  protection still works (writes land under fresh per-request ids — verified),
  BUT a cookie-less client (curl loop, broken cookie jar) creates a NEW
  learner row per request on PG-backed write paths (station_progress,
  chapter_progress, attempt counts) — an unauthenticated, unbounded row-growth
  vector adjacent to T2-B-03/T2-B-06, through the *station* route which was
  believed hardened.
- Suggested fix: mint only for navigation/document requests (or persist mints
  server-side per IP+UA with a cap); make /api/* cookie-less requests 401
  instead of minting; rate-limit per IP.
- Regression test: two cookie-less POST /api/curriculum/station completes must
  not create two distinct learner rows.

No other new findings; two planned re-verifications produced corrections
instead (T2-C-01 count, T2-B P2 401 claim — both above).

## §3 Positive validation (5 strongest, one probe/read each)

1. **Answer-key stripping on learn surfaces — HOLDS** (probe): 0
   `correctOptionId|correctOrder|acceptedChipOrder|revealFa` hits in station
   RSC (stn-kana-h1), /practice HTML, mastery GET bank (count=13), dialogue
   bundle (7,415 B). The single bypass in the product is /poc/practice (§1.1);
   every learn surface I fetched is clean.
2. **No shared-account contamination from cookie-less clients — HOLDS, with
   corrected mechanism** (probe): no-cookie writes land under a fresh minted
   per-browser UUID (event `user_id` = mint, ≠ `poc-user` ≠ `guest`), exactly
   as TASK-HANASO-20 intended. CAVEAT: the 401 `learner/no_identity` branch
   never fires over HTTP (§2 T3-01) — the protection is the middleware mint,
   not the 401. The 401 remains as untested-in-prod defense-in-depth.
3. **Completion single-flight / idempotence — HOLDS** (probe + source):
   sequential `complete stn-kana-h0` #1 → 200, #2 → 200 with `already:true`
   (no duplicate write); client `completingRef` guard present at
   station-runner.tsx:695-699, server `already` path at station route:417-419.
4. **Additive-only migrations — HOLDS** (source): db/migrations 0000–0004
   (5 files); `DROP|TRUNCATE|DELETE FROM` matches are COMMENTS only ("No
   drops, no rewrites, idempotent", "no data loss, no drops — SKL-006");
   statements are CREATE TABLE/INDEX (0000: 21, 0001: 14, 0003: 1 ADD COLUMN)
   and one documented int→real cast (0002).
5. **No external requests — HOLDS** (probe): grep of all 31 client chunks
   (.next/static/chunks) for `fonts.googleapis|fonts.gstatic|unpkg.com|
   jsdelivr|cdnjs|googleapis.com` → **0 hits**; fonts ship self-hosted.
   (Runtime corroboration from T2-A's flows — external requests [] — stands.)

## §4 Coverage

- **Source re-read this round**: api/progress/route.ts (full), api/attempts/
  route.ts (full), modules/progress/types.ts (schemas), modules/mastery/
  types.ts (submission schema), levels.ts (gates L1/L2), mastery/scoring.ts
  (pass rule), chapter-kana01.ts (weights), chapter-kana01.exercises.ts
  (mastery-bank ids/types/options via targeted extraction), lib/poc/
  assessment-bank.ts (full — answer key re-derived), lib/poc/stores.ts (store
  selection), middleware.ts (full), lib/learner/{server,identity}.ts
  (resolution), app/poc/practice/page.tsx (full), exercise-session.tsx
  (cloze render + check), api/curriculum/{station,mastery}/route.ts (identity
  gate + bank build), db/migrations/*.sql (5 files).
- **Local probes**: 6 standalone-server runs on :3130, ~110 requests — /poc
  census (7 pages), takeover chain (7 req, 3 contexts + control), attempts
  listing, anonymous poc-user chain (7 req), recognition/listening/recall
  feedback sampling (10+8+8 grades + F2 re-sweep 20 grades), learn-surface key
  scans (4 surfaces), payload measurements (5 URLs), Set-Cookie capture,
  guest-identity mechanics (4 req), completion idempotence (2 req).
- **Browser**: 1 chromium session, 360×740 touch — journey tap targets,
  station h4 exercise drive (radio submit focus probe ×3 iterations),
  screenshots ×2.
- **Production**: exactly ONE read-only GET (/poc/practice). No mutations, no
  other users' data, no loops.
- **Not re-verified this round (budget)**: CDP 2G runtime behavior (T2-A-03
  source-verified only), /practice hub chip tap size (unreachable state),
  T1-B-05..10 / T2-B-03..06 / T2-C-02/06/07/08/09 (accepted from T2 rounds'
  own probe evidence; no contradicting signal seen), PG-backed runtime
  behavior (in-memory local, per method §5).
- **Consistency with ground truth**: repo matches AUDIT_CONTEXT §2; local
  standalone build behaves as documented. No conflicts beyond the two
  corrections reported (T2-C-01 count; T2-B P2 401 claim).
