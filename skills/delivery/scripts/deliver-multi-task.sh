#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TASKS_DIR="$ROOT_DIR/memory-system/tasks"
DELIVERY_SCRIPT="$ROOT_DIR/skills/delivery/scripts/deliver-to-main.sh"
TASK_ID_RE='^TASK-[a-z0-9][a-z0-9-]*-(EP-[0-9]{3,}-[0-9]{2,}|[0-9]{14})$'
TASK_ID_GREP='TASK-[a-z0-9][a-z0-9-]*-(EP-[0-9]{3,}-[0-9]{2,}|[0-9]{14})'

FORCE_PUSH=0
# ADR-018: espelha o default do deliver-to-main.sh, que passou a ser opt-in.
# Antes ficava 1 e o wrapper só encaminhava `--no-auto-merge` quando 0 — como o
# script chamado já defaultava para manual, o "1" daqui virava letra morta e
# `--no-auto-merge` virava no-op. Agora o encaminhamento é do lado positivo.
AUTO_MERGE=0
DRY_RUN=0

declare -a INPUT_TASKS=()
declare -A TASK_SEEN=()
declare -A TASK_BRANCH=()
declare -A TASK_DEPENDS=()
declare -A IN_DEGREE=()
declare -A ADJ=()
declare -A PROCESSED=()

usage() {
  cat <<'USAGE'
Usage:
  deliver-multi-task.sh --tasks <TASK-ID[,TASK-ID...]> [--force-push] [--auto-merge] [--no-auto-merge] [--dry-run]
  deliver-multi-task.sh --task <TASK-ID> [--task <TASK-ID> ...] [--force-push] [--auto-merge] [--no-auto-merge] [--dry-run]

Examples:
  deliver-multi-task.sh --tasks TASK-oda-20260227120000,TASK-oda-20260227123000
  deliver-multi-task.sh --task TASK-oda-20260227120000 --task TASK-oda-20260227123000 --dry-run
  deliver-multi-task.sh --tasks TASK-oda-20260227120000 --force-push
USAGE
}

append_task_ids() {
  local raw="$1"
  local task

  IFS=',' read -r -a split <<< "$raw"
  for task in "${split[@]}"; do
    task="$(echo "$task" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
    [[ -z "$task" ]] && continue
    INPUT_TASKS+=("$task")
  done
}

validate_task_id() {
  local task_id="$1"
  if [[ ! "$task_id" =~ $TASK_ID_RE ]]; then
    echo "ERROR: invalid task ID '$task_id' (expected TASK-<github-login>-<task-key>)"
    exit 1
  fi
}

load_task_metadata() {
  local task_id="$1"
  local task_file="$TASKS_DIR/$task_id.md"
  local branch=""
  local depends_line=""
  local deps=""

  if [[ ! -f "$task_file" ]]; then
    echo "ERROR: task file not found for '$task_id': $task_file"
    exit 1
  fi

  branch="$(sed -nE 's/^- Branch:[[:space:]]*(.*)$/\1/p' "$task_file" | head -n 1)"
  if [[ -z "$branch" || ! "$branch" =~ ^${task_id}-[a-z0-9-]+$ ]]; then
    echo "ERROR: invalid or missing Branch in $task_file (expected ${task_id}-<role|workstream>)"
    exit 1
  fi

  depends_line="$(sed -nE 's/^- Depends On:[[:space:]]*(.*)$/\1/p' "$task_file" | head -n 1)"
  if [[ -n "$depends_line" && "$depends_line" != "None" ]]; then
    deps="$(echo "$depends_line" | grep -oE "$TASK_ID_GREP" | tr '\n' ' ' | sed -E 's/[[:space:]]+$//' || true)"
  fi

  TASK_BRANCH["$task_id"]="$branch"
  TASK_DEPENDS["$task_id"]="$deps"
}

