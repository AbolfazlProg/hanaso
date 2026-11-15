# گزارش Subagent B — امنیت، داده و زیرساخت (TASK-HANASO-29)

**Branch:** `release/TASK-HANASO-29-final-integration` · **Commit مبنا:** `e81a6cd` · **تاریخ:** 2026-11-15
**دامنه:** Session/Auth، IDOR، نظم کلید پاسخ (answer-key)، idempotency و یکپارچگی، DB و migrations، نصاب و استقرار، شبکه و مدیریت خطا — **فقط read-only**؛ هیچ فایلی جز این گزارش تغییر نکرد. هیچ مقدار سری پرینت نشده (فقط نام کلیدها و مسیرها).

---

## حکم نهایی: **PASS-WITH-NOTES**

**شمار یافته‌ها:** Critical = 0 · High = 0 · Medium = 4 · Low = 8

---

## ۱. Session و احراز هویت — سالم (بدون یافته بحرانی)

### ۱-۱. توکن امضاشده و fail-closed بودن secret
- `apps/web/src/lib/learner/session.ts:52-61` — `getSessionSecret()` در حالت production بدون `HANASO_SESSION_SECRET` **خطای boot** می‌دهد (fail-closed)؛ fallback عمومی dev فقط در حالت غیر-production برمی‌گردد. این دقیقاً قرارداد TASK-24 است و در کد (نه کامنت) تأیید شد.
- `session.ts:78-87` — `parseSessionToken` ساختار `uuid.signature(base64url, 43 char)` را می‌پذیرد؛ uuid خام legacy و هر مقدار خراب → null.
- `apps/web/src/lib/learner/session-node.ts:25-32` — `verifySessionTokenSync` با `timingSafeEqual` (مقایسه زمان-ثابت) امضا را چک می‌کند؛ امضای غلط → null.
- `session-web.ts:34-44` — نسخه edge (middleware) حلقه diff روی طول ثابت 43 کاراکتر دارد؛ چون `parseSessionToken` طول را از قبل تثبیت کرده، این مقایسه عملاً زمان-ثابت است — قابل قبول.

### ۱-۲. Middleware — mint فقط روی GET/HEAD
- `apps/web/src/middleware.ts:34-36` — `shouldMint` فقط GET/HEAD.
- `middleware.ts:89-93` — روی درخواست state-changing بدون هویت **هیچ کوکی‌ای mint نمی‌شود**؛ مسیر route خودش 401 می‌دهد (رفع BUG-039).
- `middleware.ts:58-64` — re-issue امضای uuid خام legacy فقط داخل پنجره `HANASO_LEGACY_TOKEN_CUTOFF` (wall-clock)؛ در production بدون cutoff کاملاً غیرفعال (fail-closed) و تاریخ نامعتبر → غیرفعال.
- `middleware.ts:101-107` — کوکی با `httpOnly: true`، `sameSite: 'lax'`، `secure` (https / X-Forwarded-Proto / production) و maxAge یک‌ساله صادر می‌شود.

