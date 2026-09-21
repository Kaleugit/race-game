#!/usr/bin/env bash
# Test harness for scripts/check-delivery-fastpath.sh.
#
# Verifies the retry fast-path eligibility decision: a delivery re-validation may
# inherit the prior semantic verdict only when the delta vs the note's
# `Validated commit` baseline is documentation-only AND touches no protected
# boilerplate path. Anything else must fall back to the full ceremony.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCRIPT_UNDER_TEST="$REPO_ROOT/scripts/check-delivery-fastpath.sh"
PROTECTED_SRC="$REPO_ROOT/skills/delivery/references/protected-boilerplate-paths.txt"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

pass=0
fail=0
assert() {
  local label="$1" cond="$2"
  if eval "$cond"; then echo "  PASS: $label"; pass=$((pass + 1));
  else echo "  FAIL: $label"; fail=$((fail + 1)); fi
}

# Synthetic git repo mirroring the layout the script resolves relative to its own
# location (scripts/ + skills/delivery/references/protected-boilerplate-paths.txt).
make_project() {
  local proj="$TMP_ROOT/$1"
  mkdir -p "$proj/scripts" "$proj/skills/delivery/references" \
           "$proj/memory-system/task-docs" "$proj/memory-system/tasks" \
           "$proj/memory-system/templates" "$proj/src" "$proj/docs"
  cp "$SCRIPT_UNDER_TEST" "$proj/scripts/check-delivery-fastpath.sh"
  chmod +x "$proj/scripts/check-delivery-fastpath.sh"
  cp "$PROTECTED_SRC" "$proj/skills/delivery/references/protected-boilerplate-paths.txt"
  ( cd "$proj" \
      && git -c init.defaultBranch=main init -q \
      && git config user.email t@t && git config user.name t \
      && echo base > docs/base.md \
      && git add -A && git commit -q -m base ) >/dev/null 2>&1
  echo "$proj"
}

write_note() {  # $1=file $2=baseline-sha (omit for no field)
  local file="$1"
  { echo "# Delivery Validation Note"; echo "## Metadata";
    [[ $# -ge 2 ]] && echo "- Validated commit: $2"; } > "$file"
}

commit_change() {  # $1=proj $2=path
  local proj="$1" path="$2"
  mkdir -p "$proj/$(dirname "$path")"
  echo change >> "$proj/$path"
  ( cd "$proj" && git add -A && git commit -q -m "change $path" ) >/dev/null 2>&1
}

run() { "$1/scripts/check-delivery-fastpath.sh" --note "$2" 2>&1; }

echo "=== Test 1: docs-only delta (task metadata file) -> eligible (exit 0) ==="
proj="$(make_project t1)"; base="$(git -C "$proj" rev-parse HEAD)"
note="$proj/memory-system/task-docs/note.md"; write_note "$note" "$base"
commit_change "$proj" "memory-system/tasks/TASK-eduoda-20260101120000.md"
out="$(run "$proj" "$note")"; ec=$?
assert "exit 0" "[ $ec -eq 0 ]"
assert "reports ELIGIBLE" "echo \"\$out\" | grep -q 'ELIGIBLE'"

echo "=== Test 2: non-docs delta (src code) -> not eligible (exit 1) ==="
proj="$(make_project t2)"; base="$(git -C "$proj" rev-parse HEAD)"
note="$proj/memory-system/task-docs/note.md"; write_note "$note" "$base"
commit_change "$proj" "src/app.js"
out="$(run "$proj" "$note")"; ec=$?
assert "exit 1" "[ $ec -eq 1 ]"
assert "reports non-documentation" "echo \"\$out\" | grep -q 'non-documentation files changed'"

echo "=== Test 3: docs file but PROTECTED (AGENTS.md) -> not eligible (exit 1) ==="
proj="$(make_project t3)"; base="$(git -C "$proj" rev-parse HEAD)"
note="$proj/memory-system/task-docs/note.md"; write_note "$note" "$base"
commit_change "$proj" "AGENTS.md"
out="$(run "$proj" "$note")"; ec=$?
assert "exit 1" "[ $ec -eq 1 ]"
assert "reports protected paths" "echo \"\$out\" | grep -q 'protected boilerplate paths changed'"

echo "=== Test 4: docs file but PROTECTED (memory-system/templates/*) -> not eligible (exit 1) ==="
proj="$(make_project t4)"; base="$(git -C "$proj" rev-parse HEAD)"
note="$proj/memory-system/task-docs/note.md"; write_note "$note" "$base"
commit_change "$proj" "memory-system/templates/some-template.md"
out="$(run "$proj" "$note")"; ec=$?
assert "exit 1" "[ $ec -eq 1 ]"
assert "reports protected paths" "echo \"\$out\" | grep -q 'protected boilerplate paths changed'"

echo "=== Test 5: no changes since baseline -> eligible (exit 0) ==="
proj="$(make_project t5)"; base="$(git -C "$proj" rev-parse HEAD)"
note="$proj/memory-system/task-docs/note.md"; write_note "$note" "$base"
out="$(run "$proj" "$note")"; ec=$?
assert "exit 0" "[ $ec -eq 0 ]"
assert "reports no changes" "echo \"\$out\" | grep -q 'no changes since validated baseline'"

echo "=== Test 6: note without 'Validated commit' -> cannot determine (exit 2) ==="
proj="$(make_project t6)"
note="$proj/memory-system/task-docs/note.md"; write_note "$note"
out="$(run "$proj" "$note")"; ec=$?
assert "exit 2" "[ $ec -eq 2 ]"
assert "reports NO-BASELINE" "echo \"\$out\" | grep -q 'NO-BASELINE'"

echo "=== Test 7: placeholder '<sha>' baseline -> cannot determine (exit 2) ==="
proj="$(make_project t7)"
note="$proj/memory-system/task-docs/note.md"; write_note "$note" "<sha>"
out="$(run "$proj" "$note")"; ec=$?
assert "exit 2" "[ $ec -eq 2 ]"

echo "=== Test 8: bogus baseline sha -> cannot determine (exit 2) ==="
proj="$(make_project t8)"
note="$proj/memory-system/task-docs/note.md"; write_note "$note" "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
out="$(run "$proj" "$note")"; ec=$?
assert "exit 2" "[ $ec -eq 2 ]"
assert "reports unknown commit" "echo \"\$out\" | grep -q 'not a known commit'"

echo "=== Test 9: missing --note argument -> usage error (exit 2) ==="
proj="$(make_project t9)"
out="$("$proj/scripts/check-delivery-fastpath.sh" 2>&1)"; ec=$?
assert "exit 2" "[ $ec -eq 2 ]"

echo "=== Test 10: mixed delta (docs + code) -> not eligible (exit 1) ==="
proj="$(make_project t10)"; base="$(git -C "$proj" rev-parse HEAD)"
note="$proj/memory-system/task-docs/note.md"; write_note "$note" "$base"
mkdir -p "$proj/src"; echo x >> "$proj/docs/extra.md"; echo y >> "$proj/src/lib.js"
( cd "$proj" && git add -A && git commit -q -m mixed ) >/dev/null 2>&1
out="$(run "$proj" "$note")"; ec=$?
assert "exit 1" "[ $ec -eq 1 ]"
assert "reports non-documentation" "echo \"\$out\" | grep -q 'non-documentation files changed'"

echo "=== Summary ==="
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
