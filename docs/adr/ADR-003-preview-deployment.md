# ADR-003 — Isolated Preview Deployment (compose + Caddy + rollback)

**TL;DR (فارسی):** Preview به‌صورت ایزوله با Docker Compose (شبکه/پورت/volumeهای مخصوص HANASO) + Caddy با TLS و هدرهای امنیتی مستقر می‌شود؛ رول‌بک = استقرار مجدد SHA قبلی؛ هیچ سرویس موجود سرور دست نمی‌خورد.

- **مسئله:** مأموریت §۸: استقرار مستقل و امن Preview بدون آسیب به سرویس‌های احتمالی دیگر VPS؛ دامنهٔ اصلی برای انتشار نهایی محفوظ بماند.
- **گزینه‌ها:** (۱) Docker Compose ایزوله + Caddy به‌عنوان reverse-proxy مستقل HANASO · (۲) اشتراک reverse-proxy موجود سرور · (۳) استقرار bare-metal بدون Docker.
- **شواهد:** ADR-010 KB (self-host اروپا، نه Hetzner — TRK-010؛ Caddy 2.11؛ rollback=redeploy؛ restic)؛ compose باید فقط 80/443 را باز کند؛ محیط فعلی Agent نه Docker دارد نه دسترسی VPS (BLOCKER-F02) — پس artefactها باید «آمادهٔ اجرا روی سرور» باشند.
- **مقایسه:** گزینهٔ ۲ نیاز به دست‌کاری proxy مشترک دارد (نقض §۸.۲ «بازپیکربندی نکن»)؛ گزینهٔ ۳ بدون ایزولاسیون و غیرقابل-rollback تمیز. گزینهٔ ۱ مستقل‌ترین و قابل‌تکرارترین است.
- **تصمیم:** `infra/docker/docker-compose.yml` (سرویس `web` + `caddy`؛ شبکه/volume/پورت‌های پیشونددار `hanaso-`) + `infra/caddy/Caddyfile` (پیش‌فرض `preview.hanaso.ir`؛ بلوک production کامنت‌شده) + `deploy.sh`/`rollback.sh` با گیت سلامت. Postgres/PgBouncer/worker عمداً **در این اسکلت نیست** (M0-10 — DB هنوز لازم نیست؛ compose افزودنی است).
- **مزایا:** صفر تداخل با سرویس‌های دیگر (پورت‌ها فقط از طریق caddy) · بازگشت <۱۰ دقیقه · TLS خودکار. **معایب:** اگر Caddy دیگری روی 80/443 باشد، هم‌زیستی نیاز به تصمیم مالک دارد (در VPS-OWNER-CHECKLIST آمده).
- **هزینهٔ تغییر آینده:** افزودن postgres/pgbouncer/worker = سرویس‌های جدید همان compose (بدون تغییر معماری)؛ انتقال به سرور دیگر = git clone + deploy.sh.
- **ریسک‌ها:** DNS تأییدنشده (BLOCKER-F04) → راهکار جایگزین: IP:port موقت یا رکورد hosts؛ ناموفق‌بودن pull image → deploy.sh بدون هیچ تغییری خارج می‌شود (no-op).
- **وضعیت تأیید:** `PROPOSED` — اجرا پس از فراهم‌شدن VPS (BLOCKER-F02).
