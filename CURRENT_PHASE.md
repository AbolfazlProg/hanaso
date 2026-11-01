# فاز جاری (CURRENT_PHASE) — HANASO

**فاز: M0 — Bootstrap & Foundation** · به‌روزرسانی: 2026-11-01 · مسیر canonical: `ROADMAP.md` + KB `implementation-roadmap.md`

## کجا ایستاده‌ایم

- ✅ ریپوی محصول ساخته و Push شد (`hanaso`، private، main محافظت‌شده، PR-only)
- ✅ اسکلت اجرایی: Next.js 16.4.3 + TS strict + Tailwind 4.3 + `/api/health` + `/api/ready` — همهٔ دروازه‌های محلی سبز
- ✅ CI workflow + Docker/Caddy/deploy/rollback + طرح Preview
- ✅ سیستم مدیریت پیشرفت: GitHub Project + Milestones + Issues + Labels
- ✅ حاکمیت چند-Agentی: AGENTS.md + مالکیت ماژول‌ها + DoD + قالب‌های ops
- ✅ گزارش تجمیعی دانش + ADR-000..005 + بازارزیابی Stack (npm registry، ۲۰۲۶-۱۱-۰۱)
- ⏳ Spike TypeScript 7.0.2: **نتیجهٔ واقعی ثبت شد** — جزئیات در `docs/research/STACK-REVALIDATION-2026-11-01.md`
- ⬜ Spikeهای M0-05..08 (اولین تسک توسعه — Issue «B-0 Spikes»)
- ⬜ زیرساخت مشترک UI (M0-09) — پس از اسپایک‌ها
- ⬜ استقرار Preview روی VPS (M0-10) — **نیازمند دسترسی مالک**
- ⬜ درس «Hello» (M0-11) — خروجی فاز

## گیت‌های عبور از فاز (۹بندی — متن کامل: KB `task-lifecycle.md` §۸)

تسک‌های ضروری Closed · خودراستی‌آزمایی ثبت‌شده · بازبینی مستقل · S0..S2 حل‌شده · یکپارچگی سبز · مستندات به‌روز · Traceability · هم‌گاهی VPS↔GitHub · شرایط فاز بعد (گیت مالک OQ-013 برای شروع قابلیت‌های M1).

## قدم بعدی (واحد)

**اجرای Spikeهای M0-05..08** (React Compiler · RTL-audit شادکن · فونت از ایران · ruby در RTL) — مشخصات کامل در Issue متناظر و `ops/NEXT_ACTIONS.md`.
