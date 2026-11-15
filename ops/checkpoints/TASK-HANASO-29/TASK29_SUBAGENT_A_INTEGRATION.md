# TASK-HANASO-29 — گزارش QA یکپارچگی محصول (Subagent A — Integration QA)

**Branch:** `release/TASK-HANASO-29-final-integration` (مبنای `e81a6cd` + `6568086`) · **تاریخ:** 2026-11-15 · **روش:** ردیابی کد واقعی (imports / route handlers / props) — فقط-خواندنی، بدون اجرای سرور و تست

**جمع‌بندی کلی: PASS-WITH-NOTES** — هر ۸ جریان محصول از نظر یکپارچگی کد سالم‌اند؛ هیچ Critical/High یافت نشد. ۱ یافتهٔ Medium (لینک مردهٔ بالقوه)، ۵ یافتهٔ Low، ۲ یادداشت اطلاعاتی.

---

## جریان ۱ — ورود کاربر تازه (/ → /learn): **PASS**

- انتخاب فصل فعال کاملاً از Progress استخراج می‌شود، نه ثابت فرانت‌اند: `reveal.ts:88` (`findIndex(c => chapterStates.get(c.slug)?.status !== 'understood')`). کاربر با پیشرفت صفر → `activeIndex = 0` → فصل اول (`kana-foundation-01`). همه‌فهمیده → فصل آخر در حالت مرور (`reveal.ts:89`).
- زنجیرهٔ واقعی: `app/page.tsx:30-31` → `resolveHome` (`modules/home/server.ts:27-107`) → `resolveLearnerJourney(userId)` بدون chapterSlug (`modules/curriculum/server.ts:132-143`) → `resolveRevealPlan` (پاس اول، `server.ts:142`) → بارگذاری فصل هدف.
- صفحهٔ `/learn` (`app/learn/page.tsx:26-35`) همان `resolveLearnerJourney` را صدا می‌زند؛ `nextStationTitle` از همان خروجی سرور (`page.tsx:31-34`) — بدون محاسبهٔ موازی کلاینتی.
- پنهان‌سازی گیج‌کننده‌ای نیست: فصل‌های آینده هرگز لیست نمی‌شوند؛ تیزر فقط با ≥۷۵٪ پیشرفت core فصل فعال (`reveal.ts:98-104`)، و در حالت مرور اصلاً نشان داده نمی‌شود (`app/learn/page.tsx:55` — `teaser: home.isReview ? null : ...`).
- CTA اصلی خانه شش حالت صادقانه دارد (`app/page.tsx:33-44`)؛ حالت `resume_expired` نوتروال دارد (`page.tsx:76-80`).
- **یادداشت (Low):** `hiddenCount` در `reveal.ts:107` محاسبه می‌شود ولی در هیچ UI رندر نمی‌شود (grep کل src — صفر مصرف‌کننده). فیلد مرده؛ طبق قانون no-counters عمداً مصرف نمی‌شود ولی محاسبه‌اش باقی مانده است.

## جریان ۲ — Learning Journey (پنل بخش‌ها، پیش‌نیازها، nextStation): **PASS**

