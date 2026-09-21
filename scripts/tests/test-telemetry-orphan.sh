#!/usr/bin/env bash
# Test harness for skills/telemetry/scripts/append-to-orphan.sh (Fase 1a).
#
# Exercises the orphan-branch plumbing in disposable git repos and asserts:
#   - a fragment lands on refs/heads/telemetry, readable via `git show`;
#   - main/working tree/index are NEVER touched (no untracked, no diff, no
#     staged changes, HEAD unchanged);
#   - appends accumulate (NDJSON lines never glued);
#   - the orphan history is disjoint from main (no shared commit);
#   - a fork's INHERITED telemetry branch (different repo slug) is re-rooted.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APPEND="$ROOT_DIR/skills/telemetry/scripts/append-to-orphan.sh"

command -v jq >/dev/null 2>&1 || { echo "FAIL: jq not installed"; exit 1; }
[ -f "$APPEND" ] || { echo "FAIL: append-to-orphan.sh not found at $APPEND"; exit 1; }

# Scrub ambient git context (pre-commit hook leaks GIT_DIR/etc into harnesses).
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX GIT_COMMON_DIR 2>/dev/null || true

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

pass=0; fail=0
assert() { if eval "$2"; then echo "  PASS: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

mkrepo() {
  local repo="$TMP/$1"
  mkdir -p "$repo"
  git init -q -b main "$repo"
  ( cd "$repo" \
    && git config user.email a@b && git config user.name t \
    && printf 'hello\n' > README.md && git add README.md \
    && git commit -q -m init )
  echo "$repo"
}

REPO="$(mkrepo repo-main)"
export CLAUDE_PROJECT_DIR="$REPO"
head_before="$(git -C "$REPO" rev-parse HEAD)"

# --- append two fragments to the same logical path -------------------------
printf '%s\n' '{"ts":"t1","category":"prompt"}' | bash "$APPEND" "usage/sess-1.ndjson"
printf '%s\n' '{"ts":"t2","category":"tool"}'   | bash "$APPEND" "usage/sess-1.ndjson"

assert "telemetry ref created" "git -C '$REPO' rev-parse --verify -q refs/heads/telemetry >/dev/null"
content="$(git -C "$REPO" show telemetry:usage/sess-1.ndjson 2>/dev/null)"
assert "fragment readable via git show" "[ -n \"\$(git -C '$REPO' show telemetry:usage/sess-1.ndjson 2>/dev/null)\" ]"
assert "both lines accumulated (2 NDJSON lines)" "[ \"\$(git -C '$REPO' show telemetry:usage/sess-1.ndjson | grep -c .)\" -eq 2 ]"
assert "each accumulated line is valid JSON" "git -C '$REPO' show telemetry:usage/sess-1.ndjson | jq -e . >/dev/null"
assert "repo slug recorded at meta/repo" "[ -n \"\$(git -C '$REPO' show telemetry:meta/repo 2>/dev/null)\" ]"

# --- main / working tree / index untouched ---------------------------------
assert "HEAD unchanged" "[ \"\$(git -C '$REPO' rev-parse HEAD)\" = '$head_before' ]"
assert "no untracked files" "[ -z \"\$(git -C '$REPO' status --porcelain)\" ]"
assert "telemetry path absent from working tree" "[ ! -e '$REPO/usage' ]"
assert "main does not contain the telemetry path" "! git -C '$REPO' ls-tree -r --name-only main | grep -q '^usage/'"

# --- orphan is disjoint from main (no common commit) -----------------------
assert "orphan disjoint from main (no merge-base)" "[ -z \"\$(git -C '$REPO' merge-base main telemetry 2>/dev/null)\" ]"

# --- second logical path coexists ------------------------------------------
printf '%s\n' '{"ts":"g1","category":"session_start"}' | bash "$APPEND" "governance/sess-1.ndjson"
assert "second path stored independently" "[ \"\$(git -C '$REPO' show telemetry:governance/sess-1.ndjson | grep -c .)\" -eq 1 ]"
assert "first path intact after second path write" "[ \"\$(git -C '$REPO' show telemetry:usage/sess-1.ndjson | grep -c .)\" -eq 2 ]"

# --- FORK re-root: inherited telemetry from a different repo is discarded ---
FORK="$(mkrepo repo-fork)"
# Simulate inheriting the upstream's telemetry branch (fork copies all branches).
git -C "$REPO" push -q "$FORK" refs/heads/telemetry:refs/heads/telemetry
assert "fork inherited upstream telemetry pre-reroot" "[ \"\$(git -C '$FORK' show telemetry:meta/repo)\" = \"\$(git -C '$REPO' show telemetry:meta/repo)\" ]"
inherited_lines="$(git -C "$FORK" show telemetry:usage/sess-1.ndjson 2>/dev/null | grep -c . || echo 0)"
assert "fork inherited the upstream lines" "[ '$inherited_lines' -eq 2 ]"

CLAUDE_PROJECT_DIR="$FORK" \
  bash -c 'printf "%s\n" "{\"ts\":\"fork1\",\"category\":\"prompt\"}" | bash "'"$APPEND"'" "usage/sess-9.ndjson"'

assert "fork re-rooted to its own slug" "[ \"\$(git -C '$FORK' show telemetry:meta/repo)\" != \"\$(git -C '$REPO' show telemetry:meta/repo)\" ]"
assert "fork discarded inherited upstream lines (re-root)" "! git -C '$FORK' show telemetry:usage/sess-1.ndjson >/dev/null 2>&1"
assert "fork keeps only its own line" "[ \"\$(git -C '$FORK' show telemetry:usage/sess-9.ndjson | grep -c .)\" -eq 1 ]"

# --- guards: missing path arg and traversal are no-ops ----------------------
NG="$(mkrepo repo-guard)"
CLAUDE_PROJECT_DIR="$NG" bash -c 'printf "x\n" | bash "'"$APPEND"'"' 2>/dev/null || true
assert "no telemetry ref when path arg missing" "! git -C '$NG' rev-parse --verify -q refs/heads/telemetry >/dev/null 2>&1"
CLAUDE_PROJECT_DIR="$NG" bash -c 'printf "x\n" | bash "'"$APPEND"'" "../escape.ndjson"' 2>/dev/null || true
assert "no telemetry ref on traversal path" "! git -C '$NG' rev-parse --verify -q refs/heads/telemetry >/dev/null 2>&1"

# --- PORTABILITY: macOS ships no flock(1) -> the mkdir-lock fallback must work -
# Build a bindir with everything the script needs EXCEPT flock, and run append
# with PATH restricted to it. Without the portable lock this silently writes
# nothing (the original Critical bug). Concurrency must still not lose lines.
NOFLOCK_BIN="$TMP/noflock-bin"
mkdir -p "$NOFLOCK_BIN"
# Exec shims, not symlinks: on Git Bash `ln -s` copies the binary away from its
# DLLs (every command then exits 127); a shim runs the real binary in place.
for c in git cat mktemp basename head find sleep mkdir rmdir rm bash sh dirname env; do
  p="$(command -v "$c" 2>/dev/null)" || continue
  printf '#!%s\nexec "%s" "$@"\n' "$(command -v sh)" "$p" > "$NOFLOCK_BIN/$c"
  chmod +x "$NOFLOCK_BIN/$c"
done
assert "test fixture excludes flock from the restricted PATH" "! PATH='$NOFLOCK_BIN' command -v flock >/dev/null 2>&1"

MAC="$(mkrepo repo-macos)"
CLAUDE_PROJECT_DIR="$MAC" PATH="$NOFLOCK_BIN" bash "$APPEND" "usage/mac.ndjson" <<<'{"os":"macos","i":1}' 2>"$TMP/mac.err"
assert "no-flock: fragment still written (mkdir-lock fallback)" "[ \"\$(git -C '$MAC' show telemetry:usage/mac.ndjson 2>/dev/null | grep -c .)\" -eq 1 ]"
assert "no-flock: nothing leaked to stderr" "[ ! -s '$TMP/mac.err' ]"
# concurrency under the mkdir-lock: 15 parallel appends, zero lost lines
for i in $(seq 1 15); do
  CLAUDE_PROJECT_DIR="$MAC" PATH="$NOFLOCK_BIN" bash "$APPEND" "usage/macc.ndjson" <<<"{\"i\":$i}" 2>/dev/null &
done
wait
assert "no-flock: 15 concurrent appends kept all lines (mkdir CAS)" "[ \"\$(git -C '$MAC' show telemetry:usage/macc.ndjson | grep -c .)\" -eq 15 ]"
assert "no-flock: lock dir not leaked after completion" "[ ! -e '$MAC/.git/telemetry-append.lock.d' ]"

# A lock left behind by a crashed holder (SIGKILL — its release trap never ran)
# must be broken, not deadlock the stream forever. Pre-create the lock dir to
# simulate that, then a normal append must still land its line and release.
MAC2="$(mkrepo repo-macos2)"
mkdir -p "$MAC2/.git/telemetry-append.lock.d"
CLAUDE_PROJECT_DIR="$MAC2" PATH="$NOFLOCK_BIN" bash "$APPEND" "usage/stale.ndjson" <<<'{"after":"crash"}' 2>/dev/null
assert "no-flock: stale lock from a dead holder is broken (no permanent deadlock)" "[ \"\$(git -C '$MAC2' show telemetry:usage/stale.ndjson 2>/dev/null | grep -c .)\" -eq 1 ]"
assert "no-flock: lock released after breaking the stale one" "[ ! -e '$MAC2/.git/telemetry-append.lock.d' ]"

echo
if [ "$fail" -eq 0 ]; then echo "ALL PASS ($pass)"; exit 0; else echo "SOME FAILED ($fail failed, $pass passed)"; exit 1; fi
