# TASK-HANASO-19 — SCREENSHOT INDEX (فهرست شواهد تصویری)

> مسیر: `ops/checkpoints/TASK-HANASO-19/screenshots/` · همه با مرورگر واقعی از نسخهٔ زندهٔ `1.0.0-hanaso17-r01 @ 3f41f6ee` گرفته شده‌اند (جز آن‌ها که ذکر شده).

| فایل | صفحه/وضعیت | Viewport | توضیح / ارتباط با Bug |
| --- | --- | --- | --- |
| `live-home-1440.png` | Home داشبورد | 1440×900 | حالت عادی کوکی‌دار؛ مبنای ارزیابی VLM طراحی — پایه DESIGN_SYSTEM_AUDIT |
| `live-journey-1440.png` | نقشهٔ مسیر فصل کانا | 1440×900 | قفل ایستگاه‌ها (h3/h4/h5 disabled)، پیشرفت، بخش‌بندی جزیره |
| `live-h2-writing-guided-1440.png` | درس h2 — تمرین نوشتن هدایت‌شدهٔ か | 1440×900 | Canvas + پیشرفت ضربه + دستورالعمل — WRITING_EXPERIENCE_AUDIT |
| `live-h6-yoon-cloze-1440.png` | درس h6 — تمرین cloze き？う | 1440×900 | گزینه‌های や/よ/ょ — جریان TL-14 |
| `live-h6-rule-card-1440.png` | درس h6 — کارت مرجع یُوئون | 1440×900 | جدول «فشرده/جدا/شنیدن» — **BUG-008** (ستون شنیدن بی‌صدا) و سطر «きょう = کیو» — **BUG-003** |
| `live-h6-completion-1440.png` | درس h6 — جمع‌بندی ۱۳/۱۳ | 1440×900 | وضعیت پایان ایستگاه؛ دکمهٔ «تلاش دوباره برای ثبت» — **BUG-004** |
| `live-h0-completion-noseal-1440.png` | تکمیل موفق ایستگاه h0 | 1440×900 | پیام موفقیت + «درس بعدی: ردیف あ» + مرور — **نبودِ مهر AIZEN** در سطح ایستگاه — DESIGN_SYSTEM_AUDIT |
| `live-fm01-locked-1440.png` | فصل fm01 قفل | 1440×900 | اعلان قفل + لینک پیش‌نیاز — صحت گیت فصل |
| `resp-home-360.png` | Home | 360×800 | جاروی responsive |
| `resp-home-390.png` | Home | 390×844 | جاروی responsive |
| `resp-journey-360.png` | نقشهٔ مسیر | 360×800 | جاروی responsive |
| `resp-journey-390.png` | نقشهٔ مسیر | 390×844 | جاروی responsive |
| `resp-lesson-h1-360.png` | درس h1 (نوشتار) | 360×800 | Canvas مقیاس‌شده — RESPONSIVE_AUDIT |
| `resp-writing-360.png` | Canvas نوشتار あ | 360×800 | 294×294 داخل قاب — RESPONSIVE_AUDIT |

## شواهد غیرتصویری همراه

| مدرک | مسیر | محتوا |
| --- | --- | --- |
| `../LESSON_STATS_RAW.md` | تحلیل ۵۳ ایستگاه | خروجی `lesson_stats.py` (بازتولیدپذیر) |
| `../prereq-violations.txt` | ۱۶ تخلف گلیف | خروجی `prereq_audit.py` |
| `responsive-sweep.json` | (scripts ممیزی) | ۲۴ سلول جاروی responsive |
| خروجی curl 409 | در LIVE_WEBSITE_AUDIT §۳ | متن کامل خطا |
| VLM Home | در DESIGN_SYSTEM_AUDIT §۴ | ارزیابی طراحی مستقل |

## یادداشت روش

- اسکرین‌شات‌ها از مرورگر headless واقعی (Chromium) هستند — همان چیزی که کاربر می‌بیند (شبکهٔ واقعی، فونت‌های preload شده).
- برای بازتولید: `agent-browser set viewport W H && agent-browser open <url> && agent-browser screenshot <file>`.
- هیچ تصویری ویرایش/برش نخورده است.
