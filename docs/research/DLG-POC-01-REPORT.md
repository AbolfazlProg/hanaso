# گزارش PoC فنی مکالمهٔ چندگوینده — TASK-DLG-POC-01

> **تسک:** TASK-DLG-POC-01 (اجرای آزمون‌های T1..T10 طبق KB `dialogue-technical-poc-plan`) · **برنچ:** `poc/dialogue-player` · **تاریخ اجرای Agent:** 2026-11-01
> **وضعیت تحویل:** کد + تست + گزارش کامل. `pnpm verify` سبز کامل (خروجی واقعی: [`assets/verify-dlg-poc.txt`](assets/verify-dlg-poc.txt) — ۳۱۳ خط، «ALL GATES GREEN»).

---

## ۱. خلاصهٔ اجرا

PoC فنی مکالمهٔ چندگوینده به‌صورت کامل در برنچ مستقل `poc/dialogue-player` اجرا شد: موتور پخش pure-TS با `AudioBackend` تزریق‌پذیر، سیستم شخصیت مطابق قرارداد سه‌لایهٔ ADR-018 (Manifest/Renderer/Controller) با رندرر Placeholder متحرک، ماژول صوت با خطاهای typed و prefetch دوخطی، کارت‌های FSRS درون‌بافت (`context_line_id`)، سنجه‌های M1..M5 با امتیازدهی وزنی سمت سرور، سه صفحهٔ `/poc/*` + فرم ارزیابی T2، و **۴۶ تست سبز در ۸ فایل** (۴۱ تست جدید).

**اعداد کلیدی (واقعی، نه برآوردی):**

| متر                                          | مقدار اندازه‌گیری‌شده                                                                          | روش                             |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| تعداد خطوط دیالوگ                            | **۱۰ خط، ۳ گوینده** (میکی/یامادا/سورا)، gapهای ۴۵۰–۶۰۰ms                                       | `dialogue.cafe-morning-01.yaml` |
| تأخیر dispatch موتور (پایان gap → lineStart) | **۰ ms دقیق** (fake-timer؛ dispatch هم‌زمان با فراخوانی تایمر)                                 | `playback-engine.spec.ts`       |
| overshoot واقعی تایمر (probe واقعی)          | gap=50ms → **میانگین ۰٫۲۶ms، بیشینهٔ ۱٫۳۰ms** در ۱۲ نمونه                                      | همان فایل (real-timer probe)    |
| وفاداری gap (AC-954)                         | `lineStart(n+1) − lineEnd(n) === gap` **دقیقاً** برای هر ۹ مرز؛ بدون هم‌پوشانی؛ پخش کامل هر خط | همان                            |
| حجم placeholder صوتی                         | **۱۰ فایل WAV، ۷۲۳٬۶۸۰ بایت (۷۰۶٫۷ KiB)**؛ مدت هر خط ۸۰۰–۲۵۰۰ms                                | `pnpm gen:audio`                |
| F0 صداها (محور زیر و بمی T2)                 | میکی **۲۱۰Hz** / یامادا **۱۱۰Hz** / سورا **۱۶۰Hz** + هارمونیک متفاوت                           | `voices.yaml` + خروجی_gen       |
| فاصلهٔ ادراکی جفت‌صداها                      | ۱۱٫۱۷ / ۴٫۶۵ / ۶٫۵۱ نیم‌پرده (هر سه ≥۳)؛ هر جفت ≥۲ محور از ۳ محور تمایز                        | `content-schema.spec.ts`        |
| تست‌ها                                       | **۸ فایل / ۴۶ تست، همه سبز**                                                                   | `pnpm test`                     |
| کل زمان مکالمه در 1×                         | ≈ **۲۱٫۱ ثانیه** (۱۶٫۴s صوت + ۴٫۷s نوبت‌ها)                                                    | sidecar                         |

---

## ۲. جدول آزمون‌های T1..T10 (سه‌ستونه)

