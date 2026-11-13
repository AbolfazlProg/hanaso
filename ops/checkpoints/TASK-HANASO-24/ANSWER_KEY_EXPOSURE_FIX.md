# TASK-HANASO-24 — ANSWER KEY EXPOSURE FIX (CP-03)

> Closes audit BUG-032 (Medium — verified on production with one GET) and
> mission finding 2. Acceptance criteria from the mission §3:
> no correct answers extractable from HTML, RSC payload, API response, JS
> bundle or network requests — proven below by direct GET + real browser.

## 1. What `/poc/practice` was (usage determination — mission required this first)

- Legacy TASK-SLICE-01 stage-C demo: RSC page at `app/poc/practice/page.tsx`
  builds `generateExercises(dialogue, characters)` (items carrying
  `correctOptionId` / `correctOrder` — `modules/practice/types.ts:35,44,54,67`)
  and passes them as props to the `PracticeRunner` client island, which grades
  CLIENT-SIDE (`practice-runner.tsx:13`). The RSC flight payload therefore
  serialized the full answer key into the HTML of ANY visitor.
- Usage census: the product NEVER links into `/poc/*` (invariant documented in
  `app/learn/page.tsx:17`; nav grep = zero product callers). Its function was
  replaced by the H22 real surfaces: `/practice` page + `/api/practice`
  (server-side grading, `toClientItem` stripping — audit wire-probed clean).
  Remaining consumers: the other `/poc` demo pages and `lib/poc/client.ts`
  (dev-only islands). => a dead legacy demo in production clothing.

## 2. The fix — dev/test-only, whole-route

Chosen remedy (mission §3 option list): **remove the pages from production** —
not CSS/JS hiding, not field renaming (both explicitly disallowed).

- NEW `src/lib/poc/page-guard.ts` — `guardPocPage()` calls `notFound()` when
  `NODE_ENV === 'production'`.
- All SIX `/poc` pages call it as their first statement
  (`practice`, `assessment`, `dialogue`, `lesson`, `t2-eval`, `ui`):
  in production the page component never runs past the guard — no bundle
  load, no props, no client island, no flight payload beyond the 404.
- In development and under vitest (`NODE_ENV=development|test`) the pages keep
  working exactly as before (demo/integration flows unaffected).
- The H22 product surfaces are untouched; `/api/attempts` (used by the
  assessment demo) remains server-graded and is IDOR-fixed (CP-02).

Why all six and not just `/poc/practice`: the other five carried no keys today,
but they are the same legacy class, unlinked from the product, and the mission
explicitly warns against patching only the reported instance. One guard, one
rule: the `/poc` namespace does not exist in production.

## 3. Acceptance proof (production standalone build, NODE_ENV=production)

Direct GETs (curl) against the QA server (`127.0.0.1:3124`, built from this
branch, `env -u DATABASE_URL`, real `HANASO_SESSION_SECRET`):

| Check | Result |
| --- | --- |
| `GET /poc/practice` | **404** — body scanned for `correctOptionId\|correctOrder\|token:` → **0 hits** |
| `GET /poc/{assessment,dialogue,lesson,ui,t2-eval}` | **404** ×5 |
| `GET /poc/practice` with `RSC: 1` (flight payload) | no key material (0 hits) |
| `GET /` (product home) | 200 (no regression) |
| Client JS bundles (`.next/static/**`) | 0 hits for key identifiers (server-side chunks contain only CODE identifiers — the server needs those to function; no VALUES ever cross the wire) |

Real browser (Chromium via playwright-core 1.57, anonymous context — script
`scripts/h24_poc_browser_check.mjs`, output JSON kept in the QA workspace):

| Check | Result |
| --- | --- |
| `/poc/practice` navigation | 404 page («هاناسو» chrome, no exercise content) |
| DOM after load | key material: **none** |
| Every network response body during the visit | key material: **none** |
| `hanaso_lid` cookie | present · **httpOnly** · **secure** · **SameSite=Lax** · `<uuid>.<sig>` shape |
| `document.cookie` from page JS | cannot read the identity (httpOnly holds) |
| `GET /` after the poc visit | 200 |

Scenario 12 of the mandatory QA matrix (CP-05) re-proves this against the same
build with the full 12-scenario harness.

## 4. Residual surface (documented, not this mission's scope)

- The F1 feedback-text leak on learn surfaces (BUG-029) is CONTENT authoring —
  deferred to the content track (SECURITY_ROOT_CAUSE.md §6).
- `/poc` pages remain reachable in DEV deployments by design; they contain no
  production user data and no answer keys beyond the demo dialogue (which the
  integration suite grades server-side).
