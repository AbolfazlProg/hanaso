# IMPLEMENTATION REPORT — TASK-HANASO-17

> ۲۰۲۶-۱۱-۱۲ · شاخهٔ `hanaso17-home-dashboard` · الگوی معماری: resolverهای خالص + صفحات RSC نازک (همان HANASO-16)

## ۱) نقشهٔ تغییرات

### ماژول‌های جدید

| فایل                                                            | نقش                                                                                                        |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `apps/web/src/modules/home/home-view.ts`                        | **خالص** — resolver داشبورد (۶ حالت CTA اصلی، کارت درس بعدی، ۴ حالت مرور صادقانه، path/stats) + faDateLine |
| `apps/web/src/modules/home/server.ts`                           | ترکیب سروری — همان resolveLearnerJourney + شمارش سراسری + وضعیت fsrsPort                                   |
| `apps/web/src/modules/curriculum/resume-policy.ts`              | **خالص** — TTL ۷ روز، مرز بسته، unknown legacy، env تستی                                                   |
| `apps/web/src/components/site-nav.tsx`                          | ناوبری (نوار بالای دسکتاپ + تب‌بار پایین موبایل، فقط مقصدهای واقعی)                                        |
| `apps/web/db/migrations/0003_station_last_activity.sql` (+meta) | ستون افزودنی `last_activity_at` (NOT NULL DEFAULT now())                                                   |

### فایل‌های تغییرکرد

| فایل                                                                         | تغییر                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                                                           | بازنویسی کامل: لندینگ M0 → داشبورد زبان‌آموز (RSC force-dynamic)                                                                                                                                                                |
| `src/app/learn/page.tsx` + `[chapter]/journey/page.tsx`                      | SiteNav (سطح‌بالا) + padding موبایل                                                                                                                                                                                             |
| `src/app/learn/[chapter]/journey/[station]/page.tsx`                         | searchParams (mode/restart)، `sectionOfStation`، mapHref در هدر و runner، نشان «حالت مرور»                                                                                                                                      |
| `src/components/curriculum/station-runner.tsx`                               | حالت Replay (بدون restore در ورود، بدون POST complete، پنل پایان مرور) · `?restart=1` + اعلان خنثی · TTL روی snapshot محلی · تک‌CTA پایان → map ?s= · درس بعدی متن · reviewWalkAgain → replay محلی · تعویق اعلان تا settle سرور |
| `src/components/curriculum/journey-home.tsx`                                 | href ردیف‌های review → `?mode=review`                                                                                                                                                                                           |
| `src/app/api/curriculum/journey/route.ts`                                    | همان href برای nodes/sections (refresh زنده)                                                                                                                                                                                    |
| `src/app/api/curriculum/station/route.ts`                                    | bump فعالیت معنادار (enter تکراری نه) · پاک‌کردن anchor منقضی + `resumeExpired` در enter/GET · `lastActivityAt` در complete                                                                                                     |
| `src/modules/curriculum/types.ts`                                            | `StationState.lastActivityAt?` + معناشناسی سه‌حالته currentBlock (set/clear/preserve)                                                                                                                                           |
| `src/modules/curriculum/repository.ts` + `src/db/repositories/curriculum.ts` | merge semantics یکسان در هر دو repo (خود-ارجاعی در `set` برای preserve در Pg) + عبور ISO                                                                                                                                        |
| `src/modules/curriculum/journey.ts`                                          | `sectionOfStation` خالص                                                                                                                                                                                                         |
| `src/app/learn/[chapter]/complete/page.tsx`                                  | شمار واقعی کارت FSRS + CTA اصلی بازگشت به map                                                                                                                                                                                   |
| `src/messages/fa.ts`                                                         | بخش‌های `nav`/`home` + رشته‌های replay/finish/restart (بدون هاردکد)                                                                                                                                                             |

## ۲) معماری داده (§10 مأموریت — بدون State تکراری)

- **هیچ جدول/State جدیدی به‌جز** ستون افزودنی `last_activity_at` (خواستهٔ §۸). Home از همان journey/reveal/stores موجود می‌خواند؛ فصل فعال از Progress؛ درس بعدی از همان resolver؛ مرور از `fsrsPort.status`.
- Migration idempotent (journal drizzle)؛ schema/app.ts هم‌گام؛ seed تغییری لازم نداشت.
- `currentBlock` معناشناسی صریح گرفت (string=set · null=clear · undefined=preserve) — قبلاً رفتار بین دو repo ناسازگار بود.

## ۳) مترهای ناوبری (§۵ — قبل/بعد؛ جزئیات NAVIGATION_FLOW.md)

| مسیر                       | قبل                           | بعد                        |
| -------------------------- | ----------------------------- | -------------------------- |
| کاربر جدید → اولین درس     | ۲ کلیک + ۲ صفحهٔ واسطه        | **۱ کلیک، صفر واسطه**      |
| بازگشتی → ادامه            | ۲ کلیک                        | **۱ کلیک**                 |
| مرور درس تکمیل‌شده         | ۳ کلیک (پیام Completed مزاحم) | **۱ کلیک (از ابتدا)**      |
| پایان درس → نقشهٔ همان بخش | ۱ کلیک به درس بعد (ناخواسته)  | **۱ کلیک به همان Section** |

## ۴) تصمیم‌های صادقانه (هیچ عدد ساختگی)

- کارت مرور تا فعال‌شدن FSRS عدد ندارد (مخفی / خط صادقانه) — Gap مستند.
- سلام بدون نام (auth نیست) — Gap مستند.
- ناوبری فقط ۲ مقصد واقعی — لینک به صفحهٔ ناموجود ممنوع (کنترل مرده) — رشد آینده مستند.
