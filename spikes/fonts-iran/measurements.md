# Spike M0-07 — داده‌های خام (فقط اعداد؛ فایل فونت‌ها کامیت نمی‌شوند)

> محیط: Agent sandbox (خارج از ایران — عدد Latency فقط برای این محیط معتبر است)
> تاریخ: 2026-11-01 · fonttools 4.62.1 · brotli 1.1.1 · curl 8.x
> دستور بازتولید کامل: `bash spikes/fonts-iran/reproduce.sh`

## ۱. پروب CDN (۵ نوبت؛ ۳ نوبت در گزارش نهایی)

| هاست                              | HTTP       | DNS     | TLS    | TTFB         | کل           | IP (نمونه)      |
| --------------------------------- | ---------- | ------- | ------ | ------------ | ------------ | --------------- |
| fonts.googleapis.com (ریشه)       | 404*       | 0.0015s | 0.064s | 0.095s       | 0.095s       | 142.250.157.95  |
| fonts.googleapis.com/css2 (واقعی) | 200        | —       | —      | —            | 0.094–0.095s | 64.233.189.95   |
| fonts.gstatic.com (ریشه)          | 404*       | 0.002s  | 0.053s | 0.092s       | 0.092s       | 142.250.197.67  |
| fonts.gstatic.com woff2 واقعی     | 200        | —       | —      | —            | 0.051–0.059s | 142.250.197.67  |
| cdn.jsdelivr.net (ریشه)           | 301→fastly | 0.0014s | 0.020s | 0.025s       | 0.025s       | 151.101.193.229 |
| cdnjs.cloudflare.com              | 200        | 0.0019s | 0.024s | 0.037s       | 0.037s       | 104.17.25.14    |
| unpkg.com                         | 200        | 0.0016s | 0.017s | 0.046–0.139s | 0.046–0.139s | 104.18.0.22     |

\* ریشهٔ دامنه مسیر معتبر ندارد؛ مسیر واقعی (css2/woff2) بررسی و 200 ثبت شد.
همهٔ هاست‌ها از محیط Agent سریع و سالم پاسخ دادند — **این اعداد دربارهٔ دسترسی از داخل ایران نیستند** (§۲ گزارش).

## ۲. فایل‌های منبع رسمی (دانلود واقعی)

| فایل                                                   | منبع                                      | اندازه (بایت)                     |
| ------------------------------------------------------ | ----------------------------------------- | --------------------------------- |
| vazirmatn-v33.003.zip                                  | github.com/rastikerdar/vazirmatn/releases | 13,047,191                        |
| Vazirmatn-FD-Regular/Medium/Bold.woff2 (رسمی)          | همان ریلیز                                | 49,044 / 49,784 / 49,868          |
| Vazirmatn-FD-NL-Regular/Medium/Bold.woff2 (بدون لاتین) | همان ریلیز                                | 21,528 / 21,892 / 21,928          |
| Vazirmatn[wght].ttf (variable)                         | همان ریلیز                                | 241,328                           |
| ZenKakuGothicNew-Regular/Medium/Bold.ttf               | raw.githubusercontent google/fonts ofl    | 2,360,248 / 2,328,176 / 2,314,424 |
| NotoSerifJP[wght].ttf (variable 200–900)               | همان                                      | 13,574,352                        |
| BIZUDGothic-Regular/Bold.ttf                           | همان                                      | 4,667,376 / 4,638,128             |

## ۳. سهم‌های CDN (gstatic) — از CSS2 با UA کروم

| خانواده                  | وزن                   | تعداد slice | جمع کل (بایت)                     |
| ------------------------ | --------------------- | ----------- | --------------------------------- |
| Zen Kaku Gothic New      | 400 / 500 / 700       | 121 هرکدام  | 1,405,972 / 1,408,144 / 1,418,228 |
| Noto Serif JP (variable) | 400 و 600 → URL یکسان | 124         | 7,468,952 (یک‌بار، مشترک)         |
| Vazirmatn                | 400 / 500 / 700       | 3 هرکدام    | 102,692 هرکدام                    |

نمونهٔ واقع‌گرایانهٔ متن درس مبتدی (۹۶ نویسهٔ یکتا: کانا + کانجی N5–N4 + علائم + ①②③):