- `orderedStations` مرتب‌سازی توپولوژیک داده‌محور (`journey.ts:33-55`)؛ `stationAvailability` قفل بودن را از پیش‌نیازهای ذخیره‌شده استخراج می‌کند (`journey.ts:58-75`؛ `PREREQ_OK` شامل `needs_retry` — `journey.ts:30`).
- `rowAction` (`journey.ts:220-233`): completed/skipped → review، in_progress/needs_retry → continue، available → start، بقیه locked — یک‌به‌یک با آیکون/مارکر `RowMarker` در `section-journey.tsx:187-219`.
- ردیف «ایستگاه فعلی» با تطبیق دقیق slug سرور (`section-journey.tsx:461` — `row.slug === liveNextStationSlug`) که همان `nextStation` سرور است (`journey.ts:144-149`: اولین core در دسترس، سپس in_progress). اصلاح Subagent C در TASK-28 واقعاً اعمال شده.
- ردیف قفل: دکمهٔ واقعی با shake + فلش + پیام فارسی نام‌برندهٔ اولین پیش‌نیاز برآورده‌نشده (`section-journey.tsx:249-257, 512-541`)؛ `blockedByTitlesFa` از سرور پر می‌شود (`journey-home.tsx:97-98, 112`).
- Deep-link بخش `?s=` در هر دو صفحه (`app/learn/page.tsx:54`، `app/learn/[chapter]/journey/page.tsx:31, 85`) و در کلاینت اعتبارسنجی می‌شود (`section-journey.tsx:229-235` — slug نامعتبر → fallback به activeIndex).
- رفرش زندهٔ visibilitychange: پاسخ `/api/curriculum/journey` (route.ts:87-110 — بدون contentKind/blockedByTitlesFa) روی DTO اولیه merge می‌شود و `nextStationSlug` زنده هم به‌روز می‌شود (`section-journey.tsx:275-296`) — سازگار، بدون drift.
- لینک‌های ردیف تکمیل‌شده به حالت replay می‌روند (`journey-home.tsx:124-127` `?mode=review`) — با پردازش سمت صفحه (`[station]/page.tsx:91`) هم‌خوان.
- **یادداشت (Low/Info):** روت `/api/curriculum/journey` علاوه بر `sections` فیلدهای `units` و `nodes` هم برمی‌گرداند (route.ts:78-122) که کلاینت فعلی (SectionJourney) مصرف نمی‌کند — payload اضافی، بی‌ضرر.

## جریان ۳ — موتور درس و ایستگاه (walk بلوک‌ها، نمره‌دهی، مهر AIZEN): **PASS**

- Walk بلوک‌ها: `station-runner.tsx:1099-1171` — `BlockView` تک‌بلوکی؛ همهٔ kindها پوشش داده شده‌اند (`switch` کامل در `1672-2245`: scene, vocab-card, kana-card, expression-card, guided-discovery, structured-input, rule-card, example-set, rule-prereq, rule-contrast, rule-step, writing-practice, exercise, listening-task, character-scene, wrap-up, dialogue-player). kana-card گیت پیشروی است (no skip تا پایان نوشتن آزاد — `1181-1210`).
- نمره‌دهی کاملاً round-trip سروری: `grade` (route.ts:283-359 — نردبان F1→F2→F3 با `attemptNo`، attempt سروری)، `grade-block` (362-403)، `hint` (258-281 — فقط تمرینِ همین ایستگاه، فقط متن سرنخ). کلید پاسخ هرگز به کلاینت نمی‌رسد؛ rule-listening حتی `promptJa` را قبل از مرز RSC پاک می‌کند (`[station]/page.tsx:134-137`).
- معیار تکمیل: `stationMeetsCompletion` (`grading.ts:170-180` — viewed / task_completed / exercise_threshold). سرور در `complete` دوباره چک می‌کند (route.ts:491-519)؛ پیش‌نیازها سمت سرور اجرا می‌شوند (459-489) با 409 ساختاریافته (`prerequisites` با slug+titleFa) که کلاینت آن را به پنل بازیابی با لینک مستقیم به اولین درس ناقص تبدیل می‌کند (`station-runner.tsx:1344-1367`).
- تکمیل اتمیک: `completeStationWalk` در یک تراکنش (route.ts:525-538؛ BUG-036 TASK-24) — station + fold فصل با هم.
- رد کردن criterion (409 completion_not_met): پنل «فقط تمرین پایانی را دوباره انجام بده» — `retryFinalExercise` (`station-runner.tsx:904-929`) نتیجهٔ آخرین بلوک تمرین را حذف و walk حفظ می‌کند؛ هرگز retry هم‌نمره (حلقهٔ بی‌نهایت) یا بازآموزی کل درس نیست.
- مهر AIZEN: فقط برای تکمیل FRESH (`freshCompletion` از `already !== true` — `station-runner.tsx:810-825`)؛ بازدید/رفرش تکمیل‌شده seal settled رندر می‌کند (`aizen-seal.tsx` — `animate` فقط true برای مراسم)؛ replay هرگز re-register و re-stamp نمی‌کند (`780-785`). صدا dual-format با mute ماندگار (`313-350, 357-383`).
- درهای خروج: هدر back و CTA تکمیل هر دو به `mapHref` با `?s=` بخش همان ایستگاه برمی‌گردند (`[station]/page.tsx:89-90`؛ `station-runner.tsx:996-1008`).
- **یافتهٔ Low:** اکشن `grade` فقط چک می‌کند تمرین `assessmentRole==='practice'`ِ «فصل» باشد (route.ts:284-291)، نه اینکه متعلق به «همین ایستگاهِ ارسالی» باشد — برخلاف `hint` که `inStation` را چک می‌کند (266-271). نتیجه: نمره‌دهی تمرین ایستگاه دیگرِ همان فصل از طریق endpoint این ایستگاه ممکن است و `incrementAttempts` به ایستگاه پست‌شده ثبت می‌شود. نشتی کلید پاسخ نیست (همان فصل)، ولی ناهماهنگی اعتبارسنجی hint/grade است.

