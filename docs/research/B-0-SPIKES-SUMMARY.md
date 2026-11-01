# B-0 Spikes — جمع‌بندی چهار اسپایک مهندسی (شاخهٔ `spike/b-0-foundation`)

> مأموریت B-0 / Issue #14 · تاریخ: ۲۰۲۶-۱۱-۰۱ · محیط: Node v24.22.1 · pnpm 12.16.1 · Next.js 16.4.3 · React 19.3.1 · TypeScript 6.0.3
> همهٔ اعداد این جمع‌بندی از اجرای واقعی همان روز است و دستور بازتولید هرکدام در گزارش خودش ثبت شده. **هیچ فایل فونت یا خروجی باینری حجیمی کامیت نشده.**

## جدول وضعیت

| #   | تسک        | اسپایک                                                   | گزارش                                        | وضعیت   | توصیهٔ OTD (خلاصهٔ یک‌خطی)                                                                                                                                             |
| --- | ---------- | -------------------------------------------------------- | -------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ۱   | TASK-M0-05 | React Compiler 1.0 روشن/خاموش + benchmark                | [SPIKE-M0-05](SPIKE-M0-05-REACT-COMPILER.md) | ✅ DONE | **فعال‌سازی در M0-09** با `reactCompiler: true` (سطح بالا): ~۲۴× رندرِ مجدد سریع‌تر در کامپوننت‌های client، هزینهٔ +۰٫۵s بیلد؛ devDep از پیش نصب است                   |
| ۲   | TASK-M0-06 | RTL-audit شاد‌سن/Radix (Dialog/Popover/Dropdown/Tooltip) | [SPIKE-M0-06](SPIKE-M0-06-RTL-AUDIT.md)      | ✅ DONE | شادسن قابل‌استفاده؛ **`DirectionProvider dir=\"rtl\"` در ریشه الزامی**؛ در موبایل ۳۹۰px پاپ‌آور flyout ممنوع (۸۸–۱۳۷px بیرون صفحه اندازه‌گیری شد)                      |
| ۳   | TASK-M0-07 | دسترسی فونت‌ها از ایران + ساب‌ست واقعی                   | [SPIKE-M0-07](SPIKE-M0-07-FONTS-IRAN.md)     | ✅ DONE | **سلف‌هاست کامل مطابق TR-031** — ۱٫۷MB استارتر در برابر ۱۱٫۴MB پوشش کامل CDN؛ طرح `next/font/local` + بودجهٔ حجم آمادهٔ M0-09                                          |
| ۴   | TASK-M0-08 | رفتار `<ruby>` در پاراگراف RTL (FT-003)                  | [SPIKE-M0-08](SPIKE-M0-08-RUBY-RTL.md)       | ✅ DONE | `FuriganaText` با **جزیرهٔ LTR اجباری** (`direction:ltr; unicode-bidi:isolate`) + `rt{user-select:none}` + line-height ≥ ۲ برای بلوک روبی‌دار؛ قرارداد props/CSS آماده |

## اعداد کلیدی (برای تصمیم مالک)

- **React Compiler:** بنچ واقعی مرورگر (HeadlessChrome 156، ۲۰۰ آیتم، ۱۰۰۰ رندر مجدد): بدون-memo ۷۲٫۸→۳٫۰ms (**~۲۴×**)؛ با useMemo دستی ۲٫۷→۱٫۶ms. بیلد: +۰٫۵s گام compile، +۸۲۱B (+۳۸٪) به chunk آن کامپوننت client، صفر خطا/هشدار. اثر SSR: صفر (باندل SSR بایت‌به‌بایت یکسان).
- **Radix RTL:** بدون `DirectionProvider` منو `dir=\"ltr\"` می‌گیرد و زیرمنو با ArrowRight باز می‌شود (خلاف RTL) — با provider: زیرمنو چپ، ArrowLeft، لنگر start=راست، فوکوس صحیح. Popover/Dialog/Tooltip جهت-مستقل و سالم؛ فقط موبایل مشکل کراپ دارد (اعداد بالا).
- **فونت‌ها:** از محیط Agent همهٔ CDNها ۲۰۰ و سریع‌اند (صداقت: خارج از ایران). شواهد مستند (net4people/bbs): فیلترینگ SNI/allowlist ایرانی ⇒ CDN خارجی غیرقابل‌اتکا. ساب‌ست واقعی: Zen Kaku starter ۱۶۱KB/وزن، Noto Serif VF کامل ۱٫۱۵MB (همهٔ وزن‌ها)، Vazirmatn FD ۳۱KB/وزن ⇒ بار اولیهٔ کاربر عادی ~۵۸۰KB (UI) تا ~۱٫۷MB (با متن بلند).
- **Ruby/RTL:** بدون جزیرهٔ LTR، جملهٔ روبی‌دار **وارونه** رندر می‌شود (اندازه‌گیری + تأیید VLM) — مهم‌ترین یافتهٔ بصری B-0. rt همیشه بالا و دقیقاً وسط پایه (۰٫۰px خطا)؛ هم‌ترازی خط پایه با فارسی خودکار. line-height 1٫۴ = برخورد واقعی جوهر (۶px)، 2٫0 = تمیز — قاعدهٔ KB با عدد تأیید شد.

## خروجی‌های ملموس برای M0-09 (صف‌پیاده‌سازی)

1. `reactCompiler: true` در `next.config.ts` (کلید سطح بالا؛ نوع از `config-shared.d.ts` تأیید شد).
2. `DirectionProvider` + قواعد فیزیکی/منطقی side + قاعدهٔ «تست لبهٔ 390px» برای هر کامپوننت اورلی.
3. `src/styles/fonts.ts` با `next/font/local` + فایل‌های woff2 ساب‌ست‌شده (بازتولید با `spikes/fonts-iran/reproduce.sh`) + بودجهٔ حجم (هارد ۲٫۳MB) + فایل‌های OFL-*.txt.
4. کامپوننت `FuriganaText` طبق §۶ گزارش M0-08 (props + CSS + ۵ قاعدهٔ bidi isolation).

## پاکیزگی شاخه

- `apps/web/next.config.ts` **به حالت اول برگشت** (صفر diff با main) — کانفیگ اسپایک فقط در گزارش.
- مسیرهای موقت `src/app/spike-*` حذف و کدشان در `docs/research/spike-m0-0{6,8}/page.tsx.txt` بایگانی شد؛ `public/spike-tmp-fonts/` حذف شد (فونت‌ها از `reproduce.sh` بازتولید می‌شوند).
- devDeps افزوده (همه با `pnpm add -D`): ۵ پکیج Radix + `babel-plugin-react-compiler@1.0.0` — عمداً برای M0-09 باقی ماندند.
- فایل‌های مسیرهای ممنوع (`modules/**`, `api/**`, `ops/**`, ADRها، `.env*`، ریپوی POC همسایه) لمس نشدند. push/merge انجام نشد.
- دروازهٔ نهایی: `pnpm verify` (ریشه) — خروجی کامل و واقعی در [`spikes/verify-output.txt`](../spikes/verify-output.txt).

## کامیت‌های این شاخه (B-0)

| SHA         | موضوع                                                      |
| ----------- | ---------------------------------------------------------- |
| `c211087`   | spike(m0-05): React Compiler on/off benchmark              |
| `1980433`   | spike(m0-06): Radix RTL audit                              |
| `29673b0`   | spike(m0-07): fonts-from-ir + subsets — self-host (TR-031) |
| `077ae22`   | spike(m0-08): ruby in RTL — LTR island mandatory, lh≥2     |
| (این کامیت) | docs(research): B-0 spikes summary + verify output         |
