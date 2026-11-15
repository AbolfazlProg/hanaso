# FINDINGS REGISTER — HANASO-KANA-AUDIT-01

> فهرست کامل و یکتای یافته‌های ممیزی (بدون ثبت چندبارهٔ یک مشکل با دو ID). منبع: گزارش‌های A/B/C + Inventory ماشینی + راستی‌آزمایی دستی Main Agent.
> Production Version: `1.1.0-hanaso29-r01` (کامیت `5b503598`) — همهٔ یافته‌ها روی این نسخه.
> جدول کامل فیلدهای اجباری هر Finding در §۲؛ کوتاه‌نویسی‌ها: `NOT_AVAILABLE` = آن فیلد در معماری تعریف نشده.

## ۱. خلاصهٔ شناسه‌ها

| Finding ID | Severity | Confidence | Type | Root Pattern |
|---|---|---|---|---|
| KANA-AUD-001 | High | CONFIRMED | MULTIPLE_VALID_ANSWERS | RP-01 |
| KANA-AUD-002 | High | CONFIRMED | INCORRECT_PRONUNCIATION_GUIDE | RP-02 |
| KANA-AUD-003 | Medium | CONFIRMED | ANSWER_LEAKAGE | RP-03 |
| KANA-AUD-004 | Medium | CONFIRMED | INCORRECT_PRONUNCIATION_GUIDE | RP-02 |
| KANA-AUD-005 | Medium | CONFIRMED | DATA_OR_GENERATOR_DEFECT | RP-04 |
| KANA-AUD-006 | Medium | PROBABLE | ANSWER_LEAKAGE (شکل) | RP-05 |
| KANA-AUD-007 | Medium | CONFIRMED | UI_NAVIGATION | RP-06 |
| KANA-AUD-008 | Medium | CONFIRMED | UI_READABILITY | RP-07 |
| KANA-AUD-009 | Medium | CONFIRMED | UI_READABILITY (مکان آیکون) | RP-07 |
| KANA-AUD-010 | Low | CONFIRMED | DUPLICATE_OR_REDUNDANT_ITEM | RP-08 |
| KANA-AUD-011 | Low | NEEDS_NATIVE_REVIEW | INCORRECT_PRONUNCIATION_GUIDE | RP-02 |
| KANA-AUD-012 | Low | CONFIRMED | DATA_OR_GENERATOR_DEFECT (شکاف داده) | RP-09 |
| KANA-AUD-013 | Low | CONFIRMED | UI_READABILITY (یادداشت ヲ) | RP-09 |
| KANA-AUD-014 | — | NOT_A_BUG (مستند) | — | RP-10 (عمدی) |
| KANA-AUD-015 | — | NEEDS_CONTEXT | UI (کنتراست/auto-scroll کامل) | RP-06/07 |

**شمارش:** Critical **0** · High **2** · Medium **7** · Low **4** · NEEDS_NATIVE_REVIEW **1** · NEEDS_CONTEXT **1** · NOT_A_BUG (مستند) **1 گروه (۵۹ مورد عمدی)**.

## ۲. جزئیات کامل Findings

### KANA-AUD-001 — گزینه‌های هم‌تلفظ در سؤال خوانش (چندپاسخگی واقعی)

