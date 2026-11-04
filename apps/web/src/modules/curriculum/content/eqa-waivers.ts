/**
 * HANASO — EQA waivers for bundled chapters (TASK-LEARNING-04, Issue #97).
 *
 * A waiver is an EXPLICIT, issue-linked, dated registration of a KNOWN pedagogical
 * violation in shipped content that is scheduled to be fixed in a later content
 * mission. It keeps CI green while making it impossible to add NEW violations
 * silently: every waived finding is printed in every EQA report, and a waiver
 * whose finding no longer exists is itself an error (no waiver rot).
 *
 * Rules:
 *  - A waiver must reference a GitHub issue (evidence + tracking).
 *  - A waiver must name the mission that will remove it (resolvedBy).
 *  - Removing the finding without removing the waiver fails CI (stale waiver).
 *  - Adding a NEW violation without a waiver fails CI.
 */
import type { EqaWaiver } from '../eqa/waivers';

export const EQA_WAIVERS: EqaWaiver[] = [
  /* ---------------- Chapter first-meeting-01 — TASK-LEARNING-05 will rebuild these ---------------- */
  {
    key: 'EQA-1:ex-fm01-v1-01:line-grammar-not-taught',
    issue: 96,
    reason:
      'تمرین audio-meaning اول ایستگاه واژگان، درک جملهٔ L8 (だいがくの せんせいです) را می‌سنجد در حالی که AはBです در ایستگاه ۳ تدریس می‌شود و ذرهٔ の در کل فصل تدریس نمی‌شود — ثبت‌شده در LEARNING_EXPERIENCE_AUDIT §۲ (ردیف ۱۱) و ISSUE_REGISTER.',
    resolvedBy: 'TASK-LEARNING-05 (بازنویسی تمرین‌های واژگان به سطح واژه طبق 13-06 §۴-۲)',
    registeredAt: '2026-11-04',
    chapter: 'first-meeting-01',
  },
  {
    key: 'EQA-1:ex-fm01-v1-02:line-grammar-not-taught',
    issue: 96,
    reason: 'همان الگو با جملهٔ L3 (わたしは にほんじんです) — سنجش ساختار آموزش‌نداده (は/です) در ایستگاه واژگان.',
    resolvedBy: 'TASK-LEARNING-05 (بازنویسی تمرین‌های واژگان به سطح واژه طبق 13-06 §۴-۲)',
    registeredAt: '2026-11-04',
    chapter: 'first-meeting-01',
  },
  {
    key: 'EQA-2:stn-fm01-02-vocab:S-3-alternation',
    issue: 95,
    reason:
      'الگوی ممنوع «همهٔ کارت‌ها سپس همهٔ تمرین‌ها»: صحنه + ۸ کارت واژه پیاپی + تمرین در پایان — نقض مستقیم DD-94 §۳-۱/۳-۲؛ گزارش مالک (۹۰ دقیقه گیرکردن) دقیقاً همین‌جا رخ داد.',
    resolvedBy: 'TASK-LEARNING-05 (پکت‌بندی ۲–۳ کارتی + بازیابی درون‌پکتی طبق LEARNING_SEQUENCE_POLICY)',
    registeredAt: '2026-11-04',
    chapter: 'first-meeting-01',
  },
  {
    key: 'EQA-2:stn-fm01-06-expression:S-3-alternation',
    issue: 95,
    reason:
      'یافتهٔ جدید گیت (نمونهٔ دوم همان کلاس خطا): ایستگاه عبارات هم الگوی «۴ کارت عبارت پیاپی سپس تمرین» دارد؛ DD-94 §۳-۱ برای عبارات «کارت موقعیتی → انتخاب موقعیت → کارت بعدی» تجویز می‌کند.',
    resolvedBy: 'TASK-LEARNING-05 (تناوب کارت/انتخاب طبق LEARNING_SEQUENCE_POLICY)',
    registeredAt: '2026-11-04',
    chapter: 'first-meeting-01',
  },
  {
    key: 'EQA-3:practice-pool:recall-first-share',
    issue: 106,
    reason:
      'استخر practice فصل ۱۵/۳۳ آیتم recall-first است (۴۵٫۵٪ < ۶۰٪) — ترکیب جلسه به تشخیص آسان انحراف دارد؛ با طبقه‌بندی بستهٔ انواع (exercise-design §۱ + QUESTION §۳) محاسبه شده.',
    resolvedBy: 'TASK-LEARNING-05 (بازطراحی ترکیب تمرین‌ها — افزایش اقلام cloze/word-order/produce/درک شنیداری)',
    registeredAt: '2026-11-04',
    chapter: 'first-meeting-01',
  },
  {
    key: 'EQA-6:voc-watashi:slot-missing',
    issue: 104,
    reason:
      'کارت اول فصل (watashi) بدون noteFa و با معنی تک‌کلمه‌ای «من» — قالب کارت پیش از قرارداد §۲-۲ تألیف شده بود؛ گزارش مالک (کارت «خالی»).',
    resolvedBy: 'TASK-LEARNING-05 (تکمیل اسلات‌های §۲-۲ همهٔ کارت‌ها)',
    registeredAt: '2026-11-04',
    chapter: 'first-meeting-01',
  },
  {
    key: 'EQA-6:voc-daigaku:slot-missing',
    issue: 104,
    reason:
      'یافتهٔ جدید گیت (نمونهٔ دوم همان کلاس #104): کارت daigaku نیز بدون noteFa است — ممیزی انسانی TASK-LEARNING-03 فقط watashi را دیده بود؛ گیت ماشینی هر دو را گرفت.',
    resolvedBy: 'TASK-LEARNING-05 (تکمیل اسلات‌های §۲-۲ همهٔ کارت‌ها)',
    registeredAt: '2026-11-04',
    chapter: 'first-meeting-01',
  },
];
