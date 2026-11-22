/**
 * HANASO — EQA waivers for bundled chapters (TASK-LEARNING-04 + ENGINE-REFORM 2026-11-22).
 *
 * A waiver is an EXPLICIT, issue-linked, dated registration of a KNOWN pedagogical
 * violation in shipped content that is scheduled to be fixed in a later content
 * mission. It keeps CI green while making it impossible to add NEW violations
 * silently: every waived finding is printed in every EQA report, and a waiver
 * whose finding no longer exists is itself an error (no waiver rot).
 *
 * ENGINE-REFORM 2026-11-22: the new gates EQA-8 (course-wide prerequisites over
 * the Knowledge Registry) and EQA-10 (station teaching contracts) made the course's
 * systemic staged-teaching debt MACHINE-VISIBLE for the first time. The three
 * pilot stations of kana-expansion-01 (stn-kana-hd1, stn-kana-hy1, stn-kana-kx1)
 * were rebuilt to the new standard and are CLEAN. Everything below is the
 * pre-existing debt of the OTHER stations/chapters — registered under issue
 * #158 (the staged-teaching content rebuild mission), NOT silently accepted:
 * each row is printed in every CI report until its content mission removes it.
 * Adding a NEW violation without a waiver fails CI.
 */
import type { EqaWaiver } from '../eqa/waivers';

