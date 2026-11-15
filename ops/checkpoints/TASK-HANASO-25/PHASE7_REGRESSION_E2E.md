# TASK-HANASO-25 — PHASE 7: Regression + Real-Browser E2E (CP-08)

## 1. Full regression suite
`corepack pnpm test` (apps/web): **69 test files / 787 tests — ALL PASSED**
(includes the four H25 unit specs + h25-hint-action integration spec; covers
gate arithmetic incl. the M1+M2 edge, two-correct, feedback quality,
content-lint CL-01..CL-12 with pos+neg fixtures).
`corepack pnpm typecheck` (tsc --noEmit): clean. `corepack pnpm lint` (eslint): clean.

## 2. Real-browser E2E (Playwright chromium, dev server on :3000)
Script: scripts/h25_browser_e2e.mjs — **13/13 PASSED**:

| # | Check | Evidence |
| --- | --- | --- |
| 1 | home renders | title «هاناسو — HANASO» |
| 2 | journey renders | body > 43k chars, stations listed |
| 3 | station walk (stn-kana-h1) | kana-card with پخش مجدد/تکرار آموزش |
| 4 | kana-card stroke guidance | «ضربهٔ 1 از 3» + stroke instructions render |
| 5 | **live gate run: all 25 questions traversed** | answered+advanced 25/25 via radio + ادامه |
| 6 | radio option selection works | aria-checked flow, next enabled after select |
| 7 | listening questions show audio UI | replay button + «صدای پخش‌شده» prompt |
| 8 | gate result phase (server-graded) | submit → «پرسش ۲۵ از ۲۵» → result rendered |
| 9 | **TASK-24 hint: authed browser** | 200, body keys EXACTLY ["hintFa"], cache-control: no-store |
| 10 | **TASK-24: cookieless guard** | 401 learner/no_identity BEFORE any hint logic |
| 11 | unknown chapter → 404 | status 404 |
| 12 | unknown station → 404 | status 404 |
| 13 | no page JS errors (whole run) | pageerror listener: 0 |

Notes from live checking (selectors were corrected against the REAL UI, two
false-positives identified and eliminated: the «500» string was the
vazirmatn_fd_500 font filename, and the first 401-expectation ran WITH the
middleware cookie — the product was right, the probe was wrong).
The gate radio walk also verified the CP-06/CP-07 payload discipline live:
no recall promptAudio, listening auto-play/replay present, no answer-key
material in the client HTML.

## 3. TASK-24 security preservation (verified live + by suite)
- Uniform GUEST 401 (learner/no_identity) on all POST actions incl. `hint` —
  verified live cookieless (check 10) and by the integration spec.
- Hint response carries ONLY `hintFa` with `cache-control: no-store` (check 9).
- /poc page-layer guard untouched (page-guard notFound() in production).
- resolveLearnerIdFromRequest used by station/mastery routes (unchanged).
- No secrets in any file, log, or report.

## Conclusion
PHASE 7 exit criteria met: full regression green, real-browser E2E green,
TASK-24 intact. Ready for PHASE 8 (production build + release pinning).