| #       | آزمون                                      | وضعیت                                                   | جزئیات و اعداد واقعی                                                                                                                                                                                                                                 |
| ------- | ------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T1**  | پخش مکالمه با چند صدای مجزا                | ✅ **اجرا-در-موتور**                                    | زنجیرهٔ ۱۰ خط با ۳ صدا؛ هر ۹ مرز gap دقیق (`lineStart(n+1)=lineEnd(n)+gap`)؛ تأخیر dispatch **۰ms** (fake-clock) و probe واقعی **میانگین ۰٫۲۶ms / max ۱٫۳ms**؛ prefetch دوخطی هر خط (تست‌شده). p95 در مرورگر واقعی → ثبت در Preview.                 |
| **T2**  | جابه‌جایی بین شخصیت‌ها (دوسوکور ≥۸۰٪، n≥۵) | 🟡 **آماده-برای-محیط-واقعی**                            | فرم ارزیابی تحویل شد: **`/poc/t2-eval`** (پخش جمله با متن پنهان + انتخاب گوینده + ثبت نتیجه در `/api/events`). فایل‌های نمونه با `pnpm gen:audio` آماده‌اند. اجرای دوسوکور با ۵ ارزیاب پس از Preview و صداهای واقعی VOICEVOX توسط مالک.              |
| **T3**  | زیرنویس هم‌نور با جملهٔ فعال               | ✅ **اجرا-در-موتور**                                    | `onLineStart`→هایلایت / `onLineEnd`→غیرفعال؛ تأخیر تعویض هایلایت = همان gap (۰ms engine-level)؛ اسکرول خودکار خط فعال به دید («خط فعال همیشه در دید») — `subtitles-sync.spec.ts`. ادراک ≤۱۰۰ms در مرورگر → Preview.                                  |
| **T4**  | Replay جمله و کنترل سرعت                   | ✅ **اجرا-در-موتور**                                    | `replayLine()` = seek=0 روی **همان handle** (بدون load مجدد — تست پین کرده: `loadCalls=1`، `seekCalls=1`)، مکالمه ری‌استارت نمی‌شود؛ `setSpeed(0.75)` فقط در مرز جمله (تست: خط جاری 1× می‌ماند، خط بعد 0.75× و مدت شنیداری ۱۰۰۰→۱۳۳۳ms).             |
| **T5**  | Furigana و متن ترکیبی FA/JP                | ✅ ساختار اجرا-شده / 🟡 QA بصری معلق                    | الگوی Spike M0-08 کامل: هر خط JP داخل جزیرهٔ `dir="ltr"` + `<bdi lang="ja">` + `line-height: 2.1` + `rt{user-select:none}` + furigana فقط وقتی reading≠surface. رندر SSR تأیید شد. خوانایی در ۳ مرورگر/موبایل → نیازمند Preview (دستگاه واقعی).      |
| **T6**  | اتصال DialogueLine ↔ واژه/گرامر            | ✅ **اجرا-در-موتور**                                    | کارت‌های درس از همان YAML مشتق می‌شوند (`teaches` + `chunk` توکن‌ها)؛ «در مکالمه ببین» → `/poc/dialogue?line=<id>` (پخش از همان خط) و مسیر برگشت: توکن chunk در حباب → `/poc/lesson#item-<id>` (دوطرفه). آیتم یتیم = خطای build (`lesson-items.ts`). |
| **T7**  | اتصال آیتم‌های یادگیری به FSRS             | ✅ **اجرا-در-موتور**                                    | ts-fsrs با `context_line_id`: `createCardFromLine` → `review` → roundtrip serialize/deserialize با حفظ خط بافت؛ هش محتوا↔asset بین ماژول و مولد صوت پین شده — `fsrs-context.spec.ts` (۵ تست).                                                        |
| **T8**  | بارگذاری و Cache صوتی                      | ✅ پیاده‌سازی + تست prefetch / 🟡 اندازه‌گیری شبکه معلق | prefetch دوخطی در `BrowserAudioBackend` (تست‌شده در موتور) + کش در‌حافظه per lineId (بازبیند=بدون fetch جدید). اندازه‌گیری «درخواست صفر در بازدید مجدد» با DevTools/throttle → Preview.                                                              |
| **T9**  | Audio روی موبایل و مرورگرهای اصلی          | 🟡 **آماده-برای-محیط-واقعی**                            | dual-source (`<source>` اولیه + fallback)، شروع پخش از زنجیرهٔ ژست کاربر، خطاهای typed با بازیابی. ماتریس iOS Safari/Chrome Android/Firefox → نیازمند دستگاه/Preview (خارج از محیط Agent).                                                           |
| **T10** | مصرف منابع TTS و پس‌زمینه                  | 🟡 **متحویل‌شده، اجرانشده**                             | اسکریپت کامل بنچمارک: `apps/web/scripts/bench-voicevox.mjs` (۱۰۰ جمله، CPU-ثانیه از `/proc/stat`، RAM از cgroup، خروجی JSON). **اجرا نشد** — موتور Docker/VOICEVOX در Sandbox Agent موجود نیست. اجرا روی VPS توسط مالک: `pnpm bench:voicevox`.       |

