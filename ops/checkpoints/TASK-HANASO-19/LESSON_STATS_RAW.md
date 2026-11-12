# گزارش آمار درس‌به‌درس برنامهٔ درسی HANASO — ممیزی TASK-HANASO-19 / بستهٔ 19-B

> منبع: `curriculum-dump.json` (۸۶۸KB) — تولیدشده به‌صورت خودکار با `scripts/lesson_stats.py`. 
> محدوده: ۲ فصل (`kana01` با ۳۱ نوبت و `fm01` با ۲۲ نوبت) — مجموع ۵۳ نوبت، ۵۳۵ تمرین سریال‌شده، ۹۲ آیتم کانا.
> معیار PASSIVE-RUN: طولانی‌ترین دنبالهٔ پیوستهٔ بلوک‌های بدون تعامل کاربر؛ آستانهٔ قابل‌قبول ≤ ۲.

---

## فصل kana01 — `kana-foundation-01` (سطح L1) — «فصل ۰۱ — مبانی نوشتار: هیراگانا و کاتاکانا»

**canDo:** در پایان این فصل هر دو خط کانای ژاپنی را می‌خوانی و واژه‌های سادهٔ واقعی را رمزگشایی می‌کنی.  
**خلاصه:** مسیر کامل کانا برای مبتدی مطلق: ۴ جزیره، ۳۱ ایستگاه، ۹۲ شکل — با یادسپارهای فارسی، واژه‌های واقعیِ همان لحظه و گیت فهم در پایان.

- estMinutes فصل: **338** | estLoad: **medium** | تعداد نوبت: **31** (29 اصلی + 2 اختیاری)
- تمرین‌های سریال‌شده: **459** | واژه: **0** | دستور: **0** | تعبیر/آیین: **0** | واحدها: **4**

### جدول نمای کلی نوبت‌های kana01

| # | slug | عنوان | core | دقیقه | بار | بلوک‌ها | تمرین | PASSIVE-RUN | fsrs | completion | پیش‌نیاز |
|---|------|--------|------|-------|-----|---------|-------|-------------|------|------------|-----------|
| 1 | `stn-kana-h0` | خوش‌آمد و سه خط ژاپنی | بله | 10 | medium | scene×1، dialogue-player×1، wrap-up×1 | 0 | **3** ⚠️ | 0 | viewed | — |
| 2 | `stn-kana-h1` | ردیف あ | بله | 12 | medium | kana-card×5، exercise×1 (3تمرین)، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 15 | **3** ⚠️ | 5 | exercise_threshold (0.7) | ['stn-kana-h0'] |
| 3 | `stn-kana-h2` | ردیف か | بله | 12 | medium | exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 18 | **3** ⚠️ | 5 | exercise_threshold (0.7) | ['stn-kana-h1'] |
| 4 | `stn-kana-h3` | ردیف さ | بله | 12 | medium | exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 18 | **3** ⚠️ | 7 | exercise_threshold (0.7) | ['stn-kana-h2'] |
| 5 | `stn-kana-h4` | قاعدهٔ طول مصوت | بله | 14 | light | exercise×3 (3تمرین)، rule-prereq×1، rule-step×4، rule-contrast×2، exercise×1 (2تمرین)، example-set×1، rule-card×1، exercise×1 (4تمرین)، wrap-up×1 | 15 | **2** | 0 | exercise_threshold (0.7) | ['stn-kana-h3'] |
| 6 | `stn-kana-h5` | قاعدهٔ داکوتن (゛) | بله | 13 | light | exercise×3 (3تمرین)، rule-prereq×1، rule-step×3، rule-contrast×1، exercise×1 (2تمرین)، example-set×1، rule-card×1، exercise×1 (4تمرین)، wrap-up×1 | 15 | **2** | 0 | exercise_threshold (0.7) | ['stn-kana-h4'] |
| 7 | `stn-kana-h6` | قاعدهٔ یُوئون (ゃゅょ) | بله | 15 | light | exercise×1 (3تمرین)، rule-prereq×1، rule-step×3، rule-contrast×1، exercise×2 (2تمرین)، example-set×1، exercise×2 (4تمرین)، rule-card×1، wrap-up×1 | 15 | **2** | 0 | exercise_threshold (0.7) | ['stn-kana-h5'] |
| 8 | `stn-kana-h7` | ん | بله | 12 | medium | writing-practice×1، exercise×1 (3تمرین)، kana-card×1، rule-prereq×1، rule-step×2، rule-contrast×1، exercise×2 (2تمرین)، exercise×3 (1تمرین)، rule-card×1، example-set×1، wrap-up×1 | 10 | **3** ⚠️ | 1 | exercise_threshold (0.7) | ['stn-kana-h6'] |
| 9 | `stn-kana-h8` | ردیف な | بله | 12 | medium | exercise×1 (1تمرین)، kana-card×5، exercise×1 (3تمرین)، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 16 | **3** ⚠️ | 5 | exercise_threshold (0.7) | ['stn-kana-h7'] |
| 10 | `stn-kana-h9` | ردیف た | بله | 12 | medium | exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 18 | **3** ⚠️ | 7 | exercise_threshold (0.7) | ['stn-kana-h8'] |
| 11 | `stn-kana-h10` | ردیف ま | بله | 12 | medium | exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 18 | **3** ⚠️ | 6 | exercise_threshold (0.7) | ['stn-kana-h9'] |
| 12 | `stn-kana-h11` | ردیف ら | بله | 12 | medium | exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 18 | **3** ⚠️ | 8 | exercise_threshold (0.7) | ['stn-kana-h10'] |
| 13 | `stn-kana-h12` | ردیف は | بله | 12 | medium | exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، rule-step×1، example-set×1، wrap-up×1 | 18 | **3** ⚠️ | 7 | exercise_threshold (0.7) | ['stn-kana-h11'] |
| 14 | `stn-kana-h13` | قاعدهٔ سوکوئون (っ) | بله | 15 | light | exercise×1 (3تمرین)، rule-prereq×1، rule-step×3، rule-contrast×1، exercise×2 (2تمرین)، example-set×1، exercise×2 (4تمرین)، rule-card×1، wrap-up×1 | 15 | **2** | 0 | exercise_threshold (0.7) | ['stn-kana-h12'] |
| 15 | `stn-kana-h14` | ردیف や | بله | 10 | medium | exercise×4 (3تمرین)، kana-card×3، writing-practice×1، example-set×1، wrap-up×1 | 12 | **3** ⚠️ | 3 | exercise_threshold (0.7) | ['stn-kana-h13'] |
| 16 | `stn-kana-h15` | ردیف わ + قاعدهٔ هان‌داکوتن (゜) | بله | 16 | medium | exercise×1 (3تمرین)، kana-card×2، exercise×5 (2تمرین)، rule-prereq×1، rule-step×2، rule-contrast×1، writing-practice×1، rule-card×1، exercise×1 (1تمرین)، example-set×1، wrap-up×1 | 14 | **2** | 3 | exercise_threshold (0.7) | ['stn-kana-h14'] |
| 17 | `stn-kana-k1` | ردیف ア + طرحوارهٔ قرینه‌گری | بله | 12 | medium | exercise×2 (2تمرین)، kana-card×5، exercise×1 (3تمرین)، writing-practice×1، exercise×2 (5تمرین)، wrap-up×1 | 17 | **3** ⚠️ | 5 | exercise_threshold (0.7) | ['stn-kana-h15'] |
| 18 | `stn-kana-k2` | ردیف タ | بله | 12 | medium | exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 18 | **3** ⚠️ | 5 | exercise_threshold (0.7) | ['stn-kana-k1'] |
| 19 | `stn-kana-k3` | ردیف ラ | بله | 12 | medium | exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 18 | **3** ⚠️ | 5 | exercise_threshold (0.7) | ['stn-kana-k2'] |
| 20 | `stn-kana-k4` | ردیف サ | بله | 12 | medium | exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 18 | **3** ⚠️ | 6 | exercise_threshold (0.7) | ['stn-kana-k3'] |
| 21 | `stn-kana-k5` | ردیف ハ | بله | 12 | medium | exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 18 | **3** ⚠️ | 5 | exercise_threshold (0.7) | ['stn-kana-k4'] |
| 22 | `stn-kana-k6` | ン | بله | 10 | medium | exercise×1 (3تمرین)، writing-practice×1، kana-card×1، exercise×3 (1تمرین)، example-set×1، wrap-up×1 | 6 | **2** | 2 | exercise_threshold (0.7) | ['stn-kana-k5'] |
| 23 | `stn-kana-k7` | ردیف カ | بله | 12 | medium | exercise×1 (1تمرین)، kana-card×5، exercise×1 (3تمرین)، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 16 | **3** ⚠️ | 6 | exercise_threshold (0.7) | ['stn-kana-k6'] |
| 24 | `stn-kana-k8` | قاعدهٔ کوچوئون‌پو (ー) | بله | 14 | light | exercise×3 (3تمرین)، rule-prereq×1، rule-step×3، rule-contrast×1، exercise×2 (2تمرین)، example-set×1، rule-card×1، wrap-up×1 | 13 | **2** | 0 | exercise_threshold (0.7) | ['stn-kana-k7'] |
| 25 | `stn-kana-k9` | ردیف マ | بله | 12 | medium | exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 18 | **3** ⚠️ | 5 | exercise_threshold (0.7) | ['stn-kana-k8'] |
| 26 | `stn-kana-k10` | ردیف ヤ | بله | 10 | medium | exercise×4 (3تمرین)، kana-card×3، writing-practice×1، example-set×1، wrap-up×1 | 12 | **3** ⚠️ | 4 | exercise_threshold (0.7) | ['stn-kana-k9'] |
| 27 | `stn-kana-k11` | ردیف ナ | بله | 12 | medium | exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1 | 18 | **3** ⚠️ | 7 | exercise_threshold (0.7) | ['stn-kana-k10'] |
| 28 | `stn-kana-k12` | ردیف ワ + ترکیب خارجی (ファ/ティ/ヴ…) | بله | 12 | medium | exercise×1 (3تمرین)، kana-card×2، exercise×3 (2تمرین)، writing-practice×1، example-set×1، wrap-up×1 | 9 | **2** | 3 | exercise_threshold (0.7) | ['stn-kana-k11'] |
| 29 | `stn-kana-k13` | آشتی دو خط + نامِ خودت | بله | 13 | medium | exercise×1 (2تمرین)، scene×1، rule-prereq×1، rule-contrast×1، rule-step×1، exercise×1 (6تمرین)، character-scene×1، wrap-up×1 | 8 | **2** | 0 | exercise_threshold (0.7) | ['stn-kana-k12'] |
| 30 | `stn-kana-opt-r-h9` | مرور ایستگاه‌های فاز ۱ (اختیاری) | خیر | 10 | medium | exercise×1 (12تمرین)، wrap-up×1 | 12 | **1** | 0 | exercise_threshold (0.7) | ['stn-kana-h9'] |
| 31 | `stn-kana-opt-drill` | دریل آزاد کانا (اختیاری) | خیر | 10 | medium | writing-practice×1، exercise×1 (10تمرین)، wrap-up×1 | 10 | **1** | 0 | exercise_threshold (0.7) | — |

*ستون «بلوک‌ها» ترتیب واقعی را حفظ کرده است؛ برای بلوک‌های exercise تعداد تمرین ارجاع‌شده داخل پرانتز آمده.*

### تحلیل نوبت‌به‌نوبت kana01

#### 1. `stn-kana-h0` — خوش‌آمد و سه خط ژاپنی

