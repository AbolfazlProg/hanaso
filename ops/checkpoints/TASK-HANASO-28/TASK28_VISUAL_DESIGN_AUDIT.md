# TASK-HANASO-28 — Subagent A: Visual Design Audit (AIZEN)

**Auditor:** Subagent A (read-only) · **Branch:** `feat/TASK-HANASO-28-aizen-journey-ux` @ `daa7c43` · **Date:** 2026-11-15
**وضعیت:** گزارش صرفاً ممیزی است؛ Main Agent مسئول پیاده‌سازی است (این فایل توسط A نوشته نشده — بازنشر گزارش A).

## Part 1: CURRENT STATE (خلاصهٔ واقعی کد)

### توکن‌ها و تم
- `apps/web/src/styles/tokens.css` — Tailwind 4 `@theme` بدون tailwind.config. رنگ‌ها: `--color-paper #faf7ef`, `--color-indigo #173049`, `--color-shu #c2401c` (vermilion), ink/success/error/warning کامل (خط ۲۸–۷۷). Radius چاپی تیز ۲/۳/۴px (۱۱۵–۱۱۸). سایه‌های hard-offset امضای Aizen (۱۲۴–۱۳۰)؛ glow رنگی ممنوع (۱۳۱). Motion tokens: `--dur-micro/fast/phase/ceremonial/spin` که همه زیر reduced-motion صفر می‌شوند (۱۸۱–۲۰۵). فونت‌ها: Vazirmatn FD (fa), Zen Kaku Gothic New (ja-ui), Noto Serif JP VF (ja-serif) — self-host با next/font/local.
- **بافت واشی:** فقط SVG seigaiha روی `.band-indigo` (globals.css:30–46) + کپی تکراری `SEIGAIHA_URL` در section-journey.tsx:174–175. بدنهٔ صفحه تخت است.

### AIZEN Seal (aizen-seal.tsx + globals.css:356–472)
- SVG ۱۲۰×۱۲۰ قطعی (disc vermilion + حلقهٔ حکاکی + tategaki 藍染 + ink-skip + feTurbulence grain). کریوگرافی: stamp drop با rotate/scale/squash (1520ms) + halo (1720ms) + چرخش حلقهٔ dashed + shimmer ×2. انیمیشن فقط روی `freshCompletion` (station-runner.tsx:372–379). Reduced-motion → fade ساده.
- **رندر:** station-runner.tsx:1194–1197 — فریم `size-40 p-2 md:size-44` (~144/160px) با `<SealSoundToggle/>` روی گوشهٔ پایین مهر (Volume2/VolumeX size-8) — **آلودگی ترکیب‌بندی مراسم**.
- صدای مهر: `new Audio('/audio/sfx/aizen-stamp.m4a')` در 600ms، mute با localStorage — اما فقط m4a بدون opus fallback و دور از ماژول صوتی پروژه.

### کامپوننت‌ها (نکات کلیدی)
- section-journey.tsx: ۱۳ نوع محتوا → lucide icons (118–132)، سمت راست = هویت محتوا (قفل‌شده هم آیکون نوع را dashed نگه می‌دارد 160–163)، چپ = marker دسترسی. shake+flash+notice با نام prereq (236–244).
- journey-home.tsx: RSC، `max-w-3xl`، progressbar صادقانه، CTA hard-offset.
- mastery-gate.tsx: radiogroup با حالت‌ها؛ دکمهٔ submit با aria-busy+Loader2 (432–437) اما `animate-spin` خام — بی‌احترام به `--dur-spin` و reduced-motion.
- exercise-session.tsx: OptionRow با default/hover/selected/eliminated/disabled (1104–1121)؛ reading در `text-[clamp(2.75rem,11vw,4rem)]` خام (۹۱۷) — نقض قانون فقط-توکن.
- chapter-locked-notice.tsx:30–35: Link بدون hover/focus-visible.

### انیمیشن‌ها
- Keyframes موجود: hanaso-fade-in/out (**fade-out مرده**)، hanaso-feedback-in، hanaso-locked-shake/flash، pulse-ring (**مرده**)، kana-ink-in (+stagger)، ink-shimmer-pulse، ۴ کی‌فریم مهر.
- `.locked-shake/flash` مدت hardcoded (320/900ms) — **پایین reduced-motion نمی‌روند** با وجود کامنت (globals.css:146–182).

## Part 2: GAP ANALYSIS (در برابر اهداف TASK28)
1. اندازهٔ مهر متوسط است؛ halo/ring داخل فریم کلیپ می‌شوند.
2. دکمهٔ Speaker روی صحنهٔ مهر — باید حذف/جابه‌جا شود.
3. صدا: بدون opus fallback، دور از قرارداد دو-فرمتی.
4. نقض motion-contract: locked-shake/flash و animate-spin.
5. Keyframes مرده + seigaiha تکراری + `.seal-round` تنها در poc/ui.
6. گپ‌های State: گزینه‌های تمرین بعد از تصحیح رنگ نمی‌گیرند؛ chunk buttons بدون hover؛ لینک chapter-locked بدون hover؛ CTA انکر بدون active-press.
7. کیفیت AIZEN: بدون grain کاغذی، مقادیر clamp خام.

## Part 3: توصیه‌ها (رتبه‌بندی)
- **R1 (بالا):** فریم مهر `size-48 p-2 md:size-56`؛ انتقال SealSoundToggle از صحنهٔ مهر به ردیف CTA/تنظیمات؛ inset halo/ring → `-16%`؛ افزودن `@keyframes aizen-seal-ink-ring-expand` (scale 0.72→1.28 + fade در لحظهٔ press 42%، 420ms).
- **R2 (بالا، کوچک):** مسیر دادن locked-shake/flash از توکن (`--dur-shake`) + reduced-motion override؛ جایگزینی animate-spin با `motion-safe:animate-[spin_var(--dur-spin)_linear_infinite]`.
- **R3 (متوسط):** صدا با fallback opus یا عبور از client-cache؛ حفظ 600ms press-sync و mute.
- **R4 (متوسط):** ماتریس State: OptionRow `active:scale-[0.99]` + border success/error بعد از تصحیح؛ chunk buttons `hover:border-ai`؛ لینک‌های گم‌شده hover/focus-visible؛ CTA انکر `active:translate-y-px`.
- **R5 (متوسط):** حذف keyframes مرده؛ استخراج seigaiha در یک utility؛ تبدیل clamp خام به توکن (مثلاً `--text-glyph-display`).
- **R6 (اختیاری):** grain کاغذی بسیار ظریف (SVG noise 2–3% opacity) روی سطوح paper.
- **Watch-outs:** رنگ runtime جدید باید در بلوک `:root` تکراری mirror شود (151–166)؛ transform استاتیک `-8deg` مهر با wrapper باید compose شود نه override؛ idempotency مهر (فقط fresh completion) باید حفظ شود.

*(گزارش کامل با تمام file:line citations در hand-back ثبت شده و مبنای پیاده‌سازی CP-1 است.)*
