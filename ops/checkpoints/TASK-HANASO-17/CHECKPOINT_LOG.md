# CHECKPOINT LOG — TASK-HANASO-17

## CP-01 — بازیابی نسخهٔ GitHub و Research Context (۲۰۲۶-۱۱-۱۲)

- شاخهٔ کاری: `hanaso17-home-dashboard` از `origin/hanaso16-learning-journey` (`ffb747d0`).
- راستی‌آزمایی زندهٔ Production: `1.0.0-hanaso16-r01 @ 777fb2b6` · `ok:true` (learn.kotodama.ir). KOTODAMA زنده. خط مقدم تعمیر شده — فرض خرابی Ingress باطل.
- `origin/main` قدیمی است (TL-04)؛ شاخهٔ HANASO-16 مرج نشده → مبنای صحیح = شاخهٔ فیچر.
- تغییرات Local فقط file-mode بود؛ حفظ شد و commit نشد.
- کاوش کامل معماری: journey/reveal/server/types/repos/API/stores/messages + KB (۹ سند).
- **Commit:** `docs(ops): HANASO-17 CP-01 — state recovery (prod 777fb2b verified live, base ffb747d, branch created)`

## CP-02 — ثبت تحقیقات مصرف‌شده (۲۰۲۶-۱۱-۱۲)

- `RESEARCH_CONSUMPTION_MATRIX.md` نوشته شد: ۹ سند KB + ۱۰ سند/ماژول ریپو؛ جدول تصمیم↔منبع با ۲۰ ردیف؛ ۶ Research Gap صادقانه (شمار مرور، نام کاربر، پیشنهادهای متن/دیالوگ، هفتهٔ فعال، آستانهٔ ۷روز، ستون‌بندی دسکتاپ).
- تفکیک [R]/[O]/[D] در همهٔ اسناد اعمال شد.
- **Commit:** همراه CP-03.

## CP-03 — Design Decisions و IA (۲۰۲۶-۱۱-۱۲)

- `DESIGN_DECISIONS.md` (H1–H8، N1–N4، R1–R7، L1–L6) + `HOME_INFORMATION_ARCHITECTURE.md` (۶ حالت کارت قدم بعدی) + `NAVIGATION_FLOW.md` (مترهای قبل/بعد: مسیر ادامه از ۲ کلیک به ۱) + `RESUME_EXPIRATION_POLICY.md` (TTL ۷d، فعالیت معنادار، سه لایهٔ اعمال) + `LESSON_REPLAY_AND_COMPLETION.md` (جدول دو حالت، تک‌CTA پایان).
- **Commit:** `docs(ops): HANASO-17 CP-02+CP-03 — research consumption matrix, design decisions, IA/nav/resume/replay policies`

## CP-04 — پیاده‌سازی Home و Navigation (۲۰۲۶-۱۱-۱۲)

- `modules/home/home-view.ts` — resolver خالص داشبورد (۶ حالت ادامه + کارت درس بعدی + کارت مرور صادقانه + خط مسیر؛ بدون هیچ عدد آینده).
- `modules/home/server.ts` — ترکیب سروری (reveal + journey + resume-policy + fsrsPort status).
- `app/page.tsx` بازنویسی کامل — داشبورد RSC جایگزین لندینگ M0.
- `components/site-nav.tsx` (نوار بالا دسکتاپ + BottomNav موبایل) — فقط مقصدهای واقعی؛ غوطه‌وری حفظ شد.
- رشته‌های UI جدید در `messages/fa.ts` (بدون هاردکد).
- **Commit:** `feat(home): HANASO-17 CP-04 — Home dashboard (progress-driven continue card, honest review card, path link) + site navigation`

## CP-05 — Resume و Lesson Entry (۲۰۲۶-۱۱-۱۲)