**جمع‌بندی صادقانه:** T1/T3/T4/T6/T7 در سطح موتور با اعداد واقعی سبز شدند؛ T2/T9/T10 (و QA بصری T5/T8) به‌گونه‌ای تحویل شدند که اجرایشان فقط در محیط واقعی (Preview/VPS/دستگاه/ارزیاب انسانی) ممکن است — مطابق تفکیک خودِ برنامهٔ PoC.

---

## ۳. ساختار تحویل‌شده

```text
apps/web/src/
├── modules/dialogue/          # قلب PoC
│   ├── types.ts               # Dialogue/DialogueLine/CharacterRef/AudioAssetRef
│   ├── errors.ts              # AudioErrorهای typed (missing/decode/network/aborted)
│   ├── content/
│   │   ├── dialogue.cafe-morning-01.yaml   # ۱۰ خط، ۳ گوینده (KB §۴ + سورا)
│   │   ├── schema.ts          # zod + parseDialogueDocument (client-safe)
│   │   └── loader.ts          # node:fs + کش + hashAudioLine (server)
│   ├── player/playback-engine.ts  # موتور pure-TS: صف+gap، pause/resume، replay، speed@boundary، error recovery
│   ├── index.ts               # ورودی client-safe
│   └── server.ts              # ورودی node-only
├── modules/character/         # ADR-018
│   ├── contracts.ts           # سه قرارداد: Manifest/Renderer/Controller
│   ├── animation-controller.ts# ماشین حالت + پلک ۲–۶s + دهان فقط در speaking + نگاه + نگاشت emotion
│   ├── renderers/svg-placeholder.ts  # PLACEHOLDER قابل‌جایگزینی (ADR-018 §۲-۴) — واقعاً متحرک
│   ├── registry.ts            # ۳ مانیفست + zod + resolveSpeaker
│   └── content/characters/{chr-miki,chr-yamada,chr-sora}/manifest.json
├── modules/audio/
│   ├── browser-audio-backend.ts  # dual-source + prefetch دوخطی + probe + خطاهای typed
│   ├── audio-manifest.ts      # مانیفست per خط + sidecar + voices.yaml loader (server)
│   └── content/voices.yaml    # رجیستری + ماتریس تمایز
├── modules/fsrs/index.ts      # کارت با context_line_id + review + roundtrip
├── modules/mastery/           # types(M1..M5)+zod / scoring(وزنی+آستانه DD-048) / repository(DEV-ONLY in-memory)
├── lib/poc/                   # dialogue-bundle / stores / event-store / lesson-items
├── app/api/dialogues/[slug]   # GET → dialogue+characters+audio-manifest
├── app/api/attempts           # GET/POST (اعتبارسنجی+امتیازدهی سرور)
├── app/api/events             # POST/GET {name, props}
└── app/poc/
    ├── dialogue/              # صحنه: ۳ شخصیت، حباب furigana، کنترل‌ها، بنر خطا
    ├── lesson/                # کارت واژه/گرامر/قطعه + «در مکالمه ببین» (T6)
    ├── assessment/            # ۳ سؤال M1/M3/M5 → POST /api/attempts → نتیجهٔ کیفی + weakPoints
    └── t2-eval/               # فرم ارزیابی دوسوکور T2

apps/web/scripts/generate-placeholder-audio.mjs   # WAV سینوسی قطعی per خط (F0 per voice)
apps/web/scripts/bench-voicevox.mjs               # بنچمارک T10 (تحویل، اجرانشده)
apps/web/tests/                                   # ۷ فایل spec جدید + helper فیک‌ها (۴۱ تست)
```

## ۴. نحوهٔ اجرا

```bash
pnpm install
pnpm gen:audio        # ۱۰ WAV placeholder → apps/web/public/poc-audio/ (gitignore شده)
pnpm dev              # سپس:
#   /poc/dialogue            صحنهٔ مکالمه (?line=<id> = پرش عمیق)
#   /poc/lesson              کارت‌های درس متصل به خطوط
#   /poc/assessment          آزمون فهم نمونه → ثبت attempt
#   /poc/t2-eval             فرم ارزیابی دوسوکور T2
#   /api/dialogues/cafe-morning-01 | /api/attempts | /api/events
pnpm verify           # همهٔ دروازه‌ها (سبز — خروجی: docs/research/assets/verify-dlg-poc.txt)
```