| فیلد | مقدار |
|---|---|
| Severity / Confidence | High / CONFIRMED |
| Station ID | `stn-kana-h4`، `stn-kana-k8`، گیت فصل M3 (`ORPHAN_NOT_IN_STATION` = بانک assessment) |
| Exercise ID | `ex-kana-h4-asm-1`، `ex-kana-k8-asm-1`، `ex-kana-gate-m3-4` (+ مورد مقایسه‌ای صحیح: `ex-kana-p1-dec-asa`) |
| Assessment Intent | Kana Decoding (خواندن واژه) |
| Exact Prompt | «این واژه را بخوان — راهنمایی: صبح» (あさ) / «…کیک» (ケーキ) / «…گربه» (ねこ) |
| Exact Options | あさ: «آسا»/«اَسا»✓/«اسا» — ケーキ: «کِکی»/«کِیکی»✓/«کِیکِی» — ねこ: «نِکُ»✓/«کُنِ»/«نِکو» |
| Current Answer Key | b / b / a |
| Expected Correct Answer | تفاوت واقعی باید فقط از تلفظ بیاید؛ «اسا» و «کِیکِی» و «نِکو» از نظر تلفظ با پاسخ صحیح یکسان‌اند → سؤال باید بازطراحی شود (فقط یک نگارش از هر تلفظ) |
| Exact Feedback | rationale c در h4-asm-1: «هر دو مصوت کوتاه‌اند — کشش فقط در واژه‌های کشیده است» (توضیح نمی‌دهد چرا «اسا» غلط است) |
| Problem | در سؤال «خوانش»، دو گزینه با تلفظ یکسان و فقط تفاوت اعراب/نگارش وجود دارد؛ زبان‌آموز نمی‌تواند پاسخ را از دانش کانا تشخیص دهد بلکه از حدس قرارداد نگارشی HANASO. در گیت فصل (m3-4) این نقض، سنجش Mastery را آلوده می‌کند. |
| Evidence | `inventory.json` (فیلدهای کامل)؛ `evidence/_subagent_b_results.txt` §WITHIN-ITEM؛ بازتولید زندهٔ مشابه در `evidence/browser/h13-gakkou-decode-options.png` (الگوی گزینه‌های خوانش فارسی) |
| Reference | قرارداد خوانش HANASO (استخراج‌شده در SUBAGENT_A_REPORT §4) — تلفظ یکسان پس از حذف اعراب |
| Root Pattern | **RP-01** Distractor با تغییر فقط-نگارش |
| Affected Items | ۳ تمرین بالا (تمام ۵۸۶ اسکن شد؛ این ۳ مورد تمام موارد هم‌تلفظ واقعی‌اند به‌جز گروه عمدی RP-10) |
| Recommended Fix | حذف/جایگزینی گزینهٔ هم‌تلفظ با خطای تلفظی واقعی (تعویض واکه، جاافتادن っ)؛ یکسان‌سازی قرارداد «نِکو» (AUD-004) |
| Regression Guard | تست واحد: در همهٔ decodeها، نرمال‌شده-اعرابِ گزینهٔ صحیح ≠ نرمال‌شدهٔ هیچ distractorی (اسکریپت b قابل تبدیل به CI) |

### KANA-AUD-002 — تصادم خوانش فارسی «کیوو» بین きょう و きゅう

| فیلد | مقدار |
|---|---|
| Severity / Confidence | High / CONFIRMED |
| Station ID | `stn-kana-h6` (×۲) + `stn-kana-p4` |
| Exercise ID | `ex-kana-h6-dec-3` (きょう)، `ex-kana-h6-asm-1` (きゅう)، `ex-kana-p4-rl-kyou` (きょう) |
| Assessment Intent | Kana Decoding / Yōon Recognition |
| Exact Prompt | «این واژه را بخوان — راهنمایی: امروز» / «…۹» / «گوش کن — کدام واژه را شنیدی؟» |
| Exact Options / Key | きょう→«کیوو»؛ きゅう→«کیوو» (هر دو به‌عنوان پاسخ صحیح ثبت شده) |
| Expected Correct Answer | دو تلفظ متفاوت /kjoː/ و /kʲuː/ باید خوانش‌های متمایز فارسی داشته باشند |
| Exact Feedback | «きょう» = «کیوو» (امروز) / 「きゅう」 = «کیوو» (۹) — きゅ یک مورا + う |
| Problem | دو واژهٔ ژاپنی متمایز به یک رشتهٔ فارسی نگاشت شده‌اند؛ زبان‌آموز تمایز yōon را که خود محصول در آن تمرین می‌دهد (asm-3 تمایز きょう/きよ دارد) از دست می‌دهد؛ خوانش فارسی نقش تمایزگر را از دست داده است. |
| Evidence | `inventory.json` سه مورد بالا |
| Reference | جدول yōon استاندارد (きょ=/kjo/، きゅ=/kʲu/) |
| Root Pattern | **RP-02** نگاشت خوانش فارسی بدون بررسی تصادم |
| Affected Items | ۳ تمرین + هر خواندن آیندهٔ هر دو واژه |
| Recommended Fix | خوانش متمایز (مثلاً きゅう→«کیُوو») یا جایگزینی واژه؛ درج در سند قرارداد فارسی‌نویسی |
| Regression Guard | تست واحد: نگاشت Japanese→Persian در کل محتوا یک‌به‌یک بماند (هر رشتهٔ فارسی فقط یک خوانش ژاپنی) |

