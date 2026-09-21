#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASKS_DIR="$ROOT_DIR/memory-system/tasks"
BOARD_FILE="$ROOT_DIR/memory-system/2-tasks.md"
START_MARKER='<!-- TASK_INDEX:START -->'
END_MARKER='<!-- TASK_INDEX:END -->'
CHECK_ONLY=0

usage() {
  cat <<'USAGE'
Usage:
  reconcile-task-index.sh [--check]

Options:
  --check   validate that memory-system/2-tasks.md task index is up to date.
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

if [[ ! -d "$TASKS_DIR" ]]; then
  echo "ERROR: tasks directory not found: memory-system/tasks"
  exit 1
fi

if [[ ! -f "$BOARD_FILE" ]]; then
  echo "ERROR: task board file not found: memory-system/2-tasks.md"
  exit 1
fi

if ! grep -qF "$START_MARKER" "$BOARD_FILE"; then
  echo "ERROR: start marker not found in memory-system/2-tasks.md"
  exit 1
fi

if ! grep -qF "$END_MARKER" "$BOARD_FILE"; then
  echo "ERROR: end marker not found in memory-system/2-tasks.md"
  exit 1
fi

trim() {
  local value="$1"
  echo "$value" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//'
}

extract_field() {
  local file="$1"
  local label="$2"
  local line
  line="$(grep -m1 -E "^- ${label}:" "$file" || true)"
  if [[ -z "$line" ]]; then
    echo ""
    return
  fi
  trim "${line#*:}"
}

escape_cell() {
  local value="$1"
  value="${value//|/\\|}"
  echo "$value"
}

rows_file="$(mktemp)"
section_file=""
trap 'rm -f "$rows_file" "$section_file"' EXIT

while IFS= read -r task_file; do
  task_id="$(basename "$task_file" .md)"
  title_line="$(grep -m1 -E '^# ' "$task_file" || true)"
  title=""
  if [[ "$title_line" =~ ^\#\ ${task_id}[[:space:]]*-[[:space:]]*(.+)$ ]]; then
    title="${BASH_REMATCH[1]}"
  else
    title="${title_line#\# }"
  fi
  title="$(trim "$title")"
  [[ -z "$title" ]] && title="(no title)"

  status="$(extract_field "$task_file" "Status")"
  priority="$(extract_field "$task_file" "Priority")"
  mode="$(extract_field "$task_file" "Execution Mode")"
  branch="$(extract_field "$task_file" "Branch")"
  workstreams="$(extract_field "$task_file" "Workstreams")"
  updated="$(extract_field "$task_file" "Last Updated")"

  if [[ -z "$priority" || ! "$priority" =~ ^[0-9]+$ ]]; then
    priority=9
  fi

  printf '%s\t| %s | %s | %s | %s | %s | %s | %s | %s |\n' \
    "$priority" \
    "$(escape_cell "$task_id")" \
    "$(escape_cell "$title")" \
    "$(escape_cell "$status")" \
    "$(escape_cell "$priority")" \
    "$(escape_cell "$mode")" \
    "$(escape_cell "$branch")" \
    "$(escape_cell "$workstreams")" \
    "$(escape_cell "$updated")" \
    >> "$rows_file"
done < <(find "$TASKS_DIR" -maxdepth 1 -type f -name 'TASK-*.md' | sort)

header='| Task ID | Title | Status | Priority | Execution Mode | Branch | Workstreams | Last Updated |'
separator='|---|---|---|---|---|---|---|---|'

if [[ -s "$rows_file" ]]; then
  body="$(sort -t $'\t' -k1,1n -k2,2 "$rows_file" | cut -f2-)"
else
  body='| (none) | - | - | - | - | - | - | - |'
fi

# The generated section is written to a temp file and streamed via getline
# instead of an `awk -v section=...` assignment: argv/env entries are capped
# by the kernel (MAX_ARG_STRLEN, ~128KB on Linux), so a grown task corpus
# would make exec fail with "Argument list too long". getline also preserves
# escape_cell's `\|` verbatim, which -v assignments strip back to `|`.
section_file="$(mktemp)"
printf '%s\n%s\n%s\n' "$header" "$separator" "$body" > "$section_file"

tmp_file="$(mktemp)"
awk -v start="$START_MARKER" -v end="$END_MARKER" -v sectionfile="$section_file" '
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
' "$BOARD_FILE" > "$tmp_file"

if cmp -s "$BOARD_FILE" "$tmp_file"; then
  rm -f "$tmp_file"
  echo "OK: task index already reconciled"
  exit 0
fi

if [[ "$CHECK_ONLY" -eq 1 ]]; then
  rm -f "$tmp_file"
  echo "ERROR: memory-system/2-tasks.md task index is outdated"
  echo "Run: ./scripts/reconcile-task-index.sh"
  exit 1
fi

mv "$tmp_file" "$BOARD_FILE"
echo "Task index reconciled in memory-system/2-tasks.md"
