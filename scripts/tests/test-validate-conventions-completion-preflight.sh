#!/usr/bin/env bash
# Test harness for scripts/validate-conventions.sh --completion-preflight.
#
# The preflight mode evaluates the completion-time contract (prior-art for any
# mode, Report for Standard/Critical, Evidence for Quick) for a single task file
# REGARDLESS of its current Status. This lets skills/delivery catch a missing
# field in ~1s, up front, instead of after the task is flipped to COMPLETED and
# the expensive semantic validation pass has already run. Every fixture below is
# Status: IN_PROGRESS on purpose — proving the gate fires before COMPLETED.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
VALIDATOR="$REPO_ROOT/scripts/validate-conventions.sh"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

pass=0
fail=0

assert() {
  local label="$1" cond="$2"
  if eval "$cond"; then
    echo "  PASS: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label"
    fail=$((fail + 1))
  fi
}

# Minimal synthetic project: the preflight path only reads the task file and
# runs `git log` against ROOT_DIR (the project root), so it needs the validator
# in scripts/ and a git repo. The task file is left uncommitted so the
# forward-only prior-art gate sees empty history and applies (as for a fresh
# in-flight task).
make_project() {
  local proj="$TMP_ROOT/$1"
  mkdir -p "$proj/scripts" "$proj/memory-system/tasks"
  cp "$VALIDATOR" "$proj/scripts/validate-conventions.sh"
  chmod +x "$proj/scripts/validate-conventions.sh"
  ( cd "$proj" \
      && git -c init.defaultBranch=main init -q \
      && git -c user.email=t@t -c user.name=t commit --allow-empty -q -m init ) >/dev/null 2>&1
  echo "$proj"
}

# $1=file $2=mode $3=extra-field-lines (newline-separated, may be empty)
write_task() {
  local file="$1" mode="$2" extra="$3"
  {
    cat <<EOF
# TASK-eduoda-20260101120000 - Preflight fixture ($mode)

- Status: IN_PROGRESS
- Priority: 2
- Description: In-flight task used to exercise the completion preflight.
- Depends On: None
- Blocked By: None
- Branch: TASK-eduoda-20260101120000-implement
- Workstreams: [devops]
- Execution Mode: $mode
- Last Updated: 2026-01-01 12:00
EOF
    [[ -n "$extra" ]] && printf '%s\n' "$extra"
  } > "$file"
}

run_preflight() {
  local proj="$1" fx="$2"
  "$proj/scripts/validate-conventions.sh" --completion-preflight "$fx" 2>&1
}

echo "=== Test 1: IN_PROGRESS Quick + Evidence present, prior-art MISSING -> fails on prior-art ==="
proj="$(make_project t1)"
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_task "$fx" "Quick" "- Evidence: AC-01 PASS (self-check)."
out="$(run_preflight "$proj" "$fx")"; ec=$?
assert "exit non-zero" "[ $ec -ne 0 ]"
assert "error mentions prior-art requirement" "echo \"\$out\" | grep -q 'prior-art is required for completed tasks'"
assert "does not complain about evidence (it is present)" "! echo \"\$out\" | grep -q 'evidence is required'"

echo "=== Test 2: IN_PROGRESS Quick + Evidence + prior-art present -> passes ==="
proj="$(make_project t2)"
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_task "$fx" "Quick" "$(printf -- '- Evidence: AC-01 PASS (self-check).\n- prior-art: none')"
out="$(run_preflight "$proj" "$fx")"; ec=$?
assert "exit zero" "[ $ec -eq 0 ]"
assert "prints preflight-passed message" "echo \"\$out\" | grep -q 'completion-contract preflight passed'"

echo "=== Test 3: IN_PROGRESS Quick + prior-art present, Evidence MISSING -> fails on evidence ==="
proj="$(make_project t3)"
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_task "$fx" "Quick" "- prior-art: none"
out="$(run_preflight "$proj" "$fx")"; ec=$?
assert "exit non-zero" "[ $ec -ne 0 ]"
assert "error mentions evidence requirement" "echo \"\$out\" | grep -q 'evidence is required for completed Quick task'"

echo "=== Test 4: IN_PROGRESS Standard + prior-art present, Report MISSING -> fails on report ==="
proj="$(make_project t4)"
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_task "$fx" "Standard" "- prior-art: none"
out="$(run_preflight "$proj" "$fx")"; ec=$?
assert "exit non-zero" "[ $ec -ne 0 ]"
assert "error mentions report requirement" "echo \"\$out\" | grep -q 'report is required for completed Standard task'"

echo "=== Test 5: nonexistent task file -> exit 2 (usage error, not a verdict) ==="
proj="$(make_project t5)"
out="$(run_preflight "$proj" "$proj/memory-system/tasks/DOES-NOT-EXIST.md")"; ec=$?
assert "exit code is 2" "[ $ec -eq 2 ]"
assert "error mentions task file not found" "echo \"\$out\" | grep -q 'task file not found'"

echo "=== Test 6: missing path argument -> exit 2 (usage error) ==="
proj="$(make_project t6)"
out="$("$proj/scripts/validate-conventions.sh" --completion-preflight 2>&1)"; ec=$?
assert "exit code is 2" "[ $ec -eq 2 ]"
assert "prints usage" "echo \"\$out\" | grep -q 'usage:'"

echo "=== Summary ==="
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
