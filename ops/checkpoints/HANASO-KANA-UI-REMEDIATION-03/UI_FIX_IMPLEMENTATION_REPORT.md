# UI FIX IMPLEMENTATION REPORT — HANASO-KANA-UI-REMEDIATION-03

> گزارش فنی پیاده‌سازی اصلاحات UI/UX. هر تغییر: مسئلهٔ بازتولیدشده → کوچک‌ترین اصلاح درست → راستی‌آزمایی مرورگر.
> شاخه: `fix/HANASO-KANA-UI-REMEDIATION-03` — کامیت‌ها: CP-0 `402182a` → CP-1 `d05c716` → CP-2 `9609a55` → CP-3 `3285aea`.

## ۱. فایل‌های تغییریافته (فقط UI — صفر تغییر محتوا)

| فایل | تغییر |
|---|---|
| `section-journey.tsx` | پیام قفل: scroll-into-view + حذف auto-dismiss + رنگ shu-deep + دقایق ink-soft + isolation عناوین (rows/prev/next/goal/objective) |
| `exercise-session.tsx` | ja-instruct روی F1/F2/rationale + MixedFaJaText برای rationale/F2 + helper textها → ink-soft |
| `kana-card.tsx` | ja-instruct روی pairHint/whyFa + شمارندهٔ ضربه/credit → ink-soft + isolation credit |
| `station-runner.tsx` | ja-instruct روی rule-step body/example whyFa + isolation H2 |
| `anchor-dialogue-experience.tsx` | credit → ink-soft + isolation |
| `practice/page.tsx` | isolation عناوین ایستگاه‌ها |
| `styles/globals.css` | کلاس `.ja-instruct` (floor در --text-ja) |

## ۲. جزئیات هر اصلاح

### UI-02 — توضیح ایستگاه قفل‌شده (AUD-007)

**مسئلهٔ بازتولیدشده (390×844):** کلیک ردیف قفلِ نزدیک لبهٔ پایین → پیام ۹۹px زیر fold؛ + محو خودکار بعد از ۳.۶s.

**اصلاح (section-journey.tsx):**
- حذف `lockedTimerRef` + `setTimeout(3600)`؛ state پیام ماندگار است (طبق backlog: «ماندگار تا تعامل بعدی» — کلیک ردیف دیگر جایگزینش می‌کند).
- `useEffect` جدید: وقتی پیام رندر شد، اگر offscreen بود (`rect.top<0 || rect.bottom>vh`) → `scrollIntoView({block:'center', behavior: calm?'auto':'smooth'})` — همان الگوی محترمِ auto-scroll TASK-28 (فقط offscreen، بدون جنگ با کاربر).

**راستی‌آزمایی:** همان سناریوی fail قبل از اصلاح در 360/390/430 → پیام fully-visible (مثلاً 390: top 381–452 در vh 844)، بدون h-overflow، ماندگار >4s، متن پیش‌نیاز واقعی («ابتدا «ردیف あ» را کامل کن»). در سکشن کاتاکانای آینده هم درست (e8).

### UI-03 — خوانایی کانای آموزنده (AUD-008)

**مسئلهٔ بازتولیدشده:** گلیف‌های تمایزی در جمله‌های آموزشی h1 («あ فقط یک پیچ دارد؛ お دو تا...») با 14px/400 (وراثت `text-small`). مقیاس خود پروژه `--text-ja: 17px` (FEAT-109) وجود داشت ولی اعمال نشده بود.

**اصلاح:**
- کلاس `.ja-instruct` در globals.css: `font-size: max(1em, var(--text-ja)); font-weight: 500` — فقط بزرگ می‌کند؛ سلسله‌مراتب (16/18/28px) حفظ شد. کامنتِ ریشه در CSS.
- اعمال روی ۶ نقطهٔ رندر (بند ۱).
- **کشف جانبی:** `distractorRationaleFa` و `hintFa` خام رندر می‌شدند (بدون MixedFaJaText) — کانای rationaleهای مأموریت ۲ بدون isolation بودند. wrap شدند.

**قبل/بعد مستند:** pairHint あ/お: 14px/400 → **17px/500** (h1). rationale ふ: 14px بدون isolation → **17px/500 isolated** (h13).

### UI-04a — کنتراست (AUD-015)

**روش:** `scripts/contrast_sweep.py` — dump همهٔ text nodeهای مرئی (color/bg/px/weight از computed styles، bg نزدیک‌ترین opaque والد، نرمال‌سازی oklab→rgb) + محاسبهٔ WCAG (AA 4.5، large/disabled 3).

**یافته‌ها و اصلاح:** ۱۰ نود متن روی `--color-ink-faint` که در tokens.css خودش مستند است «non-text only (3.6:1)» → توکن درست `ink-soft` «captions (6.4:1)». پالت دست‌نخورد؛ جداکنندهٔ تزئینی `|` (aria-hidden) و لیبل‌های disabled (معاف AA) نگه داشته شدند.

**نتیجه:** journey=0، h1=0، h13=0 خطا (۵۷ نود بررسی‌شده در 390px). + رنگ پیام قفل: `text-shu` (4.37:1 روی surface-warm) → `text-shu-deep` (5.8:1) + `font-bold`.

### UI-04b — Auto-scroll (AUD-015)

پیاده‌سازی موجود TASK-HANASO-28 راستی‌آزمایی شد (NOT_A_BUG): load→center، reload→درست، user-scroll→محترم. سه مسیر کد `prefers-reduced-motion` تأیید شدند (gotoSection، auto-scroll، lock-reason) + CSS برای shake.

### M3-3.3 — Bidi isolation سراسری

probe همهٔ runهای کانای visible بدون `.ja-block/bdi/[lang=ja]` را گرفت (۳۴ مورد در journey، ۲ در h1/p3، ۳ در practice). همه به MixedFaJaText منتقل شدند (عناوین ردیف‌ها/nav/practice/H2/creditها). بعد از اصلاح: **صفر** در هر ۴ صفحه.

## ۳. مصونیت‌ها (§5) — تأییدشده

- صفر تغییر در محتوا/گزینه/کلید/hint متن‌ها — فقط className و wrapper JSX.
- تست‌های Mission 2: 856/856 سبز (شامل ۴۱ تست گارد یکپارچگی محتوا/romaji).
- ۵۸۶ تمرین: اعتبارسنجی گاردها معادل `remediation_reaudit.py` سبز (تست‌ها همان ۵ چک را اجره می‌کنند).

## ۴. خطای sandbox ثبت‌شده

اولین `npm run build` با exit 137 (OOM) شکست — sandbox 4GB RAM داشت و TypeScript worker کشته شد. دوباره با `NODE_OPTIONS=--max-old-space-size=3072` → **exit 0**. خطای کد نبود.