### KANA-AUD-003 — Hint معنا خودِ پاسخ است (افشای پاسخ در ۳ تمرین)

| فیلد | مقدار |
|---|---|
| Severity / Confidence | Medium / CONFIRMED |
| Station ID | `stn-kana-k12-foreign`، `stn-kana-k8`، گیت M3 |
| Exercise ID | `ex-kana-kf-dec-1` (ファイル/«فایل»)، `ex-kana-k8-asm-1` (ケーキ/«کیک»)، `ex-kana-gate-m3-2` (とうきょう/«توکیو») |
| Assessment Intent | Kana Decoding |
| Exact Prompt | «این واژه را بخوان — راهنمایی: فایل» → گزینهٔ صحیح «فایل»؛ «…کیک» → «کِیکی»؛ «…توکیو» → «توکیوو» |
| Current Answer Key | b / b / b |
| Expected Correct Answer | کلید درست است؛ ایراد به **ساختِ سؤال** است نه کلید |
| Exact Feedback | F3: 「ファイル» = «فایل» — ファ یک ضربه است |
| Problem | در واژه‌های وام/نام‌آشنا که معنی فارسی رایج = خوانش است، hint معنا عملاً پاسخ است؛ سنجش کانا حذف و سنجش «شبیه‌یابی رشته» جایگزین می‌شود. (در ۷۳ decode دیگر hint پشتیبان است و مشکل ندارد — این نقش generality ندارد.) |
| Evidence | `evidence/_subagent_b_results.txt` §HINT LEAK؛ متن کامل در `inventory.json` |
| Reference | اصل «صورت سؤال نباید پاسخ را افشا کند» (استاندارد طراحی سنجش) |
| Root Pattern | **RP-03** hint معنا برای واژهٔ وامِ خود-خوانش |
| Affected Items | ۳ تمرین |
| Recommended Fix | حذف hint در این ۳ مورد یا تغییر قالب (مثلاً بدون hint با گزینه‌های نزدیک‌تر) |
| Regression Guard | تست واحد: برای هر decode، hint (بعد از نرمال‌سازی) زیررشتهٔ گزینهٔ صحیح نباشد |

### KANA-AUD-004 — ناهماهنگی نگارش خوانش: ねコ «نِکُ» vs «نِکو» + コーヒー «کووهی» vs «هیی»

| فیلد | مقدار |
|---|---|
| Severity / Confidence | Medium / CONFIRMED |
| Station ID | گیت M3 (`ex-kana-gate-m3-4`) در برابر `stn-kana-p3` (`ex-kana-p3-dec-neko`)؛ `stn-kana-k8` (`ex-kana-k8-dec-1`, `ex-kana-k8-lis-1`) |
| Exercise ID | بالا |
| Assessment Intent | Kana Decoding |
| Exact Options/Feedback | gate-m3-4: پاسخ «نِکُ» اما p3: «نِکو»؛ k8-dec-1: پاسخ/reading «کووهی» اما F1 خودش «کوو+هیی» می‌گوید |
| Expected Correct Answer | یک نگارش واحد طبق قرارداد (پیشنهاد: «نِکو»، «کووهیی») |
| Problem | ناسازگاری درونی قرارداد فارسی‌نویسی بین سؤال‌ها و حتی داخل یک سؤال (F1 vs پاسخ). زبان‌آموز نمی‌داند کدام نگارش «رسمی» است؛ در مورد gate-m3-4 به چندپاسخگی AUD-001 منجر شده. |
| Evidence | `inventory.json`؛ SUBAGENT_A_REPORT §2 |
| Reference | قرارداد HANASO §4 SUBAGENT_A_REPORT (واکهٔ پایانی با حرف کامل) |
| Root Pattern | **RP-02** |
| Affected Items | ۴ تمرین |
| Recommended Fix | یکسان‌سازی نگارش + سند قرارداد + گارد رگرسیون |
| Regression Guard | تست واحد: هر واژهٔ ژاپنی در کل فصل فقط یک رشتهٔ خوانش (نرمال‌شده) داشته باشد؛ F1/F3 نباید با پاسخ ناسازگار باشند |

