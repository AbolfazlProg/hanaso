# TASK-HANASO-24 — CURRENT STATE

> آخرین به‌روزرسانی: **CP-03**. این فایل همیشه آخرین وضعیت واقعی و «اقدام بعدی» را نگه می‌دارد. پس از قطع سشن، از همین فایل + CHECKPOINT_LOG ادامه بده.

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
- [ ] **CP-04**: Transaction و Idempotency → DATABASE_TRANSACTION_FIX.md
- [ ] **CP-05**: تست امنیتی واقعی QA (دو حساب A/B + مرورگر ناشناس، ۱۲ سناریوی اجباری) → SECURITY_TEST_RESULTS.md
- [ ] **CP-06**: سه ساب‌ایجنت مستقل → SUBAGENT_REVIEW_{A,B,C}.md
- [ ] **CP-07**: رفع اختلاف‌ها + تست مجدد + Verification نهایی → FINAL_INDEPENDENT_VERIFICATION.md
- [ ] **CP-08**: Regression کامل (TS/ESLint/Unit/Integration/E2E مسیر Kana/Home/Progress)
- [ ] **CP-09**: RELEASE_CANDIDATE.md + مستندات انتشار (بدون deploy)

## اقدام بعدی

CP-04 — Database Transaction و Idempotency طبق §5 SECURITY_ROOT_CAUSE.md:
1. سرویس تراکنشی برای practice-complete: `recordCompleted` + fold شواهد داخل یک `db.transaction` (PG)؛ Idempotent replay با onConflict + بازخوانی؛ Unique (user, objectId) با retry در برخورد.
2. station-complete: دو upsert (station + chapter aggregate) داخل یک tx.
3. mastery gate: attempt insert + chapter fold داخل یک tx.
4. حالت in-memory: همان ترتیب متوالی (single-thread) — بدون تغییر semantics.
5. تست‌های Concurrency/Idempotency جدید + اجرای مجدد کل سوئیت‌ها؛ DATABASE_TRANSACTION_FIX.md؛ commit + push.

## قوانین فعال

1. Push بعد از هر Checkpoint به `fix/TASK-HANASO-24-security` (توکن از `/home/z/my-project/.github-token` — هرگز چاپ نشود).
2. Production (`learn.kotodama.ir`) فقط Read-only؛ تست‌های Write فقط روی سرور local QA.
3. حداکثر ۳ ساب‌ایجنت هم‌زمان؛ ساب‌ایجنت‌ها در فاز بازبینی بدون تغییر Product Code.
4. Migration فقط additive؛ هیچ migration مخربی اجرا نمی‌شود.
5. KOTODAMA، Nginx، HAProxy، BigBlueButton، Volumeها و دادهٔ واقعی کاربران دست نمی‌خورند.
6. هیچ تستی برای سبز شدن CI حذف یا تضعیف نمی‌شود.
