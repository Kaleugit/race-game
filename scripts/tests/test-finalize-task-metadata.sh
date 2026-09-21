#!/usr/bin/env bash
# Test harness for scripts/finalize-task-metadata.sh (issue #12 Option B).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPDATER="$SCRIPT_DIR/../finalize-task-metadata.sh"
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

# Build a synthetic project root with just memory-system/tasks/ + the updater symlinked
# so ROOT_DIR resolution inside the updater points at the synthetic root.
make_project() {
  local proj="$TMP_ROOT/$1"
  mkdir -p "$proj/memory-system/tasks" "$proj/scripts"
  cp "$UPDATER" "$proj/scripts/finalize-task-metadata.sh"
  chmod +x "$proj/scripts/finalize-task-metadata.sh"
  echo "$proj"
}

write_fixture() {
  local file="$1"
  cat > "$file" <<'EOF'
# TASK-eduoda-20260101120000 - Fixture task

- Status: IN_PROGRESS
- Priority: 2
- Description: Fixture for finalize-task-metadata tests.
- Depends On: None
- Blocked By: None
- Branch: TASK-eduoda-20260101120000-implement
- Workstreams: [devops]
- Execution Mode: Standard
- Last Updated: 2026-01-01 12:00
- Started: 2026-01-01 12:00
- Report: TASK-eduoda-20260101120000-implement-report-2026-01-01.md

## Acceptance Criteria
- AC-01: placeholder.
EOF
}

write_fixture_quick_with_evidence() {
  local file="$1"
  cat > "$file" <<'EOF'
# TASK-eduoda-20260101120000 - Fixture task (Quick + Evidence)

- Status: IN_PROGRESS
- Priority: 2
- Description: Fixture for the gate's happy path.
- Depends On: None
- Blocked By: None
- Branch: TASK-eduoda-20260101120000-implement
- Workstreams: [devops]
- Execution Mode: Quick
- Last Updated: 2026-01-01 12:00
- Started: 2026-01-01 12:00
- Evidence: AC-01 PASS (synthetic).

## Acceptance Criteria
- AC-01: placeholder.
EOF
}

write_fixture_quick_no_evidence() {
  local file="$1"
  cat > "$file" <<'EOF'
# TASK-eduoda-20260101120000 - Fixture task (Quick missing Evidence)

- Status: IN_PROGRESS
- Priority: 2
- Description: Fixture for the gate's refuse-completion path.
- Depends On: None
- Blocked By: None
- Branch: TASK-eduoda-20260101120000-implement
- Workstreams: [devops]
- Execution Mode: Quick
- Last Updated: 2026-01-01 12:00
- Started: 2026-01-01 12:00

## Acceptance Criteria
- AC-01: placeholder.
EOF
}

write_fixture_standard_no_report() {
  local file="$1"
  cat > "$file" <<'EOF'
# TASK-eduoda-20260101120000 - Fixture task (Standard missing Report)

- Status: IN_PROGRESS
- Priority: 2
- Description: Fixture for the gate's refuse-completion path (Standard).
- Depends On: None
- Blocked By: None
- Branch: TASK-eduoda-20260101120000-implement
- Workstreams: [devops]
- Execution Mode: Standard
- Last Updated: 2026-01-01 12:00
- Started: 2026-01-01 12:00

## Acceptance Criteria
- AC-01: placeholder.
EOF
}

echo "=== Test 1: missing task file -> exit 0 with skip message ==="
proj="$(make_project t1)"
out="$("$proj/scripts/finalize-task-metadata.sh" --task-id TASK-eduoda-20260101120000 --pr 42 --merged-at 2026-06-12T16:00:00Z 2>&1)"; ec=$?
assert "exit 0" "[ $ec -eq 0 ]"
assert "skip message printed" "echo \"$out\" | grep -q 'task file not found'"

echo "=== Test 2: full update on IN_PROGRESS fixture ==="
proj="$(make_project t2)"
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_fixture "$fx"
"$proj/scripts/finalize-task-metadata.sh" --task-id TASK-eduoda-20260101120000 --pr 42 --merged-at 2026-06-12T16:02:36Z >/dev/null
assert "Status -> COMPLETED" "grep -qE '^- Status: COMPLETED$' '$fx'"
assert "Delivery PR -> #42" "grep -qE '^- Delivery PR: #42$' '$fx'"
assert "Delivery Status -> MERGED" "grep -qE '^- Delivery Status: MERGED$' '$fx'"
assert "Delivery Merged At -> 2026-06-12 16:02" "grep -qE '^- Delivery Merged At: 2026-06-12 16:02$' '$fx'"
assert "Completed appended -> 2026-06-12 16:02" "grep -qE '^- Completed: 2026-06-12 16:02$' '$fx'"
assert "Delivery Handoff -> DONE" "grep -qE '^- Delivery Handoff: DONE \(owner: github-actions\)$' '$fx'"
assert "Last Updated changed" "! grep -qE '^- Last Updated: 2026-01-01 12:00$' '$fx'"
assert "metadata stays above first heading" "awk '/^## /{exit} /^- Delivery PR:/{found=1} END{exit !found}' '$fx'"

echo "=== Test 3: idempotency — second run is a no-op ==="
proj="$(make_project t3)"
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_fixture "$fx"
"$proj/scripts/finalize-task-metadata.sh" --task-id TASK-eduoda-20260101120000 --pr 42 --merged-at 2026-06-12T16:02:36Z >/dev/null
cp "$fx" "$fx.first"
out="$("$proj/scripts/finalize-task-metadata.sh" --task-id TASK-eduoda-20260101120000 --pr 42 --merged-at 2026-06-12T16:02:36Z 2>&1)"
assert "second run prints no-op" "echo \"$out\" | grep -q 'already final'"
assert "file unchanged after second run" "cmp -s '$fx' '$fx.first'"

