#!/usr/bin/env bash
# list-smoke-tests.sh: emit candidate test paths for the current branch's diff.
#
# Issue #14 Problem 3 (Part B). Used by agents in `skills/implement` --smoke
# dev loop to run a subset of the test suite focused on what changed. The
# full suite remains the delivery gate.
#
# Usage:
#   scripts/list-smoke-tests.sh [--diff-base <ref>] [--config <path>] [--root <path>]
#
# Heuristic (when no config file or in addition to it):
#   For each changed file's containing directory D:
#     * emit "D/__tests__/" if that path exists
#     * emit "tests/D/"      if that path exists
#   If the changed file itself matches *.test.* or *_test.* (any extension),
#   emit the changed file path itself.
#
# Optional .governance/smoke-tests.conf format (one rule per line):
#   <source-prefix>  <test-target>
#   # comments and blank lines are ignored
#   src/             tests/
#   public/components/  tests/components/
#
# A changed file whose path starts with <source-prefix> contributes
# <test-target> to the output. Output is deduped and sorted.
set -euo pipefail

DIFF_BASE="origin/main"
CONFIG_PATH=""
ROOT_DIR=""

usage() {
  cat <<'USAGE'
Usage:
  list-smoke-tests.sh [--diff-base <ref>] [--config <path>] [--root <path>]
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --diff-base) DIFF_BASE="${2:-}"; shift 2 ;;
    --config)    CONFIG_PATH="${2:-}"; shift 2 ;;
    --root)      ROOT_DIR="${2:-}"; shift 2 ;;
    -h|--help)   usage; exit 0 ;;
    *) echo "ERROR: unknown option '$1'" >&2; usage >&2; exit 1 ;;
  esac
done

if [[ -z "$ROOT_DIR" ]]; then
  ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: not a git repository: $ROOT_DIR" >&2
  exit 1
fi

if [[ -z "$CONFIG_PATH" ]]; then
  CONFIG_PATH="$ROOT_DIR/.governance/smoke-tests.conf"
fi

# Resolve the base ref. Tolerate missing remote refs by falling back to the
# local equivalent. We use ... (3-dot) semantics consistent with PR review.
if ! git -C "$ROOT_DIR" rev-parse --verify "$DIFF_BASE" >/dev/null 2>&1; then
  local_base="${DIFF_BASE#origin/}"
  if git -C "$ROOT_DIR" rev-parse --verify "$local_base" >/dev/null 2>&1; then
    DIFF_BASE="$local_base"
  else
    echo "ERROR: diff base '$DIFF_BASE' not found." >&2
    exit 1
  fi
fi

declare -A emitted=()

emit_if_present() {
  local path="$1"
  [[ -z "$path" ]] && return 0
  [[ -e "$ROOT_DIR/$path" ]] || return 0
  if [[ -z "${emitted[$path]:-}" ]]; then
    emitted["$path"]=1
  fi
  return 0
}

# Always emit the path regardless of disk existence — used for explicit
# config matches and self-emitting test files.
emit_literal() {
  local path="$1"
  [[ -z "$path" ]] && return 0
  if [[ -z "${emitted[$path]:-}" ]]; then
    emitted["$path"]=1
  fi
  return 0
}

# 1) Collect changed files vs base.
changed="$(git -C "$ROOT_DIR" diff --name-only "$DIFF_BASE"...HEAD 2>/dev/null || true)"

if [[ -z "$changed" ]]; then
  # No diff -> no smoke set.
  exit 0
fi

# 2) Default heuristic per changed file.
while IFS= read -r f; do
  [[ -z "$f" ]] && continue

  # Self-emit if the file already looks like a test.
  case "$(basename "$f")" in
    *.test.*|*_test.*) emit_literal "$f" ;;
  esac

  dir="$(dirname "$f")"
  [[ "$dir" == "." ]] && dir=""

  if [[ -n "$dir" ]]; then
    emit_if_present "$dir/__tests__"
    emit_if_present "tests/$dir"
  else
    emit_if_present "__tests__"
    emit_if_present "tests"
  fi
done <<< "$changed"

# 3) Config-driven rules.
if [[ -f "$CONFIG_PATH" ]]; then
  while IFS= read -r line; do
    # Strip trailing comments and surrounding whitespace.
    line="${line%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" ]] && continue

    # Split into source prefix and test target on whitespace.
    src_prefix="${line%%[[:space:]]*}"
    rest="${line#*[[:space:]]}"
    rest="${rest#"${rest%%[![:space:]]*}"}"
    test_target="$rest"
    [[ -z "$src_prefix" || -z "$test_target" ]] && continue

    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      if [[ "$f" == "$src_prefix"* ]]; then
        emit_literal "$test_target"
      fi
    done <<< "$changed"
  done < "$CONFIG_PATH"
fi

# 4) Output, sorted, unique.
if [[ ${#emitted[@]} -gt 0 ]]; then
  printf '%s\n' "${!emitted[@]}" | LC_ALL=C sort -u
fi