- **هدف:** خوش‌آمد و سه خط ژاپنی | core: بله | estMinutes: **10** | estLoad: **medium** | بلوک‌ها: 3
- **ترکیب بلوک‌ها (به‌ترتیب):** scene×1، dialogue-player×1، wrap-up×1
- **تمرین‌ها:** 0 ارجاع | انواع: — | نقش‌ها: —
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: scene → dialogue-player → wrap-up
- **زمان:** 3.3 دقیقه/بلوک | تخمین ابتکاری: 2.2 دقیقه | نسبت est/تخمین: 4.44 → نامعقول ⚠️
- **بازخورد:** هر سه سطح (f1+f2+f3): 0 از 0 | دلایل حواس‌پرتی: کامل 0، جزئی 0، بدون 0
- **تمایز متن f1:** 0 رشتهٔ متمایز از 0 تمرین
- **پیش‌نیاز:** بدون پیش‌نیاز — خطی ✅
- **fsrsItems:** 0 | **completion:** {"kind": "viewed"} | **mastery:** {}

#### 2. `stn-kana-h1` — ردیف あ

- **هدف:** ردیف あ | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 12
- **ترکیب بلوک‌ها (به‌ترتیب):** kana-card×5، exercise×1 (3تمرین)، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 15 ارجاع | انواع: kana-recognition×5، kana-recall×5، kana-listening×5 | نقش‌ها: practice×15
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 1.0 دقیقه/بلوک | تخمین ابتکاری: 10.5 دقیقه | نسبت est/تخمین: 1.14 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 15 از 15 | دلایل حواس‌پرتی: کامل 15، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 15 تمرین
- **پیش‌نیاز:** ['stn-kana-h0'] — خطی ✅
- **fsrsItems:** 5 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 3. `stn-kana-h2` — ردیف か

- **هدف:** ردیف か | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 18 ارجاع | انواع: kana-listening×8، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×18
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 11.2 دقیقه | نسبت est/تخمین: 1.07 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 18 از 18 | دلایل حواس‌پرتی: کامل 18، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 18 تمرین
- **پیش‌نیاز:** ['stn-kana-h1'] — خطی ✅
- **fsrsItems:** 5 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 4. `stn-kana-h3` — ردیف さ

- **هدف:** ردیف さ | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 18 ارجاع | انواع: kana-listening×8، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×18
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 11.2 دقیقه | نسبت est/تخمین: 1.07 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 18 از 18 | دلایل حواس‌پرتی: کامل 18، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 18 تمرین
- **پیش‌نیاز:** ['stn-kana-h2'] — خطی ✅
- **fsrsItems:** 7 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 5. `stn-kana-h4` — قاعدهٔ طول مصوت

- **هدف:** مصوت کشیده: دو برابر خواندن مصوت، معنای واژه را عوض می‌کند | core: بله | estMinutes: **14** | estLoad: **light** | بلوک‌ها: 15
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×3 (3تمرین)، rule-prereq×1، rule-step×4، rule-contrast×2، exercise×1 (2تمرین)، example-set×1، rule-card×1، exercise×1 (4تمرین)، wrap-up×1
- **تمرین‌ها:** 15 ارجاع | انواع: kana-decode×9، kana-listening×3، rule-listening×2، cloze×1 | نقش‌ها: practice×15
- **PASSIVE-RUN:** 2 ✅ — دنباله: rule-prereq → rule-step
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 9.7 دقیقه | نسبت est/تخمین: 1.45 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 15 از 15 | دلایل حواس‌پرتی: کامل 15، جزئی 0، بدون 0
- **تمایز متن f1:** 13 رشتهٔ متمایز از 15 تمرین
- **پیش‌نیاز:** ['stn-kana-h3'] — خطی ✅
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}
- **تحلیل قاعده:** rule-step×4 (نقش‌ها: notice×2، explain×2)؛ rule-contrast×2؛ تعامل‌های تعبیه‌شده: ask در rule-step 1، ask در contrast 1، guided-discovery/structured-input 0، پیش‌بینی دیالوگ 0، پاسخ صحنه 0
  - ℹ️ هیچ rule-stepی با نقش «apply» وجود ندارد.
- **🚩 پرچم‌های قرمز محلی:** تعداد گزینه خارج از ۳–۴: ['ex-kana-h4-lis-1', 'ex-kana-h4-lis-2']

#### 6. `stn-kana-h5` — قاعدهٔ داکوتن (゛)

- **هدف:** داکوتن: دو خطِ راست‌بالای کانا، صامت را واک‌دار می‌کند | core: بله | estMinutes: **13** | estLoad: **light** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×3 (3تمرین)، rule-prereq×1، rule-step×3، rule-contrast×1، exercise×1 (2تمرین)، example-set×1، rule-card×1، exercise×1 (4تمرین)، wrap-up×1
- **تمرین‌ها:** 15 ارجاع | انواع: kana-decode×9، kana-listening×3، rule-listening×2، cloze×1 | نقش‌ها: practice×15
- **PASSIVE-RUN:** 2 ✅ — دنباله: rule-prereq → rule-step
- **زمان:** 1.0 دقیقه/بلوک | تخمین ابتکاری: 8.2 دقیقه | نسبت est/تخمین: 1.58 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 15 از 15 | دلایل حواس‌پرتی: کامل 15، جزئی 0، بدون 0
- **تمایز متن f1:** 13 رشتهٔ متمایز از 15 تمرین
- **پیش‌نیاز:** ['stn-kana-h4'] — خطی ✅
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}
- **تحلیل قاعده:** rule-step×3 (نقش‌ها: notice×2، explain×1)؛ rule-contrast×1؛ تعامل‌های تعبیه‌شده: ask در rule-step 0، ask در contrast 1، guided-discovery/structured-input 0، پیش‌بینی دیالوگ 0، پاسخ صحنه 0
  - ℹ️ هیچ rule-stepی با نقش «apply» وجود ندارد.
- **🚩 پرچم‌های قرمز محلی:** تعداد گزینه خارج از ۳–۴: ['ex-kana-h5-lis-1', 'ex-kana-h5-lis-2']

#### 7. `stn-kana-h6` — قاعدهٔ یُوئون (ゃゅょ)

- **هدف:** یُوئون: کانای کوچک ゃ/ゅ/ょ، صامت و مصوت را در یک مورا فشرده می‌کند | core: بله | estMinutes: **15** | estLoad: **light** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×1 (3تمرین)، rule-prereq×1، rule-step×3، rule-contrast×1، exercise×2 (2تمرین)، example-set×1، exercise×2 (4تمرین)، rule-card×1، wrap-up×1
- **تمرین‌ها:** 15 ارجاع | انواع: kana-decode×8، kana-listening×3، rule-listening×2، cloze×1، produce-template×1 | نقش‌ها: practice×15
- **PASSIVE-RUN:** 2 ✅ — دنباله: rule-prereq → rule-step
- **زمان:** 1.2 دقیقه/بلوک | تخمین ابتکاری: 8.6 دقیقه | نسبت est/تخمین: 1.75 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 15 از 15 | دلایل حواس‌پرتی: کامل 14، جزئی 0، بدون 0
- **تمایز متن f1:** 13 رشتهٔ متمایز از 15 تمرین
- **پیش‌نیاز:** ['stn-kana-h5'] — خطی ✅
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}
- **تحلیل قاعده:** rule-step×3 (نقش‌ها: notice×2، explain×1)؛ rule-contrast×1؛ تعامل‌های تعبیه‌شده: ask در rule-step 1، ask در contrast 1، guided-discovery/structured-input 0، پیش‌بینی دیالوگ 0، پاسخ صحنه 0
  - ℹ️ هیچ rule-stepی با نقش «apply» وجود ندارد.
- **🚩 پرچم‌های قرمز محلی:** تعداد گزینه خارج از ۳–۴: ['ex-kana-h6-lis-1', 'ex-kana-h6-lis-2']

#### 8. `stn-kana-h7` — ん

- **هدف:** ん | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 15
- **ترکیب بلوک‌ها (به‌ترتیب):** writing-practice×1، exercise×1 (3تمرین)، kana-card×1، rule-prereq×1، rule-step×2، rule-contrast×1، exercise×2 (2تمرین)، exercise×3 (1تمرین)، rule-card×1، example-set×1، wrap-up×1
- **تمرین‌ها:** 10 ارجاع | انواع: kana-listening×4، kana-decode×3، rule-listening×1، kana-recognition×1، kana-recall×1 | نقش‌ها: practice×10
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → rule-prereq → rule-step
- **زمان:** 0.8 دقیقه/بلوک | تخمین ابتکاری: 8.2 دقیقه | نسبت est/تخمین: 1.45 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 10 از 10 | دلایل حواس‌پرتی: کامل 10، جزئی 0، بدون 0
- **تمایز متن f1:** 7 رشتهٔ متمایز از 10 تمرین
- **پیش‌نیاز:** ['stn-kana-h6'] — خطی ✅
- **fsrsItems:** 1 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}
- **تحلیل قاعده:** rule-step×2 (نقش‌ها: notice×1، explain×1)؛ rule-contrast×1؛ تعامل‌های تعبیه‌شده: ask در rule-step 0، ask در contrast 1، guided-discovery/structured-input 0، پیش‌بینی دیالوگ 0، پاسخ صحنه 0
  - ℹ️ هیچ rule-stepی با نقش «apply» وجود ندارد.
- **🚩 پرچم‌های قرمز محلی:** تعداد گزینه خارج از ۳–۴: ['ex-kana-h7-lis-1']

#### 9. `stn-kana-h8` — ردیف な

- **هدف:** ردیف な | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×1 (1تمرین)، kana-card×5، exercise×1 (3تمرین)، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 16 ارجاع | انواع: kana-listening×6، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×16
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 10.8 دقیقه | نسبت est/تخمین: 1.11 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 16 از 16 | دلایل حواس‌پرتی: کامل 16، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 16 تمرین
- **پیش‌نیاز:** ['stn-kana-h7'] — خطی ✅
- **fsrsItems:** 5 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 10. `stn-kana-h9` — ردیف た

- **هدف:** ردیف た | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 18 ارجاع | انواع: kana-listening×8، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×18
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 11.1 دقیقه | نسبت est/تخمین: 1.08 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 18 از 18 | دلایل حواس‌پرتی: کامل 18، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 18 تمرین
- **پیش‌نیاز:** ['stn-kana-h8'] — خطی ✅
- **fsrsItems:** 7 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 11. `stn-kana-h10` — ردیف ま

- **هدف:** ردیف ま | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 18 ارجاع | انواع: kana-listening×8، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×18
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 11.1 دقیقه | نسبت est/تخمین: 1.08 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 18 از 18 | دلایل حواس‌پرتی: کامل 18، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 18 تمرین
- **پیش‌نیاز:** ['stn-kana-h9'] — خطی ✅
- **fsrsItems:** 6 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 12. `stn-kana-h11` — ردیف ら

- **هدف:** ردیف ら | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 18 ارجاع | انواع: kana-listening×8، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×18
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 11.2 دقیقه | نسبت est/تخمین: 1.07 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 18 از 18 | دلایل حواس‌پرتی: کامل 18، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 18 تمرین
- **پیش‌نیاز:** ['stn-kana-h10'] — خطی ✅
- **fsrsItems:** 8 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 13. `stn-kana-h12` — ردیف は

- **هدف:** ردیف は | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 14
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، rule-step×1، example-set×1، wrap-up×1
- **تمرین‌ها:** 18 ارجاع | انواع: kana-listening×8، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×18
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 12.2 دقیقه | نسبت est/تخمین: 0.99 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 18 از 18 | دلایل حواس‌پرتی: کامل 18، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 18 تمرین
- **پیش‌نیاز:** ['stn-kana-h11'] — خطی ✅
- **fsrsItems:** 7 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}
- **تحلیل قاعده — *خارج از فهرست ایستگاه‌های قاعدهٔ ممیزی*:** rule-step×1 (نقش‌ها: notice×1)؛ rule-contrast×0؛ تعامل‌های تعبیه‌شده: ask در rule-step 1، ask در contrast 0، guided-discovery/structured-input 0، پیش‌بینی دیالوگ 0، پاسخ صحنه 0
  - ℹ️ هیچ rule-stepی با نقش «apply» وجود ندارد.

