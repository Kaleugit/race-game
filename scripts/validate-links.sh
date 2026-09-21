#!/usr/bin/env bash
# validate-links.sh — check that local markdown links resolve.
#
# Usage:
#   validate-links.sh                 # repo-wide (the governance net: pre-commit + CI)
#   validate-links.sh <file> [file…]  # scoped: check ONLY the given .md/.mdx files
#                                       (used by validate-changed.sh — the per-task
#                                        incremental delivery gate). Non-.md and
#                                        non-existent args are skipped.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILURES=0

is_external_link() {
  local target="$1"
  [[ "$target" =~ ^https?:// ]] || [[ "$target" =~ ^mailto: ]] || [[ "$target" =~ ^tel: ]] || [[ "$target" =~ ^data: ]] || [[ "$target" =~ ^# ]]
}

check_file() {
  local file="$1"
  while IFS= read -r raw_link; do
    target="${raw_link##*\(}"
    target="${target%)}"

    # Trim optional title in markdown link: [text](path "title")
    if [[ "$target" == *" \""* ]]; then
      target="${target%% \"*}"
    fi

    # Trim angle brackets: [text](<path>)
    target="${target#<}"
    target="${target%>}"

    [[ -z "$target" ]] && continue
    is_external_link "$target" && continue

    path_only="${target%%#*}"
    path_only="${path_only%%\?*}"
    [[ -z "$path_only" ]] && continue

    if [[ "$path_only" == /* ]]; then
      candidate="$ROOT_DIR$path_only"
    else
      candidate="$(cd "$(dirname "$file")" && pwd)/$path_only"
    fi

    if [[ ! -e "$candidate" ]]; then
      echo "ERROR: broken link in $file -> $target"
      FAILURES=1
    fi
  done < <(grep -oE '\[[^][]+\]\(([^)]+)\)' "$file" || true)
}

if [[ "$#" -gt 0 ]]; then
  # Scoped mode: check only the given files (skip non-.md / non-existent).
  for file in "$@"; do
    [[ -f "$file" ]] || continue
    case "$file" in *.md|*.mdx) ;; *) continue ;; esac
    check_file "$file"
  done
else
  # Repo-wide mode.
  while IFS= read -r file; do
    check_file "$file"
  done < <(find "$ROOT_DIR" \
    -type f \
    \( -name "*.md" -o -name "*.mdx" \) \
    -not -path "$ROOT_DIR/.git/*" \
    -not -path "*/node_modules/*" \
    -not -path "$ROOT_DIR/dist/*" \
    -not -path "$ROOT_DIR/content/*" \
    -not -path "$ROOT_DIR/dados-coletados/*" \
    -not -path "$ROOT_DIR/draft.md" \
    | sort)
fi

if [[ "$FAILURES" -eq 0 ]]; then
  echo "OK: no broken local markdown links found"
fi

exit "$FAILURES"
