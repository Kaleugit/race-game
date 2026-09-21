#!/usr/bin/env bash
# test-assert_isolated.sh — harness for scripts/assert_isolated.sh
# Mirrors the repo test convention: set -uo pipefail (NO -e), mktemp sandbox,
# pass/fail counters + assert helper, numbered cases, PASS=/FAIL= summary.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUARD="$SCRIPT_DIR/../assert_isolated.sh"
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

mkprimary() { # $1=id -> echoes primary repo path
  local id="$1"
  local repo="$TMP_ROOT/primary-$id"
  $GIT init -q "$repo" >/dev/null 2>&1
  ( cd "$repo" && $GIT commit --allow-empty -q -m init )
  echo "$repo"
}
mkwt() { # $1=repo $2=id -> echoes worktree path on branch task-$id
  local repo="$1"
  local id="$2"
  local wt="$TMP_ROOT/wt-$id"
  ( cd "$repo" && $GIT worktree add -q -b "task-$id" "$wt" ) >/dev/null 2>&1
  echo "$wt"
}
# Run guard from a given directory; prints nothing, returns guard exit code.
run_in() { local d="$1"; shift; ( cd "$d" && "$GUARD" "$@" ); }
# Same but capture combined output into global $OUT and exit into global $EC.
cap_in() { local d="$1"; shift; OUT="$( cd "$d" && "$GUARD" "$@" 2>&1 )"; EC=$?; }

echo "=== Test 1: happy path (correct branch + isolated worktree) -> 0 ==="
repo="$(mkprimary t1)"; wt="$(mkwt "$repo" t1)"
run_in "$wt" --expected-branch task-t1 --primary-repo "$repo"; ec=$?
assert "exit 0" "[ $ec -eq 0 ]"

echo "=== Test 2: on primary repo toplevel -> 2 ==="
repo="$(mkprimary t2)"
run_in "$repo" --expected-branch main --primary-repo "$repo"; ec=$?
assert "exit 2" "[ $ec -eq 2 ]"

echo "=== Test 3: wrong branch -> 2 ==="
repo="$(mkprimary t3)"; wt="$(mkwt "$repo" t3)"
run_in "$wt" --expected-branch some-other-branch --primary-repo "$repo"; ec=$?
assert "exit 2" "[ $ec -eq 2 ]"

echo "=== Test 4: --expected-worktree mismatch -> 2 ==="
repo="$(mkprimary t4)"; wt="$(mkwt "$repo" t4)"
run_in "$wt" --expected-branch task-t4 --expected-worktree "$TMP_ROOT/nope" --primary-repo "$repo"; ec=$?
assert "exit 2" "[ $ec -eq 2 ]"

echo "=== Test 4b: --expected-worktree match -> 0 ==="
run_in "$wt" --expected-branch task-t4 --expected-worktree "$wt" --primary-repo "$repo"; ec=$?
assert "exit 0" "[ $ec -eq 0 ]"

echo "=== Test 5: not a git repo -> 1 ==="
plain="$TMP_ROOT/plain"; mkdir -p "$plain"
run_in "$plain" --expected-branch x; ec=$?
assert "exit 1" "[ $ec -eq 1 ]"

echo "=== Test 6: missing required arg -> 1 ==="
repo="$(mkprimary t6)"; wt="$(mkwt "$repo" t6)"
cap_in "$wt"; assert "exit 1" "[ $EC -eq 1 ]"
assert "stderr has ERROR:" "echo \"\$OUT\" | grep -q 'ERROR:'"

echo "=== Test 6b: unknown flag -> 1 ==="
run_in "$wt" --bogus; ec=$?
assert "exit 1" "[ $ec -eq 1 ]"

echo "=== Test 6c: --help -> 0 ==="
"$GUARD" --help >/dev/null 2>&1; ec=$?
assert "exit 0" "[ $ec -eq 0 ]"

echo "=== Test 7: decoy sibling worktree never selected/printed -> 0, decoy absent ==="
repo="$(mkprimary t7)"; good="$(mkwt "$repo" t7good)"; decoy="$(mkwt "$repo" t7decoy)"
cap_in "$good" --expected-branch task-t7good --primary-repo "$repo"
assert "exit 0" "[ $EC -eq 0 ]"
assert "decoy path not in output" "! echo \"\$OUT\" | grep -q \"$decoy\""
assert "decoy branch not in output" "! echo \"\$OUT\" | grep -q 't7decoy'"

