#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_FILE="$ROOT_DIR/memory-system/session-log.md"
FRAGMENTS_DIR="$ROOT_DIR/memory-system/session-log.d"
START_MARKER='<!-- SESSION_LOG:START -->'
END_MARKER='<!-- SESSION_LOG:END -->'
CHECK_ONLY=0

usage() {
  cat <<'USAGE'
Usage:
  reconcile-session-log.sh [--check]

Options:
  --check   validate that memory-system/session-log.md is up to date.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)
      CHECK_ONLY=1
      shift
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

if [[ ! -f "$LOG_FILE" ]]; then
  echo "ERROR: session log file not found: memory-system/session-log.md"
  exit 1
fi

if ! grep -qF "$START_MARKER" "$LOG_FILE"; then
  echo "ERROR: start marker not found in memory-system/session-log.md"
  exit 1
fi

if ! grep -qF "$END_MARKER" "$LOG_FILE"; then
  echo "ERROR: end marker not found in memory-system/session-log.md"
  exit 1
fi

trim_trailing_newlines() {
  sed -E ':a;N;$!ba;s/\n+$//'
}

body_file="$(mktemp)"
tmp_file="$(mktemp)"
trap 'rm -f "$body_file" "$tmp_file"' EXIT

if [[ -d "$FRAGMENTS_DIR" ]]; then
  declare -A seen_hashes=()
  first_block=1

  while IFS= read -r fragment; do
    fragment_name="$(basename "$fragment")"
    fragment_ts="$(echo "$fragment_name" | sed -nE 's/^([0-9]{8,14}).*/\1/p')"
    if [[ -z "$fragment_ts" ]]; then
      fragment_ts="$(stat -c %Y "$fragment" 2>/dev/null || echo "0")"
    fi

    content="$(sed -E 's/[[:space:]]+$//' "$fragment" | trim_trailing_newlines)"
    [[ -z "$content" ]] && continue

    hash="$(printf '%s|%s' "$content" "$fragment_ts" | sha256sum | awk '{print $1}')"
    if [[ -n "${seen_hashes[$hash]:-}" ]]; then
      continue
    fi
    seen_hashes[$hash]=1

    if [[ "$first_block" -eq 0 ]]; then
      printf '\n\n' >> "$body_file"
    fi
    printf '%s\n' "$content" >> "$body_file"
    first_block=0
  done < <(find "$FRAGMENTS_DIR" -maxdepth 1 -type f -name '*.md' | sort)
fi

if [[ ! -s "$body_file" ]]; then
  printf '<!-- no session fragments -->\n' > "$body_file"
fi

# The generated section is streamed from $body_file via getline instead of an
# `awk -v section=...` assignment: argv/env entries are capped by the kernel
# (MAX_ARG_STRLEN, ~128KB on Linux), so a grown fragment corpus made exec fail
# with "Argument list too long". getline also preserves content verbatim,
# while -v assignments expand escape sequences (\n, \t) found in fragments.
awk -v start="$START_MARKER" -v end="$END_MARKER" -v sectionfile="$body_file" '
  BEGIN { in_block=0 }
  {
    if ($0 == start) {
      print
      while ((getline line < sectionfile) > 0) print line
      close(sectionfile)
      in_block=1
      next
    }
    if ($0 == end) {
      in_block=0
      print
      next
    }
    if (!in_block) {
      print
    }
  }
' "$LOG_FILE" > "$tmp_file"

if cmp -s "$LOG_FILE" "$tmp_file"; then
  echo "OK: session log already reconciled"
  exit 0
fi

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  echo "ERROR: memory-system/session-log.md is outdated"
  echo "Run: ./scripts/reconcile-session-log.sh"
  exit 1
fi

mv "$tmp_file" "$LOG_FILE"
echo "Session log reconciled in memory-system/session-log.md"