### KANA-AUD-005 — عیب مولد romaji (`kanaWordRomaji`)

| فیلد | مقدار |
|---|---|
| Severity / Confidence | Medium / CONFIRMED (تست زنده) |
| Station ID | همهٔ فصل (تابع مشترک) |
| Exercise ID | NOT_AVAILABLE (عیب در لایهٔ utility: `apps/web/src/modules/curriculum/kana-romaji.ts`) |
| Problem | نگاشت registry فقط گلیف‌های base دارد؛ だ/で/ど، ゃ/ゅ/ょ کوچک و っ ناشناخته‌اند و خودِ گلیف ژاپنی در خروجی لاتین می‌چسبد: がっこう→`がっkou`، きょう→`kiょu`، ジュース→`ジュsu`، ごご→`ごご`، … (۱۳ از ۱۹ واژهٔ تست خراب). خروجی صحیح فقط با base خالص. |
| Evidence | اجرای واقعی تابع با tsx روی Source Production (خروجی در SUBAGENT_A_REPORT §2/A-04) |
| Root Pattern | **RP-04** نگاشت ناقص registry در Generator |
| Affected Items | هر جا `kanaWordRomaji` استفاده شود (راهنمای romaji واژه‌ها) |
| Recommended Fix | تکمیل نگاشت (dakuten/handakuten/yōon/sokuon) یا تجزیهٔ ترکیبی؛ جدول تست |
| Regression Guard | تست واحد روی جدول واژه‌ها (۱۹ واژهٔ تست ممیزی به‌عنوان fixture) |

### KANA-AUD-006 — نشت شکل پاسخ در decodeها (PROBABLE)

| فیلد | مقدار |
|---|---|
| Severity / Confidence | Medium / PROBABLE (آماری) |
| Station ID / Exercise ID | آمار per-station: p1 (۶/۶ بلندترین=صحیح)، h5 (۸۸٪)، p4 (۷۵٪+۱ مورد unique-shadda)، h4 (۶۲٪) در برابر h6 (۱۷٪)، h13 (۳۳٪) — جزئیات ۶۸ decode در `evidence/_subagent_b_results.txt` §SHAPE |
| Problem | پاسخ صحیح (خوانش کامل) متمایل است بلندترین/دارندهٔ همهٔ نشانه‌ها (کشش/تشدید) باشد؛ الگوی حدس «بلندترین را بردار» در برخی ایستگاه‌ها جواب می‌دهد |
| Expected | حداقل یک distractor هم‌طول با خطای از نوع دیگر |
| Root Pattern | **RP-05** distractor فقط «کسری» |
| Recommended Fix | تنوع خطا در distractorها (داکوتن اشتباه، ん جابه‌جا، هم‌طول) |
| Regression Guard | تست آماری CI: در هر ایستگاه نسبت صحیح-بلندترین‌بودن < آستانه |

### KANA-AUD-007 — پیام قفل در موبایل: زیر fold + محو ~۱ ثانیه