echo "=== Test 8 (SEC): GIT_DIR/GIT_WORK_TREE spoof is ignored (resolves from CWD) -> 0 ==="
repo="$(mkprimary t8)"; wt="$(mkwt "$repo" t8)"
OUT="$( cd "$wt" && GIT_DIR="$repo/.git" GIT_WORK_TREE="$repo" "$GUARD" --pre-commit 2>&1 )"; ec=$?
assert "exit 0 (spoof ignored, real cwd is linked worktree)" "[ $ec -eq 0 ]"

echo "=== Test 9 (SEC): argument-injection branch name rejected -> 1 ==="
repo="$(mkprimary t9)"; wt="$(mkwt "$repo" t9)"
run_in "$wt" --expected-branch '--upload-pack=evil' --primary-repo "$repo"; ec=$?
assert "leading-dash branch -> exit 1" "[ $ec -eq 1 ]"
run_in "$wt" --expected-branch 'task;rm -rf x' --primary-repo "$repo"; ec=$?
assert "metachar branch -> exit 1" "[ $ec -eq 1 ]"

echo "=== Test 10 (SEC): detached HEAD -> 2 ==="
repo="$(mkprimary t10)"; wt="$(mkwt "$repo" t10)"
( cd "$wt" && $GIT checkout -q --detach ) >/dev/null 2>&1
run_in "$wt" --expected-branch task-t10 --primary-repo "$repo"; ec=$?
assert "detached HEAD -> exit 2" "[ $ec -eq 2 ]"

echo "=== Test 11 (SEC): --require-clean detects dirty (stale) worktree -> 2 ==="
repo="$(mkprimary t11)"; wt="$(mkwt "$repo" t11)"
echo "contamination" > "$wt/foreign.txt"
run_in "$wt" --expected-branch task-t11 --primary-repo "$repo" --require-clean; ec=$?
assert "dirty -> exit 2" "[ $ec -eq 2 ]"
( cd "$wt" && rm -f foreign.txt )
run_in "$wt" --expected-branch task-t11 --primary-repo "$repo" --require-clean; ec=$?
assert "clean -> exit 0" "[ $ec -eq 0 ]"

echo "=== Test 12 (pre-commit): primary worktree + TASK-* branch -> 2 ==="
repo="$(mkprimary t12)"
( cd "$repo" && $GIT checkout -q -b TASK-eduoda-20260101000000-implement ) >/dev/null 2>&1
run_in "$repo" --pre-commit; ec=$?
assert "primary+TASK -> exit 2" "[ $ec -eq 2 ]"

echo "=== Test 13 (pre-commit): primary worktree + main branch -> 0 (docs/human flow) ==="
repo="$(mkprimary t13)"
run_in "$repo" --pre-commit; ec=$?
assert "primary+main -> exit 0" "[ $ec -eq 0 ]"

echo "=== Test 14 (pre-commit): linked worktree + TASK-* branch -> 0 ==="
repo="$(mkprimary t14)"
( cd "$repo" && $GIT worktree add -q -b TASK-eduoda-20260101000001-implement "$TMP_ROOT/wt-t14" ) >/dev/null 2>&1
run_in "$TMP_ROOT/wt-t14" --pre-commit; ec=$?
assert "linked+TASK -> exit 0" "[ $ec -eq 0 ]"

# =====================================================================
# Task-branch registry checks (AGENTS.md:313 / ADR-015 / INC-2026-08-17)
#   CHECK-A  >=2 task files declare the current branch -> consolidation
#   CHECK-B  the single declarer's id does not derive the branch
# ZERO declarers is always PASS — see the guard's header for why.
# =====================================================================

mktaskfile() { # $1=worktree $2=task-id $3=Branch: value ("" = omit the field)
  mkdir -p "$1/memory-system/tasks"
  if [[ -n "$3" ]]; then
    printf '# %s\n\n- Status: IN_PROGRESS\n- Branch: %s\n' "$2" "$3" \
      > "$1/memory-system/tasks/$2.md"
  else
    printf '# %s\n\n- Status: IN_PROGRESS\n' "$2" \
      > "$1/memory-system/tasks/$2.md"
  fi
}
mkwt_named() { # $1=repo $2=branch -> worktree path on that exact branch
  # Path is keyed on the sandbox repo (unique per case), NOT on the branch name:
  # several cases legitimately reuse the same branch NAME, and a shared path
  # would leak one case's task files into the next.
  local wt="$TMP_ROOT/wtn-$(basename "$1")"
  ( cd "$1" && $GIT worktree add -q -b "$2" "$wt" ) >/dev/null 2>&1
  echo "$wt"
}

