#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# HANASO — commit hygiene gate (TASK-HANASO-20 BUG-011, implemented in
# TASK-HANASO-21).
#
# The incident: a real product fix (the deferred-restart notice) shipped inside
# `9127c1a style(ci): prettier --write` — so the release pin, which trusts
# commit labels, silently missed live behavior. The rule, as recorded in the
# TASK-HANASO-20 backlog:
#
#   A commit typed docs(…) or style(…) whose diff touches apps/web/src
#   FAILS the gate.
#
# Product-code changes must ride a feat/fix/refactor/test/perf/chore(deps)
# label — the label is the release pin's contract.
#
# Escape hatch (deliberate, auditable): a commit whose MESSAGE carries the
# trailer `hygiene-waiver: <reason>` passes with a LOUD log line. Use it only
# for provably format-only sweeps (prettier --write) — the waiver claim is
# reviewable in the PR forever.
#
# Usage: commit-hygiene.sh <before-sha> <after-sha>
# Exit:  0 = range clean · 1 = violation found (printed) · 2 = usage error
# -----------------------------------------------------------------------------
set -uo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <before-sha> <after-sha>" >&2
  exit 2
fi
BEFORE="$1"
AFTER="$2"

if ! git cat-file -e "${BEFORE}" 2>/dev/null; then
  echo "hygiene: base ${BEFORE} not present — nothing to check (skip)"
  exit 0
fi

RANGE="${BEFORE}..${AFTER}"
VIOLATIONS=0

for sha in $(git rev-list --no-merges "${RANGE}"); do
  subject="$(git log -1 --format=%s "${sha}")"
  # conventional-commit type (docs / style / anything else)
  type="$(printf '%s' "${subject}" | sed -n 's/^\([a-z]*\)(\?.*/\1/p' | head -1)"
  if [ "${type}" != "docs" ] && [ "${type}" != "style" ]; then
    continue
  fi
  # does this commit touch product code?
  if git diff-tree --no-commit-id --name-only -r "${sha}" -- apps/web/src | grep -q .; then
    if git log -1 --format=%B "${sha}" | grep -qi '^hygiene-waiver:'; then
      echo "hygiene: WAIVED ${sha} ${subject}"
      echo "hygiene:   reason: $(git log -1 --format=%B "${sha}" | grep -i '^hygiene-waiver:' | head -1)"
      continue
    fi
    echo "hygiene: VIOLATION ${sha} — «${subject}» touches apps/web/src"
    echo "hygiene:   files:"
    git diff-tree --no-commit-id --name-only -r "${sha}" -- apps/web/src | sed 's/^/hygiene:     /'
    echo "hygiene:   product changes need a feat/fix/refactor/test label (or an explicit"
    echo "hygiene:    hygiene-waiver: trailer for provably format-only sweeps)."
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "${VIOLATIONS}" -gt 0 ]; then
  echo "hygiene: ${VIOLATIONS} violation(s) in ${RANGE} — release-pin labels must stay honest."
  exit 1
fi
echo "hygiene: ${RANGE} clean — no docs/style commit carries product code."
exit 0