| فیلد | مقدار |
|---|---|
| Severity / Confidence | High→Medium (اثر UX یادگیری) / CONFIRMED — در سند C با High ثبت شد؛ نگه داشته شد |
| Station ID | صفحهٔ Journey (کلیک کارت قفل) |
| Evidence | `evidence/browser/journey-mobile-locked-click.png`، `journey-mobile-locked-feedback.png` (390×844) |
| Problem / Expected | پیام «این درس هنوز باز نشده» زیر ناحیهٔ دید می‌افتد و ~۱s محو می‌شود؛ باید در دید و ماندگار باشد (یا inline روی کارت) |
| Root Pattern | **RP-06** Feedback گذرا |
| Recommended Fix (M3) | toast→inline state روی کارت + توقف auto-dismiss |

### KANA-AUD-008 — متن آموزشی ژاپنی inline 16px

| فیلد | مقدار |
|---|---|
| Severity / Confidence | Medium / CONFIRMED |
| Evidence | `evidence/browser/h1-kana-card-writing-desktop.png`، `h13-warmup-wrong-F3-reveal.png` |
| Problem | گلیف‌های کانا در متن آموزشی جریانی برای تمایز جفت‌های مشابه (ぬ/め، あ/お) به‌اندازه کافی بزرگ نیستند |
| Root Pattern | **RP-07** اندازهٔ متن آموزشی |
| Recommended Fix (M3) | ارزیابی typography (پیشنهاد ≥20-22px برای کانای inline + zoom لمسی) |

### KANA-AUD-009 — آیکون قفل در سمت راست کارت (تأیید گزارش مالک)

| فیلد | مقدار |
|---|---|
| Severity / Confidence | Medium / CONFIRMED |
| Evidence | `evidence/browser/journey-desktop-fresh.png`، `journey-mobile-fresh.png` (هر دو viewport) |
| Problem / Expected | قفل در سمت راست کارت‌های قفل رندر می‌شود؛ مالک ایراد گرفته؛ در RTL نقطهٔ تمرکز اولیه است |
| Root Pattern | **RP-07** |
| Recommended Fix (M3) | جابه‌جایی/بازطراحی نشانگر وضعیت طبق سلیقهٔ مالک + آیکون اختصاصی نوع درس |

### KANA-AUD-010 — تکرار Exact سؤال walk در بانک گیت (۳ مورد)

| فیلد | مقدار |
|---|---|
| Severity / Confidence | Low / CONFIRMED |
| Exercise ID | `ex-kana-gate-m1-1`≡`ex-kana-h2-rec-hira-ko`، `ex-kana-gate-m2-1`≡`ex-kana-h1-lis-hira-e`، `ex-kana-gate-m2-2`≡`ex-kana-h12-lis-hira-he` |
| Problem | گیت باید سنجش مسیر باشد؛ تکرار بیت‌به‌بیت نمره را به حافظهٔ تازه گره می‌زند (۴۱ تکرار دیگر بین walk/مرور عمدی و مجاز است) |
| Root Pattern | **RP-08** |
| Recommended Fix (M2) | قانون فاصلهٔ حداقلی gate-walk؛ تست عدم تساوی چهارتایی |
| Regression Guard | تست CI: هیچ (promptJa, promptFa, options, key) یکسان بین بانک gate و walk |

### KANA-AUD-011 — هم‌خوانی ん قبل از همخوان دولبی (۲ مورد) — NEEDS_NATIVE_REVIEW

| فیلد | مقدار |
|---|---|
| Severity / Confidence | Low / NEEDS_NATIVE_REVIEW |
| Exercise ID | `ex-kana-k8-dec-4` (コンピューター→«کُنپیووتاا»)، `ex-kana-p3-dec-shinbun` (しんぶん→«شینبون») |
| Problem | دادهٔ HANASO ناسازگار است: えんぴつ=«اِمپیتسو» و さんぽ=«سامپو» تبدیل به «م» را اعمال کرده‌اند اما این ۲ مورد «ن» مانده‌اند. آواشناسی استاندارد [m] قبل از p/b را تأیید می‌کند؛ تصمیم قرارداد (حرفی/تلفظی) با Native/مالک نهایی شود |
| Root Pattern | **RP-02** |
| Regression Guard | تست واحد: قاعدهٔ ん→م قبل از پ/ب در کل محتوا (پس از تصمیم) |