#### 14. `stn-kana-h13` — قاعدهٔ سوکوئون (っ)

- **هدف:** سوکوئون: っ کوچک = یک مورای فشار/مکث قبل از صامت | core: بله | estMinutes: **15** | estLoad: **light** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×1 (3تمرین)، rule-prereq×1، rule-step×3، rule-contrast×1، exercise×2 (2تمرین)، example-set×1، exercise×2 (4تمرین)، rule-card×1، wrap-up×1
- **تمرین‌ها:** 15 ارجاع | انواع: kana-decode×8، kana-listening×3، rule-listening×2، produce-template×1، cloze×1 | نقش‌ها: practice×15
- **PASSIVE-RUN:** 2 ✅ — دنباله: rule-prereq → rule-step
- **زمان:** 1.2 دقیقه/بلوک | تخمین ابتکاری: 8.4 دقیقه | نسبت est/تخمین: 1.78 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 15 از 15 | دلایل حواس‌پرتی: کامل 14، جزئی 0، بدون 0
- **تمایز متن f1:** 13 رشتهٔ متمایز از 15 تمرین
- **پیش‌نیاز:** ['stn-kana-h12'] — خطی ✅
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}
- **تحلیل قاعده:** rule-step×3 (نقش‌ها: notice×2، explain×1)؛ rule-contrast×1؛ تعامل‌های تعبیه‌شده: ask در rule-step 0، ask در contrast 1، guided-discovery/structured-input 0، پیش‌بینی دیالوگ 0، پاسخ صحنه 0
  - ℹ️ هیچ rule-stepی با نقش «apply» وجود ندارد.
- **🚩 پرچم‌های قرمز محلی:** تعداد گزینه خارج از ۳–۴: ['ex-kana-h13-lis-1', 'ex-kana-h13-lis-2']

#### 15. `stn-kana-h14` — ردیف や

- **هدف:** ردیف や | core: بله | estMinutes: **10** | estLoad: **medium** | بلوک‌ها: 10
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×4 (3تمرین)، kana-card×3، writing-practice×1، example-set×1، wrap-up×1
- **تمرین‌ها:** 12 ارجاع | انواع: kana-listening×6، kana-recognition×3، kana-recall×3 | نقش‌ها: practice×12
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 1.0 دقیقه/بلوک | تخمین ابتکاری: 7.4 دقیقه | نسبت est/تخمین: 1.35 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 12 از 12 | دلایل حواس‌پرتی: کامل 12، جزئی 0، بدون 0
- **تمایز متن f1:** 7 رشتهٔ متمایز از 12 تمرین
- **پیش‌نیاز:** ['stn-kana-h13'] — خطی ✅
- **fsrsItems:** 3 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 16. `stn-kana-h15` — ردیف わ + قاعدهٔ هان‌داکوتن (゜)

- **هدف:** ردیف わ + قاعدهٔ هان‌داکوتن (゜) | core: بله | estMinutes: **16** | estLoad: **medium** | بلوک‌ها: 17
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×1 (3تمرین)، kana-card×2، exercise×5 (2تمرین)، rule-prereq×1، rule-step×2، rule-contrast×1، writing-practice×1، rule-card×1، exercise×1 (1تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 14 ارجاع | انواع: kana-listening×5، kana-recognition×2، kana-decode×2، rule-listening×2، kana-recall×2، cloze×1 | نقش‌ها: practice×14
- **PASSIVE-RUN:** 2 ✅ — دنباله: kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 10.2 دقیقه | نسبت est/تخمین: 1.57 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 14 از 14 | دلایل حواس‌پرتی: کامل 14، جزئی 0، بدون 0
- **تمایز متن f1:** 10 رشتهٔ متمایز از 14 تمرین
- **پیش‌نیاز:** ['stn-kana-h14'] — خطی ✅
- **fsrsItems:** 3 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}
- **تحلیل قاعده:** rule-step×2 (نقش‌ها: notice×1، explain×1)؛ rule-contrast×1؛ تعامل‌های تعبیه‌شده: ask در rule-step 0، ask در contrast 1، guided-discovery/structured-input 0، پیش‌بینی دیالوگ 0، پاسخ صحنه 0
  - ℹ️ هیچ rule-stepی با نقش «apply» وجود ندارد.
- **🚩 پرچم‌های قرمز محلی:** تعداد گزینه خارج از ۳–۴: ['ex-kana-h15-lis-1', 'ex-kana-h15-lis-2']

#### 17. `stn-kana-k1` — ردیف ア + طرحوارهٔ قرینه‌گری

- **هدف:** قاعدهٔ صادق فاز K: همان ۴۶ صدا، صورت دوم — وام‌واژه‌های آماده به‌عنوان اشتها (الگوی H0)؛ اولین بازگشایی واقعی در K2؛ انت | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 12
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (2تمرین)، kana-card×5، exercise×1 (3تمرین)، writing-practice×1، exercise×2 (5تمرین)، wrap-up×1
- **تمرین‌ها:** 17 ارجاع | انواع: kana-listening×7، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×17
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 1.0 دقیقه/بلوک | تخمین ابتکاری: 10.2 دقیقه | نسبت est/تخمین: 1.18 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 17 از 17 | دلایل حواس‌پرتی: کامل 17، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 17 تمرین
- **پیش‌نیاز:** ['stn-kana-h15'] — خطی ✅
- **fsrsItems:** 5 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 18. `stn-kana-k2` — ردیف タ

- **هدف:** اولین گلیف‌های داکوتن‌دار کاتاکانا (ド) با یادآوری مفهوم H5 | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 18 ارجاع | انواع: kana-listening×8، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×18
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 10.9 دقیقه | نسبت est/تخمین: 1.10 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 18 از 18 | دلایل حواس‌پرتی: کامل 18، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 18 تمرین
- **پیش‌نیاز:** ['stn-kana-k1'] — خطی ✅
- **fsrsItems:** 5 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 19. `stn-kana-k3` — ردیف ラ

- **هدف:** ردیف ラ | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 18 ارجاع | انواع: kana-listening×8، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×18
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 10.9 دقیقه | نسبت est/تخمین: 1.10 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 18 از 18 | دلایل حواس‌پرتی: کامل 18، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 18 تمرین
- **پیش‌نیاز:** ['stn-kana-k2'] — خطی ✅
- **fsrsItems:** 5 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 20. `stn-kana-k4` — ردیف サ

- **هدف:** ردیف サ | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 18 ارجاع | انواع: kana-listening×8، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×18
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 11.1 دقیقه | نسبت est/تخمین: 1.08 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 18 از 18 | دلایل حواس‌پرتی: کامل 18، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 18 تمرین
- **پیش‌نیاز:** ['stn-kana-k3'] — خطی ✅
- **fsrsItems:** 6 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 21. `stn-kana-k5` — ردیف ハ

- **هدف:** ردیف ハ | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 18 ارجاع | انواع: kana-listening×8، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×18
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 11.2 دقیقه | نسبت est/تخمین: 1.07 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 18 از 18 | دلایل حواس‌پرتی: کامل 18، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 18 تمرین
- **پیش‌نیاز:** ['stn-kana-k4'] — خطی ✅
- **fsrsItems:** 5 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 22. `stn-kana-k6` — ン

- **هدف:** ン | core: بله | estMinutes: **10** | estLoad: **medium** | بلوک‌ها: 8
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×1 (3تمرین)، writing-practice×1، kana-card×1، exercise×3 (1تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 6 ارجاع | انواع: kana-listening×4، kana-recognition×1، kana-recall×1 | نقش‌ها: practice×6
- **PASSIVE-RUN:** 2 ✅ — دنباله: example-set → wrap-up
- **زمان:** 1.2 دقیقه/بلوک | تخمین ابتکاری: 4.0 دقیقه | نسبت est/تخمین: 2.50 → نامعقول ⚠️
- **بازخورد:** هر سه سطح (f1+f2+f3): 6 از 6 | دلایل حواس‌پرتی: کامل 6، جزئی 0، بدون 0
- **تمایز متن f1:** 3 رشتهٔ متمایز از 6 تمرین
- **پیش‌نیاز:** ['stn-kana-k5'] — خطی ✅
- **fsrsItems:** 2 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 23. `stn-kana-k7` — ردیف カ

- **هدف:** ردیف カ | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×1 (1تمرین)، kana-card×5، exercise×1 (3تمرین)، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 16 ارجاع | انواع: kana-listening×6، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×16
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 10.7 دقیقه | نسبت est/تخمین: 1.12 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 16 از 16 | دلایل حواس‌پرتی: کامل 16، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 16 تمرین
- **پیش‌نیاز:** ['stn-kana-k6'] — خطی ✅
- **fsrsItems:** 6 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 24. `stn-kana-k8` — قاعدهٔ کوچوئون‌پو (ー)

- **هدف:** کوچوئون‌پو: خط کشش ー در کاتاکانا = تکرار مصوت قبل | core: بله | estMinutes: **14** | estLoad: **light** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×3 (3تمرین)، rule-prereq×1، rule-step×3، rule-contrast×1، exercise×2 (2تمرین)، example-set×1، rule-card×1، wrap-up×1
- **تمرین‌ها:** 13 ارجاع | انواع: kana-decode×7، kana-listening×3، rule-listening×2، cloze×1 | نقش‌ها: practice×13
- **PASSIVE-RUN:** 2 ✅ — دنباله: rule-prereq → rule-step
- **زمان:** 1.1 دقیقه/بلوک | تخمین ابتکاری: 8.2 دقیقه | نسبت est/تخمین: 1.70 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 13 از 13 | دلایل حواس‌پرتی: کامل 13، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 13 تمرین
- **پیش‌نیاز:** ['stn-kana-k7'] — خطی ✅
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}
- **تحلیل قاعده:** rule-step×3 (نقش‌ها: notice×2، explain×1)؛ rule-contrast×1؛ تعامل‌های تعبیه‌شده: ask در rule-step 1، ask در contrast 1، guided-discovery/structured-input 0، پیش‌بینی دیالوگ 0، پاسخ صحنه 0
  - ℹ️ هیچ rule-stepی با نقش «apply» وجود ندارد.
- **🚩 پرچم‌های قرمز محلی:** تعداد گزینه خارج از ۳–۴: ['ex-kana-k8-lis-1', 'ex-kana-k8-lis-2']

#### 25. `stn-kana-k9` — ردیف マ

- **هدف:** ردیف マ | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 18 ارجاع | انواع: kana-listening×8، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×18
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 11.1 دقیقه | نسبت est/تخمین: 1.08 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 18 از 18 | دلایل حواس‌پرتی: کامل 18، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 18 تمرین
- **پیش‌نیاز:** ['stn-kana-k8'] — خطی ✅
- **fsrsItems:** 5 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 26. `stn-kana-k10` — ردیف ヤ

- **هدف:** ردیف ヤ | core: بله | estMinutes: **10** | estLoad: **medium** | بلوک‌ها: 10
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×4 (3تمرین)، kana-card×3، writing-practice×1، example-set×1، wrap-up×1
- **تمرین‌ها:** 12 ارجاع | انواع: kana-listening×6، kana-recognition×3، kana-recall×3 | نقش‌ها: practice×12
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 1.0 دقیقه/بلوک | تخمین ابتکاری: 6.9 دقیقه | نسبت est/تخمین: 1.45 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 12 از 12 | دلایل حواس‌پرتی: کامل 12، جزئی 0، بدون 0
- **تمایز متن f1:** 7 رشتهٔ متمایز از 12 تمرین
- **پیش‌نیاز:** ['stn-kana-k9'] — خطی ✅
- **fsrsItems:** 4 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 27. `stn-kana-k11` — ردیف ナ

