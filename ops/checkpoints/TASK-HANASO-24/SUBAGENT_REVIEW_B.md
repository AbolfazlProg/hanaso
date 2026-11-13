# SUBAGENT B — API & Data Exposure Audit (TASK-HANASO-24)

Auditor: Subagent B (independent). Scope: every byte that crosses to the client — answer-key
exposure, RSC flight payloads, JS bundles, client islands, /api/events, error envelopes, cache
posture, live verification, test quality. All claims below verified from source AND live probes
unless marked otherwise. Local live verification: standalone production build (BUILD_ID
jPEBAIORXftNfnu2jrFk9, verified byte-identical to tree tip 4216426 — 0 src files newer than the
build) on 127.0.0.1:3132 with dedicated DB `hanaso_qa_b` (PG 18.4 @54329). Production
(learn.kotodama.ir) touched with exactly ONE read-only GET.

---

## FINDINGS

### B-01 — Production still serves /poc/practice with the full answer key (pre-fix build) [SEVERITY: Critical] [STATUS: CONFIRMED]
- Location: production deployment (runs 3d8b8cc); fixed by `src/lib/poc/page-guard.ts:21-25` + all six `src/app/poc/*/page.tsx`.
- Evidence: ONE read-only GET `https://learn.kotodama.ir/poc/practice` → **HTTP 200, 32,693 bytes**. Inline RSC flight
  payload contains **9× `correctOptionId`** (e.g. `"correctOptionId":"chr-yamada"`, `"correctOptionId":"s-cafe-morning-01-l4"`)
  and **2× `correctOrder`** — the complete exercise answer key, no authentication required. On the branch's production
  build (my port 3132): all six /poc pages (`practice`, `assessment`, `lesson`, `dialogue`, `ui`, `t2-eval`) + `/poc`
  itself return **404**; browser (Chromium) confirms 404 page, DOM contains no key identifiers; RSC flight of the 404
  page greps clean for 13 key-field patterns.
- Impact: any visitor of the production site can read the dialogue-exercise key today. The branch fix is verified
  effective — but it is NOT deployed.
- Suggested fix: deploy the branch (release blocker until then); record "production /poc/practice = 200 + key on wire
  (pre-fix build)" in the release notes.

### B-02 — Practice write items ship the target glyph pre-answer; grading is client-trusted [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `src/modules/practice/session.ts:99-110` (`toClientItem` keeps `character` for `write` items) vs the same
  file's type docs lines 58-63 which label `character` "SERVER-ONLY: the target glyph"; `src/app/api/practice/route.ts:247-250`
  (server trusts `answer:{kind:'write',accepted}`); `src/components/practice/practice-hub.tsx:550-587` (WriteItem judges locally).
- Evidence: live generate (focused, stn-kana-h1) → item `k6-hira-e`: prompt = audio + «به صدا گوش بده و "e" را از حافظه
  بنویس» while `"character":"え"` is in the same JSON. The UI hides it (canvas free-mode reveal only after completion,
  writing-canvas.tsx:600), but the value is on the wire and in the JS heap before answering. Server records `accepted`
  from the client verbatim (a forged `{accepted:true}` folds perfect K6 evidence).
- Impact: K6 "write from memory" items are spoiler-readable via devtools/network; practice evidence for write items is
  client-fabricable. No impact on choice-item keys (verified stripped).
- Suggested fix: at minimum fix the contradictory "SERVER-ONLY" doc label; medium-term, move stroke judging server-side
  (send stroke summary, not `accepted`), or accept + document the trade-off explicitly (lesson parity argument exists).

### B-03 — Mastery gate listening questions (kana chapter M2/M5) ship with NO audio — unanswerable [SEVERITY: High] [STATUS: CONFIRMED]
- Location: `src/app/learn/[chapter]/assessment/page.tsx:40-42` (bank mapped via `toClientExercise` — never attaches
  `promptAudio`); `src/app/api/curriculum/mastery/route.ts:228-232` (GET bank — same); contrast: the STATION page attaches
  kana audio at `src/app/learn/[chapter]/journey/[station]/page.tsx:114-125`. Items: `ex-kana-gate-m2-1..3`,
  `ex-kana-gate-m5-1..2` (`chapter-kana01.exercises.ts:9620-9726`, type `kana-listening`).
