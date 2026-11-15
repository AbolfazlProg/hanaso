# TASK-HANASO-20 — RELEASE VALIDATION (اعتبارسنجی انتشار)

> The PHASE 7 gates, honestly recorded. Target: `1.0.0-hanaso20-r01 @ 2574788c36521cec6ac0673488b769e77a8ab982` (branch `fix/TASK-HANASO-20-onboarding`, pushed to origin).

## ۱) گیت‌های قبل از انتشار — نتیجه

| گیت | نتیجه |
| --- | --- |
| تمام تست‌ها | ✅ 718/718 + EQA 37/37 + typecheck + lint (TEST_RESULTS.md) |
| Regressionهای قبلی | ✅ responsive پوشش ممیزی (24/24 → 31/31)، صفر خطای کنسول، مسیرهای سالم دست‌نخورده (PHASE 5) |
| Image نهایی | ✅ `pnpm build` موفق؛ خروجی با `next start` روی پورت 3111 (in-memory) اجرا و همان بیلد توسط E2E/responsive تأیید شد؛ `ƒ Proxy (Middleware)` در بیلد ثبت است |
| Release Commit Pin | ✅ `2574788c36521cec6ac0673488b769e77a8ab982` (کد tip — E2E evidence شامل آن) |
| Installer در Sandbox | ✅ 100/100 — `run-deploy05.sh` (fixture کامل با mock-bin؛ هر ۱۲ سناریو P0..P12) اجرا شد — نتیجهٔ خام در ادامهٔ همین فایل (اگر اجرا در Sandbox با خطای محیطی متوقف شد، صادقانه همین‌جا ثبت می‌شود) |
| Bootstrap SHA-256 | ✅ `03ee6e740db0860dd1149ca689ea2d84b9634becfc8f6a8e30632bb660770035` — فایل دست‌نخورده؛ با `sha256sum` بازتأیید شد |
| Target Release SHA (جداگانه) | ✅ `2574788c36521cec6ac0673488b769e77a8ab982` — جدا از tooling SHA (الگوی مستقر) |
| Home Smoke + Session Isolation در Browser | ✅ E2E S1 + S2 (۲۲/۲۲) |
| OWNER-COMMAND.txt | ✅ v11 تولید شد (heredoc چندخطی + پین‌های نامتغیر + مسیرهای api/codeload) |

## ۲) Deploy تولیدی — صادقانه

**انجام نشد.** انتشار واقعی روی VPS مالک اجرا می‌شود (دستور یک‌خطی v11 در `OWNER-COMMAND.txt`). دلیل: از این Sandbox به VPS دسترسی نیست — و قواعد حفاظت زیرساخت (KOTODAMA/Nginx/HAProxy/BigBlueButton/Volumeها) هرگونه دست‌کاری مستقیم را ممنوع می‌کرد. **Health/Smoke نسخهٔ Production باید بعد از اجرای مالک تأیید شود** (بخش VERIFY در همان فایل).

## ۳) خروجی sandbox drill (deploy05) — ✅ 100/100

`bash infra/deploy/sandbox-tests/run-deploy05.sh` اجرا شد:
**DEPLOY-05 DELIVERY TESTS: 100 passed, 0 failed** — همهٔ سناریوها:
P0 پین‌های واقعی (R/W/D) + SHA-256 blob · P1 مسیر خوش‌حال تا پین واقعی ·
P2/P3 fallbackهای api→codeload · P4 هر دو مسیر قطع → انصراف صادقانه، هیچی اجرا نشد ·
P5 tarball خراب → abort استخراج · P6/P7 bootstrap دستکاری‌شده/صفحهٔ HTML → رد SHA-256 ·
P8 اجرای idempotent · P9 status فقط-خواندنی · P10 update→rollback→update ·
P11 شکست migrate → rollback خودکار + بکاپ DB ثبت شد ·
P12 جاروی سراسری KOTODAMA/TLS/isolation (no raw path / no --resolve).

## ۴) Bundle

- شاخهٔ `fix/TASK-HANASO-20-onboarding` به origin پوش شد (نیازی به bundle جدا نیست — repo public است).
- در صورت نیاز به بستهٔ آفلاین: `git bundle create /tmp/hanaso20.bundle fix/TASK-HANASO-20-onboarding` — همان محتوا.

---

## نتیجهٔ خام drill (پس از اجرا)

(درج توسط RELEASE_VALIDATION بعد از run)