- **هدف:** ردیف ナ | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 13
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (3تمرین)، kana-card×5، exercise×1 (2تمرین)، writing-practice×1، exercise×2 (5تمرین)، example-set×1، wrap-up×1
- **تمرین‌ها:** 18 ارجاع | انواع: kana-listening×8، kana-recognition×5، kana-recall×5 | نقش‌ها: practice×18
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: kana-card → kana-card → kana-card
- **زمان:** 0.9 دقیقه/بلوک | تخمین ابتکاری: 11.1 دقیقه | نسبت est/تخمین: 1.08 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 18 از 18 | دلایل حواس‌پرتی: کامل 18، جزئی 0، بدون 0
- **تمایز متن f1:** 11 رشتهٔ متمایز از 18 تمرین
- **پیش‌نیاز:** ['stn-kana-k10'] — خطی ✅
- **fsrsItems:** 7 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 28. `stn-kana-k12` — ردیف ワ + ترکیب خارجی (ファ/ティ/ヴ…)

- **هدف:** تنها واحد فاز K با روماجی روشن (استثنای CONTENT-107) | core: بله | estMinutes: **12** | estLoad: **medium** | بلوک‌ها: 9
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×1 (3تمرین)، kana-card×2، exercise×3 (2تمرین)، writing-practice×1، example-set×1، wrap-up×1
- **تمرین‌ها:** 9 ارجاع | انواع: kana-listening×5، kana-recognition×2، kana-recall×2 | نقش‌ها: practice×9
- **PASSIVE-RUN:** 2 ✅ — دنباله: kana-card → kana-card
- **زمان:** 1.3 دقیقه/بلوک | تخمین ابتکاری: 5.4 دقیقه | نسبت est/تخمین: 2.22 → نامعقول ⚠️
- **بازخورد:** هر سه سطح (f1+f2+f3): 9 از 9 | دلایل حواس‌پرتی: کامل 9، جزئی 0، بدون 0
- **تمایز متن f1:** 5 رشتهٔ متمایز از 9 تمرین
- **پیش‌نیاز:** ['stn-kana-k11'] — خطی ✅
- **fsrsItems:** 3 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 29. `stn-kana-k13` — آشتی دو خط + نامِ خودت

- **هدف:** تمرین تمایز هیراگانا و کاتاکانا + نوشتن نام خود به کاتاکانا | core: بله | estMinutes: **13** | estLoad: **medium** | بلوک‌ها: 8
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×1 (2تمرین)، scene×1، rule-prereq×1، rule-contrast×1، rule-step×1، exercise×1 (6تمرین)، character-scene×1، wrap-up×1
- **تمرین‌ها:** 8 ارجاع | انواع: kana-recognition×6، kana-listening×2 | نقش‌ها: practice×8
- **PASSIVE-RUN:** 2 ✅ — دنباله: scene → rule-prereq
- **زمان:** 1.6 دقیقه/بلوک | تخمین ابتکاری: 6.4 دقیقه | نسبت est/تخمین: 2.03 → نامعقول ⚠️
- **بازخورد:** هر سه سطح (f1+f2+f3): 8 از 8 | دلایل حواس‌پرتی: کامل 2، جزئی 0، بدون 6
- **تمایز متن f1:** 7 رشتهٔ متمایز از 8 تمرین
- **پیش‌نیاز:** ['stn-kana-k12'] — خطی ✅
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}
- **تحلیل قاعده — *خارج از فهرست ایستگاه‌های قاعدهٔ ممیزی*:** rule-step×1 (نقش‌ها: explain×1)؛ rule-contrast×1؛ تعامل‌های تعبیه‌شده: ask در rule-step 0، ask در contrast 1، guided-discovery/structured-input 0، پیش‌بینی دیالوگ 0، پاسخ صحنه 1
  - ℹ️ هیچ rule-stepی با نقش «apply» وجود ندارد.

#### 30. `stn-kana-opt-r-h9` — مرور ایستگاه‌های فاز ۱ (اختیاری)

- **هدف:** شاخهٔ اختیاری از H9 — آویخته، هرگز گیت نمی‌شود (spec §3) | core: خیر | estMinutes: **10** | estLoad: **medium** | بلوک‌ها: 2
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×1 (12تمرین)، wrap-up×1
- **تمرین‌ها:** 12 ارجاع | انواع: kana-recognition×12 | نقش‌ها: practice×12
- **PASSIVE-RUN:** 1 ✅ — دنباله: wrap-up
- **زمان:** 5.0 دقیقه/بلوک | تخمین ابتکاری: 3.5 دقیقه | نسبت est/تخمین: 2.86 → نامعقول ⚠️
- **بازخورد:** هر سه سطح (f1+f2+f3): 12 از 12 | دلایل حواس‌پرتی: کامل 12، جزئی 0، بدون 0
- **تمایز متن f1:** 12 رشتهٔ متمایز از 12 تمرین
- **پیش‌نیاز:** ['stn-kana-h9'] — نوبت اختیاری — الزام خطی ندارد
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

#### 31. `stn-kana-opt-drill` — دریل آزاد کانا (اختیاری)

- **هدف:** FEAT-158 — تمرین بازشناسی با فیلتر ردیف/خط، خارج از مسیر اصلی | core: خیر | estMinutes: **10** | estLoad: **medium** | بلوک‌ها: 3
- **ترکیب بلوک‌ها (به‌ترتیب):** writing-practice×1، exercise×1 (10تمرین)، wrap-up×1
- **تمرین‌ها:** 10 ارجاع | انواع: kana-recognition×10 | نقش‌ها: practice×10
- **PASSIVE-RUN:** 1 ✅ — دنباله: wrap-up
- **زمان:** 3.3 دقیقه/بلوک | تخمین ابتکاری: 7.0 دقیقه | نسبت est/تخمین: 1.43 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 10 از 10 | دلایل حواس‌پرتی: کامل 10، جزئی 0، بدون 0
- **تمایز متن f1:** 10 رشتهٔ متمایز از 10 تمرین
- **پیش‌نیاز:** بدون پیش‌نیاز — نوبت اختیاری — الزام خطی ندارد
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {"threshold": 0.7}

### جمع‌بندی سطح فصل kana01

**توزیع انواع تمرین (459 تمرین):**

| نوع تمرین | تعداد |
|-----------|-------|
| `kana-listening` | 172 |
| `kana-recognition` | 125 |
| `kana-recall` | 92 |
| `kana-decode` | 49 |
| `rule-listening` | 13 |
| `cloze` | 6 |
| `produce-template` | 2 |

**ترکیب assessmentRole:** practice×446، mastery_M1×3، mastery_M3×3، mastery_M2×3، mastery_M4×2، mastery_M5×2

**اندازهٔ استخر ارزیابی (گیت فصل):** M1=3، M2=3، M3=3، M4=2، M5=2 — مجموع 13
  - ⚠️ هیچ‌کدام از 13 تمرین گیت در بلوک هیچ نوبتی ارجاع نشده‌اند (استخر شناور در سطح فصل).

**زنجیرهٔ پیش‌نیاز (نوبت‌های اصلی):** کاملاً خطی ✅ (هر نوبت فقط به نوبت اصلیِ قبلی وابسته است)

**پیش‌نیاز نوبت‌های اختیاری:**
- `stn-kana-opt-r-h9` ← ['stn-kana-h9']
- `stn-kana-opt-drill` ← بدون پیش‌نیاز ⚠️

**مجموع دقیقه‌ها:** نوبت‌های اصلی 356 دقیقه + اختیاری 20 دقیقه = 376؛ در برابر estMinutes اعلام‌شدهٔ فصل: **338** — اختلاف 18 دقیقه ⚠️

**پوشش واحدها:** 31 نوبت در واحدها؛ خارج از واحدها: —؛ slug مبهم: —

**وزن‌های mastery فصل:** {"M1": 0.3, "M2": 0.25, "M3": 0.2, "M4": 0.15, "M5": 0.1} 

---

## فصل fm01 — `first-meeting-01` (سطح L2) — «فصل ۰۲ — اولین مکالمه: わたしは学生です»

**canDo:** در پایان این فصل می‌توانی خودت را کامل معرفی کنی (نام، ملیت، خاستگاه)، هویت دیگران را بپرسی و تأیید کنی، فرض غلط را مؤدبانه رد کنی — و کل مکالمهٔ ۱۴ نوبتی را بفهمی.  
**خلاصه:** میکی دوستش سورا را به کافهٔ یامادا می‌آورد؛ کنار پنجره علی کتاب می‌خواند و کمی بعد کیم — همکلاسی کره‌ای سورا — وارد می‌شود. یک مکالمه، دو واحد داستانی، و در پایان گیت فهم.
**پیش‌نیاز فصل:** kana-foundation-01

- estMinutes فصل: **45** | estLoad: **medium** | تعداد نوبت: **22** (18 اصلی + 4 اختیاری)
- تمرین‌های سریال‌شده: **76** | واژه: **11** | دستور: **5** | تعبیر/آیین: **8** | واحدها: **2**

### جدول نمای کلی نوبت‌های fm01

