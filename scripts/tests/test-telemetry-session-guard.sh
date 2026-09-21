#!/usr/bin/env bash
# Test harness for skills/telemetry/hooks/session-guard.sh (SessionStart guard).
#
# Focus: the #63 self-heal. When the statusLine tap is wired in VERSIONED
# settings.json (shared across clones) but the per-machine, gitignored delegate
# sidecar is absent (fresh clone / installer never ran) or corrupted into a
# self-reference, the guard must recapture the operator's REAL status line into
# the sidecar at SessionStart — closing the gap that made the wrapper silently
# fall back to its minimal bar and swallow the operator's status line.
#
# Also asserts the guard stays silent/healthy when the tap is wired and the
# sidecar is already good, and that it surfaces a reminder when the tap is OFF.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GUARD="$ROOT_DIR/skills/telemetry/hooks/session-guard.sh"

command -v jq >/dev/null 2>&1 || { echo "FAIL: jq not installed"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "FAIL: git not installed"; exit 1; }
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX GIT_COMMON_DIR 2>/dev/null || true

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
assert() { if eval "$2"; then echo "  PASS: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

WRAPPER='bash "$CLAUDE_PROJECT_DIR/skills/telemetry/hooks/statusline-tap.sh"'

# Build a self-contained project that ships the guard + capture helper, with the
# tap wired in versioned settings.json (the #63 precondition).
setup_proj() {
  local p="$1"
  mkdir -p "$p/.claude" "$p/skills/telemetry/hooks" "$p/skills/telemetry/scripts"
  cp "$GUARD" "$p/skills/telemetry/hooks/session-guard.sh"
  cp "$ROOT_DIR/skills/telemetry/scripts/capture-delegate.sh" "$p/skills/telemetry/scripts/"
  jq -n --arg w "$WRAPPER" '{statusLine:{type:"command",command:$w}}' > "$p/.claude/settings.json"
}
# Fake global ~/.claude carrying the operator's REAL status line.
GH="$TMP/globalhome"; mkdir -p "$GH/.claude"
printf '%s\n' '{"statusLine":{"type":"command","command":"bash /opt/realbar.sh"}}' > "$GH/.claude/settings.json"

# ============ Case A: missing sidecar on a fresh clone ======================
A="$TMP/a"; setup_proj "$A"
SIDE_A="$A/.claude/telemetry-statusline.json"
HOME="$GH" CLAUDE_PROJECT_DIR="$A" bash "$A/skills/telemetry/hooks/session-guard.sh" >/dev/null 2>&1
rc=$?
assert "A: guard exits 0" "[ '$rc' = '0' ]"
assert "A: sidecar recreated" "[ -f '$SIDE_A' ]"
assert "A: delegate recaptured the GLOBAL real bar" "[ \"\$(jq -r .delegate '$SIDE_A')\" = 'bash /opt/realbar.sh' ]"

# ============ Case B: corrupted self-referential sidecar is healed ==========
B="$TMP/b"; setup_proj "$B"
SIDE_B="$B/.claude/telemetry-statusline.json"
printf '%s\n' '{"delegate":"bash statusline-tap.sh"}' > "$SIDE_B"
HOME="$GH" CLAUDE_PROJECT_DIR="$B" bash "$B/skills/telemetry/hooks/session-guard.sh" >/dev/null 2>&1
assert "B: self-reference healed away" "! grep -q 'statusline-tap.sh' '$SIDE_B'"
assert "B: healed delegate recaptured the global bar" "[ \"\$(jq -r .delegate '$SIDE_B')\" = 'bash /opt/realbar.sh' ]"

# ============ Case C: healthy sidecar is left untouched =====================
C="$TMP/c"; setup_proj "$C"
SIDE_C="$C/.claude/telemetry-statusline.json"
printf '%s\n' '{"delegate":"bash /opt/already-good.sh"}' > "$SIDE_C"
cp "$SIDE_C" "$TMP/c-before"
HOME="$GH" CLAUDE_PROJECT_DIR="$C" bash "$C/skills/telemetry/hooks/session-guard.sh" >/dev/null 2>&1
assert "C: healthy sidecar unchanged" "cmp -s '$SIDE_C' '$TMP/c-before'"

# ============ Case D: tap OFF surfaces a reminder, no sidecar written ========
D="$TMP/d"; mkdir -p "$D/.claude" "$D/skills/telemetry/hooks" "$D/skills/telemetry/scripts"
cp "$GUARD" "$D/skills/telemetry/hooks/session-guard.sh"
cp "$ROOT_DIR/skills/telemetry/scripts/capture-delegate.sh" "$D/skills/telemetry/scripts/"
printf '%s\n' '{"statusLine":{"type":"command","command":"bash /opt/other.sh"}}' > "$D/.claude/settings.json"
out="$(HOME="$GH" CLAUDE_PROJECT_DIR="$D" bash "$D/skills/telemetry/hooks/session-guard.sh" 2>&1)"
assert "D: reminder surfaced when tap is off" "printf '%s' \"$out\" | grep -q 'telemetry-tap-down'"
assert "D: no sidecar written when tap is off" "[ ! -f '$D/.claude/telemetry-statusline.json' ]"

echo
if [ "$fail" -eq 0 ]; then echo "ALL PASS ($pass)"; else echo "FAILED ($fail of $((pass+fail)))"; exit 1; fi