## جریان ۴ — تمرین (ایستگاه‌های stn-kana-p1..p4 + هاب /practice): **PASS**

- همان موتور یکتا: ایستگاه‌های تمرین بلوک‌های `exercise` معمولی دارند (`chapter-kana01.practice.ts` — مثلاً p1 در خطوط 42-114: scene → ۶ بلوک exercise → wrap-up) با `completion: { kind: 'task_completed' }` (خط 40) و `fsrsItems: []` (41). تمرین‌هایشان در همان بانک فصل merge می‌شود (`chapter-kana01.ts:107`).
- استگاه‌ها به فصل الصاق می‌شوند (`chapter-kana01.ts:106` — `stations: [...KANA_STATIONS, ...PRACTICE_STATIONS_KANA]`) و در units بخش A عضو واقعی‌اند (`chapter-kana01.ts:40-53`) — بدون گروه `__rest__`.
- درون‌بافت زنجیرهٔ core سالم است: p1←h5 (practice.ts:35)، p2←h9 (126)، p3←h12 (216)، p4←h15 (308)؛ و ادامهٔ مسیر به آن‌ها وابسته است: h7←p1 (stations.ts:805)، h10←p2 (1228)، h14←p3 (1737)، m1-reading←p4 (2382). orderها یکتا و توالی سالم: h0..h5=1..6، p1=7، h7..h9=8..10، p2=11، ...، p4=20، m1=21، k1..k13/m2=22..36، اختیاری‌ها 37-38.
- هاب /practice: deep-link صحیح `/learn/kana-foundation-01/journey/<slug>` (`app/practice/page.tsx:54`)؛ قفل با همان `stationAvailability` واقعی مسیر (خط 48) — نه موتور موازی. POST موازی TASK-22 حذف شده (`api/practice/route.ts:1-22` — فقط GET وضعیت).
- اعتبارسنجی محتوا (PREREQ-ORDER/BLOCK-ID-UNIQUE/...) هنگام load اجرا و fail-fast می‌شود (`server.ts:37-45, 61-68`).
- **یادداشت (Low/Info):** هاب hardcoded به فصل kana و ۴ slug است (`page.tsx:29, 33` — `PRACTICE_STATION_SLUGS`)؛ ایستگاه‌های practice فصل ۲ (stn-fm01-08/17) آنجا لیست نمی‌شوند — منطبق دامنهٔ TASK-27 (kana)، ولی برای فصل‌های بعدی باید تعمیم یابد.
- **یادداشت (Low):** GET `/api/practice` هیچ مصرف‌کنندهٔ کلاینتی ندارد (grep: هیچ fetch به `/api/practice` در src؛ صفحهٔ هاب مستقیماً storeها را در RSC می‌خواند) — سطح API بلااستفاده.
- **یادداشت (Low):** `completePracticeSession` (`lib/poc/completions.ts`) هیچ caller تولیدی ندارد (فقط تست‌ها)؛ یعنی `practice_sessions`/`learning_object_states` برای کاربران جدید همیشه خالی می‌مانند و بخش‌های «جلسات اخیر/پیشنهاد تمرین» هاب صادقانه هیچ رندر نمی‌کنند (`page.tsx:123-141` — رندر شرطی). شواهد TASK-22 فقط append-only خوانده می‌شوند — با مستندات هم‌خوان.

