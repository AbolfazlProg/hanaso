# HANASO-IR — CURRENT STATE (production deploy of hanaso.ir)

> مأموریت: استقرار Production واقعی روی سرور جدید (hanaso.ir) از طریق Web Terminal پنل ops.hanaso.ir — طبق الزام مأموریت، هیچ SSH یا GitHub Actions برای اتصال سرور استفاده نشد؛ همهٔ دستورات از ترمینال ttyd اجرا شد.

## وضعیت: LIVE-AND-HEALTHY (نسخهٔ 1.1.0-hanaso32-r01) + بازنشر hanaso33 در جریان (build سمت سرور با nohup)

| قلم              | وضعیت                                                                                                                                                                                                          | شاهد          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| DNS              | ✅ hanaso.ir و ops.hanaso.ir هر دو → `45.135.242.140` (سرور جدید)؛ www.hanaso.ir هیچ رکوردی ندارد (gap — نیازمند اقدام مالک در DNS)                                                                            | recon.log     |
| سرور             | Ubuntu 24.04.4، 1 هسته Xeon، 2GB RAM (+2G swapfile ساخته‌شده)، 19GB disk، nginx 1.24                                                                                                                           | recon.log     |
| Runtime          | docker.io + compose v2 نصب؛ mirror رجیستری `docker.1ms.run` در `/etc/docker/daemon.json` (docker.io از این IP تحریم/403)                                                                                       | fixmirror.log |
| سرویس‌ها         | hanaso-postgres (PG 18.6، digest-pinned، healthy) → hanaso-pgbouncer (healthy) → hanaso-web + hanaso-worker (هر دو healthy، محدودمنبع با override تک‌هسته‌ای `docker-compose.hanaso-ir-1core.yml`)             | status.log    |
| نسخهٔ مستقر      | `1.1.0-hanaso32-r01` @ `e2ae9d96e7bab9e38bb15124df6bfd3c788e984e` (release pin مستند مأموریت قبل؛ CI کاملاً سبز run 43868581700) — `/api/health` PIN MATCH ✓                                                   | resume.log    |
| Migration/Seed   | ✅ اجرای کامل (direct connection) — ready endpoint: database ok SELECT 1 via app pool                                                                                                                          | resume.log    |
| Worker           | ✅ pg-boss schedules ثبت: ops.backup (03:30 Tehran)، ops.db-verify (04:00)                                                                                                                                     | resume.log    |
| HTTPS            | ✅ Let's Encrypt برای hanaso.ir (valid تا 2027-02-17، certbot auto-renew)، http→https 301، vhost جدید `/etc/nginx/sites-available/hanaso.ir.conf`؛ **پنل ops دست‌نخورده** (بکاپ nginx در /root/nginx-backup-*) | https.log     |
| Boot persistence | ✅ docker enabled + restart: unless-stopped                                                                                                                                                                    | resume.log    |
| Secrets          | POSTGRES_PASSWORD + HANASO_SESSION_SECRET با openssl روی خود سرور تولید و فقط در `infra/deploy/learn-kotodama/.env` (git-ignored, mode 600)؛ هیچ secret در repo/log/report نیست                                | 02/05 scripts |

## QA مرورگر واقعی (۱۱ بند مأموریت) — تا این لحظه

