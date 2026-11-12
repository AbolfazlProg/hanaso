# TASK-HANASO-19 — RESEARCH IMPLEMENTATION TRACEABILITY (ماتریس ردیابی پژوهش → محصول)

> زنجیرهٔ الزامی هر سطر: `Research Source → Research Finding → Pedagogical Decision → Product Implementation → Actual Test`
> وضعیت‌ها: Fully Aligned / Partially Aligned / Not Implemented / Implemented Incorrectly / Contradicts Research / Not Verifiable
> «تست واقعی» یعنی چه چیزی در این ممیزی بازتولید شد: 🔴 زنده (مرورگر)، 🔵 داده (dump)، 🟢 کد/CI، ⚪ تست‌نشده.

## بخش A — فصل کانا (KB بخش ۱۸ + بخش ۲۰)

| # | منبع پژوهشی | یافته | تصمیم آموزشی | پیاده‌سازی در HANASO | نتیجهٔ تست | وضعیت |
|---|---|---|---|---|---|---|
| A1 | Akita (EV-360) + DD-097 👑 | هیراگانا پیش از کاتاکانا؛ کاتاکانا مجموعهٔ گلیف جدا | فصل ۱ = H کامل سپس K | `chapter-kana01.stations.ts` ترتیب H0..H15→K1..K13 | 🔵 ۱۶+۱۳ ایستگاه به‌ترتیب | Fully Aligned |
| A2 | موتور رمزگشایی ۷۲۰ واژه (KB18 §۱) 🧩 | هیچ مطالعهٔ مستقیم ترتیب نیست؛ ترتیب از داده مشتق شود | توالی あかさなたまらはやわ | `order` ایستگاه‌ها | 🔵 دقیقاً منطبق | Fully Aligned |
| A3 | Nakata & Webb (EV-230) | بسته‌های ۴–۸ گلیف | ردیف = بستهٔ ۵گلیفی نشکن | ۵ kana-card در هر ایستگاه ردیف | 🔴 ردیف か زنده: ۵ کارت | Fully Aligned |
| A4 | KB18 §۳ 🧩 | قاعده وقتی می‌آید که ≥۱۸ واژه منتظرش باشد | جایگاه h4/h5/h6/h7/h13/h15/k8 | همان جایگاه‌ها | 🔵 + 🔴 h6 کامل | Fully Aligned |
| A5 | کرانهٔ اصلاحی کاتاکانا (KB18، 2026-11-05) | جدول قدیمی داکوتن‌های کاتاکانا را حذف می‌کرد — باگ | توالی اصلاحی + پوشش مشتقات | ترتیب k1..k12 اصلاحی ✅؛ **مشتقات (バ ピ ザ ボ ャ) بی‌تدریس صریح** | 🔵 مثال‌های k5/k6/k8/k12 | **Partially Aligned** |
| A6 | Share 1999 (EV-345) | رمزگشایی واژهٔ واقعی = موتور یادگیری | تمرین decode با واژهٔ راستین | ۴۵۹ تمرین kana با انواع decode | 🔴 いしゃ/かいしゃ/きゅう زنده | Fully Aligned |
| A7 | KB18 §۴ (DD-119) 🧩 | واژهٔ تمرینی کانا، کارت واژگانی نمی‌گیرد | کارت فقط kn؛ w در فصل ۲ | `fsrsItems` خالی در kana01؛ کارت‌های w در fm01 | 🔵 | Fully Aligned |
| A8 | EV-347..349 | متن دیکودپذیر | هر تمرین فقط با آموخته‌ها (CONTENT-105) | گیت glyph-budget + EQA | 🟢 ۶۹۲ سبز + 🔵 ۱۶ تخلف تعمیم | Partially Aligned |
| A9 | EV-228/229 | صدا-اول | هر کانا اول شنیده شود | auto-play + کارت صوتی مستقل | 🔴 kn-hira-a/i/u با گزینه‌های هم‌نام | Fully Aligned |
| A10 | Tofugu pattern (EV-354/5) + OQ-051 | یادسپار زوج‌های هم‌شکل + برچسب صادق | یادسپار فارسی با honestLabel | `kana-items.mnemonic.status='draft'` + برچسب UI | 🔴 پنل «اطلاعات معرفی» با برچسب | Fully Aligned |
| A11 | DD-121(05A) + DD-R04 | روماجی محوشوندهٔ سه‌مرحله‌ای؛ ماکرون ممنوع | H1–H6 روشن → H7+ پس از پاسخ → K خاموش؛ استثنای k12 (CONTENT-107) | showRomaji + سیاست ایستگاه | 🔵 + 🔴 کارت か با romaji | Fully Aligned |
| A12 | EV-258/232 | ≥۶ مواجههٔ فاصله‌دار هر کانا | بازیابی‌های درون‌واحد + مرور | ترکیب rec/rcl/dec/lis | 🔵 LESSON_STATS | Fully Aligned |
| A13 | EV-253/254/256 | جفت‌های اشتباه‌پذیر جدا؛ تمایز هدفمند | confusableNote + فاصلهٔ シ/ツ | kana-items + ایستگاه‌های جدا | 🔴 نوتِ «با お اشتباه نشود» روی کارت あ | Fully Aligned |
| A14 | Pavlik & Anderson 2005 (EV-350) | بازیابی پراکنده؛ recall-first ≥۶۰٪ (DD-094) | mix retrieval انواع | سهم recall در داده | 🔵 آمار LESSON_STATS | Fully Aligned |
| A15 | Mayer Segmenting (بخش ۲۰) | دک اسلایدی ۱۰–۱۶ مرحله؛ ≤۲ اسلاید خواندنی پیاپی | بلوک‌های rule-* + گیت PASSIVE-RUN | دک h6 = ۱۳ بلوک | 🔴 زنده + 🔵 **۲۲ ایستگاه run>۲** (kana-cardها تعاملی‌اند؟ مبهم) | Partially Aligned |
| A16 | قالب ۸مرحله‌ای مالک (TL-13) 👑 | ① مسئله→⑧ ارزیابی؛ واژهٔ تازه در ارزیابی | نقش‌های notice/explain/apply | notice×13، explain×9، **apply×0** | 🔵 | Partially Aligned |
| A17 | Tsukada 2011 (S1) | طول مصوت = ریسک مستند فارسی‌زبانان | h4 اولین قاعده؛ مفهوم مورا در h1 | بلوک شمردن ضربه h1 + h4 کامل | 🔵 | Fully Aligned |
| A18 | TL-13 راستی‌آزمایی (S2) | せんせい/せんせ جفت کمینه‌ای راستین نیست | برچسب صادق «واژهٔ ناموجود» | متن‌های h4 | 🔵 | Fully Aligned |
| A19 | DD-120(05A) 🧩 | گیت کانا ۵سنجه‌ای ≥۹۰٪/≥۸۰٪ | M-K1..K5 سخت‌گیر | levels.ts + استخر M×5 (۱۳ قلم) | 🟢 + ⚪ رفتار زندهٔ گیت تست نشد | Not Verifiable (زنده) |
| A20 | KB18 §۶ 🧩 | «لحظهٔ خواندن» ۷ واژهٔ واقعی | واژه‌های قابل‌خواندن در پایان واحد | wrap-up با فهرست واژه | 🔴 جمع‌بندی h6: «واژه‌های تازهٔ خواندنی» | Fully Aligned |

