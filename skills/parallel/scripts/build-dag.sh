#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TASKS_DIR="$ROOT_DIR/memory-system/tasks"
DOCS_DIR="$ROOT_DIR/docs"
TASK_ID_GREP='TASK-[a-z0-9][a-z0-9-]*-(EP-[0-9]{3,}-[0-9]{2,}|[0-9]{14})'

EPIC_ID=""
declare -a INPUT_TASKS=()
declare -A TASK_SEEN=()
declare -A TASK_STATUS=()
declare -A TASK_DEPENDS=()
declare -A TASK_MODE=()
declare -A TASK_BRANCH=()

usage() {
  cat <<'USAGE'
Usage:
  build-dag.sh --epic EP-001
  build-dag.sh --tasks TASK-oda-EP-001-01,TASK-oda-EP-001-02

Output: structured text with task inventory, launchable tasks, and dependency graph.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --epic)
      EPIC_ID="${2:-}"
      shift 2
      ;;
    --tasks)
      IFS=',' read -r -a INPUT_TASKS <<< "${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERROR: unknown option '$1'" >&2
      usage >&2
      exit 1
      ;;
  esac
done

find_epic_doc() {
  local epic_id="$1"
  local found=""

  while IFS= read -r f; do
    found="$f"
    break
  done < <(find "$DOCS_DIR" -maxdepth 1 -type f -name "EPICO-${epic_id}-*-TASKS.md" 2>/dev/null | head -1)

  if [[ -z "$found" ]]; then
    echo "ERROR: epic tasks doc not found for $epic_id in $DOCS_DIR" >&2
    exit 1
  fi
  echo "$found"
}

parse_epic_doc() {
  local doc="$1"
  local current_task=""

  while IFS= read -r line; do
    if [[ "$line" =~ ^-\ Task\ ID:\ *($TASK_ID_GREP) ]]; then
      current_task="${BASH_REMATCH[1]}"
      TASK_SEEN["$current_task"]=1
      TASK_STATUS["$current_task"]="PENDING"
      TASK_DEPENDS["$current_task"]=""
      TASK_MODE["$current_task"]="Standard"
      TASK_BRANCH["$current_task"]="${current_task}-implement"
    fi

    if [[ -n "$current_task" ]]; then
      if [[ "$line" =~ ^-\ Depends\ On:\ *(.*) ]]; then
        local deps_raw="${BASH_REMATCH[1]}"
        if [[ "$deps_raw" != "None" && -n "$deps_raw" ]]; then
          TASK_DEPENDS["$current_task"]="$(echo "$deps_raw" | grep -oE "$TASK_ID_GREP" | tr '\n' ',' | sed 's/,$//')"
        fi
      fi
      if [[ "$line" =~ ^-\ Execution\ Mode:\ *(Quick|Standard|Critical) ]]; then
        TASK_MODE["$current_task"]="${BASH_REMATCH[1]}"
      fi
      if [[ "$line" =~ ^-\ Suggested\ Branch:\ *(.+) ]]; then
        TASK_BRANCH["$current_task"]="$(echo "${BASH_REMATCH[1]}" | sed -E 's/[[:space:]]+$//')"
      fi
    fi
  done < "$doc"
}

load_task_file_overrides() {
  local task_id="$1"
  local task_file="$TASKS_DIR/$task_id.md"

  [[ ! -f "$task_file" ]] && return

  local val=""
  val="$(sed -nE 's/^- Status:[[:space:]]*(.*)$/\1/p' "$task_file" | head -1)"
  [[ -n "$val" ]] && TASK_STATUS["$task_id"]="$val"

  val="$(sed -nE 's/^- Execution Mode:[[:space:]]*(.*)$/\1/p' "$task_file" | head -1)"
  [[ -n "$val" ]] && TASK_MODE["$task_id"]="$val"

  val="$(sed -nE 's/^- Branch:[[:space:]]*(.*)$/\1/p' "$task_file" | head -1)"
  [[ -n "$val" ]] && TASK_BRANCH["$task_id"]="$val"

  val="$(sed -nE 's/^- Depends On:[[:space:]]*(.*)$/\1/p' "$task_file" | head -1)"
  if [[ -n "$val" && "$val" != "None" ]]; then
    TASK_DEPENDS["$task_id"]="$(echo "$val" | grep -oE "$TASK_ID_GREP" | tr '\n' ',' | sed 's/,$//')"
  fi
}

