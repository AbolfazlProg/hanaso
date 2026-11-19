# Lesson Engine — الزامات استخراج‌شده از Teaching Framework (با ارجاع کامل)

> مأموریت «HANASO Lesson Engine Foundation» — فاز ۱. منبع اصلی: مخزن `hanaso-teaching-framework`
> (clone از commit `4001e03`، سشن‌های ۱ و ۲ + PHASE 22). هر قاعده با فایل مبدأ ارجاع داده شده است.
> تفکیک شدت: **HARD** = validator رد می‌کند · **SOFT** = هشدار/قابل‌کالیبره (اعداد در `engine.config.ts`).

## ۱. معماری محتوایی سه‌سطحی (فصل/درس/ایستگاه)

| قاعده                                                                                                                                                                                                                                                                                      | منبع                                              | شدت    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | ------ |
| فصل = قِشر، درس = بُعد زمانی، آموزه = دادهٔ اتمی؛ ۱۱ فیلد درس                                                                                                                                                                                                                              | `curriculum/chapter-blueprint.md` §۲              | ساختار |
| فیلدهای الزامی فصل: can_do، level، dialogue (شخصیت/رابطه/مکان + متن + صوت ۲ نسخه از A2+)، target_vocab با نقش در مکالمه، target_grammar ≤۲، target_kanji ۱۰–۱۵، prerequisites، lessons (نقشهٔ ۱۳-مرحله)، practice_stations، review_targets ۶۰/۴۰، assessment، final_task، cultural_note ≤۲ | `chapter-blueprint.md` §۱                         | HARD   |
| مدل ۱۳-مرحلهٔ فصل با ادغام‌های مجاز (۹ با ۷/۸؛ ۴–۵ در یک ایستگاه شنیدار)                                                                                                                                                                                                                   | `curriculum/conversation-centered-learning.md` §۳ | HARD   |
| درس: micro_objective / prerequisite / new_knowledge / explanation / examples(۶ نوع) / guided_practice / independent_practice / skill_link / feedback_design / completion_check / next_link                                                                                                 | `chapter-blueprint.md` §۲                         | ساختار |
| قاعدهٔ ضدتکرار: هر داده یک خانهٔ تعریف (ID یکتا + first_def_chapter)؛ بقیه = ارجاع                                                                                                                                                                                                         | `chapter-blueprint.md` §سازگاری                   | HARD   |
| آرکی‌تایپ فصل: C-Dialogue / C-Kanji (از H2) / C-Review، نسبت ۴:۱                                                                                                                                                                                                                           | `chapter-blueprint.md` §انواع                     | SOFT   |

## ۲. ایستگاه (Station Blueprint)

- اجزای همیشگی: station_id (`ST-<domain>-<seq>`)، type (teaching/practice/review)، objective تک‌جمله‌ای، prerequisites، Introduction (teaching)، Learning Steps (فلوکش)، تعاملات، Feedback، Hints، Transition، Guided Application (۲–۳ گام آخر)، Completion (Exit Check)، اتصال‌ها (next/practice/SRS/conversation_link) — `implementation/station-blueprint.md` §۱. **HARD**
- سقف‌ها: Teaching ≤۵ (H0)…۹ (H2+) + ≤۳ Guided؛ Practice ۸–۱۵ آیتم — §۲.۵ + D-0014. **HARD (اعداد کالیبره، Q-017)**
- ادغام مجاز فقط «هم‌هدف»: G2+G3، V1+V2، K1+K2، L1+L2؛ حذف با دلیل QC — §۲. **HARD**
- Skip فقط گام‌های reference/optional؛ Replay همیشه؛ resume از همان گام؛ Exit تنها تکرار اجباری پس از ≥۲۴س — §۳. **HARD/SOFT**
- ضد-کلیک: انتقال خودکار گام نمایشی؛ بدون «تایید مشاهده»؛ Exit Check تنها سنجش — §۴. **HARD**
- مشخصهٔ دادهٔ YAML ایستگاه (ستون فقرات schema موتور): §۵ YAML.

## ۳. سه‌سطحی تدریس (D-0010/0011/0012)

- Teaching (Select/Spot/Complete، hint رایگان از تلاش ۱، نامحدود، نمرهٔ مخفی، ~۹۰٪ موفقیت) / Guided (Match/Order/Transform، hint از تلاش ۲، ۲ تلاش، ~۷۵٪) / Independent (متنوع Constructive، بدون hint، ۱ تلاش + بازخورد اصلاحی، ۶۵–۸۰٪) — `implementation/teaching-interaction-model.md` §۱. **HARD (درصدها SOFT)**
- سطح ۲ داخل Teaching Station (فاز پایانی)؛ سطح ۳ در Practice با همان StationRunner — بدون موتور موازی. D-0011. **HARD**
- قاعدهٔ طلایی: دشواری در Practice رشد می‌کند نه Teaching. **HARD**

## ۴. فلوکش‌های حوزه‌ای (ترتیب الزامی گام‌ها)