**بدون `pnpm gen:audio` هم build سبز است:** مانیفست صوتی `available:false` برمی‌گرداند، پلیر به‌صورت silent (برآورد زمان مطالعه) ادامه می‌دهد و مسیر خطا (retry/skip/ادامه بدون صوت) قابل آزمایش است — تست‌شده.

## ۵. صداقت فنی (Placeholderها و محدودیت‌ها)

1. **صوت:** فرمت نهایی خط لولهٔ ADR-009 = Opus + m4a (VOICEVOX در build-time). PoC فقط **WAV سینوسی قطعی** تولید می‌کند و هر دو اسلات dual-source را به همان WAV اشاره می‌دهد تا مسیر پخش دومنبعی end-to-end تمرین شود. هیچ TTS در مسیر runtime نیست (تصمیم قفل‌شدهٔ مالک DD-081).
2. **شخصیت‌ها:** SVG Placeholder با برچسب صریح `// PLACEHOLDER — قابل‌جایگزینی (ADR-018)`. کد Production فقط به اینترفیس وابسته است؛ تعویض رندرر = ثبت ماژول دیگر در DI.
3. **حفظ انبارهٔ attempts/events:** in-memory با برچسب `// DEV-ONLY` پشت اینترفیس repository — با Vertical Slice به Postgres تعویض می‌شود.
4. **هشدار build:** خواندن YAML/مانیفست صوتی با مسیر runtime باعث تراس کل پروژه در خروجی standalone می‌شود (هشدار Next.js؛ برای PoC پذیرفته و ثبت شد — در Production باید محتوا در باندل یا DB باشد).
5. **تعریف `CharacterStateChange`:** فیلدهای اضافی `gazeTargetId`/`mouthActive` (لازم برای رفتارهای §۲-۱(ج) ولی بدون حامل در نمونهٔ ADR) به قرارداد اضافه شد — برای بازبینی ADR-018 (minor) ثبت می‌شود.
6. **تست T2 probe placeholder:** فرم دوسوکور با صداهای سینوسی فقط «رویه» را تمرین می‌کند؛ نتیجهٔ معتبر نیازمند صداهای VOICEVOX است.

## ۶. تصمیم‌های OTD پیشنهادی حاصل از PoC

| #     | پیشنهاد                                                                                                           | شاهد                                                                                                    |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| OTD-A | **الگوی دو ورودی عمومی برای ماژول‌ها** (`index` client-safe + `server` node-only) به ADR-001 اضافه شود            | مرز ماژول dialogue/fsrs/mastery بدون آلودگی node به باندل کلاینت برقرار شد؛ قانون ESLint مرزی به‌روز شد |
| OTD-B | **PlaybackEngine به‌عنوان کد مرجع مرحلهٔ محصول** تثبیت شود (صف+gap+prefetch+replay+speed@boundary+error recovery) | ۹ تست موتور + ۴ تست خطا؛ dispatch صفرms                                                                 |
| OTD-C | تعریف `CharacterStateChange` در ADR-018 با فیلدهای gaze/mouth (minor version قرارداد) بازبینی شود                 | پیاده‌سازی §۲-۱(ج) نیازمند حامل رسمی این حالت‌ها بود                                                    |
| OTD-D | در صورت p95 > 100ms در Preview → پیش‌بارگذاری سه‌خطی (طبق §۴ برنامهٔ PoC)                                         | اعداد فعلی (۰٫۲۶ms میانگین) چنین نیازی را نشان نمی‌دهند                                                 |
| OTD-E | اجرای T10 با `pnpm bench:voicevox` روی VPS پیش از قفل ظرفیت worker (pg-boss)                                      | اسکریپت آماده است؛ اعداد §۳ KB هنوز ⏳                                                                  |

## ۷. اجرای مجدد توسط مالک (چک‌لیست Preview)

1. `pnpm gen:audio && pnpm dev` → مرور `/poc/dialogue` (پخش، replay، سرعت، زیرنویس، خطای صوت با حذف یک فایل WAV).
2. T2: `/poc/t2-eval` با ۵ ارزیاب (پس از صداهای واقعی) → ثبت نرخ در §۳ KB.
3. T9: iOS Safari / Chrome Android / Firefox.
4. T10: `pnpm bench:voicevox` روی VPS → پر کردن §۳ KB (CPU-ثانیه/جمله، RAM پیک، زمان صف ۱۰۰ جمله، حجم dual).

---

_گزارش توسط Agent اجراکنندهٔ TASK-DLG-POC-01 تهیه شد؛ اعداد از خروجی واقعی ابزارها (تست‌ها، gen:audio، verify) استخراج شده‌اند._