expand_task_closure() {
  local queue=("$@")
  local task dep

  while [[ "${#queue[@]}" -gt 0 ]]; do
    task="${queue[0]}"
    queue=("${queue[@]:1}")

    validate_task_id "$task"
    if [[ -n "${TASK_SEEN[$task]:-}" ]]; then
      continue
    fi

    TASK_SEEN["$task"]=1
    load_task_metadata "$task"

    for dep in ${TASK_DEPENDS[$task]:-}; do
      queue+=("$dep")
    done
  done
}

build_dependency_graph() {
  local task dep

  for task in "${!TASK_SEEN[@]}"; do
    IN_DEGREE["$task"]=0
  done

  for task in "${!TASK_SEEN[@]}"; do
    for dep in ${TASK_DEPENDS[$task]:-}; do
      if [[ -n "${TASK_SEEN[$dep]:-}" ]]; then
        IN_DEGREE["$task"]=$((IN_DEGREE[$task] + 1))
        ADJ["$dep"]="${ADJ[$dep]:-} $task"
      fi
    done
  done
}

topological_order() {
  local total ordered_count=0
  local ordered=()
  local candidate next

  total="${#TASK_SEEN[@]}"

  while [[ "$ordered_count" -lt "$total" ]]; do
    candidate=""

    while IFS= read -r next; do
      [[ -z "$next" ]] && continue
      if [[ -z "${PROCESSED[$next]:-}" && "${IN_DEGREE[$next]:-0}" -eq 0 ]]; then
        candidate="$next"
        break
      fi
    done < <(printf '%s\n' "${!TASK_SEEN[@]}" | sort)

    if [[ -z "$candidate" ]]; then
      echo "ERROR: dependency cycle detected among selected tasks."
      echo "Remaining tasks:"
      while IFS= read -r next; do
        [[ -z "$next" ]] && continue
        if [[ -z "${PROCESSED[$next]:-}" ]]; then
          echo "  - $next"
        fi
      done < <(printf '%s\n' "${!TASK_SEEN[@]}" | sort)
      exit 1
    fi

    ordered+=("$candidate")
    PROCESSED["$candidate"]=1
    ordered_count=$((ordered_count + 1))

    for next in ${ADJ[$candidate]:-}; do
      IN_DEGREE["$next"]=$((IN_DEGREE[$next] - 1))
    done
  done

  printf '%s\n' "${ordered[@]}"
}

if [[ ! -x "$DELIVERY_SCRIPT" ]]; then
  echo "ERROR: delivery script not found or not executable: $DELIVERY_SCRIPT"
  exit 1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tasks)
      append_task_ids "${2:-}"
      shift 2
      ;;
    --task)
      INPUT_TASKS+=("${2:-}")
      shift 2
      ;;
    --force-push)
      FORCE_PUSH=1
      shift
      ;;
    --auto-merge)
      AUTO_MERGE=1
      shift
      ;;
    --no-auto-merge)
      # Mantida por compatibilidade: já é o padrão desde o ADR-018.
      AUTO_MERGE=0
      shift
      ;;
    --dry-run)
      DRY_RUN=1
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

if [[ "${#INPUT_TASKS[@]}" -eq 0 ]]; then
  echo "ERROR: provide at least one task ID via --tasks or --task"
  usage
  exit 1
fi

expand_task_closure "${INPUT_TASKS[@]}"
build_dependency_graph
mapfile -t ORDERED_TASKS < <(topological_order)

echo "Delivery order (dependency-aware):"
for task in "${ORDERED_TASKS[@]}"; do
  echo "- ${task} (${TASK_BRANCH[$task]})"
done

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run mode: no delivery executed."
  exit 0
fi

for task in "${ORDERED_TASKS[@]}"; do
  branch="${TASK_BRANCH[$task]}"
  cmd=("$DELIVERY_SCRIPT" --source-branch "$branch")

  if [[ "$FORCE_PUSH" -eq 1 ]]; then
    cmd+=(--force-push)
  fi

  if [[ "$AUTO_MERGE" -eq 1 ]]; then
    cmd+=(--auto-merge)
  fi

  echo
  echo "==> Delivering ${task} (${branch})"
  "${cmd[@]}"
done
