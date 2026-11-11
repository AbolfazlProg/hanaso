# TASK-HANASO-17 — CURRENT STATE

> آخرین به‌روزرسانی: ۲۰۲۶-۱۱-۱۲ · شاخهٔ کاری: `hanaso17-home-dashboard` (از `origin/hanaso16-learning-journey`)

## ۱) مبنای شروع (CP-01 — بازیابی‌شده و راستی‌آزمایی‌شده)

| قلم | مقدار واقعی | منبع راستی‌آزمایی |
|---|---|---|
| Production زنده | `1.0.0-hanaso16-r01` @ `777fb2b61afdc9021090d60ad23986c93c7d4d66` · `ok:true` | `curl https://learn.kotodama.ir/api/health` (2026-11-11 17:00 UTC) |
| KOTODAMA | زنده (HTTP 200، HTML) | `curl https://kotodama.ir` |
| آخرین شاخهٔ معتبر GitHub | `origin/hanaso16-learning-journey` @ `ffb747d0ecea7ccf26e9be33181c7ffd7a0bc2b1` | `git fetch origin && git ls-remote` |
| `origin/main` | `16db1dc` — قدیمی (عصر TASK-LEARNING-04)؛ شاخهٔ HANASO-16 هنوز Merge نشده | `git log origin/main` |
| مبنای HANASO-17 | `ffb747d0` → شاخهٔ `hanaso17-home-dashboard` | `git checkout -b` محلی |
| تغییرات Local | فقط تغییرِ file-mode (644→755) — صفر تغییر محتوا؛ حفظ و Commit نشد | `git diff --stat` (۱۵۴۶ فایل، 0 insertions/deletions) |

**نتیجه:** یک‌خطی v9.1 توسط مالک اجرا شده و HANASO-16 روی Production فعال است. خط مقدم (Nginx) توسط مالک تعمیر شده است. فرض «خرابی Ingress» دیگر معتبر نیست.

## ۲) وضعیت پیاده‌سازی (به‌ترتیب CP)

| CP | عنوان | وضعیت |
|---|---|---|
| CP-01 | بازیابی نسخهٔ GitHub و Research Context | ✅ کامل (§۱ بالا) |
| CP-02 | مطالعه و ثبت تحقیقات (`RESEARCH_CONSUMPTION_MATRIX.md`) | ✅ کامل |
| CP-03 | DESIGN_DECISIONS + IA + NAVIGATION_FLOW + RESUME_EXPIRATION_POLICY + LESSON_REPLAY_AND_COMPLETION | ✅ کامل |
| CP-04 | پیاده‌سازی Home و Navigation | ✅ کامل |
| CP-05 | Resume انقضا + مسیر ورود به درس | ✅ کامل |
| CP-06 | Replay درس + جریان پایان | ✅ کامل |
| CP-07 | تست جامع + Regression + مرورگر | ✅ کامل (۸۱۳ تست واحد سبز؛ مرورگر ۱۰/۱۰) |
| CP-08 | Release، Manifest، یک‌خطی v10، Push | ✅ کامل |

## ۳) فایل‌های کلیدی ایجاد/تغییرشده

- `apps/web/src/modules/home/home-view.ts` — resolver خالص داشبورد (کامل‌اً تست‌پذیر)
- `apps/web/src/modules/home/server.ts` — ترکیب سروری (reveal + journey + resume-policy)
- `apps/web/src/modules/curriculum/resume-policy.ts` — سیاست انقضای Resume (۷ روز، قابل‌تنظیم)
- `apps/web/src/app/page.tsx` — Home جدید (جایگزین لندینگ ایستا)
- `apps/web/src/components/site-nav.tsx` + `bottom-nav` — ناوبری اصلی (دسکتاپ/موبایل)
- `apps/web/src/components/curriculum/station-runner.tsx` — حالت Replay + پایان‌درس تک‌CTA
- `apps/web/src/components/curriculum/section-journey.tsx` — لینک مرور → `?mode=review`
- `apps/web/src/modules/curriculum/types.ts` — `StationState.updatedAt?` (افزودنی)
- `apps/web/src/modules/curriculum/repository.ts` + `src/db/repositories/curriculum.ts` — ردیابی `updatedAt`
- `db/migrations/…` — ستون `last_activity_at` (افزودنی، idempotent)
- `src/app/api/curriculum/station/route.ts` — انقضای Resume سمت سرور + bump فقط با فعالیت معنادار

## ۴) قدم بعدی

هیچ — مأموریت به نقطهٔ تحویل رسیده (گزارش نهایی + Manifest + یک‌خطی v10 در همین Checkpoint).
