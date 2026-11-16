# PRODUCTION POST-DEPLOYMENT REPORT — HANASO-PRODUCTION-REMEDIATION

> §۷ مأموریت: گیت پذیرش نهایی پس از دپلوی.

## وضعیت صادقانه: PENDING — دپلوی هنوز روی Production اعمال نشده

آخرین اندازه‌گیری (۲۰۲۶-۱۱-۱۶ ~۱۲:۵۰ UTC):

```json
{
  "ok": true,
  "status": "ok",
  "service": "hanaso-web",
  "version": "1.1.0-hanaso30-r01",
  "commit": "d822e1ca1fd483de9625e72997392a0d55a043d3",
  "env": "production"
}
```

**یعنی:** رفع‌های این مأموریت (کامیت‌های `74542a6` → ریلز `e2ae9d9`) روی سایت زنده **اجرا نمی‌شوند** تا وقتی کانال دپلوی فعال شود. طبق شرط پذیرش مأموریت، «تکمیل» اعلام نمی‌شود.

## چرا دپلوی انجام نشد (خلاصهٔ مستند‌شده)

- دپلوی از GitHub Actions با اتصال واقعی SSH ساخته و ۳ بار اجرا شد (runs `43855483223`، `43856133099`، probe `43860840907`) — هر سه در **TCP:22 سمت VPS timeout** شدند.
- ۴ مسیر مستقل (سندباکس مستقیم + ۳ IP ابری runner) همان نتیجه: فایروال VPS فقط SSH از IPهای مجاز (IP مالک) می‌پذیرد. `gitlab.com:22` از همان سندباکس باز است ⇒ محدودیت سمت سرور، نه محیط ما.
- هیچ مسیر غیرمستند (وبلاگ/backdoor/دستکاری مستقیم فایل‌های سرور بدون زنجیرهٔ git) استفاده نشد — طبق قواعد امنیتی مأموریت و دستور مالک.

## هر چیز دیگری که برای دپلوی لازم بود، آماده و تبت‌شده است

| قلم                                                                            | شاهد                                                                                                                                               |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| ریلز target: `e2ae9d96e7bab9e38bb15124df6bfd3c788e984e` (`1.1.0-hanaso32-r01`) | اولین CI کاملاً سبز از Nov 12: run [43868581700](https://github.com/AbolfazlProg/hanaso/actions/runs/43868581700) (verify + compose-smoke + image) |
| Image ریلز روی GHCR                                                            | `ghcr.io/abolfazlProg/hanaso:e2ae9d96e7bab9e38bb15124df6bfd3c788e984e`                                                                             |
| Installer پین‌شده به ریلز                                                      | bootstrap @ `7c7550c` (SHA-256 از GitHub گیت شد؛ زنجیره در سندباکس `updater exit 0`)                                                               |
| Workflow دپلوی                                                                 | `.github/workflows/production-deploy.yml` (dispatch + SHA پین‌شده + concurrency + گیت سلامت SHA)                                                   |
| Secrets اتصال                                                                  | `VPS_HOST/VPS_USER/VPS_PASSWORD/VPS_SSH_PORT` (201؛ بدون نشت در لاگ‌ها)                                                                            |
| Rollback                                                                       | خودکار updater + `update-hanaso.sh rollback`؛ نقطهٔ بازگشت = d822e1c؛ بدون migration (ریسک دیتابیس صفر) — جزئیات ROLLBACK_REPORT                   |

## دو مسیر فعال‌سازی (فقط یکی کافی است)

**مسیر A — باز کردن موقت SSH به سندباکس (ترجیح مالک: اتصال مستقیم من):**

```bash
# یک‌بار روی VPS (پس از پایان کار بسته شود):
ufw allow from 8.212.10.159 to any port 22 proto tcp
ufw allow from 47.57.0.0/16 to any port 22 proto tcp
```

سپس فقط به من اطلاع دهید — من کل دپلوی staged (بکاپ → build SHA پین‌شده → health-gate) را مستقیم اجرا می‌کنم و تمام راستی‌آزمایی‌های زنده را کامل می‌کنم.

**مسیر B — بلوک pull-based پین‌شده (همان الگوی امروز صبح، حالا با پین‌های hanaso32):**

```bash
bash <(curl -fsSL --retry 3 \
  -H "Accept: application/vnd.github.raw" \
  "https://api.github.com/repos/AbolfazlProg/hanaso/contents/infra/deploy/bootstrap-hanaso.sh?ref=7c7550c") \
  && echo "…updates…"
```

(بلوک کامل با گیت SHA-256 و ورودی‌های صریح در GITHUB_ACTIONS_DEPLOYMENT_REPORT.md §مسیر B.)

پس از هر کدام، این سند با نتایج واقعی تکمیل می‌شود: health=SHA هدف، اسکرین‌شات‌های after، ریسپانسیو ۶ viewport، بررسی کش/SW.