### ۱-۳. آیا کلاینت می‌تواند id زبان‌آموز دیگری بفرستد؟ — خیر
تمام مسیرها id را **فقط** از کوکی امضاشده استخراج می‌کنند:
- `apps/web/src/lib/learner/server.ts:81-87` — `resolveLearnerIdFromRequest` کوکی header را می‌خواند (آخرین occurrence برنده — سازگار با middleware، رفع A-03) و `server.ts:90-93` امضا را verify می‌کند؛ ناموفق → `GUEST_LEARNER_ID` (`'guest'`).
- **POST /api/curriculum/station** (`apps/web/src/app/api/curriculum/station/route.ts:171`): `userId = resolveLearnerIdFromRequest(req)` — هیچ فیلد body/schema‌ای به نام userId وجود ندارد؛ schema در `route.ts:51-133` فقط `chapterSlug/stationSlug/exerciseId/attemptNo/answer/score/taskCompleted/...` را می‌پذیرد. مهمان → 401 (`route.ts:179-187`).
- `/api/attempts` — `attemptSubmissionSchema` در `apps/web/src/modules/mastery/types.ts:72-75` فقط `dialogueId + answers` دارد؛ `userId` body با zod حذف می‌شود؛ route در `apps/web/src/app/api/attempts/route.ts:65-66` از کوکی resolve می‌کند.
- `/api/progress` — `progressInputSchema` در `apps/web/src/modules/progress/types.ts:48-51` بدون userId؛ route در `apps/web/src/app/api/progress/route.ts:71-72` از کوکی.
- `/api/curriculum/mastery` — `route.ts:56-57` از کوکی؛ schema فقط `chapterSlug + answers`.
- `/api/events` — `route.ts:33-34` و `:70-71` از کوکی؛ رویداد POST با هویت caller مهر می‌خورد (`:56`).
- GET هم‌مقayo: `/api/curriculum/journey` (`journey/route.ts:41`)، `/api/practice` (`practice/route.ts:44-50`، مهمان → 401)، GET station (`station/route.ts:596`).
- صفحات RSC همه از `resolveLearnerId()` (next/headers) استفاده می‌کنند — از کوکی، نه از props کلاینت (بررسی شد: `app/practice/page.tsx:32`، `app/learn/[chapter]/journey/[station]/page.tsx:56`، `app/learn/[chapter]/assessment/page.tsx:38`).

**نتیجه:** هیچ مسیری id زبان‌آموز را از body/query قبول نمی‌کند. کلید پاسخ به این سؤال: **امکان جعل id وجود ندارد مگر دسترسی به secret امضا.**

---

## ۲. IDOR / مالکیت — سالم

همه store-callهای تغییردهنده با همان userId حل‌شده scope می‌شوند:

| مسیر | محل resolve | محل scope شدن store |
|---|---|---|
| POST/GET station | `station/route.ts:171,596` | `:208,232,335,399,455,461,525-538` (upsert/listForUnit/incrementAttempts/completeStationWalk همگی با `userId`) |
| GET/POST attempts | `attempts/route.ts:38,65` | `:42 (listForUser)`، `:99-102 (create با userId)` |
| GET/POST progress | `progress/route.ts:46,71` | `:48,76,99` — به‌علاوه `:84-95`: دروازه mastery_passed وجود/مالکیت attempt را **سمت سرور** تطبیق می‌دهد (`attempt.userId !== userId` → 404) |
| POST mastery | `mastery/route.ts:56` | `:81 (listForUnit)`, `:124 (submitMasteryWithFold با userId)` |
| GET/POST events | `events/route.ts:33,70` | `:56 (مهر user_id caller)`، `:73-80 (لیست فقط رویدادهای خود caller، حذف user_id)` |
| GET practice | `practice/route.ts:44` | `:36,52,55 (listForUser)` |

- مهمان در تمام سطح‌های state-changing با `learner/no_identity` و 401 رد می‌شود (الگوی یکسان در همه routeها).
- `getEventStore()` در production هم in-memory است اما لیست GET caller-scoped و بدون user_id است — افشای بین‌کاربری ندارد.
- **هیچ routeای که state بخواند/بنویسد بدون learner-scope پیدا نشد.**
- نکته ذخیره‌شده (Low — L7): `recordLearningEvent` در `modules/curriculum/events.ts:98-101` پارامتر `userId` با پیش‌فرض `POC_DEFAULT_USER_ID` (`'poc-user'`) دارد؛ تمام call-siteهای فعلی (`station/route.ts:249,346,448,549,569`، `mastery/route.ts:174,186,197`) userId را صریح پاس می‌دهند، اما پیش‌فرض مشترک یک خطر نهفته برای call-siteهای آینده است.

---

## ۳. نظم کلید پاسخ (Answer-key discipline) — سالم

