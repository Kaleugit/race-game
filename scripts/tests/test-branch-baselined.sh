#!/usr/bin/env bash
# Tests for branch_baselined() in scripts/validate-conventions.sh.
#
# WHY THIS FILE EXISTS: the function shipped with zero coverage, and the first
# edit after review introduced a CRLF regression that a green CI could not see —
# CI runs on Linux (i/lf) while Git for Windows sets core.autocrlf=true in the
# SYSTEM gitconfig, so the working-tree copy is CRLF only on dev machines.
# The line-ending cases below are the whole point; do not drop them.
#
# The function is EVAL'd out of the real script rather than copied, so this tests
# what ships. Copying it would let the two drift, which is the defect class this
# repository keeps paying for.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/../validate-conventions.sh"

PASS=0
FAIL=0

assert() {
  local label="$1" cond="$2"
  if eval "$cond"; then
    echo "  ok: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label"
    FAIL=$((FAIL + 1))
  fi
}

if [ ! -f "$TARGET" ]; then
  echo "ERROR: cannot find $TARGET"
  exit 2
fi

# Pull in the real function definition (and only it).
eval "$(sed -n '/^branch_baselined()/,/^}/p' "$TARGET")"
if ! declare -F branch_baselined >/dev/null; then
  echo "ERROR: could not extract branch_baselined() from $TARGET"
  exit 2
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ID="TASK-kaleu-20260807102430"
BR="TASK-kaleu-EP-028-01-implement"

# Three on-disk shapes the file legitimately takes across platforms.
printf '# comentario\n%s %s\n' "$ID" "$BR"      > "$TMP/lf.txt"
printf '# comentario\r\n%s %s\r\n' "$ID" "$BR"  > "$TMP/crlf.txt"
printf '# comentario\n%s %s' "$ID" "$BR"        > "$TMP/no-trailing-newline.txt"
printf '%s\t%s\n' "$ID" "$BR"                   > "$TMP/tab-separated.txt"
: > "$TMP/empty.txt"

for shape in lf crlf no-trailing-newline tab-separated; do
  echo "=== shape: $shape ==="
  BRANCH_BASELINE_FILE="$TMP/$shape.txt"
  assert "$shape: ratified pair is forgiven" \
    "branch_baselined '$ID' '$BR'"
  assert "$shape: regex metacharacters are NOT a wildcard (.*)" \
    "! branch_baselined '$ID' '.*'"
  assert "$shape: regex metacharacters are NOT a wildcard (TASK-.*)" \
    "! branch_baselined '$ID' 'TASK-.*'"
  assert "$shape: '.' is literal, not any-char" \
    "! branch_baselined '$ID' 'TASK-kaleu-EP-028-01-implemen.'"
  # GLOB, not regex: bash treats the right-hand side of `==` inside [[ ]] as a
  # PATTERN unless quoted. Dropping those quotes is a one-character drift that
  # every regex-flavoured case above survives — `.*` and `TASK-.*` do not match
  # as globs either way, so they cannot detect it. These two can: they are inert
  # as regex and catch-all as glob.
  assert "$shape: bare glob '*' is not a wildcard" \
    "! branch_baselined '$ID' '*'"
  assert "$shape: prefix glob 'TASK-*' is not a wildcard" \
    "! branch_baselined '$ID' 'TASK-*'"
  assert "$shape: single-char glob '?' is not a wildcard" \
    "! branch_baselined '$ID' 'TASK-kaleu-EP-028-01-implemen?'"
  assert "$shape: bracket glob is not a wildcard" \
    "! branch_baselined '$ID' 'TASK-kaleu-EP-0[0-9][0-9]-01-implement'"
  assert "$shape: unknown task id is rejected" \
    "! branch_baselined 'TASK-kaleu-99999999999999' '$BR'"
  assert "$shape: known task with a different branch is rejected" \
    "! branch_baselined '$ID' 'TASK-kaleu-EP-999-01-implement'"
  assert "$shape: comment line is not matched" \
    "! branch_baselined '#' 'comentario'"
  assert "$shape: empty branch value is rejected" \
    "! branch_baselined '$ID' ''"
done

echo "=== edge cases ==="
BRANCH_BASELINE_FILE="$TMP/empty.txt"
assert "empty baseline forgives nothing" "! branch_baselined '$ID' '$BR'"

BRANCH_BASELINE_FILE="$TMP/does-not-exist.txt"
assert "missing baseline file forgives nothing" "! branch_baselined '$ID' '$BR'"

echo
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
