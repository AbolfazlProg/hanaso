# Testing — HANASO

> **خلاصهٔ فارسی:** استراتژی کامل در KB (`testing-strategy.md` + ADR-012) است. اصل: هر باگ تولیدی پیش از بستن ایشو تست رگرسیون می‌گیرد؛ ادعای انجام فقط با خروجی واقعی.

## سطح‌ها و ابزار (پین‌شده)

| سطح         | ابزار                  | چه چیزی                               | کجا اجرا                |
| ----------- | ---------------------- | ------------------------------------- | ----------------------- |
| Unit        | Vitest 5 (+fast-check) | منطق خالص: FSRS/Envelope/فولد/IME     | `pnpm test` — PR و main |
| Integration | Vitest + PG تستی       | سرویس‌ها با DB واقعی تستی             | PR (سرویس container)    |
| E2E         | Playwright 1.64 + axe  | مسیرهای بحرانی (لیست بسته) + a11y     | main + PR از M1         |
| Visual      | Playwright screenshots | ruby/bidi/فونت‌ها (baseline در ریپو)  | opt-in با لیبل          |
| Load/Perf   | k6 + LHCI + web-vitals | smoke هر استقرار · load شبانه staging | M2+                     |

## وضعیت امروز (اسکلت)

- موجود: تست واحد `Envelope` + smoke واقعی سلامت (`/api/health`, `/api/ready`) در `pnpm verify` و CI.
- پوشش انتظاری (طبق KB): منطق FSRS/ارزیابی تمرین ~۱۰۰٪ خط؛ هر یک از ۱۲ قاعدهٔ محتوا ≥۱ fixture سبز/قرمز؛ هر ردیف کنترل امنیتی = یک تست سبز. اعداد از پیش ادعا نمی‌شوند — در CI ثبت می‌شوند.

## قواعد

1. **Red-first برای Agentها:** تست شکست‌خوردهٔ پیش از پیاده‌سازی، الزامی است.
2. دادهٔ تست واقع‌نما ولی غیرواقعی (`e2e@example.com`) — هرگز دادهٔ تولیدی.
3. مسیرهای E2E بحرانی: onboarding · review-session · reader-word-save · dialogue-dictation · data-export · auth-security (افزودن = اصلاح جدول در PR).
4. «تقریباً سبز» وجود ندارد — گیت اجرانشده باید دلیل صریح داشته باشد.