- **گریدینگ کاملاً سرور-ساید:** `modules/curriculum/grading.ts:70-99` (`gradeExerciseAnswer`) و `:101-127` (`isCorrect`). Reveal فقط در level ≥ 3 (`grading.ts:77`، `:90`).
- **Stripping تمرین‌ها:** `toClientExercise` در `grading.ts:361-376` فقط `id/type/promptFa/promptJa/options(شافل‌شده)/clozeTokens/chunks/chips/lineRef` را عبور می‌دهد — `correctOptionId`, `correctOrder`, `acceptedChipOrder`, `feedback.*`, `distractorRationaleFa` هرگز عبور داده نمی‌شوند.
- **Stripping بلوک‌ها:** `modules/curriculum/client-transport.ts:151-237` — prediction.correctOptionId/revealFa (`:186-189`)، userReply.correctOptionId/acceptedOrders (`:223-231`)، ask.correctOptionId/revealFa برای rule-contrast/rule-step (`:194-213`) همگی حذف می‌شوند؛ `findBlockAnswer` (`:357-392`) فقط سمت سرور برای grade-block استفاده می‌شود.
- **rule-listening:** متن واژه (که خودش پاسخ است) pre-answer از payload حذف می‌شود — `app/learn/[chapter]/journey/[station]/page.tsx:130-138` و `app/learn/[chapter]/assessment/page.tsx:67-71` هر دو `promptJa`/`promptJaReading` را `undefined` می‌کنند.
- **صدا/خوانش پاسخ فقط بعد از reveal:** `station/route.ts:302-334` — `correctAudio`/`correctReading` فقط در `outcome.correct || level>=3` پیوست می‌شوند؛ خط 303-304 صراحتاً F1/F2 را بدون هیچ ماده‌کلیدی برمی‌گرداند.
- **eliminateOptionIds هرگز کلید را حذف نمی‌کند:** `grading.ts:82-88` — victim شرط `o.id !== ex.correctOptionId` دارد.
- **مسیر hint:** `station/route.ts:258-281` — فقط `f2HintFa` برمی‌گردد؛ تمرین باید practice همان station باشد (`:266-275`) — probing بین‌ایستگاهی ممکن نیست. محتوای hintها در content بررسی شد (`chapter-kana01.exercises.ts:33-207`، `chapter-kana01.practice.exercises.ts:44-234`): hintها به شکل/یادسپار/حذف گزینه «غلط» ارجاع می‌دهند و خوانش درست را نام نمی‌برند (بازنویسی CP-03 در لایه محتوا واقعی است).
- **مسیر gate:** GET mastery (`mastery/route.ts:228-232`) bank را با `toClientExercise` strip می‌کند؛ `/api/attempts` پاسخ خام می‌گیرد و سرور گرید می‌کند (`attempts/route.ts:94-98`)؛ `toClientQuestions` در `lib/poc/assessment-bank.ts:30-37` کلید را حذف می‌کند (`app/poc/assessment/page.tsx:19`).
- **grade-block:** برای prediction/rule-slide-ask، `explainFa` در هر دو نتیجه برمی‌گردد (`station/route.ts:391-398`) — **طراحی عمدی** (پیش‌آگهی‌ها unscored و آموزشی‌اند، `COMPOSITION §۳-۲`)؛ برای guided-discovery/structured-input فقط روی پاسخ غلط (`:396-397`). هیچ score-ای از این مسیر تضمین نمی‌شود، پس افسایش نمره ندارد.
- کلیدواژه‌های `correctOptionId|correctOrder|acceptedChipOrder` در کل `src/app` جستجو شد — فقط در خود routeهای گریدینگ سرور ظاهر می‌شوند (`station/route.ts:149,373,383`)؛ هیچ payload کلاینتی کلید ندارد.

---

## ۴. Idempotency و یکپارچگی — سالم با دو نکته (M1, M5)

