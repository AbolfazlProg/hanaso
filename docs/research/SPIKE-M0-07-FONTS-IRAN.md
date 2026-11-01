# Spike TASK-M0-07 — دسترسی فونت‌ها از ایران + طرح سلف‌هاست — نتیجهٔ واقعی

> مأموریت B-0 / Issue #14 · تاریخ: 2026-11-01 · شاخهٔ `spike/b-0-foundation`
> فونت‌های محصول (KB `typography`): **Vazirmatn** (فارسی، نسخهٔ FD برای ارقام فارسی) + **Zen Kaku Gothic New** (ژاپنی UI) + **Noto Serif JP** (متن بلند) + **BIZ UDPGothic** (مبتدی) — همه OFL.
> داده‌های خام و دستور بازتولید کامل: [`spikes/fonts-iran/`](../../spikes/fonts-iran/) (`measurements.md` + `reproduce.sh` + سه فایل charset).

## ۰. صداقت روش (مهم)

- **همهٔ اندازه‌گیری‌های شبکه از محیط Agent sandbox (خارج از ایران) انجام شده** — نه از داخل ایران. اعداد latency/status فقط برای همین محیط معتبرند.
- ابزار WebSearch مستقیم در دسترس نبود؛ جست‌وجوی وب از طریق GitHub API/HTML، StackExchange API و رجیستری npm انجام شد (موتورهای جست‌وجو از CAPTCHA/ریجن‌لاک رد شدند — خودش شاهدی بر محدودیت محیط است).
- ادعای معروف «گوگل‌فونتس به IP ایران 403 می‌دهد» از این محیط **قابل‌راستی‌آزمایی نبود** (نقطهٔ مشاهدهٔ ایرانی نداریم). آنچه مستند و قابل‌ارجاع است در §۲ آمده. نتیجهٔ طراحی مستقل از این ادعاست (TR-031).

## ۱. وضعیت CDNها از محیط Agent (۱۴ نوبت curl، ۲۰۲۶-۱۱-۰۱ ~11:15 UTC)

| هاست | HTTP | TTFB | کل | IP (نمونه) |
|---|---|---|---|---|
| `fonts.googleapis.com/css2` (درخواست واقعی) | 200 | 0.094s | 0.094–0.095s | 64.233.189.95 |
| `fonts.gstatic.com` (woff2 واقعی ۲۱KB) | 200 | 0.051s | 0.051–0.059s | 142.250.197.67 |
| `cdn.jsdelivr.net` | 301→Fastly | 0.025s | 0.025–0.028s | 151.101.193.229 |
| `cdnjs.cloudflare.com` | 200 | 0.034s | 0.034–0.037s | 104.17.25.14 |
| `unpkg.com` | 200 | 0.046–0.139s | 0.046–0.139s | 104.18.0.22 |

**همه از این محیط سالم و سریع‌اند** — یعنی «فیلتر بودن» را فقط باید از شواهد داخل ایران استنتاج کرد (§۲)، نه از این جدول.

## ۲. شواهد مستند دربارهٔ وضعیت دسترسی از ایران

منابع واکشی‌شده و واقعی (۱۴۰-char خلاصه؛ لینک دقیق):

