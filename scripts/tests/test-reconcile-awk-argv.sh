#!/usr/bin/env bash
# Test harness for the reconcile-*.sh awk section streaming
# (TASK-kaleu-20260818195528). The old pattern passed the whole consolidated
# section as an awk argv assignment (`-v section=...`); the kernel caps a
# single argv/env entry at MAX_ARG_STRLEN (~128KB on Linux), so a grown
# fragment corpus killed every reconcile on CI with "Argument list too long"
# (exit 126) — red main from PR #263 onward. The fix streams the section from
# the temp file via getline, which also preserves content verbatim (`-v`
# expands \n/\t escape sequences and strips escape_cell's `\|`).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$SCRIPT_DIR/.."
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

make_sandbox() {
  local id="$1"
  local sb="$TMP_ROOT/sb-$id"
  mkdir -p "$sb/scripts" "$sb/memory-system"
  cp "$SCRIPTS_DIR/reconcile-session-log.sh" \
     "$SCRIPTS_DIR/reconcile-task-index.sh" \
     "$SCRIPTS_DIR/reconcile-workstream-notes.sh" \
     "$sb/scripts/"
  echo "$sb"
}

echo "=== Test 1: session-log reconciles a corpus larger than MAX_ARG_STRLEN (128KB) ==="
SB="$(make_sandbox big)"
mkdir -p "$SB/memory-system/session-log.d"
# 3 fragments x ~70KB => ~210KB consolidated, comfortably past 131072 bytes.
line70="$(printf 'x%.0s' $(seq 1 70))"
for i in 1 2 3; do
  {
    echo "# fragment-$i header SENTINEL-FRAG-$i"
    for _ in $(seq 1 1000); do echo "$line70"; done
  } > "$SB/memory-system/session-log.d/2026081800000$i-frag.md"
done
printf '%s\n' \
  '# Session Log' '' \
  '<!-- SESSION_LOG:START -->' \
  '<!-- no session fragments -->' \
  '<!-- SESSION_LOG:END -->' \
  > "$SB/memory-system/session-log.md"
out1="$(bash "$SB/scripts/reconcile-session-log.sh" 2>&1)"; rc1=$?
corpus_bytes=$(cat "$SB/memory-system/session-log.d/"*.md | wc -c)
assert "corpus is actually larger than the 131072-byte argv cap" "[ $corpus_bytes -gt 131072 ]"
assert "reconcile exits 0 on the big corpus" "[ $rc1 -eq 0 ]"
assert "first fragment landed in the consolidated block" "grep -q 'SENTINEL-FRAG-1' '$SB/memory-system/session-log.md'"
assert "last fragment landed in the consolidated block" "grep -q 'SENTINEL-FRAG-3' '$SB/memory-system/session-log.md'"
assert "end marker survived the rewrite" "grep -qF '<!-- SESSION_LOG:END -->' '$SB/memory-system/session-log.md'"

echo "=== Test 2: second run is idempotent ==="
out2="$(bash "$SB/scripts/reconcile-session-log.sh" 2>&1)"; rc2=$?
assert "second run exits 0" "[ $rc2 -eq 0 ]"
assert "second run reports already reconciled" "echo \"\$out2\" | grep -q 'already reconciled'"

echo "=== Test 3: tripwire — no reconcile script passes the section via awk argv ==="
# This is the cross-platform guard: hosts without the Linux argv cap (e.g. Git
# Bash on Windows) never reproduce the E2BIG crash, but the offending pattern
# is greppable everywhere.
# Match the code form `-v section="$...` only (explanatory comments citing the
# old pattern in prose must not trip this).
offenders=$(grep -lF -- '-v section="$' \
  "$SCRIPTS_DIR/reconcile-session-log.sh" \
  "$SCRIPTS_DIR/reconcile-task-index.sh" \
  "$SCRIPTS_DIR/reconcile-workstream-notes.sh" 2>/dev/null | wc -l)
assert "zero scripts still use -v section=" "[ $offenders -eq 0 ]"

echo "=== Test 4: fragment content is preserved verbatim (no escape expansion) ==="
SB4="$(make_sandbox verbatim)"
mkdir -p "$SB4/memory-system/session-log.d"
printf '%s\n' '# code note' 'uses printf "\n" and a \t tab escape in a snippet' \
  > "$SB4/memory-system/session-log.d/20260818000004-code.md"
printf '%s\n' \
  '<!-- SESSION_LOG:START -->' \
  '<!-- no session fragments -->' \
  '<!-- SESSION_LOG:END -->' \
  > "$SB4/memory-system/session-log.md"
bash "$SB4/scripts/reconcile-session-log.sh" >/dev/null 2>&1
assert "literal backslash-n survives reconciliation" "grep -qF 'printf \"\\n\"' '$SB4/memory-system/session-log.md'"
assert "literal backslash-t survives reconciliation" "grep -qF '\\t tab escape' '$SB4/memory-system/session-log.md'"

echo "=== Test 5: task-index reconciles and keeps escape_cell pipes escaped ==="
SB5="$(make_sandbox index)"
mkdir -p "$SB5/memory-system/tasks"
cat > "$SB5/memory-system/tasks/TASK-t-1.md" <<'EOF'
# TASK-t-1 - Title with a pipe | inside

- Status: PENDING
- Priority: 1
- Execution Mode: Quick
- Branch: TASK-t-1-devops
- Workstreams: [devops]
- Last Updated: 2026-08-18 00:00
EOF
printf '%s\n' \
  '# Tasks' '' \
  '<!-- TASK_INDEX:START -->' \
  '| (none) | - | - | - | - | - | - | - |' \
  '<!-- TASK_INDEX:END -->' \
  > "$SB5/memory-system/2-tasks.md"
out5="$(bash "$SB5/scripts/reconcile-task-index.sh" 2>&1)"; rc5=$?
assert "task-index reconcile exits 0" "[ $rc5 -eq 0 ]"
assert "header row present" "grep -qF '| Task ID | Title |' '$SB5/memory-system/2-tasks.md'"
assert "task row present" "grep -qF 'TASK-t-1' '$SB5/memory-system/2-tasks.md'"
assert "pipe in title stays escaped as backslash-pipe" "grep -qF 'pipe \\| inside' '$SB5/memory-system/2-tasks.md'"
out5b="$(bash "$SB5/scripts/reconcile-task-index.sh" 2>&1)"; rc5b=$?
assert "task-index second run idempotent" "[ $rc5b -eq 0 ] && echo \"\$out5b\" | grep -q 'already reconciled'"

echo "=== Test 6: workstream notes reconcile and are idempotent ==="
SB6="$(make_sandbox notes)"
mkdir -p "$SB6/memory-system/workstreams/devops/notes.d"
printf '%s\n' '# note' 'SENTINEL-NOTE-1' \
  > "$SB6/memory-system/workstreams/devops/notes.d/20260818000006-n.md"
out6="$(bash "$SB6/scripts/reconcile-workstream-notes.sh" 2>&1)"; rc6=$?
assert "workstream reconcile exits 0" "[ $rc6 -eq 0 ]"
assert "note landed in consolidated notes.md" "grep -q 'SENTINEL-NOTE-1' '$SB6/memory-system/workstreams/devops/notes.md'"
out6b="$(bash "$SB6/scripts/reconcile-workstream-notes.sh" 2>&1)"; rc6b=$?
assert "workstream second run idempotent" "[ $rc6b -eq 0 ] && echo \"\$out6b\" | grep -q 'already reconciled'"

echo "=== Summary ==="
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