- **complete idempotent است:** `station/route.ts:456-458` — ایستگاه completed قبلاً → پاسخ `already: true` بدون بازنویسی. کلاینت آن را parse می‌کند و seal تازه نمایش نمی‌دهد (`components/curriculum/station-runner.tsx:818-825`).
- **پیش‌نیازها و معیار سمت سرور:** prereqها از store سرور چک می‌شوند (`:460-489`) و معیار تکمیل با `stationMeetsCompletion` (`:491-519`) — نه با ادعای UI.
- **تراکنش one-unit:** `completeStationWalk` در `lib/poc/completions.ts:130-179` — upsert ایستگاه + fold فصل داخل یک تراکنش Postgres (`runInTx`)؛ `attemptCount` داخل unit دوباره خوانده می‌شود (`:149-153`، رفع C-04)؛ fold فصل فقط وقتی وضعیت `started` است فلیپ می‌کند (`:165`) — replay دوتایی فصل را دوبار fold نمی‌کند.
- **submitMasteryWithFold:** advisory lock هر (user, dialogue) (`completions.ts:232`) + attemptNo = MAX+1 با unique index پشتیبان و retry روی 23505 (`db/repositories/attempts.ts:102-135`) — double-submit سریال می‌شود.
- **clampها:** `attemptNo` سمت سرور `z.number().int().min(1).max(3)` (`station/route.ts:57`)؛ سمت کلاینت هم clamp (`exercise-session.tsx:172-173`).
- **firstTryCorrect:** فقط از outcomeهای گریدشده سرور (`exercise-session.tsx:501-507`) با گیت single-flight (`gradingRef`، `:481-482`) — دابل‌کلیک دابل‌اینکرمنت ندارد؛ score نهایی از ref همگام خوانده می‌شود (`:430-432`).
- **نکته M1 (Medium) — نمرهٔ تکمیل client-attested است:** `score` در اکشن complete از body کلاینت می‌آید (`station/route.ts:95-97`، clamp در `:454`) و سرور آن را با پاسخ‌های گریدشده تطبیق نمی‌دهد؛ `taskCompleted` هم همین‌طور (`:97`). یک کلاینت دستکاری‌شده می‌تواند بدون پاسخ دادن، ایستگاه exercise_threshold را با score=1 «کامل» کند و firstTryCorrect خودش را جعل کند. دامنه: صرفاً خودِ همان زبان‌آموز (بدون اثر بین‌کاربری)، بدون گواهی/امتیاز واقعی در محصول — ولی یک شکاف یکپارچگی واقعی است. پیش‌نیازها همچنان سمت سرور چک می‌شوند پس زنجیره فصل‌ها شکسته نمی‌شود.
- **نکته M5 (Low) — incrementAttempts از نوع read-modify-write است:** `db/repositories/curriculum.ts:125-149` — select سپس insert با `next` محاسبه‌شده؛ دو grade هم‌زمان می‌توانند یک شمارش را از دست بدهند (lost update). اثر: فقط شمارنده/آنالیتیکس، نه وضعیت یا نمره.

---

## ۵. DB و Migrations — سالم (نکته M2)

