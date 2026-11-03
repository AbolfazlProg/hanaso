# KNOWLEDGE PREFLIGHT — TASK-LEARNING-01

> **تسک:** موتور یادگیری جزیره‌ایِ مکالمه‌محور + نخستین فصل کامل (Vertical Slice واقعی)
> **تاریخ:** ۲۰۲۶-۱۱-۰۴ · **Agent اجراکننده:** Builder (Z.ai) · **شاخه:** `feat/learning-01-island-chapter`
> **هدف این سند:** اثباتِ «خوانده‌شده» — هر طراحی/کدی که در این تسک نوشته می‌شود، پیش از نوشته‌شدن، به اسناد زیر وصل است. هیچ چیز در این تسک «به نظر خوب» انتخاب نشده؛ همه‌چیز منبع دارد.

---

## ۱. اسناد خوانده‌شده — مخزن محصول (`AbolfazlProg/hanaso` @ `20e069f`)

| # | سند | نکتهٔ اثرگذار بر این تسک |
|---|---|---|
| 1 | `docs/owner/HANASO_PROJECT_GUIDE.fa.md` (۱۵ فصل) | وضعیت واقعی: زیرساخت کامل، تجربهٔ محصول = نمونهٔ فنی؛ Station/Terminal «در محصول هنوز پیاده نشده» (فصل ۷) — همین تسک آن را می‌سازد. Aizen قفل است و پالایش فقط از طریق توکن‌ها (فصل ۵). شخصیت‌ها جایگزین هستند و طرح نهایی هنوز نیست (فصل ۴/۱۴). |
| 2 | `docs/owner/OWNER_BRIEFING.fa.md` | «روش تدریس نهایی در انتظار تحقیق» — این تسک الگوی محتوای M1+ را تثبیت می‌کند؛ صدا در استقرار ۴۰۴ (D-01) شناخته‌شده است. |
| 3 | `docs/engineering/roadmap/MASTER_ROADMAP.md` | حوزه‌های D/E/F/G/H همگی `PROTOTYPE` — این تسک آن‌ها را به «قابلیت واقعی» ارتقا می‌دهد. قواعد اجرا: Skills used اجباری در PR، بازبینی مستقل، deploy فقط با تغییر کد محصول. |
| 4 | `docs/engineering/roadmap/NEXT_EXECUTION_TASK.md` | هدفِ «درس نمونهٔ Hello» با این تسک **بازتعریف** می‌شود: جای درس نمایشیِ تک‌صفحه‌ای، نخستین فصل کامل جزیره‌ای ساخته می‌شود (تاریخچه حفظ، هدف جدید — بخش ۱۷ مأموریت). |
| 5 | `docs/architecture/SYSTEM-ARCHITECTURE.md` · `DATA-ARCHITECTURE.md` · `DOMAIN-MODEL.md` · `API-AND-EVENTS.md` | مونولیت ماژولار، دو schema (content/app)، PgBouncer، API با zod + Envelope خطای یکنواخت. |
| 6 | `docs/adr/ADR-000..006` (خوانده‌شده از فهرست+ADR-006 کامل) | هویت ریپو، چیدمان workspace، preview، GitHub Project، CI پایه، Skills خارجی + الزام استفاده. |
| 7 | کد: `apps/web/db/schema/{content,app}.ts` · `src/db/{seed,ids,content-map}.ts` · `src/db/repositories/*` | موجودیت‌های فعلی: characters/dialogues/dialogue_lines/dialogue_scenes/lessons/learning_objectives/lesson_sections/comprehension_banks/lesson_items/vocab_items/grammar_points/audio_assets + app.dialogue_mastery_attempts/lesson_progress. `lessons.unitId` ارجاع منطقی است — جدول units **وجود ندارد** (در همین تسک ساخته می‌شود). |
| 8 | کد: `src/modules/dialogue|practice|mastery|progress|audio|character|fsrs` | پلیر دیالوگ با playback-engine زمان‌بندی‌شده ✓، موتور تمرین ۶نوعه ✓، نمره‌گذاری سروری M1..M5 ✓، مخزن پیشرفت PG ✓ — همه قابل استفادهٔ مجدد. |
| 9 | کد: `src/modules/dialogue/content/dialogue.cafe-morning-01.yaml` + `src/styles/tokens.css` (Aizen) | قالب YAML دیالوگ (tokens/fa/emotion/gap) + پالت کامل Aizen (paper/indigo/ink/ai/shu + speaker-1..3 + radius چاپ ستونی + سایه‌های لترپرس). |
| 10 | `docs/engineering/skills/SKILL_SELECTION_MATRIX.md` + `SKILL_REGISTRY.md` | ماتریس انتخاب Skill بر اساس نوع تسک (§۵ همین سند). |