- Evidence: live bank GET → 13 items; the 5 `kana-listening` items have `promptAudio:null`, `promptJa:null`, no
  `audioLineRef`. Chromium walk of the gate: q9-q13 prompt «به صدای پخش‌شده گوش کن…» render **0 `<audio>` elements, 0 play
  buttons, 0 /audio/* network requests** across the whole walk. Same browser on station stn-kana-h1 fires
  `/audio/kana/kn-hira-*.opus` normally. (Also: gate intro copy says «ده پرسش» but serves 13.)
- Impact: 5/13 gate questions measure guessing, not listening — M2/M5 gate measures are noise; a learner can fail the
  chapter gate they actually understood (or pass it deaf). Assessment-integrity defect on the live learn surface; the
  lead's reports do not mention it.
- Suggested fix: attach `promptAudio = kanaAudioUrls('kn-'+targetConcept)` for `kana-listening` in the assessment page and
  the mastery GET bank (or better: move that attach INTO `toClientExercise` — see B-07). Add an EQA gate: every
  `kana-listening`/`rule-listening` item must have a servable audio binding on every surface that serves it.

### B-04 — BUG-029 un-remediated: F1 feedback on kana-recognition items states the correct reading at the FIRST miss [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `src/modules/curriculum/grading.ts:75-76` (level 1 → `feedbackFa = ex.feedback.f1Fa`); authored content e.g.
  `chapter-kana01.exercises.ts:32` `f1Fa:'«あ» صدای «آ» دارد — یک بار دیگر به شکلش نگاه کن.'`.
- Evidence: live probe: wrong answer attempt 1 on `ex-kana-h1-rec-hira-a` →
  `{"correct":false,"level":1,"feedbackFa":"«あ» صدای «آ» دارد — یک بار دیگر به شکلش نگاه کن."}` — the correct reading is
  IN the first-miss feedback. The route's own withholding works (no `reveal`, no `correctAudio`, no `correctReading` at
  F1/F2 — verified in source + response), and no pre-answer payload carries f1Fa (`toClientExercise` strips `feedback`;
  verified in flight payloads). So this is a **post-first-miss spoiler only**; first-try scoring and gate scoring (no
  per-answer ladder at the gate) are unaffected.
- Impact: station practice ladder collapses: miss once → read the answer → answer correctly. Pedagogical integrity issue,
  not a wire-exposure issue.
- Suggested fix: content remediation — f1Fa for recognition items must not name the reading (mirror the recall items'
  style, e.g. `chapter-kana01.exercises.ts:160`); add a content test that f1Fa of recognition items excludes the correct
  option's label tokens.

### B-05 — /api/events GET is fully unauthenticated and shows the shared ring; POST props are unbounded [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `src/app/api/events/route.ts:57-68` (GET has NO identity resolution — only `user_id` is stripped from props);
  POST (lines 32-55) is identity-gated; `src/lib/poc/event-store.ts:9-13` (`props: z.record(z.string(), z.unknown())` —
  no key/size limits; ring = 1000 events in RAM).
- Evidence: anonymous `curl` (no cookie) GET /api/events → **200** with the full ring (name/props/at of every learner's
  events, incl. `station_completed` `score` values of other learners). Authenticated POST
  `{"name":"probe_injected","props":{"user_id":"FAKE-123","note":"subB-probe"}}` → recorded; GET shows it to everyone
  (the injected `user_id` is stripped by the GET projection). Natural `user_id` strip verified on real ring data
  (0 occurrences). Score values of other learners remain visible anonymously.
- Impact: (a) anonymous observability into learner activity patterns (chapter/station ids, scores); (b) any signed
  identity can inject arbitrary-props events (spam/content into a surface every learner can read; no size bound →
  memory abuse up to 1000 × payload).
- Suggested fix: require identity on GET too (401 like every other route), or gate the ring behind an operator role;
  bound `props` (key count + string lengths) in `pocEventSchema`; drop `score` from server-emitted props or accept
  explicitly.

### B-06 — /api/attempts perQuestion discloses the key of a FIXED bank with unlimited retakes [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: `src/lib/poc/assessment-bank.ts:39-114` (hardcoded 5-question bank), `:120-136` (perQuestion includes
  `correctOptionId`), `src/app/api/attempts/route.ts:86-105` (all-must-be-answered enforced — good; then perQuestion
  returned), `src/modules/mastery/repository.ts:30` (attemptNo = count+1, no cap).
- Evidence: partial submission → 400 `attempts/incomplete` (no key). Full submission → 201 with all 5 `correctOptionId`s.
  Immediate second submission with the harvested key → 201, `attemptNo:2`, `outcome:"passed"`. The API is live in the
  production build (only the /poc UI is 404; /api/attempts is not guarded by the poc page guard).
- Impact: "legitimate post-submission feedback" (lead's claim) is true for a one-shot assessment, but the bank never
  rotates and retakes are unlimited → harvest-then-pass. Today this only feeds PoC-era dialogue progress
  (mastery_passed → /api/progress D-stage), not the chapter gate (that path — /api/curriculum/mastery — returns only
  `wrongByMeasure`, never the key: verified).
- Suggested fix: rotate/item-sample the bank per attempt, or omit `correctOptionId` from perQuestion on non-final
  attempts, or cap attempts per dialogue per learner.

### B-07 — rule-listening answer-word stripping lives only in the station page — latent leak in the gate surfaces [SEVERITY: Low] [STATUS: CONFIRMED (code path; no current mastery_ rule-listening item)]
- Location: strip done ad hoc at `src/app/learn/[chapter]/journey/[station]/page.tsx:117-125` (`ce.promptJa=undefined;
  ce.promptJaReading=undefined` for `rule-listening`); `toClientExercise` (`grading.ts:344-359`) is type-agnostic and
  KEEPS `promptJa`/`promptJaReading`; consumers: `api/curriculum/mastery/route.ts:228-232` and
  `learn/[chapter]/assessment/page.tsx:40-42`.
- Evidence: source read + live bank GET: today's mastery banks contain no `rule-listening` items (kana01:
  kana-recognition/kana-listening/kana-decode; fm01: meaning-select/audio-meaning/cloze/word-order/gist-select/
  listen-who-asked/speaker-identify/response-select) — the kana-recognition `promptJa` values in the bank (こ,つ,ナ…) are
  the QUESTION (glyph→reading), not the key. No EQA gate restricts mastery exercise types (`eqa/gates.ts` — checked).
- Impact: if a future chapter authors `assessmentRole: 'mastery_*'` + `type:'rule-listening'`, the gate bank GET and the
  assessment page will ship the answer word in `promptJa` — one content edit away from a leak.
- Suggested fix: move the rule-listening (and any sound-is-the-question type) stripping into `toClientExercise` keyed by
  exercise type; add an EQA/CI assertion that mastery-bank client projections of such types carry no `promptJa`.

### B-08 — Full kana teaching table (glyph→romaji→host words) ships in a public client chunk [SEVERITY: Low] [STATUS: CONFIRMED (accepted-by-design)]
- Location: `src/components/curriculum/kana-card.tsx:59,545` and `station-runner.tsx:47` import
  `KANA_ITEMS(_BY_GLYPH/_BY_ID)` (client islands) → chunk `_next/static/chunks/2iop210mmmbv8.js` (183,690 bytes).
- Evidence: on-disk chunk scan: 92× `fsrsCardId`, 201× `kanaId`, 98× `romaji`, 88× `hostWord`, plus authored mnemonic
  lines (e.g. «صدای «تس» در وسطِ «تسوییر» قدیمی…»). No per-exercise keys in ANY chunk: `correctOptionId` appears only as
  CODE identifiers in 2 chunks (poc practice-runner/checker — their VALUES come from the flight payload, which 404s in
  production); `correctOrder`/`distractorRationaleFa` likewise code-only; `f1Fa`/`f2HintFa`/`f3ExplainFa`/
  `acceptedChipOrder`: 0 occurrences; exercise ids (`ex-kana-h1-rec*`, `ex-kana-gate*`): 0 occurrences in chunks.
- Impact: kana→romaji is public textbook knowledge AND is intentionally displayed by the kana teaching cards
  (`showRomaji`), so this is teaching content, not a stripped key. Consequence worth stating honestly: any userscript can
  auto-answer option-based kana questions from the chunk mapping — the shuffle/strip protects against casual cheating,
  not scripted cheating. Accepted posture for this content type.
- Suggested fix: none required; record the accepted posture. If option-question anti-script hardening is ever wanted,
  that is a product decision (server-side per-session option re-naming), not a strip gap.

### B-09 — Ops endpoints disclose environment details [SEVERITY: Low] [STATUS: CONFIRMED (documented accepted)]
- Location: `src/app/api/ready/route.ts:24-40` (DB mode + `serverVersion:"18.4 (Debian…)"` when ok; driver errors
  correctly hidden — "see server logs"); `src/app/api/health/route.ts:11-26` (commitSha + env).
- Evidence: live GET /api/ready → `{"database":{"status":"ok","detail":"SELECT 1 via the app pool","serverVersion":"18.4…"}}`;
  both endpoints anonymous. `SECURITY_ROOT_CAUSE.md:78,90,125` documents the DB-mode disclosure as an accepted risk
  (deploy tooling consumer); the PostgreSQL `serverVersion` field is a small addition beyond the documented "DB mode".
- Suggested fix: none blocking; optionally fold serverVersion into the accepted-risk line or drop it.

### B-10 — Caller's internal userId echoed in attempt/progress envelopes [SEVERITY: Low] [STATUS: CONFIRMED]
- Location: `src/modules/mastery/types.ts:40` (`userId` on DialogueMasteryAttempt) → serialized by
  `api/attempts/route.ts:103` and GET list; `api/progress/route.ts:49` returns `{userId,…}`.
- Evidence: live POST /api/attempts → `attempt.userId` = my session uuid. Own-identity only (GET is listForUser-scoped —
  verified empty for a fresh minted identity).
- Impact: minimal (self-echo); tidy-up candidate, not a leak.

### B-11 — Answer-key test coverage: unit strip test exists; RSC flight, bundles, and most surfaces untested [SEVERITY: Medium] [STATUS: CONFIRMED]
- Location: covered — `tests/unit/curriculum-content.test.ts:277-281` (toClientExercise strips `correctOptionId`/
  `correctOrder`, no `f1Fa`), `scripts/h22-e2e/run.mjs:274` (H3c: generated /api/practice payload lacks `correctOptionId`),
  `tests/integration/mastery-api.spec.ts:64` (perQuestion shape post-submission).
- Gaps (verified by search — no `RSC: 1`/`self.__next_f`/`_next/static` scanning anywhere in tests/ or scripts/):
  (1) no test greps RSC flight payloads of learn/poc pages; (2) no test scans client chunks for key material (identifiers
  or values); (3) H3c checks ONE field (`correctOptionId`) on ONE surface — not `revealFa`, `character`, `f1Fa`,
  `distractorRationaleFa`; (4) no assertion that the mastery bank GET (route-level) is stripped; (5) no negative test
  that practice `answer` withholds `revealFa` at attempt 1 (I verified manually: miss-1 → no reveal, miss-2 → reveal);
  (6) nothing covers the gate listening-audio regression (B-03) — an EQA/test "every listening question must have audio
  on every serving surface" would have caught it.
- Suggested fix: add a "key-material never on the wire" E2E: fetch each learn page with RSC:1 + each API GET, assert the
  13-pattern grep is empty; add a bundle-scan script asserting no exercise ids/feedback strings in .next/static chunks;
  extend H3c to the full pattern set.

### B-12 — Grade-block reveals for prediction/rule-slide-ask return in both outcomes [SEVERITY: Info] [STATUS: CONFIRMED (by design)]
- Location: `src/app/api/curriculum/station/route.ts:347-364`.
- Evidence: source read; `explainFa` returns for `prediction`/`rule-slide-ask` regardless of correctness — documented
  unscored warm-up semantics; block answer material (`correctOptionId`, `revealFa`, `acceptedOrders`) verified stripped
  from all client transports (`client-transport.ts` stripBlock/stripStationAnswerMaterial; flight payloads grep clean).
- Suggested fix: none — recording the intentional behavior.

---

## POSITIVE FINDINGS (verified strengths)

1. **/poc elimination in production works end-to-end.** All six pages 404 in the real standalone build (curl + Chromium);
   the 404 flight payload is clean; the poc grading chunks remain in /_next/static but contain CODE only — their data
   source (the flight payload) is unreachable, so no VALUES leak.