## جریان ۵ — مرور (وضعیت FSRS — گزارش صادقانه): **PASS (ادعای عدم یکپارچگی تأیید شد)**

واقعیت کد، همان است که مأموریت گفته — FSRS **یکپارچه نشده**:

- پورت FSRS یک stub صادقانهٔ پرتاب‌کننده است: `modules/fsrs/integration.ts:82-94` — `FSRS_NOT_INTEGRATED.getReviewQueue/recordRetrieval` هر دو `FsrsNotIntegratedError` می‌اندازند؛ `fsrsPort = FSRS_NOT_INTEGRATED` (خط 94). هیچ جدول/Store زمان‌بندی وجود ندارد؛ `fsrs_cards` فقط در wrapper گفتگویی PoC (`modules/fsrs/index.ts` — مصرف‌کنندهٔ `/poc/*`).
- خانه: `modules/home/server.ts:93-96` — `fsrsActive: fsrsPort.status === 'integrated'` (یعنی همیشه false)، `dueCount: 0`. `home-view.ts:202-209`: با fsrsActive=false فقط `queue_pending` (نوت آرام بعد از اولین ایستگاه) یا `hidden` رندر می‌شود — هیچ عدد/تاریخ جعلی نیست.
- ثبت enrolment فقط به‌صورت event با نشان صادقانه: `station/route.ts:551-562` — `fsrs_cards_enrolled` با `engine: 'not-integrated'`.
- صفحهٔ تکمیل فصل شمارش واقعی کارت‌ها از دیتای فصل (`listChapterCards` — `complete/page.tsx:5, 73-76`) با جملهٔ صریح «صف مرور با موتور M2 فعال می‌شود (هنوز فعال نیست)».
- هاب تمرین هم نوت صادقانه دارد (`fa.practice.reviewNote` — messages/fa.ts:53).
- **یافتهٔ Medium (بالقوه/latent):** شاخهٔ `due` در خانه به `/review` لینک می‌دهد (`app/page.tsx:121-131` — `href="/review"`)، ولی **هیچ روت `/review` در app وجود ندارد** (app/ فقط api, learn, poc, practice دارد). امروز این شاخه غیرقابل‌دسترس است (fsrsActive همیشه false)، پس کاربر چیزی نمی‌بیند؛ اما لحظهٔ فعال‌سازی موتور، CTA «شروع مرور» به 404 می‌رسد. لینک مردهٔ latent — باید یا روت ساخته شود یا شاخه تا آماده‌شدن موتور حذف/گارد شود.
- `learning_object_states` با حالت `eligible_for_review` و `isWeakObject` وجود دارد (`modules/practice/evidence.ts:53-63`) ولی هیچ due-date/scheduling ندارد (قواعد صریح در سرآمد همان فایل، خطوط 6-13) و نویسندهٔ تولیدی‌اش (completePracticeSession) بلافراخوان است (بالا). هیچ UI ای به due-date وصل نیست — تأیید.

## جریان ۶ — Resume (لنگر currentBlock، انقضای ۷ روزه، enter/progress): **PASS**

