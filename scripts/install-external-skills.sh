#!/usr/bin/env bash
# install-external-skills.sh — نصب Skillهای خارجی vendored شده از agent-skills/external/ به .claude/skills/
# منبع canonical این Skillها همین ریپوست (برخلاف ۱۶ Skill داخلی که منبعشان KB است).
# خروجی (.claude/skills/) تولیدی و gitignore شده است — هرگز دستی ویرایشش نکن؛
# تغییر فقط از مسیر agent-skills/external/ + ثبت در SKILL_REGISTRY.md (ADR-006).
#
# استفاده:
#   ./scripts/install-external-skills.sh            # نصب همهٔ Skillهای خارجی
#   ./scripts/install-external-skills.sh --list     # فهرست
#   ./scripts/install-external-skills.sh --only webapp-testing,wcag-audit-patterns
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC="$REPO_ROOT/agent-skills/external"

die() { echo "ERROR: $*" >&2; exit 1; }

[ -d "$SRC" ] || die "skills source not found: $SRC"

MODE="install"
ONLY=""
while [ $# -gt 0 ]; do
  case "$1" in
    --list) MODE="list" ;;
    --only) shift; [ $# -gt 0 ] || die "--only needs a comma-separated list"; ONLY="$1" ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) die "unknown flag: $1" ;;
  esac
  shift
done

list_skills() {
  local found=()
  for d in "$SRC"/*/; do
    [ -f "$d/SKILL.md" ] && found+=("$(basename "$d")")
  done
  [ ${#found[@]} -gt 0 ] || die "no skills found in $SRC"
  printf '%s\n' "${found[@]}"
}

if [ "$MODE" = "list" ]; then
  echo "External skills available in $SRC:"; list_skills; exit 0
fi

DEST="$REPO_ROOT/.claude/skills"
mkdir -p "$DEST"

installed=0
for d in "$SRC"/*/; do
  name="$(basename "$d")"
  skill="$d/SKILL.md"
  [ -f "$skill" ] || continue
  if [ -n "$ONLY" ]; then
    case ",$ONLY," in *",$name,"*) ;; *) continue ;; esac
  fi
  # اعتبارسنجی مینیمال frontmatter (name مطابق پوشه + وجود description)
  grep -q "^name: $name$" "$skill" || die "invalid SKILL.md (name mismatch): $skill"
  grep -q "^description:" "$skill" || die "invalid SKILL.md (missing description): $skill"
  # PROVENANCE الزامی است (ADR-006)
  [ -f "$d/PROVENANCE.md" ] || die "missing PROVENANCE.md (refusing to install unaudited skill): $d"
  rm -rf "$DEST/$name"
  cp -r "$d" "$DEST/$name"
  echo "installed: $name -> $DEST/$name"
  installed=$((installed + 1))
done

[ "$installed" -gt 0 ] || die "nothing installed (check --only filter)"
echo "done: $installed external skill(s) installed into $DEST"
echo "note: .claude/skills is generated output — make changes in agent-skills/external/ only."
echo "note: internal skills (SKL-001..016) install separately from the KB: ../japanese-learning-kb/scripts/install-skills.sh ."
