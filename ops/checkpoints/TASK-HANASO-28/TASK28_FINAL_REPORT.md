# TASK-HANASO-28 — Reduced Motion & Writing h8 Browser Test Report (FINAL)

**Date:** 2026-11-15 · **Server:** standalone build WITH Subagent-C fixes (port 3100) · **Browser:** agent-browser headless real Chromium، `set media reduced-motion` ✓ (`matchMedia` = true) · **Viewports:** 1440×900 + 390×844

## A) Reduced Motion — همه PASS

| مورد | نتیجه | شاهد زنده |
|---|---|---|
| Auto-scroll ردیف جاری | ✅ jump فوری | spy: دقیقاً ۱ call `scrollIntoView({block:'center', behavior:'auto'})` در t=264ms؛ scrollY=1075، ردیف top=400 |
| Shake قفل | ✅ حذف، بازخورد می‌ماند | `animationName:'none'`, `duration:'0s'` + notice دلیل قفل با نام prereq **visible** |
| انیمیشن ورود Feedback | ✅ بی‌حرکت، محتوا فوری | `hanaso-feedback-in` با `duration:0s`، متن «درست!/نادرست» کامل قابل مشاهده |
| Ink Ring / Glow / Halo مهر | ✅ همه collapsed | `inkRingPresent:true` اما `animation:none/0s`؛ هیچ المان seal/ring/halo با duration>0 باقی نماند |
| مهر AIZEN در تکمیل | ✅ محتوای کامل | فریم و پیام موفقیت visible؛ toggle بیرون صحنه |
| تب‌سوییچ بخش | ✅ بدون smooth | `scrollIntoView` دوم با `behavior:'auto'`؛ سکشن+URL عوض شد |
| سلامت تعامل | ✅ | هیچ UI خراب نشد؛ radio/check/auto-next همه کار کردند |

**نتیجهٔ معیار مأموریت:** حرکت غیرضروری حذف/صفر می‌شود؛ بازخوردها و محتوا کامل می‌مانند؛ هیچ تعاملی خراب نمی‌شود؛ تجربه بدون حرکت واضح و قابل‌استفاده است. — **RM01/RM02 screenshots**

## B) Writing ایستگاه h8 (رسم واقعی な) — PASS

ورود از مسیر واقعی: `/learn/.../stn-kana-h8` با Progress واقعی (h0–h4 کامل از UI/API؛ سؤال ورود ふً「ん» پاس شد) → بلوک‌ها تا writing.

| مورد | نتیجه | شاهد |
|---|---|---|
| ورود Writing از مسیر محصول | ✅ | «نا — آمادهای؟» → «شروع تمرین نوشتن» |
| رسم な با تعامل واقعی | ✅ | ۴ ضربه با PointerEvent روی SVG طبق راهنمای نقطه‌چین — status: ۱/۴→۲/۴→۳/۴→**۴/۴ ضربه**، هر ضربه «ضربهٔ درست» |
| نمایش Stroke/وضعیت/Feedback | ✅ | شمارندهٔ فارسی «x / ۴ ضربه»، ضربه‌ها بعد از پذیرش جوهری می‌شوند (استاندارد)، پیام‌های آموزشی نان/بخار |
| Assist-ladder | ✅ | بعد از guided کامل → خودکار «نوشتن از حافظه» (free) با دکمهٔ «با راهنما تمرین می‌کنم» |
| موبایل 390×844 | ✅ | بدون overflow افقی (`scrollWidth ≤ 390`) — W03 |
| دسکتاپ 1440 | ✅ | قلم 416px سالم، بدون بریدگی — W01/W02 |
| خرابی از TASK28 | ❌ هیچ | Writing کاملاً سالم؛ هیچ رگرسیون دیده نشد |

**نکتهٔ روش:** ضربه‌ها با شبیه‌سازی pointer روی نقاط راهنمای KanjiVG (همان مسیر مرجع) زده شد — این دقیقاً ورودی تعاملی واقعی UI است (نه unit test، نه خواندن سورس). ۳ screenshot: W01 (guided)، W02 (free)، W03 (موبایل).

## C) تأیید زندهٔ Fixهای Subagent C در همین Build
- **Fix-1:** ردیف جاری دقیقاً یکی (chip + aria-current) و auto-scroll به همان ردیف.
- **Fix-2:** بعد از پاسخ غلط، re-select گزینهٔ دیگر → feedback قرمز قدیمی فوراً پاک، استایل خنثی انتخاب، دکمهٔ check برمی‌گردد.