- سرور مرجع است: `enter/progress` (route.ts:207-256): اعتبارسنجی anchor به بلوک واقعی ایستگاه (212-214)؛ ورود مجددِ in_progress ساعت را تمدید نمی‌کند (`lastActivityAt` فقط برای progress یا اولین ورود — 227-239)؛ anchor منقضی idempotently حذف و `resumeExpired: true` برگردانده می‌شود (228-253). GET هم همین پرچم را می‌دهد (587-605).
- سیاست خالص: `resume-policy.ts:33` (TTL = ۷ روز، ثابت واحد)، `59-65` (مرز بسته، unknown→fresh صادقانه برای ردیف‌های legacy).
- کلاینت: `fetchServerResume` (station-runner.tsx:171-193)؛ restore یک‌باره در mount (586-713): snapshot محلی اول (با همان TTL — 610-614)، سپس مرجعیت سرور روی completed/expired (648-708)، گیت `resumeSettled` قبل از هر persist (718-750 — اصلاح CP-04، جلوگیری از کاشت snapshot خالی که رفرش دوم را می‌شکست)، و `restartRequested` که همه‌چیز را می‌اندازد و فقط رکورد completed سرور را می‌پرسد (589-601).
- `applyStationEvent('station_entered')` برای completed/skipped no-op است (`progress-machine.ts:41-44`) — ورود مجدد وضعیت ترمینال را خراب نمی‌کند.

## جریان ۷ — تکمیل و دستاوردها (lessonAchievementsOf): **PASS**

- `lessonAchievementsOf` (`station-runner.tsx:259-310`): تابع خالص از دیتای خود ایستگاه — شمارش واژه‌های reading از example-setها (272-281)، شمارش kana-cardها (282-284)، اثر انگشت نوع تمرین‌ها (285-305)، نوشتن دستی (306-308). سقف ۳ chip (309). هیچ ادعای mastery نیست؛ برچسب‌ها در چارچوب آشنایی/تمرین می‌مانند (شرح 250-258). خروجی در پنل تکمیل رندر می‌شود (`1267-1277`).
- تکمیل تازه/قدیمی صادقانه تفکیک شده (seal فقط fresh — بالا)؛ پنل‌های شکست تکمیل ساختاریافته‌اند (409 prereq/criterion/عمومی — 1344-1416) با retry تک‌پروازه (`completingRef` — 766-771).

## جریان ۸ — فصل ۲ (chapter-fm01) و گیت کانا: **PASS**

- گیت فصل واقعاً قفل می‌کند: fm01 دارای `prerequisiteChapterSlug: 'kana-foundation-01'` (`content/index.ts:95`)؛ `chapterAccessStatus` (`server.ts:87-104`) قفل است مگر وضعیت فصل پیش‌نیاز `understood` باشد. `understood` فقط از گیت قبول‌شده می‌آید (`progress-machine.ts:106-113` — gate_attempted passed؛ مسیر `/api/curriculum/mastery` → `submitMasteryWithFold`). گیت خودش هم تا تکمیل core path باز نمی‌شود (mastery/route.ts:69-82 — `mastery/gate_locked` 409).
- همهٔ روت‌های fm01 گارد یکسان دارند: journey (`journey/page.tsx:44-56`)، station (`[station]/page.tsx:57-66`)، assessment (`assessment/page.tsx:40-49`)، complete (`complete/page.tsx:33-42`)، dialogue، intro — هیچ مسیر دورزدن وجود ندارد؛ CTA دروازه هم فقط وقتی corePathComplete به assessment لینک می‌دهد (`journey-home.tsx:132-136`).
- قانون CHAPTER-CHAIN در `validateCourseChain` فصل‌های بدون پیش‌نیاز را رد می‌کند (`validation.ts:720-755`) و هنگام load یک‌بار اجرا می‌شود (`server.ts:37-45`).
- سلامت ایستگاه‌های fm01: ۲۲ ایستگاه، orderهای ۱..۲۲ یکتا و متوالی؛ همهٔ پیش‌نیازها داخل همان فصل و مرتب (قانون PREREQ-ORDER در validation.ts:160-171 هنگام load اجرا می‌شود)؛ زنجیره: 01(بدون پیش‌نیاز)→02→03→{04,05}→…→09→10→…→17→18؛ اختیاری‌ها به 02/03/13/17 وصل‌اند و هرگز پیش‌نیاز core نیستند (قانون OPTIONAL-NO-GATE — validation.ts:184+). هیچ ارجاع متقابل فصلی (stn-kana*) در fm01 نیست (grep: صفر). units هر ۲۲ ایستگاه را کامل پوشش می‌دهد (index.ts:52-92 — واحد ۱: 01-09، واحد ۲: 10-18 + ۴ اختیاری) — بدون گروه __rest__.
- فصل کانا: ۳۸ ایستگاه (۳۴ آموزشی + ۴ تمرین) با order یکتا ۱..۳۸؛ ایستگاه unreachable یا پیش‌نیاز هرگز-بازنشدنی یافت نشد.

