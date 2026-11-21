# ENGINE-REFORM — OWNER ONE-COMMAND (2026-11-22)
#
# پرْف HEAD: feat/curriculum-engine-reform (کامیت e4062c1)
# لازم: یک GitHub PAT با scopes: repo (یا contents:write + pull_requests:write + issues:write)
# اجرا:  GH_TOKEN=<توکن> bash scripts/engine-reform-owner-command.sh
#
# پیش‌فرض‌ها: origin = https://github.com/AbolfazlProg/hanaso.git؛ branch protection پلن Free (PR-only، squash-merge دستی از UI هم مجاز).
# امنیت: توکن فقط از environment خوانده می‌شود — هرگز در فایل/لاگ/پیام ذکر نشود.
set -euo pipefail
REPO="https://github.com/AbolfazlProg/hanaso.git"
BRANCH="feat/curriculum-engine-reform"
TOKEN="${GH_TOKEN:?GH_TOKEN is required — export it before running}"

cd "$(dirname "$0")/.."
git remote set-url origin "https://${TOKEN}@github.com/AbolfazlProg/hanaso.git" 2>/dev/null || true

echo "== 1/3 push the branch =="
git push -u origin "$BRANCH"

API="https://api.github.com/repos/AbolfazlProg/hanaso"
AUTH="Authorization: Bearer ${TOKEN}"

echo "== 2/3 create the tracking issue (the content-rebuild debt register) =="
ISSUE=$(curl -s -X POST "${API}/issues" -H "${AUTH}" -H 'Accept: application/vnd.github+json' \
  --data @- <<'JSON' | python3 -c 'import json,sys; print(json.load(sys.stdin)["number"])'
{
  "title": "ENGINE-REFORM aftermath — بازسازی مرحله‌ای محتوای ۸۰ ایستگاهِ با بدهی (معافیت‌های ثبت‌شدهٔ EQA-8/EQA-10)",
  "body": "مأموریت ENGINE-REFORM (PR همین شماره) رجیستری دانش + گیت‌های EQA-8/EQA-10 را ساخت و بدهی مرحله‌ایِ محتوای موجود را ماشین‌پیدا کرد: ۷۵ یافتهٔ ثبت‌شده در content/eqa-waivers.ts (هر یک با reason فارسی و همین شماره issue). این issue مأموریت رفعشان را تعقیب می‌کند: هر ایستگاه طبق همان الگوی سه پایلوت (پکت→درگیرسازی ساده→فراخوانی→مثال الگو‌شده→هدایت‌شده→مستقل) بازسازی می‌شود؛ رفع هر معافیت = حذف سطرش (stale waiver خودش CI را می‌شکند تا زودبرد پاک نشود).",
  "labels": ["content", "learning"]
}
JSON
)
echo "   issue #${ISSUE} created (یا موجود)"

echo "== 3/3 open the pull request =="
curl -s -X POST "${API}/pulls" -H "${AUTH}" -H 'Accept: application/vnd.github+json' \
  --data @- <<JSON
{
  "title": "feat(engine): knowledge reference registry + EQA-8/EQA-10 — the engine-level teaching reform (ENGINE-REFORM)",
  "head": "${BRANCH}",
  "base": "main",
  "body": "مأموریت مالک 2026-11-22 — «اصلاح بنیادی موتور آموزشی». رجیستری مرجع دانش (۳۲۵ مدخل، قطعی/نسخه‌بندی‌شده/قابل جست‌وجو، ثبتِ خودکار، زنجیرهٔ فصل‌ها، مواجهه≠تدریس) + EQA-8 (پیش‌نیاز روی همهٔ سطوح محتوا — R1..R5) + EQA-10 (قرارداد آموزشی ایستگاه‌ها) + بسط اعتبارسنجِ درفت Lesson-Engine (L-STAGING/L-PREREQ-SURF) + سه درس پایلوتِ بازسازی‌شدهٔ kana-expansion-01 (بدون هیچ یافته/معافیت). باتری ۹۱ فایل/۱۰۲۴ تست سبز (لایهٔ جهش ENGINE-REFORM داخل). بدهی باقی مسیر: معافیت‌های #${ISSUE}. شواهد مرورگر واقعی: ops/runs/RUN-20261122-ENGINE-REFORM.md §۵."
}
JSON
echo ""
echo "== DONE: PR باز شد. پس از CI سبز: squash-merge از UI؛ سپس همان ۱۰-گام staged swap برای انتشار. =="

# بعد از اجرا: origin را به حالت بدون‌توکن برگردانید (عملاً مهم نیست — repo خصوصی است و توکن مالک است)
git remote set-url origin "${REPO}"