- Zen Kaku 400: **۲۰ slice = 184,488 B** (kana slice خودش 18,252 B)
- Noto Serif 400: **۲۰ slice = 602,816 B** (kana slice خودش 110,024 B)

## ۴. زیرمجموعه‌های pyftsubset (woff2، `--layout-features='*'`)

مجموعه‌نویسه‌ها (فایل‌ها در همین دایرکتوری):

- `charset-set-full.txt` = **۲,۸۶۲ نویسه**: جویو ۲,۱۳۶ (پکیج npm `joyo-kanji@0.2.1` بر پایهٔ x0213.org) + کانا ۲۶۳ + علائم CJK ۶۴ + Enclosed ۱۶۰ + Fullwidth ۹۴ + نمادها ۴۶ + لاتین ۹۵
- `charset-set-starter.txt` = **۱,۶۶۴ نویسه**: JLPT N5–N2 (۹۳۹ کانجی یکتا از پکیج npm `jlpt@1.0.4`) + همان کانا/علائم
- `charset-set-fa.txt` = **۴۶۵ نویسه**: عربی/فارسی U+0600–06FF + لاتین پایه + Latin-1 + ZWNJ/ZWJ/LRM/RLM + علائم عمومی

| خروجی                                                          | اندازه (بایت)               |
| -------------------------------------------------------------- | --------------------------- |
| ZenKakuGothicNew-{Regular,Medium,Bold}-full.woff2              | 333,004 / 337,200 / 340,680 |
| ZenKakuGothicNew-{Regular,Medium,Bold}-starter.woff2           | 161,264 / 162,836 / 163,748 |
| NotoSerifJP-400/600-full.woff2 (اینستنس static)                | 590,512 / 597,832           |
| NotoSerifJP-VF-full.woff2 (variable، محور wght 200–900 حفظ شد) | 1,146,896                   |
| BIZUDGothic-{Regular,Bold}-full.woff2                          | 677,852 / 683,628           |
| BIZUDGothic-{Regular,Bold}-starter.woff2                       | 341,504 / 342,696           |
| Vazirmatn-FD-{Regular,Medium,Bold}.woff2 (fa-set)              | 31,416 / 31,848 / 31,956    |

اعتبارسنجی: همهٔ نمونه‌های JP و fa در خروجی‌ها گلیف کامل دارند (چک‌اسکریپت در reproduce.sh §۵؛ پس از افزودن U+2460–24FF دوباره تولید شد).

## ۵. بودجه‌های نهایی (جمع‌ها)

| سناریو                                | فایل‌ها                                   | جمع (بایت)                                   | معادل     |
| ------------------------------------- | ----------------------------------------- | -------------------------------------------- | --------- |
| Self-host «Starter» — UI              | Vazirmatn FD ×3 + Zen Kaku starter ×3     | 95,220 + 487,848 = 583,068                   | 569.4 KiB |
| Self-host «Starter» — UI + متن بلند   | + NotoSerifJP-VF-full                     | 1,730,164                                    | 1.65 MiB  |
| Self-host «Full Jōyō» — UI + متن بلند | Vazirmatn ×3 + Zen Kaku full ×3 + Noto VF | 95,220 + 1,010,884 + 1,146,896 = 2,253,000   | 2.15 MiB  |
| CDN — پوشش کامل همان وزن‌ها           | gstatic جمع slices                        | 308,076 + 4,232,344 + 7,468,952 = 12,009,372 | 11.45 MiB |
| CDN — یک صفحهٔ درس واقعی              | ۲۰ slice Zen + ۲۰ slice Noto              | 787,304                                      | 768.9 KiB |
| Overlay مبتدی (اختیاری)               | BIZ UD starter Reg+Bold                   | 684,200                                      | 668.2 KiB |

## ۶. لایسنس (متن OFL هر چهار فونت بررسی شد)

- Vazirmatn v33.003 / Zen Kaku Gothic New / Noto Serif JP / BIZ UDPGothic: همه **OFL 1.1**.
- هیچ‌کدام بند «WITH Reserved Font Name» ندارند (بررسی grep روی متن OFL هر سه مخزن google/fonts و ریلیز وزیرمتن) ⇒ زیرمجموعه‌سازی و سلف‌هاست با همان نام خانوادهٔ فونت مجاز است؛ الزام OFL: حفظ COPYRIGHT+LICENSE در هر توزیع.