echo "=== Test 15 (CHECK-A): 2 task files declare the same branch -> 2 ==="
repo="$(mkprimary t15)"; B="TASK-x-20260101000000-implement"
wt="$(mkwt_named "$repo" "$B")"
mktaskfile "$wt" "TASK-x-20260101000000" "$B"
mktaskfile "$wt" "TASK-x-20260102000000" "$B"
cap_in "$wt" --expected-branch "$B" --primary-repo "$repo"
assert "exit 2" "[ $EC -eq 2 ]"
assert "message cites AGENTS.md:313" "echo \"\$OUT\" | grep -q 'AGENTS.md:313'"
assert "message names both declarers" "echo \"\$OUT\" | grep -q 'TASK-x-20260102000000.md'"

echo "=== Test 16 (CHECK-A): 13 declarers — faithful INC-2026-08-17 replica -> 2 ==="
repo="$(mkprimary t16)"; B="TASK-kaleu-EP-027-01-implement"
wt="$(mkwt_named "$repo" "$B")"
mktaskfile "$wt" "TASK-kaleu-EP-028-01" "$B"
for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  mktaskfile "$wt" "TASK-kaleu-2026081010${i}000" "$B"
done
cap_in "$wt" --expected-branch "$B" --primary-repo "$repo"
assert "exit 2" "[ $EC -eq 2 ]"
assert "reports 13 declarers" "echo \"\$OUT\" | grep -q 'declared by 13 task files'"

echo "=== Test 17 (CHECK-B): single declarer, branch does not derive -> 2 (Grupo B) ==="
repo="$(mkprimary t17)"; B="TASK-kaleu-EP-027-02-implement"
wt="$(mkwt_named "$repo" "$B")"
mktaskfile "$wt" "TASK-kaleu-EP-028-02" "$B"
cap_in "$wt" --expected-branch "$B" --primary-repo "$repo"
assert "exit 2" "[ $EC -eq 2 ]"
assert "message names the declaring task" "echo \"\$OUT\" | grep -q 'TASK-kaleu-EP-028-02'"

echo "=== Test 18 (CHECK-B): uppercase suffix / no suffix -> 2 ==="
repo="$(mkprimary t18a)"; B="TASK-x-20260101000000-Implement"
wt="$(mkwt_named "$repo" "$B")"
mktaskfile "$wt" "TASK-x-20260101000000" "$B"
run_in "$wt" --expected-branch "$B" --primary-repo "$repo"; ec=$?
assert "uppercase suffix -> exit 2" "[ $ec -eq 2 ]"
repo="$(mkprimary t18b)"; B="TASK-x-20260101000000"
wt="$(mkwt_named "$repo" "$B")"
mktaskfile "$wt" "TASK-x-20260101000000" "$B"
run_in "$wt" --expected-branch "$B" --primary-repo "$repo"; ec=$?
assert "no suffix -> exit 2" "[ $ec -eq 2 ]"

echo "=== Test 19 (REGRESSION): legitimate single declarer -> 0 ==="
repo="$(mkprimary t19a)"; B="TASK-x-20260101000000-implement"
wt="$(mkwt_named "$repo" "$B")"
mktaskfile "$wt" "TASK-x-20260101000000" "$B"
run_in "$wt" --expected-branch "$B" --primary-repo "$repo"; ec=$?
assert "timestamped task -> exit 0" "[ $ec -eq 0 ]"
repo="$(mkprimary t19b)"; B="TASK-x-EP-001-01-backend"
wt="$(mkwt_named "$repo" "$B")"
mktaskfile "$wt" "TASK-x-EP-001-01" "$B"
run_in "$wt" --expected-branch "$B" --primary-repo "$repo"; ec=$?
assert "EP-* task, non-implement suffix -> exit 0" "[ $ec -eq 0 ]"

echo "=== Test 20 (REGRESSION): zero declarers is always PASS -> 0 ==="
repo="$(mkprimary t20a)"; B="TASK-x-20260101000000-implement"
wt="$(mkwt_named "$repo" "$B")"
mktaskfile "$wt" "TASK-other-20260909000000" "TASK-other-20260909000000-implement"
run_in "$wt" --expected-branch "$B" --primary-repo "$repo"; ec=$?
assert "TASK-* branch, task file not committed yet -> exit 0" "[ $ec -eq 0 ]"
repo="$(mkprimary t20b)"; B="fix/typo-readme"
wt="$(mkwt_named "$repo" "$B")"
mkdir -p "$wt/memory-system/tasks"
run_in "$wt" --expected-branch "$B" --primary-repo "$repo"; ec=$?
assert "non-task branch, empty corpus -> exit 0" "[ $ec -eq 0 ]"
repo="$(mkprimary t20c)"; B="TASK-x-20260101000000-implement"
wt="$(mkwt_named "$repo" "$B")"
mktaskfile "$wt" "TASK-x-20260101000000" ""
run_in "$wt" --expected-branch "$B" --primary-repo "$repo"; ec=$?
assert "task file with no Branch: field -> exit 0" "[ $ec -eq 0 ]"

