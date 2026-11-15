# AUDIT EVIDENCE INDEX — HANASO-KANA-AUDIT-01

> نمای کامل شواهد ممیزی — هر یافته به شواهد قابل‌ردیابی در این مخزن متصل است. مسیرها نسبت به ریشهٔ شاخهٔ `audit/HANASO-KANA-AUDIT-01`.

## ۱. اسکرین‌شات‌های Production (`ops/checkpoints/HANASO-KANA-AUDIT-01/evidence/browser/`)

مرورگر headless واقعی (Chromium/agent-browser)، سایت زنده `https://learn.kotodama.ir`، نسخهٔ `1.1.0-hanaso29-r01` (کامیت `5b503598`)، 2026-11-15. کاربر QA مستقل (cookie تازهٔ `hanaso_lid`) — Progress هیچ کاربر واقعی دست‌کاری نشد.

| فایل | URL | Viewport | سناریو | مرتبط با |
|---|---|---|---|---|
| `journey-desktop-fresh.png` | `/learn/kana-foundation-01/journey` | 1440 | نقشهٔ سفر؛ کارت‌های قفل با آیکون قفل در سمت راست | AUD-009 |
| `journey-mobile-fresh.png` | همان | 390×844 | همان در موبایل | AUD-009 |
| `journey-mobile-locked-click.png` | همان (کلیک کارت قفل) | 390×844 | کلیک روی کارت قفل | AUD-007 |
| `journey-mobile-locked-feedback.png` | همان | 390×844 | پیام «این درس هنوز باز نشده» — زیر fold، محو ~۱s | AUD-007 |
| `journey-desktop-h0-done.png` | `/learn/kana-foundation-01/journey` | 1440 | بعد از تکمیل h0 — کارت بازشده بدون قفل | AUD-009 (شاهد مقایسه) |
| `h0-anchor-desktop.png` | `/learn/kana-foundation-01/journey/stn-kana-h0` | 1440 | ایستگاه لنگر | پوشش |
| `h0-complete-stamp-desktop.png` | همان | 1440 | مهر تکمیل ایستگاه | شاهد مثبت |
| `h1-kana-card-writing-desktop.png` | `.../journey/stn-kana-h1` | 1440 | کارت کانا + بخش نوشتن؛ متن inline 16px | AUD-008 |
| `h1-writing-practice-desktop.png` | همان | 1440 | تمرین نوشتن (حالت راهنما) | پوشش |
| `h1-writing-free-mode-desktop.png` | همان | 1440 | نوشتن آزاد | پوشش |
| `h13-warmup-wrong-F3-reveal.png` | `.../journey/stn-kana-h13` | 1440 | پاسخ غلط → نردبان F1→F3 (Seed Case Sokuon) | AUD-015 شاهد مثبت؛ Seed ۱/۲ |
| `h13-gakkou-decode-options.png` | همان | 1440 | گزینه‌های خوانش がっこう (Seed Case گزینه‌های خوانش) | Seed ۳ |

**محدودیت صادقانه:** چهار تصویر اصلی مالک به‌صورت فایل در Workspace موجود نبودند (جستجوی کامل upload/download/hanaso-shots/owner_notes). اسکرین‌شات‌های بالا **بازتولید مستقل** همان وضعیت‌ها هستند، نه جایگزین فایل‌های اصلی.

## ۲. خروجی اسکریپت‌های ممیزی (`evidence/`)

| فایل | تولیدکننده | محتوا |
|---|---|---|
| `_subagent_a_results.txt` | `scripts/subagent_a_audit.py` | ممیزی زبانی ۵۸۶/۵۸۶ + ۹۲/۹۲؛ ۳۲ پرچم خام (پس از راستی‌آزمایی دستی: ۶ یافتهٔ واقعی، ۱۸ false positive مستند، بقیه شاهد سالم) |
| `_subagent_b_results.txt` / `.json` | `scripts/subagent_b_audit_final.py` (+ `build_taught_timeline.py`) | ممیزی اعتبار ۵۸۶/۵۸۶؛ same-sound pairs، hint leaks، untaught timeline، exact/near dups، shape stats |
| `inventory.json` | `scripts/audit_inventory.ts` (+ `gen_inventory_md.py` برای MD) | استخراج ماشینی کامل ۳۸ Station / ۵۸۶ Exercise / ۹۲ glyph از ماژول‌های TS واقعی Production |