2. **Learn-surface RSC flight payloads are clean.** `/`, `/learn`, `/learn/[chapter]/journey`,
   `/learn/[chapter]/journey/stn-kana-h0`, `/practice`, `/learn/[chapter]/assessment`, `/learn/[chapter]/dialogue`
   (RSC:1 fetches) — zero hits for 13 key-field patterns + zero authored-key Persian strings.
3. **/api/practice generate is honestly stripped** (live: 14- and 20-item sessions; `correctOptionId`/`revealFa` absent;
   options shuffled deterministically). The answer ladder withholds the reveal until correct or miss-2 (live-verified).
   Prerequisite gate (focused = completed station only) verified live.
4. **Mastery gate bank GET + assessment page bank stripped** (live: 13 items, all key fields absent, incl.
   `distractorRationaleFa` and feedback).
5. **Station grade withholds pronunciation/reading at F1/F2** (route `revealAnswer = correct || level>=3`; live F1 probe
   returned statement-only) — the TASK-HANASO-22 spoiler fix works at the route level (see B-04 for the f1Fa content gap).
6. **rule-listening answer word is stripped on the station page** and the station's kana audio fires correctly
   (live Chromium: /audio/kana/kn-hira-*.opus requests).
7. **/api/events GET strips `user_id`** — verified against the real ring AND against an injected fake `user_id`
   (both suppressed).