### KANA-AUD-012 — ۸ گلیف بدون Host Word

| فیلد | مقدار |
|---|---|
| Exercise ID (منبع) | رجیستری: ヌ،ヘ،ム،モ،ヤ،ユ،ヲ،を |
| Problem | شکاف دادهٔ آموزشی (بدون واژهٔ نمونه)؛ زبانی غلط نیست |
| Root Pattern | **RP-09** |
| Recommended Fix (M2) | تکمیل hostWord یا مستندسازی علت عمدی |

### KANA-AUD-013 — ヲ بدون یادداشت تلفظ ذره‌ای

| فیلد | مقدار |
|---|---|
| منبع | رجیستری کاتاکانا ヲ (رومی "wo") — هیراگانا を یادداشت "particle: o" دارد، ヲ ندارد |
| Severity | Low / CONFIRMED |
| Root Pattern | **RP-09** | 

### KANA-AUD-014 — ۵۹ مورد گزینهٔ هم‌صدا هیراگانا/کاتاکانا — **NOT_A_BUG (عمدی)**

- همه در ایستگاه‌های K؛ پرامپت صریحاً «کاتاکانا» می‌خواهد؛ rationaleها تفاوت خط را توضیح می‌دهند؛ هدف سنجش = تشخیص خط. مستند شد تا در Mission 2 «اصلاح» نشوند. فهرست کامل: `evidence/_subagent_b_results.txt` §SCRIPT-NAMED.

### KANA-AUD-015 — کنتراست/Auto-scroll — NEEDS_CONTEXT

- پوشش UI فقط ۴ ایستگاه از ۳۸؛ در بازدیدها مورد قطعی ثبت نشد اما ادعای سلامت کامل هم قابل‌تأیید نیست (ادعاهای مالک درباره auto-scroll و کنتراست در صفحات بازدیدنشده). Mission 3 باید پیمایش کامل ۳۸ ایستگاه را انجام دهد. شواهد در دسترس: ۱۲ اسکرین‌شات.

## ۳. تطبیق Seed Caseهای مالک با یافته‌های نهایی

| Seed Case مالک | تعیین تکلیف |
|---|---|
| ۱. がっこう/چهار مورا/تشدید/کشش | توضیح مورا در داده **درست** است (۴ مورا؛ っ=مورای فشار؛ う=کشش — F3ها دقیق‌اند). مورد مشابه در خانوادهٔ RP-05 (distractor کسری) اما خود がっこう درست مستند است. **NOT_A_BUG برای متن؛ نشت شکل کلی در AUD-006** |
| ۲. ちょっと (تفکیک ちょ/っ/と) | F3 «ちょ فشرده + っ فشار + と» دقیق و درست است — **NOT_A_BUG** (پرچم مورای اسکریپت رد شد) |
| ۳. گزینه‌های خوانش مشابه | **تأیید شد** — AUD-001 (هم‌تلفظ واقعی در ۳ تمرین) + AUD-004 (نگارش ناهماهنگ) + AUD-006 (شکل) — سه ریشهٔ متمایز مستند شد |
| ۴. سؤال معنی در Station قاعده | در داده تأیید نشد (meaning-select فقط در milestoneها) اما تجربهٔ معادل در AUD-003 (hint=پاسخ) شناسایی شد |

## ۴. موارد بررسی‌شده و سالم (پیشگیری از اصلاح اشتباه در Mission 2)

- ۱۸ ادعای مورا: همگی درست (پرچم اسکریپت = false positive؛ متن به زیرواحد اشاره دارد).
- Answer Keyها: ۵۸۶/۵۸۶ منطبق بر گزینهٔ صحیح زبانی؛ ۰ مورد کلید غلط.
- P1–P4 guardrailها و ترتیب تدریس (10 پرچم untaught): همه رد شدند؛ محتوای آموزش‌نداده‌شده: ۰.
- ۵۹ هم‌خوانی Katakana: عمدی (AUD-014).
- نردبان F1→F3 در h13: صحیح (شاهد مثبت).