- **ترتیب و وجود:** 5 مهاجرت در `apps/web/db/migrations/` با journal معتبر (`meta/_journal.json` idx 0..4: 0000_remarkable_warbird → 0001_smooth_alice → 0002_station_minutes_real → 0003_station_last_activity → 0004_minor_morlun). Runner: `src/db/migrate.ts:42-57` (migrator خود drizzle با bookkeeping `drizzle.__drizzle_migrations`).
- **غیرمخرب:** grep روی همه `*.sql`ها برای `DROP|TRUNCATE|DELETE FROM|ALTER TABLE.*DROP` — **صفر نتیجه**. 0002 فقط widen نوع int→real است؛ 0003 صرفاً `ADD COLUMN last_activity_at ... DEFAULT now() NOT NULL`؛ 0004 فقط دو CREATE TABLE جدید. هیچ دستور مخربی وجود ندارد.
- **Seed:** پایه (`src/db/seed.ts` — characters/dialogues/lines/lesson) + `seed:curriculum` (`src/db/seed-curriculum.ts` — levels/units/stations)، هر دو idempotent با uuidv5 + upsert روی کلید طبیعی، و هر دو **هرگز به اسکیمای `app` (داده کاربر) دست نمی‌زنند** (تأیید در header هر دو فایل و کد).
- **نصب تازه vs ارتقا:** compose یک‌بار‌مصرف `migrate` هر سه را اجرا می‌کند (`infra/deploy/learn-kotodama/docker-compose.shared-vps.yml:218-223`: migrate && seed && seed:curriculum)؛ ارتقا فقط pendingها را اعمال می‌کند (journal) — هر دو مسیر پشتیبانی می‌شوند. تعویض repository با `DATABASE_URL` در `src/lib/poc/stores.ts:64-117` (globalThis singleton) — هر 6 store (به‌جز event که صادقانه in-memory است) سوییچ می‌شوند؛ **هیچ store فقط-dev در مسیر production build استفاده نمی‌شود** (تأیید: همه مسیرهای API/RSC از همان getters می‌گذرند).
- **نکته M2 (Medium) — غیبت DATABASE_URL در production بی‌صدا به in-memory می‌افتد:** `stores.ts:64-66` + `db/client.ts:56-58` فقط وجود متغیر را چک می‌کنند؛ برخلاف `HANASO_SESSION_SECRET` هیچ boot-error برای production وجود ندارد. `/api/ready` با status `skipped` همچنان `ok:true` برمی‌گرداند (`api/ready/route.ts:43`)، وگرچه گیت C6 آپدیتر (`update-hanaso.sh:574-575`، grep `"database":{"status":"ok"`) این حالت را می‌گیرد، یک اجرای دستیِ compose بدون این متغیر ساکت روی حافظهٔ فرّار کار می‌کند (از دست رفتن progress با restart).
- **restore ایمن:** `db/cli.ts:89-106` + `db/restore.ts` — restore هرگز به دیتابیس live نمی‌رود (پاسداشت قید مالک «هیچ‌گاه اطلاعات اصلی را پاک نکن»).

---

## ۶. نصاب و ایمنی استقرار — سالم با دو نکته (M3, M4)

### ۶-۱. Pin و SHA-256
- Bootstrap: `infra/deploy/bootstrap-hanaso.sh:52-59` — `HANASO_TARGET_SHA`/`HANASO_TARGET_VERSION`/`HANASO_DEPLOY_SHA` (branch فقط fallback با هشدار صریح `:142-145`)؛ وجود commitها verify می‌شود (`:135-149`)؛ آپدیتر فقط از worktree همان DEPLOY_SHA اجرا می‌شود (`:301-310`).
- One-liner مالک (`OWNER-COMMAND.txt`): SHA-256 واقعی فایل bootstrap قبل از اجرا چک می‌شود (`sha256sum -c`) — گیت سخت.
- Self-check داخل bootstrap (`:284-296`): عدم تطابق فقط **warn** می‌دهد و ادامه می‌دهد (نکته M3/Low) — به‌جا نوشته که آپدیتر همچنان از commit pin شده اجرا می‌شود و one-liner خودش گیت سخت را دارد؛ ولی در invocation دستی مستقیم، این گیت نرم است.

### ۶-۲. TLS
- هیچ `curl -k`/`--insecure`/`tls-verify off` در هیچ اسکریپت deploy وجود ندارد (grep تأیید شد). مسیر raw با `curl --resolve` به IP مالک‌تأییدشده می‌رود و TLS کاملاً روشن می‌ماند (`bootstrap-hanaso.sh:13-14,37-38`). `http://127.0.0.1:3100` فقط loopback است.

