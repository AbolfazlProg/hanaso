#!/usr/bin/env bash
# sync-skills.sh — همگام‌سازی کامل .claude/skills/ از هر دو منبع (ADR-006):
#   1) ۱۶ Skill داخلی از مرکز دانش (japanese-learning-kb) — منبع canonical داخلی
#   2) Skillهای خارجی vendored شده از agent-skills/external/ — منبع canonical خارجیِ همین ریپو
# استفاده: ./scripts/sync-skills.sh   (KB_PATH اختیاری؛ پیش‌فرض ../japanese-learning-kb)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KB_PATH="${KB_PATH:-$REPO_ROOT/../japanese-learning-kb}"

total=0

if [ -f "$KB_PATH/scripts/install-skills.sh" ]; then
  echo "== internal skills (KB: $KB_PATH) =="
  bash "$KB_PATH/scripts/install-skills.sh" "$REPO_ROOT"
else
  echo "== KB not found at $KB_PATH — skipping internal skills (set KB_PATH to add them) =="
fi

echo "== external skills (this repo: agent-skills/external/) =="
bash "$REPO_ROOT/scripts/install-external-skills.sh"

echo "== summary =="
ls -1 "$REPO_ROOT/.claude/skills" 2>/dev/null | wc -l | xargs -I{} echo "total skills discoverable in .claude/skills: {}"
