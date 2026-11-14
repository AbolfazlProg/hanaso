# IMPLEMENTATION_MAPPING — نگاشت تحقیق به معماری واقعی HANASO (TASK-LEARNING-14 CP-03)

> ۲۰۲۶-۱۱-۱۱ · شاخه: `tl14-foundations-redesign` · مبنای معماری: بازبینی کامل کد (StationRunner ۱۸۳۰ خط، ExerciseSession، client-transport، route.ts، validation.ts، kana-items.ts، walk-persistence، جیت‌های تست).
> اصل حاکم: **از سیستم موجود تا حد ممکن استفاده شود؛ معماری موازی ممنوع.** زیرساخت اسلاید (آرایهٔ بلوک + step + ریل + prev/next + resume) از قبل هست؛ این مأموریت ۳ بلوک جدید + بازنویسی دادهٔ ۸ ایستگاه + ۶ گیت جدید می‌افزاید.

## ۱) خلاصهٔ تصمیم‌های معماری

| نیاز تحقیق                                   | راه‌حل معماری                                                                                                                                                  | تغییر Schema؟                   |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| اسلاید = یک قدم یادگیری                      | هر اسلاید یک بلوک در `blocks[]` موجود — ریل/ناوبری/resume رایگان                                                                                               | خیر                             |
| بازخوانی پیش‌نیاز + معرفی اولین‌نگاه         | بلوک جدید **`rule-prereq`**                                                                                                                                    | بله (add-only در TeachingBlock) |
| مقایسهٔ زندهٔ جفت + beat dots                | بلوک جدید **`rule-contrast`**                                                                                                                                  | بله (add-only)                  |
| اسلاید notice/explain/predict تک‌مفهومی      | بلوک جدید **`rule-step`** (پیش‌بینی = فیلد `ask`)                                                                                                              | بله (add-only)                  |
| ریز-پرسش بدون نمره (پیش‌بینی/کدام تغییر کرد) | فیلد `ask` روی rule-step و rule-contrast — **دقیقاً الگوی `dialogue-player.prediction`**: نمره‌دهی سروری از مسیر `grade-block`، unscored، reveal در هر دو حالت | خیر (الگوی موجود)               |
| کاربرد ۱-۲ واژه                              | بلوک موجود `example-set` (کاهش تعداد قلم به ۱-۲)                                                                                                               | خیر                             |
| تمرین ۱-۲ سؤالی                              | بلوک موجود `exercise` (تجزیهٔ بلوک‌های ۳-۵تایی)                                                                                                                | خیر                             |
| کارت مرجع نهایی                              | بلوک موجود `rule-card` در انتهای deck (نقش: جمع‌بندی مرجع)                                                                                                     | خیر                             |
| اعلام گلیف‌های معرفی‌شده در درس              | فیلد جدید اختیاری `Station.introducesGlyphs?: string[]`                                                                                                        | بله (add-only)                  |
| ممنوعیت محتوای آموزش‌نداده (مکانیکی)         | ماژول خالص جدید `modules/curriculum/glyph-budget.ts` + گیت‌های §۵                                                                                              | بله (فقط validation)            |

## ۲) نوع‌های بلوک جدید — شکل دادهٔ دقیق (types.ts)

```ts
// یک قلم پیش‌نیاز: گلیف تکی یا واژه
interface RulePrereqItem { glyph?: string; word?: string; readingFa: string; noteFa?: string }

{ kind: 'rule-prereq'; id: string; titleFa: string; items: RulePrereqItem[] }[]
// هدف deck: بازخوانی (بازیابی فعال) یا اولین‌نگاه (مثل やゆよ بزرگ در H6).
// گلیف‌های «اولین‌نگاه» فقط از طریق Station.introducesGlyphs برای گیت اعلام می‌شوند.

interface ContrastWord { ja: string; readingFa: string; fa: string; highlight: string[]; beats: number }

{ kind: 'rule-contrast'; id: string; titleFa?: string;
  a: ContrastWord; b: ContrastWord;
  ask?: MicroAsk }   // ریز-پرسش اختیاری (مثلاً «کدام سه ضربه بود؟»)

{ kind: 'rule-step'; id: string; role: 'notice' | 'explain';
  titleFa?: string; bodyFa: string;              // ≤ ۳ جمله — گیت PASSIVE-RUN متن را نمی‌سنجد، بازبینی انسانی EQA
  word?: { ja: string; readingFa: string; fa: string; highlight: string[]; beats?: number };
  miniTable?: { headers: string[]; rows: string[][] };   // ≤ ۳ ردیف
  ask?: MicroAsk }                                 // predict (پیش‌بینی قبل از توضیح کامل)

interface MicroAsk { questionFa: string; options: { id: string; label: string }[];
  correctOptionId: string; revealFa: string }
```

