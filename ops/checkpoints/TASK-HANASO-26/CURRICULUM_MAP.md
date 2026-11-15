# نقشهٔ برنامهٔ درسی فصل ۰۱ — مبانی نوشتار (کانا)

> TASK-HANASO-26 (B5) — این نقشه به‌صورت خودکار از کد واقعی تولید شده است
> (`scripts/h26_curriculum_map.py` روی `chapter-kana01.stations.ts` + `kana-items.ts`).
> هر تغییر در محتوا باید با بازتولید این نقشه و سبزشدن CL-13 همراه باشد.

## نمای کلی مسیر (۳۴ ایستگاه به ترتیب تدریس)

| # | ایستگاه | عنوان | هدف آموزشی | بلوک‌ها | تعداد تمرین |
| --- | --- | --- | --- | --- | --- |
| 1 | `stn-kana-h0` | خوش‌آمد و سه خط ژاپنی | خوش‌آمد و سه خط ژاپنی | viewed×1، scene×1، dialogue-player×1 | 0 |
| 2 | `stn-kana-h1` | ردیف あ | ردیف あ | kana-card×5، exercise×4، writing-practice×1، example-set×1 | 15 |
| 3 | `stn-kana-h2` | ردیف か | ردیف か | exercise×5، kana-card×5، writing-practice×1، example-set×1 | 18 |
| 4 | `stn-kana-h3` | ردیف さ | ردیف さ | exercise×5، kana-card×5، writing-practice×1، example-set×1 | 18 |
| 5 | `stn-kana-h4` | قاعدهٔ طول مصوت | مصوت کشیده: دو برابر خواندن مصوت، معنای واژه را عوض می‌کند | exercise×5، rule-prereq×1، rule-step×4، rule-contrast×2، example-set×1، rule-card×1 | 15 |
| 6 | `stn-kana-h5` | قاعدهٔ داکوتن (゛) | داکوتن: دو خطِ راست‌بالای کانا، صامت را واک‌دار می‌کند | exercise×5، rule-prereq×1، rule-step×3، rule-contrast×1، example-set×1، rule-card×1 | 15 |
| 7 | `stn-kana-h6` | قاعدهٔ یُوئون (ゃゅょ) | یُوئون: کانای کوچک ゃ/ゅ/ょ، صامت و مصوت را در یک مورا فشرده می | exercise×5، rule-prereq×1، rule-step×3، rule-contrast×1، example-set×1، rule-card×1 | 15 |
| 8 | `stn-kana-h7` | ん | ん | writing-practice×1، exercise×6، kana-card×1، rule-prereq×1، rule-step×2، rule-contrast×1، rule-card×1، example-set×1 | 3 |
| 9 | `stn-kana-h8` | ردیف な | ردیف な | exercise×5، kana-card×5، writing-practice×1، example-set×1 | 15 |
| 10 | `stn-kana-h9` | ردیف た | ردیف た | exercise×5، kana-card×5، writing-practice×1، rule-prereq×1، example-set×1 | 18 |
| 11 | `stn-kana-h10` | ردیف ま | ردیف ま | exercise×5، kana-card×5، writing-practice×1، rule-prereq×1، example-set×1 | 18 |
| 12 | `stn-kana-h11` | ردیف ら | ردیف ら | exercise×5، kana-card×5، writing-practice×1، example-set×1 | 18 |
| 13 | `stn-kana-h12` | ردیف は | ردیف は | exercise×5، kana-card×5، writing-practice×1، rule-step×1، example-set×1 | 18 |
| 14 | `stn-kana-h13` | قاعدهٔ سوکوئون (っ) | سوکوئون: っ کوچک = یک مورای فشار/مکث قبل از صامت | exercise×5، rule-prereq×1، rule-step×3، rule-contrast×1، example-set×1، rule-card×1 | 15 |
| 15 | `stn-kana-h14` | ردیف や | ردیف や | exercise×4، kana-card×3، writing-practice×1، example-set×1 | 12 |
| 16 | `stn-kana-h15` | ردیف わ + قاعدهٔ هان‌داکوتن (゜) | ردیف わ + قاعدهٔ هان‌داکوتن (゜) | exercise×8، kana-card×2، rule-prereq×1، rule-step×2، rule-contrast×1، writing-practice×1، rule-card×1، example-set×1، scene×1 | 20 |
| 17 | `stn-kana-k1` | ردیف ア + طرحوارهٔ قرینه‌گری |  | exercise×5، kana-card×5، writing-practice×1 | 15 |
| 18 | `stn-kana-k2` | ردیف タ | اولین گلیف‌های داکوتن‌دار کاتاکانا (ド) با یادآوری مفهوم H5 | exercise×5، kana-card×5، writing-practice×1، rule-prereq×1، example-set×1 | 18 |
| 19 | `stn-kana-k3` | ردیف ラ | ردیف ラ | exercise×5، kana-card×5، writing-practice×1، example-set×1 | 18 |
| 20 | `stn-kana-k4` | ردیف サ | ردیف サ | exercise×5، kana-card×5، writing-practice×1، rule-prereq×1، example-set×1 | 18 |
| 21 | `stn-kana-k5` | ردیف ハ | ردیف ハ | exercise×5، kana-card×5، writing-practice×1، rule-prereq×1، example-set×1 | 18 |
| 22 | `stn-kana-k6` | ン | ン | exercise×4، writing-practice×1، kana-card×1، rule-prereq×1، example-set×1 | 3 |
| 23 | `stn-kana-k7` | ردیف カ | ردیف カ | exercise×5، kana-card×5، writing-practice×1، example-set×1 | 15 |
| 24 | `stn-kana-k8` | قاعدهٔ کوچوئون‌پو (ー) | کوچوئون‌پو: خط کشش ー در کاتاکانا = تکرار مصوت قبل | exercise×5، rule-prereq×1، rule-step×3، rule-contrast×1، example-set×1، rule-card×1 | 13 |
| 25 | `stn-kana-k9` | ردیف マ | ردیف マ | exercise×5، kana-card×5، writing-practice×1، example-set×1 | 18 |
| 26 | `stn-kana-k10` | ردیف ヤ | ردیف ヤ | exercise×4، kana-card×3، writing-practice×1، example-set×1 | 12 |
| 27 | `stn-kana-k11` | ردیف ナ | ردیف ナ | exercise×5، kana-card×5، writing-practice×1، rule-prereq×1، example-set×1 | 18 |
| 28 | `stn-kana-k12` | ردیف ワ/ヲ | دو کارت آخرِ کاتاکانا: ワ و ヲ — با روماجی روشن (استثنای CONTE | exercise×4، kana-card×2، writing-practice×1، example-set×1 | 9 |
| 29 | `stn-kana-k12-foreign` | ترکیب خارجی (ファ/ティ/ヴ) | ترکیب خارجی: صداهای بیرونی با مصوتِ کوچک — ファ، ティ، ヴ | exercise×2، rule-prereq×1، rule-step×3، rule-contrast×1، rule-card×1 | 4 |
| 30 | `stn-kana-k13` | آشتی دو خط + نامِ خودت | تمرین تمایز هیراگانا و کاتاکانا + نوشتن نام خود به کاتاکانا | exercise×3، scene×2، rule-prereq×1، rule-contrast×1، rule-step×1، character-scene×1، choice×1 | 12 |
| 31 | `stn-kana-opt-r-h9` | مرور ایستگاه‌های فاز ۱ (اختیاری) | شاخهٔ اختیاری از H9 — آویخته، هرگز گیت نمی‌شود (spec §3) | exercise×1 | 12 |
| 32 | `stn-kana-opt-drill` | دریل آزاد کانا (اختیاری) | FEAT-158 — تمرین بازشناسی با فیلتر ردیف/خط، خارج از مسیر اصل | writing-practice×1، exercise×1 | 10 |

## ترتیب معرفی گلیف‌ها (منبع یکتای حقیقت برای CL-13)

| ایستگاه # | گلیف‌های معرفی‌شده | تعداد |
| --- | --- | --- |
| 2 | あ い う え お | 5 |
| 3 | か き く け こ | 5 |
| 4 | さ し す せ そ | 5 |
| 6 | が ぎ ご ざ じ ぜ ぞ た だ は ば | 11 |
| 7 | ひ び ゃ や ゅ ゆ ょ よ | 8 |
| 8 | ん | 1 |
| 9 | な に ぬ ね の | 5 |
| 10 | ち つ て と | 4 |
| 11 | ず ま み む め も | 6 |
| 12 | ら り る れ ろ | 5 |
| 13 | ふ ぶ へ ほ | 4 |
| 14 | っ | 1 |
| 16 | で ぱ ぴ ぼ ぽ わ を | 7 |
| 17 | ア イ ウ エ オ | 5 |
| 18 | タ チ ツ テ ト ド | 6 |
| 19 | ラ リ ル レ ロ | 5 |
| 20 | サ シ ジ ス ズ セ ソ | 7 |
| 21 | ザ ハ バ ヒ ビ ピ フ ヘ ホ | 9 |
| 22 | ゼ パ プ ャ ュ ョ ン ー | 8 |
| 23 | カ キ ク ケ コ | 5 |
| 24 | ペ ボ ・ | 3 |
| 25 | マ ミ ム メ モ | 5 |
| 26 | ヤ ユ ヨ | 3 |
| 27 | デ ナ ニ ヌ ネ ノ | 6 |
| 28 | ワ ヲ | 2 |
| 29 | ァ ィ ッ ヴ | 4 |

**جمع کل گلیف‌های معرفی‌شده در فصل ۱: 135** (۹۲ کارت کانا + گلیف‌های قواعد: ゛゜ ゃゅょ っ ー و ترکیب‌های خارجی)

## قواعد و مفاهیم — ترتیب، پیش‌نیاز و توالی آموزش

| قاعده | ایستگاه | پیش‌نیازها (همگی قبل از درس تدریس شده) | توالی آموزش (معرفی→مثال→تمرین هدایت‌شده→مستقل) |
| --- | --- | --- | --- |
| طول مصوت (مصوت کشیده) | #5 `stn-kana-h4` | ردیف‌های あ か さ (مصوت‌ها a/i/u) | ضربه‌شماری با انگشت → مقایسهٔ جفت کوتاه/بلند → حدس‌زدن → تمرین شنیداری → کارت مرجع (تعریف «مورا» همین‌جا، بعد از تجربهٔ ضربه) |
| داکوتن (゛) | #6 `stn-kana-h5` | ردیف‌های か さ (مصوت‌های ka/sa) | نمایش がくせい → تضاد ここ/ごご؟ → توضیح واک‌دارشدن → かぞく → تمرین → کارت مرجع |
| یُوئون (ゃゅょ) | #7 `stn-kana-h6` | سه جفت کوچک/بزرگ ゃや ゅゆ ょよ (خودِ درس معرفی می‌کند) + き し | اولین نگاه به سه جفت → تضاد فشرده/جدا → توضیح «کوچک = فشرده» با پل فارسی (کیّا/کی‌یا) → حدس‌زدن かいしゃ → کارت مرجع + صداقت‌برچسب (びょういن بعد از ردیف は) |
| ん (ن مورایی) | #8 `stn-kana-h7` | ردیف‌های تدریس‌شده تا اینجا | شنیدن → شکل → تمرین |
| سوکوئون (っ) | #14 `stn-kana-h13` | داکوتن (h5) + ردیف‌های た ま | تضاد さか/さっか → توضیح «توقف کوتاه» → حدس‌زدن → تمرین |
| هان‌داکوتن (゜) | #16 `stn-kana-h15` | داکوتن (h5) + ردیف は | تضاد は/ぱ → توضیح → تمرین |
| کوچوئون‌پو (ー) | #24 `stn-kana-k8` | ردیف‌های کاتاکانا + داکوتن | تضاد کوتاه/بلند در واژه‌های خارجی → توضیح → تمرین |
| ترکیب خارجی (ファ/ティ/ヴ) | #29 `stn-kana-k12-foreign` | کوچوئون‌پو (k8) + ァィゥェォ کوچک | معرفی ترکیب‌ها → تضاد → تمرین |

## وضعیت ممیزی ترتیب آموزش (پس از اصلاحات TASK-26)

- **CL-13 (قاعدهٔ جدید lint):** هیچ متنِ پیش از پاسخ (f1/f2/confusable/promptJa) به گلیفِ آموزش‌ندیده وابسته نیست؛ پیش‌نمایش فقط با قول صریح («بعداً می‌بینی») مجاز است. تست مثبت/منفی دارد و روی کل بانک سبز است.
- موارد اصلاح‌شده در این مأموریت: ۱۵ confusable-note (توصیف شکل + قول)، ۱۵ f2 hint (راهنمای مستقل از گلیف آینده)، ۱ rationale (ん)، ۲ تایپو («گانای»→«کانای»)، ۱ تعریف «مورا» در اولین استفاده.
- قواعد به‌ترتیبِ پیش‌نیازی درست‌اند: طول مصوت ← داکوتن ← یُوئون (با معرفی همان‌جا سه جفت ゃや/ゅゆ/ょよ) ← ん ← سوکوئون ← هان‌داکوتن ← کوچوئون‌پو ← ترکیب خارجی.

## تمایز سطوح (معرفی / تمرین هدایت‌شده / مستقل / ارزیابی)

هر ایستگاه تمرین‌دار، تمرین‌هایش را در سه لایه می‌بیند:
- **گرم‌کردن/هدایت‌شده:** بلوک تمرین اول (warmup/guided) — بازخورد f1+f2 بدون لو دادن پاسخ.
- **مستقل:** بلوک‌های apply/independent — بدون راهنمای مستقیم.
- **ارزیابی فصل:** دروازهٔ تسلط (۲۵ آیتم M1..M5، وزنی 0.9 / کف 0.8 هر سنجه) — جدا از ایستگاه‌ها.

| سنجهٔ دروازه | مفهوم | نمونه آیتم |
| --- | --- | --- |
| M1 | بازشناسی شکل→صدا | ex-kana-gate-m1-1..5 |
| M2 | شنیداری صدا→شکل | ex-kana-gate-m2-1..5 |
| M3 | رمزگشایی واژهٔ واقعی | ex-kana-gate-m3-1..5 |
| M4 | جفت‌های اشتباه‌پذیر | ex-kana-gate-m4-1..5 |
| M5 | شنیداری بین‌خطی | ex-kana-gate-m5-1..5 |

## فصل ۲ (خارج از محدوده)

بدون تغییر. یافته‌های شناخته‌شدهٔ TASK-23 در آن باقی است (baseline منجمد در CL-02..CL-12). مرز ch1→ch2: گلیف‌های ど/っ/え+い و رومaji-ی sensee در ch2 استفاده می‌شوند ولی در ch1 تدریس نشده‌اند — مستند در TASK-23؛ اصلاح محتوایی آن خارج از SCOPE این مأموریت است.
