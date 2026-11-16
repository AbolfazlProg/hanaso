# GITHUB ACTIONS DEPLOYMENT REPORT — HANASO-PRODUCTION-REMEDIATION (§6)

## آنچه ساخته و اجرا شد (واقعی، نه صوری)

| مورد | مقدار |
|---|---|
| Workflow | `.github/workflows/production-deploy.yml` (کامیت `781466b` روی main) |
| Trigger | فقط `workflow_dispatch` با ورودی `target_sha` (۴۰ هگز اجباری، validate می‌شود) + `target_version` |
| Concurrency | `group: production-deploy`، `cancel-in-progress: false` (دپلوی‌ها سریال) |
| Permissions | `contents: read` (least-privilege) |
| Secrets | `VPS_HOST`، `VPS_USER`، `VPS_PASSWORD`، `VPS_SSH_PORT` — set با موفقیت (HTTP 201)، مقادیر هرگز در لاگ نیستند (sshpass از env `SSHPASS` می‌خواند؛ در لاگ `***` دیده شد) |
| گیت سلامت | بعد از deploy، تا ۳۰×۵s `/api/health` چک می‌شود: `commit == target_sha` **و** `version == target_version` وگرنه job fail |
| Rollback | خودکار توسط updater (auto-rollback روی خطای health) + `update-hanaso.sh rollback` |

## اجراهای واقعی

| Run | نتیجه | دلیل |
|---|---|---|
| [`43855483223`](https://github.com/AbolfazlProg/hanaso/actions/runs/43855483223) | failure (exit 255) | `ssh: connect to host *** port ***: Connection timed out` — در استف SSH از runner گیتهاب |
| [`43856133099`](https://github.com/AbolfazlProg/hanaso/actions/runs/43856133099) | failure | همان خطا از runner IP دیگر (تأیید: مشکل سیستماتیک است نه یک IP) |

نکتهٔ امنیتی مثبت: هیچ secret در لاگ‌ها نشت نکرد (`SSHPASS: ***`، host/port هم `***`).

## ریشهٔ شکست: مسیر شبکه، نه کد

سه مسیر مستقل آزموده و مستند شد:

| مسیر | نتیجه | شاهد |
|---|---|---|
| SSH مستقیم سندباکس → VPS:22 | timeout | `socket.connect` timeout؛ در حالی که gitlab.com:22 از همین سندباکس باز است ⇒ محدودیت سمت VPS |
| GitHub Actions runner (Azure، ۲ IP متفاوت) → VPS:22 | timeout | لاگ هر دو run |
| پورت‌های جایگزین (2222/8443/2200/10000) + IPv6 | همه بسته | TCP probe |

**نتیجه:** فایروال VPS فقط SSH از IPهای مجاز (IP مالک) می‌پذیرد — که این رفتار امنیتی درست و عمدی است. VPS اما اتصال خروجی HTTPS (443) آزاد دارد (همین امروز clone/build از GitHub انجام داده).

## وضعیت فعلی: زنجیرهٔ دپلوی کاملاً آماده، فقط «تریگر» نیازمند یک اقدام مالک

دو مسیر معتبر (هر دو با همان آرتیفکت‌های پین‌شده):

### مسیر A (ترجیح مالک: اتصال مستقیم من به سرور)
مالک موقتاً SSH را برای IP خروجی سندباکس باز کند:
```bash
# روی VPS (یک‌بار؛ بعد از پایان کار بسته شود):
ufw allow from 8.212.10.159 to any port 22 proto tcp
ufw allow from 47.57.0.0/16 to any port 22 proto tcp   # پول NAT سندباکس (چرخشی)
```
سپس من مستقیماً staged deploy کامل را اجرا و راستی‌آزمایی زنده انجام می‌دهم.

### مسیر B (دپلوی pull-based از GitHub — همان مکانیزمی که امروز صبح جواب داد)
مالک همان بلوک تک‌خطی (نسخهٔ جدید با پین‌های hanaso31) را روی VPS اجرا کند — bootstrap از GitHub دانلود، SHA-256 گیت، build از کامیت پین‌شده `74542a6…`، بکاپ خودکار، health-gate، rollback خودکار. **این مسیر دقیقاً «GitHub به‌عنوان واسطه» است: همهٔ artifactها/پین‌ها از GitHub سرو می‌شوند.**

پس از هر کدام، من (agent) به‌صورت زنده verify می‌کنم: health=SHA هدف، مرورگر واقعی روی h13 و journey، اسکرین‌شات‌ها، ریسپانسیو — همه در BROWSER_PRODUCTION_VERIFICATION ثبت می‌شود.

## چرا «کد در VPS» هم راه‌حل نیست

افزودن cron/webhook دپلوی به اپ = استقرار کدِ جدید برای ممکن‌شدن استقرار (chicken-egg) + افزودن سطح حملهٔ جدید به Production بدون بازبینی مالک — انجام نشد و مستند شد.

## تست کامل زنجیره در سندباکس (با همان پین‌های جدید)

- دانلود bootstrap از codeload @ `781466b` → SHA-256 `39815812ac7a…` **تطبیق** ✓
- اجرای `status` با `TARGET=74542a6…/1.1.0-hanaso31-r01` در fixture → TASK-24 checks سبز، health-gate درست، `updater exit 0` ✓
- idempotency حفظ secret/cutoff (سندبکس، قبلاً اثبات شد؛ همان bootstrap logic) ✓