**`highlight: string[]`** = زیررشته‌های واژه که باید برجسته شوند (مثلاً `['う']` در こ+う، یا `['゛']`) — رندر با span تأکید (توکن indigo-wash).

## ۳) نگاشت فایل‌به‌فایل

| #   | فایل                                                         | تغییر                  | ریز جزئیات                                                                                                                                                                                                          |
| --- | ------------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/modules/curriculum/types.ts`                            | افزودنی                | ۳ نوع بلوک جدید در TeachingBlock + `Station.introducesGlyphs?`                                                                                                                                                      |
| 2   | `src/modules/curriculum/client-transport.ts`                 | افزودنی                | ClientTeachingBlock: انواع جدید **بدون** `ask.correctOptionId` و `ask.revealFa` (الگوی prediction موجود)؛ `findBlockAnswer` به‌روزرسانی: `rule-step`/`rule-contrast` → option-equality + reveal                     |
| 3   | `src/app/api/curriculum/station/route.ts`                    | افزودنی                | `grade-block`: شاخهٔ انواع جدید (unscored؛ بدون incrementAttempts — هم‌رفتار prediction)                                                                                                                            |
| 4   | `src/components/curriculum/station-runner.tsx`               | افزودنی                | BlockView: سه case جدید + کامپوننت ریز `MicroAskPanel` (الگوی DiscoveryBlock: انتخاب → POST grade-block → reveal در هر دو حالت) + پخش دوتایی A~B در contrast (setTimeout ~۶۰۰ms، هر دو از exampleAudioByWord)       |
| 5   | `src/app/learn/[chapter]/journey/[station]/page.tsx`         | جزئی                   | گذراندن `exampleAudioByWord` به بلوک‌های جدید (موجود — فقط مصرف جدید)؛ بدون تغییر منطق rule-listening                                                                                                               |
| 6   | `src/messages/fa.ts`                                         | افزودنی                | رشته‌ها: عنوان پیش‌نیاز، «پخش هر دو»، «ضربه»، برچسب نقش اسلاید (مشاهده/توضیح/پیش‌بینی)، پیام‌های reveal                                                                                                             |
| 7   | `src/modules/curriculum/glyph-budget.ts`                     | **جدید**               | تابع خالص تجزیه: `decompose(word) → { base: string[], rules: RuleMark[] }` — داکوتن→پایه+H5 · هان‌داکوتن→پایه+H15 · ゃゅょ→H6 · っ→H13 · ー→K8 · ゔ/کوچک‌های خارجی→K12(پرچم موج دوم) + جدول گلیف‌پایه از KANA_ITEMS |
| 8   | `src/modules/curriculum/validation.ts`                       | افزودنی                | ۶ گیت §۵ (بر پایهٔ glyph-budget + دادهٔ ایستگاه‌ها)                                                                                                                                                                 |
| 9   | `src/modules/curriculum/content/chapter-kana01.stations.ts`  | **بازنویسی ۸ ایستگاه** | H4/H5/H6/H7/H13/H15/K8: جایگزینی الگوی ۸بلوکی با deck اسلایدی (نقشهٔ کامل §۶) · K13: افزودن deck کاربرد دو خط · introducesGlyphs اعلام می‌شود                                                                       |
| 10  | `src/modules/curriculum/content/chapter-kana01.exercises.ts` | اصلاح + تعدیل          | رفع Q1-Q4 ممیزی (فهرست §۷) + تقسیم به بلوک‌های ۱-۲تایی (در stations.ts) + حذف/جایگزینی سؤال‌های معیوب                                                                                                               |
| 11  | `tests/unit/curriculum-content.test.ts`                      | افزودنی + به‌روزرسانی  | گیت‌های جدید سبز روی محتوای بازنویسی‌شده + کیس‌های نقض (گلیف آموزش‌نداده در گزینه → خطا؛ آوانگاسی ناسازگار → خطا؛ ۳ بلوک خواندنی پیاپی → خطا)                                                                       |
| 12  | `tests/unit/ui/rule-slides.test.tsx`                         | **جدید**               | رندر استاتیک: contrast هر دو واژه + beat dots + دکمهٔ پخش · step با word و highlight · prereq با فهرست؛ تعامل: MicroAskPanel با fetch-stub (الگوی quiz-feedback-flow)                                               |
| 13  | `tests/unit/curriculum-content.test.ts` (کیفیت‌های موجود)    | حفظ                    | شمار ایستگاه (۳۱) و ۹۲ کانا و جریان گیت تسلط تغییر نمی‌کند                                                                                                                                                          |

**بدون تغییر (قراردادهای حفظ‌اجباری):** ExerciseSession و نردبان F1-F3 و auto-next · walk-persistence (شمات v1 — بلوک‌ها داده‌اند؛ هیچ فیلد جدید لازم نیست) · progress-machine و رویدادها · FSRS (fsrsItems/kn-· not-integrated را جعل نکن) · journey-map و قفل فصل · رجیستری‌های صوتی و ExampleAudioButton و useAudioToggle · KanaCard و WritingEngine و AIZEN · گیت تسلط M-K1..K5 · SKL-013 (مسدودسازی کلید پاسخ در انتقال کلاینت — برای ask های جدید هم اعمال می‌شود).

## ۴) جریان دادهٔ ریز-پرسش (هم‌نما با prediction موجود)

```
دادهٔ سرور (correctOptionId + revealFa دارد)
  → toClientStation: هر دو فیلد حذف (SKL-013)
  → MicroAskPanel: انتخاب کاربر → POST /api/curriculum/station {action:'grade-block', blockId, answer:{optionId}}
  → route: findBlockAnswer (server, روی دادهٔ کامل) → outcome {correct, revealFa} — در هر دو حالت reveal
  → UI: بازخورد توضیحی + امکان تلاش دوباره (بدون نمره/بدون گیت حرکت)
