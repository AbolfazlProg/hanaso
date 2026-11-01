name: Task (TASK-<phase>-<nn>)
description: استاندارد تسک توسعهٔ HANASO — بر اساس قالب ۱۲فیلدی ops/templates/task-spec-template.md
labels: []
body:

- type: textarea
  id: requirement
  attributes:
  label: نیازمندی (چه چیزی ساخته شود / نشود)
  description: محدودهٔ دقیق — ساخته می‌شود / ساخته نمی‌شود
  validations:
  required: true
- type: textarea
  id: why
  attributes:
  label: دلیل ساخت + مرجع
  description: Issue/FEAT/AC/ADR/سند KB مرتبط
  validations:
  required: true
- type: textarea
  id: ac
  attributes:
  label: معیارهای پذیرش قابل‌آزمون
  description: هر بند قابل تأیید/رد باشد
  validations:
  required: true
- type: textarea
  id: deps
  attributes:
  label: وابستگی‌ها
  description: تسک‌ها/گیت‌ها/دسترسی‌های پیش‌نیاز
  validations:
  required: false
- type: textarea
  id: skills
  attributes:
  label: Skillهای الزامی + اسناد مطالعه
  description: SKL-001..016 و مسیرهای KB
  validations:
  required: false