---

## فهرست یافته‌ها (با شدت)

| # | شدت | جریان | یافته | شاهد |
|---|------|--------|--------|--------|
| F1 | **Medium** (latent) | ۵/مرور | لینک `href="/review"` در شاخهٔ due خانه، ولی روت `/review` وجود ندارد — امروز غیرقابل‌دسترس (fsrsActive همیشه false) اما با فعال‌سازی موتور → 404 | `app/page.tsx:125`؛ نبود `app/review/` در ساختار app |
| F2 | Low | ۳ | اکشن `grade` تعلق تمرین به «همین ایستگاه» را چک نمی‌کند (برخلاف `hint`) — نمره‌دهی تمرین ایستگاه دیگرِ همان فصل و ثبت attempt روی ایستگاه پست‌شده ممکن است | `api/curriculum/station/route.ts:284-291` در برابر `266-271` |
| F3 | Low | ۴ | GET `/api/practice` هیچ مصرف‌کنندهٔ کلاینتی ندارد (هاب مستقیماً store می‌خواند) — سطح API بلااستفاده | `app/practice/page.tsx:35-43`؛ grep fetch '/api/practice' = صفر |
| F4 | Low | ۴/۵ | `completePracticeSession` بدون caller تولیدی — `practice_sessions`/`learning_object_states` برای کاربران جدید خالی می‌مانند؛ بخش‌های «جلسات اخیر/نقاط ضعف» هاب همیشه خالی‌اند (رندر صادقانهٔ هیچ) | `lib/poc/completions.ts` (فقط تست caller)؛ `app/practice/page.tsx:123-141` |
| F5 | Low | ۱ | `hiddenCount` محاسبه می‌شود ولی هیچ‌جا رندر نمی‌شود | `reveal.ts:107`؛ grep مصرف = صفر |
| F6 | Low/Info | ۴ | هاب /practice به فصل kana و ۴ slug hardcoded است؛ ایستگاه‌های practice fm01 لیست نمی‌شوند (دامنهٔ TASK-27) | `app/practice/page.tsx:29,33` |
| F7 | Low/Info | ۲ | پاسخ `/api/curriculum/journey` فیلدهای `units`/`nodes` را هم برمی‌گرداند که کلاینت فعلی مصرف نمی‌کند | `api/curriculum/journey/route.ts:78-122` |

**Critical: 0 · High: 0 · Medium: 1 · Low: 5 (＋۲ اطلاعاتی)**

## نتیجه‌گیری

یکپارچگی TASK24 (امنیت/تراکنش) + TASK26R + TASK27 + TASK28 در سطح کد واقعاً به‌هم دوخته شده است: یک موتور واحد درس/تمرین، گیت فصل سمت سرور، resume سرور-مرجع، مهر idempotent، و پیام‌های صادقانهٔ «موتور مرور هنوز فعال نیست» در همهٔ سطوح. تنها ناسازگاری بین‌مؤلفه‌ای که رفتار کاربرِ امروز را تغییر دهد یافت نشد؛ F1 باید قبل از فعال‌سازی M2 (یا هم‌اکنون با گارد/حذف شاخه) اصلاح شود.
