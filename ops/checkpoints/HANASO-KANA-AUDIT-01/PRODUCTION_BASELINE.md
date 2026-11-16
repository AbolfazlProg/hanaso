# PRODUCTION BASELINE — HANASO-KANA-AUDIT-01

> هدف: تعیین دقیق اینکه کاربر واقعاً چه نسخه‌ای را می‌بیند و آیا Source ممیزی‌شده همان Production است.

## ۱. نسخهٔ زندهٔ Production

| فیلد        | مقدار                                            | منبع              |
| ----------- | ------------------------------------------------ | ----------------- |
| URL         | `https://learn.kotodama.ir`                      | —                 |
| سرویس       | `hanaso-web`                                     | `GET /api/health` |
| نسخه        | `1.1.0-hanaso29-r01`                             | `GET /api/health` |
| Commit      | `5b503598422611dacb2f9d3e77d2be3226d3347a`       | `GET /api/health` |
| env         | `production`                                     | `GET /api/health` |
| دیتابیس     | PostgreSQL `18.6`، `SELECT 1` OK (latency ~12ms) | `GET /api/ready`  |
| تاریخ تأیید | 2026-11-15 (دو بار: 16:54 و 17:02 UTC)           | curl مستقیم       |

خروجی خام:

```json
{
  "ok": true,
  "status": "ok",
  "service": "hanaso-web",
  "version": "1.1.0-hanaso29-r01",
  "commit": "5b503598422611dacb2f9d3e77d2be3226d3347a",
  "env": "production",
  "uptimeSec": 3276,
  "timestamp": "2026-11-15T17:02:03.877Z"
}
```

## ۲. تطابق Commit با مخزن

- کامیت `5b503598` = tip شاخهٔ `release/TASK-HANASO-29-final-integration` در GitHub است (`git rev-parse origin/release/TASK-HANASO-29-final-integration` → `5b503598...`).
- پیام کامیت: `chore(release): TASK-29 pin refresh — bootstrap+updater default TARGET_SHA=df67d6a …, version 1.1.0-hanaso29-r01`.
- **نتیجه: نسخهٔ زندهٔ Production دقیقاً همان tip شاخهٔ release TASK-29 است.** شاخهٔ ممیزی `audit/HANASO-KANA-AUDIT-01` از همین کامیت ساخته شده است؛ بنابراین «یافته‌های Source» و «یافته‌های Production» در این ممیزی یکسان‌اند و تفکیکی لازم نیست.
- `origin/main` در زمان شروع ممیزی روی `16db1dc` (TASK-LEARNING-04) است؛ main عقب‌تر از release branch است — Production از main جلوتر است. برای ممیزی محتوا مهم نیست (محتوای Kana از TASK-22..29 روی شاخهٔ release است).

## ۳. تطابق محتوای Runtime با Source (Content-as-Code)

معماری محصول: محتوا به‌صورت «content-as-code» در `apps/web/src/modules/curriculum/content/*.ts` است (ADR-008)؛ DB فقط ردیف‌های FK (units/stations) را از seed می‌گیرد و runtime از همان ماژول‌های bundle می‌خواند. بنابراین**ِ مسیر رسیدن محتوا به UI**: bundle از Source → API `/api/curriculum/*` → صفحهٔ Journey/Station.

### شواهد تطابق (بدون احراز هویت ممکن است)

- `GET /api/curriculum/journey?chapter=kana-foundation-01` زنده: فصل `kana-foundation-01` («فصل ۰۱ — مبانی نوشتار: هیراگانا و کاتاکانا»)، ۳۸ گره (۳۶ core + ۲ optional)، ۲ بخش (section-a-hiragana با ۲۲ station، section-b-katakana با ۱۶ station)، اولین station `stn-kana-h0`.
- این داده دقیقاً با Source در `chapter-kana01.ts` (همان units/stationSlugs) منطبق است — تطبیق تک‌به‌تکِ ۳۸ slug انجام شد (اسکریپت پایین).
- Health commit = release branch tip ⇒ احتمال drift بین Source و bundle تولیدی بسیار پایین است. با این حال برای ایستگاه‌های تک‌تک، تطابق محتوای render شده در مرورگر (Subagent C) نیز ثبت می‌شود.

## ۴. نکات عملیاتی برای سایر اسناد ممیزی

- پایهٔ Content-ID ها: `stn-kana-h0..h15`, `p1..p4`, `k1..k13`, `m1-reading`, `m2-realworld`, `opt-r-h9`, `opt-drill`؛ فصل: `kana-foundation-01`؛ فصل ۲: `first-meeting-01`.
- مسیر UI ایستگاه: `/learn/kana-foundation-01/journey/<station-slug>`.
- گیت فصل (assessment) M-K1..M-K5 در صفحهٔ `/learn/kana-foundation-01/assessment` است.
- فایل‌های محتوای اصلی ممیزی:
  - `apps/web/src/modules/curriculum/content/chapter-kana01.stations.ts` (۴۲۶۳ خط)
  - `apps/web/src/modules/curriculum/content/chapter-kana01.exercises.ts` (۱۲۱۶۵ خط)
  - `apps/web/src/modules/curriculum/content/chapter-kana01.practice.ts` + `.practice.exercises.ts`
  - `apps/web/src/modules/curriculum/content/kana-items.ts` (۲۹۶۱ خط، registry)
  - `apps/web/src/modules/curriculum/content/kana-teaching.ts` (۱۲۸۲ خط)
  - `apps/web/src/modules/curriculum/kana-romaji.ts`
- Chapter 2 (`first-meeting-01`) از همان types/generator-های مشترک استفاده می‌کند اما محتوای آن عمدتاً vocab/grammar است؛ فقط موارد اشتراکی (template/فارسی‌نویسی قراردادها) در این ممیزی بررسی و مستند می‌شود (طبق Scope مأموریت).

## ۵. محدودیت‌های صادقانه

1. **چهار تصویر مالک به‌صورت فایل در Workspace نیست** (بررسی `upload/`، `download/`، `hanaso-shots/`، `owner_notes/` انجام شد؛ تنها متن‌های paste شدهٔ مأموریت TASK-22 و تصاویر گزارش قدیمی «روش آموزشی» وجود دارد). Seed Caseها از متن مأموریت استخراج و روی Production زنده بازتولید می‌شوند؛ شواهد جدید (اسکرین‌شات/URL) جایگزین ارجاع به تصاویر اصلی می‌شوند و این در FINDINGS ثبت خواهد شد.
2. API های grade/attempt نیاز به session احراز هویت دارند؛ برای ممیزی مرورگر از حساب QA مستقل استفاده می‌شود (ایجاد در Subagent C) و Progress هیچ کاربر واقعی‌ای دستکاری نمی‌شود.
3. دسترسی به دیتابیس Production مستقیم نداریم؛ گواهی وجود ردیف‌های seed از طریق API و صفحه است.