echo "=== Test 21 (pre-commit): consolidation blocked at commit time -> 2 ==="
repo="$(mkprimary t21)"; B="TASK-x-20260101000000-implement"
wt="$(mkwt_named "$repo" "$B")"
mktaskfile "$wt" "TASK-x-20260101000000" "$B"
mktaskfile "$wt" "TASK-x-20260102000000" "$B"
cap_in "$wt" --pre-commit
assert "linked worktree + 2 declarers -> exit 2" "[ $EC -eq 2 ]"
assert "message cites AGENTS.md:313" "echo \"\$OUT\" | grep -q 'AGENTS.md:313'"

echo "=== Test 22 (pre-commit): legitimate single declarer still passes -> 0 ==="
repo="$(mkprimary t22)"; B="TASK-x-20260101000000-implement"
wt="$(mkwt_named "$repo" "$B")"
mktaskfile "$wt" "TASK-x-20260101000000" "$B"
run_in "$wt" --pre-commit; ec=$?
assert "linked worktree + 1 coherent declarer -> exit 0" "[ $ec -eq 0 ]"

echo "=== Test 23 (CONTRACT): every documented CLI form is still accepted ==="
# exit 1 means 'usage/contract error'. 0 or 2 are semantic verdicts, not breakage.
repo="$(mkprimary t23)"; B="TASK-x-20260101000000-implement"
wt="$(mkwt_named "$repo" "$B")"
mktaskfile "$wt" "TASK-x-20260101000000" "$B"
while IFS= read -r form; do
  [ -z "$form" ] && continue
  # shellcheck disable=SC2086
  ( cd "$wt" && "$GUARD" $form ) >/dev/null 2>&1; ec=$?
  assert "CLI form accepted: $form" "[ $ec -ne 1 ]"
done <<FORMS
--pre-commit
--help
--expected-branch $B
--expected-branch $B --require-clean
--expected-branch $B --primary-repo $repo
--expected-branch $B --expected-worktree $wt
--expected-branch $B --expected-worktree $wt --primary-repo $repo --require-clean
FORMS

echo "=== Test 24 (CORPUS TRIPWIRE): no NEW inconsistent task file enters the repo ==="
# Real-corpus oracle. INC-2026-08-17 left 12 pre-existing offenders that the human
# explicitly decided NOT to rewrite (their branch is already merged and deleted, and
# naming a branch derived from each task id would invent branches that never existed).
# The invariant we enforce is "never grows", not an exact count — so legitimately
# fixing some of the 12 does not turn CI red.
# NOTE: this said 23 until 2026-08-18. This line was written on 2026-08-17 (a6da0bb6c),
# already a day AFTER 845889efb (PR #250, 2026-08-16) had fixed 11 of the 23 — the count
# was stale the moment it was committed, because the investigation behind it read a base
# 51 commits old. See ADR-015 §CORREÇÃO 2026-08-18 in docs/decisions.md. The ceiling is
# now the real figure, so a 13th offender trips it instead of slipping in under slack.
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CORPUS="$REPO_ROOT/memory-system/tasks"
if [ -d "$CORPUS" ]; then
  bad=0
  for f in "$CORPUS"/TASK-*.md; do
    [ -e "$f" ] || continue
    id="$(basename "$f" .md)"
    br="$(awk '/^- Branch:/{v=$0; sub(/^- Branch:[ \t]*/,"",v); sub(/[ \t]+$/,"",v); print v; exit}' "$f")"
    if [ -n "$br" ] && ! [[ "$br" =~ ^${id}-[a-z0-9-]+$ ]]; then
      bad=$((bad + 1))
    fi
  done
  echo "  (inconsistent Branch: fields in the real corpus: $bad)"
  assert "known-offender count never grows past the INC-2026-08-17 baseline of 12" "[ $bad -le 12 ]"
else
  echo "  (no memory-system/tasks in this checkout — skipped)"
fi

echo
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
