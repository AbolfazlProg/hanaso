# CH02-B4 — checkpoint (2026-11-28)

## وضعیت نهایی

- **LIVE:** `https://hanaso.ir/api/health` → `commit:"e320174213ac4af5ac0d781681eaea5481f5dae3"` (از 2026-11-28T13:31Z).
  هدف rollback: `69a58a6e` (B3). بکاپ pre-deploy: `/root/hanaso-backups/db-pre-b4-20261128T120823Z.sql` (1.6M) + `.env.pre-b4`.
- **main:** PR #213 (squash `e3201742`) — CI کاملاً سبز روی شاخه و main (شامل build ایمیج GHCR tag=SHA).
- **مأموریت فصل ۰۲ کامل شد:** هر ۲۳ ایستگاه `first-meeting-01` با استاندارد B1–B4 تمیز؛ **صفر معافیت EQA برای fm01** (۸ معافیت در B4 بازنشسته شد).
- قوانین تازهٔ دائمی: **R16** (تدرج درون‌بلوکی — contract suite) + **E1** (موقعیت رویدادهای سنجش؛ رگرسیون در eqa-gates).
- دفترهای بدهی فریز باقی‌مانده (خارج از دامنهٔ این مأموریت): دو فصل کانا — R15 (۱۱+۱۲۱ نشت تألیفی) + R16 (۲۹ برگشت سختی در kana-foundation-01).
- شواهد: `ops/checkpoints/CH02-B4/{evidence,evidence-prod}` (GitHub) + `/root/ch02-b4-evidence/` (VPS).
- رکورد مأموریت: `ops/runs/RUN-20261128-02-CH02-B4.md`.

## ابزار QC (بازاستفاده در دسته‌های بعدی)

- `scripts/b3-qc/b4-walk.py` / `b4-walk-prod.py` — گشت مرورگر با پشتیبانی writing-practice (ترسیم medians روی بوم).
- `scripts/b3-qc/b4-unlock*.ts` (لوکال/پرود، دو دامنه) · `b4-answerkey.ts` (۱۱–۲۳) · `b4-ladder.ts` (راستی‌آزمایی F1/F2).
- الگوی استقرار: `deploy-transport` repo + `/root/deploy-b4.sh` (قطعات ۳۰MB، Range/resume).
- نکتهٔ عملیاتی تکرارشده از B3: اندازهٔ فایل‌های کوچک را از `wc -c` واقعی بخوان (این‌بار archive.sha256=۹۹ بایت، نه ۹۱ — حلقه گیر کرد و با sed + rerun از روی قطعات کش‌شده ارزان رفع شد).

## حساب‌های evidence (برای بازبینی/پاک‌سازی مالک)

- پروداکشن: `qc_prod_b4_desk` / `qc_prod_b4_mob` / `qc_prod_b4_desk2`
- لوکال (سندباکس، بی‌اثر بر پروداکشن): `qc_b4_desk` / `qc_b4_desk2` / `qc_b4_mob`
