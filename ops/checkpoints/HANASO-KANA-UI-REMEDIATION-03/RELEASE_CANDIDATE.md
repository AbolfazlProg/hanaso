# RELEASE CANDIDATE — HANASO Chapter 1 Kana نهایی (§10)

## شناسنامهٔ Release

| پین                                              | مقدار                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **نسخهٔ محصول**                                  | `1.1.0-hanaso30-r01`                                                                     |
| **کامیت هدف محصول (۴۰ کاراکتر)**                 | `d822e1ca1fd483de9625e72997392a0d55a043d3`                                               |
| **شاخهٔ release**                                | `fix/HANASO-KANA-UI-REMEDIATION-03`                                                      |
| **مرجع bootstrap/installer (HANASO_DEPLOY_SHA)** | `675496dbd9c93778473fa12c0a56848cd740dd34`                                               |
| **SHA-256 فایل bootstrap**                       | `c1b1a01dc9c2e5347458e16b207d0469603d97bd86376e5e781d86bf8ccb37f0`                       |
| مبنا                                             | Mission 2 tip `3bd81c20209f2e02a19e5ba7cdb9123f6808e800` (حامل Production فعلی 5b503598) |

## §10.1 — راستی‌آزمایی یکپارچه (اجرا شده)

1. **تاریخ Git:** شاخه = مبنا (Mission 2 کامل) + ۶ کامیت این مأموریت (۴ CP کد + مستندات d822e1c + pin-refresh 675496d). بدون revert/کامیت تکراری؛ working tree پاک (فقط mode-changeهای sandbox).
2. **تغییرات مفقود/تصادفی:** diff کامل بازبینی شد — فقط ۷ فایل UI (components/CSS) + مستندات + پین‌های installer. صفر تغییر محتوا.
3. **کل تست‌ها:** ۷۷ فایل / ۸۵۶ تست PASS.
4. **گاردهای یکپارچگی کانا:** ۴۱/۴۱ PASS (۷ گارد محتوا + ۵ بلوک romaji + TL-14).
5. **۵۸۶ تمرین + مسیرهای گیت:** همان گاردها همهٔ ۵۸۶ را می‌پوشانند (تک‌پاسخگی/یکتایی/hint/گیت≠walk/شکل) — سبز.
6. **kanaWordRomaji و call-siteها:** تست‌های جدولی ۳۳ کیس + جاروی no-mixed-output روی همهٔ واژه‌های فصل/رجیستری — سبز. تنها call-site نمایشی (kana-card.tsx) در مأموریت ۳ فقط کلاس CSS گرفت.
7. **مصونیت Mission 2:** پاسخ‌ها/hint/feedback/distractorها/اصلاحات محتوایی — اثبات با تست‌ها؛ diff صفر تغییر متنی محتوا.
8. **Fresh-learner journey:** مرورگر واقعی — تکمیل کامل h0 از صفر (۳ بلوک) + مهر + بازگشت + current ردیف بعدی (e7).
9. **Returning learner:** reload با پیشرفت — current درست، auto-scroll سالم، اسکرول کاربر محترم.
10. **ریسپانسیو/دسترس‌پذیری نهایی:** ۲۴ ترکیب عرض×صفحه پاک؛ کنتراست AA صفر خطا؛ bidi صفر unisolated.

_(بند ۸ در سطح ایستگاه + مکانیزم مهر انجام شد؛ journey کاملِ ۲۵ ایستگاه در sandbox عملی نبود — در OWNER-REVIEW §۳ ثبت شد.)_

## §10.2 — بازبینی انسانی

سند کامل: `OWNER-REVIEW.md` — ۸ رشتهٔ فارسی برای Native review (با مرجع فایل/تمرین + پیشنهاد اختیاری)، تعیین‌تکلیف نهایی AUD-015 (کنتراست=FIXED، auto-scroll=NOT_A_BUG)، معوق‌ها با دلیل و «آیا مانع انتشار است؟» (همه: خیر).

## §10.3 — نسخه و پین‌ها

- الگوی نسخه‌گذاری پروژه دنبال شد (`1.1.0-hanasoNN-r01` — ادامهٔ hanaso29). Pinها طبق الگوی TASK-29 refresh شدند (کامیت `675496d`).
- `HANASO_DEPLOY_SHA` = کامیت ابزار (`675496d...`)، `HANASO_TARGET_SHA` = کامیت محصول (`d822e1c...`) — تفکیک درست طبق مستندات قبلی.
- SHA256 از محتوای واقعی git blob در کامیت پین محاسبه و با دانلود codeload تطبیق داده شد (تست sandbox).

## §10.4 — امنیت و حفظ VPS

- `HANASO_SESSION_SECRET`: موجود → PRESERVED verbatim؛ غایب → تولید server-side (هرگز echo/commit نمی‌شود). **تست‌شده در fixture + idempotency دوبار.**
- `HANASO_LEGACY_TOKEN_CUTOFF`: موجود → PRESERVED، هرگز تمدید نمی‌شود. **تست‌شده.**
- Fail-safe: مقادیر نامعتبر → توقف با پیام دقیق، بدون جایگزینی خاموش.
- ایزولاسیون: فقط stack پروژهٔ `hanaso`؛ KOTODAMA/PostgreSQL مشترک/BBB/FreeSWITCH/VOICEVOX/Nginx/HAProxy/Volumeهای مشترک هرگز لمس نمی‌شوند.
- دادهٔ کاربر: حذف/Reset نمی‌شود. Migration این release: **هیچ**.

## §10.5 — دستور مالک

`OWNER-COMMAND.txt` — بلوک heredoc v17 با همین پین‌ها؛ **در sandbox با عین همان مقادیر تست شد** (دانلود+failover، گیت SHA، clone، verify پین‌ها، integrity، TASK-24 env-prep idempotent ×۲، توقف fail-safe بدون VPS). دستور در پاسخ نهایی هم به‌صورت کامل آمده است.

## §10.6 — مرز استقرار

- **Production deploy اجرا نشد.** هیچ دادهٔ تولیدی تغییر نکرد. هیچ سرویس مشترکی لمس نشد.
- دستور آمادهٔ اجرای مالک است (یا دلیل عدم امکان — اینجا امکان کامل بود و تست شد).