### ۶-۳. حفظ volumes/secrets و عدم لمس سرویس‌های مشترک
- تفکیک `/opt/hanaso` (deploy، هرگز clone/حذف نمی‌شود) از `/opt/hanaso-src` — `bootstrap-hanaso.sh:27-33,112-114` و `update-hanaso.sh:96-145` (دایرکتوری ناهمخوان گزارش و دست‌نخورده).
- backup قبل از هر تغییر: `.env` + pg_dump با تأیید non-empty (`update-hanaso.sh:445-459`)؛ rollback فقط image، «DB untouched» (`:251-275`).
- KOTODAMA فقط **شاهد** است: baseline (`:361-362`) و گیت C10 که اگر HTTP code تغییر کند می‌ایستد (`:674-677`)؛ HAProxy/nginx هرگز لمس نمی‌شوند (پیام‌های INGRESS_PREEXISTING_BROKEN مستقیماً مالک را به front-line می‌فرستند).
- compose: postgres/pgbouncer **بدون هیچ port منتشرشده** (`docker-compose.shared-vps.yml:102,157`)، web فقط `127.0.0.1:3100` (`:45`)، project/volumeهای hanaso-پیشوندی (`:28,236-240`)، گیت A4 نام پروژه (`update-hanaso.sh:315-316`)، تصاویر زیرساخت digest-pinned (`:67,133`).
- nginx vhost (`hanaso-learn.nginx.conf:38-40,55-57`): X-Frame-Options/X-Content-Type-Options/Referrer-Policy با `always` و تکرار در location (قاعده inheritance).

### ۶-۴. کلیدهای قراردادی env که نصاب پاس می‌دارد
- **الزامی (گیت A3 آپدیتر):** `HANASO_WEB_IMAGE`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `HANASO_SESSION_SECRET`, `HANASO_LEGACY_TOKEN_CUTOFF` (`update-hanaso.sh:310-312` — فقط نام، هرگز مقدار).
- **Pin/target:** `HANASO_TARGET_SHA`, `HANASO_TARGET_VERSION`, `HANASO_TARGET_BRANCH`, `HANASO_DEPLOY_SHA`, `HANASO_DEPLOY_BRANCH`, `HANASO_REPO_URL`, `HANASO_SRC_DIR`/`HANASO_REPO_DIR`, `HANASO_DEPLOY_DIR`.
- **مسیرها/گیت‌ها:** `HANASO_PUBLIC_BASE`, `HANASO_KOTODAMA_URL`, `HANASO_LOCAL_HEALTH`, `HANASO_LOCAL_READY`, `HANASO_MIN_FREE_MB`, `HANASO_WARN_FREE_MB`, `HANASO_MIN_MEM_MB`, `HANASO_CHECKHOST_DELAY`.
- **ampهای escape (همه صریح و مستند):** `HANASO_SKIP_ENV_PREP=1` (`bootstrap:175-178`)، `HANASO_ALLOW_DEGRADED_BASELINE=1` (`update:351-356`)، `HANASO_ALLOW_UNVERIFIED_INGRESS=1` (`update:379-403`)، `HANASO_FORCE=1` (`update:427-434`)، `HANASO_GHCR_TOKEN` (فقط push اختیاری، هرگز echo/ذخیره نمی‌شود، `update:482-489`).
- `prepare_security_env` (`bootstrap:174-276`): secret موجود هرگز rotate نمی‌شود؛ validation هگز 32-128 و ISO-8601؛ تولید روی سرور (`openssl rand -hex 32`)؛ cutoff فقط یک‌بار now+14d؛ نوشتن atomic با backup و mode 600؛ هیچ مقداری log نمی‌شود. سناریوهای S1-S8 در `sandbox-tests/run-envprep.sh` (از جمله S5/S6 abort و S7 عدم لو رفتن secret) پوشش داده شده‌اند.

