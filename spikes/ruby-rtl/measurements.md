# Spike M0-08 — داده‌های خام ruby-RTL (فقط اعداد؛ صفحهٔ تست و فونت‌ها کامیت نمی‌شوند)

> مرورگر: **Chromium 156.0.0.0 headless** (agent-browser 0.40.0) · viewport دسکتاپ 1440×900 و موبایل 390×844
> تاریخ: 2026-11-01 · فونت‌های واقعی (خروجی‌های Spike M0-07، سلف‌هاست موقت در `public/spike-tmp-fonts/`):
> `vazirmatn-fd-400.woff2` (31,416 B) · `zenkaku-400.woff2` (161,264 B) · `zenkaku-700.woff2` (163,748 B) · `notoserif-400.woff2` (590,512 B)

## ۱. خروجی کامل `measurements` صفحه (JSON خام)

فایل: [`measurements.json`](measurements.json) — همان خروجی `<pre data-testid="measurements">` پس از `document.fonts.ready`.

## ۲. هندسهٔ rt نسبت به پایه (همهٔ سناریوها، دسکتاپ)

| سناریو                         | rtAboveBase | rtTopDelta (px) | rtCenterOverBase (px) | rtWiderThanBase (px) |
| ------------------------------ | ----------- | --------------- | --------------------- | -------------------- |
| s1 تک‌روبی در جملهٔ فارسی      | true        | 12.0            | 0.0                   | 0.0                  |
| s2a چندروبی + علائم            | true        | 11.0            | 0.0                   | 0.0                  |
| s3bdi روبی داخل bdi            | true        | 12.0            | 0.0                   | 0.0                  |
| s3span روبی داخل span dir=ltr  | true        | 11.0            | 0.0                   | 0.0                  |
| s4 کاتاکانا/کانجی              | true        | 11.0            | 0.0                   | 0.0                  |
| s6a rt بلند روی پایهٔ ۳حرفی    | true        | 11.0            | 0.0                   | 0.0                  |
| s6b rt بلند روی پایهٔ ۱حرفی    | true        | 11.0            | 0.0                   | 0.0                  |
| s7under (ruby-position: under) | **false**   | −20.0           | 0.0                   | 0.0                  |
| s8 الگوی island                | true        | 11.0            | 0.0                   | 0.0                  |

ابعاد مشترک: rt box height 17–18px (فونت 12px) · پایه 25–26px (فونت 17px) · `rubyLineHeightRatio: 1` (در همه).
پیش‌فرض محاسبه‌شدهٔ Chromium 156: `ruby-position: over` · `ruby-align: space-around` · `writing-mode: horizontal-tb`.

## ۳. هم‌ترازی خط پایه (s1)

`faBottom = rubyBottom = 180.1` → `bottomDelta = 0.0` — جعبهٔ ruby دقیقاً با جعبهٔ inline متن فارسی هم‌کف؛ rt به‌اندازهٔ 12px به بالا رشد می‌کند (`rubyBoxGrowsUpward: false` یعنی رشد از کف خط است).

## ۴. تداخل خطی — اندازه‌گیری per-line (s5، عرض 300px، فونت 17px، Vazirmatn box=26px)

| متریک                                 | line-height 1.4 (=23.8px)    | line-height 2.0 (=34px)     |
| ------------------------------------- | ---------------------------- | --------------------------- |
| تعداد rt داخل جعبهٔ متنِ سطر قبلی     | ۵ از ۵                       | ۵ از ۵                      |
| عمق نفوذ جعبهٔ rt به داخل متن سطر قبل | **6.0px**                    | **3.0px**                   |
| half-leading سطر فارسی                | **−1.1px** (منفی!)           | +4.0px                      |
| نتیجهٔ جوهر قلم                       | برخورد واقعی (VLM تأیید کرد) | بدون برخورد (VLM تأیید کرد) |

نمونهٔ خام (lh1.4): rt top=806.9 / سطر قبل bottom=812.9 → نفوذ 6px. (lh2.0): rt top=1070 / سطر قبل bottom=1073 → 3px.

