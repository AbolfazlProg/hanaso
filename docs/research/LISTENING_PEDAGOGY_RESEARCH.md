# پژوهش آموزش شنیداری (Listening Pedagogy Research)

> **مأموریت:** TASK-HANASO-22 · **سند:** مبنای علمی ابعاد شنیداری و تمرین‌های Listening
> **وضعیت:** فعال — ابعاد برای معماری آینده؛ فقط زیرمجموعهٔ قابل‌اجرا با محتوای فعلی پیاده می‌شود.
> **منابع قبلی KB:** EV-228/229 (صدا-اول)، dialogue-learning-science، listening-and-dialogue-ux — بازتولید نمی‌شوند.

## §۱ — مدل‌های پردازش شنیداری

| منبع | نوع | یافتهٔ کلیدی | محدودیت | ارتباط HANASO |
| --- | --- | --- | --- | --- |
| Vandergrift, L. & Goh, C. C. M. (2012). *Teaching and Learning Second Language Listening: Metacognition in Action*. Routledge. [Book](https://www.amazon.com/Teaching-Learning-Second-Language-Listening/dp/0415883725) (+ [مرور Applied Linguistics 35(2)](https://academic.oup.com/applij/article-abstract/35/2/224/192218)) | چارچوب/کتاب مرجع | رویکرد فراشناختی به شنیداری L2: چرخهٔ «پیش‌بینی → گوش‌دادن اول → بازبینی → گوش‌دادن دوم → بازتاب»؛ خودتنظیمی شنونده مهارت مرکزی است | کتاب روش تدریس، نه متا-آنالیز | معماری تمرین شنیداری آینده: پرسش پیش‌بینی قبل از پخش (الگوی prediction موجود در dialogue-player) + دو-مرحله‌ای |
| Li, Q. (2022). *Metacognitive instruction in second language listening*. [ResearchGate](https://www.researchgate.net/publication/242714353_Metacognitive_Instruction_for_Second_Language_Listening_Development_Theory_Practice_and_Research_Implications) (استناد ۲۲+) | مرور | آموزش فراشناختی شنیداری اثر مثبت؛ هسته: برنامه‌ریزی/پایش/ارزیابی خودِ شنونده | مرور روایتی | «آیا دوباره بشنوم؟» خودش یک تصمیم آموزشی است — UI کنترل پخش را به یک انتخاب یادگیری تبدیل می‌کند |

## §۲ — تمایز صوتی و جفت‌های حداقلی (Sound Discrimination)

- **محصول فعلی:** `rule-listening` (جفت‌های حداقلی واژه‌ای با asset واقعی: いえ/いいえ، ここ/ごご…) و
  `kana-listening` (صدای گلیف = سؤال، بدون نمایش متن).
- پشتوانه ابعاد: EV-359 (تمایز نشانه‌های دیداری-شنیداری مشابه؛ چندحسی)،
  و جفت‌های مورایی مستند درس‌های H4/H7/H13 (طول مصوت، ん، っ).
- **قاعدهٔ صدا-اول:** KB EV-228/229 — صدا پیش از نمایش متن؛ متن = تأیید پس از پاسخ (no-leak).

## §۳ — Segmentation و مرز واژه

| بُعد | تمرین مناسب | مبنای شواهد | وضعیت فعلی |
| --- | --- | --- | --- |
| تفکیک واژه در جریان صدا | dictation سطح واژه (کلیدواژهٔ شنیده‌شده را انتخاب/تایپ کن) | KB UP-008 (مرز کلمه مشکل فارسی‌زبانان) | آینده — نیازمند asset جملهٔ مکالمه |
| تشخیص واژه از هم‌خانوادهٔ صوتی | جفت حداقلی کلمه‌ای | EV-359 + rule-listening موجود | **فعال (rule-listening)** |
| درک جملهٔ کوتاه | listen-no-text (معنی جمله) | تمرین دیالوگی موجود FEAT-098 | **فعال (فصل ۰۲)** |

## §۴ — سرعت و داربست

- سیاست سطح فعلی (LEVEL_POLICIES): L1 سرعت ۰.۸، L2 سرعت ۰.۹ — دادهٔ قابل‌تنظیم؛
  شاهد مستقیم «عدد بهینهٔ سرعت برای کانا» وجود ندارد (شکاف صادقانه).
- داربست زیرنویس: مرحله‌ای (نمایش پس از پاسخ → نمایش با ضربه → بدون) — هم‌راستا با
  reducedSupport فعلی dialogue-player و EV-072 (محوشدن گام‌به‌گام داربست).

## §۵ — Dictation (دیکتِیشن)

- چارچوب KB exercise-design: dictation = recall-first قوی برای مرز واژه؛ MVP فقط با assetهای موجود.
- فاز فعلی: **غیرفعال** — asset صدای جملهٔ تک‌تک مکالمه‌ها کامل نیست و تقلب با زیرنویس ممکن است؛
  فعال‌سازی با asset واقعی و بدون-نشت متن در مأموریت آتیهٔ محتوایی.

## §۶ — ماتریس ابعاد شنیداری (معماری)

| بُعد | تمرین | سنجش | فاز |
| --- | --- | --- | --- |
| Sound Discrimination (گلیف) | صدا→گلیف | انتخاب | **فعال (kana-listening)** |
| Sound Discrimination (واژه، جفت حداقلی) | صدا→واژهٔ نوشتاری | انتخاب | **فعال (rule-listening)** |
| Sound-to-Word (واژهٔ منفرد) | صدا→معنا | انتخاب | Practice فاز Kana (K3/K4 با asset موجود) |
| Segmentation | dictation واژه‌ای | تایپ/انتخاب | آینده |
| Sentence Comprehension | جمله→معنی | انتخاب | فعال فصل ۰۲ (listen-no-text) |
| Detail Extraction | سؤال جزئیات دیالوگ | انتخاب | آینده |
| Dialogue Comprehension | گیت فهم فصل | گیت | فعال |
| Extended Listening | مکالمهٔ طولانی | درک | آینده |

## §۷ — شکاف‌های صادقانه

| شکاف | وضعیت | تدبیر |
| --- | --- | --- |
| اثربخشی «رویکرد فراشناختی» در اپلیکیشن خودآموز (نه کلاس) | شاهد کلاسی، انتقال لازم | برچسب «انتقال»؛ A/B آینده |
| عدد بهینهٔ سرعت پخش | ناموجود | سیاست سطح فعلی باقی می‌ماند (دادهٔ قابل‌تنظیم) |
| Dictation برای کانا/مورا | شاهد L2 محدود | فاز آینده با asset کامل |

## §۸ — ارجاع‌ها

Vandergrift & Goh 2012 (Routledge) · Li 2022 (مرور فراشناختی) · KB EV-228/229/359 ·
KB docs/knowledge-base/02-learning-experience/{listening-and-dialogue-ux,dialogue-learning-science}.md ·
KB UP-008 (مرز واژه). منابع KB با EV/UP ارجاع مستقیم؛ جزئیات در رجیستری شواهد KB.
