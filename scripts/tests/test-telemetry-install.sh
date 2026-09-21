#!/usr/bin/env bash
# Test harness for skills/telemetry/scripts/install-hooks.sh (zero-toil activation).
#
# Asserts the installer: wires the governance hooks + SessionStart runtime guard,
# wires the non-destructive statusLine tap, captures the pre-existing status line
# (project, else global ~/.claude) as a delegate, ignores the per-machine sidecar
# in .gitignore, preserves existing hooks (governance footer stays last), and is
# fully idempotent / self-healing on re-run.
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INSTALL="$ROOT_DIR/skills/telemetry/scripts/install-hooks.sh"

command -v jq >/dev/null 2>&1 || { echo "FAIL: jq not installed"; exit 1; }
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX GIT_COMMON_DIR 2>/dev/null || true

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
pass=0; fail=0
assert() { if eval "$2"; then echo "  PASS: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }

# ============ Case A: fresh project, custom GLOBAL status line ===============
A="$TMP/a"; mkdir -p "$A/.claude"
git init -q -b main "$A" && ( cd "$A" && git config user.email a@b && git config user.name t )
# fake global ~/.claude with a custom status line
GH="$TMP/globalhome"; mkdir -p "$GH/.claude"
printf '%s\n' '{"statusLine":{"type":"command","command":"bash /opt/mybar.sh"}}' > "$GH/.claude/settings.json"
# project settings.json with a pre-existing governance footer hook
printf '%s' '{"hooks":{"UserPromptSubmit":[{"hooks":[{"type":"command","command":"bash gov-footer.sh"}]}]}}' > "$A/.claude/settings.json"

SET="$A/.claude/settings.json"
HOME="$GH" bash "$INSTALL" "$SET" >/dev/null

assert "A: result is valid JSON" "jq -e . '$SET' >/dev/null"
assert "A: record-event hooks wired" "grep -q 'record-event.sh' '$SET'"
assert "A: session-guard wired on SessionStart" "jq -e '[.hooks.SessionStart[].hooks[].command] | any(test(\"session-guard.sh\"))' '$SET' >/dev/null"
assert "A: SessionEnd record wired" "jq -e '[.hooks.SessionEnd[].hooks[].command] | any(test(\"record-event.sh.*session_end\"))' '$SET' >/dev/null"
assert "A: governance footer preserved and stays last" "jq -e '.hooks.UserPromptSubmit[-1].hooks[0].command==\"bash gov-footer.sh\"' '$SET' >/dev/null"
assert "A: statusLine points at the wrapper" "jq -e '.statusLine.command | test(\"statusline-tap.sh\")' '$SET' >/dev/null"
assert "A: delegate sidecar created" "[ -f '$A/.claude/telemetry-statusline.json' ]"
assert "A: delegate captured the GLOBAL status line" "[ \"\$(jq -r .delegate '$A/.claude/telemetry-statusline.json')\" = 'bash /opt/mybar.sh' ]"
assert "A: sidecar gitignored" "grep -qxF '.claude/telemetry-statusline.json' '$A/.gitignore'"

# idempotency: re-run changes nothing material
recs="$(grep -c 'record-event.sh' "$SET")"
HOME="$GH" bash "$INSTALL" "$SET" >/dev/null
assert "A: idempotent record-event count" "[ \"\$(grep -c 'record-event.sh' '$SET')\" = '$recs' ]"
assert "A: idempotent single statusLine.command" "[ \"\$(jq -r '.statusLine.command' '$SET')\" = 'bash \"\$CLAUDE_PROJECT_DIR/skills/telemetry/hooks/statusline-tap.sh\"' ]"
assert "A: delegate unchanged on re-run (not wrapper)" "[ \"\$(jq -r .delegate '$A/.claude/telemetry-statusline.json')\" = 'bash /opt/mybar.sh' ]"
assert "A: gitignore not duplicated" "[ \"\$(grep -cxF '.claude/telemetry-statusline.json' '$A/.gitignore')\" = '1' ]"

# ============ Case B: pre-existing PROJECT custom status line ================
B="$TMP/b"; mkdir -p "$B/.claude"
git init -q -b main "$B" && ( cd "$B" && git config user.email a@b && git config user.name t )
printf '%s' '{"statusLine":{"type":"command","command":"bash projbar.sh","padding":2}}' > "$B/.claude/settings.json"
HOME="$GH" bash "$INSTALL" "$B/.claude/settings.json" >/dev/null
assert "B: project custom bar captured as delegate" "[ \"\$(jq -r .delegate '$B/.claude/telemetry-statusline.json')\" = 'bash projbar.sh' ]"
assert "B: statusLine now the wrapper" "jq -e '.statusLine.command | test(\"statusline-tap.sh\")' '$B/.claude/settings.json' >/dev/null"
assert "B: existing padding preserved" "[ \"\$(jq -r '.statusLine.padding' '$B/.claude/settings.json')\" = '2' ]"

# ============ Case C: self-heal a missing sidecar ===========================
rm -f "$B/.claude/telemetry-statusline.json"
HOME="$GH" bash "$INSTALL" "$B/.claude/settings.json" >/dev/null
assert "C: sidecar re-created (heal) when wrapper already wired" "[ -f '$B/.claude/telemetry-statusline.json' ]"

# ============ Case D: no status line anywhere -> empty delegate ==============
D="$TMP/d"; mkdir -p "$D/.claude"
git init -q -b main "$D" && ( cd "$D" && git config user.email a@b && git config user.name t )
EMPTYHOME="$TMP/emptyhome"; mkdir -p "$EMPTYHOME"
HOME="$EMPTYHOME" bash "$INSTALL" "$D/.claude/settings.json" >/dev/null
assert "D: wrapper wired even with no prior status line" "jq -e '.statusLine.command | test(\"statusline-tap.sh\")' '$D/.claude/settings.json' >/dev/null"
assert "D: delegate empty (wrapper falls back to minimal bar)" "[ -z \"\$(jq -r .delegate '$D/.claude/telemetry-statusline.json')\" ]"

# ============ Case E: heal a CORRUPTED sidecar (delegate -> the wrapper) ======
# Wrapper already wired; sidecar got corrupted into a self-reference. Re-running
# the installer must recapture so the delegate no longer points at the wrapper.
printf '%s\n' '{"delegate":"bash \"$CLAUDE_PROJECT_DIR/skills/telemetry/hooks/statusline-tap.sh\""}' > "$B/.claude/telemetry-statusline.json"
HOME="$GH" bash "$INSTALL" "$B/.claude/settings.json" >/dev/null
assert "E: corrupted self-referential delegate healed (no longer the wrapper)" "! grep -q 'statusline-tap.sh' '$B/.claude/telemetry-statusline.json'"
assert "E: healed delegate recaptured the global bar" "[ \"\$(jq -r .delegate '$B/.claude/telemetry-statusline.json')\" = 'bash /opt/mybar.sh' ]"

# ============ Case F: OLD-design project (record-event wired, NO guard) =======
# A derived project that activated the previous telemetry design has the
# record-event hooks but no session-guard. The hooks block short-circuits on the
# existing record-event wiring, so the guard must be added by its own idempotent
# block — otherwise the old-design project never gets the runtime safety net.
F="$TMP/f"; mkdir -p "$F/.claude"
git init -q -b main "$F" && ( cd "$F" && git config user.email a@b && git config user.name t )
cat > "$F/.claude/settings.json" <<'JSON'
{"hooks":{"SessionStart":[{"hooks":[{"type":"command","command":"bash \"$CLAUDE_PROJECT_DIR/skills/telemetry/hooks/record-event.sh\" session_start"}]}]}}
JSON
assert "F: precondition — old design has record-event but no session-guard" "grep -q record-event.sh '$F/.claude/settings.json' && ! grep -q session-guard.sh '$F/.claude/settings.json'"
HOME="$EMPTYHOME" bash "$INSTALL" "$F/.claude/settings.json" >/dev/null
assert "F: session-guard added to an old-design project" "grep -q 'session-guard.sh' '$F/.claude/settings.json'"
assert "F: statusLine tap also wired for the old-design project" "jq -e '.statusLine.command | test(\"statusline-tap.sh\")' '$F/.claude/settings.json' >/dev/null"
assert "F: result still valid JSON" "jq -e . '$F/.claude/settings.json' >/dev/null"
guards="$(grep -c 'session-guard.sh' "$F/.claude/settings.json")"
HOME="$EMPTYHOME" bash "$INSTALL" "$F/.claude/settings.json" >/dev/null   # re-run
assert "F: idempotent — guard not duplicated on re-run" "[ \"\$(grep -c 'session-guard.sh' '$F/.claude/settings.json')\" = '$guards' ]"

echo
if [ "$fail" -eq 0 ]; then echo "ALL PASS ($pass)"; exit 0; else echo "SOME FAILED ($fail failed, $pass passed)"; exit 1; fi