## ۲. پژوهش خوانده‌شده — مخزن دانش (`japanese-learning-kb` @ `3be031b`)

| # | سند (بخش) | وضعیت | کاربرد در این تسک |
|---|---|---|---|
| 1 | `13-educational-methodology/05-island-based-learning-architecture.md` | فعال (DD-114..116) | **اسکلت اصلی:** تعریف ۱۵فیلدی ایستگاه، کاتالوگ انواع (A/B/C/D)، قواعد S1..S3 (اندازه) و O1..O5 (ترتیب)، مسیر اصلی/شاخهٔ اختیاری، مدل وضعیت `locked→available→in_progress→completed(+needs_retry/skipped)`، completed ≠ understood. |
| 2 | `13-educational-methodology/06-station-teaching-design.md` | فعال (DD-116) | روش تدریس هر نوع: VOCAB جریان ۵گامی صدا-اول · GRAMMAR حلقهٔ DIA · LISTEN سه‌شنونده · PRACTICE ساختار C1..C4 · INTEGRATE وظیفهٔ ارتباطی · MASTERY گیت DD-048. ماتریس روش×نوع + ممنوعات هر نوع. |
| 3 | `13-educational-methodology/09-pilot-learning-journey.md` | فعال (DD-087) | **بلوپرینت کامل فصل انتخابی:** دیالوگ ۹خطی + ۱۰ ایستگاه اصلی + ۲ اختیاری با زمان‌بندی دقیق، مثال‌ها، تمرین‌ها، سنجه‌های M1..M5، FSRS. مبنا و منبع مستقیم طراحی فصل ۱ (§۶). |
| 4 | `13-educational-methodology/08-characters-in-teaching.md` | فعال (DD-086) | کاراکتر = ابزار آموزشی؛ کاتالوگ نقش C1..C6؛ سقف: ۱ صحنهٔ C5 + حداکثر ۱ صحنهٔ C2/C3/C4 در هر واحد؛ Miki/Yamada پیش‌فرض C1/C5. |
| 5 | `14-curriculum-architecture/CHAPTER_COMPOSITION_BLUEPRINT.md` | فعال (DD-090/092) | Taxonomy: Course→Level→Chapter≡Unit→Lesson≡Station→Block→Exercise→Gate. قواعد ترکیب اجزا × سطح؛ ضد-الگوهای §۳-۳. |
| 6 | `14-curriculum-architecture/LESSON_TEMPLATE_SPECIFICATION.md` | فعال (DD-098) | پروفایل ۱۱ نوع درس: بلوک‌های R/Rec/Cond/Opt هر نوع + معیارهای پایان/تسلط + قواعد ادغام عمودی/افقی. |
| 7 | `14-curriculum-architecture/PILOT_CHAPTER_BLUEPRINTS.md` | فعال | سه Pilot A/B/C؛ Pilot A = بازتعبیر ۱۳-۰۹ در چارچوب جدید + جداول تحلیلی (بودجهٔ تعامل، FSRS موج ۱، انواع سؤال، یادگیری حاصل). |
| 8 | `14-curriculum-architecture/QUESTION_AND_EXERCISE_ARCHITECTURE.md` | فعال (DD-096) | کاتالوگ ۱۸+۲ نوع Q1..Q20 + ۱۰ قاعدهٔ کیفیت (MCQ=۳، distractor مستند، بدون سرنخ، بازخورد گزاره‌ای) + نردبان بازخورد F0..F4 + رکورد ۱۶فیلدی سؤال + استخر ناهم‌پوشان practice/mastery. |
| 9 | `14-curriculum-architecture/LEVEL_BASED_CONTENT_MATRIX.md` | فعال (DD-091) | L2: واژه ۴–۸ · گرامر ۱–۲ · ۸–۹/۱۰ ایستگاه · ۱۵–۲۵′ · آستانهٔ گیت ≥۷۰٪/≥۵۰٪ · Furigana همهٔ کانجی · سرعت ۰.۹× · ۶–۹ خط مکالمه. |
| 10 | `14-curriculum-architecture/VOCABULARY_GRAMMAR_LOAD_SPEC.md` | فعال (DD-093) | سه لایهٔ واژگان (هسته‌ای/تکمیلی/شناختی) · یک خوشه/درس · قاعدهٔ مقایسهٔ دیرهنگام O3-ب · مدل بار نیمه‌کمی. |
| 11 | `14-curriculum-architecture/PRACTICE_INSTRUCTION_BALANCE.md` + `SRS_CURRICULUM_INTEGRATION.md` + `KANJI_AND_SCRIPT_PROGRESSION.md` + `CHAPTER_PLANNING_TEMPLATE.md` + `LESSON_ENGINE_REQUIREMENTS.md` | فعال | تعادل فعال ≥۵۰–۶۵٪ (L2) · کارت‌ها w-/s-/chrk-/gr- موج ۱ · L2 کانجی فقط در بافت واژه · قالب برنامه‌ریزی فصل · الزامات موتور درس. |
| 12 | `16-integration-and-readiness/DATA-CONTRACT.md` (v3.1) | مرجع اجرایی | **چهار زنجیرهٔ داده:** ساختار یادگیری (Level→Chapter→Dialogue→Lesson/Station→Block→Question→Assessment) · کانجی · صوت (پیش‌تولید، hash پایدار، صدای ثابت) · کاربر/تلاش/پیشرفت. enum نوع ایستگاه + «ترتیب ایستگاه‌ها هرگز Hardcode نمی‌شود». |
| 13 | `08-product-experience-architecture/dialogue-based-learning-model.md` + `lesson-from-dialogue-blueprint.md` | مرجع (DD-045) | مدل A→B→C→D + قواعد محتوایی (پوشش، تراکم، رجیستر) + AC-935..940 (line_refs، بدون محتوای خارج از دیالوگ، «در مکالمه ببین»). |
| 14 | `15-kanji-and-speaking/` (خلاصهٔ OWNER-REPORT + فهرست) | فعال | Q19/Q20 و کارگاه نوشتن = **خارج از Scope این تسک** (مرحلهٔ D/E نقشهٔ راه؛ «قابلیت‌های غیرضرور با شکل ناقص وارد تولید نمی‌شوند» — مأموریت §۶). |