| # | slug | عنوان | core | دقیقه | بار | بلوک‌ها | تمرین | PASSIVE-RUN | fsrs | completion | پیش‌نیاز |
|---|------|--------|------|-------|-----|---------|-------|-------------|------|------------|-----------|
| 1 | `stn-fm01-01-anchor` | اولین مواجهه — کل مکالمه | بله | 3 | light | scene×1، dialogue-player×1 | 0 | **1** | 0 | viewed | — |
| 2 | `stn-fm01-02-vocab` | واژه‌های هویت | بله | 4 | medium | vocab-card×8، exercise×2 (2تمرین)، exercise×1 (1تمرین)، wrap-up×1 | 5 | **3** ⚠️ | 16 | exercise_threshold (0.6) | ['stn-fm01-01-anchor'] |
| 3 | `stn-fm01-03-grammar-desu` | الگوی «X هست Y» — AはBです | بله | 4 | medium | dialogue-player×1، guided-discovery×1، rule-card×1، example-set×1، structured-input×1، exercise×1 (4تمرین) | 4 | **2** | 1 | exercise_threshold (0.6) | ['stn-fm01-02-vocab'] |
| 4 | `stn-fm01-04-structure` | ترتیب ژاپنی و پل فارسی | بله | 2 | light | rule-card×1، example-set×1، exercise×1 (1تمرین) | 1 | **2** | 0 | exercise_threshold (0.6) | ['stn-fm01-03-grammar-desu'] |
| 5 | `stn-fm01-05-grammar-qa` | پرسش ですか و تأیید ですね | بله | 4 | medium | dialogue-player×1، guided-discovery×1، rule-card×1، example-set×1، exercise×1 (1تمرین)، expression-card×1، exercise×1 (3تمرین) | 4 | **2** | 2 | exercise_threshold (0.6) | ['stn-fm01-03-grammar-desu'] |
| 6 | `stn-fm01-06-expression` | آیین آشنایی — سه فرمول + پرسش مؤدبانه | بله | 3 | light | expression-card×4، exercise×3 (1تمرین)، wrap-up×1 | 3 | **2** | 5 | exercise_threshold (0.6) | ['stn-fm01-02-vocab'] |
| 7 | `stn-fm01-07-listen` | گوشِ اول — طول واکه و آهنگ | بله | 3 | light | listening-task×1، exercise×2 (2تمرین) | 4 | **1** | 0 | exercise_threshold (0.6) | ['stn-fm01-02-vocab', 'stn-fm01-05-grammar-qa'] |
| 8 | `stn-fm01-08-practice` | تمرین — تثبیت واحد اول | بله | 4 | medium | exercise×2 (2تمرین)، exercise×1 (5تمرین)، wrap-up×1 | 9 | **1** | 0 | exercise_threshold (0.7) | ['stn-fm01-02-vocab', 'stn-fm01-03-grammar-desu', 'stn-fm01-05-grammar-qa', 'stn-fm01-06-expression', 'stn-fm01-07-listen'] |
| 9 | `stn-fm01-09-integrate` | معرفی خودت — با میکی | بله | 3 | light | character-scene×1، wrap-up×1 | 0 | **1** | 0 | task_completed | ['stn-fm01-08-practice'] |
| 10 | `stn-fm01-10-reconnect` | بازگشت به مکالمه — این‌بار به کیم گوش کن | بله | 2 | light | scene×1، dialogue-player×1 | 0 | **1** | 0 | viewed | ['stn-fm01-09-integrate'] |
| 11 | `stn-fm01-11-vocab2` | واژه‌های واحد دوم | بله | 3 | light | exercise×1 (2تمرین)، vocab-card×3، exercise×1 (3تمرین)، wrap-up×1 | 5 | **3** ⚠️ | 6 | exercise_threshold (0.6) | ['stn-fm01-10-reconnect'] |
| 12 | `stn-fm01-12-grammar-mo` | 「هم» — も | بله | 3 | medium | dialogue-player×1، guided-discovery×1، rule-card×1، example-set×1، exercise×1 (2تمرین) | 2 | **2** | 1 | exercise_threshold (0.6) | ['stn-fm01-11-vocab2'] |
| 13 | `stn-fm01-13-grammar-dewa` | نفی مؤدبانه — では ありません | بله | 4 | medium | dialogue-player×1، guided-discovery×1، rule-card×1، example-set×1، exercise×1 (2تمرین) | 2 | **2** | 2 | exercise_threshold (0.6) | ['stn-fm01-12-grammar-mo'] |
| 14 | `stn-fm01-14-expression` | واکنش‌ها — نه، آه‌می‌فهمم، فهمیدم | بله | 3 | light | expression-card×3، exercise×2 (1تمرین)، exercise×1 (2تمرین) | 4 | **1** | 3 | exercise_threshold (0.6) | ['stn-fm01-13-grammar-dewa'] |
| 15 | `stn-fm01-15-listen` | گوشِ دوم — ん خیشومی و آهنگ ردّ مؤدب | بله | 3 | light | listening-task×1، exercise×1 (1تمرین)، exercise×1 (2تمرین) | 3 | **1** | 0 | exercise_threshold (0.6) | ['stn-fm01-11-vocab2', 'stn-fm01-14-expression'] |
| 16 | `stn-fm01-16-grammar-kara` | خاستگاه — 〜から きました | بله | 3 | medium | dialogue-player×1، guided-discovery×1، rule-card×1، example-set×1، exercise×1 (3تمرین) | 3 | **2** | 1 | exercise_threshold (0.6) | ['stn-fm01-11-vocab2'] |
| 17 | `stn-fm01-17-practice` | تمرین — درهم‌آمیزی دو واحد | بله | 4 | medium | exercise×1 (2تمرین)، exercise×2 (3تمرین)، wrap-up×1 | 8 | **1** | 0 | exercise_threshold (0.7) | ['stn-fm01-16-grammar-kara', 'stn-fm01-15-listen'] |
| 18 | `stn-fm01-18-integrate` | کاربرد کامل — ردّ فرض و معرفی با خاستگاه | بله | 3 | light | character-scene×1، wrap-up×1 | 0 | **1** | 0 | task_completed | ['stn-fm01-17-practice'] |
| 19 | `stn-fm01-opt-countries` | کشورها و زبان‌ها (اختیاری) | خیر | 3 | light | example-set×1، exercise×1 (2تمرین) | 2 | **1** | 0 | exercise_threshold (0.6) | ['stn-fm01-02-vocab'] |
| 20 | `stn-fm01-opt-review-desu` | مثال‌های محوشوندهٔ は+です (اختیاری) | خیر | 2 | light | example-set×1 | 0 | **1** | 0 | viewed | ['stn-fm01-03-grammar-desu'] |
| 21 | `stn-fm01-opt-jobs` | شغل‌ها (اختیاری) | خیر | 3 | light | example-set×1، exercise×1 (2تمرین) | 2 | **1** | 0 | exercise_threshold (0.6) | ['stn-fm01-13-grammar-dewa'] |
| 22 | `stn-fm01-opt-drill` | دریل تمایزی (اختیاری) | خیر | 3 | light | exercise×1 (3تمرین) | 3 | **0** | 0 | exercise_threshold (0.6) | ['stn-fm01-17-practice'] |

*ستون «بلوک‌ها» ترتیب واقعی را حفظ کرده است؛ برای بلوک‌های exercise تعداد تمرین ارجاع‌شده داخل پرانتز آمده.*

### تحلیل نوبت‌به‌نوبت fm01

#### 1. `stn-fm01-01-anchor` — اولین مواجهه — کل مکالمه

- **هدف:** کل مکالمهٔ ۱۴ نوبتی را یک‌بار بشنو و حس «شکاف دانستن» را تجربه کن | core: بله | estMinutes: **3** | estLoad: **light** | بلوک‌ها: 2
- **ترکیب بلوک‌ها (به‌ترتیب):** scene×1، dialogue-player×1
- **تمرین‌ها:** 0 ارجاع | انواع: — | نقش‌ها: —
- **PASSIVE-RUN:** 1 ✅ — دنباله: scene
- **زمان:** 1.5 دقیقه/بلوک | تخمین ابتکاری: 2.2 دقیقه | نسبت est/تخمین: 1.33 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 0 از 0 | دلایل حواس‌پرتی: کامل 0، جزئی 0، بدون 0
- **تمایز متن f1:** 0 رشتهٔ متمایز از 0 تمرین
- **پیش‌نیاز:** بدون پیش‌نیاز — خطی ✅
- **fsrsItems:** 0 | **completion:** {"kind": "viewed"} | **mastery:** {}

#### 2. `stn-fm01-02-vocab` — واژه‌های هویت

- **هدف:** ۸ واژهٔ هویت را با صدا بشناس: من، پسوند さん، سه ملیت، دانشگاه، استاد، آن شخص | core: بله | estMinutes: **4** | estLoad: **medium** | بلوک‌ها: 12
- **ترکیب بلوک‌ها (به‌ترتیب):** vocab-card×8، exercise×2 (2تمرین)، exercise×1 (1تمرین)، wrap-up×1
- **تمرین‌ها:** 5 ارجاع | انواع: audio-meaning×3، meaning-select×1، match-in-line×1 | نقش‌ها: practice×5
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: vocab-card → vocab-card → vocab-card
- **زمان:** 0.3 دقیقه/بلوک | تخمین ابتکاری: 5.8 دقیقه | نسبت est/تخمین: 0.69 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 5 از 5 | دلایل حواس‌پرتی: کامل 1، جزئی 1، بدون 3
- **تمایز متن f1:** 5 رشتهٔ متمایز از 5 تمرین
- **پیش‌نیاز:** ['stn-fm01-01-anchor'] — خطی ✅
- **fsrsItems:** 16 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}

#### 3. `stn-fm01-03-grammar-desu` — الگوی «X هست Y» — AはBです

- **هدف:** جملهٔ هویت را بفهم و بساز: わたしは にほんじんです | core: بله | estMinutes: **4** | estLoad: **medium** | بلوک‌ها: 6
- **ترکیب بلوک‌ها (به‌ترتیب):** dialogue-player×1، guided-discovery×1، rule-card×1، example-set×1، structured-input×1، exercise×1 (4تمرین)
- **تمرین‌ها:** 4 ارجاع | انواع: produce-template×2، word-order×1، cloze×1 | نقش‌ها: practice×4
- **PASSIVE-RUN:** 2 ✅ — دنباله: rule-card → example-set
- **زمان:** 0.7 دقیقه/بلوک | تخمین ابتکاری: 4.8 دقیقه | نسبت est/تخمین: 0.83 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 4 از 4 | دلایل حواس‌پرتی: کامل 0، جزئی 1، بدون 0
- **تمایز متن f1:** 4 رشتهٔ متمایز از 4 تمرین
- **پیش‌نیاز:** ['stn-fm01-02-vocab'] — خطی ✅
- **fsrsItems:** 1 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}
- **تحلیل قاعده:** rule-step×0 (نقش‌ها: —)؛ rule-contrast×0؛ تعامل‌های تعبیه‌شده: ask در rule-step 0، ask در contrast 0، guided-discovery/structured-input 2، پیش‌بینی دیالوگ 0، پاسخ صحنه 0

#### 4. `stn-fm01-04-structure` — ترتیب ژاپنی و پل فارسی

- **هدف:** بفهم چرا سورا در نوبت ۴ «من» را نمی‌گوید — و چرا ترتیب برای تو غریبه نیست | core: بله | estMinutes: **2** | estLoad: **light** | بلوک‌ها: 3
- **ترکیب بلوک‌ها (به‌ترتیب):** rule-card×1، example-set×1، exercise×1 (1تمرین)
- **تمرین‌ها:** 1 ارجاع | انواع: word-order×1 | نقش‌ها: practice×1
- **PASSIVE-RUN:** 2 ✅ — دنباله: rule-card → example-set
- **زمان:** 0.7 دقیقه/بلوک | تخمین ابتکاری: 1.4 دقیقه | نسبت est/تخمین: 1.41 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 1 از 1 | دلایل حواس‌پرتی: کامل 0، جزئی 0، بدون 0
- **تمایز متن f1:** 1 رشتهٔ متمایز از 1 تمرین
- **پیش‌نیاز:** ['stn-fm01-03-grammar-desu'] — خطی ✅
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}
- **تحلیل قاعده:** rule-step×0 (نقش‌ها: —)؛ rule-contrast×0؛ تعامل‌های تعبیه‌شده: ask در rule-step 0، ask در contrast 0، guided-discovery/structured-input 0، پیش‌بینی دیالوگ 0، پاسخ صحنه 0

#### 5. `stn-fm01-05-grammar-qa` — پرسش ですか و تأیید ですね

- **هدف:** هویت را بپرس (ですか) و شنیده‌ات را تأیید کن (ですね) | core: بله | estMinutes: **4** | estLoad: **medium** | بلوک‌ها: 7
- **ترکیب بلوک‌ها (به‌ترتیب):** dialogue-player×1، guided-discovery×1، rule-card×1، example-set×1، exercise×1 (1تمرین)، expression-card×1، exercise×1 (3تمرین)
- **تمرین‌ها:** 4 ارجاع | انواع: produce-template×2، audio-meaning×1، cloze×1 | نقش‌ها: practice×4
- **PASSIVE-RUN:** 2 ✅ — دنباله: rule-card → example-set
- **زمان:** 0.6 دقیقه/بلوک | تخمین ابتکاری: 4.4 دقیقه | نسبت est/تخمین: 0.91 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 4 از 4 | دلایل حواس‌پرتی: کامل 0، جزئی 1، بدون 1
- **تمایز متن f1:** 4 رشتهٔ متمایز از 4 تمرین
- **پیش‌نیاز:** ['stn-fm01-03-grammar-desu'] — انحراف از زنجیرهٔ خطی ⚠️
- **fsrsItems:** 2 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}
- **تحلیل قاعده:** rule-step×0 (نقش‌ها: —)؛ rule-contrast×0؛ تعامل‌های تعبیه‌شده: ask در rule-step 0، ask در contrast 0، guided-discovery/structured-input 1، پیش‌بینی دیالوگ 0، پاسخ صحنه 0

#### 6. `stn-fm01-06-expression` — آیین آشنایی — سه فرمول + پرسش مؤدبانه

- **هدف:** فرمول‌های آشنایی را در جای درست به‌کار ببر | core: بله | estMinutes: **3** | estLoad: **light** | بلوک‌ها: 8
- **ترکیب بلوک‌ها (به‌ترتیب):** expression-card×4، exercise×3 (1تمرین)، wrap-up×1
- **تمرین‌ها:** 3 ارجاع | انواع: response-select×2، dialogue-order×1 | نقش‌ها: practice×3
- **PASSIVE-RUN:** 2 ✅ — دنباله: expression-card → expression-card
- **زمان:** 0.4 دقیقه/بلوک | تخمین ابتکاری: 3.5 دقیقه | نسبت est/تخمین: 0.86 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 3 از 3 | دلایل حواس‌پرتی: کامل 1، جزئی 1، بدون 0
- **تمایز متن f1:** 3 رشتهٔ متمایز از 3 تمرین
- **پیش‌نیاز:** ['stn-fm01-02-vocab'] — انحراف از زنجیرهٔ خطی ⚠️
- **fsrsItems:** 5 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}

