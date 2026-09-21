#!/usr/bin/env bash
# validate-changed.sh — INCREMENTAL governance gate scoped to a branch's change set.
#
# The per-task delivery gate (skills/delivery + gohorse) used to run the repo-wide
# scripts/validate-all.sh, which re-scans the ENTIRE repo (~minutes; validate-conventions
# is super-linear in git history) on the serial critical path — twice per delivery —
# revalidating files the task never touched and coupling sibling tasks (a missing
# completion field left by task A blocks the delivery of task B). See issues #57/#58/#62.
#
# This gate validates ONLY the changed set (`base...tip` ∪ working tree), but mirrors
# the WHOLE per-file governance set that the full validate-all applies — scoping the
# gate must NOT reduce it to a single check (issue #57), or a task passes here yet fails
# the full validate-all / pre-commit hook later:
#   - completion + Planning preflight on changed memory-system/tasks/TASK-*.md
#     (Report/Evidence/prior-art AND the Planning-field artifact must be a real file),
#     BEFORE the task is flipped to COMPLETED — fail early on THIS task, never on a
#     sibling's delivery;
#   - scoped placeholder required-field check on changed task files;
#   - scoped markdown link-check on all changed .md/.mdx (task files included).
# It is attributable: a red is caused by THIS branch, not a pre-existing sibling defect.
#
# It does NOT replace validate-all.sh — the repo-wide net still runs in the pre-commit
# hook and in CI (governance.yml), and (in the gohorse optimistic model) asynchronously
# at the wave boundary after merge. This script is the cheap, attributable pre-merge
# gate that takes the expensive repo-wide scan off the serial per-task critical path.
#
# Usage: validate-changed.sh [--base <ref>] [--tip <ref>]
#   --base   base ref for the diff (default: origin/main)
#   --tip    tip ref for the diff  (default: HEAD)
# Always also includes uncommitted working-tree changes.
#
# Exit codes: 0 = clean, 1 = a scoped check failed, 2 = setup error (bad ref / usage).
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="origin/main"
TIP="HEAD"

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --base) BASE="${2:-}"; shift 2 ;;
    --tip)  TIP="${2:-}";  shift 2 ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "ERROR: unknown argument: $1" >&2; exit 2 ;;
  esac
done

git -C "$ROOT_DIR" rev-parse --verify --quiet "$BASE^{commit}" >/dev/null || {
  echo "ERROR: base ref not found: $BASE (fetch origin first?)" >&2; exit 2; }
git -C "$ROOT_DIR" rev-parse --verify --quiet "$TIP^{commit}" >/dev/null || {
  echo "ERROR: tip ref not found: $TIP" >&2; exit 2; }

# Changed set = (base...tip) ∪ (working tree), excluding deletions (-d): a deleted
# file has nothing to link-check or preflight. Use a merge-base diff (base...tip),
# not base..tip, so unrelated changes already on base do not enter the set.
declare -A CHANGED=()
while IFS= read -r f; do [[ -n "$f" ]] && CHANGED["$f"]=1; done < <(
  git -C "$ROOT_DIR" diff --name-only --diff-filter=d "${BASE}...${TIP}" 2>/dev/null
  git -C "$ROOT_DIR" diff --name-only --diff-filter=d HEAD 2>/dev/null
  git -C "$ROOT_DIR" diff --name-only --diff-filter=d --cached 2>/dev/null
)

if [[ "${#CHANGED[@]}" -eq 0 ]]; then
  echo "OK: no changed files to validate (base=$BASE tip=$TIP)"
  exit 0
fi

FAILED=0
declare -a CHANGED_MD=()
declare -a CHANGED_TASKS=()

# Mirror the WHOLE per-file governance set that the repo-wide validate-all applies,
# scoped to the changed set — not just the completion contract (issue #57: scoping the
# gate must not silently drop the Planning-field artifact check or the placeholder
# required-field checks, which otherwise pass here but fail the full validate-all /
# pre-commit hook later, pressuring `--no-verify`).
for rel in "${!CHANGED[@]}"; do
  abs="$ROOT_DIR/$rel"
  [[ -f "$abs" ]] || continue   # may have been removed in the working tree
  case "$rel" in
    memory-system/tasks/TASK-*.md)
      echo "==> completion+planning preflight: $rel"
      bash "$ROOT_DIR/scripts/validate-conventions.sh" --completion-preflight "$abs" || FAILED=1
      CHANGED_TASKS+=("$abs")   # also placeholder-checked (below)
      CHANGED_MD+=("$abs")      # task files have links too
      ;;
    *.md|*.mdx)
      CHANGED_MD+=("$abs")
      ;;
  esac
done

if [[ "${#CHANGED_TASKS[@]}" -gt 0 ]]; then
  echo "==> scoped placeholder check: ${#CHANGED_TASKS[@]} changed task file(s)"
  bash "$ROOT_DIR/scripts/validate-placeholders.sh" "${CHANGED_TASKS[@]}" || FAILED=1
fi

if [[ "${#CHANGED_MD[@]}" -gt 0 ]]; then
  echo "==> scoped link-check: ${#CHANGED_MD[@]} changed markdown file(s)"
  bash "$ROOT_DIR/scripts/validate-links.sh" "${CHANGED_MD[@]}" || FAILED=1
fi

if [[ "$FAILED" -ne 0 ]]; then
  echo "Incremental delivery gate FAILED (changed set: ${#CHANGED[@]} file(s))"
  exit 1
fi

echo "OK: incremental delivery gate passed (changed set: ${#CHANGED[@]} file(s))"
exit 0