## ۳. فایل‌های Source مبنای ممیزی (در کامیت `5b503598` — همان شاخهٔ ممیزی)

| مسیر | نقش |
|---|---|
| `apps/web/src/modules/curriculum/content/chapter-kana01.stations.ts` | ۳۸ ایستگاه + بلوک‌های آموزشی (ترتیب تدریس rule-step برای رد پرچم‌های untaught) |
| `apps/web/src/modules/curriculum/content/chapter-kana01.exercises.ts` | ۵۶۱ تمرین walk + ۲۵ گیت |
| `apps/web/src/modules/curriculum/content/chapter-kana01.practice.ts` / `.practice.exercises.ts` | ایستگاه‌های p1–p4 + guardrail headers |
| `apps/web/src/modules/curriculum/content/kana-items.ts` | رجیستری ۹۲ گلیف (romaji/hostWord) |
| `apps/web/src/modules/curriculum/content/kana-teaching.ts` | بلوک‌های تدریس قواعد |
| `apps/web/src/modules/curriculum/kana-romaji.ts` | **عیب AUD-005 اینجا با اجرای زندهٔ `scripts/test_romaji.ts` اثبات شد** (خروجی: がっこう→`がっkou` و ۱۳ واژهٔ دیگر) |
| `apps/web/src/lib/learner/session.ts` + `src/middleware.ts` | مبنای روش QA مستقل (mint خودکار cookie) |

## ۴. API زندهٔ Production (بررسی‌شده با curl، بدون احراز هویت)

| Endpoint | نتیجه | کاربرد در ممیزی |
|---|---|---|
| `GET /api/health` | `{version: 1.1.0-hanaso29-r01, commit: 5b503598...}` | PRODUCTION_BASELINE |
| `GET /api/ready` | DB PostgreSQL 18.6 OK | BASELINE |
| `GET /api/curriculum/journey?chapter=kana-foundation-01` | ۳۸ گره منطبق با Source (تطبیق تک‌به‌تک slug) | BASELINE + Inventory |

## ۵. گزارش‌های Subagent و اسناد ممیزی (همه در `ops/checkpoints/HANASO-KANA-AUDIT-01/`)

`PRODUCTION_BASELINE.md` · `KANA_CONTENT_INVENTORY.md` · `SUBAGENT_A_REPORT.md` · `SUBAGENT_B_REPORT.md` · `SUBAGENT_C_REPORT.md` · `FINDINGS_REGISTER.md` · `ROOT_CAUSE_PATTERNS.md` · `MISSION_2_CONTENT_FIX_BACKLOG.md` · `MISSION_3_UI_FIX_BACKLOG.md` · `FINAL_AUDIT_REPORT.md` · `CURRENT_STATE.md`

## ۶. منابع زبان‌شناختی مورد اتکا (ادعاهای مبتنی بر دانش استاندارد)

| ادعا | مرجع نوع | محدودیت |
|---|---|---|
| جدول gojūon / romaji Hepburn (مثل し=shi، を=wo ذره‌ای o) | جدول‌های استاندارد کانا (JLPT N5 / هر متد استاندارد) | دانش عمومی استاندارد؛ URL واحد لازم نیست |
| یوئون: きょ=/kjo/، きゅ=/kʲu/ | همان | — |
| ん قبل از p/b → [m] (assimilation) | آواشناسی استاندارد ژاپنی (مثل Vance, *An Introduction to Japanese Phonology*) | برای AUD-011 تصمیم نهایی قراردادی است (NEEDS_NATIVE_REVIEW) |
| مورا: っ/ん/ー هرکدام یک مورا؛ ゃゅょ پیوسته | آواشناسی استاندارد | — |

هیچ URL خارجی در طول ممیزی به‌عنوان مرجع باز و نقل‌قول نشده است (دانش زبانی استاندارد + راستی‌آزمایی ماشینی/دستی روی خودِ داده). موارد غیرقابل‌تأیید با اطمینان کامل، NEEDS_NATIVE_REVIEW برچسب خورده‌اند (۱ مورد: AUD-011).
