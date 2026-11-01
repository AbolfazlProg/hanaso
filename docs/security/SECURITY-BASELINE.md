# Security Baseline — HANASO

> **خلاصهٔ فارسی:** مرجع کامل امنیت در KB است (`security-architecture.md`)؛ اینجا خط‌پای الزامی این ریپو جمع شده — مهم‌ترین‌ها: هیچ Secret در ریپو، env فقط با نام متغیر، مجوزها فقط Backend، دسترسی ادمین با MFA و Audit.

## Secret policy (الزام مأموریت §۰.۳)

- توکن/کلید/رمز **هرگز** در فایل‌ها، پیام‌های commit، لاگ‌ها، گزارش‌ها و Issueها نیست — `.env*` در `.gitignore`؛ فقط `.env.example` با نام متغیر و مقدار نمونهٔ غیرمحرمانه.
- اعتبارنامهٔ push از مالک فقط در عملیات استفاده شد و در هیچ جای ریپو ثبت نشده است؛ **توصیهٔ ثبت‌شده:** جایگزینی با PAT دانه‌ریست با حداقل دسترسی (repo/project/workflow) — Issue مالک باز است.
- اسکن Secret بخشی از `pnpm verify` است (الگوی توکن‌ها) + `pnpm audit --prod` در CI (شکست روی high/critical).

## Hard rules (از KB security-architecture — اجرا از M1 به‌موعد)

1. احراز/مجوز **داخل** هر Server Action/Handler (نه فقط در layout).
2. آرگومان‌های ورودی همه‌جا zod `safeParse`؛ fail-closed.
3. پاسخ‌های خطا جزئیات داخلی لو نمی‌دهند (فقط Envelope کد+پیام).
4. CSP با nonce + `strict-dynamic` (هرگز `unsafe-inline`)؛ هدرهای امنیتی در Caddy.
5. Rate-limit سه‌لایه (لایهٔ ۱ طبق OTD-005 عمداً حذف شده در MVP).
6. کوکی‌ها httpOnly+Secure؛ `__Host-` prefix (⚠️ هنگام پیاده‌سازی better-auth بررسی شود).
7. مجوزهای Admin فقط Backend + MFA + audit (ADR-017).
8. رویدادهای تحلیلی: PII ممنوع (لیست سیاه CI).

## گزارش آسیب‌پذیری

ریپو private است؛ گزارش‌ها از طریق Issue با لیبل `security` (فقط مالک می‌بیند) یا کانال خصوصی مالک. هیچ اطلاعات حساس در Issueهای عمومی — ریپو از ابتدا private است.