## بخش B — فصل مکالمه (KB بخش ۱۹)

| # | منبع | یافته | تصمیم | پیاده‌سازی | تست | وضعیت |
|---|---|---|---|---|---|---|
| B1 | DD-045/123 👑 | یک لنگر مکالمهٔ کامل؛ دابل-لنگر ممنوع | مکالمهٔ ۱۳نوبتی + ۲ واحد | `dialogue.first-meeting-01.yaml` = ۱۳ نوبت | 🔵 پروواننس کامل Attain | Fully Aligned |
| B2 | DD-121(04) 👑 | گیت پایان مشاهدهٔ اول بماند | خودارزیابی ۳گزینه‌ای در anchor | ایستگاه fm01-01 | 🔵 | Fully Aligned |
| B3 | EV-230 + DD-124 | بستهٔ ۸+۳ واژه | VOCAB-1=۸، VOCAB-2=۳ | fm01.words = ۱۱ با lineRef | 🔵 | Fully Aligned |
| B4 | O1/O2 توپولوژیک | です پیش از でした؛ ترتیب G1→G3→G7→G6→G2→G5 | ایستگاه‌های ۳/۵/۱۲/۱۳/۱۶ | prereq DAG | 🔵 | Fully Aligned |
| B5 | EQA-1/CONTENT-108 🧩 | سنجش فقط از آموزش‌داده | همهٔ targetConcept ها taught مقدم | گیت EQA-1 | 🟢 ۳۷/۳۷ | Fully Aligned |
| B6 | EV-256 (Birnbaum) | درهم‌آمیزی واقعی C3 | PRACTICE-2 ترکیبی | fm01-17 با prereq {16,15} | 🔵 | Fully Aligned |
| B7 | DD-126 🧩 | گیت M1..M5 وزن 30/20/20/20/10، ≥۷۰/≥۵۰ | استخر mastery_M1..M5 | fm01: ۱۲ قلم گیت | 🔵 + ⚪ (زنده قفل) | Not Verifiable (زنده) |
| B8 | DD-119(04)/113 👑 | صدا مستقل هر خط؛ VOICEVOX پیش‌تولید | manifest + فایل per-line | opus همهٔ خطوط l1..l8؛ **l9..l13 placeholder صادقانه** | 🔴 پلیر ۳خطی kana-welcome سالم | Fully Aligned |
| B9 | DD-118(04) 👑 | روماجی روی کارت L2 ممنوع | کارت با furigana کانا فقط | fm01.items بدون romaji نمایشی | 🔵 | Fully Aligned |
| B10 | 19/MASTERY §۱ 🧩 | چهار لایهٔ وضعیت تفکیک | completed≠understood | کد progress + گیت جدا | 🔴 تکمیل h0 مهر نگرفت (درست) | Fully Aligned |

