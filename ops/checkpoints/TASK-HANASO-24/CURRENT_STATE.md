# TASK-HANASO-24 — CURRENT STATE

> آخرین به‌روزرسانی: **CP-09 — مأموریت کامل**. این فایل همیشه آخرین وضعیت واقعی و «اقدام بعدی» را نگه می‌دارد. پس از قطع سشن، از همین فایل + CHECKPOINT_LOG ادامه بده.

## مأموریت

رفع مشکلات امنیتی و یکپارچگی داده‌های تأییدشده در ممیزی TASK-HANASO-23.

- **Scope**: فقط Security و Data Integrity.
- **خارج از scope**: Chapter 2، توسعهٔ محتوا، طراحی Practice، بازطراحی UI، قابلیت‌های جدید.
- تست آموزشی فقط روی مسیرهای موجود فصل اول Kana و قواعد فعلی.
- Production فقط Read-only. هیچ Deployی در این مأموریت انجام نمی‌شود.

## وضعیت Git (اعتبارسنجی‌شده با Git و ls-remote — 2026-11-14)

| مورد | مقدار |
| --- | --- |
| مخزن | github.com/AbolfazlProg/hanaso (private) |
| شاخهٔ کار | `fix/TASK-HANASO-24-security` (ایجادشده از `af49535`) |
| پایهٔ شاخه | `af49535` = تیپ `feat/TASK-HANASO-22-learning-experience` — آخرین خط توسعهٔ معتبر محصول (۱۸۲ commit جلوتر از main؛ شامل release تولیدی `3d8b8cc`) |
| main | `16db1dc` (merge-base با خط ۲۲؛ پشت خط محصول) |
| ممیزی | `audit/TASK-HANASO-23 @ d691e25` — کامل؛ **فقط مرجع**، پایهٔ fix نیست |
| Production | `1.0.0-hanaso22-r01 @ 3d8b8cc` — read-only |
| Worktree | `/home/z/my-project/hanaso24` |

## پنج یافتهٔ مأموریت ← معادل در BUG REGISTER ممیزی

| # | یافتهٔ مأموریت | BUG IDs ممیزی | مکان‌های گزارش‌شده |
| --- | --- | --- | --- |
| ۱ | IDOR در /api/progress و /api/attempts | BUG-011 (+BUG-030, BUG-033, BUG-039) | api/progress/route.ts:30,55 · attempts/route.ts:45,78 |
| ۲ | افشای Answer Key در /poc/practice | BUG-032 (تأیید روی Production با یک GET) | poc/practice/page.tsx (RSC payload: correctOptionId×9, correctOrder×2) |
| ۳ | ضعف Cookie و هویت Guest | BUG-028 (+T3-01/BUG-039) | identity cookie بدون httpOnly/Secure؛ mint-and-proceed روی POST |
| ۴ | نبود Transaction در ثبت Practice | BUG-036 | ۱ write + N upsert متوالی بدون transaction |
| ۵ | اعتبارسنجی هویت/Session/مالکیت | BUG-028/030/033/039 + CSRF + مالکیت رکورد | همهٔ مسیرهای Write |

یادداشت: learn-surfaces واقعی (curriculum/journey/practice/mastery) طبق ممیزی سالم‌اند (کلیدها strip می‌شوند، cookie-scoped اند). سطح مخرب: `/poc/*` و APIهای legacy مشترک.

## فازها

