# Domain Model Essentials — HANASO

> **خلاصهٔ فارسی:** هستهٔ دامنه حول مدل A→B→C·D و تمایز حیاتی `completed` (مراحل طی شده) در برابر `understood` (فهم اثبات‌شده) بنا شده — این تمایز در DB، API، Analytics و پنل مالک قابل‌مشاهده است. مرجع کامل: KB `dialogue-based-learning-model.md` + `dialogue-mastery-model.md` + `dialogue-content-schema.md`.

## Core aggregates

- **Curriculum:** Course → Unit → Lesson (anchor `dialogue_id`, `unit_stage`) → LessonSections (B0..B9, `line_refs[]`) → LessonItems (polymorphic: vocab/kanji/grammar, `source_dialogue_line_id`).
- **Dialogue:** Dialogue → DialogueLines (speaker, gap, emotion, decision_point) + Characters (voice, color) + Scenes; ComprehensionBanks جدا از ExerciseBanks (جلوگیری از نشت پاسخ).
- **Learning items:** VocabItem / KanjiItem / GrammarPoint با `first_seen_line_id` (اتصال به دیالوگ مبدأ).
- **FSRS:** یک LearningItem = یک card (DD-020)؛ `fsrs_cards` + `fsrs_revlog` (append-only، snapshot کامل قبل از هر review) + `user_fsrs_weights`.
- **Mastery:** `dialogue_mastery_attempts` (revision-bound، scores M1..M5، weak_points، outcome: passed/remediate/incomplete).

## `completed` vs `understood` (binding contract)

|              | completed                                           | understood                                                                                                       |
| ------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| معنا         | کاربر مراحل لازم درس (B) را طی کرده                 | کاربر معیار قابل‌اندازه‌گیری فهم دیالوگ (D) را گذرانده                                                           |
| تنظیم‌کننده  | پیشروی درس/بخش‌ها                                   | فقط نتیجهٔ آزمون فهم مرحلهٔ D                                                                                    |
| در DB        | `lesson_progress.unit_stage` + `lesson_completions` | `unit status = 'understood'` از `dialogue_mastery_attempts.outcome='passed'`                                     |
| در API       | endpoints پیشروی                                    | نتیجهٔ D سمت-سرور نمره‌دهی می‌شود؛ پاسخ‌ها هرگز در payload کلاینت نیستند                                         |
| در Analytics | `units_started`                                     | **سنجهٔ شاخص: `understood@attempt1`** (+لایه‌های attempt 1/2/3) — هرگز با Engagement یکی گرفته نمی‌شود (RSK-017) |
| در Admin     | داشبورد پیشرفت                                      | توزیع واحدهای understood + نقاط خطای رایج برای تیم محتوا                                                         |
| در UI        | مسیر/path                                           | متر «دیالوگ‌های فهمیده» + حالت واحد understood/semi — کاربر درصد خام نمی‌بیند (AC-947)                           |

**سنجه‌های گیت D (Provisional — OQ-016):** مرحله ۲: وزنی ≥70% و هیچ سنجه <50% · مرحله ۳: ≥75%/<60% · ۴-۵: ≥80% و M4 (شنیداری) همیشه ≥60%. وزن‌ها: M1 معنا 30% · M2 واژگان 20% · M3 دستور 20% · M4 شنیداری 20% · M5 گوینده/نیت 10%. حداکثر ۳ حلقهٔ ترمیم در هر جلسه؛ قفل نرم مسیر (PR-019).

## انطباق Analytics (ADR-016)

Engagement ≠ Learning Effectiveness: داشبورد Effectiveness مرجع داوری است؛ متر «میانگین زمان در اپ» هرگز سنجهٔ موفقیت نیست (EV-199). رویدادهای مرتبط: `unit_understood`، `mastery_attempt_completed`، `unit_revisited{days_since_understood}`.
