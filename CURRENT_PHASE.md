# فاز جاری (CURRENT_PHASE) — HANASO

**فاز: M0 → گذر به توسعهٔ قابلیت‌ها (B-0 کامل + PoC/Slice ادغام‌شده + نخستین استقرار زنده)** · به‌روزرسانی: 2026-11-01 (سشن سوم) · مسیر canonical: `ROADMAP.md` + KB `implementation-roadmap.md`

## کجا ایستاده‌ایم

- ✅ ریپوی محصول ساخته و Push شد (`hanaso`، private) — محافظت سروری main تلاش شد و در پلن Free قفل است (BLOCKER-F07)؛ کنترل جبرانی: قاعدهٔ AGENTS.md §۶ + بازبینی مستقل هر PR
- ✅ اسکلت اجرایی: Next.js 16.4.3 + TS strict + Tailwind 4.3 + `/api/health` + `/api/ready` — همهٔ دروازه‌های محلی سبز
- ✅ CI workflow + Docker/Caddy/deploy/rollback + طرح Preview — **CI کاملاً سبز (هر دو job) و Image در GHCR**
- ✅ سیستم مدیریت پیشرفت: GitHub Project + Milestones + Issues + Labels
- ✅ حاکمیت چند-Agentی: AGENTS.md + مالکیت ماژول‌ها + DoD + قالب‌های ops
- ✅ گزارش تجمیعی دانش + ADR-000..005 + بازارزیابی Stack (npm registry، ۲۰۲۶-۱۱-۰۱)
- ✅ Spike TypeScript: **پین 6.0.3** (typescript-eslint رسماً <6.1.0؛ تأیید زنده با شکست PR دیپندابات TS7) — جزئیات در `docs/research/STACK-REVALIDATION-2026-11-01.md`
- ✅ **Spikeهای M0-05..08 اجرا و ادغام شدند** (PR #62 → `9ed1ec8`): React Compiler (~۲۴× رندر — فعال‌سازی در M0-09) · RTL Radix (DirectionProvider اجباری؛ بدون flyout موبایل) · فونت‌ها (self-host کامل — اولیه ~۵۸۰KB) · Ruby در RTL (جزیرهٔ LTR + lh≥2 + الگوی FuriganaText)
- ✅ **TASK-DLG-POC-01 تحویل شد** (در PR #64): موتور پخش + قرارداد ADR-018 + صوت + FSRS درون‌بافت + ۴ صفحهٔ /poc — T1/T3/T4/T6/T7 سبز در سطح موتور
- ✅ **اولین Vertical Slice تحویل شد** (PR #64 → `3b652ae`): چرخهٔ A→D کامل + Drizzle دو-شیمایی + نمره‌گذاری سروری مرحلهٔ D + ۹۶/۹۶ تست
- ✅ تصمیم‌های مالک ۲۰۲۶-۱۱-۰۱ در KB ثبت شد (DD-080..083 + ADR-018 + بستن ۵ OQ) + Milestone شخصیت‌ها (#39..52) و صوت (#53..61) در GitHub
- ✅ **نخستین استقرار زنده (سشن سوم، RUN-20261101-03):** Preview روی **https://learn.kotodama.ir** — image `ea701342` از GHCR، Docker ایزوله پشت HAProxy+nginx میزبان مشترک، پروژهٔ قبلی همان آدرس (genesis-learn) به دستور مالک بازنشسته شد، smoke رسمی ALL GREEN — رویه/کپی دقیق: `infra/deploy/learn-kotodama/`
- ⬜ زیرساخت مشترک UI (M0-09) — ورودی‌هایش از اسپایک‌ها آماده است
- ⬜ ادامهٔ M0-10: لایهٔ DB (Postgres/PgBouncer/Worker + بکاپ) — VPS آماده است
- ⬜ درس «Hello» (M0-11) — خروجی فاز M0

## گیت‌های عبور از فاز (۹بندی — متن کامل: KB `task-lifecycle.md` §۸)

تسک‌های ضروری Closed · خودراستی‌آزمایی ثبت‌شده · بازبینی مستقل · S0..S2 حل‌شده · یکپارچگی سبز · مستندات به‌روز · Traceability · هم‌گاهی VPS↔GitHub · شرایط فاز بعد — **گیت OQ-013 باز شد (DD-080)**؛ هم‌گاهی VPS↔GitHub با deploy زندهٔ learn.kotodama.ir فعال شد (KB ADR-015: `/api/health` → `commit`).

## قدم بعدی (واحد)

**TASK-M0-09 (زیرساخت مشترک UI)** — ورودی‌هایش کامل است: tokens (DD-067) + الگوی FuriganaText (Spike M0-08) + DirectionProvider RTL (Spike M0-06) + فونت‌های self-host (Spike M0-07) + فعال‌سازی React Compiler (Spike M0-05). هم‌زمان: اتصال DB واقعی (ادامهٔ M0-10 — VPS در دسترس است) و تکمیل بدهی‌های S3 ثبت‌شده.