| #   | بند                   | نتیجه                                                                                                                                                                                                                                                                |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | صفحه اصلی HTTPS       | ✅ عنوان «هاناسو»، داشبورد RTL با «قدم بعدی»، بدون خطای صفحه                                                                                                                                                                                                         |
| 2   | ثبت‌نام/ورود          | ⚠️ این ریلز به‌طراحی حساب کاربری نام/رمز ندارد — هویت امضاشدهٔ httpOnly (`hanaso_lid = id.signature`) با middleware صادر می‌شود (identity.ts؛ مسیر مهاجرت به better-auth = بدهی M1 مستند). معادل امنیتی ورود: کوکی امضاشده + بررسی forgery سمت سرور (TASK-HANASO-24) |
| 3   | Session پس از Refresh | ✅ همان کوکی/پیشرفت بعد از reload (۱/۳ ضربه حفظ شد)                                                                                                                                                                                                                  |
| 4   | Backend→DB            | ✅ ready: database ok، serverVersion 18.6                                                                                                                                                                                                                            |
| 5   | مسیر یادگیری/درس      | ✅ /learn → journey کامل ۳۸ ایستگاه، walk h0+dialogue+h1                                                                                                                                                                                                             |
| 6   | تمرین/ثبت پاسخ/پیشرفت | ✅ رویدادها 201؛ DB: station_progress=4 ردیف برای learner من؛ assessment batteries در ایستگاه‌های قفل‌شدهٔ بعدی‌اند (جریان طراحی‌شده)                                                                                                                                |
| 7   | Writing               | ✅ کارت نوشتار あ: ثبت ضربه (۱/۳) + بازخورد اصلاحی واقعی («از نقطهٔ شروع درست بردار — این ضربه از بالا-چپ شروع می‌شود»)؛ تکمیل همهٔ ضربه‌ها نیازمند دقت لمسی بیشتر (مکانیزم اثبات شد)                                                                                |
| 8   | صوت                   | ✅ dialogue opus (206/200) + kana/hostwords/sfx در public؛ console warnings فقط autoplay-policy                                                                                                                                                                      |
| 9   | موبایل/دسکتاپ         | ✅ 390px و 1280/1440px بدون overflow؛ قفل‌ها در RTL سمت چپِ بصری (x=41@390، x=301/381@desktop — رفع مأموریت قبل زنده است)                                                                                                                                            |
| 10  | بقا پس از Restart     | ✅ `docker restart hanaso-web` → health ok با همان SHA، همان کوکی، همان پیشرفت ۱/۳                                                                                                                                                                                   |
| 11  | Console/Server logs   | ✅ صفر خطای مرورگر؛ یک خطای ⨯ سمت سرور یافت و **رفع** شد (پایین)                                                                                                                                                                                                     |

## باگ کشف‌شده در QA زنده → رفع شد

`POST /api/progress` برای مکالمهٔ فصلی (kana-welcome-01 — بدون B_lesson anchor طبق طراحی) → sentinel مخزن (TASK-HANASO-21) → 500 در لاگ وب.

**رفع (کامیت `60cd183`):** sentinel به `NoUnitAnchorError` تایپ‌دار تبدیل شد؛ route آن را می‌گیرد و برای مکالمهٔ فصلی `200 applied:false` برمی‌گرداند (رویداد پذیرفته، unit upsert غیرقابل‌اعمال)؛ مکالمه‌های anchor-dar → `201 applied:true` مثل قبل. تست رگرسیون: `tests/unit/api/chapter-dialogue-progress.spec.ts` (۲ case). سوئیت کامل 860/860.

**+ rebase حیاتی:** شاخهٔ deploy ابتدا روی مبنای قدیمی بود؛ روی `origin/main` rebased شد تا ریلز شامل همهٔ رفع‌های مأموریت قبل باشد (19f19cb).
**+ امنیت:** ۲ advisory متوسط Next.js (منتشر 2026-11-19) گیت audit را بست → next 16.4.3→16.4.5 patch bump (کامیت `f434efc`)، `pnpm audit --prod` تمیز.

**CI سبز:** run 44553354760 روی `f434efc` (verify + compose-smoke + image→GHCR).

## در جریان (خودکار، روی سرور با nohup)

`07-redeploy-with-fix.sh`: checkout `f434efc` → build image (1.1.0-hanaso33-r01) → تعویض فقط `HANASO_WEB_IMAGE` در .env → `up -d web worker` (postgres/pgbouncer دست‌نخورده) → health gate با SHA/نسخهٔ جدید. لاگ: `/var/www/html/m-2cbd294f/redeploy.log` (+redeploy.done).

## کار باقی‌مانده (پیگیری در پیام بعدی)

1. تأیید redeploy.done + health = `1.1.0-hanaso33-r01 @ f434efc…`
2. walk دوبارهٔ مکالمهٔ خوشآمد → تأیید صفر خطای 500 در logscan
3. `/api/health` عمومی + اسکرین‌شات after برای گزارش
4. پاک‌سازی کانال HTTP موقت (`rm -rf /var/www/html/m-2cbd294f`) پس از پایان
5. اختیاری: رکورد DNS برای www.hanaso.ir (مالک)؛ prune image قدیمی پس از پذیرش (rollback امن باقی می‌ماند)