```

## ۵) گیت‌های اعتبارسنجی جدید (validation.ts)

| گیت                   | منطق                                                                                                                                                                                                                                                                                                              | چرا                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| GLYPH-BUDGET-v2       | همهٔ سطوح متنی (patternJa · سلول‌های جدول rule-card/miniTable · example ja همهٔ نقش‌ها · promptJa · گزینه‌های کانایی · clozeTokens · chips · rule-prereq/contrast/step) → `decompose` → گلیف‌پایه ∈ تجمعی(تا این ایستگاه) ∪ introducesGlyphs این ایستگاه ∧ قاعدهٔ نشانه (H5/H15/H6/H13/K8) با order ≤ این ایستگاه | بند ۱۰ تحقیق؛ ریشه‌یابی U1-U3 |
| TRANSCRIPT-CONSISTENT | نگاشت word→readingFa در سراسر فصل (example-set، promptJaReading، ContrastWord، rule-step.word) — هر واژه یک خوانش یکتا                                                                                                                                                                                            | رفع Q1                        |
| OPTION-GLYPH          | زیرمجموعهٔ GLYPH-BUDGET روی گزینه‌ها/chips                                                                                                                                                                                                                                                                        | رفع U1 در گزینه‌ها            |
| RULE-LISTENING-SHAPE  | rule-listening دقیقاً ۲ گزینهٔ کانایی + promptJa دارای دارایی نیست لازم نیست (دارایی در page حل می‌شود) — فقط شکل                                                                                                                                                                                                 | شکاف MCQ-THREE                |
| PASSIVE-RUN           | حداکثر ۲ بلوک پیاپی از {scene, rule-card, example-set, wrap-up, rule-step, rule-prereq}                                                                                                                                                                                                                           | اجرای مکانیکی قاعدهٔ KB       |
| PREREQ-DATA           | ایستگاه دارای هر بلوک rule-* باید introducesGlyphs اعلام کند                                                                                                                                                                                                                                                      | دادهٔ گیت ۱                   |

## ۶) نقشهٔ بازنویسی محتوا (CP-04) — هر ایستگاه

**H4 (طول مصوت + مفهوم مورا) — گونهٔ A+C، ~۱۴ اسلاید:** الگوی کامل در FOUNDATIONS_TEACHING_RESEARCH §۱۲ (اسلایدها ۱-۱۴). مصارف صوتی: いえ·いいえ·え·ええ·えき (دارایی). تمرین‌های موجود حفظ: cloze こ_う، dec ها (پس از اصلاح آوانگاسی)، lis دو جهت، asm (با اصلاح asm-1). واژه‌های بدون دارایی (こうこう·おおきい·おおさか·くうき·あさ): فقط دیداری — طبق DD-081.

**H5 (داکوتن) — گونهٔ B، ~۱۲ اسلاید:** prereq (か/さ + تمرین گلو) → notice がくせい (゛ برجسته) → explain → contrast ここ/ごご (صوتی ✓✓ + ریز-پرسش) → mini-table تبدیل‌ها → guided (cloze か_く + خوانش→کانا) → apply (かぞく، かいぎ) → retrieve (rule-listening + T2) → rule-card مرجع → asm → wrap-up.

**H6 (یُوئون) — گونهٔ B، ~۱۵ اسلاید:** prereq (き/し + **اولین‌نگاه ゃゅょ/やゆよ بزرگ-کوچک جفت‌جفت**) → notice きょう (ょ برجسته) → explain (کوچک=چسبیده=یک ضرب) → contrast きょう/きよう (صوتی きょう؛ beats ●●●/●●●●) + ریز-پرسش «کدام یک‌ضرب بود؟» → mini-table فشرده/جدا (きゃ/きや، しゃ/しや — **حذف ردیف びょういن**) → predict (かいしゃ) → guided (cloze اندازه — اکنون قانونی پس از معرفی やゆよ + ساخت きょう) → apply (いしゃ) → retrieve (rule-listening + T2) → rule-card مرجع → asm → wrap-up. جفت びょういん/びよういن → به فهرست «مثال خواندن» H12 منتقل می‌شود (پس از آموزش ひ).

**H7 (ん) — گونهٔ A، حفظ بلوک‌های موجود + افزودن deck:** writing-practice و kana-card و بازیابی/شنیداری سرِ جای خود؛ بین کارت ん و تمرین‌ها: prereq (شمارش ضرب さ/せ) → notice せんせい (صوتی ✓، ん برجسته) → explain (مورای کامل) → contrast せん/せ + せんせい/せんせ(برچسب نادرست) با beats → guided → rule-card مرجع → تمرین‌های موجود → wrap-up. **اصلاح متن خراب برچسب صداقت (「ん」).**

**H13 (سوکوئون) — گونهٔ A، ~۱۴ اسلاید:** prereq (が + ょ + مورا) → contrast شنیداری がっこう (صوتی ✓) در برابر がこう(برچسب نادرست) → notice がっこう (っ برجسته) → explain (ضربهٔ سکوت) → mini-table با/بدون っ → guided (ساخت がっこう از قطعه‌ها + cloze っ/つ) → apply (ざっし صوتی ✓، ちょっと) → retrieve (rule-listening + T2) → rule-card مرجع → asm → wrap-up.

**H15 (هان‌داکوتن) — گونهٔ B، ~۱۲ اسلاید:** prereq (ردیف は + ゛) → notice さんぽ (صوتی ✓، ゜ برجسته) → explain (دایره=پ، فقط ردیف は) → contrast سه‌گانه は/ば/ぱ (به‌صورت دو contrast دوتایی: は↔ば، ば↔ぱ) → guided (cloze ゜/゛) → apply (えんぴつ صوتی ✓) → retrieve + asm → rule-card مرجع → wrap-up. (بلوک‌های kana-card/writing سرِ جایشان.)

**K8 (کوچوئون‌پو) — گونهٔ B، ~۱۲ اسلاید:** prereq (مصوت‌های کاتاکانا + بازخوانی قاعدهٔ H4) → notice コーヒー (صوتی ✓، ー برجسته) → explain (ー = تکرار مصوت قبل؛ فقط کاتاکانا) → contrast コーヒー/コヒー(نادرست) + beats → mini-table با/بدون ー → guided (cloze جای ー) → apply (ジュース صوتی ✓، ノート) → retrieve (rule-listening + decode) → rule-card مرجع → asm → wrap-up.

**K13 (کاربرد دو خط) — گونهٔ C، افزودنی ~۷ اسلاید به ایستگاه موجود:** prereq (هر دو خط) → تجربه: «این واژه‌ها کدام خط را می‌خواهند؟» (ねこ/コーヒー/ゴダ… نام خود کاربر) → explain (وام‌واژه/نام/تأکید → کاتاکانا؛ واژهٔ بومی/گرامر → هیراگانا) → contrast ねこ✓/ネコ (نمایش هر دو، قاعدهٔ انتخاب) → guided (انتخاب خط برای ۳ واژه) → retrieve. بدون تغییر ادامهٔ ایستگاه (نام خودت/character-scene).

## ۷) اصلاح‌های سؤال (CP-06) — فهرست عملیاتی

| شناسه                          | ایراد (ممیزی)                                                 | اصلاح                                                                                                             |
| ------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| ex-kana-h4-dec-1..4            | پاسخ درست با خوانش آموزشی تناقض (کوکو↔کووکوو)؛ تفکیک با اعراب | گزینه‌ها با قرارداد یکتا: درست «کووکوو» / خطا «کوکو» (حذف کشش) / خطا «گووکوو» (داکوتن) — promptJaReading هم‌قانون |
| ex-kana-h4-asm-1               | گزینهٔ مرده «آساا»                                            | جایگزینی با خطای نوع‌شناسی (کوتاه‌سازی هر دو مصوت)                                                                |
| ex-kana-h4-asm-2، dec-2، dec-4 | آوانگاسی ناسازگار                                             | هم‌قانون‌سازی با مثال‌ها (کووکی/اووکیی/اووساکا)                                                                   |
| ex-kana-h6-clo-1               | گزینه‌های よ/や آموزش‌نداده                                   | پس از معرفی やゆよ در prereq اسلایدی H6 قانونی می‌شود؛ rationale گزینه-c از «ردیف دیگری» به «اندازه» تغییر می‌کند |
| جدول H6 (بلوک)                 | ردیف びょういん (ひ/ん/よ آموزش‌نداده)                        | حذف از H6؛ انتقال مثال به خواندنِ H12                                                                             |
| برچسب صداقت H6/H7              | متن خراب/گنگ                                                  | بازنویسی                                                                                                          |
| سایر dec/asm کانایی            | بازبینی همه علیه قرارداد آوانگاسی                             | اسکن مکانیکی با گیت TRANSCRIPT-CONSISTENT                                                                         |

## ۸) ریسک‌ها و برنامهٔ اجرا

| ریسک                                                                    | کاهش                                                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| شکستن تست‌های شمارشی موجود (شمار بلوک/تمرین)                            | به‌روزرسانی همان تست‌ها در همان تغییر؛ اجرای vitest پس از هر موج محتوا                      |
| loadChapterBundle fail-fast: گیت جدید = سرور بالاآمدنی تا محتوا سبز شود | گیت + محتوا در همان کامیت (قاعدهٔ موجود پروژه)                                              |
| SKL-013 برای ask های جدید                                               | تست نشت کلید (الگوی موجود 267-276 curriculum-content.test.ts) برای انواع جدید گسترش می‌یابد |
| گلیف ー در محتوای هیراگانایی قدیمی (نباید باشد)                         | GLYPH-BUDGET خودش می‌گیرد؛ اسکن اولیه قبل از بازنویسی                                       |
| K13 بدون تغییر type ایستگاه (integrate)                                 | بلوک‌های جدید مستقل از type اند؛ PREREQ-DATA فقط با وجود بلوک rule-* فعال می‌شود            |

**ترتیب اجرای CP-04..CP-06 (یک موج پیوسته):** موتور (§۳ ردیف‌های ۱-۸) → محتوای H4 به‌عنوان نمونهٔ مرجع + تست‌های UI → بقیهٔ ۷ ایستگاه → اصلاح تمرین‌ها → گیت‌ها + کیس‌های نقض → vitest/tsc/eslint/prettier/EQA کامل → CP-07 (مرورگر ۳۹۰/۱۴۴۰ + اسکرین‌شات) → CP-08.
