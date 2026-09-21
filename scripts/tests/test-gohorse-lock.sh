#!/usr/bin/env bash
# test-gohorse-lock.sh — harness for scripts/gohorse-lock.sh
# Mirrors the repo test convention: set -uo pipefail (NO -e), mktemp sandbox,
# pass/fail counters + assert helper, numbered cases, PASS=/FAIL= summary.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK="$SCRIPT_DIR/../gohorse-lock.sh"
TMP_ROOT="$(mktemp -d)"
trap 'rm -rf "$TMP_ROOT"' EXIT

pass=0
fail=0
assert() {
  local label="$1" cond="$2"
  if eval "$cond"; then
    echo "  ok: $label"
    pass=$((pass + 1))
  else
    echo "  FAIL: $label  [cond: $cond]"
    fail=$((fail + 1))
  fi
}

GIT="git -c user.email=t@t -c user.name=t -c init.defaultBranch=main -c commit.gpgsign=false"

# A repo plus one linked worktree on a separate branch — the gohorse substrate
# (subagents in worktrees sharing one .git). Both must resolve the SAME lockdir.
REPO="$TMP_ROOT/repo"
$GIT init -q "$REPO" >/dev/null 2>&1
( cd "$REPO" && $GIT commit --allow-empty -q -m init )
WT="$TMP_ROOT/wt"
( cd "$REPO" && $GIT worktree add -q -b wf-1 "$WT" ) >/dev/null 2>&1

# Run the helper from a given dir; capture exit code into global $ec.
run() { local d="$1"; shift; ( cd "$d" && "$LOCK" "$@" ); ec=$?; }

echo "=== Test 1: wipe creates an empty registry ==="
run "$REPO" wipe
assert "wipe exit 0" "[ $ec -eq 0 ]"
LOCKDIR="$( cd "$REPO" && "$LOCK" lockdir )"
assert "lockdir exists" "[ -d '$LOCKDIR' ]"
assert "lockdir is empty" "[ -z \"\$(ls -A '$LOCKDIR')\" ]"

echo "=== Test 2: shared lockdir is identical across worktrees ==="
LOCKDIR_WT="$( cd "$WT" && "$LOCK" lockdir )"
assert "repo lockdir == worktree lockdir" "[ '$LOCKDIR' = '$LOCKDIR_WT' ]"

echo "=== Test 3: first claim wins and records owner ==="
run "$REPO" claim "src/a.ts" TASK-A
assert "claim exit 0" "[ $ec -eq 0 ]"
assert "owner file == TASK-A" "[ \"\$(cat '$LOCKDIR'/src%2Fa.ts/owner)\" = TASK-A ]"

echo "=== Test 4: contended claim by another task -> exit 3 ==="
run "$WT" claim "src/a.ts" TASK-B
assert "contended exit 3" "[ $ec -eq 3 ]"
assert "owner still TASK-A" "[ \"\$(cat '$LOCKDIR'/src%2Fa.ts/owner)\" = TASK-A ]"

echo "=== Test 5: idempotent re-claim by same owner -> exit 0 ==="
run "$REPO" claim "src/a.ts" TASK-A
assert "re-claim exit 0" "[ $ec -eq 0 ]"

echo "=== Test 6: distinct path is independent (no slug collision) ==="
run "$WT" claim "src/b.ts" TASK-B
assert "claim b exit 0" "[ $ec -eq 0 ]"
assert "two distinct locks exist" "[ -d '$LOCKDIR'/src%2Fa.ts ] && [ -d '$LOCKDIR'/src%2Fb.ts ]"

echo "=== Test 7: release-all frees only the task's own locks ==="
run "$REPO" release-all TASK-A
assert "release-all exit 0" "[ $ec -eq 0 ]"
assert "TASK-A lock gone" "[ ! -d '$LOCKDIR'/src%2Fa.ts ]"
assert "TASK-B lock survives" "[ -d '$LOCKDIR'/src%2Fb.ts ]"

echo "=== Test 8: freed file is re-claimable by another task ==="
run "$WT" claim "src/a.ts" TASK-B
assert "re-claim after release exit 0" "[ $ec -eq 0 ]"
assert "owner now TASK-B" "[ \"\$(cat '$LOCKDIR'/src%2Fa.ts/owner)\" = TASK-B ]"

echo "=== Test 9: wipe clears everything ==="
run "$REPO" wipe
assert "wipe exit 0" "[ $ec -eq 0 ]"
assert "registry empty after wipe" "[ -z \"\$(ls -A '$LOCKDIR')\" ]"

echo "=== Test 10: usage errors -> exit 1 ==="
run "$REPO" claim "src/a.ts"
assert "claim missing task-id exit 1" "[ $ec -eq 1 ]"
run "$REPO" release-all
assert "release-all missing task-id exit 1" "[ $ec -eq 1 ]"
run "$REPO" bogus
assert "unknown subcommand exit 1" "[ $ec -eq 1 ]"

echo
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
