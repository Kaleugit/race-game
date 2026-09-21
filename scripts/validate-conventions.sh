#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILURES=0
TASK_ID_RE='^TASK-[a-z0-9][a-z0-9-]*-(EP-[0-9]{3,}-[0-9]{2,}|[0-9]{14})$'

fail() {
  echo "ERROR: $1"
  FAILURES=1
}

warn() {
  echo "WARN: $1"
}

# Ratified `Branch:` violations (TD-INC20260817-01 / ADR-015). Keyed by the PAIR
# (task id, branch value): an entry forgives exactly the value recorded on
# 2026-08-17, so the same task pointing anywhere else is an ERROR again, and a
# 13th offender is an ERROR too. See the file header for why these are not
# rewritten (rewriting would name branches that never existed — Article IV).
BRANCH_BASELINE_FILE="${BRANCH_BASELINE_FILE:-$ROOT_DIR/.governance/validate-baseline.txt}"

# Compares as literal strings, never as a pattern: interpolating the file's own
# `Branch:` value into a regex would let a baselined task widen its own pardon by
# declaring something like `.*`. Field-by-field reading also tolerates extra
# whitespace and skips comments without a regex.
branch_baselined() {
  local task_id="$1" branch_val="$2" bl_id bl_branch
  [[ -f "$BRANCH_BASELINE_FILE" ]] || return 1
  # `\r` in IFS: `core.autocrlf=true` is set in Git for Windows' SYSTEM gitconfig,
  # so a fresh checkout of this file lands CRLF and a bare `read` would leave `\r`
  # glued to the last field — silently un-forgiving all 12 pairs. CI runs on Linux
  # (i/lf), so that break would be invisible in the gate and hit only local devs.
  # `|| [[ -n "$bl_id" ]]`: also process a final line with no trailing newline.
  while IFS=$' \t\r' read -r bl_id bl_branch _ || [[ -n "$bl_id" ]]; do
    [[ -z "$bl_id" || "$bl_id" == \#* ]] && continue
    if [[ "$bl_id" == "$task_id" && "$bl_branch" == "$branch_val" ]]; then
      return 0
    fi
  done < "$BRANCH_BASELINE_FILE"
  return 1
}

trim() {
  local v="$1"
  echo "$v" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//'
}

extract_field() {
  local file="$1"
  local field="$2"
  local line
  line="$(grep -m1 -E "^- ${field}:" "$file" || true)"
  if [[ -z "$line" ]]; then
    echo ""
    return
  fi
  trim "${line#*:}"
}

has_field() {
  local file="$1"
  local field="$2"
  grep -q -E "^- ${field}:" "$file"
}

is_placeholder_like() {
  local value
  value="$(trim "$1")"
  [[ -z "$value" ]] && return 0

  # Allow markdown links such as [label](path/to/file.md).
  if echo "$value" | grep -Eq '^\[[^][]+\]\([^)]+\)$'; then
    return 1
  fi

  [[ "$value" =~ ^(YYYY-MM-DD|YYYY-MM-DD\ HH:MM)$ ]] && return 0
  [[ "$value" =~ TO_CONFIRM ]] && return 0
  echo "$value" | grep -Eq '<github-login>|<task-key>|<role\|workstream>' && return 0
  echo "$value" | grep -Eq '\[(YYYY-MM-DD|role\|workstream|github-login|task-key)\]' && return 0
  return 1
}

normalize_artifact_ref() {
  local raw="$1"
  local value
  value="$(trim "$raw")"

  # Markdown link format: [label](path)
  if [[ "$value" == \[*\]\(*\) ]]; then
    value="$(echo "$value" | sed -E 's/^\[[^][]+\]\(([^)]+)\)$/\1/')"
  fi

  # Inline code/backticks and optional annotations.
  value="${value#\`}"
  value="${value%\`}"
  value="${value%% \(*}"
  value="$(trim "$value")"

  echo "$value"
}

resolve_artifact_path() {
  local task_file="$1"
  local ref="$2"

  if [[ -z "$ref" ]]; then
    return 1
  fi

  if [[ "$ref" == /* ]]; then
    [[ -f "$ref" ]] && { echo "$ref"; return 0; }
    return 1
  fi

  local candidates=(
    "$ROOT_DIR/$ref"
    "$(dirname "$task_file")/$ref"
    "$ROOT_DIR/memory-system/task-docs/$ref"
  )

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -f "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

require_artifact_file() {
  local task_file="$1"
  local field="$2"
  local rel_path="$3"
  local raw_value ref resolved

  raw_value="$(extract_field "$task_file" "$field")"
  if is_placeholder_like "$raw_value"; then
    fail "placeholder artifact reference is not allowed for '${field}' -> ${rel_path}"
    return
  fi

  ref="$(normalize_artifact_ref "$raw_value")"
  if [[ -z "$ref" ]]; then
    fail "empty artifact reference for '${field}' -> ${rel_path}"
    return
  fi

  # '${field}' must be a FILE PATH, never inline prose. A real path is a single
  # token with no internal whitespace; inline text (a sentence) always contains
  # spaces. Catch it here with a legible error instead of an opaque
  # "missing artifact file" once path resolution fails downstream.
  if [[ "$ref" =~ [[:space:]] ]]; then
    fail "'${field}' must be a file path (e.g. memory-system/...), received inline text ('${raw_value}') -> ${rel_path}"
    return
  fi

  if ! resolved="$(resolve_artifact_path "$task_file" "$ref")"; then
    fail "missing artifact file for '${field}' ('${ref}') -> ${rel_path}"
    return
  fi

  [[ -f "$resolved" ]] || fail "artifact path is not a file for '${field}' ('${ref}') -> ${rel_path}"
}

# Completion-time contract for a task file: Report (Standard/Critical),
# Evidence (Quick), and the forward-only prior-art gate. Shared by the main
# loop (gated on Status == COMPLETED) and by --completion-preflight (evaluated
# proactively before a task is flipped to COMPLETED, so skills/delivery catches
# a missing field before the expensive semantic validation pass, not after).
check_completion_contract() {
  local task_file="$1"
  local task_filename mode_val
  task_filename="$(basename "$task_file")"
  mode_val="$(extract_field "$task_file" "Execution Mode")"

  if [[ "$mode_val" =~ ^(Standard|Critical)$ ]]; then
    has_field "$task_file" "Report" || fail "report is required for completed ${mode_val} task (expected '- Report: <path>' on a single line in the metadata block at the top of the file; not '## Report' heading) -> memory-system/tasks/${task_filename}"
    require_artifact_file "$task_file" "Report" "memory-system/tasks/${task_filename}"
  fi

  if [[ "$mode_val" == "Quick" ]]; then
    has_field "$task_file" "Evidence" || fail "evidence is required for completed Quick task (expected '- Evidence: <content>' on a single line in the metadata block at the top of the file; not '## Evidence' heading) -> memory-system/tasks/${task_filename}"
  fi

  # Forward-only gate: skip the prior-art check for task files first committed
  # before the gate's introduction date (configurable via PRIOR_ART_CUTOFF).
  local prior_art_cutoff first_commit_date
  prior_art_cutoff="${PRIOR_ART_CUTOFF:-2026-06-13}"
  first_commit_date="$(cd "$ROOT_DIR" && git log --diff-filter=A --format=%cs -- "$task_file" 2>/dev/null | tail -1 || true)"
  if [[ -z "$first_commit_date" || ! "$first_commit_date" < "$prior_art_cutoff" ]]; then
    has_field "$task_file" "prior-art" || fail "prior-art is required for completed tasks (expected '- prior-art: <file>:<line> — description' on a single line, or '- prior-art: none'; records the search-before-create gate per AGENTS.md §Before Implementing) -> memory-system/tasks/${task_filename}"
  fi
}

# Preflight mode: evaluate the completion-time contract for one task file
# regardless of its current Status. Lets skills/delivery catch a missing
# prior-art/Report/Evidence field in ~1s, up front, instead of after the task
# is flipped to COMPLETED and the semantic validation pass has already run.
if [[ "${1:-}" == "--completion-preflight" ]]; then
  preflight_file="${2:-}"
  if [[ -z "$preflight_file" ]]; then
    echo "ERROR: usage: validate-conventions.sh --completion-preflight <task-file>"
    exit 2
  fi
  if [[ ! -f "$preflight_file" ]]; then
    echo "ERROR: task file not found: $preflight_file"
    exit 2
  fi
  # A task that has not started has no Planning/Report/prior-art to point at, and
  # a canceled one never will. Demanding them here would force declaring artifact
  # paths for work that does not exist — fabrication, and the reason `gen-tasks`
  # step 9 output could not be committed at all. The preflight exists to catch a
  # missing field BEFORE delivery; a PENDING/CANCELED task is never being
  # delivered, so there is nothing to catch.
  preflight_status="$(extract_field "$preflight_file" "Status")"
  if [[ "$preflight_status" =~ ^(PENDING|CANCELED)$ ]]; then
    echo "OK: completion-contract preflight skipped for $(basename "$preflight_file") (Status: ${preflight_status})"
    exit 0
  fi
  # Planning-field artifact check, proactively (mirrors the repo-wide per-task loop
  # below, evaluated before COMPLETED). For Standard/Critical, Planning must be a
  # single-line field pointing at an artifact file that EXISTS — an inline/text value
  # or a missing path passes a naive completion-only gate but fails the full
  # validate-all later (issue #57: the incremental gate must cover the whole per-file
  # governance set, not just the completion contract).
  preflight_filename="$(basename "$preflight_file")"
  preflight_mode="$(extract_field "$preflight_file" "Execution Mode")"
  if [[ "$preflight_mode" =~ ^(Standard|Critical)$ ]]; then
    has_field "$preflight_file" "Planning" || fail "planning is required for mode ${preflight_mode} (expected '- Planning: <path>' on a single line in the metadata block at the top of the file; not '## Planning' heading) -> memory-system/tasks/${preflight_filename}"
    require_artifact_file "$preflight_file" "Planning" "memory-system/tasks/${preflight_filename}"
  fi
  check_completion_contract "$preflight_file"
  if [[ "$FAILURES" -eq 0 ]]; then
    echo "OK: completion-contract preflight passed for $(basename "$preflight_file")"
  fi
  exit "$FAILURES"
fi

# Required core files
required_files=(
  "$ROOT_DIR/AGENTS.md"
  "$ROOT_DIR/memory-system/2-tasks.md"
  "$ROOT_DIR/memory-system/1-project-context.md"
  "$ROOT_DIR/memory-system/session-log.md"
  "$ROOT_DIR/docs/PROJECT_SPECS.md"
  "$ROOT_DIR/BRIEFING.md"
  "$ROOT_DIR/INTEGRITY-RULES.md"
  "$ROOT_DIR/CHANGELOG.md"
)

for file in "${required_files[@]}"; do
  [[ -f "$file" ]] || fail "missing required file: ${file#"$ROOT_DIR"/}"
done

TASKS_DIR="$ROOT_DIR/memory-system/tasks"
if [[ ! -d "$TASKS_DIR" ]]; then
  fail "missing tasks directory: memory-system/tasks"
fi

GITIGNORE_FILE="$ROOT_DIR/.gitignore"
required_gitignore_entries=(
  "node_modules/"
  "dist/"
  ".vite/"
)

if [[ ! -f "$GITIGNORE_FILE" ]]; then
  fail "missing required file: .gitignore"
else
  for entry in "${required_gitignore_entries[@]}"; do
    if ! grep -qxF "$entry" "$GITIGNORE_FILE"; then
      fail "missing required .gitignore entry '${entry}'"
    fi
  done
fi

ALIASES_FILE="$ROOT_DIR/memory-system/workstreams/aliases.conf"
get_ws_alias() {
  local skill="$1"
  [[ -f "$ALIASES_FILE" ]] || return 1
  local line
  line="$(grep -E "^${skill}=" "$ALIASES_FILE" | head -n 1 || true)"
  [[ -n "$line" ]] || return 1
  echo "${line#*=}"
}

# Dynamic workstream checks (non-blocking by project decision)
WORKSTREAMS_DIR="$ROOT_DIR/memory-system/workstreams"
if [[ ! -d "$WORKSTREAMS_DIR" ]]; then
  warn "workstreams directory not found: memory-system/workstreams"
else
  ws_count="$(find "$WORKSTREAMS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
  if [[ "$ws_count" -eq 0 ]]; then
    warn "no workstreams found in memory-system/workstreams (allowed)"
  fi
fi

# Warn if mapped workstream is missing, but do not block CI.
if [[ -d "$WORKSTREAMS_DIR" ]]; then
  while IFS= read -r skill_dir; do
    skill="$(basename "$skill_dir")"
    ws="$(get_ws_alias "$skill" || true)"
    ws="${ws:-$skill}"
    if [[ ! -d "$WORKSTREAMS_DIR/$ws" ]]; then
      warn "skill '$skill' has no mapped workstream '$ws' (allowed; create when needed)"
    fi
  done < <(find "$ROOT_DIR/skills" -mindepth 1 -maxdepth 1 -type d | sort)
fi

# 2-tasks structural checks
TASKS_BOARD_FILE="$ROOT_DIR/memory-system/2-tasks.md"
if ! grep -q '^## Task Index (Auto-generated)' "$TASKS_BOARD_FILE"; then
  fail "missing Task Index section in memory-system/2-tasks.md"
fi
if ! grep -q '^<!-- TASK_INDEX:START -->$' "$TASKS_BOARD_FILE"; then
  fail "missing TASK_INDEX:START marker in memory-system/2-tasks.md"
fi
if ! grep -q '^<!-- TASK_INDEX:END -->$' "$TASKS_BOARD_FILE"; then
  fail "missing TASK_INDEX:END marker in memory-system/2-tasks.md"
fi

bootstrap_status="$(sed -nE 's/^- Current Status: `([^`]+)`.*/\1/p' "$TASKS_BOARD_FILE" | head -n 1)"
if [[ -z "$bootstrap_status" ]]; then
  fail "missing bootstrap current status in memory-system/2-tasks.md"
elif [[ ! "$bootstrap_status" =~ ^(PRE_BOOTSTRAP|INCOMPLETE|COMPLETE|READY_FOR_EXECUTION)$ ]]; then
  fail "invalid bootstrap current status '${bootstrap_status}' in memory-system/2-tasks.md"
fi

# Task file checks
while IFS= read -r task_file; do
  task_filename="$(basename "$task_file")"
  task_id="${task_filename%.md}"

  if [[ ! "${task_filename%.md}" =~ $TASK_ID_RE ]]; then
    fail "invalid task filename '$task_filename' (expected TASK-<github-login>-<task-key>.md)"
    continue
  fi

  heading="$(grep -m1 -E '^# ' "$task_file" || true)"
  if [[ -z "$heading" || "$heading" != "# ${task_id}"* ]]; then
    fail "task file heading must start with '# ${task_id}' in memory-system/tasks/${task_filename}"
  fi

  required_fields=(
    "Status"
    "Priority"
    "Depends On"
    "Blocked By"
    "Branch"
    "Workstreams"
    "Execution Mode"
    "Last Updated"
  )

  for field in "${required_fields[@]}"; do
    if ! has_field "$task_file" "$field"; then
      fail "task file missing required field '${field}' -> memory-system/tasks/${task_filename}"
    fi
  done

  status_val="$(extract_field "$task_file" "Status")"
  mode_val="$(extract_field "$task_file" "Execution Mode")"
  branch_val="$(extract_field "$task_file" "Branch")"
  workstreams_val="$(extract_field "$task_file" "Workstreams")"
  priority_val="$(extract_field "$task_file" "Priority")"

  if [[ ! "$status_val" =~ ^(PENDING|IN_PROGRESS|BLOCKED|COMPLETED|CANCELED)$ ]]; then
    fail "invalid Status '${status_val}' -> memory-system/tasks/${task_filename}"
  fi

  if [[ ! "$mode_val" =~ ^(Quick|Standard|Critical)$ ]]; then
    fail "invalid Execution Mode '${mode_val}' -> memory-system/tasks/${task_filename}"
  fi

  if [[ ! "$priority_val" =~ ^[1-5]$ ]]; then
    fail "invalid Priority '${priority_val}' (expected 1-5) -> memory-system/tasks/${task_filename}"
  fi

  if [[ ! "$branch_val" =~ ^${task_id}-[a-z0-9-]+$ ]]; then
    if branch_baselined "$task_id" "$branch_val"; then
      warn "Branch '${branch_val}' does not derive from ${task_id} — ratified baseline, see TD-INC20260817-01 -> memory-system/tasks/${task_filename}"
    else
      fail "invalid Branch '${branch_val}' (expected ${task_id}-<role|workstream>) -> memory-system/tasks/${task_filename}"
    fi
  elif branch_baselined "$task_id" "$branch_val"; then
    warn "stale baseline entry: ${task_id} no longer violates the Branch rule — remove it from .governance/validate-baseline.txt"
  fi

  if [[ "$status_val" =~ ^(IN_PROGRESS|BLOCKED|COMPLETED)$ && "$workstreams_val" == "None" ]]; then
    fail "active task cannot have Workstreams: None -> memory-system/tasks/${task_filename}"
  fi

  if [[ "$status_val" =~ ^(IN_PROGRESS|BLOCKED|COMPLETED)$ && "$mode_val" =~ ^(Standard|Critical)$ ]]; then
    has_field "$task_file" "Planning" || fail "planning is required for mode ${mode_val} (expected '- Planning: <path>' on a single line in the metadata block at the top of the file; not '## Planning' heading) -> memory-system/tasks/${task_filename}"
    require_artifact_file "$task_file" "Planning" "memory-system/tasks/${task_filename}"
  fi

  if [[ "$status_val" == "COMPLETED" ]]; then
    check_completion_contract "$task_file"
  fi
done < <(find "$TASKS_DIR" -maxdepth 1 -type f -name 'TASK-*.md' | sort)

# Task index is treated as consolidated artifact on main (non-blocking in branch CI).
if ! "$ROOT_DIR/scripts/reconcile-task-index.sh" --check >/dev/null 2>&1; then
  warn "task index in memory-system/2-tasks.md is outdated (it is reconciled automatically on main)"
fi

if ! "$ROOT_DIR/scripts/reconcile-session-log.sh" --check >/dev/null 2>&1; then
  warn "session log in memory-system/session-log.md is outdated (it is reconciled automatically on main)"
fi

if ! "$ROOT_DIR/scripts/reconcile-workstream-notes.sh" --check >/dev/null 2>&1; then
  warn "one or more workstream notes files are outdated (reconciled automatically on main)"
fi

# docs/specs/ naming convention (kebab-case, .md only)
SPECS_DIR="$ROOT_DIR/docs/specs"
if [[ -d "$SPECS_DIR" ]]; then
  while IFS= read -r spec_file; do
    spec_name="$(basename "$spec_file")"
    if [[ "$spec_name" == "README.md" ]]; then
      continue
    fi
    if [[ ! "$spec_name" =~ ^[a-z0-9]+(-[a-z0-9]+)*\.md$ ]]; then
      fail "docs/specs/ file '${spec_name}' does not follow kebab-case.md convention"
    fi
  done < <(find "$SPECS_DIR" -maxdepth 1 -type f -name '*.md' | sort)
fi

if [[ "$FAILURES" -eq 0 ]]; then
  echo "OK: conventions validation passed"
fi

exit "$FAILURES"