- `modules/curriculum/resume-policy.ts` — TTL واحد + مرز بسته + `withResumedFreshness` (خالص، clock-injectable).
- `StationState.updatedAt` (ISO، افزودنی) از هر دو repo عبور می‌کند؛ Migration جدید `last_activity_at` (افزودنی/idempotent).
- API station: bump فقط روی فعالیت معنادار (enter تکراری bump نمی‌کند)؛ GET پاس `updatedAt` + محاسبهٔ انقضای سروری؛ anchor منقضی در enter پاک می‌شود.
- Runner: freshness snapshot محلی + `?restart=1` + اطلاع خنثی شروع دوباره.
- Home: حالت `resume_expired` با CTA «شروع دوبارهٔ درس».
- **Commit:** `feat(resume): HANASO-17 CP-05 — 7-day resume expiration policy (server-authoritative last_activity_at, meaningful-activity bumps, neutral restart UX)`

## CP-06 — Replay و Completion Flow (۲۰۲۶-۱۱-۱۲)

- `?mode=review` — حالت Replay: walk از صفر، badge، بدون POST complete، پنل «مرور تمام شد».
- ردیف‌های «مرور» map → لینک مستقیم Replay (رفع سد پیام Completed).
- تک‌CTA پایان: «پایان درس و بازگشت به مسیر» → `/learn/[chapter]/journey?s=<section>`؛ درس بعدی فقط متن؛ حذف auto-advance.
- `sectionOfStation` خالص + استفاده در station/complete.
- **Commit:** `feat(lesson): HANASO-17 CP-06 — completed-lesson replay mode (?mode=review), one-CTA completion back to the same map section, next lesson shown never auto-opened`

## CP-07 — تست جامع و Regression (۲۰۲۶-۱۱-۱۲)

- تست‌های جدید: `resume-policy.test.ts` (۱۲)، `home-view.test.ts` (۲۱)، `station-mode.test.ts` (API+repo ۱۴)، `section-href.test.ts` (۴) — جمعاً ۵۱ تست جدید.
- کل مجموعه: **۸۱۳/۸۱۳ واحد سبز** (از ۷۶۲). TypeScript ✓ · ESLint 0 ✓ · Prettier ✓ · Build production ✓.
- مرورگر واقعی (Playwright/agent-browser): ۱۰/۱۰ سناریو در ۳۹۰/۷۶۸/۱۴۴۰ — جزئیات TEST_REPORT.
- **Commit:** `test(home+lesson): HANASO-17 CP-07 — 51 new tests (resume TTL boundaries, home states, replay mode, section deep-links); 813/813 green + browser QA 10/10`

## CP-08 — Release و تحویل (۲۰۲۶-۱۱-۱۲)

- کامیت هدف (Release target): **`3f41f6ee`** (CP-07 — آخرین کامیت محتوای کامل: پیاده‌سازی + تست + اسناد کیفیت).
- کامیت ابزار (Tooling): **`aaa5fea4`** — پین updater/bootstrap به `1.0.0-hanaso17-r01 @ 3f41f6ee` + هم‌گامی فیکسچر deploy05. SHA-256 bootstrap در این کامیت: `03ee6e74…`.
- OWNER-COMMAND v10 + راهنمای فارسی v10 — بلوک heredock کوتاه (ضد شکستن خط در Paste)، R=کامیت ابزار (integrity بایت‌به‌بایت پاس، بدون هشدار v9.1)، `HANASO_TARGET_SHA` صریح روی کامیت هدف.
- RELEASE_MANIFEST.md (§۳ پین‌ها، §۴ تنها Migration افزودنی 0003، §۵ میراث کامل، §۶ گیت‌ها، §۷ ترتیب اجرا).
- شاخه به GitHub Push شد؛ یک‌خطی v10 با `bash -n` + اجرای واقعی در سندباکس راستی‌آزمایی شد.
- **Commit:** اسناد تحویل نهایی (این فایل + CURRENT_STATE + Manifest + OWNER-COMMAND + راهنما).