## ۳. یادداشت‌های کامل مالک — خوانده‌شده

فایل: `owner_notes/HANASO-OWNER-EDUCATIONAL-NOTES-COMPLETE.fa.md` (۱۰٬۲۵۹ خط — تجمیع ۱۹ PDF دورهٔ «Online Japanese N5 Course» شرکت Attain + بازسازی ۵۱ تصویر).

| بخش | خطوط | وضعیت خواندن |
|---|---|---|
| راهنمای استفاده + ساختار دوره (اهداف/مکالمه/واژگان/عبارات/گرامر/جمع‌بندی) | ۱۰–۲۵۱ | کامل |
| **درس ۱ — わたしは学生です** (اهداف ۳گانه + مکالمهٔ ۱۳خطی آندو/وان/کیم + ۴۰ واژه + ۶ عبارت + ۷ نقطهٔ گرامری + پیوست کشور/زبان) | ۲۵۲–۷۰۸ | **کامل — منبع مستقیم فصل ۱** |
| درس ۷ — 一緒にスキーに行きませんか (گزینهٔ Pilot B) | ۳۷۹۶–۴۳۰۳ | بررسی مقایسه‌ای برای انتخاب فصل (§۴) |
| فهرست‌های مرجع (گرامر ۱۱۱نقطه / واژه ۷۳۲ / عبارت ۷۰) | ۸۵۸۹–۱۰۲۲۸ | ساختار مرور شد — منبع فصل‌های بعد |

