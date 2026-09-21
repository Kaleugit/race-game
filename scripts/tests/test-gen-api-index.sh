#!/usr/bin/env bash
# test-gen-api-index.sh — harness for skills/gen-api-index/scripts/gen-api-index.sh
# Mirrors the repo test convention: set -uo pipefail (NO -e), mktemp sandbox,
# pass/fail counters + assert helper, numbered cases, PASS=/FAIL= summary.
#
# Regression focus: the generator must recognize @module/@element head tags in
# block comments (` * @module`), LINE comments (`// @module`), and bare form —
# matching the on-touch JSDoc gate. It must NOT index *.test.* / *.spec.* files.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GEN="$SCRIPT_DIR/../../skills/gen-api-index/scripts/gen-api-index.sh"
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

REPO="$TMP_ROOT/repo"
$GIT init -q "$REPO" >/dev/null 2>&1
mkdir -p "$REPO/src" "$REPO/public"

# Backend modules in the three comment styles + a test file (must be excluded).
printf ' /**\n  * @module blockmod — block-comment module.\n  */\n' > "$REPO/src/blockmod.ts"
printf '// @module linemod — line-comment module.\n'               > "$REPO/src/linemod.ts"
printf '@module baremod — bare module.\n'                          > "$REPO/src/baremod.ts"
printf '// @module footest — a test file, must NOT be indexed.\n'  > "$REPO/src/foo.test.ts"
printf '// @module barspec — a spec file, must NOT be indexed.\n'  > "$REPO/src/bar.spec.ts"
# An untagged backend file (counts toward denominator, absent from index).
printf 'export const x = 1;\n'                                     > "$REPO/src/untagged.ts"
# A custom element tagged with a line comment.
printf '// @element my-widget\n// @summary a widget.\ncustomElements.define("my-widget", class {});\n' > "$REPO/public/widget.js"

OUT="$TMP_ROOT/INDEX-API.md"
( cd "$REPO" && "$GEN" --root "$REPO" --out "$OUT" ) >/dev/null 2>&1

echo "=== Test 1: block-comment @module is indexed ==="
assert "blockmod present" "grep -qE '^### \`src/blockmod\.ts\`' '$OUT'"

echo "=== Test 2: LINE-comment @module is indexed (regression) ==="
assert "linemod present" "grep -qE '^### \`src/linemod\.ts\`' '$OUT'"

echo "=== Test 3: bare @module is indexed ==="
assert "baremod present" "grep -qE '^### \`src/baremod\.ts\`' '$OUT'"

echo "=== Test 4: titles keep <name> — <purpose>, no comment marker leaks ==="
assert "linemod title is name + purpose" "grep -qE '^### \`src/linemod\.ts\` — linemod — line-comment module\.' '$OUT'"
assert "blockmod title is name + purpose" "grep -qE '^### \`src/blockmod\.ts\` — blockmod — block-comment module\.' '$OUT'"
assert "no leading marker leaks into any title" "! grep -qE '^### \`[^\`]+\` — (\*|//)' '$OUT'"

echo "=== Test 5: *.test.* / *.spec.* are excluded ==="
assert "no test file" "! grep -qE 'foo\.test\.ts' '$OUT'"
assert "no spec file" "! grep -qE 'bar\.spec\.ts' '$OUT'"

echo "=== Test 6: line-comment @element is indexed ==="
assert "my-widget present" "grep -qE '^### \`<my-widget>\`' '$OUT'"

echo "=== Test 7: untagged file absent but counted in coverage ==="
assert "untagged absent" "! grep -qE 'src/untagged\.ts' '$OUT'"
# 3 tagged backend (block/line/bare) out of 4 candidates (3 tagged + untagged;
# test/spec excluded from the scan entirely).
assert "backend coverage 3/4" "grep -qE 'Coverage.*3/4 backend files' '$OUT'"

echo
echo "PASS=$pass FAIL=$fail"
[ "$fail" -eq 0 ]
