# Spike TASK-M0-06 — RTL-audit زیرمجموعهٔ shadcn/Radix (Dialog/Popover/DropdownMenu/Tooltip) — نتیجهٔ واقعی

> مأموریت B-0 / Issue #14 · تاریخ: 2026-11-01 · شاخهٔ `spike/b-0-foundation`
> نسخه‌های آزموده‌شده (devDependency در `apps/web`): `@radix-ui/react-dialog@1.3.1` · `react-popover@1.3.1` ·
> `react-dropdown-menu@2.2.1` · `react-tooltip@1.4.1` · `react-direction@1.2.0`
> مرورگر تست: **Chromium 156 headless** (agent-browser 0.40.0) — دسکتاپ 1440×900 و موبایل 390×844. فقط یک موتور تست شد (فایرفاکس/وب‌کیت در FT-002 سه‌مرورگری باقی است).
> کد صفحهٔ تست: [`spike-m0-06/page.tsx.txt`](spike-m0-06/page.tsx.txt) · اسکرین‌شات‌ها: `assets/spike-m0-06-*.png` (۱۲ عدد، همه <100KB)

## ۱. روش

صفحهٔ client در `src/app/spike-rtl-audit/` (موقت) با `<html dir="rtl">` از layout ریشه؛ هر ۴ پریمیتیو با محتوای فارسی+ژاپنی؛ سناریوهای چالشی: تریگر چسبیده به لبهٔ راست/چپ، زیرمنو، فوکوس‌ترپ، Escape، اسکرول‌لاک، کیبورد. علاوه بر اسکرین‌شات، **هندسهٔ دقیق** با `getBoundingClientRect()` از داخل صفحه اندازه‌گیری و ثبت شد (اعداد زیر همان مقادیر واقعی‌اند). صحت بصری دو اسکرین‌شات کلیدی با مدل بینایی (GLM-5V) راستی‌آزمایی شد.

## ۲. یافتهٔ کلیدی شمارهٔ ۱ — Radix جهتِ صفحه را از HTML نمی‌خواند

`@radix-ui/react-direction@1.2.0`:

```js
function useDirection(localDir) {
  const globalDir = React.useContext(DirectionContext);
  return localDir || globalDir || 'ltr'; // ← پیش‌فرض ltr
}
```

`document.documentElement.dir` خوانده **نمی‌شود**. تنها مصرف‌کنندهٔ جهت در این ۴ پریمیتیو، خانوادهٔ Menu است (`react-menu/dist/index.mjs` خط ۶۶: `const direction = useDirection(dir)`). نتیجهٔ تجربی: popper-wrapper منوی Dropdown بدون هیچ تنظیمی `dir="ltr"` گرفت (اندازه‌گیری واقعی)، در حالی که Popover/Tooltip/Dialog اصلاً direction-aware نیستند و از CSS ارث‌بری می‌کنند.

پیامدهای پیش‌فرضِ ltr در DropdownMenu (اندازه‌گیری واقعی، دسکتاپ 1440):

- زیرمنو با `side='right'` باز می‌شود (خلاف عادت RTL) — در تست ما فقط به‌خاطر برخورد با لبه flip شد؛
- کیبورد: زیرمنو با ArrowRight باز می‌شود (در RTL باید ArrowLeft باشد).

**راه‌حل (تأیید شده با تست):** `<DirectionProvider dir="rtl">` دور اپ (یا `dir="rtl"` روی هر `DropdownMenu.Root`):
بعد از اعمال: wrapper منو `dir="rtl"` شد، زیرمنو **به‌چپ** و «by design» باز شد (792..1012 در برابر والد 1009..1229)، align="start" سمت راستِ تریگر لنگر شد، و **ArrowLeft** زیرمنو را باز کرد و فوکوس روی آیتم اول رفت (`focused: "مبتدی — 初心者"`).

## ۳. جدول وضعیت کامپوننت‌ها

