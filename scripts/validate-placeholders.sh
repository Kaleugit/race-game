#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASKS_DIR="$ROOT_DIR/memory-system/tasks"
TASKS_BOARD_FILE="$ROOT_DIR/memory-system/2-tasks.md"
SPECS_FILE="$ROOT_DIR/docs/PROJECT_SPECS.md"
CONTEXT_FILE="$ROOT_DIR/memory-system/1-project-context.md"
BRIEFING_FILE="$ROOT_DIR/BRIEFING.md"
FAILURES=0

fail() {
  echo "ERROR: $1"
  FAILURES=1
}

warn() {
  echo "WARN: $1"
}

trim() {
  local v="$1"
  echo "$v" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//'
}

extract_field_value() {
  local file="$1"
  local field="$2"
  local line
  line="$(grep -m1 -E "^- ${field}:" "$file" || true)"
  [[ -z "$line" ]] && return 1
  trim "${line#*:}"
}

is_placeholder_value() {
  local v
  v="$(trim "$1")"
  [[ -z "$v" ]] && return 0
  [[ "$v" =~ ^(YYYY-MM-DD|YYYY-MM-DD\ HH:MM)$ ]] && return 0
  [[ "$v" =~ TO_CONFIRM ]] && return 0
  [[ "$v" =~ ^-+$ ]] && return 0
  return 1
}

require_non_placeholder_field() {
  local file="$1"
  local field="$2"
  local where="$3"
  local value
  if ! value="$(extract_field_value "$file" "$field")"; then
    fail "missing mandatory field '${field}' in ${where}"
    return
  fi
  if is_placeholder_value "$value"; then
    fail "field '${field}' has placeholder/empty value in ${where}"
  fi
}

extract_bootstrap_status() {
  local line
  line="$(grep -m1 -E '^- Current Status:' "$TASKS_BOARD_FILE" || true)"
  line="${line#*:}"
  line="$(echo "$line" | tr -d '\`' | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  echo "$line"
}

briefing_looks_placeholder() {
  local file="$1"
  [[ -f "$file" ]] || return 1

  if grep -q 'Descrição livre do projeto (estado `PRE_BOOTSTRAP`).' "$file" \
    && grep -q '^Use este arquivo para explicar, em linguagem natural:' "$file"; then
    return 0
  fi

  return 1
}

warn_if_placeholder_field() {
  local file="$1"
  local pattern="$2"
  local label="$3"
  local where="$4"
  local line value
  line="$(grep -m1 -E "$pattern" "$file" || true)"
  if [[ -z "$line" ]]; then
    warn "bootstrap field '${label}' not found in ${where}"
    return
  fi
  value="$(trim "${line#*:}")"
  if is_placeholder_value "$value"; then
    warn "bootstrap field '${label}' looks placeholder/empty in ${where}"
  fi
}

# Per-task placeholder checks (required fields + mode/status-gated fields). Shared by
# the repo-wide loop and the scoped mode, so the incremental delivery gate
# (validate-changed.sh) mirrors the full per-file placeholder coverage — issue #57.
check_task_placeholders() {
  local task_file="$1"
  local task_rel="${task_file#"$ROOT_DIR"/}"
  local status mode

  require_non_placeholder_field "$task_file" "Status" "$task_rel"
  require_non_placeholder_field "$task_file" "Priority" "$task_rel"
  require_non_placeholder_field "$task_file" "Depends On" "$task_rel"
  require_non_placeholder_field "$task_file" "Blocked By" "$task_rel"
  require_non_placeholder_field "$task_file" "Branch" "$task_rel"
  require_non_placeholder_field "$task_file" "Workstreams" "$task_rel"
  require_non_placeholder_field "$task_file" "Execution Mode" "$task_rel"
  require_non_placeholder_field "$task_file" "Last Updated" "$task_rel"

  status="$(extract_field_value "$task_file" "Status" || true)"
  mode="$(extract_field_value "$task_file" "Execution Mode" || true)"

  if [[ "$status" =~ ^(IN_PROGRESS|BLOCKED|COMPLETED)$ && "$mode" =~ ^(Standard|Critical)$ ]]; then
    require_non_placeholder_field "$task_file" "Planning" "$task_rel"
  fi

  if [[ "$status" == "COMPLETED" && "$mode" =~ ^(Standard|Critical)$ ]]; then
    require_non_placeholder_field "$task_file" "Report" "$task_rel"
  fi

  if [[ "$status" == "COMPLETED" && "$mode" == "Quick" ]]; then
    require_non_placeholder_field "$task_file" "Evidence" "$task_rel"
  fi
}

# Scoped mode: validate-placeholders <task-file> [task-file…] — check ONLY the given
# task files (non-TASK / non-existent args skipped). Used by validate-changed.sh.
# Repo-wide mode runs when no args are given.
if [[ "$#" -gt 0 ]]; then
  for f in "$@"; do
    [[ -f "$f" ]] || continue
    case "$f" in *memory-system/tasks/TASK-*.md) check_task_placeholders "$f" ;; esac
  done
  if [[ "$FAILURES" -eq 0 ]]; then
    echo "OK: placeholder validation passed (scoped: $# file arg(s))"
  fi
  exit "$FAILURES"