export const EQA_WAIVERS: EqaWaiver[] = [
  {
    key: 'EQA-8:stn-kana-h1:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-h2:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-h3:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-h4:kanji-unregistered',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'کانجیِ ثبت‌نشده در متن سنجش/راهنما استفاده شده — در بازسازی محتوا حذف یا با ثبت رجیستری/گلاوس همراه می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-p1:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-h7:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-h8:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-h11:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-h12:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-k1:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-k2:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-k3:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-k4:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-k5:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-k6:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-k6:mark-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'این سطحِ محتوا پیش از ایستگاهِ تدریس‌کنندهٔ قاعدهٔ نگارشی از آن نشانه استفاده می‌کند — زمان‌بندی قاعده در بازسازی محتوای ایستگاه اصلاح می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-k7:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-k9:glyph-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'بازخورد/راهنمای این ایستگاه کانای آموزش‌نداده‌ی آینده را نام می‌برد (نکتهٔ تمایز) — بدهی قدیمی الگوی «قاطی‌پذیر را با نشانهٔ آینده معرفی کن»؛ در بازسازی محتوا حذف یا با معادل فارسی جایگزین می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-k12:mark-untaught',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'این سطحِ محتوا پیش از ایستگاهِ تدریس‌کنندهٔ قاعدهٔ نگارشی از آن نشانه استفاده می‌کند — زمان‌بندی قاعده در بازسازی محتوای ایستگاه اصلاح می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-h1:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-h4:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-h5:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-h7:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-h7:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-h11:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-h12:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-h15:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-p4:C-guided-first',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'آیتم difficulty-3 (مستقل) پیش از هر سنجش هدایت‌شدهٔ همان مفهوم می‌آید — در بازسازی، پلهٔ هدایت‌شده (≤d2) قبل از آن ثبت می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-m1-reading:C-guided-first',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'آیتم difficulty-3 (مستقل) پیش از هر سنجش هدایت‌شدهٔ همان مفهوم می‌آید — در بازسازی، پلهٔ هدایت‌شده (≤d2) قبل از آن ثبت می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-k6:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-k8:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-k12-foreign:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-kana-hy2:kanji-unregistered',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'کانجیِ ثبت‌نشده در متن سنجش/راهنما استفاده شده — در بازسازی محتوا حذف یا با ثبت رجیستری/گلاوس همراه می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-hd3:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-hd3:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-hd4:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-hd4:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-hy2:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-hy2:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-hy3:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-hy3:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-hy4:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-hy4:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-kd2:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-kd2:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-kd3:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-kd3:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-kd4:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-kd4:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-kp1:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-kp1:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-ky2:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-ky2:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-ky3:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-ky3:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-ky4:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-kana-ky4:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'kana-foundation-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-8:stn-fm01-10-reconnect:graded-block-unlabelled',
    registeredAt: '2026-11-22',
    chapter: 'first-meeting-01',
    issue: 162,
    reason:
      'پرسش پیش‌بینیِ نمره‌دار این ایستگاه (حدس پیش از شنیدن) هنوز بدون برچسب assessesConcepts است — دامنهٔ مأموریت هشت درس اول (۱–۸) است؛ بازسازی واحد دوم طبق استاندارد آموزش-مقدم-بر-سنجش در مأموریت پیگیری ثبت شده است.',
    resolvedBy: 'TASK-LEARNING-16',
  },
  {
    key: 'EQA-8:stn-fm01-12-grammar-mo:graded-block-unlabelled',
    registeredAt: '2026-11-22',
    chapter: 'first-meeting-01',
    issue: 162,
    reason:
      'کشف هدایت‌شدهٔ این ایستگاه (سنجش پیش از تدریس قاعدهٔ も) بدون برچسب assessesConcepts است — دامنهٔ مأموریت هشت درس اول (۱–۸) است؛ بازسازی واحد دوم در مأموریت پیگیری ثبت شده است.',
    resolvedBy: 'TASK-LEARNING-16',
  },
  {
    key: 'EQA-8:stn-fm01-13-grammar-dewa:graded-block-unlabelled',
    registeredAt: '2026-11-22',
    chapter: 'first-meeting-01',
    issue: 162,
    reason:
      'کشف هدایت‌شدهٔ این ایستگاه (سنجش پیش از تدریس ではありません) بدون برچسب assessesConcepts است — دامنهٔ مأموریت هشت درس اول (۱–۸) است؛ بازسازی واحد دوم در مأموریت پیگیری ثبت شده است.',
    resolvedBy: 'TASK-LEARNING-16',
  },
  {
    key: 'EQA-8:stn-fm01-16-grammar-kara:graded-block-unlabelled',
    registeredAt: '2026-11-22',
    chapter: 'first-meeting-01',
    issue: 162,
    reason:
      'کشف هدایت‌شدهٔ این ایستگاه (سنجش پیش از تدریس 〜から きました) بدون برچسب assessesConcepts است — دامنهٔ مأموریت هشت درس اول (۱–۸) است؛ بازسازی واحد دوم در مأموریت پیگیری ثبت شده است.',
    resolvedBy: 'TASK-LEARNING-16',
  },
  {
    key: 'EQA-10:stn-fm01-11-vocab2:C-worked-before-decode',
    registeredAt: '2026-11-22',
    chapter: 'first-meeting-01',
    issue: 158,
    reason:
      'اولین تمرین رمزگشایی این ایستگاه پیش از هر نمونهٔ الگو‌شده (example-set/board) می‌آید — در بازسازی، لحظهٔ خواندنِ الگو‌شده پیش از تمرین قرار می‌گیرد.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-fm01-13-grammar-dewa:C-guided-first',
    registeredAt: '2026-11-22',
    chapter: 'first-meeting-01',
    issue: 158,
    reason:
      'آیتم difficulty-3 (مستقل) پیش از هر سنجش هدایت‌شدهٔ همان مفهوم می‌آید — در بازسازی، پلهٔ هدایت‌شده (≤d2) قبل از آن ثبت می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-fm01-14-expression:C-first-engage',
    registeredAt: '2026-11-22',
    chapter: 'first-meeting-01',
    issue: 158,
    reason:
      'اولین تمرینِ پس از پکت کارت این ایستگاه difficulty 1 نیست (الگوی سیستمی «آموزش→آزمون d2») — در بازسازی مرحله‌ای محتوا، درگیرسازی ساده بلافاصله پس از هر پکت افزوده می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
  {
    key: 'EQA-10:stn-fm01-17-practice:C-guided-first',
    registeredAt: '2026-11-22',
    chapter: 'first-meeting-01',
    issue: 158,
    reason:
      'آیتم difficulty-3 (مستقل) پیش از هر سنجش هدایت‌شدهٔ همان مفهوم می‌آید — در بازسازی، پلهٔ هدایت‌شده (≤d2) قبل از آن ثبت می‌شود.',
    resolvedBy: 'TASK-LEARNING-15',
  },
];