8. **Error envelopes never serialize stacks/internals**: no `.stack` anywhere in routes; `ready` hides driver errors;
   `loadChapterBundle` messages are slug-level ("unknown chapter: X"); zod `parsed.error.message` echoes only schema
   shape + the caller's own input. No try/catch re-throw reaches a response body (unhandled errors → Next generic 500).
9. **Cache posture is sound for user data**: every API route sets `no-store` on user-scoped responses; cookie-reading
   pages render dynamic with `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` (live header
   check); next.config.ts headers touch only public static assets (audio/writing-data) — no cross-user cache boundary.
10. **/api/dialogues/[slug] blocks path traversal** (kebab-case slug regex) and serves content-only bundles (no banks).
11. **Session cookie**: signed, httpOnly, Secure, SameSite=Lax; mint on GET only; legacy raw-uuid re-sign bounded by
    HANASO_LEGACY_TOKEN_CUTOFF (source-verified; live QA of S5 covered by lead — not re-probed here).
12. **Unit suite green: 751/751 (64 files)** — re-run by me in 113s; the lead's "751 green" claim holds.

---

## COVERAGE

- **RSC pages probed live (RSC:1 + HTML):** 8 learn/product pages + 6 poc pages + /poc root = **15**.
- **API surfaces probed:** /api/practice (GET, POST generate×2/answer×3/complete), /api/curriculum/mastery (GET bank,
  POST gate-lock), /api/curriculum/station (POST complete×6, grade×1), /api/curriculum/journey (source), /api/attempts
  (GET×2, POST×3), /api/events (GET anon+auth, POST×2), /api/ready, /api/health, /api/dialogues/[slug], /api/progress
  (source) = **10 routes / 25+ requests**.
