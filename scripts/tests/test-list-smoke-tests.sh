#!/usr/bin/env bash
# Test harness for scripts/list-smoke-tests.sh (issue #14 Problem 3 Part B).
# Creates synthetic git repos with controlled diffs and asserts the script's
# output.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIST_SCRIPT="$SCRIPT_DIR/../list-smoke-tests.sh"
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

mkrepo() {
  local id="$1"
  local repo="$TMP_ROOT/repo-$id"
  mkdir -p "$repo"
  git init -q -b main "$repo"
  ( cd "$repo" && git -c user.email=a@b -c user.name=t commit --allow-empty -q -m init )
  echo "$repo"
}

stage_and_modify() {
  # stage_and_modify <repo> <relpath> <content>
  local repo="$1" rel="$2" content="${3:-modified}"
  mkdir -p "$repo/$(dirname "$rel")"
  printf '%s\n' "$content" > "$repo/$rel"
  ( cd "$repo" && git add "$rel" && git -c user.email=a@b -c user.name=t commit -q -m "change $rel" )
}

mkdir_p_at() {
  mkdir -p "$1"
  # Ensure git sees the directory if it's just an empty marker.
  : > "$1/.gitkeep"
}

echo "=== Test 1: sibling __tests__ directory next to changed file ==="
repo="$(mkrepo t1)"
mkdir_p_at "$repo/src/foo/__tests__"
( cd "$repo" && git add src/foo/__tests__/.gitkeep && git -c user.email=a@b -c user.name=t commit -q -m seed )
git -C "$repo" branch wip
git -C "$repo" checkout -q wip
stage_and_modify "$repo" "src/foo/bar.py" "print('hi')"
out="$("$LIST_SCRIPT" --root "$repo" --diff-base main)"
assert "emits src/foo/__tests__" "echo \"$out\" | grep -qx 'src/foo/__tests__'"

echo "=== Test 2: tests/<dir> mirror layout ==="
repo="$(mkrepo t2)"
mkdir_p_at "$repo/tests/src/foo"
( cd "$repo" && git add tests/src/foo/.gitkeep && git -c user.email=a@b -c user.name=t commit -q -m seed )
git -C "$repo" branch wip
git -C "$repo" checkout -q wip
stage_and_modify "$repo" "src/foo/bar.py" "print('hi')"
out="$("$LIST_SCRIPT" --root "$repo" --diff-base main)"
assert "emits tests/src/foo" "echo \"$out\" | grep -qx 'tests/src/foo'"

echo "=== Test 3: changed file is itself a test file -> self-emit ==="
repo="$(mkrepo t3)"
git -C "$repo" branch wip
git -C "$repo" checkout -q wip
stage_and_modify "$repo" "lib/foo.test.ts" "// test"
out="$("$LIST_SCRIPT" --root "$repo" --diff-base main)"
assert "emits the test file itself" "echo \"$out\" | grep -qx 'lib/foo.test.ts'"

echo "=== Test 4: config file maps prefix to test target ==="
repo="$(mkrepo t4)"
mkdir -p "$repo/.governance" "$repo/tests/components"
cat > "$repo/.governance/smoke-tests.conf" <<'CONF'
# project mapping
public/components/  tests/components/
CONF
( cd "$repo" && git add .governance tests && git -c user.email=a@b -c user.name=t commit -q -m seed )
git -C "$repo" branch wip
git -C "$repo" checkout -q wip
stage_and_modify "$repo" "public/components/x.js" "console.log('x')"
out="$("$LIST_SCRIPT" --root "$repo" --diff-base main)"
assert "config rule emits tests/components/" "echo \"$out\" | grep -qx 'tests/components/'"

echo "=== Test 5: no diff -> empty output ==="
repo="$(mkrepo t5)"
git -C "$repo" branch wip
git -C "$repo" checkout -q wip
out="$("$LIST_SCRIPT" --root "$repo" --diff-base main)"
assert "empty when no diff" "[ -z \"$out\" ]"

echo "=== Test 6: heuristic + config union, deduped ==="
repo="$(mkrepo t6)"
mkdir -p "$repo/src/foo/__tests__" "$repo/.governance"
cat > "$repo/.governance/smoke-tests.conf" <<'CONF'
src/foo/  src/foo/__tests__
CONF
( cd "$repo" && git add src .governance && git -c user.email=a@b -c user.name=t commit -q -m seed )
git -C "$repo" branch wip
git -C "$repo" checkout -q wip
stage_and_modify "$repo" "src/foo/bar.py" "x = 1"
out="$("$LIST_SCRIPT" --root "$repo" --diff-base main)"
count="$(echo "$out" | grep -cx 'src/foo/__tests__' || true)"
assert "emitted exactly once (deduped)" "[ \"$count\" -eq 1 ]"

echo "=== Summary ==="
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