- [x] **CP-00**: اعتبارسنجی Git + ساخت شاخهٔ fix از خط محصول + CURRENT_STATE + CHECKPOINT_LOG + Push
- [x] **CP-01**: SECURITY_ROOT_CAUSE.md — سرشماری کامل ۱۰ مسیر API + ۶ صفحهٔ /poc + ۳ صفحهٔ محصول؛ تأیید line-level؛ طراحی راه‌حل هر فاز (توکن Session امضاشده، GET-only minting، حذف userId از schemaها، dev-only برای /poc، transaction-aware completion)
- [x] **CP-02**: رفع IDOR + hardening اعتبار/session/cookie (تست‌های ۶۳ فایل/۷۴۵ + PG ۲۹ همه سبز) → IDOR_REMEDIATION.md + AUTH_SESSION_HARDENING.md
- [x] **CP-03**: رفع افشای Answer Key — گیت dev/test-only هر ۶ صفحهٔ /poc (پروداکشن ۴۰۴)؛ اثبات با curl + Browser واقعی (404، بدون کلید در HTML/RSC/Network، کوکی httpOnly+Secure امضاشده) → ANSWER_KEY_EXPOSURE_FIX.md
- [x] **CP-04**: Transaction و Idempotency — سرویس‌های اتمیک (db/transactions.ts + lib/poc/completions.ts)؛ idempotent replay؛ advisory lock ضد lost-update/race؛ تست‌های جدید (3 in-memory + 5 PG)؛ 64 فایل/748 + PG 34 همه سبز → DATABASE_TRANSACTION_FIX.md
- [x] **CP-05**: تست امنیتی واقعی QA — ۱۲/۱۲ سناریو و ۵۱/۵۱ چک سبز (سرور standalone + PG واقعی + Chromium). یافتهٔ زندهٔ S5 (oracle بازامضای raw uuid) با HANASO_LEGACY_TOKEN_CUTOFF بسته شد → SECURITY_TEST_RESULTS.md
- [x] **CP-06**: سه ساب‌ایجنت مستقل هم‌زمان (A=Auth/IDOR، B=API/Exposure، C=DB/Transaction) — هر سه با یافتهٔ مستقل و شواهد زنده (نه تأیید صِرف): A: 1H+3M+4L (A-01 نبود گیت secret، A-02 decode 500، A-03 duplicate-cookie first/last، A-04 events props بی‌کران) · B: 1C+1H+4M+6L (B-03 BUG-001 gate audio، B-05 events GET بی‌هویت، B-06 perQuestion key harvest) · C: 1H+2M+5L (C-01 درایو in-flight در tx-instance، C-02 25P02 در tx، C-04 attemptCount) → SUBAGENT_REVIEW_{A,B,C}.md
- [x] **CP-07**: رفع موج ایرادات (commit 14d9d3a) + Verification نهایی با همان ۳ ساب‌ایجنت: **هر سه DOMAIN VERDICT: PASS** (A: همهٔ High/Medium FIXED؛ B: B-06/B-05 FIXED + deferralهای موثق؛ C: C-01/C-02/C-03 FIXED با آزمایش زنده)؛ تست nesting-guard جدید (۳ تست)؛ ادعای «typo» C-10 نمایشی بود (سورس درست بود)؛ شواهد QA تازه‌سازی شد → FINAL_INDEPENDENT_VERIFICATION.md
- [x] **CP-08**: Regression کامل: TS پاک · ESLint پاک · Unit+Integration in-memory ۶۴ فایل/۷۵۵ سبز · Integration-pg ۹ فایل/۳۸+۸skip سبز · E2E مرورگر واقعی h21 و h22 روی build این شاخه در برابر build بکر af49535: **مجموعهٔ نتایج IDENTICAL** (h21: ۱۸/۴۳ در هر دو؛ h22: ۱۴/۲۴ در هر دو؛ diff خالی) — هیچ رگرسیونی از H24؛ افت نسب به دریل تاریخی ۹۲/۹۲ مربوط به حساسیت زمان‌بندی/صدأ همین sandbox است و در baseline هم وجود دارد. لاگ‌ها در regression-evidence/.
- [x] **CP-09**: RELEASE_CANDIDATE.md — هویت RC، خلاصهٔ تغییرات، جدول تأیید کامل، deferred register، الزامات env (SECRET اجباری + CUTOFF پیشنهاد +۱۴ روز + XFP موجود)، چک‌لیست استقرار + ریسک‌ها + rollback. Deploy واقعی طبق مأموریت جداگانه است.

## اقدام بعدی

CP-07 — رفع اختلاف‌ها و ایرادات تأییدشده + تست مجدد + Verification نهایی:
1. FIXهای داخل scope: A-02 (گارد decode)، A-03 (last-wins در resolver)، A-04/B-05 (events: هویت اجباری GET + فیلتر user_id + bound props)، B-06 (حذف correctOptionId از perQuestion)، C-01 (چرخهٔ in-flight: deleteInFlight روی singleton + sweep-on-generate + تست replay ترتیبی PG)، C-02 (retry predicate با 25P02)، C-04 (attemptCount داخل tx)، C-05 (nesting guard)، A-01 (fail-closed boot بدون secret در production + .env.example + گیت deploy).
2. DEFER با استدلال: B-01 (deploy blocker — در RC)، B-03=BUG-001 و B-04=BUG-029 (content track)، B-02 behavior=BUG-031 (تصمیم محصول)، rate-limit کامل (نیاز به بودجهٔ محصول).
3. اجرای مجدد کل تست‌ها (in-memory + PG) + به‌روزرسانی مستندات (C-08).
4. Verification نهایی با همان ۳ ساب‌ایجنت → FINAL_INDEPENDENT_VERIFICATION.md؛ commit + push.

## قوانین فعال

1. Push بعد از هر Checkpoint به `fix/TASK-HANASO-24-security` (توکن از `/home/z/my-project/.github-token` — هرگز چاپ نشود).
2. Production (`learn.kotodama.ir`) فقط Read-only؛ تست‌های Write فقط روی سرور local QA.
3. حداکثر ۳ ساب‌ایجنت هم‌زمان؛ ساب‌ایجنت‌ها در فاز بازبینی بدون تغییر Product Code.
4. Migration فقط additive؛ هیچ migration مخربی اجرا نمی‌شود.
5. KOTODAMA، Nginx، HAProxy، BigBlueButton، Volumeها و دادهٔ واقعی کاربران دست نمی‌خورند.
6. هیچ تستی برای سبز شدن CI حذف یا تضعیف نمی‌شود.
