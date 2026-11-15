# TASK-HANASO-28 — CURRENT STATE (CP-2: پیاده‌سازی + E2E کامل — فقط Subagent C باقی است)

**Branch:** `feat/TASK-HANASO-28-aizen-journey-ux` (از TASK27 `daa7c43`) · **Commits:** CP-0 `9c1c666` (ممیزی A/B) · CP-1 `fb9b195` (پیاده‌سازی کامل) · CP-2 `26d67f8` (E2E) — همه Push شده
**Regression:** 819/819 vitest (۷ تست جدید) · tsc ✓ · eslint ✓ · build ✓ — معماری TASK26R/27 دست‌نخورده (فقط لایهٔ نمایش)

## انجام‌شده (خلاصه؛ جزئیات در TASK28_BROWSER_E2E.md و commit messages)
1. **مهر AIZEN:** فریم 224px، ink-ring-expand در لحظهٔ press، halo/ring inset -16%، حذف Speaker از صحنه (Toggle به ردیف پیام)، صدا .opus-first با fallback m4a (CC0 موجود از TASK22).
2. **Journey:** سگمنت دو-تایی، ردیف جاری (چیپ+aria-current+نوار)، auto-scroll یک‌باره با fold-guard و reduced-motion، چیپ دقیقهٔ موبایل، چیپ «ایستگاه واقعی» milestone.
3. **Achievements صادقانه:** شمارش واژه‌های reading از example-set + fingerprint انواع تمرین (صدابه‌شکل / رمزگشایی) — max-3، بدون ادعای Mastery.
4. **Intro:** حذف ارجاع «جزیره‌ای»، اصلاح ۳۴→۳۶+تمرین، خط can-do ملموس (منوی کافه با کاتاکانا = m2 واقعی).
5. **Interaction states:** OptionRow press+verdict رنگ، chunk hovers، لینک‌های گم‌شده، CTA انکر press.
6. **Motion hygiene:** --dur-shake توکن + reduced-motion، spin با توکن، scroll guard. **CSS hygiene:** حذف keyframes مرده، .seigaiha واحد، clamp→توکن.
7. **E2E واقعی:** ۷ شاهد — از جمله Sound فقط در Completion تازه (opus 206) و سکوت بعد از Refresh؛ Responsive×۳ بدون overflow.

## باقی‌مانده (برای پیام بعدی)
- [ ] **Subagent C** — QA مستقل پس از پیاده‌سازی (الزام مأموریت؛ ممیزی کد + تأیید معیارهای §8)
- [ ] تأیید reduced-motion با مرورگر واقعی (emulate) — پوشش کد+unit موجود، شبیه‌سازی مرورگری نشده
- [ ] گزارش TASK28_SUBAGENT_C_QA.md + به‌روزرسانی همین فایل به FINAL + معیار COMPLETE نهایی
- [ ] Note: تست مرورگری بخش writing h8 نیمه‌کاره ماند (شبیه‌سازی ضربه‌ها) — مسیر بحرانی جایگزین (h0 کامل از UI) تأیید شد

## نکتهٔ ادامهٔ کار
سرور standalone ممکن است خاموش باشد؛ الگوی راه‌اندازی در TASK27 CURRENT_STATE (پورت 3100، HANASO_SESSION_SECRET محلی). مرورگر: agent-browser. Working tree تمیز است.