### ۶-۵. نکته M4 (Medium) — pinهای پیش‌فرض کهنه‌اند
`bootstrap-hanaso.sh:52-55` (TARGET_SHA = `2574788…`، نسخه `1.0.0-hanaso20-r01`) و `update-hanaso.sh:71-73` (TARGET_SHA = `3f41f6e…`، همان نسخه hanaso20) به عهد TASK-20 اشاره می‌کنند. یک‌فرمان مستند با env override می‌رود و سالم است، اما اجرای دستیِ `bash bootstrap-hanaso.sh` بدون env **نسخهٔ کهنه hanaso20 را دیپلوی می‌کند**. برای TASK-29 (CP-6) OWNER-COMMAND.txt و pinهای پیش‌فرض باید با SHA رلیز نهایی بازتولید شوند.

---

## ۷. شبکه و مدیریت خطا — سالم

- **شکل خطا:** همه مسیرها envelope ساختاریافته `{ ok:false, error:{code,message,...} }` با کد وضعیت درست برمی‌گردانند (400/401/404/409/422) — helper در `modules/shared/index.ts:17-24`. هیچ stack-trace‌ای در هیچ response جستجو نشد. `/api/ready` خطای خام driver را پنهان می‌کند («raw driver errors stay in server logs» — `api/ready/route.ts:34-38`).
- **خطاهای unhandled store** → 500 پیش‌فرض Next.js (بدون stack در production) + مرز خطای فارسی `app/learn/[chapter]/error.tsx:11-36` (بدون نمایش error.message، فقط کارت بازیابی فارسی).
- **مسیرهای catch کلاینت:**
  - grade: `exercise-session.tsx:530-537` — catch → بازخورد فارسی «gradingUnavailable» (نه سکوت)؛ گیت re-entrancy `gradingRef` (`:481-482`) از POST دوتایی جلوگیری می‌کند.
  - hint: `:564-566` — catch → null (honest degrade).
  - completion: `station-runner.tsx:878-885` — catch → پنل شکست صادقانه با retry دستی؛ گیت single-flight `completingRef` (`:766-771`) و parse ساختاری 409 (`:838-873`).
  - sync/position/writing: fire-and-forget با catch خالی (`station-runner.tsx:212-214,242-244`) — best-effort عمدی.
- **retry ناایمن؟ خیر:** هیچ retry خودکار POST سمت کلاینت وجود ندارد. retryهای سمت سرور فقط در `completions.ts:77-92` (practice) و `:229-242` (mastery) روی 23505/25P02 با یک retry کران‌دار و بازاجرای کل unit — idempotent و امن.

---

## ۸. فهرست کامل یافته‌ها

### Medium (4)
| # | یافته | محل دقیق | توضیح |
|---|---|---|---|
| M1 | نمره تکمیل ایستگاه client-attested است — بدون تطبیق سرور با پاسخ‌های گریدشده | `api/curriculum/station/route.ts:95-97,454,491-519` | کلاینت دستکاری‌شده می‌تواند score=1 بفرستد؛ دامنه خودکار، نه بین‌کاربری |
| M2 | غیبت DATABASE_URL در production بی‌صدا به storeهای in-memory می‌افتد؛ /api/ready با skipped همچنان ok:true | `lib/poc/stores.ts:64-66`، `db/client.ts:56-58`، `api/ready/route.ts:43` | گیت آپدیتر می‌گیرد؛ اجرای دستی نه |
| M3 | self-check bootstrap در عدم تطابق فقط warn می‌دهد | `infra/deploy/bootstrap-hanaso.sh:284-296` | گیت سخت فقط در one-liner است؛ invocation دستی مستقیم محافظت ضعیف‌تری دارد |
| M4 | pinهای پیش‌فرض bootstrap/updater به رلیز کهنه hanaso20 اشاره می‌کنند | `bootstrap-hanaso.sh:52-55`، `update-hanaso.sh:71-73` | اجرای بدون env → دیپلوی نسخه کهنه؛ CP-6 باید بازتولید کند |