**حکم ممیزی KB (01-owner-notes-audit):** این متن‌ها جزوه‌های Attain هستند نه تألیف شخصی مالک؛ استفادهٔ محصول = ممنوع؛ استفادهٔ طراحی داخلی = مجاز. تمام مثال‌ها/تمرین‌های محصول باید تألیف جدید HANASO باشند. محتوای فصل ۱ HANASO (دیالوگ/مثال/تمرین) در این تسک **اصیل نوشته می‌شود** (مسیر امن OQ-033 — §۴).

## ۴. طبقه‌بندی تعارض‌ها و منابع (Conflict Classification)

| موضوع | طبقه | مبنا و رفتار در این تسک |
|---|---|---|
| مدل A→B→C→D، شروع فصل از مکالمه، بازگشت به مکالمه | **OWNER_CONFIRMED** (DD-045) | ستون فقرات فصل ۱. |
| مسیر هنری Aizen، توکن‌ها، فونت‌ها | **OWNER_CONFIRMED** (DD-084) | فقط از `tokens.css`؛ بدون hex خام؛ پالایش نه بازنویسی. |
| صدا فقط پیش‌تولید + Voice Profile ثابت | **OWNER_CONFIRMED** (ADR-009/DD-113) | صوت فصل ۱ در build تولید و در manifest ثبت می‌شود؛ TTS لحظه‌ای ممنوع. |
| سه شخصیت (میکی/یامادا/سورا) با جایگزین فعلی | **OWNER_CONFIRMED** (DR-05) | از همان سه کاراکتر ثبت‌شده؛ **طراحی شخصیت جدید ممنوع**؛ UI به دارایی نهایی وابسته نیست. |
| معماری ایستگاه‌محور (نقشهٔ جزیره‌ای صادق) | **PROVISIONAL** (DD-114..116 + مأموریت مالکِ همین تسک) | مالک در مأموریت TASK-LEARNING-01 صریحاً همان را خواسته → اجرا می‌شود؛ گیت‌های عددی باز (OQ-029..034) با راه‌حل موقتیِ قابل‌بازگشت. |
| قواعد S/O (تعداد/ترتیب ایستگاه، سقف واژه) | **RESEARCH_BACKED + PROVISIONAL** (DD-115/OQ-031) | فصل ۱ دقیقاً طبق بلوپرینت معتبر ۱۳-۰۹ (۱۰ ایستگاه اصلی + ۲ اختیاری، ۸ واژه) — بدون عددسازی جدید. |
| روش‌های تدریس (DIA، صدا-اول، سه‌شنونده، C1..C4، recall-first) | **PROVISIONAL** (DD-116؛ شواهد EV قوی) | وفادار به ۱۳-۰۶؛ هر رفتار در جدول Traceability به بند spec وصل است. |
| آستانهٔ گیت فهم ≥۷۰٪/≥۵۰٪ (L2) | **PROVISIONAL** (OQ-016) | مقدار از `level_policy` **داده** خوانده می‌شود نه کد → تصمیم مالک بعدي فقط یک ردیف داده عوض می‌کند. |
| محتوای دیالوگ Production (اصیل vs مجوز Attain) | **OPEN_QUESTION (OQ-033)** | **حل موقتی قابل‌بازگشت:** دیالوگ/مثال/تمرین فصل ۱ کاملاً اصیل HANASO نوشته می‌شود (هیچ جمله‌ای از Attain کپی نمی‌شود)؛ ساختار آموزشی از بلوپرینت KB پیروی می‌کند. با تصمیم مالک، فقط محتوای داده عوض می‌شود نه معماری. |
| سبک بصری نقشهٔ جزیره (OQ-032) | **OPEN_QUESTION** | راه‌حل موقتی: نقشهٔ سفرِ افقی-پیمایشی با موتیف موج 青海波 و مُهر «فهمیدم» — از واژگان بصری موجود Aizen؛ قابل تعویض بدون تغییر مدل داده. |
| ترتیب ثابت B0..B9 (مدل قدیمی درس) | **SUPERSEDED** | با گراف ایستگاه داده‌محور جایگزین شد (DATA-CONTRACT: «ترتیب هرگز Hardcode نمی‌شود»). |
| «درس نمونهٔ Hello» (TASK-M0-11 قدیمی) | **SUPERSEDED (بازتعریف مأموریت)** | هدف M0-11 در این تسک به «نخستین فصل کامل جزیره‌ای» ارتقا یافته — تاریخچه در مستندات حفظ می‌شود. |
| صدای HANA/TTS درخواستی | **OWNER_SOURCE (ADR-009)** | ممنوع در runtime؛ D-01 (۴۰۴ صدا در Docker) در همین تسک اصلاح می‌شود (`gen:audio` در build). |