fi

if [[ ! -d "$TASKS_DIR" ]]; then
  fail "missing tasks directory: memory-system/tasks"
fi

while IFS= read -r task_file; do
  check_task_placeholders "$task_file"
done < <(find "$TASKS_DIR" -maxdepth 1 -type f -name 'TASK-*.md' | sort)

bootstrap_status="$(extract_bootstrap_status)"
if [[ ! "$bootstrap_status" =~ ^(PRE_BOOTSTRAP|INCOMPLETE|COMPLETE|READY_FOR_EXECUTION)$ ]]; then
  warn "unknown bootstrap status '${bootstrap_status}' in memory-system/2-tasks.md"
fi

if briefing_looks_placeholder "$BRIEFING_FILE"; then
  if [[ "$bootstrap_status" != "PRE_BOOTSTRAP" ]]; then
    warn "bootstrap status is '${bootstrap_status}' but BRIEFING.md still looks like template placeholder"
  fi
elif [[ "$bootstrap_status" == "PRE_BOOTSTRAP" ]]; then
  warn "bootstrap status is PRE_BOOTSTRAP but BRIEFING.md already looks project-specific"
fi

if [[ "$bootstrap_status" == "INCOMPLETE" || "$bootstrap_status" == "COMPLETE" || "$bootstrap_status" == "READY_FOR_EXECUTION" ]]; then
  warn_if_placeholder_field "$SPECS_FILE" '^- Nome do produto:' 'Nome do produto' 'docs/PROJECT_SPECS.md'
  warn_if_placeholder_field "$SPECS_FILE" '^- Objetivo principal:' 'Objetivo principal' 'docs/PROJECT_SPECS.md'
  warn_if_placeholder_field "$SPECS_FILE" '^- Problema que resolve:' 'Problema que resolve' 'docs/PROJECT_SPECS.md'
  warn_if_placeholder_field "$SPECS_FILE" '^- Público-alvo:' 'Público-alvo' 'docs/PROJECT_SPECS.md'
  warn_if_placeholder_field "$CONTEXT_FILE" '^\*\*Name:\*\*' 'Current Project Name' 'memory-system/1-project-context.md'
  warn_if_placeholder_field "$CONTEXT_FILE" '^\*\*Type:\*\*' 'Current Project Type' 'memory-system/1-project-context.md'
  warn_if_placeholder_field "$CONTEXT_FILE" '^\*\*Status:\*\*' 'Current Project Status' 'memory-system/1-project-context.md'

  # Section 10 (Decision Criteria) must exist with at least default criteria
  if ! grep -qE '^## 10\.' "$SPECS_FILE"; then
    warn "Section 10 (Decision Criteria) not found in docs/PROJECT_SPECS.md"
  elif ! grep -qE '^[0-9]+\. \*\*' "$SPECS_FILE"; then
    warn "Section 10 has no numbered criteria in docs/PROJECT_SPECS.md"
  fi

  # PREREQUISITES.md must exist when bootstrap >= INCOMPLETE
  PREREQS_FILE="$ROOT_DIR/docs/PREREQUISITES.md"
  if [[ ! -f "$PREREQS_FILE" ]]; then
    warn "docs/PREREQUISITES.md not found (expected when bootstrap >= INCOMPLETE)"
  fi

  # At least one scope item (Incluído)
  if ! grep -qE '^- [^\[]' <(sed -n '/^### Incluído/,/^###/p' "$SPECS_FILE" 2>/dev/null) 2>/dev/null; then
    if ! grep -qE '^- [^\[].+' <(sed -n '/^### Inclu/,/^#/p' "$SPECS_FILE") 2>/dev/null; then
      warn "no real scope items found under 'Incluído' in docs/PROJECT_SPECS.md"
    fi
  fi

  # At least one functional requirement (RF-XXX)
  if ! grep -qE '^- RF-[0-9]{3}:.*[^ ]' "$SPECS_FILE"; then
    warn "no filled functional requirement (RF-XXX) in docs/PROJECT_SPECS.md"
  fi

  # At least one acceptance criterion (CA-XXX)
  if ! grep -qE '^- CA-[0-9]{3}:.*[^ ]' "$SPECS_FILE"; then
    warn "no filled acceptance criterion (CA-XXX) in docs/PROJECT_SPECS.md"
  fi
fi

if [[ "$FAILURES" -eq 0 ]]; then
  echo "OK: placeholder/required-value validation passed"
fi

exit "$FAILURES"
