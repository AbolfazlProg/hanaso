# TASK-HANASO-28 — Subagent C — Independent Final QA Report

**Date:** 2026-11-15 · **Scope:** فقط TASK28 (پیاده‌سازی commit `fb9b195` + E2E `26d67f8`) · **روش:** بررسی مستقیم کد واقعی (نه تأیید گزارش A/B) · **Verdict: PASS-WITH-NOTES** — 0 Blocker، 2 Major (هر دو در همین نشست اصلاح و تست شدند)، چند Minor.

## روش

ممیزی مستقل فایل‌های واقعی پیاده‌سازی TASK28: `section-journey.tsx`، `exercise-session.tsx`، `journey-home.tsx`، `aizen-seal.tsx`، `station-runner.tsx`، `journey.ts`، `globals.css`/`tokens.css` + تست‌ها. هر ادعا با شواهد فایل/خط.

## یافته‌های Major (هر دو اصلاح شدند)

### M1 — heuristics ردیف جاری به‌جای slug دقیق (Fixed)

- **شاهد:** `section-journey.tsx:433` (پیش از اصلاح): `isCurrent = section.isFocus && (row.action === 'start' || row.action === 'continue')`
- **مشکل واقعی:** ایستگاه اختیاریِ available در Section دارای isFocus (مثل `stn-kana-opt-r-h9` با prereq فقط h9، یا opt-drill در Section B) هم chip «ایستگاه فعلی» + `aria-current` می‌گرفت؛ با چند تطبیق، ref اسکرول یک‌باره روی آخرین تطبیق (ایستگاه اختیاری) می‌نشست — mis-target واقعی.
- **اصلاح:** تطبیق دقیق slug سرور (`nextStation` از `resolveLearnerJourney`/API): prop جدید `nextStationSlug` به `SectionJourney` + state زنده با merge از refresh تب‌focus. (`section-journey.tsx:107-115, 215-229, 268-292, 461`)
- **تست:** C1a (تک ردیف chip+aria-current، optional برنده نمی‌شود)، C1b (بدون slug → هیچ ردیفی current)، C1c (پس از refresh زنده، نشانه به frontier جدید می‌رود، همچنان دقیقاً یکی).

### M2 — verdict قرمز کهنه روی انتخاب مجدد بعد از نمرهٔ غلط (Fixed)

- **شاهد:** `exercise-session.tsx:780-781` (پیش از اصلاح): `onSelect={setSelected}` + `verdict={feedback ? (correct? … : 'incorrect') : null}` و `feedback` فقط با retry پاک می‌شد.
- **مشکل واقعی:** بعد از پاسخ غلط، انتخاب مستقیم گزینهٔ جدید → همان verdict `incorrect` قدیمی فوراً گزینهٔ جدید را قرمز می‌کرد (سیگنال «غلط» قبل از تصحیح) و چون دکمهٔ check مخفی feedback بود، مسیر عملاً بن‌بست بود.
- **اصلاح:** در onSelect: پاک کردن feedback + bump `attemptNo` (هم‌ارز دکمهٔ retry، سقف 3) + پاک کردن hint (انضباط BUG-023). `exercise-session.tsx:774-796`
- **تست:** C2a (feedback panel حذف + استایل خنثی `border-ai` روی انتخاب جدید)، C2b (re-submit با `attemptNo:2` در payload واقعی).
- **تأیید مرورگر واقعی:** سؤال ۳ از h5: پاسخ غلط → قرمز؛ re-select す → `feedbackGone:true`، `isNeutralSelected:true`، دکمهٔ «بررسی پاسخ» برگشت.

## سایر دامنهٔ QA — همه PASS (بدون تغییر کد)

- **AIZEN Seal:** فریم 224px، ink-ring فقط در مراسم (`data-aizen-seal-ink-ring` در animate، غایب در settled)، sound toggle بیرون صحنه — S7 موجود.
- **Sound:** فقط completion تازه (E2E قبلی: opus 206 دقیقاً یک‌بار؛ refresh بدون پخش) — کد gate همان است، دست‌نخورده.
- **Achievements:** `lessonAchievementsOf` — واژه‌های reading واقعی از example-set، fingerprint نوع تمرین، max-3، بدون «مسلط» (A1–A5).
- **Chapter Intro/Lesson Completion:** copy اصلاح‌شده (۳۶+تمرین)، بدون ارجاع مرده — در E2E قبلی + این نشست دیده شد.
- **Lesson Icons/Lock:** ContentTypeTile راست + قفل چپ، shake+دلیل با نام prereq (تأیید مجدد زیر reduced-motion: `animationName:none` + notice visible).
- **Section Nav/Auto-scroll:** سگمنت دوتایی + یک‌باره (spy نشان داد دقیقاً ۱ call `block:'center'`).
- **Interaction States:** press/verdict/hover طبق TASK26R/27 حفظ شد.
- **Responsive/A11y:** aria-current/aria-selected/role=tab باقی؛ 390 بدون overflow (W03).
- **حفظ TASK26R/27:** فقط لایهٔ نمایش؛ هیچ تغییری در walk/gating/progress نیست (819 تست قبلی همه سبز ماندند).

## Minor (غیرمسدودکننده، ثبت‌شده)

1. در `makeSection` تست‌ها payload صفحهٔ journey refresh هنوز `contentKind`/`blockedByTitlesFa` ندارد — merge سمت client این‌ها را نگه می‌دارد (رفتار درست، فقط یادداشت قرارداد).
2. `retry` در attempt 3 همچنان قابل کلیک است و `Math.min(3,…)` نگه می‌دارد — رفتار از قبل موجود و عمدی (سرور همیشه level 3 با reveal برمی‌گرداند)؛ re-select جدید همین انضباط را به ارث برد.
3. کش مرورگر audio باعث می‌شود درخواست‌های repeat در network log دیده نشوند — برای QA آینده از performance entries استفاده شد.

## Regression پس از اصلاح‌ها

- تست‌های جدید: ۵ (C1a–c، C2a–b) → فایل TASK28: **۱۲/۱۲ PASS**
- Regression کامل: **824/824 PASS** (۸۱۹ قبلی + ۵ جدید) — هیچ regression از fixها
- `tsc --noEmit` ✓ · `eslint` (۴ فایل تغییریافته) ✓ · `next build` standalone ✓

**نتیجه: PASS-WITH-NOTES — TASK28 از نظر QA مستقل پذیرفته شد.**
