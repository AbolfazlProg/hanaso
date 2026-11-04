# GITHUB_ISSUE_REGISTER — ثبت مشکلات TASK-LEARNING-03

> همهٔ ۱۸ issue روی `AbolfazlProg/hanaso` ایجاد شده‌اند (Epic #93 + ۱۷ فرزند #94..#110).
> تاریخ ثبت: 2026-11-04 · محیط تأیید: `learn.kotodama.ir` @ `c3c0234`
> شواهد کامل: `LEARNING_EXPERIENCE_AUDIT.md` + پوشهٔ `download/TASK-LEARNING-03-evidence/` (۱۹ اسکرین‌شات، sandbox ممیزی)

## ۱. فهرست Issues

| Issue                                                     | عنوان                                                                     | اولویت | نوع                  | وضعیت شواهد               | وابستگی‌ها                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------- | ------ | -------------------- | ------------------------- | ------------------------------------ |
| [#93](https://github.com/AbolfazlProg/hanaso/issues/93)   | **Epic — Learning Experience & Pedagogy Re-Audit — Chapter 01**           | P0     | epic                 | —                         | همهٔ زیر                             |
| [#94](https://github.com/AbolfazlProg/hanaso/issues/94)   | LEARN-RE-01 — مبتدی مطلق بدون مرحلهٔ کانا وارد L2 می‌شود (فقدان on-ramp)  | **P0** | design               | Confirmed (معماری)        | 🟣 تصمیم مالک D-1 · #95/#96          |
| [#95](https://github.com/AbolfazlProg/hanaso/issues/95)   | LEARN-RE-02 — الگوی ممنوع «همهٔ کارت‌ها سپس همهٔ تمرین‌ها» (نقض DD-94)    | **P0** | design               | Confirmed (داده)          | رسمی‌سازی C1 · #96/#97               |
| [#96](https://github.com/AbolfazlProg/hanaso/issues/96)   | LEARN-RE-03 — سنجش گرامر آموزش‌نداده (の/は/です) در تمرین‌های واژگان     | **P0** | design               | Confirmed (داده)          | #97 (گیت CI-1)                       |
| [#97](https://github.com/AbolfazlProg/hanaso/issues/97)   | LEARN-RE-04 — گیت‌های CI پداگوژیک وجود ندارند (شکاف سیستمی QA)            | **P0** | infrastructure       | Confirmed (فرایند)        | #95/#96 به‌عنوان نمونهٔ نقض          |
| [#98](https://github.com/AbolfazlProg/hanaso/issues/98)   | LEARN-RE-05 — بازطراحی پلیر مکالمه (صحنهٔ ثابت + ترنسکریپت درون‌ناحیه‌ای) | P1     | design               | Confirmed (کد+بازتولید)   | #99/#100/#101                        |
| [#99](https://github.com/AbolfazlProg/hanaso/issues/99)   | LEARN-RE-06 — لب‌زدن با Pause متوقف نمی‌شود                               | P1     | bug                  | Confirmed (کد)            | #98                                  |
| [#100](https://github.com/AbolfazlProg/hanaso/issues/100) | LEARN-RE-07 — فعال‌نشدن دکمهٔ «پایان مشاهده»                              | P1     | bug                  | User-reported + ۳ فرضیه   | 🟣 نیاز به مرورگر/OS مالک · #98/#101 |
| [#101](https://github.com/AbolfazlProg/hanaso/issues/101) | LEARN-RE-08 — نشت صفحات PoC در تجربهٔ فصل (ناوبری/لینک/کارت /learn)       | P1     | bug                  | Confirmed (بازتولید)      | #98/#100                             |
| [#102](https://github.com/AbolfazlProg/hanaso/issues/102) | LEARN-RE-09 — نبود ناوبری «مرحلهٔ قبل» در درس‌ها                          | P1     | enhancement          | Confirmed (کد)            | #106                                 |
| [#103](https://github.com/AbolfazlProg/hanaso/issues/103) | LEARN-RE-10 — تکرار صدای کارت اول (stale Audio) + نبود صدای مستقل واژه    | P1     | bug                  | Confirmed (بازتولید زنده) | 🟣 تصمیم D-3 · #54/#55               |
| [#104](https://github.com/AbolfazlProg/hanaso/issues/104) | LEARN-RE-11 — ناهمگونی اطلاعات کارت واژه (اسلات الزامی)                   | P1     | design               | Confirmed (داده+بصری)     | #105 · EQA-6                         |
| [#105](https://github.com/AbolfazlProg/hanaso/issues/105) | LEARN-RE-12 — سلسله‌مراتب وارونهٔ کانجی برای pre-kana (+رومی‌جی L2)       | P1     | design               | Confirmed (بصری)          | 🟣 تصمیم D-2 · #94                   |
| [#106](https://github.com/AbolfazlProg/hanaso/issues/106) | LEARN-RE-13 — Instructional Design ناقص (قالب R-block · F2/F4)            | P1     | design               | Confirmed (کد+اسناد)      | #95/#97/#102                         |
| [#107](https://github.com/AbolfazlProg/hanaso/issues/107) | LEARN-RE-14 — کیفیت بصری نقشهٔ جزیره‌ای + استعارهٔ مسیر                   | P2     | design               | Confirmed (بصری)          | 🟣 OQ-032 · #108                     |
| [#108](https://github.com/AbolfazlProg/hanaso/issues/108) | LEARN-RE-15 — Emoji در رابط محصول (۹ نمونه)                               | P2     | design/accessibility | Confirmed (کد)            | —                                    |
| [#109](https://github.com/AbolfazlProg/hanaso/issues/109) | LEARN-RE-16 — پیشرفت مشترک poc-user در Production (بدون auth)             | P2     | infrastructure       | Confirmed (شناخته‌شده M1) | M1 auth · #69                        |
| [#110](https://github.com/AbolfazlProg/hanaso/issues/110) | LEARN-RE-17 — هاردکد آستانهٔ گیت روی stage2                               | P2     | infrastructure       | Confirmed (کد)            | #79 · #97                            |

**توزیع:** P0=۴ · P1=۹ · P2=۴ | Confirmed=۱۴ · User-reported=۱ · شناخته‌شده/تعویقی=۲ | 🟣 تصمیم باز مالک: ۵ مورد (D-1..D-5)

## ۲. پوشش گزارش مالک ↔ Issues

هر ۱۱ مشکل گزارش‌شدهٔ مالک (گروه‌های ۱–۴ مأموریت) پوشش داده شده: ۱→#98 · ۲→#99 · ۳→#100+#101 · ۴→#107+#108 · ۵→#102 · ۶→#104 · ۷→#103 · ۸→#94 · ۹→#95+#106 · ۱۰→#106 · ۱۱→#105 · ۱۲→#96. موارد کشف‌شدهٔ اضافی: #97 (سیستمی) · #109 · #110 · گیت assessment در submit (AC در #100).

## ۳. ترتیب پیشنهادی مأموریت‌های بعدی (فاز ۸ — حاصل شواهد این ممیزی)

> اصل ترتیب: **اول چارچوب و گیت‌ها، بعد محتوا، بعد پوستهٔ تجربی، آخر پرداخت بصری** — چون هر بازطراحی محتوا بدون گیت، دوباره نقض می‌شود و هر بازطراحی UI قبل از تثبیت جریان، دوباره خراب می‌شود.

| مرحله  | مأموریت پیشنهادی                                                                     | محدوده                                                                                                                                                                                          | پیش‌نیاز                      |
| ------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **۱**  | **TASK-LEARNING-04: چارچوب + گیت**                                                   | رسمی‌سازی C1 (بستن تعارض پکت‌بندی) · پیاده‌سازی EQA-1..7 به‌عنوان گیت CI (#97) · رفع #110 · به‌روزرسانی 13-06/Section-14 (C2/C4) · تصمیمات D-1..D-5 از مالک                                     | تصمیمات مالک (یک جلسهٔ کوتاه) |
| **۲**  | **TASK-LEARNING-05: بازآرایی آموزشی فصل ۱**                                          | #94 (مسیر کانا طبق D-1) · #95 (پکت‌بندی) · #96 (بازنویسی تمرین‌ها) · #104 (دادهٔ کارت‌ها) · #105 (سلسله‌مراتب بصری طبق D-2) · #103 (صدای per-word طبق D-3 + رفع باگ) — همه زیر گیت‌های مرحلهٔ ۱ | مرحلهٔ ۱                      |
| **۳**  | **TASK-LEARNING-06: موتور درس و ناوبری**                                             | #106 (قالب‌های R-block + F2/F4) · #102 (Previous) · #101 (پاکسازی PoC) · #100 (گیت پایان طبق D-5؛ پس از دریافت اطلاعات محیطی مالک)                                                              | مرحلهٔ ۲                      |
| **۴**  | **TASK-LEARNING-07: پلیر مکالمه**                                                    | #98 (بازطراحی تئاتر+ترنسکریپت) · #99 (لب‌زدن) — پس از تثبیت جریان درس                                                                                                                           | مرحلهٔ ۳                      |
| **۵**  | **TASK-LEARNING-08: پرداخت بصری**                                                    | #107 (نقشه طبق D-4/OQ-032) · #108 (Emoji→lucide)                                                                                                                                                | مرحلهٔ ۴ (یا موازی با آن)     |
| پیوسته | auth (#109) طبق برنامهٔ M1 — قبل از هر جمع‌آوری دادهٔ ارزیابی کاربران واقعی (EQA-11) | —                                                                                                                                                                                               | M1                            |

**دو مأموریت صریحاً «از پایه بازطراحی» نیاز دارند:** پلیر مکالمه (#98 — چیدمان، نه فنی) و مسیر ورود مبتدی (#94 — معماری). **بقیه با اصلاح محدود حل می‌شوند** (داده/قالب/گیت/آیکون).