## ۵. Skillهای مهندسی — خوانده‌شده و راهکار استفاده (طبق ماتریس انتخاب)

| Skill | مسیر | نوع تسک ماتریس | استفادهٔ واقعی در این تسک |
|---|---|---|---|
| **SKL-013** learning-experience-implementation | `japanese-learning-kb/agent-skills/learning-experience-implementation/SKILL.md` | ۱۳ (Learning experience) | جدول رفتار→قاعده در سند Traceability؛ recall-first ≥۶۰٪؛ نمره‌دهی سروری؛ بدون مکانیک تنبیهی؛ پیام‌ها از دیکشنری تایپ‌دار. |
| **SKL-002** frontend-engineering | `…/frontend-engineering/SKILL.md` | ۲/۱۷ | RSC-first برای صفحات محتوا؛ جزیرهٔ کلاینت فقط برای جلسات تعاملی (پلیر/تمرین)؛ state تفکیک‌شده؛ بودجهٔ JS؛ هیچ fetch محتوایی در کلاینت. |
| **SKL-003** bilingual-rtl-ltr | `…/bilingual-rtl-ltr/SKILL.md` | ۱۷ (Content UI) | JaBlock/FuriganaText برای هر متن ژاپنی؛ فقط logical properties؛ group-ruby؛ ارقام فارسی `faNum`. |
| **SKL-004** design-system-implementation | `…/design-system-implementation/SKILL.md` | ۱ (UI/UX) | توکن‌اول (صفر hex خام)؛ حالت‌های شش‌گانه؛ کنتراست ثبت‌شده؛ میکروتعامل‌های فهرست بسته؛ شش‌گانهٔ وضعیت؛ کیفیت‌بار ادیتوریال (~۹۰٪ خنثی + ~۱۰٪ لهجه). |
| **SKL-006** database-engineering | `…/database-engineering/SKILL.md` | ۴ (Database) | دو schema؛ uuidv7؛ text+CHECK؛ expand-contract؛ ایندکس با کوئری توجیهی؛ مالکیت ماژول. |
| **SKL-008** content-pipeline | `…/content-pipeline/SKILL.md` | ۱۷ | محتوای فصل به‌صورت content-as-code در ماژول محتوا + seed به DB؛ اعتبارسنجی ساختاری (قواعد CONTENT) در تست. |
| **SKL-010** quality-gates | `…/quality-gates/SKILL.md` | ۹ (Testing/QA) | گیت‌ها با خروجی واقعی؛ fail-first برای منطق جدید؛ ادعای بدون شاهد = ثبت‌نشده. |
| **EXT-002** frontend-design | `hanaso/agent-skills/external/frontend-design/SKILL.md` | ۱ | نقد کیفیت بصری نقشهٔ جزیره (ترکیب‌بندی، ضد-کلیشه، کیفیت ادیتوریال). |
| **EXT-003** test-driven-development | `hanaso/agent-skills/external/test-driven-development/SKILL.md` | ۲/۴/۹ | تست قرمز پیش از منطق مسیر/گیت/پیشرفت. |

