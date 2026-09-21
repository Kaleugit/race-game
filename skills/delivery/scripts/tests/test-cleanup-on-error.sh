#!/usr/bin/env bash
# Test harness for cleanup_on_error() in deliver-to-main.sh.
# Verifies the failure-path worktree cleanup contract (issue #15.4).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DELIVERY_SCRIPT="$SCRIPT_DIR/../deliver-to-main.sh"
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

# Extract cleanup_on_error + its dependencies from the real script and source them.
# We override ROOT_DIR/KEEP_WORKTREE_ON_ERROR per test before calling.
setup_function_env() {
  # shellcheck disable=SC1090
  source <(sed -n '/^cleanup_on_error()/,/^}$/p' "$DELIVERY_SCRIPT")
}

make_test_repo_and_worktree() {
  local repo wt
  repo="$TMP_ROOT/repo-$1"
  wt="$TMP_ROOT/wt-$1"
  git init -q -b main "$repo"
  ( cd "$repo" && git -c user.email=a@b -c user.name=t commit --allow-empty -q -m init )
  git -C "$repo" worktree add -q -b "test-$1" "$wt" >/dev/null
  printf '%s\n%s\n' "$repo" "$wt"
}

setup_function_env

echo "=== Test 1: success path (exit 0) is no-op ==="
read -r repo wt <<< "$(make_test_repo_and_worktree t1 | tr '\n' ' ')"
# shellcheck disable=SC2034
ROOT_DIR="$wt"
# shellcheck disable=SC2034
KEEP_WORKTREE_ON_ERROR=0
cleanup_on_error 0
assert "worktree preserved on success" "[ -d '$wt' ]"

echo "=== Test 2: error + clean worktree + flag unset -> removed ==="
read -r repo wt <<< "$(make_test_repo_and_worktree t2 | tr '\n' ' ')"
# shellcheck disable=SC2034
ROOT_DIR="$wt"
# shellcheck disable=SC2034
KEEP_WORKTREE_ON_ERROR=0
cleanup_on_error 1 2>/dev/null
assert "clean worktree removed on error" "[ ! -d '$wt' ]"

echo "=== Test 3: error + uncommitted -> preserved ==="
read -r repo wt <<< "$(make_test_repo_and_worktree t3 | tr '\n' ' ')"
echo "wip" > "$wt/wip.txt"
# shellcheck disable=SC2034
ROOT_DIR="$wt"
# shellcheck disable=SC2034
KEEP_WORKTREE_ON_ERROR=0
cleanup_on_error 1 2>/dev/null
assert "dirty worktree preserved on error" "[ -f '$wt/wip.txt' ]"

echo "=== Test 4: error + --keep-worktree-on-error -> preserved ==="
read -r repo wt <<< "$(make_test_repo_and_worktree t4 | tr '\n' ' ')"
# shellcheck disable=SC2034
ROOT_DIR="$wt"
# shellcheck disable=SC2034
KEEP_WORKTREE_ON_ERROR=1
cleanup_on_error 1 2>/dev/null
assert "worktree preserved with keep flag" "[ -d '$wt' ]"

echo "=== Test 5: error + primary workspace (.git is dir) -> untouched ==="
primary="$TMP_ROOT/primary"
git init -q -b main "$primary"
( cd "$primary" && git -c user.email=a@b -c user.name=t commit --allow-empty -q -m init )
# shellcheck disable=SC2034
ROOT_DIR="$primary"
# shellcheck disable=SC2034
KEEP_WORKTREE_ON_ERROR=0
cleanup_on_error 1 2>/dev/null
assert "primary workspace untouched on error" "[ -d '$primary/.git' ]"

echo "=== Summary ==="
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