| کامپوننت               | وضعیت RTL                    | جزئیات اندازه‌گیری‌شده                                                                                                                                                                                                                                                                   | راه‌حل                                                                                                |
| ---------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Dialog 1.3.1**       | ✅ سالم                      | direction-agnostic؛ متن از html ارث می‌برد؛ فوکوس‌ترپ ✓ (Tab داخل می‌ماند)، Escape ✓، برگشت فوکوس به تریگر بعد از بستن ✓، اسکرول‌لاک `body{overflow:hidden}` ✓ و بازیابی ✓؛ موبایل 390: محتوا ۵..۳۸۵ = کامل داخل viewport؛ رندر دوزبانه سالم (تأیید VLM)                                 | هیچ — فقط استایل‌دهی خودمان با logical properties                                                     |
| **Popover 1.3.1**      | ✅ سالم دسکتاپ / ⚠️ موبایل   | side/align **فیزیکی**‌اند (left=چپ صفحه). دسکتاپ: side=left از تریگر لبهٔ راست → 722..1042 کامل پیدا + فلش سمت راست پاپ‌آور به تریگر ✓ (تأیید VLM). موبایل 390: همان پاپ‌آور ۳۲۰px → **-137..183 یعنی ۱۳۷px بیرون صفحه** (flip هر دو طرف سرریز دارد، shift فقط روی محور عرضی کار می‌کند) | در موبایل side چپ/راست با محتوای پهن ممنوع → side=top/bottom یا bottom-sheet؛ تست لبه در 390px الزامی |
| **DropdownMenu 2.2.1** | ⚠️ نیازمند DirectionProvider | بدون تنظیم: `dir="ltr"` روی wrapper (اندازه‌گیری‌شده). با DirectionProvider rtl: زیرمنو چپ ✓، ArrowLeft ✓، لنگر start=راست ✓. موبایل 390: زیرمنوی ۲۲۰px از منوی 129..349 → **-88..132 یعنی ۸۸px بیرون صفحه**                                                                             | `DirectionProvider dir="rtl"` در providers اپ؛ در موبایل الگوی drill-in به‌جای flyout                 |
| **Tooltip 1.4.1**      | ✅ سالم                      | direction-agnostic؛ side فیزیکی؛ دسکتاپ side=left از تریگر لبهٔ راست → 845..1046 + فلش ✓؛ متن RTL ارث‌بری ✓                                                                                                                                                                              | روی تاچ hover نیست → در موبایل الگوی جدا (مثلاً tap→popover یا نمایش همیشگی معنی)                     |

## ۴. یافته‌های تکمیلی

- **Focus ring / highlight آیتم‌ها:** Radix فقط `data-highlighted` می‌گذارد؛ استایل دیداری بر عهدهٔ لایهٔ ماست (shadcn این را در css دارد). بدون آن، هایلایت کیبورد نامرئی است — در M0-09 استایل `[data-highlighted]` الزامی است.
- **اسکرول‌لاک:** مکانیزم Radix سالم بود (اندازه‌گیری `overflow` بدن قبل/حین/بعد دیالوگ: visible → hidden → visible).
- **متن دوزبانه در همهٔ overlayها** با `<span dir="ltr" lang="ja" style="unicode-bidi:isolate">` الگوی KB (`bilingual-rtl-ltr` §۱) درست رندر شد — بدون garbling (تأیید VLM روی دو نمونه).
- popper-wrapperها بعد از بسته‌شدن در DOM می‌مانند (display:none) — برای تست‌های خودکار باید با visibility فیلتر کرد (در اسکریپت بازتولید همین شد).

## ۵. الگوی پیشنهادی برای کامپوننت‌های خودمان (ورودی M0-09)

1. **`<DirectionProvider dir="rtl">`** در ریشهٔ providers — یک‌بار، اثرش روی همهٔ Menu/Select-مانندها؛ PR باید تست داشته باشد که `document.querySelector('[data-radix-popper-content-wrapper]')?.getAttribute('dir') === 'rtl'`.
2. side/align را **فیزیکی** فرض کنیم و نگاشت منطقی→فیزیکی را در لایهٔ خودمان متمرکز کنیم: `sideStart = dir==='rtl' ? 'right' : 'left'`.
3. در viewport < 640: پاپ‌آور/زیرمنوی flyout ممنوع → sheet یا drill-in (عدد مبنا: 390px).
4. CSS کامپوننت‌ها فقط با logical properties (قاعدهٔ KB — `margin-inline-start` و غیره) + استایل `[data-highlighted]` و focus-visible.
5. shadcn/ui (که روی همین Radix است) با این ۴ قاعده برای RTL قابل‌استفاده است؛ هر کامپوننت جدید باید «تست لبهٔ 390px» پاس کند.

## ۶. بازتولید

```bash
export PATH=~/.local/bin:$PATH
cd /home/z/my-project/hanaso
mkdir -p apps/web/src/app/spike-rtl-audit
cp docs/research/spike-m0-06/page.tsx.txt apps/web/src/app/spike-rtl-audit/page.tsx
pnpm --filter web dev &
agent-browser open http://localhost:3000/spike-rtl-audit
agent-browser set viewport 1440 900   # سپس 390 844 برای موبایل
agent-browser snapshot -i             # refs برای کلیک
agent-browser eval "(() => JSON.stringify([...document.querySelectorAll('[data-radix-popper-content-wrapper]')].filter(w=>getComputedStyle(w).display!=='none').map(w=>({l:Math.round(w.getBoundingClientRect().left),r:Math.round(w.getBoundingClientRect().right),dir:w.getAttribute('dir')}))))()"
```

وضعیت: **SPIKE DONE** — devDeps برای M0-09 در `apps/web` باقی ماند (`react-direction` هم اضافه شد). صفحهٔ تست از `src/app` حذف و کدش در `docs/research/spike-m0-06/page.tsx.txt` بایگانی شد.