### Low (8)
| # | یافته | محل دقیق |
|---|---|---|
| L1 | incrementAttempts از نوع read-modify-write (lost update تحت هم‌زمانی) — فقط شمارنده | `db/repositories/curriculum.ts:125-149` |
| L2 | هدر CSP وجود ندارد (فقط XFO/nosniff/Referrer در nginx) | `infra/deploy/learn-kotodama/hanaso-learn.nginx.conf:38-40`؛ `next.config.ts` بدون CSP |
| L3 | /api/health اطلاعات build (commit/version/env/uptime) را عمومی افشا می‌کند — طراحی عمدی برای گیت‌های دیپلوی | `api/health/route.ts:11-26` |
| L4 | store آنالیتیکس در production هم in-memory است (داده با restart از بین می‌رود) — صادقانه مستند | `lib/poc/stores.ts:75-78`، `lib/poc/event-store.ts:31-55` |
| L5 | CSRF فقط به sameSite=lax + JSON content-type تکیه دارد؛ چک Origin/Referer ندارد — برای این مدل تهدید کافی | `middleware.ts:103-104` |
| L6 | گیت‌های escape صریح (SKIP_ENV_PREP / ALLOW_DEGRADED_BASELINE / ALLOW_UNVERIFIED_INGRESS / FORCE) — مستند اما قابل دور زدن توسط اپراتور | `bootstrap:175-178`، `update:351-356,379-403,427-434` |
| L7 | پیش‌فرض `POC_DEFAULT_USER_ID` در recordLearningEvent — خطر نهفته برای call-siteهای آینده (فعلاً همه صریح پاس می‌دهند) | `modules/curriculum/events.ts:98-101` |
| L8 | کوکی session یک‌ساله بدون چرخش — برای محصول ناشناس قابل قبول | `middleware.ts:31-32` |

### موارد بررسی و تأیید سالم (بدون یافته)
sign/verify زمان-ثابت، boot-error بدون secret در production، cutoff legacy fail-closed، mint فقط GET/HEAD، مهمان→401 همه‌جا، مالکیت در همه store-callها، تطبیق مالکیت attempt در progress، stripping کامل کلید پاسخ (تمرین، بلوک، rule-listening، hint)، reveal فقط در F3/correct، migrations غیرمخرب و مرتب، seed idempotent بدون لمس داده کاربر، restore ایمن، تفکیک deploy/src، backup قبل از تغییر، rollback بدون لمس DB، شاهد KOTODAMA، بدون bypass TLS، digest-pin تصاویر، بدون port عمومی برای DB، retryهای کران‌دار idempotent، مرز خطای فارسی بدون stack.

---

## ۹. توصیه‌ها (به ترتیب اولویت)
1. **(M1)** در اکشن complete، نمره را سرور-محور کنید: یا شمارش پاسخ‌های سرور-گریدشده (`incrementAttempts` + خوانش outcomeها) را با score ادعایی تطبیق دهید، یا score را به‌کلی از شمارنده‌های سرور بسازید. حداقل: برای ایستگاه‌های exercise_threshold، تعداد gradeهای ثبت‌شده سرور باید ≥ تعداد آیتم‌ها باشد.
2. **(M2)** در production، غیبت DATABASE_URL باید مثل HANASO_SESSION_SECRET خطای boot باشد (یا حداقل /api/ready با skipped گزارش fail کند).
3. **(M4)** قبل از رلیز TASK-29، OWNER-COMMAND.txt و pinهای پیش‌فرض هر دو اسکریپت را با SHA رلیز نهایی بازتولید و sandbox-آزمایی کنید (سناریوی run-install موجود الگو است).
4. **(M3)** در bootstrap، عدم تطابق self-check را به abort تبدیل کنید (یا دست‌کم هشدار برجسته‌تر + الزام env صریح در invocation دستی).
5. **(L1)** incrementAttempts را به یک `UPDATE ... SET attempt_count = attempt_count + 1` اتمیک تبدیل کنید.
