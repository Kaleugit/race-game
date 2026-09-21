#!/usr/bin/env bash
# Test harness for materialize_lfs_in_worktree() in scripts/create-worktree.sh
# (issue #14 Problem 2). Tests the function in isolation by sourcing it.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CREATE_WT="$SCRIPT_DIR/../create-worktree.sh"
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

# Source only the function (and its top-level dependencies are simple bash).
# shellcheck disable=SC1090
source <(sed -n '/^materialize_lfs_in_worktree()/,/^}$/p' "$CREATE_WT")

# Skip the suite when git lfs is unavailable on this host.
if ! git lfs version >/dev/null 2>&1; then
  echo "SKIP: git lfs not installed on this host."
  exit 0
fi

make_lfs_repo_and_worktree() {
  local id="$1"
  local extra_pattern="${2:-}"   # optional second LFS pattern (e.g. *.skip)
  local extra_name="${3:-}"      # filename to create for that pattern
  local repo="$TMP_ROOT/repo-$id"
  local wt="$TMP_ROOT/wt-$id"

  git init -q -b main "$repo"
  ( cd "$repo" \
    && git -c user.email=a@b -c user.name=t lfs install --local >/dev/null \
    && echo '*.bin filter=lfs diff=lfs merge=lfs -text' > .gitattributes \
    && if [[ -n "$extra_pattern" ]]; then echo "$extra_pattern filter=lfs diff=lfs merge=lfs -text" >> .gitattributes; fi \
    && printf 'BINARY_CONTENT_%s\n' "$id" > sample.bin \
    && if [[ -n "$extra_name" ]]; then printf 'SHOULD_STAY_POINTER_%s\n' "$id" > "$extra_name"; fi \
    && git add .gitattributes sample.bin ${extra_name:+"$extra_name"} \
    && git -c user.email=a@b -c user.name=t commit -q -m init )
  git -C "$repo" worktree add -q --no-checkout -b "test-$id" "$wt" >/dev/null
  # Manually checkout files WITHOUT smudge to simulate GIT_LFS_SKIP_SMUDGE=1.
  GIT_LFS_SKIP_SMUDGE=1 git -C "$wt" checkout main -- . >/dev/null 2>&1
  printf '%s\n%s\n' "$repo" "$wt"
}

make_plain_repo_and_worktree() {
  local id="$1"
  local repo="$TMP_ROOT/plain-repo-$id"
  local wt="$TMP_ROOT/plain-wt-$id"

  git init -q -b main "$repo"
  ( cd "$repo" \
    && echo "hello" > README.md \
    && git add README.md \
    && git -c user.email=a@b -c user.name=t commit -q -m init )
  git -C "$repo" worktree add -q -b "test-plain-$id" "$wt" >/dev/null
  printf '%s\n%s\n' "$repo" "$wt"
}

echo "=== Test 1: repo with no .gitattributes LFS -> no-op (no stdout from function) ==="
read -r _ wt <<< "$(make_plain_repo_and_worktree t1 | tr '\n' ' ')"
out="$(materialize_lfs_in_worktree "$wt" 2>&1 || true)"
assert "no LFS message printed" "[ -z \"\$out\" ]"
assert "worktree still exists" "[ -d '$wt' ]"

echo "=== Test 2: repo with LFS filter -> smudges pointer back to real content ==="
read -r repo wt <<< "$(make_lfs_repo_and_worktree t2 | tr '\n' ' ')"
# Sanity: the worktree currently holds a pointer, not the real content.
grep -q '^version https://git-lfs' "$wt/sample.bin"
out="$(materialize_lfs_in_worktree "$wt" 2>&1)"
assert "log mentions lfs checkout" "echo \"$out\" | grep -q \"Running 'git lfs checkout' in $wt\""
assert "sample.bin smudged to real content" "grep -q '^BINARY_CONTENT_t2$' '$wt/sample.bin'"

echo "=== Test 3: LFS declared but 'git lfs' missing -> warn + continue ==="
read -r repo wt <<< "$(make_lfs_repo_and_worktree t3 | tr '\n' ' ')"
# Simulate a missing git-lfs with shell-function STUBS inside the payload, not
# with surgery on PATH.
#
# Why not PATH: the function warns only when BOTH `command -v git-lfs` and
# `git lfs version` fail, so git-lfs has to be genuinely unreachable. On
# merged-usr Linux (ubuntu-latest) /bin IS /usr/bin, so every directory holding
# git-lfs also holds git, grep AND bash. Dropping them takes the payload's own
# interpreter with it: `PATH=... bash -c` resolves bash through the NEW PATH, so
# the payload dies with 127 and prints nothing — the same red as the bug, for a
# different reason. Verified: `PATH=/nonexistent bash -c ...` -> exit 127,
# "bash: command not found".
#
# The earlier `/usr/bin:/bin` version had the mirror-image flaw: it only hid
# git-lfs where it happens to live elsewhere (Git for Windows keeps it in
# /clangarm64/bin), so it passed locally and failed on CI.
#
# Shell functions win over builtins and over PATH lookup, so stubbing `command`
# and `git` reproduces the exact condition under test — git present, git-lfs
# absent — while every real binary stays available.
lfs_absent_stubs='
command() { if [ "$1" = -v ] && [ "$2" = git-lfs ]; then return 1; fi; builtin command "$@"; }
git() { if [ "$1" = lfs ]; then return 127; fi; builtin command git "$@"; }
'
out="$(bash -c "${lfs_absent_stubs}$(declare -f materialize_lfs_in_worktree); materialize_lfs_in_worktree '$wt'" 2>&1 || true)"
assert "warn printed when lfs missing" "echo \"$out\" | grep -q 'git lfs.* is not installed'"
assert "worktree preserved (no destructive action)" "[ -d '$wt' ]"
# Negative control: the SAME payload without the stubs must NOT warn. Without it,
# an assertion that only checks "warning appeared" cannot tell a working
# simulation from a host that genuinely lacks git-lfs — and a simulation that
# stopped simulating would keep passing. That is the failure mode this whole
# test just spent a night on.
out_control="$(bash -c "$(declare -f materialize_lfs_in_worktree); materialize_lfs_in_worktree '$wt'" 2>&1 || true)"
assert "control: no warn when git-lfs is really present" \
  "! echo \"\$out_control\" | grep -q 'git lfs.* is not installed'"

echo "=== Test 4: .governance/lfs-include scopes the checkout ==="
read -r _ wt <<< "$(make_lfs_repo_and_worktree t4 '*.skip' skipme.skip | tr '\n' ' ')"
mkdir -p "$wt/.governance"
echo "sample.bin" > "$wt/.governance/lfs-include"
materialize_lfs_in_worktree "$wt" >/dev/null 2>&1
assert "sample.bin smudged (in include list)" "grep -q '^BINARY_CONTENT_t4$' '$wt/sample.bin'"
assert "skipme.skip preserved as pointer (not in include list)" "grep -q '^version https://git-lfs' '$wt/skipme.skip'"

echo "=== Summary ==="
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