#### 7. `stn-fm01-07-listen` — گوشِ اول — طول واکه و آهنگ

- **هدف:** بدون متن دنبال کن: جیست، چه‌کسی، و تفاوت‌های صدایی | core: بله | estMinutes: **3** | estLoad: **light** | بلوک‌ها: 3
- **ترکیب بلوک‌ها (به‌ترتیب):** listening-task×1، exercise×2 (2تمرین)
- **تمرین‌ها:** 4 ارجاع | انواع: listen-minimal-pair×2، gist-select×1، speaker-identify×1 | نقش‌ها: practice×4
- **PASSIVE-RUN:** 1 ✅ — دنباله: listening-task
- **زمان:** 1.0 دقیقه/بلوک | تخمین ابتکاری: 2.5 دقیقه | نسبت est/تخمین: 1.20 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 4 از 4 | دلایل حواس‌پرتی: کامل 0، جزئی 0، بدون 4
- **تمایز متن f1:** 4 رشتهٔ متمایز از 4 تمرین
- **پیش‌نیاز:** ['stn-fm01-02-vocab', 'stn-fm01-05-grammar-qa'] — انحراف از زنجیرهٔ خطی ⚠️
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}

#### 8. `stn-fm01-08-practice` — تمرین — تثبیت واحد اول

- **هدف:** همهٔ آموخته‌های نوبت‌های ۱–۸ را بازیابی کن | core: بله | estMinutes: **4** | estLoad: **medium** | بلوک‌ها: 4
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×2 (2تمرین)، exercise×1 (5تمرین)، wrap-up×1
- **تمرین‌ها:** 9 ارجاع | انواع: audio-meaning×2، kana-decode×2، word-order×1، cloze×1، produce-template×1، gist-select×1، listen-minimal-pair×1 | نقش‌ها: practice×9
- **PASSIVE-RUN:** 1 ✅ — دنباله: wrap-up
- **زمان:** 1.0 دقیقه/بلوک | تخمین ابتکاری: 2.8 دقیقه | نسبت est/تخمین: 1.45 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 9 از 9 | دلایل حواس‌پرتی: کامل 0، جزئی 3، بدون 4
- **تمایز متن f1:** 9 رشتهٔ متمایز از 9 تمرین
- **پیش‌نیاز:** ['stn-fm01-02-vocab', 'stn-fm01-03-grammar-desu', 'stn-fm01-05-grammar-qa', 'stn-fm01-06-expression', 'stn-fm01-07-listen'] — انحراف از زنجیرهٔ خطی ⚠️
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {}

#### 9. `stn-fm01-09-integrate` — معرفی خودت — با میکی

- **هدف:** خودت را در موقعیت واقعی معرفی کن | core: بله | estMinutes: **3** | estLoad: **light** | بلوک‌ها: 2
- **ترکیب بلوک‌ها (به‌ترتیب):** character-scene×1، wrap-up×1
- **تمرین‌ها:** 0 ارجاع | انواع: — | نقش‌ها: —
- **PASSIVE-RUN:** 1 ✅ — دنباله: wrap-up
- **زمان:** 1.5 دقیقه/بلوک | تخمین ابتکاری: 2.0 دقیقه | نسبت est/تخمین: 1.50 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 0 از 0 | دلایل حواس‌پرتی: کامل 0، جزئی 0، بدون 0
- **تمایز متن f1:** 0 رشتهٔ متمایز از 0 تمرین
- **پیش‌نیاز:** ['stn-fm01-08-practice'] — خطی ✅
- **fsrsItems:** 0 | **completion:** {"kind": "task_completed"} | **mastery:** {}

#### 10. `stn-fm01-10-reconnect` — بازگشت به مکالمه — این‌بار به کیم گوش کن

- **هدف:** همان مکالمه را با تمرکز نوبت‌های ۹–۱۴ دوباره بشنو | core: بله | estMinutes: **2** | estLoad: **light** | بلوک‌ها: 2
- **ترکیب بلوک‌ها (به‌ترتیب):** scene×1، dialogue-player×1
- **تمرین‌ها:** 0 ارجاع | انواع: — | نقش‌ها: —
- **PASSIVE-RUN:** 1 ✅ — دنباله: scene
- **زمان:** 1.0 دقیقه/بلوک | تخمین ابتکاری: 2.2 دقیقه | نسبت est/تخمین: 0.89 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 0 از 0 | دلایل حواس‌پرتی: کامل 0، جزئی 0، بدون 0
- **تمایز متن f1:** 0 رشتهٔ متمایز از 0 تمرین
- **پیش‌نیاز:** ['stn-fm01-09-integrate'] — خطی ✅
- **fsrsItems:** 0 | **completion:** {"kind": "viewed"} | **mastery:** {}

#### 11. `stn-fm01-11-vocab2` — واژه‌های واحد دوم

- **هدف:** ۳ واژهٔ تازه (کره‌ای، از، آمد) + بازیافت واژه‌های قبل | core: بله | estMinutes: **3** | estLoad: **light** | بلوک‌ها: 6
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×1 (2تمرین)، vocab-card×3، exercise×1 (3تمرین)، wrap-up×1
- **تمرین‌ها:** 5 ارجاع | انواع: kana-decode×2، audio-meaning×2، meaning-select×1 | نقش‌ها: practice×5
- **PASSIVE-RUN:** 3 ⚠️ (فراتر از آستانهٔ ≤۲) — دنباله: vocab-card → vocab-card → vocab-card
- **زمان:** 0.5 دقیقه/بلوک | تخمین ابتکاری: 3.2 دقیقه | نسبت est/تخمین: 0.92 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 5 از 5 | دلایل حواس‌پرتی: کامل 1، جزئی 2، بدون 2
- **تمایز متن f1:** 5 رشتهٔ متمایز از 5 تمرین
- **پیش‌نیاز:** ['stn-fm01-10-reconnect'] — خطی ✅
- **fsrsItems:** 6 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}

#### 12. `stn-fm01-12-grammar-mo` — 「هم» — も

- **هدف:** با も بگو «او هم مثل قبلی است»: キムさんも ちゅうごくじんですか | core: بله | estMinutes: **3** | estLoad: **medium** | بلوک‌ها: 5
- **ترکیب بلوک‌ها (به‌ترتیب):** dialogue-player×1، guided-discovery×1، rule-card×1، example-set×1، exercise×1 (2تمرین)
- **تمرین‌ها:** 2 ارجاع | انواع: cloze×1، produce-template×1 | نقش‌ها: practice×2
- **PASSIVE-RUN:** 2 ✅ — دنباله: rule-card → example-set
- **زمان:** 0.6 دقیقه/بلوک | تخمین ابتکاری: 3.5 دقیقه | نسبت est/تخمین: 0.86 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 2 از 2 | دلایل حواس‌پرتی: کامل 1، جزئی 0، بدون 0
- **تمایز متن f1:** 2 رشتهٔ متمایز از 2 تمرین
- **پیش‌نیاز:** ['stn-fm01-11-vocab2'] — خطی ✅
- **fsrsItems:** 1 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}
- **تحلیل قاعده:** rule-step×0 (نقش‌ها: —)؛ rule-contrast×0؛ تعامل‌های تعبیه‌شده: ask در rule-step 0، ask در contrast 0، guided-discovery/structured-input 1، پیش‌بینی دیالوگ 0، پاسخ صحنه 0

#### 13. `stn-fm01-13-grammar-dewa` — نفی مؤدبانه — では ありません

- **هدف:** فرض غلط را مؤدبانه رد کن: ちゅうごくじんでは ありません | core: بله | estMinutes: **4** | estLoad: **medium** | بلوک‌ها: 5
- **ترکیب بلوک‌ها (به‌ترتیب):** dialogue-player×1، guided-discovery×1، rule-card×1، example-set×1، exercise×1 (2تمرین)
- **تمرین‌ها:** 2 ارجاع | انواع: cloze×1، produce-template×1 | نقش‌ها: practice×2
- **PASSIVE-RUN:** 2 ✅ — دنباله: rule-card → example-set
- **زمان:** 0.8 دقیقه/بلوک | تخمین ابتکاری: 3.5 دقیقه | نسبت est/تخمین: 1.14 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 2 از 2 | دلایل حواس‌پرتی: کامل 0، جزئی 1، بدون 0
- **تمایز متن f1:** 2 رشتهٔ متمایز از 2 تمرین
- **پیش‌نیاز:** ['stn-fm01-12-grammar-mo'] — خطی ✅
- **fsrsItems:** 2 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}
- **تحلیل قاعده:** rule-step×0 (نقش‌ها: —)؛ rule-contrast×0؛ تعامل‌های تعبیه‌شده: ask در rule-step 0، ask در contrast 0، guided-discovery/structured-input 1، پیش‌بینی دیالوگ 0، پاسخ صحنه 0

#### 14. `stn-fm01-14-expression` — واکنش‌ها — نه، آه‌می‌فهمم، فهمیدم

- **هدف:** سه واکنش گفتاری را در جای درست به‌کار ببر | core: بله | estMinutes: **3** | estLoad: **light** | بلوک‌ها: 6
- **ترکیب بلوک‌ها (به‌ترتیب):** expression-card×3، exercise×2 (1تمرین)، exercise×1 (2تمرین)
- **تمرین‌ها:** 4 ارجاع | انواع: response-select×2، dialogue-order×1، produce-template×1 | نقش‌ها: practice×4
- **PASSIVE-RUN:** 1 ✅ — دنباله: expression-card
- **زمان:** 0.5 دقیقه/بلوک | تخمین ابتکاری: 2.7 دقیقه | نسبت est/تخمین: 1.12 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 4 از 4 | دلایل حواس‌پرتی: کامل 1، جزئی 1، بدون 0
- **تمایز متن f1:** 4 رشتهٔ متمایز از 4 تمرین
- **پیش‌نیاز:** ['stn-fm01-13-grammar-dewa'] — خطی ✅
- **fsrsItems:** 3 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}

#### 15. `stn-fm01-15-listen` — گوشِ دوم — ん خیشومی و آهنگ ردّ مؤدب

- **هدف:** かんこく را از かこく تمیز بده و ردّ مؤدبانه را بشناس | core: بله | estMinutes: **3** | estLoad: **light** | بلوک‌ها: 3
- **ترکیب بلوک‌ها (به‌ترتیب):** listening-task×1، exercise×1 (1تمرین)، exercise×1 (2تمرین)
- **تمرین‌ها:** 3 ارجاع | انواع: audio-meaning×1، listen-minimal-pair×1، speaker-identify×1 | نقش‌ها: practice×3
- **PASSIVE-RUN:** 1 ✅ — دنباله: listening-task
- **زمان:** 1.0 دقیقه/بلوک | تخمین ابتکاری: 2.3 دقیقه | نسبت est/تخمین: 1.29 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 3 از 3 | دلایل حواس‌پرتی: کامل 0، جزئی 0، بدون 3
- **تمایز متن f1:** 3 رشتهٔ متمایز از 3 تمرین
- **پیش‌نیاز:** ['stn-fm01-11-vocab2', 'stn-fm01-14-expression'] — انحراف از زنجیرهٔ خطی ⚠️
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}

#### 16. `stn-fm01-16-grammar-kara` — خاستگاه — 〜から きました

