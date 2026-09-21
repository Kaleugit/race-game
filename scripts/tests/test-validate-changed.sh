#!/usr/bin/env bash
# Test harness for scripts/validate-changed.sh — the INCREMENTAL delivery gate.
#
# Asserts the gate validates ONLY the branch's change set (base...tip ∪ working
# tree): completion-preflight on changed TASK-*.md, scoped link-check on changed
# .md, and — critically (issue #58) — that a PRE-EXISTING defect in an UNCHANGED
# file does NOT fail this branch's gate (attribution: red == THIS branch).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX GIT_COMMON_DIR 2>/dev/null || true

pass=0; fail=0
assert() { if eval "$2"; then echo "  PASS: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

# A self-contained project carrying the scripts the gate composes.
make_project() {
  local proj="$TMP_ROOT/$1"; mkdir -p "$proj/scripts" "$proj/memory-system/tasks"
  cp "$REPO_ROOT/scripts/validate-changed.sh" "$proj/scripts/"
  cp "$REPO_ROOT/scripts/validate-links.sh" "$proj/scripts/"
  cp "$REPO_ROOT/scripts/validate-conventions.sh" "$proj/scripts/"
  cp "$REPO_ROOT/scripts/validate-placeholders.sh" "$proj/scripts/"
  chmod +x "$proj/scripts/"*.sh
  ( cd "$proj" \
      && git -c init.defaultBranch=main init -q \
      && printf '# Base\n' > base.md \
      && git add -A && git -c user.email=t@t -c user.name=t commit -q -m init \
      && git update-ref refs/remotes/origin/main main \
      && git checkout -q -b feat ) >/dev/null 2>&1
  echo "$proj"
}
gate() { ( cd "$1" && bash scripts/validate-changed.sh "${@:2}" 2>&1 ); }

echo "=== T1: clean changed .md -> exit 0 ==="
p="$(make_project t1)"
( cd "$p" && printf '# Doc\n[base](base.md)\n' > doc.md && git add -A \
  && git -c user.email=t@t -c user.name=t commit -q -m doc )
out="$(gate "$p")"; ec=$?
assert "T1 exit 0" "[ $ec -eq 0 ]"
assert "T1 reports pass" "echo \"\$out\" | grep -q 'incremental delivery gate passed'"

echo "=== T2: changed .md with a broken link -> exit 1 ==="
p="$(make_project t2)"
( cd "$p" && printf '# Doc\n[missing](nope-does-not-exist.md)\n' > doc.md && git add -A \
  && git -c user.email=t@t -c user.name=t commit -q -m doc )
out="$(gate "$p")"; ec=$?
assert "T2 exit 1" "[ $ec -eq 1 ]"
assert "T2 names the broken link" "echo \"\$out\" | grep -q 'broken link'"

echo "=== T3: bad base ref -> exit 2 ==="
p="$(make_project t3)"
out="$(gate "$p" --base origin/does-not-exist)"; ec=$?
assert "T3 exit 2" "[ $ec -eq 2 ]"
assert "T3 explains the missing ref" "echo \"\$out\" | grep -q 'base ref not found'"

echo "=== T4: no changes vs base -> exit 0 ==="
p="$(make_project t4)"   # feat has no commits beyond main
out="$(gate "$p")"; ec=$?
assert "T4 exit 0" "[ $ec -eq 0 ]"
assert "T4 reports nothing to validate" "echo \"\$out\" | grep -q 'no changed files'"

echo "=== T5: changed TASK-*.md missing completion contract -> exit 1 (preflight fires) ==="
p="$(make_project t5)"
fx="$p/memory-system/tasks/TASK-eduoda-20260101120000.md"
cat > "$fx" <<'EOF'
# TASK-eduoda-20260101120000 - Incremental gate fixture

- Status: IN_PROGRESS
- Priority: 2
- Description: In-flight task with NO prior-art field.
- Depends On: None
- Blocked By: None
- Branch: TASK-eduoda-20260101120000-implement
- Workstreams: [devops]
- Execution Mode: Quick
- Last Updated: 2026-01-01 12:00
- Evidence: AC-01 PASS (self-check).
EOF
( cd "$p" && git add -A && git -c user.email=t@t -c user.name=t commit -q -m task )
out="$(gate "$p")"; ec=$?
assert "T5 exit 1" "[ $ec -eq 1 ]"
assert "T5 runs the preflight on the task file" "echo \"\$out\" | grep -q 'preflight'"

echo "=== T6 (ATTRIBUTION, #58): pre-existing broken link in an UNCHANGED file does NOT fail ==="
p="$(make_project t6)"
# Plant a pre-existing defect on base (an unchanged file with a broken link)...
( cd "$p" && git checkout -q main \
  && printf '# Sibling\n[dead](gone.md)\n' > sibling.md && git add -A \
  && git -c user.email=t@t -c user.name=t commit -q -m sibling \
  && git update-ref refs/remotes/origin/main main \
  && git checkout -q feat && git merge -q main \
  && printf '# Mine\n[base](base.md)\n' > mine.md && git add -A \
  && git -c user.email=t@t -c user.name=t commit -q -m mine )
out="$(gate "$p")"; ec=$?
assert "T6 exit 0 (sibling defect not attributed to this branch)" "[ $ec -eq 0 ]"
assert "T6 did not even check the unchanged sibling" "! echo \"\$out\" | grep -q 'sibling.md'"

echo "=== T7 (#57): changed TASK with invalid Planning (inline, not a real file) -> exit 1 ==="
p="$(make_project t7)"
cat > "$p/memory-system/tasks/TASK-eduoda-EP-001-01.md" <<'EOF'
# TASK-eduoda-EP-001-01 - fixture
- Status: IN_PROGRESS
- Priority: 2
- Description: x
- Depends On: None
- Blocked By: None
- Branch: TASK-eduoda-EP-001-01-implement
- Workstreams: [devops]
- Execution Mode: Standard
- Last Updated: 2026-01-01 12:00
- prior-art: none
- Planning: inline text not a path
EOF
( cd "$p" && git add -A && git -c user.email=t@t -c user.name=t commit -q -m task )
out="$(gate "$p")"; ec=$?
assert "T7 exit 1 (naive completion-only gate would have missed this)" "[ $ec -eq 1 ]"
assert "T7 flags the Planning artifact" "echo \"\$out\" | grep -qi 'Planning'"

echo "=== T8 (#57): changed TASK with a placeholder required field -> exit 1 ==="
p="$(make_project t8)"
cat > "$p/memory-system/tasks/TASK-eduoda-EP-001-02.md" <<'EOF'
# TASK-eduoda-EP-001-02 - fixture
- Status: IN_PROGRESS
- Priority: 2
- Description: x
- Depends On: None
- Blocked By: None
- Branch: TASK-eduoda-EP-001-02-implement
- Workstreams: [devops]
- Execution Mode: Quick
- Last Updated: YYYY-MM-DD HH:MM
EOF
( cd "$p" && git add -A && git -c user.email=t@t -c user.name=t commit -q -m task )
out="$(gate "$p")"; ec=$?
assert "T8 exit 1" "[ $ec -eq 1 ]"
assert "T8 flags the placeholder field" "echo \"\$out\" | grep -qi 'placeholder'"

echo "=== T9 (#57): changed TASK valid (real Planning+Report files, no placeholders) -> exit 0 ==="
p="$(make_project t9)"
mkdir -p "$p/memory-system/task-docs"
printf '# planning\n' > "$p/memory-system/task-docs/plan.md"
printf '# report\n'   > "$p/memory-system/task-docs/report.md"
# Standard task with the FULL completion contract satisfied (preflight evaluates it
# proactively regardless of Status): Planning + Report are real files, prior-art set.
cat > "$p/memory-system/tasks/TASK-eduoda-EP-001-03.md" <<'EOF'
# TASK-eduoda-EP-001-03 - fixture
- Status: COMPLETED
- Priority: 2
- Description: x
- Depends On: None
- Blocked By: None
- Branch: TASK-eduoda-EP-001-03-implement
- Workstreams: [devops]
- Execution Mode: Standard
- Last Updated: 2026-01-01 12:00
- prior-art: none
- Planning: memory-system/task-docs/plan.md
- Report: memory-system/task-docs/report.md
EOF
( cd "$p" && git add -A && git -c user.email=t@t -c user.name=t commit -q -m task )
out="$(gate "$p")"; ec=$?
assert "T9 exit 0 (valid task passes the full per-file gate)" "[ $ec -eq 0 ]"

echo
if [ "$fail" -eq 0 ]; then echo "ALL PASS ($pass)"; else echo "FAILED ($fail of $((pass+fail)))"; exit 1; fi