> قاعدهٔ تقدم (ماتریس §۲): KB/ADR/تصمیم مالک > Skill — در تعارض، پروژه برنده است.

## ۶. جمع‌بندی آمادگی (خروجی Preflight)

1. **فصل انتخابی:** Pilot A — سطح L2 «اولین دیدار و معرفی خود» (§ سند انتخاب فصل). انتخاب **نه به‌خاطر سادگی** بلکه چون: نخستین فصلِ واقعیِ قوس برنامهٔ درسی است (Pilot B به پیش‌نیازهای ます/روز هفته/فرمول‌های B1 نیاز دارد که هنوز فصلی برایشان وجود ندارد؛ Pilot C سطح L5 است)؛ تنها فصل با بلوپرینت معتبر ایستگاه‌به‌ایستگاه در KB است؛ هدف ارتباطی واقعی دارد (معرفی خود/پرسش هویت/تأیید) و احوال‌پرسی فقط ۱ ایستگاه از ۱۰ است؛ منبع مالک (درس ۱ جزوه) کامل در دسترس است.
2. **معماری:** چهار زنجیرهٔ DATA-CONTRACT روی اسکیمای موجود (expand، نه rewrite): جدول‌های جدید `content.levels`، `content.units` (فصل)، گسترش `content.lessons` به مدل ایستگاه + `app.station_progress` و `app.chapter_progress`. ترتیب ایستگاه‌ها فقط از داده و پیش‌نیازها (توپولوژیک) — هیچ ترتیبی در کد.
3. **محتوا:** دیالوگ اصیل HANASO با سه شخصیت موجود (صحنهٔ «اولین روز کلاس زبان» — § سند طراحی)؛ تمام مثال‌ها/تمرین‌ها تألیف جدید؛ ساختار/بار آموزشی دقیقاً از بلوپرینت ۱۳-۰۹ + قواعد S/O.
4. **UI:** هفت صفحهٔ سفر (معرفی فصل → مکالمه → نقشهٔ جزیره → ایستگاه → تمرین → دروازهٔ فهم → تکمیل/مastery) همه Aizen، همه داده‌محور.
5. **موارد باز (بدون تصمیم یک‌جانبه):** OQ-033 (محتوای اصیل — مسیر امن اجرا شد) · OQ-032 (ظاهر نقشه — موقتیِ قابل‌تعویض) · OQ-016 (آستانهٔ گیت — از داده) · OQ-031 (سقف واژه — طبق بلوپرینت ۸ واژه).

**Preflight کامل است؛ بدون نیاز به تأیید مجدد مالک، طراحی و پیاده‌سازی آغاز می‌شود (طبق مأموریت §۰).**

---

*پیوند اسناد بعدی:* [PILOT_CHAPTER_SELECTION.md](./PILOT_CHAPTER_SELECTION.md) · [CHAPTER_CONTENT_BLUEPRINT.md](./CHAPTER_CONTENT_BLUEPRINT.md) · [DIALOGUE_TO_LEARNING_TRACEABILITY.md](./DIALOGUE_TO_LEARNING_TRACEABILITY.md) · [LEARNING_ENGINE_IMPLEMENTATION.md](./LEARNING_ENGINE_IMPLEMENTATION.md) · [ISLAND_JOURNEY_UX_SPEC.md](./ISLAND_JOURNEY_UX_SPEC.md) · [VERIFICATION_REPORT.md](./VERIFICATION_REPORT.md) · [OWNER-REPORT-FA.md](./OWNER-REPORT-FA.md)