- **هدف:** بگو از کجا آمده‌ای: かんこくから きました / イランから きました | core: بله | estMinutes: **3** | estLoad: **medium** | بلوک‌ها: 5
- **ترکیب بلوک‌ها (به‌ترتیب):** dialogue-player×1، guided-discovery×1، rule-card×1، example-set×1، exercise×1 (3تمرین)
- **تمرین‌ها:** 3 ارجاع | انواع: gist-select×1، word-order×1، produce-template×1 | نقش‌ها: practice×3
- **PASSIVE-RUN:** 2 ✅ — دنباله: rule-card → example-set
- **زمان:** 0.6 دقیقه/بلوک | تخمین ابتکاری: 3.8 دقیقه | نسبت est/تخمین: 0.80 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 3 از 3 | دلایل حواس‌پرتی: کامل 0، جزئی 0، بدون 1
- **تمایز متن f1:** 3 رشتهٔ متمایز از 3 تمرین
- **پیش‌نیاز:** ['stn-fm01-11-vocab2'] — انحراف از زنجیرهٔ خطی ⚠️
- **fsrsItems:** 1 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}
- **تحلیل قاعده:** rule-step×0 (نقش‌ها: —)؛ rule-contrast×0؛ تعامل‌های تعبیه‌شده: ask در rule-step 0، ask در contrast 0، guided-discovery/structured-input 1، پیش‌بینی دیالوگ 0، پاسخ صحنه 0

#### 17. `stn-fm01-17-practice` — تمرین — درهم‌آمیزی دو واحد

- **هدف:** الگوهای هر دو واحد را کنار هم بازیابی کن: は/も · ですか/ではありません · خاستگاه | core: بله | estMinutes: **4** | estLoad: **medium** | بلوک‌ها: 4
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×1 (2تمرین)، exercise×2 (3تمرین)، wrap-up×1
- **تمرین‌ها:** 8 ارجاع | انواع: cloze×3، kana-decode×2، produce-template×2، dialogue-order×1 | نقش‌ها: practice×8
- **PASSIVE-RUN:** 1 ✅ — دنباله: wrap-up
- **زمان:** 1.0 دقیقه/بلوک | تخمین ابتکاری: 2.5 دقیقه | نسبت est/تخمین: 1.60 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 8 از 8 | دلایل حواس‌پرتی: کامل 2، جزئی 3، بدون 0
- **تمایز متن f1:** 8 رشتهٔ متمایز از 8 تمرین
- **پیش‌نیاز:** ['stn-fm01-16-grammar-kara', 'stn-fm01-15-listen'] — انحراف از زنجیرهٔ خطی ⚠️
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.7} | **mastery:** {}

#### 18. `stn-fm01-18-integrate` — کاربرد کامل — ردّ فرض و معرفی با خاستگاه

- **هدف:** وقتی میکی حدس می‌زند چینی هستی، مؤدبانه اصلاح کن و خودت را کامل معرفی کن | core: بله | estMinutes: **3** | estLoad: **light** | بلوک‌ها: 2
- **ترکیب بلوک‌ها (به‌ترتیب):** character-scene×1، wrap-up×1
- **تمرین‌ها:** 0 ارجاع | انواع: — | نقش‌ها: —
- **PASSIVE-RUN:** 1 ✅ — دنباله: wrap-up
- **زمان:** 1.5 دقیقه/بلوک | تخمین ابتکاری: 2.0 دقیقه | نسبت est/تخمین: 1.50 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 0 از 0 | دلایل حواس‌پرتی: کامل 0، جزئی 0، بدون 0
- **تمایز متن f1:** 0 رشتهٔ متمایز از 0 تمرین
- **پیش‌نیاز:** ['stn-fm01-17-practice'] — خطی ✅
- **fsrsItems:** 0 | **completion:** {"kind": "task_completed"} | **mastery:** {}

#### 19. `stn-fm01-opt-countries` — کشورها و زبان‌ها (اختیاری)

- **هدف:** الگوی 〜じん را با کشورهای بیشتر تمرین کن — پیش‌نمایش 〜ご | core: خیر | estMinutes: **3** | estLoad: **light** | بلوک‌ها: 2
- **ترکیب بلوک‌ها (به‌ترتیب):** example-set×1، exercise×1 (2تمرین)
- **تمرین‌ها:** 2 ارجاع | انواع: response-select×1، produce-template×1 | نقش‌ها: practice×2
- **PASSIVE-RUN:** 1 ✅ — دنباله: example-set
- **زمان:** 1.5 دقیقه/بلوک | تخمین ابتکاری: 1.2 دقیقه | نسبت est/تخمین: 2.57 → نامعقول ⚠️
- **بازخورد:** هر سه سطح (f1+f2+f3): 2 از 2 | دلایل حواس‌پرتی: کامل 1، جزئی 0، بدون 0
- **تمایز متن f1:** 2 رشتهٔ متمایز از 2 تمرین
- **پیش‌نیاز:** ['stn-fm01-02-vocab'] — نوبت اختیاری — الزام خطی ندارد
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}

#### 20. `stn-fm01-opt-review-desu` — مثال‌های محوشوندهٔ は+です (اختیاری)

- **هدف:** ۴ بافت تازه با جای‌خالی — الگو را خودت کامل کن | core: خیر | estMinutes: **2** | estLoad: **light** | بلوک‌ها: 1
- **ترکیب بلوک‌ها (به‌ترتیب):** example-set×1
- **تمرین‌ها:** 0 ارجاع | انواع: — | نقش‌ها: —
- **PASSIVE-RUN:** 1 ✅ — دنباله: example-set
- **زمان:** 2.0 دقیقه/بلوک | تخمین ابتکاری: 0.7 دقیقه | نسبت est/تخمین: 3.00 → نامعقول ⚠️
- **بازخورد:** هر سه سطح (f1+f2+f3): 0 از 0 | دلایل حواس‌پرتی: کامل 0، جزئی 0، بدون 0
- **تمایز متن f1:** 0 رشتهٔ متمایز از 0 تمرین
- **پیش‌نیاز:** ['stn-fm01-03-grammar-desu'] — نوبت اختیاری — الزام خطی ندارد
- **fsrsItems:** 0 | **completion:** {"kind": "viewed"} | **mastery:** {}

#### 21. `stn-fm01-opt-jobs` — شغل‌ها (اختیاری)

- **هدف:** ۸ واژهٔ شغل را بشناس تا شغل خودت را بگویی — فقط با انتخاب صریح تو کارت می‌شود | core: خیر | estMinutes: **3** | estLoad: **light** | بلوک‌ها: 2
- **ترکیب بلوک‌ها (به‌ترتیب):** example-set×1، exercise×1 (2تمرین)
- **تمرین‌ها:** 2 ارجاع | انواع: response-select×1، produce-template×1 | نقش‌ها: practice×2
- **PASSIVE-RUN:** 1 ✅ — دنباله: example-set
- **زمان:** 1.5 دقیقه/بلوک | تخمین ابتکاری: 1.5 دقیقه | نسبت est/تخمین: 2.00 → معقول
- **بازخورد:** هر سه سطح (f1+f2+f3): 2 از 2 | دلایل حواس‌پرتی: کامل 0، جزئی 1، بدون 0
- **تمایز متن f1:** 2 رشتهٔ متمایز از 2 تمرین
- **پیش‌نیاز:** ['stn-fm01-13-grammar-dewa'] — نوبت اختیاری — الزام خطی ندارد
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}

#### 22. `stn-fm01-opt-drill` — دریل تمایزی (اختیاری)

- **هدف:** جفت‌های مرگبار فصل را جدا کن: ですか/ですね · は/も · طول واکه | core: خیر | estMinutes: **3** | estLoad: **light** | بلوک‌ها: 1
- **ترکیب بلوک‌ها (به‌ترتیب):** exercise×1 (3تمرین)
- **تمرین‌ها:** 3 ارجاع | انواع: cloze×2، listen-minimal-pair×1 | نقش‌ها: practice×3
- **PASSIVE-RUN:** 0 ✅ — دنباله: —
- **زمان:** 3.0 دقیقه/بلوک | تخمین ابتکاری: 0.8 دقیقه | نسبت est/تخمین: 4.00 → نامعقول ⚠️
- **بازخورد:** هر سه سطح (f1+f2+f3): 3 از 3 | دلایل حواس‌پرتی: کامل 0، جزئی 2، بدون 1
- **تمایز متن f1:** 3 رشتهٔ متمایز از 3 تمرین
- **پیش‌نیاز:** ['stn-fm01-17-practice'] — نوبت اختیاری — الزام خطی ندارد
- **fsrsItems:** 0 | **completion:** {"kind": "exercise_threshold", "threshold": 0.6} | **mastery:** {}

### جمع‌بندی سطح فصل fm01

**توزیع انواع تمرین (76 تمرین):**

| نوع تمرین | تعداد |
|-----------|-------|
| `produce-template` | 13 |
| `cloze` | 12 |
| `audio-meaning` | 10 |
| `response-select` | 7 |
| `kana-decode` | 6 |
| `meaning-select` | 5 |
| `word-order` | 5 |
| `listen-minimal-pair` | 5 |
| `dialogue-order` | 4 |
| `gist-select` | 4 |
| `speaker-identify` | 3 |
| `match-in-line` | 1 |
| `listen-who-asked` | 1 |

**ترکیب assessmentRole:** practice×64، mastery_M1×3، mastery_M3×3، mastery_M2×2، mastery_M4×2، mastery_M5×2

**اندازهٔ استخر ارزیابی (گیت فصل):** M1=3، M2=2، M3=3، M4=2، M5=2 — مجموع 12
  - ⚠️ هیچ‌کدام از 12 تمرین گیت در بلوک هیچ نوبتی ارجاع نشده‌اند (استخر شناور در سطح فصل).

**زنجیرهٔ پیش‌نیاز (نوبت‌های اصلی) — انحراف‌ها از خطی بودن:**

- `stn-fm01-05-grammar-qa` ← پیش‌نیازِ واقعی: ['stn-fm01-03-grammar-desu'] | انتظار خطی: ['stn-fm01-04-structure']
- `stn-fm01-06-expression` ← پیش‌نیازِ واقعی: ['stn-fm01-02-vocab'] | انتظار خطی: ['stn-fm01-05-grammar-qa']
- `stn-fm01-07-listen` ← پیش‌نیازِ واقعی: ['stn-fm01-02-vocab', 'stn-fm01-05-grammar-qa'] | انتظار خطی: ['stn-fm01-06-expression']
- `stn-fm01-08-practice` ← پیش‌نیازِ واقعی: ['stn-fm01-02-vocab', 'stn-fm01-03-grammar-desu', 'stn-fm01-05-grammar-qa', 'stn-fm01-06-expression', 'stn-fm01-07-listen'] | انتظار خطی: ['stn-fm01-07-listen']
- `stn-fm01-15-listen` ← پیش‌نیازِ واقعی: ['stn-fm01-11-vocab2', 'stn-fm01-14-expression'] | انتظار خطی: ['stn-fm01-14-expression']
- `stn-fm01-16-grammar-kara` ← پیش‌نیازِ واقعی: ['stn-fm01-11-vocab2'] | انتظار خطی: ['stn-fm01-15-listen']
- `stn-fm01-17-practice` ← پیش‌نیازِ واقعی: ['stn-fm01-16-grammar-kara', 'stn-fm01-15-listen'] | انتظار خطی: ['stn-fm01-16-grammar-kara']

**پیش‌نیاز نوبت‌های اختیاری:**
- `stn-fm01-opt-countries` ← ['stn-fm01-02-vocab']
- `stn-fm01-opt-review-desu` ← ['stn-fm01-03-grammar-desu']
- `stn-fm01-opt-jobs` ← ['stn-fm01-13-grammar-dewa']
- `stn-fm01-opt-drill` ← ['stn-fm01-17-practice']

**مجموع دقیقه‌ها:** نوبت‌های اصلی 58 دقیقه + اختیاری 11 دقیقه = 69؛ در برابر estMinutes اعلام‌شدهٔ فصل: **45** — اختلاف 13 دقیقه ⚠️