dep_status() {
  local dep_id="$1"
  if [[ -n "${TASK_STATUS[$dep_id]:-}" ]]; then
    echo "${TASK_STATUS[$dep_id]}"
    return
  fi
  local dep_file="$TASKS_DIR/$dep_id.md"
  if [[ -f "$dep_file" ]]; then
    sed -nE 's/^- Status:[[:space:]]*(.*)$/\1/p' "$dep_file" | head -1
  else
    echo "UNKNOWN"
  fi
}

is_launchable() {
  local task_id="$1"
  local status="${TASK_STATUS[$task_id]}"

  [[ "$status" != "PENDING" ]] && return 1

  IFS=',' read -r -a deps <<< "${TASK_DEPENDS[$task_id]:-}"
  for dep in "${deps[@]}"; do
    [[ -z "$dep" ]] && continue
    local ds
    ds="$(dep_status "$dep")"
    [[ "$ds" != "COMPLETED" ]] && return 1
  done
  return 0
}

# --- Main ---

if [[ -n "$EPIC_ID" ]]; then
  epic_doc="$(find_epic_doc "$EPIC_ID")"
  parse_epic_doc "$epic_doc"
elif [[ "${#INPUT_TASKS[@]}" -gt 0 ]]; then
  for task in "${INPUT_TASKS[@]}"; do
    task="$(echo "$task" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
    [[ -z "$task" ]] && continue
    TASK_SEEN["$task"]=1
    TASK_STATUS["$task"]="PENDING"
    TASK_DEPENDS["$task"]=""
    TASK_MODE["$task"]="Standard"
    TASK_BRANCH["$task"]="${task}-implement"
  done
else
  echo "ERROR: provide --epic or --tasks" >&2
  exit 1
fi

if [[ "${#TASK_SEEN[@]}" -eq 0 ]]; then
  echo "ERROR: no tasks found" >&2
  exit 1
fi

for task in "${!TASK_SEEN[@]}"; do
  load_task_file_overrides "$task"
done

# --- Output ---

pending=0
in_progress=0
completed=0
blocked=0
canceled=0
declare -a launchable=()

for task in $(printf '%s\n' "${!TASK_SEEN[@]}" | sort); do
  case "${TASK_STATUS[$task]}" in
    PENDING) pending=$((pending + 1)) ;;
    IN_PROGRESS) in_progress=$((in_progress + 1)) ;;
    COMPLETED) completed=$((completed + 1)) ;;
    BLOCKED) blocked=$((blocked + 1)) ;;
    CANCELED) canceled=$((canceled + 1)) ;;
  esac

  if is_launchable "$task"; then
    launchable+=("$task")
  fi
done

echo "=== PARALLEL EXECUTION PLAN ==="
[[ -n "$EPIC_ID" ]] && echo "Epic: $EPIC_ID"
echo "Total: ${#TASK_SEEN[@]}"
echo "Pending: $pending"
echo "In Progress: $in_progress"
echo "Completed: $completed"
echo "Blocked: $blocked"
echo "Canceled: $canceled"
echo "Launchable now: ${#launchable[@]}"
echo ""

echo "=== TASKS ==="
for task in $(printf '%s\n' "${!TASK_SEEN[@]}" | sort); do
  local_deps="${TASK_DEPENDS[$task]:-None}"
  [[ -z "$local_deps" ]] && local_deps="None"
  echo "${task}|${TASK_STATUS[$task]}|${local_deps}|${TASK_MODE[$task]}|${TASK_BRANCH[$task]}"
done
echo ""

echo "=== LAUNCHABLE ==="
for task in "${launchable[@]}"; do
  echo "$task"
done
echo ""

echo "=== DEPENDENCY GRAPH ==="
for task in $(printf '%s\n' "${!TASK_SEEN[@]}" | sort); do
  local_deps="${TASK_DEPENDS[$task]:-None}"
  [[ -z "$local_deps" ]] && local_deps="None"
  echo "$task -> $local_deps"
done
