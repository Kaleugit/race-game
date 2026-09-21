#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILURES=0

fail() {
  echo "ERROR: $1"
  FAILURES=1
}

trim() {
  echo "$1" | sed -E 's/^\*+//; s/\*+$//; s/^[[:space:]]+//; s/[[:space:]]+$//'
}

is_placeholder_date() {
  [[ "$1" == "YYYY-MM-DD" ]]
}

is_placeholder_datetime() {
  [[ "$1" == "YYYY-MM-DD HH:MM" ]]
}

is_valid_date() {
  local value="$1"
  [[ "$value" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || return 1
  date -d "$value" +%F >/dev/null 2>&1
}

is_valid_datetime() {
  local value="$1"
  [[ "$value" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}[[:space:]][0-9]{2}:[0-9]{2}$ ]] || return 1
  date -d "$value" +%F >/dev/null 2>&1
}

validate_date_field() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  local require_real="$4"

  while IFS= read -r line; do
    local line_no value
    line_no="${line%%:*}"
    value="${line#*:}"
    value="${value#*:}"
    value="$(trim "$value")"

    if is_placeholder_date "$value"; then
      if [[ "$require_real" == "1" ]]; then
        fail "$file:$line_no placeholder date not allowed for $label"
      fi
      continue
    fi

    if ! is_valid_date "$value"; then
      fail "$file:$line_no invalid $label date -> '$value'"
    fi
  done < <(grep -nE "$pattern" "$file" || true)
}

validate_datetime_field() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  local require_real="$4"

  while IFS= read -r line; do
    local line_no value
    line_no="${line%%:*}"
    value="${line#*:}"
    value="${value#*:}"
    value="$(trim "$value")"

    if is_placeholder_datetime "$value"; then
      if [[ "$require_real" == "1" ]]; then
        fail "$file:$line_no placeholder datetime not allowed for $label"
      fi
      continue
    fi

    if ! is_valid_datetime "$value"; then
      fail "$file:$line_no invalid $label datetime -> '$value'"
    fi
  done < <(grep -nE "$pattern" "$file" || true)
}

validate_date_field "$ROOT_DIR/docs/PROJECT_SPECS.md" '^Última atualização:' 'PROJECT_SPECS last updated' 0
validate_date_field "$ROOT_DIR/memory-system/1-project-context.md" '^\*\*Last Updated:\*\*' 'project context last updated' 0
validate_date_field "$ROOT_DIR/memory-system/session-log.md" '^\*Last Updated:' 'session log last updated' 0
validate_date_field "$ROOT_DIR/memory-system/2-tasks.md" '^\*Last Updated:' 'task board last updated' 0
if [[ -f "$ROOT_DIR/archive/completed-tasks.md" ]]; then
  validate_date_field "$ROOT_DIR/archive/completed-tasks.md" '^\*Last Updated:' 'archive last updated' 0
fi

TASKS_DIR="$ROOT_DIR/memory-system/tasks"
if [[ -d "$TASKS_DIR" ]]; then
  while IFS= read -r task_file; do
    validate_datetime_field "$task_file" '^- Last Updated:' 'task Last Updated' 1
    # Started/Completed are optional fields; only validate format when present (not placeholder-blocked)
    validate_datetime_field "$task_file" '^- (Started|Completed):' 'task Started/Completed' 0
  done < <(find "$TASKS_DIR" -maxdepth 1 -type f -name 'TASK-*.md' | sort)
fi

if [[ "$FAILURES" -eq 0 ]]; then
  echo "OK: date validation passed"
fi

exit "$FAILURES"