**پوشش واحدها:** 18 نوبت در واحدها؛ خارج از واحدها: ['stn-fm01-opt-countries', 'stn-fm01-opt-review-desu', 'stn-fm01-opt-jobs', 'stn-fm01-opt-drill']؛ slug مبهم: —

**وزن‌های mastery فصل:** {"M1": 0.3, "M2": 0.2, "M3": 0.2, "M4": 0.2, "M5": 0.1} (متفاوت از kana01: 0.3/0.25/0.2/0.15/0.1 — وزن‌های دو فصل یکسان نیستند)
  - ⚠️ فصل fm01 فاقد `measureLabelsFa` است (kana01 دارد).

---

## یافته‌های کلیدی (فهرست آنومالی‌ها)

1. **[بالا]** نقض سیستماتیک PASSIVE-RUN — 22 نوبت از ۵۳ نوبت طولانی‌ترین دنبالهٔ غیرتعاملی > ۲ دارند؛ الگوی غالب: ۳ کارت کانا/واژه پشت‌سرهم پیش از نخستین تمرین. نمونه‌ها: `stn-kana-h0` (kana01, run=3: scene→dialogue-player→wrap-up)، `stn-kana-h1` (kana01, run=3: kana-card→kana-card→kana-card)، `stn-kana-h2` (kana01, run=3: kana-card→kana-card→kana-card)، `stn-kana-h3` (kana01, run=3: kana-card→kana-card→kana-card)، `stn-kana-h7` (kana01, run=3: kana-card→rule-prereq→rule-step)، `stn-kana-h8` (kana01, run=3: kana-card→kana-card→kana-card)، `stn-kana-h9` (kana01, run=3: kana-card→kana-card→kana-card)، `stn-kana-h10` (kana01, run=3: kana-card→kana-card→kana-card) و 14 مورد دیگر.
2. **[بالا]** نبود آستانهٔ mastery در سطح نوبت‌های fm01 — هر ۲۲ نوبت fm01 مقدار mastery تهی/نال دارند؛ در حالی‌که در kana01 هر ۳۰ نوبتِ دارای تمرین، mastery با آستانهٔ 0.7 تعریف شده‌اند. مدل سنجش دو فصل ناهمگون است.
3. **[بالا]** استخر ارزیابی گیت فصل به هیچ نوبتی متصل نیست و بسیار کوچک است — kana01: M1=3, M2=3, M3=3, M4=2, M5=2 (مجموع 13)؛ fm01: M1=3, M2=2, M3=3, M4=2, M5=2 (مجموع 12)؛ هیچ‌یک از این 25 تمرین گیت در بلوک هیچ نوبتی ارجاع نشده‌اند (در دامپ قابل راستی‌آزمایی نیست که گیت در سطح فصل وصل است).
4. **[متوسط]** زنجیرهٔ پیش‌نیاز fm01 خطی نیست (DAG است) — انحراف‌ها: `stn-fm01-05-grammar-qa` ← ['stn-fm01-03-grammar-desu'] (انتظار: ['stn-fm01-04-structure'])؛ `stn-fm01-06-expression` ← ['stn-fm01-02-vocab'] (انتظار: ['stn-fm01-05-grammar-qa'])؛ `stn-fm01-07-listen` ← ['stn-fm01-02-vocab', 'stn-fm01-05-grammar-qa'] (انتظار: ['stn-fm01-06-expression'])؛ `stn-fm01-08-practice` ← ['stn-fm01-02-vocab', 'stn-fm01-03-grammar-desu', 'stn-fm01-05-grammar-qa', 'stn-fm01-06-expression', 'stn-fm01-07-listen'] (انتظار: ['stn-fm01-07-listen'])؛ `stn-fm01-15-listen` ← ['stn-fm01-11-vocab2', 'stn-fm01-14-expression'] (انتظار: ['stn-fm01-14-expression'])؛ `stn-fm01-16-grammar-kara` ← ['stn-fm01-11-vocab2'] (انتظار: ['stn-fm01-15-listen'])؛ `stn-fm01-17-practice` ← ['stn-fm01-16-grammar-kara', 'stn-fm01-15-listen'] (انتظار: ['stn-fm01-16-grammar-kara']).
5. **[متوسط]** تمرین‌های rule-listening فقط ۲ گزینه دارند — 13 تمرین از 13 تمرین rule-listening در kana01 دقیقاً ۲ گزینه دارند → احتمال حدس درست ۵۰٪ (در برابر ۳۳٪ استاندارد MCQ).
6. **[متوسط]** estMinutes فصل fm01 کمتر از مجموع دقیقه‌های نوبت‌های اصلی است — مجموع نوبت‌های اصلی fm01 = 58 دقیقه (+11 اختیاری = 69) ولی estMinutes فصل 45 اعلام شده (22٪ کم‌برآورد). kana01: مجموع اصلی 356 در برابر 338 (اختلاف 18 دقیقه ⚠️).
7. **[متوسط]** نقش «apply» در هیچ rule-stepی استفاده نشده است — توزیع نقش‌ها: notice×13، explain×9، apply×0. چرخهٔ notice→explain→apply در ایستگاه‌های قاعده ناقص اجرا شده و گام کاربرد فقط در fm01 با guided-discovery جایگزین شده است.
8. **[متوسط]** نوبت‌های اختیاری fm01 به هیچ واحدی متصل نیستند — ۴ نوبت اختیاری fm01 (stn-fm01-opt-countries، stn-fm01-opt-review-desu، stn-fm01-opt-jobs، stn-fm01-opt-drill) در stationSlugs هیچ واحدی نیامده‌اند؛ در kana01 هر ۳۱ نوبت (شامل اختیاری‌ها) در واحدها پوشش داده شده‌اند.
9. **[کم]** ناهمگونی معیار تکمیل در fm01 — ترکیب completion در fm01: {"kind": "exercise_threshold", "threshold": 0.6} ×15؛ {"kind": "viewed"} ×3؛ {"kind": "exercise_threshold", "threshold": 0.7} ×2؛ {"kind": "task_completed"} ×2. نوبت‌های anchor با «viewed» بدون هیچ سنجشی تکمیل می‌شوند (stn-fm01-01-anchor، stn-fm01-10-reconnect، stn-fm01-opt-review-desu). آستانهٔ 0.6 در برابر 0.7 کانا01 پایین‌تر است.
10. **[کم]** stn-kana-opt-drill بدون پیش‌نیاز است — تنها نوبت دارای تمرین در کل دو فصل که prerequisites آن خالی است (سایر نوبت‌های اختیاری پیش‌نیاز دارند: opt-r-h9←h9، opt-countries←02، opt-review-desu←03، opt-jobs←13، fm01-opt-drill←17).
11. **[کم]** تعریف taskهای شنیداری در دامپ وجود ندارد — بلوک‌های listening-task به taskIdهایی ارجاع می‌کنند که در دامپ تعریف نشده‌اند: ['listen-1', 'listen-2'] (هر taskId فقط یک‌بار در کل فایل ظاهر می‌شود) — وابستگی خارجیِ غیرقابل‌راستی‌آزمایی.
12. **[کم]** برچسب estLoad ایستگاه‌های قاعده ناسازگار است — ایستگاه‌های قاعده‌محور h4/h5/h6/h13/k8 با ساختار مشابه «light» برچسب خورده‌اند ولی h7 و h15 که همین الگو را دارند «medium» هستند؛ در عوض h15 با ۱۷ بلوک و ۱۶ دقیقه سنگین‌ترین نوبت فصل است.
13. **[کم]** قالب‌آمیزی (کپی‌پیست) متن دلایل حواس‌پرتی — از مجموع 954 متنِ گزینهٔ حواس‌پرتی در دو فصل، 564 مورد (59٪) یکی از فقط ۳ رشتهٔ عمومی زیر هستند: «کانای دیگری با همین ردیف.» ×408؛ «جفت اشتباه‌پذیر — به تفاوت شکل دقت کن.» ×120؛ «طول واکه یا صدا‌بندی را بازبینی کن.» ×36. به‌طور سیستماتیک تمام ۱۷۲ تمرین kana-listening و ۹۲ تمرین kana-recall فقط از همین متن‌های عمومی استفاده می‌کنند (در برابر kana-recognition که دلیل اختصاصی دارد).
14. **[اطلاعاتی]** ایستگاه‌های قاعده‌دار خارج از فهرست ممیزی — این نوبت‌ها بلوک rule-step/rule-contrast دارند ولی در فهرست رسمی ایستگاه‌های قاعده (h4,h5,h6,h7,h13,h15,k8) نبودند: `kana01/stn-kana-h12`، `kana01/stn-kana-k13`.
15. **[اطلاعاتی]** نوبت‌های صرفاً منفعل با completion=viewed — stn-kana-h0 (۳ بلوک کاملاً غیرتعاملی: scene، dialogue-player بدون prediction، wrap-up) و دو anchor گفت‌وگویی fm01 فقط با «دیدن» تکمیل می‌شوند — بدون fsrsItems و بدون سنجش.
16. **[اطلاعاتی]** فصل fm01 فاقد measureLabelsFa است — mastery فصل kana01 شامل weights + measureLabelsFa + weakPointMap است؛ fm01 فقط weights + weakPointMap دارد — برچسب‌های فارسی سنجه‌های M1..M5 برای fm01 تعریف نشده است.

### راستی‌آزمایی‌های مثبت (بدون آنومالی)

- پوشش کانا: هر ۹۲ کانای تعریف‌شده (۴۶ هیراگانا + ۴۶ کاتاکانا) در kana-cardها معرفی می‌شوند؛ هیچ کانای بدون کارت یا کارتِ بدون کانا وجود ندارد.
- fm01: هر ۱۱ واژه با vocab-card و هر ۸ تعبیر با expression-card معرفی شده‌اند (پوشش ۱۰۰٪).
- هیچ exerciseId ارجاع‌شده‌ای به تمرین ناموجود اشاره نمی‌کند؛ هیچ correctOptionIdای به گزینهٔ ناموجود اشاره نمی‌کند.
- هیچ promptFa/promptJa خالی، هیچ گزینهٔ برچسب‌تکراری، و هیچ تمرینی با f1==f2==f3 یافت نشد.
- هیچ آیتم fsrs در بیش از یک نوبت تکرار نشده است؛ تعداد کل کلیدهای تمرین خام با دیکشنری تجزیه‌شده برابر است (بدون کلید تکراری گم‌شده).
- تمرین‌های MCQ (به‌جز rule-listening دوگزینه‌ای) همگی ۳ گزینه دارند؛ انواع produce-template/word-order/dialogue-order به‌جای options از chips/chunks استفاده می‌کنند (طراحی درست).

---

### روش تخمین زمان (ابتکاری)

ثانیه به‌ازای هر بلوک: kana-card 20، vocab-card 30، expression-card 30، rule-prereq 30، rule-card 45، wrap-up 30، scene 45،
guided-discovery 45، structured-input 40، listening-task 90، exercise ۱۵ثانیه×تمرین (حداقل ۲۰)، rule-step 35 (+۲۰ با ask)،
rule-contrast 30 (+۲۰ با ask)، dialogue-player 60 (+۳۰ با prediction)، writing-practice ۴۵×کاراکتر (سقف ۲۴۰)،
example-set ۱۰×مثال (سقف ۹۰)، character-scene 45+۱۵×گام. معیار معقول بودن: نسبت estMinutes به تخمین بین ۰٫۵ و ۲٫۰.

⚠️ برای نوبت‌های بدون تمرین (h0 و anchorهای fm01 که فقط پخش/مشاهده دارند) نسبت فوق چندان معنادار نیست چون زمان واقعی به طول دیالوگ و صحنه وابسته است؛ پرچم «نامعقول» در این نوبت‌ها را با احتیاط تفسیر کنید.

> پایان گزارش — تولیدشده توسط `lesson_stats.py`؛ اعداد مستقیماً از `curriculum-dump.json` محاسبه شده‌اند.
