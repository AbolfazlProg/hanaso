# TASK-HANASO-20 — CURRICULUM REMEDIATION (اصلاح آموزشی سراسری)

> All 16 audit findings (UNTAUGHT_CONTENT_AUDIT) fixed + 5 more the new gate caught. Every fix follows the chain:
> Research (japanese-learning-kb / audit) → Finding → Pedagogical Decision → Code Change → Automated Test → Browser Verification.

## نقشهٔ کامل ۱۶+۵ مورد

| # | مورد | تصمیم آموزشی | محل رفع | تأیید |
| --- | --- | --- | --- | --- |
| 1 | ぜ (h5 ex-ind-1 かぜ) | سطر صریح در جدول داکوتن | h5 miniTable + ردیف せ/ぜ | گیت + ایستا |
| 2 | ば (h12 かばん) | نمایش خانوادهٔ ردیف は در همان ایستگاه | h12 miniTable (ば/び/ぶ) | گیت |
| 3 | で (h15 でんわ) | اصلاح یادداشت (だ→で) + نمایش در prereq | h15 prereq | گیت |
| 4 | ぴ (h15 lis-2 えんぴつ) | first-look صریح | h15 prereq + item ぴ | گیت + mutation |
| 5 | ぼ (lis-1 distractor) | first-look صریح | h15 prereq + item ぼ | گیت + mutation |
| 6 | ぽ (clo-1) | first-look صریح (+ نمایش در さんぽ از قبل) | h15 prereq + item ぽ | گیت |
| 7-9 | バ/ビ/ピ+ザ (k5 examples) | prereq «مشتقات کاتاکانا» قبل از مثال‌ها | k5 prereq | mutation + E2E |
| 10 | ジ+ャ (k6 ジャパン) | prereq «یُوئون و مشتقات کاتاکانا» | k6 prereq | mutation + E2E |
| 11 | ゼ (k6 プレゼント) | همان prereq | k6 prereq | mutation |
| 12 | ボ (k8 ボールペن) | item در prereq موجود k8 (ボ/ペ) | k8 prereq | گیت |
| 13 | ュ (k8 جدول) | همان k6 prereq (ャュョ) | k6 prereq | گیت |
| 14 | ファ/ティ/ヴ (k12 وعده) | **ایستگاه واقعی جدید** `stn-kana-k12-foreign` | station جدید | E2E S4.4 |
| 15 | ゼ تکرار k12 | پوشش توسط k6 prereq | k6 prereq | گیت |
| 16 | じ (h6 dec-4 じゅう) | سطر し/じ در جدول داکوتن h5 | h5 miniTable | گیت |
| +A | だ (h9 だいがく، h10 ともだち) | prereq h9 (بالاتر از هر دو استفاده) | h9 prereq | گیت (پیدا شده توسط گیت) |
| +B | ず (h10 みず) | prereq h10 | h10 prereq | گیت |
| +C | ぶ (h12 しんぶん) | سطر سوم miniTable h12 | h12 miniTable | گیت |
| +D | おおさか/えき/がくせい/がっころ readingها | استاندارد به قرارداد R1-03 | exercises (گیت TRANSCRIPT) | گیت |
| +E | タクシー (بدون audio) | null صادقانه در listenWords | k8 card | تست محتوا |

## اصول اجرا

- **هیچ وضعیت گلیفی برای عبور از CI تغییر نکرد** — همهٔ رفع‌ها با نمایش/تدریس صریح انجام شد.
- تعمیم مجاز ماند (قاعده در h5/h6/h15 تدریس شده) — «غافلگیری» ممنوع شد (گیت DERIVED-GLYPH-SHOWN).
- مشتقات کاتاکانا: پیش از اولین مثال/سنجشِ هر خانواده، یک بلوک prereq با reading فارسی + مثال واقعی.
- きょう و همهٔ واژه‌های هم‌کلاس: استاندارد به R1-03 (کیوو/اووساکا/اِکی/گاکوسِی/گَکّوو) + تعمیم گیت به برچسب گزینهٔ درست.

## پوشش ایستگاه جدید (k12-foreign)

- مفهوم برای مبتدی (چرا ژاپنی «f/ti/v» ندارد)، معرفی مرحله‌ای ァ/ィ/ヴ، سه rule-step با واژهٔ واقعی (ファイル/ティッシュ/ヴァイオリン)، کنتراست زندهٔ ファ≠フア، تمرین قبل از ارزیابی (۲ تمرین + warmup)، کارت مرجع، جمع‌بندی صادقانه.
- هیچ عنوان/هدف توخالی باقی نماند: k12 صادقانه «ردیف ワ/ヲ» شد؛ وعده به ایستگاه بعدی منتقل شد.
