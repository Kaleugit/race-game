#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSTREAMS_DIR="$ROOT_DIR/memory-system/workstreams"
START_MARKER='<!-- WORKSTREAM_NOTES:START -->'
END_MARKER='<!-- WORKSTREAM_NOTES:END -->'
CHECK_ONLY=0
UPDATED=0

usage() {
  cat <<'USAGE'
Usage:
  reconcile-workstream-notes.sh [--check]

Options:
  --check   validate that workstream notes are up to date.
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

if [[ ! -d "$WORKSTREAMS_DIR" ]]; then
  echo "ERROR: workstreams directory not found: memory-system/workstreams"
  exit 1
fi

trim_trailing_newlines() {
  sed -E ':a;N;$!ba;s/\n+$//'
}

ensure_notes_file() {
  local notes_file="$1"
  local ws_name="$2"

  if [[ -f "$notes_file" ]]; then
    return
  fi

  cat > "$notes_file" <<EOF2
# Personal Notes - ${ws_name}

## Session Notes (Consolidated)
Fragments source: \`memory-system/workstreams/${ws_name}/notes.d/*.md\`.
Do not edit generated block manually.

${START_MARKER}
<!-- no notes fragments -->
${END_MARKER}
EOF2
}

append_markers_if_missing() {
  local notes_file="$1"
  local check_only="${2:-0}"

  if grep -qF "$START_MARKER" "$notes_file" && grep -qF "$END_MARKER" "$notes_file"; then
    return 0
  fi

  if [[ "$check_only" -eq 1 ]]; then
    return 1
  fi

  cat >> "$notes_file" <<EOF2

${START_MARKER}
<!-- no notes fragments -->
${END_MARKER}
EOF2

  return 0
}

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
iter=0

while IFS= read -r ws_dir; do
  ws_name="$(basename "$ws_dir")"
  notes_file="$ws_dir/notes.md"
  fragments_dir="$ws_dir/notes.d"

  if [[ ! -f "$notes_file" ]]; then
    UPDATED=1
    if [[ "$CHECK_ONLY" -eq 1 ]]; then
      echo "MISSING: memory-system/workstreams/${ws_name}/notes.md"
      continue
    fi
    ensure_notes_file "$notes_file" "$ws_name"
  fi

  if ! append_markers_if_missing "$notes_file" "$CHECK_ONLY"; then
    UPDATED=1
    if [[ "$CHECK_ONLY" -eq 1 ]]; then
      echo "MISSING_MARKERS: memory-system/workstreams/${ws_name}/notes.md"
      continue
    fi
  fi

  body_file="$tmpdir/body_${iter}"
  tmp_file="$tmpdir/tmp_${iter}"
  iter=$((iter + 1))

    if [[ -d "$fragments_dir" ]]; then
      unset seen_hashes
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
    done < <(find "$fragments_dir" -maxdepth 1 -type f -name '*.md' | sort)
  fi

  if [[ ! -s "$body_file" ]]; then
    printf '<!-- no notes fragments -->\n' > "$body_file"
  fi

  # Streamed from $body_file via getline: `awk -v section=...` hits the kernel
  # argv cap (MAX_ARG_STRLEN, ~128KB on Linux) on grown corpora and expands
  # escape sequences found in fragments. See reconcile-session-log.sh.
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
  ' "$notes_file" > "$tmp_file"

  if ! cmp -s "$notes_file" "$tmp_file"; then
    UPDATED=1
    if [[ "$CHECK_ONLY" -eq 0 ]]; then
      mv "$tmp_file" "$notes_file"
      echo "Reconciled: memory-system/workstreams/${ws_name}/notes.md"
    fi
  fi

done < <(find "$WORKSTREAMS_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

if [[ "$UPDATED" -eq 0 ]]; then
  echo "OK: workstream notes already reconciled"
  exit 0
fi

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  echo "ERROR: one or more workstream notes files are outdated"
  echo "Run: ./scripts/reconcile-workstream-notes.sh"
  exit 1
fi

echo "Workstream notes reconciled"