## ۵. رشد سطر توسط روبی (آزمون A/B ایزوله، عرض 300px/600px، فونت 17px)

| line-height | متن ساده | خط دارای روبی | Δ           |
| ----------- | -------- | ------------- | ----------- |
| 1.4         | 47.6     | 60.6          | **+13.0px** |
| 1.9         | 64.6     | 72.6          | +8.0px      |
| 2.0         | 68.0     | 75.0          | +7.0px      |
| 1.4 تک‌خطی  | 23.8     | 36.8          | +13.0px     |

⇒ Chromium برای روبی فضا اختصاص می‌دهد ولی در lh تنگ با فونت فارسیِ جعبه‌بلند (26px > 23.8px) کافی نیست (§۴).

## ۶. ترتیب bidi (یافتهٔ حیاتی)

| بافت                                                  | ترتیب بصری قطعات                                          | نتیجه        |
| ----------------------------------------------------- | --------------------------------------------------------- | ------------ |
| متن JP خالص پیوسته در پاراگراف RTL (بدون هیچ عنصر)    | 今(x=1225) < す(x=1327)                                   | ✅ LTR صحیح  |
| توالی ruby+متن در RTL بدون dir (s2a، s4، s6b، s7)     | وارونه — s6b از چپ: «る。 う、 食た べる、 見み 行おこな» | ❌ جمله خراب |
| span dir="ltr" (s3span)                               | 日本語 → の → 授業                                        | ✅           |
| bdi (s3bdi)                                           | 日本語 → の → 授業                                        | ✅           |
| CSS island: direction:ltr + unicode-bidi:isolate (s8) | 私 → は → 学生 → です。                                   | ✅           |

تأیید بصری مستقل (GLM-5V روی `spike-m0-08-s2a.png`): «ترتیب واژه‌ها کاملاً وارونه است… کل جملهٔ ژاپنی به صورت بلوک RTL چیده شده».

## ۷. rt پهن‌تر از پایه (s6b: 行→おこな)

rt width = 36px (۳ کانا × 12px) · رِینج متن پایه = 36px (برابر rt) ⇒ پایه با `space-around` پخش/ کشیده می‌شود؛ بدون overhang و بدون هم‌پوشانی با همسایه‌ها (VLM تأیید کرد).

## ۸. انتخاب متن

- پیش‌فرض: furigana داخل کپی می‌آید: `今日きょうは良いい天気です。…`
- `rt { user-select: none }` (تست زنده): کپی تمیز شد: `今日は良天気です。私は日本語を勉強します。` — **furiganaExcluded: true**

## ۹. rp و ایزوله‌سازی

- `rp { display: none }` در Chromium ✓ (پرانتز fallback مخفی).
- s8 island: `direction: ltr` + `unicode-bidi: isolate` ✓ (اندازه‌گیری computed).

## ۱۰. بازتولید

```bash
export PATH=~/.local/bin:$PATH
cd /home/z/my-project/hanaso
bash spikes/fonts-iran/reproduce.sh   # بازتولید woff2ها (خروجی‌های subset)
mkdir -p apps/web/public/spike-tmp-fonts
# خروجی‌های reproduce.sh را با این نام‌ها کپی کن:
#   zenkaku-starter-400→zenkaku-400 · zenkaku-starter-700→zenkaku-700
#   notoserif-static-400→notoserif-400 · vazirmatn-fd-fa-400→vazirmatn-fd-400
mkdir -p apps/web/src/app/spike-ruby-rtl
cp docs/research/spike-m0-08/page.tsx.txt apps/web/src/app/spike-ruby-rtl/page.tsx
pnpm --filter web dev &
agent-browser open http://localhost:3000/spike-ruby-rtl
agent-browser set viewport 1440 900        # سپس 390 844 برای موبایل
agent-browser wait --fn "(() => { const p = document.querySelector('[data-testid=measurements]'); return p && p.textContent.includes('userAgent'); })()"
agent-browser eval "document.querySelector('[data-testid=measurements]').textContent"
# اسکرین‌شات هر بخش:
agent-browser screenshot --full docs/research/assets/spike-m0-08-s1.png   # پس از scrollintoview هر section
```
