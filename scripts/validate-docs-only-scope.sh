#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FROM_REF=""
TO_REF=""

usage() {
  cat <<'USAGE'
Usage:
  validate-docs-only-scope.sh --from <ref> --to <ref>

Description:
  Validates that all changed files in the git range are documentation-only.
USAGE
}

is_docs_only_path() {
  local path="$1"

  case "$path" in
    *.md|docs/*|memory-system/*|boilerplate-docs/*|.claude/agents/*)
      return 0
      ;;
  esac

  if [[ "$path" =~ ^skills/[^/]+/references/ ]]; then
    return 0
  fi

  return 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from)
      FROM_REF="${2:-}"
      shift 2
      ;;
    --to)
      TO_REF="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown option '$1'"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$FROM_REF" || -z "$TO_REF" ]]; then
  echo "ERROR: --from and --to are required"
  usage
  exit 1
fi

if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: not a git repository: $ROOT_DIR"
  exit 1
fi

if [[ "$FROM_REF" == "0000000000000000000000000000000000000000" ]]; then
  changed_files="$(git -C "$ROOT_DIR" diff-tree --no-commit-id --name-only --root -r "$TO_REF")"
else
  changed_files="$(git -C "$ROOT_DIR" diff --name-only "$FROM_REF..$TO_REF")"
fi

invalid_paths=""
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  if ! is_docs_only_path "$path"; then
    invalid_paths+="${path}"$'\n'
  fi
done <<< "$changed_files"

if [[ -n "$invalid_paths" ]]; then
  echo "ERROR: direct commits on main are restricted to documentation-only scope."
  echo "Use task branch + PR flow for non-documentation changes."
  echo "Non-documentation files detected:"
  printf '%s' "$invalid_paths"
  exit 1
fi

echo "OK: documentation-only scope validation passed"
