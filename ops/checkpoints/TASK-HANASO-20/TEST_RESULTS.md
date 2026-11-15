# TASK-HANASO-20 — TEST RESULTS (نتایج تست‌ها)

> All runs on `fix/TASK-HANASO-20-onboarding`. Nothing was deleted or weakened to go green — every pre-existing suite still runs; new suites were added; two content-count pins were updated to the deliberate content change (31→32 stations, 29→30 core) with the change itself gated.

## ۱) تست‌های فنی (PHASE 6 — «تست فنی»)

| تست | فرمان | نتیجه |
| --- | --- | --- |
| TypeScript | `pnpm typecheck` | ✅ صفر خطا |
| ESLint | `pnpm lint` | ✅ صفر خطا |
| Unit + Integration (in-memory) | `pnpm test` | ✅ **718/718** (58 فایل) — خط مبنا ۶۹۲؛ ۲۶ تست جدید |
| EQA gates | `pnpm test:eqa` | ✅ 37/37 + صفر waiver فعال |
| Unit جدید | — | ✅ 26: identity (۹) + middleware (۴) + isolation (۶) + tl14 fixtures (۵) + feedback-quality (۵) + rule-card-listen (۳) + 404 (۱) + ... (شمارش در کامیت‌ها) |
| Prerequisite CI | DERIVED-GLYPH-SHOWN + TRANSCRIPT تعمیم‌یافته | ✅ فصل واقعی پاک؛ ۶+۳ fixture تبدیلی سبز |
| Session Isolation | `learner-isolation.spec.ts` | ✅ ۶/۶ |
| Home Smoke | E2E S1 + curl | ✅ 200 + Set-Cookie در اولین پاسخ |

## ۲) E2E مرورگری (PHASE 6 — کاربر جدید/دارندهٔ پیشرفت/آموزشی)

`scripts/hanaso20_e2e.mjs` → **22/22** (شواهد: `screenshots/e2e/` + E2E_RESULTS.json):

- S1 (۵): بازدید اول صادقانه / بدون دادهٔ دیگران / شناسهٔ میدل‌وری / CTA→h0 / ثبت موفق + رفرش.
- S2 (۵): ایزوله‌بودن QA A/B + سوییچ هویت.
- S3 (۴): پنل 409 ساختاریافته + پیام فارسی + لینک h5 + payload.
- S4 (۵): きょう (کیو غلط/کیوو درست)، rationale تفکیکی، chipهای شنیدن، تدریس واقعی k12-foreign، 404 فارسی.
- S5 (۱): صفر خطای کنسول/page (پاسخ‌های عمدی 404/404 تست مستثنی و مستند).

## ۳) Responsive (PHASE 5)

`scripts/hanaso20_responsive.mjs` → **31/31 + صفر خطای JS**:

- ۸ viewport (360/390/430/768/1024/1280/1440/1920) × ۳ مسیر (home/learn/journey): overflowX=۰ همه؛ صفر عنصر سرریز سمت راست.
- ایستگاه‌های h0/h6(کارت مرجع)/k12-foreign در 360+1440.
- سطح نوشتار در 360: **328px داخل قاب** (left=16/right=344) — پوشش ممیزی حفظ شد.

## ۴) آنچه تست نشد (صادقانه)

- PG واقعی: تست‌های E2E روی استورهای in-memory اجرا شدند (`DATABASE_URL` خالی)؛ **`tests/integration-pg`** برای درایو واقعی Postgres موجود است و نیازمند `TEST_DATABASE_URL` به سرور PG است (در این Sandbox در دسترس نبود — اجرا نشد؛ مستند).
- tolerance رسم با دست واقعی/لمسی، کیبورد مجازی، safe-area، landscape فیزیکی، چند-تب همزمان — همان «Not Verified» ممیزی.
- خروجی voicebox برای واژه‌های جدید (ファイル/ティッシュ/ヴァイオリン/پーティー/タクシー/きよう/しや/きや) — نیازمند اجرای VOICEVOX روی VPS مالک (لیست در اسکریپت gen آماده است).

## ۵) Regression چک‌لیست

- responsive 24/24 ممیزی → 31/31 امروز ✓ (پوشش گسترده‌تر)
- صفر خطای کنسول ممیزی → صفر ✓
- 692 unit → 718 ✓ (هیچ تستی حذف/تضعیف نشد؛ دو پین شمارش محتوا به‌روز شد)
- FSRS/Review، مهر AIZEN، Replay، Audio موجود، مسیر Map/Chapter — دست‌نخورده (PHASE 5)؛ شواهد E2E.