echo "=== Test 4: partial fixture — only some Delivery fields missing ==="
proj="$(make_project t4)"
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_fixture "$fx"
# Manually pre-populate some fields, leave others missing.
# sed -i.bak + a\ multilinha: portátil entre GNU sed e BSD sed (macOS).
sed -i.bak \
  -e 's/^- Status: IN_PROGRESS$/- Status: COMPLETED/' \
  -e '/^- Started: 2026-01-01 12:00$/a\
- Delivery PR: #99' \
  "$fx" && rm -f "$fx.bak"
"$proj/scripts/finalize-task-metadata.sh" --task-id TASK-eduoda-20260101120000 --pr 42 --merged-at 2026-06-12T16:02:36Z >/dev/null
assert "existing Delivery PR replaced with #42" "grep -qE '^- Delivery PR: #42$' '$fx' && ! grep -qE '^- Delivery PR: #99$' '$fx'"
assert "missing Delivery Merged At added" "grep -qE '^- Delivery Merged At: 2026-06-12 16:02$' '$fx'"
assert "missing Delivery Status added" "grep -qE '^- Delivery Status: MERGED$' '$fx'"

echo "=== Test 5: invalid args -> exit 1 ==="
proj="$(make_project t5)"
"$proj/scripts/finalize-task-metadata.sh" --task-id "" --pr 42 --merged-at 2026-06-12T16:00:00Z >/dev/null 2>&1; ec=$?
assert "missing task-id -> exit 1" "[ $ec -eq 1 ]"
"$proj/scripts/finalize-task-metadata.sh" --task-id BADID --pr 42 --merged-at 2026-06-12T16:00:00Z >/dev/null 2>&1; ec=$?
assert "invalid task-id format -> exit 1" "[ $ec -eq 1 ]"
"$proj/scripts/finalize-task-metadata.sh" --task-id TASK-eduoda-20260101120000 --pr 42 --merged-at "not-a-date" >/dev/null 2>&1; ec=$?
assert "invalid merged-at -> exit 1" "[ $ec -eq 1 ]"

echo "=== Test 6: epic-linked task id is accepted ==="
proj="$(make_project t6)"
fx="$proj/memory-system/tasks/TASK-eduoda-EP-007-01.md"
write_fixture "$fx"
# Update fixture header for clarity (content shape is what matters).
sed -i.bak '1s/.*/# TASK-eduoda-EP-007-01 - Epic-linked fixture/' "$fx" && rm -f "$fx.bak"
"$proj/scripts/finalize-task-metadata.sh" --task-id TASK-eduoda-EP-007-01 --pr 7 --merged-at 2026-06-12T16:02:36Z >/dev/null
assert "epic-linked Status updated" "grep -qE '^- Status: COMPLETED$' '$fx'"
assert "epic-linked Delivery PR set" "grep -qE '^- Delivery PR: #7$' '$fx'"

echo "=== Test 7: Quick mode + missing Evidence -> refuses to complete ==="
proj="$(make_project t7)"
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_fixture_quick_no_evidence "$fx"
cp "$fx" "$fx.before"
out="$("$proj/scripts/finalize-task-metadata.sh" --task-id TASK-eduoda-20260101120000 --pr 42 --merged-at 2026-06-12T16:02:36Z 2>&1)"
assert "warn about missing Evidence printed" "echo \"$out\" | grep -q \"Evidence' field is missing\""
assert "task file untouched" "cmp -s '$fx' '$fx.before'"

echo "=== Test 8: Quick mode + Evidence present -> normal update ==="
proj="$(make_project t8)"
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_fixture_quick_with_evidence "$fx"
"$proj/scripts/finalize-task-metadata.sh" --task-id TASK-eduoda-20260101120000 --pr 42 --merged-at 2026-06-12T16:02:36Z >/dev/null
assert "Quick+Evidence Status -> COMPLETED" "grep -qE '^- Status: COMPLETED$' '$fx'"
assert "Quick+Evidence Delivery PR set" "grep -qE '^- Delivery PR: #42$' '$fx'"
assert "Evidence preserved" "grep -qE '^- Evidence: AC-01 PASS' '$fx'"

echo "=== Test 9: Standard mode + missing Report -> refuses to complete ==="
proj="$(make_project t9)"
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_fixture_standard_no_report "$fx"
cp "$fx" "$fx.before"
out="$("$proj/scripts/finalize-task-metadata.sh" --task-id TASK-eduoda-20260101120000 --pr 42 --merged-at 2026-06-12T16:02:36Z 2>&1)"
assert "warn about missing Report printed" "echo \"$out\" | grep -q \"Report' field is missing\""
assert "Standard task file untouched" "cmp -s '$fx' '$fx.before'"

echo "=== Test 10: task file without Execution Mode line -> refuses to complete ==="
proj="$(make_project t10)"
fx="$proj/memory-system/tasks/TASK-eduoda-20260101120000.md"
write_fixture "$fx"
# Strip the Execution Mode line entirely.
sed -i.bak '/^- Execution Mode:/d' "$fx" && rm -f "$fx.bak"
cp "$fx" "$fx.before"
out="$("$proj/scripts/finalize-task-metadata.sh" --task-id TASK-eduoda-20260101120000 --pr 42 --merged-at 2026-06-12T16:02:36Z 2>&1)"
assert "warn about missing Execution Mode printed" "echo \"$out\" | grep -q 'no .Execution Mode'"
assert "no-mode task file untouched" "cmp -s '$fx' '$fx.before'"

echo "=== Summary ==="
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