1. **[net4people/bbs#630](https://github.com/net4people/bbs/issues/630)** (ژوئن ۲۰۲۶، لیبل Iran): مطالعهٔ اندازه‌گیری «سیستم Allowlist ایران» با نقطهٔ مشاهدهٔ داخل ایران — پس از خاموشی دیسامبر ۲۰۲۵ و بازگشت جزئی ۲۶ مه ۲۰۲۶: **فقط ~۲.۸٪ از شبکه‌های /24 جهانی از VP ایرانی قابل‌دسترس بود** (مقایسه: >۷۰٪ برای هاست خارجی). فیلترینگ SNI/DPI روی IPs مجاز هم فعال است.
2. **[net4people/bbs#676](https://github.com/net4people/bbs/issues/676)** (اکتبر ۲۰۲۶، لیبل Iran): از اکتبر ۲۰۲۶ روی برخی مسیرها TCP/UDP ایران→خارج پس از چند بسته قطع می‌شود؛ و برای CDN: «Iran → Cloudflare → خارج روی wss: هر واریانت بدون ECH fail شد؛ بلاک بلافاصله بعد از TLS handshake = **فیلترینگ SNI**». یعنی حتی CDNهای بزرگ روی SNI بلاک می‌شوند.
3. **[net4people/bbs — خاموشی کامل ژوئن ۲۰۲۵](https://github.com/net4people/bbs/issues)** + [issue #197](https://github.com/net4people/bbs/issues/197) (بلاک دامنه در ISPهای ایران): الگوی تکرارشوندهٔ قطعی/بلاک دامنه‌ای مستند است.
4. **[pypi/support#2751](https://github.com/pypi/support/issues/2751)**: throttling تا ۲۰KB/s و سپس خطای اتصال از ایران برای پکیج‌های خارجی (الگوی تجربی کیفیت ترانزیت).
5. **واکنش‌های مهندسی واقعی جامعهٔ فارسی‌زبان** (PRهای عمومی): [Phamavault#102 «Bundle the fonts instead of fetching them from Google»](https://github.com/kouchakiar-byte/Phamavault/pull/102)، [TheMorisakiBookshop.ui#11 «Stop the tab spinner: self-host fonts»](https://github.com/hadisrashidi/TheMorisakiBookshop.ui/pull/11)، [darz-web#77 «ArvanCloud migration: self-hosted fonts»](https://github.com/ariandarz/-darz-web/pull/77)، [ta-yalda#1 «self-host fonts»](https://github.com/mremadian75/ta-yalda/pull/1) — الگوی مشترک: حذف وابستگی ران‌تایم به گوگل‌فونتس برای کاربر ایرانی.
6. ادعای 403 گوگل‌فونتس برای IP ایران: در جامعهٔ توسعه‌دهندگان فارسی بسیار تکرار شده، اما **از این محیط منبع اول قابل‌واقع‌آزمایی پیدا نشد** — به‌عنوان «گزارش جامعه‌ای، تأییدنشده از این محیط» ثبت می‌شود.

**نتیجهٔ §۲:** فارغ از اینکه 403 سمت گوگل باشد یا بلاک سمت ایران، هر دو مسیر همان نتیجهٔ عملی را می‌دهند: **CDN خارجی برای کاربر ایرانی غیرقابل‌اتکاست.** (این دقیقاً موضوع TR-031 است: هیچ وابستگی runtime کاربر به سرویس تحریمی/ناتوان‌شده.)

## ۳. اندازهٔ واقعی فونت‌ها (دانلود از منابع رسمی)

| فونت | منبع رسمی | فایل | اندازه (بایت) |
|---|---|---|---|
| Vazirmatn v33.003 FD | [ریلیز rastikerdar](https://github.com/rastikerdar/vazirmatn/releases/tag/v33.003) | woff2 رسمی 400/500/700 | 49,044 / 49,784 / 49,868 |
| Vazirmatn FD-NonLatin | همان | woff2 400/500/700 | 21,528 / 21,892 / 21,928 |
| Zen Kaku Gothic New | [google/fonts ofl](https://github.com/google/fonts/tree/main/ofl/zenkakugothicnew) | TTF 400/500/700 | 2,360,248 / 2,328,176 / 2,314,424 |
| Noto Serif JP (variable 200–900) | [google/fonts ofl](https://github.com/google/fonts/tree/main/ofl/notoserifjp) | TTF | **13,574,352** |
| BIZ UDPGothic | [google/fonts ofl](https://github.com/google/fonts/tree/main/ofl/bizudgothic) | TTF 400/700 | 4,667,376 / 4,638,128 |

→ فونت‌های JP کامل ۲.۲ تا **۱۳ مگابایت**‌اند؛ بارگذاری خام از CDN گوگل هم به‌جای ۱ فایل، به ۱۲۱–۱۲۴ «slice» تقسیم می‌شود (جدول بعدی) — سلف‌هاست بدون زیرمجموعه عملاً ممکن نیست.

### ۳-۱. سهم‌های CDN (آنچه مرورگر واقعاً دانلود می‌کند)

| خانواده | slice/وزن | جمع کامل هر وزن | نمونهٔ واقعی یک صفحهٔ درس مبتدی* |
|---|---|---|---|
| Zen Kaku Gothic New | 121 | 1,405,972 – 1,418,228 B | **۲۰ slice = 184,488 B** |
| Noto Serif JP (variable؛ 400 و 600 URL یکسان) | 124 | 7,468,952 B (یک‌بار) | **۲۰ slice = 602,816 B** |
| Vazirmatn | 3 | 102,692 B | ~۲ slice |

\* متن نمونهٔ ۹۶ نویسهٔ یکتا (کانا + کانجی N5–N4 + علائم + ①②③) — روش: نگاشت نویسه‌ها به `unicode-range` سهم‌ها و HEAD گرفتن تک‌تک فایل‌ها (اسکریپت در `measurements.md` §۳).

**نکتهٔ کلیدی:** گوگل سهم‌ها را بر اساس فراوانی مرتب کرده (نه بلوک‌های منطقی)، پس یک صفحهٔ عادی ژاپنی بلافاصله ~۲۰ فایل جدا می‌خواهد؛ هر کانجی تازهٔ کم‌تراکم، slice تازهٔ ~۸–۳۰KB می‌کشد و این انباشته می‌شود تا به پوشش کامل (۴–۱۲MB) نزدیک شود.

## ۴. زیرمجموعهٔ واقعی با pyftsubset (اعتبارسنجی‌شده)

ابزار: `fonttools 4.62.1 + brotli` (نصب pip). مجموعه‌نویسه‌ها (فایل‌های کامل در `spikes/fonts-iran/charset-set-*.txt`):

- **set-full = ۲,۸۶۲ نویسه** — کانجی جویو **۲,۱۳۶** (منبع: پکیج npm `joyo-kanji@0.2.1` بر پایهٔ جدول رسمی x0213.org) + کانا ۲۶۳ + علائم CJK/Enclosed/Fullwidth/نمادها ۳۶۴ + لاتین ۹۵. *(توجه: عدد «~۲۱۳۶» تسک = تعداد کانجی جویو؛ با کانا و علائم مجموعهٔ کامل ۲,۸۶۲ شد.)*
- **set-starter = ۱,۶۶۴ نویسه** — کانجی JLPT N5–N2 (۹۳۹ یکتا؛ منبع: پکیج npm `jlpt@1.0.4`) + همان کانا/علائم.
- **set-fa = ۴۶۵ نویسه** — عربی/فارسی + ZWNJ/ZWJ + لاتین پایه + Latin-1 + علائم عمومی.

| خروجی (woff2) | 400 | 500 | 700 |
|---|---|---|---|
| Zen Kaku **full** (۲,۸۶۲) | 333,004 B | 337,200 B | 340,680 B |
| Zen Kaku **starter** (۱,۶۶۴) | 161,264 B | 162,836 B | 163,748 B |
| Noto Serif **static** full (اینستنس ۴۰۰/۶۰۰) | 590,512 B | 600 → 597,832 B | — |
| Noto Serif **VF** full (محور wght 200–900 حفظ شد ✓) | 1,146,896 B (همهٔ وزن‌ها) | | |
| BIZ UDPGothic full / starter | 677,852 / 341,504 B | — | 683,628 / 342,696 B |
| Vazirmatn FD fa-set | 31,416 B | 31,848 B | 31,956 B |

اعتبارسنجی پوشش: نمونهٔ JP و نمونهٔ fa در همهٔ خروجی‌ها گلیف کامل دارند (چک در `reproduce.sh` §۵؛ خروجی اولیه با ①②③ شکست خورد و U+2460–24FF اضافه شد — درج برای صداقت).

## ۵. مقایسهٔ مسیرها (اعداد §۳ و §۴)

| سناریو | حجم یک‌بارهٔ (کش دائمی) | تعداد درخواست | ریسک ایران |
|---|---|---|---|
| **CDN گوگل — پوشش کامل** وزن‌های لازم | 12,009,372 B (11.45 MiB) | صدها slice تجمعی | قطعی با فیلترینگ SNI/تحریم |
| **CDN گوگل — یک صفحهٔ درس** | 787,304 B فقط برای همان صفحه | ۴۰ درخواست | همان |
| **Self-host starter** (UI + متن بلند) | **1,730,164 B (1.65 MiB)** | ۷ فایل | صفر (هم‌مبدأ اپ) |
| **Self-host full Jōyō** | **2,253,000 B (2.15 MiB)** | ۷ فایل | صفر |

- Self-host کامل **۸۱٪ کوچک‌تر از** پوشش کامل CDN است و — مهم‌تر — **قابل‌پیش‌بینی** است: یک‌بار دانلود، کش همیشگی (`Cache-Control: public, max-age=31536000, immutable`)، بدون «کانجی تازه = فایل تازه».
- فقط UI (بدون فونت متن بلند): **583,068 B** با ست starter.
- Vazirmatn: subset فارسی ما (31.4KB) از FD رسمی (49KB) ~۳۶٪ کوچک‌تر است ولی FD رسمی خودش به قدر کافی بهینه است؛ **FD-NL رسمی (21.5KB) + فونت لاتین از سمت stack** گزینهٔ حداکثر بهینه است.

## ۶. توصیهٔ OTD (M0-07): **سلف‌هاست کامل — مطابق انتظار TR-031**

**تصمیم پیشنهادی:** هیچ CDN خارجی برای فونت؛ همهٔ woff2ها سلف‌هاست از همان اصل (origin) اپ (یا R2/CDN خودِ محصول در فاز بعد). چهار دلیل با عدد: (۱) §۲ — فیلترینگ SNI/allowlist ایرانی CDNهای خارجی را غیرقابل‌اتکا می‌کند؛ (۲) §۵ — سلف‌هاست کوچک‌تر از CDN هم هست؛ (۳) OFL اجازه می‌دهد (بدون RFN؛ §۶ measurements)؛ (۴) `next/font/local` از آن CSS اینلاین + preload بدون flash می‌سازد.

### ۶-۱. طرح دقیق `next/font/local` (ورودی مستقیم M0-09)

```ts
// apps/web/src/styles/fonts.ts  (فقط طرح — در این اسپایک پیاده نشد)
import localFont from 'next/font/local';

// فارسی — FD subset (fa-set 465 نویسه)
export const vazirmatn = localFont({
  src: [
    { path: './woff2/vazirmatn-fd-400.woff2', weight: '400', style: 'normal' },
    { path: './woff2/vazirmatn-fd-500.woff2', weight: '500', style: 'normal' },
    { path: './woff2/vazirmatn-fd-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-fa',
  display: 'swap',
  preload: true,          // فقط زبان غالب صفحه
});

// ژاپنی UI — Zen Kaku starter در M0؛ ارتقا به full وقتی محتوا از N2 گذشت
export const zenkaku = localFont({
  src: [ /* zenkaku-{400,500,700}-starter.woff2 */ ],
  variable: '--font-ja-ui',
  display: 'swap',
  preload: false,         // جلوگیری از preload سه‌گانه؛ فقط صفحات درس
});

// ژاپنی متن بلند — Noto Serif **variable** (یک فایل = همهٔ وزن‌ها)
export const notoSerifJP = localFont({
  src: [{ path: './woff2/notoserif-vf-2862.woff2', weight: '200 900', style: 'normal' }],
  variable: '--font-ja-serif',
  display: 'swap',
  preload: false,
});
```

- مسیر فایل‌ها: `apps/web/src/styles/woff2/` ( کنار کد، چون `next/font/local` import نسبی می‌خواهد؛ ~۱.۷MB داخل ریپوی محصول — قابل‌قبول در برابر ۱۳MB خام؛ git-lfs لازم نیست).
- هر فایل OFL باید همراه `OFL-*.txt` COPYRIGHT در همان دایرکتوری بیاید (الزام OFL).
- ترتیب اصلاح وزن‌ها: اگر فاز بعد 600 سرِیف لازم شد، فایل VF همینکوب 200–900 را پوشش می‌دهد (۰ فایل جدید).
- FOUT مدیریت‌شده: `font-display: swap` + fallback stack (`Zen Kaku Gothic New` → system JP) و `size-adjust` در صورت لرزش layout (پارامتر آزمایشی M0-09).

### ۶-۲. بودجهٔ حجم (قفل پیشنهادی برای M0-09)

| لایه | فایل‌ها | بودجه |
|---|---|---|
| فارسی (همهٔ صفحات) | Vazirmatn FD 400/500/700 | ≤ 100 KB |
| ژاپنی UI (صفحات درس) | Zen Kaku starter 400/500/700 | ≤ 500 KB |
| ژاپنی متن بلند (کتاب‌خوان) | Noto Serif VF | ≤ 1.2 MB |
| مبتدی (اختیاری، تنبل) | BIZ UD 400/700 starter | +≤ 700 KB |
| **جمع بار اولیهٔ کاربر عادی** | | **~580 KB (UI) / ~1.7 MB (با متن بلند)** |

قاعدهٔ پیشنهادی CI: هر PR که فایل فونت را تغییر داد، بودجه را می‌شکند → چک سایز در اسکریپت build (آستانهٔ هارد: ۲.۳MB جمع).

### ۶-۳. ریسک‌ها / بدهی‌ها

1. محتوای خارج از مجموعه (کانجی غیرجویو، کانا نادر، نمادهای خاص) → fallback به فونت سیستم ژاپنی؛ سیاست «متن محتوا در build-time با مجموعه اعتبارسنجی شود» (valiadtor موجود نیست — پیشنهاد ثبت تسک محتوایی).
2. subset ها با هر به‌روزرسانی فونت بالادستی باید بازتولید شوند (`reproduce.sh` موجود است) — پین کردن نسخهٔ منبع الزامی.
3. اعداد CDN ایران‌محور: وقتی آزمونگر داخل ایران در دسترس شد، بازتولید §۱ از آن نقطه ثبت شود (الان صادقانه «نامعلوم از داخل ایران» است).

## ۷. بازتولید

```bash
bash spikes/fonts-iran/reproduce.sh     # کل زنجیره: پروب → دانلود رسمی → ساب‌ست → اعتبارسنجی
```
پایه‌های داده: `spikes/fonts-iran/measurements.md` (اعداد خام) + سه فایل charset + سه CSS گوگل‌فونتس (snapshot همان روز).

وضعیت: **SPIKE DONE** — توصیهٔ OTD: سلف‌هاست کامل با مجموعهٔ starter + Noto VF؛ فعال‌سازی در M0-09.