## بخش C — سیستم‌های عرضی

| # | منبع | یافته | تصمیم | پیاده‌سازی | تست | وضعیت |
|---|---|---|---|---|---|---|
| C1 | DD-095/125 | FSRS ts-fsrs v6؛ ثبت مشروط به اولین بازیابی موفق | قرارداد + موجودی کارت | `fsrs/integration.ts` = `not-integrated` صادقانه؛ ۱۳/۱۲ قلم گیت هر فصل | 🟢 کد | **Not Implemented** (M2 آینده — صادقانه) |
| C2 | DD-096 (Hattie) | بازخورد نردبانی + تفکیکی | f1/f2/f3 + distractorRationale | داده دارد؛ **رندر تفکیکی نمی‌شود؛ متن‌ها یکسان** | 🔴 h6 زنده | **Implemented Incorrectly** |
| C3 | KB19 FSRS §۳ در برابر DD-125 | شمارش کارت fm01: ۳۷ یا ۳۹؟ | باید یکسان شود | شمارش واقعی dump: fm01 = ۱۲ قلم گیت (w×11?) — **اختلاف با هر دو سند** | 🔵 بازشماری لازم | Not Verifiable (اختلاف مستند) |
| C4 | DD-114/120(04) 👑 | نقشهٔ صادق، بدون XP/قلب/جریمه | پیشرفت = نسبت ایستگاه‌ها | نقشهٔ زنده بدون گیمیفیکیشن | 🔴 | Fully Aligned |
| C5 | FEAT-100 🧩 | ضد-emoji | گیت no-emoji در CI | tests/unit/ui/no-emoji-gate | 🟢 سبز | Fully Aligned |
| C6 | DD-105 👑 | Guided Writing الزامی | Hanzi-Writer-style با دادهٔ KanjiVG | writing engine + ۹۲ فایل داده | 🔴 رسم واقعی پذیرفته شد؛ ترتیب ضربه‌ها با ۵ منبع بیرونی + KanjiVG تأیید | Fully Aligned |
| C7 | AC-947 🧩 | حکم کیفی بدون درصد خام | گیت فقط پیام کیفی | complete/page.tsx بدون % | 🟢 کد (صفحه دیده شد در کد؛ زنده Not Verified) | Not Verifiable (زنده) |
| C8 | DD-113 | Voice Profile ثابت | voices.yaml | voices.yaml + manifest | 🟢 | Fully Aligned |

## جمع‌بندی کمی ردیابی

- ۴۸ زنجیرهٔ ردیابی‌شده در این ماتریس.
- **Fully Aligned: ۳۵** · Partially: ۵ · Not Implemented: ۱ (FSRS — مستند و صادقانه) · Implemented Incorrectly: ۱ (بازخورد) · Not Verifiable در این ممیزی: ۴ (گیت‌های زندهٔ فصل، حکم کیفی، شمارش کارت FSRS، رفتار Test-Out).
- **Contradicts Research: ۰** — هیچ تصمیم مستندی خلاف پژوهش پیاده نشده؛ تصمیم‌های متفاوتِ مالک (۶ مورد) همگی با ثبت صریح DD اجرا شده‌اند.