- **گرامر G0→G7**: Notice→Function→Form→Meaning→Examples(≥۳، anchor اول)→Contrast/Errors (بعد از ≥۲ مثال)→Guided Build→Return+Exit؛ g0/g7_line_ref الزامی (FonF)؛ حذف G5 فقط با دلیل QC؛ مقایسه‌های は/が → بعد از ≥۲ فصل — `implementation/grammar-interaction-blueprint.md` §۱+§۵. **HARD**
- **واژگان V0→V7 + Tierها**: T1 مسیر کامل (≤۱–۲ T1 در هر ایستگاه)، T2 تا V4 (V1+V2 ادغام)، T3 فشرده V1–V2؛ معنا قبل از موقعیت؛ collocation قبل از register؛ Everyday Usage ۹ مؤلفه → گام‌های V3/V5/V6 — `implementation/vocabulary-interaction-blueprint.md` §۱–۳. **HARD**
- **کانجی K0→K6**: خوانش فقط درون واژهٔ anchor (D-0006، toggle برای Q-001)، هر کانجی ≥۲ anchor word، ۲–۴ کانجی/ایستگاه، writing/recall هرگز در K0–K4، K5 اختیاری/Skip — `implementation/kanji-interaction-blueprint.md`. **HARD**
- **تلفظ P0→P5**: ادراک قبل از تولید؛ pitch تا A2 فقط شناسایی؛ حداکثر ≤۲ گام تلفظ در ایستگاه — `implementation/other-domains-interaction-blueprint.md` §الف. **HARD**
- **شنیدن L0→L5 (سیکل D-0007)**: Predict (بدون پاسخ غلط)→Gist→Targeted→Verify+Transcript (فقط بعد از ≥۲ شنیدن؛ ممنوع در شنیدن اول)→Reflect؛ هر شنیدن هدف مجزا — §ب + `templates/listening-template.md`. **HARD**
- **گفتار**: نردبان ۸-پله‌ای؛ هر فعالیت دقیقاً یکی از دقت/روانی — `domains/speaking.md` §۷–۸. **HARD**
- **خواندن R0→R5**: furigana کاهش تدریجی؛ متن بدون furigana فقط با پوشش ≥۹۵٪. **HARD**
- **نوشتن W0→W4**: گیرندهٔ واقعی (شخصیت‌های HANASO)؛ typing از W2+. **HARD**
- **کانا**: صدا-اول + trace از روز اول؛ ۴–۶ کانا/ایستگاه؛ هر کانا ≥۲ واژهٔ anchor — §و. **HARD**

## ۵. تعامل، بازخورد، Hint

- تاکسونومی ۱۰ نوع تعامل (Select/Spot/Match/Complete/Order-Build/Transform/Listen-Choose/Repeat-Record/Sort/Judge)؛ گزینه ۲–۴ (میانه ۳؛ باینری فقط معرفی اول)؛ Match ≤۴ جفت؛ Build ≤۴ تایل؛ یک تصمیم شناختی در هر تعامل — `research/micro-interaction-and-feedback.md` §۱ (Q-020). **HARD**
- typing آزاد در Teaching ممنوع؛ distractor از خطاهای ثبت‌شده (`common_errors`/`unnatural_contexts`/`similar_kanji`) با reason — §۱ + HR-C1 + D-0015. **HARD**
- بازخورد غلط ۴لایه (تصحیح→هدایت→Hint→توضیح+مثال)؛ بدون بازخورد رد نمی‌شود؛ هرگز خطاب به شخص؛ بازخورد صحیح = تأیید+چرا یک‌خطی — §۲. **HARD**
- Hint نردبانی H1→H2→H3 هر سه محتوا‌دار («دوباره فکر کن» ممنوع)؛ بعد از H3+صحیح → نمایش فرمول — §۳. **HARD**
- بازخورد پرامپتی در ≥۸۰٪ آیتم‌ها — QC سشن ۱ §۲۶.۴. **HARD**

## ۶. مکالمهٔ محوری و QC فصل

- **قاعدهٔ سه‌منشأ** (هر خط مکالمه: از فصل‌های قبل / هدف فصل / حدس‌پذیر از صحنه) — `curriculum/conversation-centered-learning.md` §۲.۳. **HARD** (+D-0016 منشأ چهارم مشروط با پرچم)
- طول مکالمه A1=۴–۶ نوبت، A2=۶–۱۰؛ هر بازگشت هدف جدید — §۲.۴ + ماتریس §۲ «قاعدهٔ نو». **HARD/SOFT**
- پوشش واژگانی متن‌ها ≥۹۵٪ — `domains/vocabulary.md` §۷ (Q-009). **HARD**
- درهم‌آمیزی ۶۰/۴۰ در مرور — `prerequisite-and-sequencing.md` §۵. **HARD**
- «همان مکالمه، همهٔ مهارت‌ها» + هر مهارت ≥۱ گام در هر سطح + هیچ مهارت >۴۰٪ گام‌ها (جز C-Kanji) — `implementation/four-skills-interaction-matrix.md` §۴. **HARD**
- سهم فارسی طبق سطح (H0 بالا→H4≈صفر)؛ مثال/تمرین/صدا همیشه ژاپنی — §۲ جدول. **HARD (آستانه‌ها SOFT)**
- تسلط = D-0009 سه‌شرطی (≥۸۰٪ بازیابی تأخیری + استقلال + ماندگاری cumulative) — `assessment-and-mastery.md` §۳. **HARD (آستانه کالیبره)**
- برچسب شواهد: هر تصمیم محتوایی با SOURCE-xx؛ بدون شواهد = `[Hypothesis]` برچسب‌دار؛ برچسب‌ها در محتوا حفظ شوند — QC #۷+#۱۰. **HARD**
- مکالمهٔ فصل «سه‌منشأ» audit + تولید گزارش audit فصل — QC §۲۶. **HARD**

## ۷. پارامترهایی که موتور باید کانفیگ‌پذیر نگه دارد (نه هاردکد)

سقف گام‌ها (Q-017)، تعداد گزینه (Q-020)، افق SRS (واژه ۷/۳۰، کانجی ۱۴/۶۰)، کانجی/فصل (Q-004)، کانا/ایستگاه، T1/ایستگاه، پوشش (Q-009)، transcript timing (Q-002)، آستانه‌های mastery (Q-007)، تعداد شنیدن هدفمند (Q-011)، نسبت نمایش:تعامل (۵۵:۴۵→۴۰:۶۰)، نسبت C-Review (۴:۱).