- **Client bundles:** on-disk grep of `.next/static/chunks/**` (identifier scan ×9 patterns, value scan for authored
  feedback/reveal strings, exercise-id scan) + Chromium network capture of 58 responses.
- **Client islands read:** station-runner, exercise-session, mastery-gate, practice-hub (+WriteItem), poc practice-runner,
  writing-canvas (free-mode reveal logic), kana-card — no client-side answer derivation/caching beyond the documented
  write-item judging; all 4 `dangerouslySetInnerHTML` uses are a static CSS constant in dev-only /poc pages.
- **Content banks read:** mastery banks of both chapters (type census per item), kana-items, poc assessment bank,
  h21/h22 E2E machinery, strip-related unit/integration tests.
- **Production:** 1 read-only GET (budget respected).
- **Domain coverage estimate: ~95%** (un-probed: dialogue page full walk interactions, t2-eval dev-only surface internals,
  remediation-loop responses of the gate POST beyond the locked case).

## LEAD-CLAIM VERDICTS

| Claim | Verdict |
|---|---|
| Six /poc pages 404 in production builds via page-guard | TRUE (verified in real standalone build; dev/test unchanged) |
| /poc/practice RSC payload no longer ships any answer key | TRUE (page unreachable; 404 flight clean) |
| Learn surfaces strip keys (toClientItem / toClientQuestions / mastery bank GET) | TRUE (all three live-verified) — but see B-02 (write `character` kept) and B-07 (latent rule-listening gap) |
| /api/events GET no longer discloses user_id | TRUE — but the lead missed that GET is fully unauthenticated and the ring carries other learners' scores (B-05) |
| attempts POST perQuestion is legitimate post-submission feedback | PARTLY — full-submission gating verified, but fixed bank + unlimited retakes make it a harvestable key (B-06) |

Top items for the lead: **B-03** (gate listening questions have no audio — live-learn defect), **B-01** (deploy!), **B-05**,
**B-06**, **B-11**.
