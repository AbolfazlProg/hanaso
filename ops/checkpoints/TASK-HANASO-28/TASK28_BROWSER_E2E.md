# TASK-HANASO-28 — Browser E2E Report

**Date:** 2026-11-15 · **Server:** production standalone build (TASK28 CP-1 `fb9b195`) · **Browser:** agent-browser headless واقعی · **شواهد:** `ops/checkpoints/TASK-HANASO-28/e2e/` (۷ اسکرین‌شات، همگی non-blank تأیید شد)

## نتایج (همه روی Build نهایی)

| سناریو                                                                          | نتیجه | شاهد                                                      |
| ------------------------------------------------------------------------------- | ----- | --------------------------------------------------------- |
| سگمنت‌کنترل بخش (۲ تب) + `role=tablist`                                         | ✅    | E01 + `switcher=true` در هر ۳ viewport                    |
| ردیف جاری: چیپ «ایستگاه فعلی» + `aria-current="true"` + نوار لبه                | ✅    | E01، `currentAria:"true"`                                 |
| Auto-scroll یک‌باره به درس جاری (کاربر با Progress تا h4؛ ردیف h5 عمیق در لیست) | ✅    | E01 — بعد از لود، top ردیف=400px در fold بدون اسکرول دستی |
| کلیک روی Lock: shake (`locked-shake` در DOM) + دلیل دقیق با نام prereq          | ✅    | E02 — «ابتدا «قاعدهٔ داکوتن (゛)» را کامل کن»             |
| آیکون نوع درس روی ردیف قفل‌شده حفظ شد (راست)                                    | ✅    | E02 — typeTiles: «درس کانا…»                              |
| مهر AIZEN: فریم بزرگ 224px (md:size-56)                                         | ✅    | E03 — `frameW:224`                                        |
| حذف Speaker از صحنهٔ مهر (Toggle به ردیف پیام)                                  | ✅    | E03 — `toggleOnStage:false, toggleInMsgRow:true`          |
| **Sound فقط در Completion تازه**: `GET /audio/sfx/aizen-stamp.opus 206`         | ✅    | network log دقیقاً یک درخواست                             |
| **Refresh صفحهٔ تکمیل‌شده: بدون پخش مجدد + مهر settled**                        | ✅    | بعد از reload: `sealSettled:true`، هیچ درخواست audio جدید |
| چیپ Achievement واقعی (نوع جدید)                                                | ✅    | «واژه‌های واقعی را رمزگشایی کردی» روی h5                  |
| Feedback غلط در تمرین (F1) + retry درست + Auto-next                             | ✅    | h8: «صدای شنیده‌شده «ن» بود» → ん درست → بلوک بعدی        |
| Assist-ladder نوشتن (guided + free)                                             | ✅    | «با کمی کمک قبول شد» بعد از چند تلاش — رفتار طراحی‌شده    |
| Responsive: 390/768/1440 — بدون overflow افقی                                   | ✅    | R-vp390/768/1440 — `overflow=false`                       |
| موبایل: سگمنت + چیپ دقیقه (′) + ردیف جاری                                       | ✅    | R-mobile-detail                                           |

## نکات کاهش‌یافته (صادقانه)

- **Reduced-motion در مرورگر واقعی شبیه‌سازی نشد** (agent-browser بدون emulate media در این نشست) — اما پوشش کد کامل است: `.locked-shake`/ink-ring/shimmer/ring همگی زیر `prefers-reduced-motion` غیرفعال می‌شوند و اسکرول auto می‌شود (unit test S6 موجود + CSS جدید). برای QA بعدی با Playwright `reducedMotion: 'reduce'` قابل‌تأیید است.
- Fresh-completion از UI روی h8 (station با writing) نیمه‌کاره ماند چون شبیه‌سازی دقیق ضربه‌های نوشتن な زمان‌بر بود؛ به‌جایش **h0 با کاربر تازه‌وارد به‌طور کامل از UI کامل شد** و Sound/Seal همان‌جا تأیید شد (E03) — همان مسیر بحرانی مأموریت.
