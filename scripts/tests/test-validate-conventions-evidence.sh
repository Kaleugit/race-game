#!/usr/bin/env bash
# Test harness for scripts/validate-conventions.sh — Evidence field-line vs heading.
#
# Validates the asymmetry fix between the finalize-task-metadata Action and
# validate-conventions.sh: both must require the `- Evidence:` field-line format
# and reject `## Evidence` heading-only as evidence on COMPLETED Quick tasks.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd && cd ..)"
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

# Build a synthetic project root that mirrors the layout validate-conventions.sh
# expects (it resolves ROOT_DIR relative to its own script location).
make_project() {
  local proj="$TMP_ROOT/$1"
  mkdir -p \
    "$proj/scripts" \
    "$proj/memory-system/tasks" \
    "$proj/memory-system/workstreams" \
    "$proj/docs"
  # Copy validator + sibling helpers it shells out to (reconcile-*).
  cp "$VALIDATOR" "$proj/scripts/validate-conventions.sh"
  chmod +x "$proj/scripts/validate-conventions.sh"
  for helper in reconcile-task-index.sh reconcile-session-log.sh reconcile-workstream-notes.sh; do
    cp "$REPO_ROOT/scripts/$helper" "$proj/scripts/$helper"
    chmod +x "$proj/scripts/$helper"
  done
  # Minimal required files for the validator's early checks.
  : > "$proj/AGENTS.md"
  : > "$proj/INTEGRITY-RULES.md"
  : > "$proj/CHANGELOG.md"
  : > "$proj/BRIEFING.md"
  : > "$proj/docs/PROJECT_SPECS.md"
  : > "$proj/memory-system/1-project-context.md"
  : > "$proj/memory-system/session-log.md"
  cat > "$proj/.gitignore" <<'EOF'
node_modules/
dist/
.vite/
EOF
  cat > "$proj/memory-system/2-tasks.md" <<'EOF'
# Tasks

- Current Status: `PRE_BOOTSTRAP`

## Task Index (Auto-generated)
<!-- TASK_INDEX:START -->
<!-- TASK_INDEX:END -->
EOF
  # skills/ dir to satisfy the workstream-mapping scan.
  mkdir -p "$proj/skills"
  # The validator's forward-only prior-art gate runs `git log` against ROOT_DIR;
  # real projects are git repos, so the sandbox must be one too (otherwise git
  # returns 128 and the gate crashes before its intended empty-history handling).
  ( cd "$proj" \
      && git -c init.defaultBranch=main init -q \
      && git -c user.email=t@t -c user.name=t commit --allow-empty -q -m init ) >/dev/null 2>&1
  echo "$proj"
}

write_quick_with_heading_only() {
  # COMPLETED Quick task with `## Evidence` heading but no `- Evidence:` line.
  local file="$1"
  cat > "$file" <<'EOF'
# TASK-eduoda-20260101120000 - Heading-only evidence fixture

- Status: COMPLETED
- Priority: 2
- Description: Heading-only evidence (should fail validation).
- Depends On: None
- Blocked By: None
- Branch: TASK-eduoda-20260101120000-implement
- Workstreams: [devops]
- Execution Mode: Quick
- Last Updated: 2026-01-01 12:00

## Evidence
AC-01 PASS via heading (this format is rejected by validate-conventions.sh).
EOF
}

write_quick_with_field_line() {
  # COMPLETED Quick task with proper `- Evidence:` field-line.
  local file="$1"
  cat > "$file" <<'EOF'
# TASK-eduoda-20260101120000 - Field-line evidence fixture

- Status: COMPLETED
- Priority: 2
- Description: Field-line evidence (should pass validation).
- Depends On: None
- Blocked By: None
- Branch: TASK-eduoda-20260101120000-implement
- Workstreams: [devops]
- Execution Mode: Quick
- Last Updated: 2026-01-01 12:00
- Evidence: AC-01 PASS (validate-conventions.sh self-check).
- prior-art: none
EOF
}

echo "=== Test 1: COMPLETED Quick + only '## Evidence' heading -> fails with field-line guidance ==="
proj="$(make_project t1)"
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_quick_with_heading_only "$fx"
out="$("$proj/scripts/validate-conventions.sh" 2>&1)"; ec=$?
assert "exit non-zero" "[ $ec -ne 0 ]"
assert "error mentions evidence requirement" "echo \"\$out\" | grep -q 'evidence is required for completed Quick task'"
assert "error explains expected field-line format" "echo \"\$out\" | grep -q \"'- Evidence: <content>'\""
assert "error warns against '## Evidence' heading" "echo \"\$out\" | grep -q \"'## Evidence' heading\""

echo "=== Test 2: COMPLETED Quick + proper '- Evidence:' field-line -> passes ==="
proj="$(make_project t2)"
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_quick_with_field_line "$fx"
out="$("$proj/scripts/validate-conventions.sh" 2>&1)"; ec=$?
assert "exit zero" "[ $ec -eq 0 ]"
assert "no evidence-required error" "! echo \"\$out\" | grep -q 'evidence is required for completed Quick task'"

echo "=== Test 3: COMPLETED task in a NON-git dir -> degrades gracefully (no exit 128 crash) ==="
# Regression for the prior-art gate: `git log | tail` under set -e+pipefail crashed
# with exit 128 outside a git repo before its empty-history handling could run.
proj="$(make_project t3)"
rm -rf "$proj/.git"   # make it a non-git directory
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_quick_with_field_line "$fx"
out="$("$proj/scripts/validate-conventions.sh" 2>&1)"; ec=$?
assert "does not crash with git error 128" "[ $ec -ne 128 ]"
assert "produces a normal verdict (exit 0 or 1), not a crash" "[ $ec -eq 0 ] || [ $ec -eq 1 ]"

echo "=== Summary ==="
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
