# TASK-HANASO-20 — CI PREREQUISITE GATE (گیت‌های خودکار محتوا)

> PHASE 3.6 deliverable. The audit's findings are now mechanical CI rules; positive AND negative fixtures pin both directions.

## گیت‌های جدید/تعمیم‌یافته

### ۱) DERIVED-GLYPH-SHOWN (جدید — `validation.ts` + `glyph-budget.ts`)

- **قاعده:** هر فرم مشتق (DAKUTEN ∪ HANDAKUTEN ∪ یُوئون کوچک ∪ خارجی — هر دو خط) در سطح **مثال/تمرین** باید پیش‌تر در یک بلوک تدریس نمایش داده شده باشد؛ پردازش به‌ترتیب deck؛ بلوک‌های تدریس «معرفی» هستند، مثال/تمرین هرگز.
- **چرا GLYPH-BUDGET کافی نبود:** آن گیت علامت ゛/゜/ゃ… را با «واحدِ آموزش‌دهندهٔ علامت» (h5/h6/h15) چک می‌کند — آموزش هیراگانایی، شکلی‌بودنِ همان مشتق در کاتاکانا را نشان نمی‌دهد.
- **Fixtureها (۶ منفی + ۱ مثبت):** حذف معرفی k6 → پرچمِ ジャパン/プレゼント؛ حذف k5 → バス/ピザ؛ حذف ぴ/ぼ h15 → lis distractorها؛ شبیه‌سازی k12 قبل از ایستگاه → پرچم ァ؛ حذف معرفی‌ها از فصل واقعی → فصل پاک.

### ۲) TRANSCRIPT-CONSISTENT (تعمیم‌یافته)

- برچسب گزینهٔ درستِ هر kana-decode حالا reading مقایسه‌شده است (کورِ باگ きょう بسته شد). ۳ fixture تبدیلی.

### ۳) تست‌های کیفیت بازخورد (`feedback-quality.test.tsx`)

- هیچ تمرینی قالب عمومی f1/rationale ندارد؛ f1 یکتا در هر ایستگاه برای decodeها؛ rationale گزینهٔ انتخابی در outcome غلط (و هرگز pre-answer).

### ۴) تست‌های جداسازی هویت (PHASE 1)

- `middleware-learner-cookie.test.ts` (۴) + `learner-isolation.spec.ts` (۶): سناریوهای A–E سطح API + مسیر بازیابی 409.

## قواعدِ خواسته‌شده ↔ پیاده‌شده (PHASE 3.6)

| خواسته | وضعیت |
| --- | --- |
| Glyph آموزش‌نداده | ✓ DERIVED-GLYPH-SHOWN |
| Grammar Rule آموزش‌نداده | پوشش از قبل: GLYPH-BUDGET (علامت‌ها با واحد آموزش) + EQA-1 |
| Vocabulary خارج از Prerequisite | از قبل: EQA-1 (ممیزی سبز) |
| Yōon قبل از تدریس پیش‌نیاز | ✓ DERIVED-GLYPH-SHOWN (فرم‌های کوچک هر خط) |
| مشتقات Katakana بدون آموزش | ✓ DERIVED-GLYPH-SHOWN |
| مثال/گزینه با محتوای آموزش‌نداده | ✓ همان گیت (مثال‌ها surface هستند) |
| عدم تطابق Objective و Content ایستگاه | ✓ نمونهٔ k12 حل شد (عنوان صادقانه)؛ پایش خودکار کامل آن به‌عنوان گیت عمومی در Backlog با توضیح |

## False positive / negative

- پارسر context را می‌شناسد (فقط فیلدهای ساختاری — هرگز متن آزاد فارسی): عنوان‌های فارسیِ حاوی گلیف (نوع ۱۴ ممیزی) گیت‌پذیر نیستند — مستند؛ رفع با محتوا.
- مورد ۳ ممیزی (で از طریق واژهٔ prereq) با «containment» معتبر می‌شود — ممیزی سخت‌گیرتر بود؛ دلتا در CURRICULUM_REMEDIATION مستند است.
